import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { requireActive, requireAdmin } from "./lib/auth";

/**
 * The kiosk's exit password, deliberately separate from the login password.
 *
 * The screen sits in the shop under an admin session; leaving it must cost a
 * secret. That secret used to be the responsable's full account password —
 * which meant typing a strong credential on a shared screen, in front of
 * whoever is around, several times a day. So the kiosk gets its own password:
 * short enough to type without shame, and worthless everywhere else.
 *
 * Stored as salt + SHA-256 hash only. A single unsalted iteration would be
 * wrong for an account credential (offline cracking); here there is nothing to
 * crack offline — the row never leaves the server, and the honest ceiling of
 * this gate is online guessing, which the minimum length and the fact that it
 * guards one browser tab keep proportionate. Locking the device at OS level is
 * the stronger step, and stays outside the app.
 */

/** Shorter than an account password: it guards a screen, not an identity —
 *  but not so short that a stranger could brute-force it while the
 *  responsable is on a coffee break. */
const MIN_LENGTH = 6;

async function hashWithSalt(secret: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function newSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function check(password: string) {
  if (password.trim().length < MIN_LENGTH) {
    throw new Error(`Mot de passe trop court (${MIN_LENGTH} caractères minimum)`);
  }
}

const row = async (ctx: QueryCtx) =>
  await ctx.db.query("kioskExit").unique();

/** Whether a dedicated exit password exists. Admin only — it drives both the
 *  unlock dialog and its management card. */
export const state = query({
  args: {},
  returns: v.object({ configured: v.boolean() }),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return { configured: (await row(ctx)) !== null };
  },
});

/**
 * Set or replace the dedicated password. Admin only — same trust level as
 * resetting an employee's password, so like that path it asks for no
 * confirmation of the old value: the session already proved who you are.
 */
export const set = mutation({
  args: { password: v.string() },
  returns: v.null(),
  handler: async (ctx, { password }) => {
    await requireAdmin(ctx);
    check(password);

    // Fresh salt on every change, so two kiosks (or two eras of the same one)
    // with the same password never share a stored hash.
    const salt = newSalt();
    const hash = await hashWithSalt(password.trim(), salt);

    const existing = await row(ctx);
    if (existing) {
      await ctx.db.patch(existing._id, { salt, hash });
    } else {
      await ctx.db.insert("kioskExit", { salt, hash });
    }
    return null;
  },
});

/** Drop the dedicated password; unlocking falls back to the login password.
 *  Admin only. */
export const clear = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const existing = await row(ctx);
    if (existing) await ctx.db.delete(existing._id);
    return null;
  },
});

/**
 * Check a candidate against the dedicated password. Any signed-in user may
 * ask — whoever stands at the kiosk holds a live admin session already, and
 * refusing to answer would just lock the shop screen until someone with a
 * phone walks over.
 */
export const verify = mutation({
  args: { password: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { password }) => {
    await requireActive(ctx);
    const existing = await row(ctx);
    if (!existing) return false;

    const candidate = await hashWithSalt(
      password.trim(),
      existing.salt,
    );
    return candidate === existing.hash;
  },
});
