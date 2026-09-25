import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { isHidden, requireActive, requireAdmin, requireTarget } from "./lib/auth";
import {
  addDays,
  dayKey,
  formatMinutes,
  mondayOf,
  monthsAgo,
  parisToUtc,
  timeLabel,
  weekTitle,
} from "./lib/day";
import { exportArgs } from "./lib/exportArgs";
import {
  MAX_PERIOD_OPTIONS,
  periodBounds,
  periodTitle,
  resolveSelection,
  type ExportPeriodOption,
  type ExportScale,
} from "./lib/exportRange";
import { planLimits } from "./plan";
import { punchEnum } from "./schema";

/** How far back the history screens look. A shop punches ~4x/day, so this is
 *  roughly a year for one person. */
const HISTORY_LIMIT = 800;

/**
 * How many punches exportPeriods may read in total, across every employee.
 *
 * The picker asks the same question for one employee or for the whole shop, and
 * the shop-wide case used to multiply HISTORY_LIMIT by the headcount — the
 * heaviest read in the app by a wide margin, on a query that only needs to know
 * *which* days have punches, not what happened on them. Convex caps a single
 * query at 16k document reads, so that version failed outright once the shop
 * grew past ~20 employees.
 *
 * One budget for the whole query, spent in the same order the targets are
 * listed, so the cost is bounded no matter how many people are on the books.
 * Running out truncates the oldest periods off the list rather than throwing:
 * the options are already capped at 60 weeks / 36 months / 10 years, newest
 * first, and `days` is a hint beside a label rather than a total anyone pays
 * from. What this must never become is a silent wrong answer — hence the cap is
 * generous enough that reaching it is a deliberate signal, not routine.
 */
const EXPORT_PERIOD_READ_BUDGET = 8_000;

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
 * The toggle is bounded to the day. A forgotten clock-out simply leaves that
 * day incomplete and visible as such — no auto-close is invented, because
 * guessing an end time would silently fabricate worked hours. The admin
 * correction below (editPunch/addPunch/deletePunch) is the deliberate,
 * visible override for when the real time is actually known.
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

/**
 * Fixes a wrong punch — admin only, and the only place a punch's time or
 * type changes after the fact. `date`/`time` are Paris-local, like every
 * other date in this app; converting them is lib/day.ts's job, never the
 * client's.
 */
export const editPunch = mutation({
  args: { badgeId: v.id("badges"), date: v.string(), time: v.string(), type: punchEnum },
  returns: v.null(),
  handler: async (ctx, { badgeId, date, time, type }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(badgeId, { at: parisToUtc(date, time), type });
    return null;
  },
});

/** Adds a punch the kiosk never recorded — e.g. a forgotten exit, once the
 *  real time is known. Admin only. */
export const addPunch = mutation({
  args: { userId: v.id("users"), date: v.string(), time: v.string(), type: punchEnum },
  returns: v.null(),
  handler: async (ctx, { userId, date, time, type }) => {
    const admin = await requireAdmin(ctx);
    await requireTarget(ctx, admin, userId);
    await ctx.db.insert("badges", { userId, at: parisToUtc(date, time), type });
    return null;
  },
});

/** Deletes an erroneous punch — a duplicate scan, a wrong tap. Admin only.
 *  Deletion, not disabling: a mistaken punch is not a work record worth
 *  keeping, unlike an employee's account (see employees.ts setStatus). */
