import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { query } from "./_generated/server";
import type { DataModel } from "./_generated/dataModel";

/** Comma-separated allowlist from the ADMIN_EMAIL env var, lowercased. */
function bootstrapAdminEmails(): string[] {
  return (process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Anyone may sign up, but a new account lands in `pending` and can do nothing
 * until an admin approves it (see lib/auth.ts `requireActive`).
 *
 * Two ways out of `pending`, both without the developer touching anything:
 * the very first sign-up ever on a fresh instance becomes an active admin —
 * that's the shop owner, standing up their own instance — and so does anyone
 * whose address is listed in the optional ADMIN_EMAIL env var, for when a
 * specific address must be forced instead:
 *   npx convex env set ADMIN_EMAIL "you@example.com,other@example.com"
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password<DataModel>({
      profile(params) {
        const email = (params.email as string | undefined)?.trim().toLowerCase();
        if (!email) throw new Error("Email requis");

        // profile() also runs on signIn/reset, where only the email is sent —
        // so the name is required at sign-up only.
        const prenom = (params.prenom as string | undefined)?.trim() ?? "";
        const nom = (params.nom as string | undefined)?.trim() ?? "";
        if (params.flow === "signUp" && (!prenom || !nom)) {
          throw new Error("Nom et prénom requis");
        }

        return {
          email,
          // ponytail: one "Prénom Nom" display field, which is what every
          // screen and export shows; split into two columns if sorting by
          // family name is ever asked for.
          nom: [prenom, nom].filter(Boolean).join(" ") || undefined,
          role: "employee" as const,
          status: "pending" as const,
        };
      },
      // No `reset`: there is deliberately no emailed self-service reset.
      // Everyone in a single shop shares a room, so an admin resets a forgotten
      // password in person from the employee's fiche (`password:resetForEmployee`),
      // and the responsable's own is the CLI break-glass `password:resetByEmail`.
      // Leaving this unset also means the `reset` auth flow has no server to
      // talk to, so it cannot be reached even by a hand-built request.
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

    // Runs after the user row exists, so it can see who else is in the table
    // — unlike `profile`, which only ever sees the email. No-ops instantly
    // once an account is no longer `pending`, so this costs nothing on every
    // later sign-in.
    async afterUserCreatedOrUpdated(ctx, { userId }) {
      const user = await ctx.db.get(userId);
      if (!user || user.status !== "pending") return;

      const email = user.email ?? "";
      const isAllowlisted = bootstrapAdminEmails().includes(email);
      const isFirstEver = (await ctx.db.query("users").take(2)).length === 1;

      if (isAllowlisted || isFirstEver) {
        await ctx.db.patch(userId, { role: "admin", status: "active" });
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
