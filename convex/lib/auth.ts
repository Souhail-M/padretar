import { getAuthUserId } from "@convex-dev/auth/server";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";

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

/** As requireActive, and the user must be an admin. */
export async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
  const user = await requireActive(ctx);
  if (user.role !== "admin") throw new Error("Réservé aux administrateurs");
  return user;
}
