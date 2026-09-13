import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { requireActive, requireAdmin } from "./lib/auth";
import {
  dayKey,
  daysInMonth,
  formatMinutes,
  mondayOf,
  monthsAgo,
  timeLabel,
  weekDays,
} from "./lib/day";
import { toCsv } from "./lib/csv";
import { planLimits } from "./plan";

/** How far back the history screens look. A shop punches ~4x/day, so this is
 *  roughly a year for one person. */
const HISTORY_LIMIT = 800;

/**
 * Two punches this close together are the same gesture, not two.
 *
 * The camera decodes the same QR several times a second, so one scan can
 * easily fire twice and record an entry immediately followed by an exit. The
 * scanner is paused on the first hit, but that is client-side timing and this
 * is an attendance record — the backend refuses the duplicate itself rather
 * than trusting the UI. Nobody arrives and leaves within fifteen seconds.
 */
const DEDUP_WINDOW_MS = 15_000;

/** The user's most recent punch, or null. */
async function lastPunch(ctx: QueryCtx, userId: Id<"users">) {
  return await ctx.db
    .query("badges")
    .withIndex("by_user_at", (q) => q.eq("userId", userId))
    .order("desc")
    .first();
}

/** Whether that user is currently clocked in, today. */
function isIn(last: Doc<"badges"> | null, now: number): boolean {
  if (!last) return false;
  // An "in" left open from a previous day is not "currently in" — see punch().
  return last.type === "in" && dayKey(last.at) === dayKey(now);
}

/**
 * Record a punch. The employee never picks in-or-out: the server derives it
 * from their last punch of the same day, which removes a whole screen and a
 * whole class of mistake.
 *
 * ponytail: the toggle is bounded to the day. A forgotten clock-out simply
 * leaves that day incomplete and visible as such — no auto-close is invented,
 * because guessing an end time would silently fabricate worked hours. Add an
 * admin correction screen the first time it actually happens.
 */
export const punch = mutation({
  args: { code: v.string() },
  returns: v.union(v.literal("in"), v.literal("out")),
  handler: async (ctx, { code }) => {
    const user = await requireActive(ctx);
    const now = Date.now();

    const kiosk = await ctx.db.query("kiosk").unique();
    const given = code.trim().toUpperCase();
    if (!kiosk || kiosk.code !== given || kiosk.expiresAt < now) {
      throw new Error("Code invalide ou expiré");
    }

    const last = await lastPunch(ctx, user._id);

    // Same gesture arriving twice: report what was already recorded and insert
    // nothing, so a repeated decode cannot turn one arrival into an
    // arrival-plus-departure.
    if (last && now - last.at < DEDUP_WINDOW_MS) {
      return last.type;
    }

    const type = isIn(last, now) ? ("out" as const) : ("in" as const);
    await ctx.db.insert("badges", { userId: user._id, at: now, type });
    return type;
  },
});

/** Current in/out state of the signed-in employee. */
export const myStatus = query({
  args: {},
  returns: v.object({ isIn: v.boolean(), since: v.union(v.number(), v.null()) }),
  handler: async (ctx) => {
    const user = await requireActive(ctx);
    const last = await lastPunch(ctx, user._id);
    const inside = isIn(last, Date.now());
    return { isIn: inside, since: inside ? last!.at : null };
  },
});

export type Day = {
  date: string;
  punches: { at: number; type: "in" | "out"; label: string }[];
  minutes: number;
  incomplete: boolean;
};

/**
 * Group a punch list into days, pairing each "in" with the next "out".
 * A day that ends on an unpaired "in" is reported as incomplete rather than
 * being closed at an invented time.
 */
export function groupByDay(punches: Doc<"badges">[]): Day[] {
  const byDate = new Map<string, Doc<"badges">[]>();
  for (const p of punches) {
    const key = dayKey(p.at);
    const day = byDate.get(key);
    if (day) day.push(p);
    else byDate.set(key, [p]);
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, list]) => {
      const asc = [...list].sort((a, b) => a.at - b.at);
      let minutes = 0;
      let openedAt: number | null = null;

      for (const p of asc) {
        if (p.type === "in") {
          openedAt = p.at;
        } else if (openedAt !== null) {
          minutes += Math.round((p.at - openedAt) / 60_000);
          openedAt = null;
        }
      }

      return {
        date,
        punches: asc.map((p) => ({
          at: p.at,
          type: p.type,
          label: timeLabel(p.at),
        })),
        minutes,
        incomplete: openedAt !== null,
      };
    });
}

