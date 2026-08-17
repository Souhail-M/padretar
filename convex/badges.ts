import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { requireActive, requireAdmin } from "./lib/auth";
import { dayKey, mondayOf, timeLabel } from "./lib/day";

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
function groupByDay(punches: Doc<"badges">[]): Day[] {
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
