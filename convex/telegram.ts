import { v } from "convex/values";
import { internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { isHidden } from "./lib/auth";
import { dayKey, timeLabel } from "./lib/day";
import { punchEnum } from "./schema";

/**
 * Telegram announcements of live punches.
 *
 * The kiosk records the punch (convex/badges.ts `punch`) and schedules this
 * right after; a real-time "who just walked in" lands in the chat the
 * responsable reads, without them having the dashboard open. Each message
 * also carries the presence board: who is in the shop right now, since when
 * — the answer "qui est dispo" without opening the app.
 *
 * Everything here is configured by two env vars, same tier as ADMIN_EMAIL —
 * with either missing the whole feature is a silent no-op, so a shop that
 * never asked for a bot keeps behaving exactly as before:
 *   npx convex env set TELEGRAM_BOT_TOKEN "123456:AA…"
 *   npx convex env set TELEGRAM_CHAT_ID "-1009876543210"
 *
 * One-way: the bot only sends. There is no webhook to receive Telegram
 * updates, so nothing about this feature can collect anything, and a
 * disabled shop leaves no route exposed on convex/http.ts.
 *
 * internal*: only the punch mutation can trigger them — no client input
 * reaches the chat beyond recorded facts: the employee's name, the Paris
 * time and the in/out type.
 */

/** One name currently clocked in, with the time they walked in. */
export const presence = internalQuery({
  args: { at: v.number() },
  returns: v.array(
    v.object({
      nom: v.string(),
      since: v.string(),
    }),
  ),
  handler: async (ctx, { at }) => {
    const users = await ctx.db.query("users").collect();
    const rows = await Promise.all(
      users
        .filter((u) => u.status === "active" && !isHidden(u))
        .map(async (u) => {
          const last = await ctx.db
            .query("badges")
            .withIndex("by_user_at", (q) => q.eq("userId", u._id))
            .order("desc")
            .first();
          // Same rule the dashboard's presence board uses (convex/badges.ts
          // isIsIn): an "in" left open from another day is not "currently in".
          if (!last || last.type !== "in" || dayKey(last.at) !== dayKey(at)) {
            return null;
          }
          return { nom: u.nom ?? u.email ?? "—", since: timeLabel(last.at) };
        }),
    );
    return rows
      .filter((r) => r !== null)
      .sort((a, b) => a.nom.localeCompare(b.nom));
  },
});

/** Only the chevrons HTML reserves — names can carry neither otherwise. */
function escapeText(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export const announcePunch = internalAction({
  args: { nom: v.string(), type: punchEnum, at: v.number() },
  returns: v.null(),
  handler: async (ctx, { nom, type, at }) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return null;

    // The puncher appears too: right after an entry they *are* present, and
    // right after an exit the line says so without hiding the fact there are
    // still others in — with their hours since arriving, in a sober flow.
    const inside = await ctx.runQuery(internal.telegram.presence, { at });
    const verb = type === "in" ? "entrée" : "sortie";

    let text =
      `${type === "in" ? "🟢" : "🔴"} <b>${escapeText(nom)}</b> — ${verb} à ${timeLabel(at)}`;

    if (inside.length > 0) {
      const people = inside
        .map((r) => `<b>${escapeText(r.nom)}</b> <i>depuis ${r.since}</i>`)
        .join("\n");
      text += `\n\n📍 <b>${inside.length}</b> en boutique :\n${people}`;
    } else {
      text += "\n\n📍 Personne en boutique.";
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
    // A dead bot must never fail the punch that was just recorded: the
    // badge is the work record, the message is a convenience beside it.
    if (!res.ok) {
      const raw = await res.text();
      console.error(`Telegram announce failed: ${res.status} ${raw}`);
    }
    return null;
  },
});
