import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { requireActive, requireAdmin } from "./lib/auth";
import { dayKey, minutesBetween, weekDays } from "./lib/day";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

async function shiftsForWeek(ctx: QueryCtx, anyDayOfWeek: string) {
  const days = weekDays(anyDayOfWeek);
  const perDay = await Promise.all(
    days.map((date) =>
      ctx.db
        .query("shifts")
        .withIndex("by_date", (q) => q.eq("date", date))
        .collect(),
    ),
  );
  return { days, shifts: perDay.flat() };
}

/** Every shift of a week, with the names needed to render the grid. Admin only. */
export const week = query({
  args: { date: v.optional(v.string()) },
  handler: async (ctx, { date }) => {
    await requireAdmin(ctx);
    const { days, shifts } = await shiftsForWeek(ctx, date ?? dayKey(Date.now()));

    const users = await ctx.db.query("users").collect();
    const employees = users
      .filter((u) => u.status === "active")
      .map((u) => ({ _id: u._id, nom: u.nom ?? u.email ?? "—", poste: u.poste ?? "" }))
      .sort((a, b) => a.nom.localeCompare(b.nom));

    return {
      days,
      employees,
      shifts: shifts.map((s) => ({
        _id: s._id,
        userId: s.userId,
        date: s.date,
        start: s.start,
        end: s.end,
        minutes: minutesBetween(s.start, s.end),
      })),
    };
  },
});

/** The signed-in employee's own week, read-only. */
export const myWeek = query({
  args: { date: v.optional(v.string()) },
  handler: async (ctx, { date }) => {
    const user = await requireActive(ctx);
    const days = weekDays(date ?? dayKey(Date.now()));

    const perDay = await Promise.all(
      days.map((d) =>
        ctx.db
          .query("shifts")
          .withIndex("by_user_date", (q) => q.eq("userId", user._id).eq("date", d))
          .collect(),
      ),
    );

    return {
      days,
      shifts: perDay.flat().map((s) => ({
        _id: s._id,
        date: s.date,
        start: s.start,
        end: s.end,
        minutes: minutesBetween(s.start, s.end),
      })),
    };
  },
});

/** Today's shift for the signed-in employee, if any. */
export const myToday = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireActive(ctx);
    const today = dayKey(Date.now());
    return await ctx.db
      .query("shifts")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id).eq("date", today))
      .collect();
  },
});

export const upsert = mutation({
  args: {
    shiftId: v.optional(v.id("shifts")),
    userId: v.id("users"),
    date: v.string(),
    start: v.string(),
    end: v.string(),
  },
  returns: v.id("shifts"),
  handler: async (ctx, { shiftId, ...shift }) => {
    await requireAdmin(ctx);

    if (!TIME.test(shift.start) || !TIME.test(shift.end)) {
      throw new Error("Heure invalide (format attendu : HH:MM)");
    }
    if (minutesBetween(shift.start, shift.end) === 0) {
      throw new Error("L'heure de fin doit être après l'heure de début");
    }

    if (shiftId) {
      await ctx.db.patch(shiftId, shift);
      return shiftId;
    }
    return await ctx.db.insert("shifts", shift);
  },
});

export const remove = mutation({
  args: { shiftId: v.id("shifts") },
  returns: v.null(),
  handler: async (ctx, { shiftId }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(shiftId);
    return null;
  },
});

/** One employee's shifts, for the admin detail page. */
export const forEmployee = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await requireAdmin(ctx);
    const shifts = await ctx.db
      .query("shifts")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .order("desc")
      .take(200);
    return shifts.map((s) => ({ ...s, minutes: minutesBetween(s.start, s.end) }));
  },
});