/** A week or a month of work, keyed by its first day ("2026-08-03", "2026-08"). */
export type Period = { key: string; minutes: number; incomplete: boolean };

/**
 * Roll days up into weeks (Monday-first) and calendar months.
 *
 * Both scales are derived from the same day list, so a total can never
 * disagree with the days shown under it. Week boundaries come from
 * lib/day.ts like every other date in the app — a "week" computed in the
 * browser would drift from the Paris day keys the punches are grouped by.
 *
 * `incomplete` is carried up: a period holding a day with a missing exit is
 * under-counted, and saying so is the only honest option — the alternative is
 * a payroll total that quietly lost a shift.
 */
function summarize(days: Day[]): { weeks: Period[]; months: Period[] } {
  const roll = (keyOf: (date: string) => string): Period[] => {
    const totals = new Map<string, Period>();
    for (const day of days) {
      const key = keyOf(day.date);
      const period = totals.get(key) ?? { key, minutes: 0, incomplete: false };
      period.minutes += day.minutes;
      period.incomplete ||= day.incomplete;
      totals.set(key, period);
    }
    // Newest first, like the day list above it.
    return [...totals.values()].sort((a, b) => b.key.localeCompare(a.key));
  };

  return { weeks: roll(mondayOf), months: roll((date) => date.slice(0, 7)) };
}

/** The signed-in employee's own punch history, newest day first. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireActive(ctx);
    const punches = await ctx.db
      .query("badges")
      .withIndex("by_user_at", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(HISTORY_LIMIT);
    return groupByDay(punches);
  },
});

/**
 * One employee's punch history plus their weekly and monthly totals. Admin
 * only — this is the screen hours are read off for pay.
 */
export const forEmployee = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await requireAdmin(ctx);
    const punches = await ctx.db
      .query("badges")
      .withIndex("by_user_at", (q) => q.eq("userId", userId))
      .order("desc")
      .take(HISTORY_LIMIT);
    const days = groupByDay(punches);
    return { days, ...summarize(days) };
  },
});

/** Who is clocked in right now. Admin only — drives the dashboard. */
/**
 * Who is clocked in right now, for the admin dashboard.
 *
 * Returns `sinceAt` as a raw timestamp rather than a formatted duration on
 * purpose: a Convex query only re-runs when the data it read changes, so a
 * duration computed here with Date.now() would freeze until the next punch.
 * The client ticks it instead — that is what makes the dashboard live.
 */
export const whoIsIn = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const now = Date.now();

    const employees = await ctx.db.query("users").collect();
    const rows = await Promise.all(
      employees
        .filter((u) => u.status === "active")
        .map(async (u) => {
          const last = await lastPunch(ctx, u._id);
          const inside = isIn(last, now);
          return {
            userId: u._id,
            nom: u.nom ?? u.email ?? "—",
            poste: u.poste ?? "",
            isIn: inside,
            sinceAt: inside ? last!.at : null,
            sinceLabel: inside ? timeLabel(last!.at) : null,
            // Last punch of any kind, so someone who left today still shows
            // when they left rather than nothing at all.
            lastAt: last?.at ?? null,
            lastType: last?.type ?? null,
            lastLabel: last ? timeLabel(last.at) : null,
            lastIsToday: last ? dayKey(last.at) === dayKey(now) : false,
          };
        }),
    );

    return rows.sort(
      (a, b) =>
        Number(b.isIn) - Number(a.isIn) ||
        (b.lastAt ?? 0) - (a.lastAt ?? 0) ||
        a.nom.localeCompare(b.nom),
    );
  },
});

/**
 * The shop's punch feed, newest first — every entry and exit with who made it.
 * Convex pushes this to the dashboard as it happens, so the admin sees an
 * arrival the moment it is scanned.
 */
