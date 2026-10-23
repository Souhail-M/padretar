import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { roleEnum } from "./schema";
import { isHidden, requireAdmin, requireTarget } from "./lib/auth";
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
  ).filter((u) => !isHidden(u)).length;
  if (activeCount >= maxEmployees) {
    throw new Error(`Limite de ${maxEmployees} employés atteinte pour ce forfait.`);
  }
}

/** Everyone, pending accounts first — those are the ones needing a decision. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = (await ctx.db.query("users").collect()).filter((u) => !isHidden(u));

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
    const admin = await requireAdmin(ctx);
    return await requireTarget(ctx, admin, userId);
  },
});

/** Approve a pending sign-up. */
export const approve = mutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const admin = await requireAdmin(ctx);
    await requireTarget(ctx, admin, userId);
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
    await requireTarget(ctx, admin, userId);
    if (admin._id === userId && status === "disabled") {
      throw new Error("Vous ne pouvez pas désactiver votre propre compte");
    }
    if (status === "active") await assertRoomForOneMore(ctx);
    await ctx.db.patch(userId, { status });
    return null;
  },
});

/**
 * Delete an account outright — a duplicate sign-up, a typo, a test account.
 *
 * Narrow on purpose, mirroring the "disabled, never erased" rule on
 * setStatus: an account is deletable only when there is no work record to
 * preserve. Anything with a punch in the books is refused with the way out
 * spelled out (disable it), so payroll history can never vanish through
 * this mutation. Pending accounts never punched, so they always qualify.
 *
 * The cleanup mirrors convex/superadmin.ts scoped to one user: their
 * punches (there are none by the guard above, but belt and suspenders),
 * sessions, refresh tokens, auth accounts and their verification codes go
 * with the user row. Their lingering session then finds no user and dies.
 */
export const remove = mutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const admin = await requireAdmin(ctx);
    await requireTarget(ctx, admin, userId);
    if (admin._id === userId) {
      throw new Error("Vous ne pouvez pas supprimer votre propre compte");
    }

    const target = await ctx.db.get(userId);
    if (target?.role === "admin") {
      const fellowAdmins = (await ctx.db.query("users").collect()).filter(
        (u) =>
          u._id !== userId &&
          u.status === "active" &&
          u.role === "admin" &&
          !isHidden(u),
      );
      if (fellowAdmins.length === 0) {
        throw new Error(
          "Impossible : c'est le dernier compte administrateur — " +
            "nommez-en un autre d'abord",
        );
      }
    }

    const punch = await ctx.db
      .query("badges")
      .withIndex("by_user_at", (q) => q.eq("userId", userId))
      .first();
    if (punch) {
      throw new Error(
        "Ce compte a des pointages : désactivez-le plutôt que de le " +
          "supprimer, son relevé doit être conservé",
      );
    }

    const deadSessions = new Set<string>();
    for (const s of await ctx.db.query("authSessions").collect()) {
      if (s.userId === userId) {
        deadSessions.add(s._id);
        await ctx.db.delete(s._id);
      }
    }
    for (const r of await ctx.db.query("authRefreshTokens").collect()) {
      if (deadSessions.has(r.sessionId)) await ctx.db.delete(r._id);
    }

    const deadAccounts = new Set<string>();
    for (const a of await ctx.db.query("authAccounts").collect()) {
      if (a.userId === userId) {
        deadAccounts.add(a._id);
        await ctx.db.delete(a._id);
      }
    }
    for (const c of await ctx.db.query("authVerificationCodes").collect()) {
      if (deadAccounts.has(c.accountId)) await ctx.db.delete(c._id);
    }
    for (const x of await ctx.db.query("authVerifiers").collect()) {
      if (x.sessionId && deadSessions.has(x.sessionId)) await ctx.db.delete(x._id);
    }

    for (const b of await ctx.db
      .query("badges")
      .withIndex("by_user_at", (q) => q.eq("userId", userId))
      .collect()) {
      await ctx.db.delete(b._id);
    }

    await ctx.db.delete(userId);
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
    const target = await requireTarget(ctx, admin, userId);
    // The superadmin's role is set from the CLI only (convex/superadmin.ts).
    if (isHidden(target) && fields.role) {
      throw new Error("Rôle non modifiable");
    }
    if (admin._id === userId && fields.role === "employee") {
      throw new Error("Vous ne pouvez pas retirer votre propre rôle admin");
    }
    await ctx.db.patch(userId, fields);
    return null;
  },
});
