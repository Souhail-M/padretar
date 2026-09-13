import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { roleEnum } from "./schema";
import { requireAdmin } from "./lib/auth";
import { planLimits } from "./plan";

/** Throws once the plan's employee cap (convex/plan.ts) is already reached. */
async function assertRoomForOneMore(ctx: MutationCtx) {
  const { maxEmployees } = planLimits();
  if (maxEmployees === null) return;

  const activeCount = (
    await ctx.db
      .query("users")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect()
  ).length;
  if (activeCount >= maxEmployees) {
    throw new Error(`Limite de ${maxEmployees} employés atteinte pour ce forfait.`);
  }
}

/** Everyone, pending accounts first — those are the ones needing a decision. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").collect();

    const rank = { pending: 0, active: 1, disabled: 2 } as const;
    return users
      .map((u) => ({
        _id: u._id,
        nom: u.nom ?? "",
        email: u.email ?? "",
        poste: u.poste ?? "",
        role: u.role,
        status: u.status,
      }))
      .sort(
        (a, b) =>
          rank[a.status] - rank[b.status] ||
          (a.nom || a.email).localeCompare(b.nom || b.email),
      );
  },
});

export const get = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await requireAdmin(ctx);
    return await ctx.db.get(userId);
  },
});

/** Approve a pending sign-up. */
export const approve = mutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    await requireAdmin(ctx);
    await assertRoomForOneMore(ctx);
    await ctx.db.patch(userId, { status: "active" });
    return null;
  },
});

/**
 * Revoke access. Kept separate from deletion on purpose: punches are a work
 * record, so an employee who leaves is disabled, never erased.
 */
export const setStatus = mutation({
  args: {
    userId: v.id("users"),
    status: v.union(v.literal("active"), v.literal("disabled")),
  },
  returns: v.null(),
  handler: async (ctx, { userId, status }) => {
    const admin = await requireAdmin(ctx);
    if (admin._id === userId && status === "disabled") {
      throw new Error("Vous ne pouvez pas désactiver votre propre compte");
    }
    if (status === "active") await assertRoomForOneMore(ctx);
    await ctx.db.patch(userId, { status });
    return null;
  },
});

export const update = mutation({
  args: {
    userId: v.id("users"),
    nom: v.optional(v.string()),
    poste: v.optional(v.string()),
    role: v.optional(roleEnum),
  },
  returns: v.null(),
  handler: async (ctx, { userId, ...fields }) => {
    const admin = await requireAdmin(ctx);
    if (admin._id === userId && fields.role === "employee") {
      throw new Error("Vous ne pouvez pas retirer votre propre rôle admin");
    }
    await ctx.db.patch(userId, fields);
    return null;
  },
});