export const deletePunch = mutation({
  args: { badgeId: v.id("badges") },
  returns: v.null(),
  handler: async (ctx, { badgeId }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(badgeId);
    return null;
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
  punches: { _id: Id<"badges">; at: number; type: "in" | "out"; label: string }[];
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
          _id: p._id,
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
    const admin = await requireAdmin(ctx);
    await requireTarget(ctx, admin, userId);
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
        .filter((u) => u.status === "active" && !isHidden(u))
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

    const names = new Map<string, string | null>();
    const rows = await Promise.all(
      punches.map(async (p) => {
        if (!names.has(p.userId)) {
          const u = await ctx.db.get(p.userId);
          // null = hidden (superadmin): dropped below.
          names.set(p.userId, isHidden(u) ? null : (u?.nom ?? u?.email ?? "—"));
        }
        if (names.get(p.userId) === null) return null;
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
    return rows.filter((r) => r !== null);
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

export type ExportShift = {
  date: string;
  inLabel: string;
  outLabel: string;
  duration: string;
  missingExit: boolean;
};
export type ExportWeek = { key: string; label: string; shifts: ExportShift[]; minutes: number };
export type ExportEmployee = { name: string; weeks: ExportWeek[]; totalMinutes: number };
export type ExportPayload = {
  /** What the selection covered, for the file's own header — "03/08/2026 –
   *  30/08/2026", or "4 périodes (… – …)". */
  periodLabel: string;
  generatedAt: string;
  employees: ExportEmployee[];
  /** null for a single-employee export — one employee's total already is
   *  the "grand" total, showing both would just repeat the number. */
  grandTotalMinutes: number | null;
};

/**
 * The export's period vocabulary, re-exported from the module that owns it
 * (convex/lib/exportRange.ts) so the picker, the data query and the client
 * all talk about the same "week".
 */
export type { ExportPeriodOption, ExportScale, ExportSpan } from "./lib/exportRange";

/** Whom an export covers: the one employee named, or everyone on the books. */
async function exportTargets(
  ctx: QueryCtx,
  admin: Doc<"users">,
  userId: Id<"users"> | undefined,
) {
  const targets = userId
    ? [await requireTarget(ctx, admin, userId)]
    : (await ctx.db.query("users").collect()).filter(
        (u) => u.status !== "pending" && !isHidden(u),
      );
  // Alphabetical, so the file lists people in the same order every month.
  targets.sort((a, b) => (a.nom || a.email || "").localeCompare(b.nom || b.email || ""));
  return targets;
}

/**
 * The periods the export picker may offer, for one employee or the whole shop.
 *
 * Built from punches that actually exist rather than generated from the
 * calendar, so nobody can select a week that would download an empty sheet.
 *
 * Each option carries its own bounds. That is what makes multi-select work
 * without the browser ever reimplementing Monday-first weeks, month lengths or
 * leap years: the client hands back the `from`/`to` pairs it was given.
 *
 * Admin only. Deliberately not plan-gated — a plan without export should see
 * an empty picker explaining itself, not a button that throws on click.
 *
 * Reads are bounded by EXPORT_PERIOD_READ_BUDGET across all employees, so the
 * shop-wide picker costs about what the single-employee one does.
 */
export const exportPeriods = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, { userId }) => {
    const admin = await requireAdmin(ctx);
    const allowed = planLimits().csvExport;

    const worked = new Set<string>();
    let budget = EXPORT_PERIOD_READ_BUDGET;
    for (const user of await exportTargets(ctx, admin, userId)) {
      if (budget <= 0) break;
      const punches = await ctx.db
        .query("badges")
        .withIndex("by_user_at", (q) => q.eq("userId", user._id))
        .order("desc")
        .take(Math.min(HISTORY_LIMIT, budget));
      budget -= punches.length;
      for (const punch of punches) worked.add(dayKey(punch.at));
    }

    const options = (scale: ExportScale): ExportPeriodOption[] => {
      const counts = new Map<string, number>();
      for (const day of worked) {
        const key =
          scale === "week"
            ? mondayOf(day)
            : scale === "month"
              ? day.slice(0, 7)
              : day.slice(0, 4);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      return [...counts.entries()]
        .sort((a, b) => b[0].localeCompare(a[0])) // newest first
        .slice(0, MAX_PERIOD_OPTIONS[scale])
        .map(([key, days]) => ({ key, label: periodTitle(scale, key), ...periodBounds(scale, key), days }));
    };

    return {
      allowed,
      weeks: options("week"),
      months: options("month"),
      years: options("year"),
    };
  },
});

/**
 * The data behind the Excel export (convex/export.ts, the only place that
 * builds the file) — one shift (in→out) per row, grouped by week then day,
 * for one employee (`userId`) or every non-pending employee (omitted).
 *
 * Admin only, and refuses outright if the plan doesn't include it
 * (convex/plan.ts CSV_EXPORT — the flag name predates the switch from CSV to
 * a styled Excel file; kept as-is since it's already set on every live
 * deployment and nothing user-facing shows the name).
 *
 * `internalQuery` rather than `query`: the export action needs Node's
 * `exceljs`, which can't share a file with reactive queries/mutations
 * (Convex's "use node" directive is file-scoped), so this is called via
 * `ctx.runQuery` from that separate Node action instead of from the client
 * directly.
 */
export const exportData = internalQuery({
  args: exportArgs,
  handler: async (ctx, { userId, period, spans }): Promise<ExportPayload> => {
    const admin = await requireAdmin(ctx);
    if (!planLimits().csvExport) {
      throw new Error("L'export n'est pas inclus dans ce forfait.");
    }

    const { days: wanted, label } = resolveSelection(spans, period);
    const ordered = [...wanted].sort();

    // The index bounds are widened a day past the selection on each side.
    // Paris midnight falls at 22:00 or 23:00 UTC, so a 00:00:00Z bound would
    // drop punches made between local midnight and UTC midnight; the exact
    // dayKey filter below is what actually decides, so over-fetching here is
    // free and the boundary stops losing rows.
    const start = Date.parse(`${addDays(ordered[0], -1)}T00:00:00Z`);
    const end = Date.parse(`${addDays(ordered[ordered.length - 1], 1)}T23:59:59.999Z`);

    const targets = await exportTargets(ctx, admin, userId);

    const employees: ExportEmployee[] = [];
    let grandTotal = 0;

    for (const user of targets) {
      const punches = await ctx.db
        .query("badges")
        .withIndex("by_user_at", (q) => q.eq("userId", user._id).gte("at", start).lte("at", end))
        .collect();

      const byWeek = new Map<string, ExportWeek>();

      for (const day of groupByDay(punches)
        .filter((d) => wanted.has(d.date))
        .slice()
        .reverse()) {
        const weekKey = mondayOf(day.date);
        const week = byWeek.get(weekKey) ?? {
          key: weekKey,
          // Readable, not the raw key: a file spanning a dozen weeks has to be
          // skimmable without decoding "2026-08-10" as a date first.
          label: `Semaine du ${weekTitle(weekKey)}`,
          shifts: [],
          minutes: 0,
        };

        // One shift per row: pair each entry with the exit right after it,
        // same rule as the day list in the app (withSpans in DayList.tsx).
        let openedAt: number | null = null;
        for (const p of day.punches) {
          if (p.type === "in") {
            openedAt = p.at;
          } else if (openedAt !== null) {
            const minutes = Math.round((p.at - openedAt) / 60_000);
            week.shifts.push({
              date: day.date,
              inLabel: timeLabel(openedAt),
              outLabel: p.label,
              duration: formatMinutes(minutes),
              missingExit: false,
            });
            openedAt = null;
          }
        }
        if (openedAt !== null) {
          week.shifts.push({
            date: day.date,
            inLabel: timeLabel(openedAt),
            outLabel: "—",
            duration: "sortie manquante",
            missingExit: true,
          });
        }

        week.minutes += day.minutes;
        byWeek.set(weekKey, week);
      }

      const weeks = [...byWeek.values()].sort((a, b) => a.key.localeCompare(b.key));
      const employeeTotal = weeks.reduce((sum, w) => sum + w.minutes, 0);

      employees.push({ name: user.nom || user.email || "—", weeks, totalMinutes: employeeTotal });
      grandTotal += employeeTotal;
    }

    return {
      periodLabel: label,
      generatedAt: `${dayKey(Date.now())} à ${timeLabel(Date.now())}`,
      employees,
      grandTotalMinutes: userId ? null : grandTotal,
    };
  },
});