export const recentActivity = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    await requireAdmin(ctx);

    const punches = await ctx.db
      .query("badges")
      .withIndex("by_at")
      .order("desc")
      .take(limit ?? 40);

    const names = new Map<string, string>();
    return await Promise.all(
      punches.map(async (p) => {
        if (!names.has(p.userId)) {
          const u = await ctx.db.get(p.userId);
          names.set(p.userId, u?.nom ?? u?.email ?? "—");
        }
        return {
          _id: p._id,
          userId: p.userId,
          nom: names.get(p.userId)!,
          type: p.type,
          at: p.at,
          time: timeLabel(p.at),
          date: dayKey(p.at),
        };
      }),
    );
  },
});

/**
 * Deletes punches older than the plan's retention window (convex/plan.ts).
 * A no-op when unlimited. Runs daily via convex/crons.ts, in a bounded batch
 * so one run never blocks on an unbounded delete — a backlog just clears
 * over a few days instead of all at once.
 */
export const purgeOld = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const { retentionMonths } = planLimits();
    if (retentionMonths === null) return null;

    const cutoff = monthsAgo(retentionMonths);
    const old = await ctx.db
      .query("badges")
      .withIndex("by_at", (q) => q.lt("at", cutoff))
      .take(500);
    for (const badge of old) await ctx.db.delete(badge._id);
    return null;
  },
});

/**
 * CSV of punches for the current week or month — one shift (in→out) per row,
 * for one employee (`userId`) or every non-pending employee (omitted). This
 * is the payroll export, so admin only. Refuses outright if the plan doesn't
 * include it (convex/plan.ts CSV_EXPORT).
 *
 * ';' delimiter and a leading BOM (see lib/csv.ts) so it opens correctly,
 * accents included, in a plain double-click on French Excel.
 */
export const exportCsv = query({
  args: { userId: v.optional(v.id("users")), period: v.union(v.literal("week"), v.literal("month")) },
  returns: v.string(),
  handler: async (ctx, { userId, period }) => {
    await requireAdmin(ctx);
    if (!planLimits().csvExport) {
      throw new Error("L'export CSV n'est pas inclus dans ce forfait.");
    }

    const today = dayKey(Date.now());
    const dates = period === "week" ? weekDays(today) : daysInMonth(today.slice(0, 7));
    const start = Date.parse(`${dates[0]}T00:00:00Z`);
    const end = Date.parse(`${dates[dates.length - 1]}T23:59:59.999Z`);

    const targets = userId
      ? [await ctx.db.get(userId)].filter((u): u is Doc<"users"> => u !== null)
      : (await ctx.db.query("users").collect()).filter((u) => u.status !== "pending");
    targets.sort((a, b) => (a.nom || a.email || "").localeCompare(b.nom || b.email || ""));

    const rows: string[][] = [
      ["Dar as Saada — Padretar"],
      [
        period === "week"
          ? `Export hebdomadaire — semaine du ${dates[0]}`
          : `Export mensuel — ${dates[0].slice(0, 7)}`,
      ],
      [`Généré le ${dayKey(Date.now())} à ${timeLabel(Date.now())}`],
      [],
      ["Employé", "Date", "Entrée", "Sortie", "Durée"],
    ];
    let grandTotal = 0;

    for (const user of targets) {
      const punches = await ctx.db
        .query("badges")
        .withIndex("by_user_at", (q) => q.eq("userId", user._id).gte("at", start).lte("at", end))
        .collect();
      const name = user.nom || user.email || "—";
      let employeeTotal = 0;

      for (const day of groupByDay(punches).slice().reverse()) {
        // One row per shift: pair each entry with the exit right after it,
        // same rule as the day list in the app (withSpans in DayList.tsx).
        let openedAt: number | null = null;
        for (const p of day.punches) {
          if (p.type === "in") {
            openedAt = p.at;
          } else if (openedAt !== null) {
            const minutes = Math.round((p.at - openedAt) / 60_000);
            rows.push([name, day.date, timeLabel(openedAt), p.label, formatMinutes(minutes)]);
            openedAt = null;
          }
        }
        if (openedAt !== null) {
          rows.push([name, day.date, timeLabel(openedAt), "—", "sortie manquante"]);
        }
        employeeTotal += day.minutes;
      }

      rows.push([`Total ${name}`, "", "", "", formatMinutes(employeeTotal)]);
      grandTotal += employeeTotal;
    }

    if (!userId) rows.push(["Total général", "", "", "", formatMinutes(grandTotal)]);

    return toCsv(rows);
  },
});
