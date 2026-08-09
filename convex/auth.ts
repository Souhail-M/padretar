import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { query } from "./_generated/server";
import type { DataModel } from "./_generated/dataModel";

/**
 * Anyone may sign up, but a new account lands in `pending` and can do nothing
 * until an admin approves it (see lib/auth.ts `requireActive`).
 *
 * The one exception bootstraps the shop: whoever signs up with the address in
 * the ADMIN_EMAIL Convex env var becomes an active admin immediately. That
 * replaces a seed script — set it once with:
 *   npx convex env set ADMIN_EMAIL you@example.com
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password<DataModel>({
      profile(params) {
        const email = (params.email as string | undefined)?.trim().toLowerCase();
        if (!email) throw new Error("Email requis");

        const isBootstrapAdmin =
          !!process.env.ADMIN_EMAIL &&
          email === process.env.ADMIN_EMAIL.trim().toLowerCase();

        return {
          email,
          nom: (params.nom as string | undefined)?.trim() || undefined,
          role: isBootstrapAdmin ? ("admin" as const) : ("employee" as const),
          status: isBootstrapAdmin ? ("active" as const) : ("pending" as const),
        };
      },
    }),
  ],
  callbacks: {
    // A disabled account must not get a session at all. `pending` accounts do
    // get one — they need it to see the "waiting for approval" screen — but
    // every data function still refuses them via requireActive.
    async beforeSessionCreation(ctx, { userId }) {
      const user = await ctx.db.get(userId);
      if (user && user.status === "disabled") {
        throw new Error("Compte désactivé");
      }
    },
  },
});

/** The signed-in user's own row, or null. The client reads status/role from it. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});
