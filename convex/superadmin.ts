import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * Wipes every account except `keepEmail`, which becomes the superadmin:
 * above admin, hidden from every list, presence board and export (see
 * lib/auth.ts isHidden), and untouchable by admins. The shop then starts
 * clean — its first sign-up lands in `pending` and the superadmin approves
 * it and makes it admin; that admin manages everyone else.
 *
 * Deletes the other users' punches, sessions and credentials too, plus the
 * kiosk exit password (it belonged to the old admin). Irreversible.
 *
 * `internalMutation`: only the CLI / Convex dashboard (admin key) can run it.
 *   npx convex run superadmin:resetKeeping '{"keepEmail":"you@example.com"}' --prod
 */
export const resetKeeping = internalMutation({
  args: { keepEmail: v.string() },
  returns: v.object({ deletedUsers: v.number(), deletedBadges: v.number() }),
  handler: async (ctx, { keepEmail }) => {
    const email = keepEmail.trim().toLowerCase();
    const keep = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    // Refuse rather than wipe everyone: a typo here would lock you out too.
    if (!keep) throw new Error(`Aucun compte pour ${email}`);

    await ctx.db.patch(keep._id, { role: "superadmin", status: "active" });

    let deletedUsers = 0;
    for (const u of await ctx.db.query("users").collect()) {
      if (u._id === keep._id) continue;
      await ctx.db.delete(u._id);
      deletedUsers++;
    }

    let deletedBadges = 0;
    for (const b of await ctx.db.query("badges").collect()) {
      if (b.userId === keep._id) continue;
      await ctx.db.delete(b._id);
      deletedBadges++;
    }

    const keptSessions = new Set<string>();
    for (const s of await ctx.db.query("authSessions").collect()) {
      if (s.userId === keep._id) keptSessions.add(s._id);
      else await ctx.db.delete(s._id);
    }
    for (const r of await ctx.db.query("authRefreshTokens").collect()) {
      if (!keptSessions.has(r.sessionId)) await ctx.db.delete(r._id);
    }

    const keptAccounts = new Set<string>();
    for (const a of await ctx.db.query("authAccounts").collect()) {
      if (a.userId === keep._id) keptAccounts.add(a._id);
      else await ctx.db.delete(a._id);
    }
    for (const c of await ctx.db.query("authVerificationCodes").collect()) {
      if (!keptAccounts.has(c.accountId)) await ctx.db.delete(c._id);
    }
    for (const x of await ctx.db.query("authVerifiers").collect()) {
      if (!x.sessionId || !keptSessions.has(x.sessionId)) await ctx.db.delete(x._id);
    }
    for (const x of await ctx.db.query("authRateLimits").collect()) await ctx.db.delete(x._id);
    for (const x of await ctx.db.query("kioskExit").collect()) await ctx.db.delete(x._id);

    return { deletedUsers, deletedBadges };
  },
});
