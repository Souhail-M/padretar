import { v } from "convex/values";
import {
  invalidateSessions,
  modifyAccountCredentials,
} from "@convex-dev/auth/server";
import { action, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { requireAdmin } from "./lib/auth";

/**
 * Forgotten passwords, without an email service.
 *
 * The usual flow — a "reset link" mailed to the employee — needs a verified
 * sending domain, an API key and a working SITE_URL, none of which this shop
 * has. It would also be the slowest path for the people involved: the
 * employee and the responsable stand in the same room. So the responsable
 * resets it from the employee's fiche and says the new password out loud.
 *
 * The responsable's own password is the one case that has nobody above it,
 * and that one is reset from the command line — see `resetByEmail`.
 */

/** The rule the Password provider applies on sign-up; a reset must not be a way around it. */
function checkPassword(password: string) {
  if (password.trim().length < 8) {
    throw new Error("Mot de passe trop court (8 caractères minimum)");
  }
}

/**
 * The target's login email, which is also their credential's account id.
 *
 * Separate from the action because credentials can only be changed from an
 * action, and an action has no database — the admin check has to happen in a
 * query. Convex passes the caller's identity through `runQuery`, so
 * `requireAdmin` guards this exactly as it guards every other admin function.
 */
export const emailOf = internalQuery({
  args: { userId: v.id("users") },
  returns: v.string(),
  handler: async (ctx, { userId }) => {
    await requireAdmin(ctx);
    const user = await ctx.db.get(userId);
    if (!user?.email) throw new Error("Employé introuvable");
    return user.email;
  },
});

/** Set an employee's password. Admin only. */
export const resetForEmployee = action({
  args: { userId: v.id("users"), password: v.string() },
  returns: v.null(),
  handler: async (ctx, { userId, password }) => {
    checkPassword(password);
    const email = await ctx.runQuery(internal.password.emailOf, { userId });

    await modifyAccountCredentials<DataModel>(ctx, {
      provider: "password",
      account: { id: email, secret: password.trim() },
    });

    // The old password is gone, so the sessions opened with it should go too:
    // a phone left signed in would otherwise keep the access this reset was
    // meant to take back. An admin resetting their own password is signed out
    // here as well, which is correct — they sign back in with the new one.
    await invalidateSessions<DataModel>(ctx, { userId });
    return null;
  },
});

/**
 * The way back in when the forgotten password is the admin's own.
 *
 *   npx convex run password:resetByEmail '{"email":"vous@example.com","password":"…"}'
 *   npx convex run password:resetByEmail '{...}' --prod    # production
 *
 * `internalAction` is unreachable from the browser: only the CLI and the
 * Convex dashboard can call it, and both already hold the deployment's admin
 * key. That key is the credential here — there is no second door to guard.
 */
export const resetByEmail = internalAction({
  args: { email: v.string(), password: v.string() },
  returns: v.null(),
  handler: async (ctx, { email, password }) => {
    checkPassword(password);
    await modifyAccountCredentials<DataModel>(ctx, {
      provider: "password",
      // Accounts are stored under the lowercased email (convex/auth.ts
      // `profile`), so the address typed at the terminal is normalised the
      // same way rather than silently missing the account.
      account: { id: email.trim().toLowerCase(), secret: password.trim() },
    });
    return null;
  },
});
