import { v } from "convex/values";

/**
 * The argument shape shared by the export data query (convex/badges.ts) and the
 * action that writes the file (convex/export.ts).
 *
 * It lives in its own file because the two sides must agree exactly — the
 * action calls the query through ctx.runQuery, and a validator duplicated in
 * both places is a type error waiting to happen the first time one side gains
 * a field. The meaning of a span is in convex/lib/exportRange.ts.
 */

/** An inclusive range of "YYYY-MM-DD" days. */
export const spanValidator = v.object({
  from: v.string(),
  to: v.string(),
});

export const exportArgs = {
  userId: v.optional(v.id("users")),
  /** The one-click preset: "this week" / "this month". */
  period: v.optional(v.union(v.literal("week"), v.literal("month"))),
  /** The picker's own selection — one span per checked period, or a single
   *  span for the custom date range. */
  spans: v.optional(v.array(spanValidator)),
};
