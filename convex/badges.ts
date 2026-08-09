import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { requireActive, requireAdmin } from "./lib/auth";
import { dayKey, formatMinutes, timeLabel } from "./lib/day";

/** How far back the history screens look. A shop punches ~4x/day, so this is
 *  roughly a year for one person. */
const HISTORY_LIMIT = 800;

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

/** One employee's punch history. Admin only. */
export const forEmployee = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await requireAdmin(ctx);
    const punches = await ctx.db
      .query("badges")
      .withIndex("by_user_at", (q) => q.eq("userId", userId))
      .order("desc")
      .take(HISTORY_LIMIT);
    return groupByDay(punches);
  },
});

/** Who is clocked in right now. Admin only — drives the dashboard. */
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
            poste: u.poste,
            isIn: inside,
            since: inside ? timeLabel(last!.at) : null,
            duration: inside
              ? formatMinutes(Math.round((now - last!.at) / 60_000))
              : null,
          };
        }),
    );

    return rows.sort(
      (a, b) => Number(b.isIn) - Number(a.isIn) || a.nom.localeCompare(b.nom),
    );
  },
});
