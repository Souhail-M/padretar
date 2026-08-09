import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

/** How long a displayed code stays valid. The kiosk rotates every 30s, so a
 *  code is replaced well before it expires and a scan is never racing a swap. */
const CODE_TTL_MS = 60_000;

// No I/O/0/1 — the code is also meant to be read aloud and typed by hand.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function newCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** The code currently on the kiosk screen. Admin only — it is the shared secret. */
export const current = query({
  args: {},
  returns: v.union(
    v.object({ code: v.string(), expiresAt: v.number() }),
    v.null(),
  ),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const row = await ctx.db.query("kiosk").unique();
    return row ? { code: row.code, expiresAt: row.expiresAt } : null;
  },
});

/** Replace the displayed code. Called by the kiosk screen every 30 seconds. */
export const rotate = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const next = { code: newCode(), expiresAt: Date.now() + CODE_TTL_MS };

    const row = await ctx.db.query("kiosk").unique();
    if (row) {
      await ctx.db.patch(row._id, next);
    } else {
      await ctx.db.insert("kiosk", next);
    }
    return null;
  },
});
