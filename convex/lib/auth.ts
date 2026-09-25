import { getAuthUserId } from "@convex-dev/auth/server";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

/**
 * The current user, guaranteed signed in and approved.
 *
 * Every query and mutation in this app starts with this (or requireAdmin).
 * A `pending` account holds a session but gets nothing back from the backend,
 * which is what puts the client on the "waiting for approval" screen — the
 * gate lives here once, not in each screen.
 */
export async function requireActive(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Non authentifié");

  const user = await ctx.db.get(userId);
  if (!user) throw new Error("Utilisateur introuvable");

  if (user.status === "pending") throw new Error("Compte en attente de validation");
  if (user.status === "disabled") throw new Error("Compte désactivé");

  return user;
}

/** As requireActive, and the user must be an admin (or the superadmin). */
export async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
  const user = await requireActive(ctx);
  if (user.role !== "admin" && user.role !== "superadmin") {
    throw new Error("Réservé aux administrateurs");
  }
  return user;
}

/**
 * The superadmin sees everything and is seen nowhere: every list, presence
 * board and export filters it out with this, and admins can't open, edit,
 * disable or reset it (see requireTarget).
 */
export const isHidden = (user: Doc<"users"> | null) => user?.role === "superadmin";

/**
 * The user an admin is acting on. The superadmin answers "introuvable" to
 * everyone but itself — same error as a wrong id, so its existence doesn't leak.
 */
export async function requireTarget(
  ctx: QueryCtx | MutationCtx,
  caller: Doc<"users">,
  userId: Id<"users">,
): Promise<Doc<"users">> {
  const target = await ctx.db.get(userId);
  if (!target || (isHidden(target) && caller.role !== "superadmin")) {
    throw new Error("Utilisateur introuvable");
  }
  return target;
}
