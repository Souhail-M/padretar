import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { timeLabel } from "./lib/day";
import { punchEnum } from "./schema";

/**
 * Telegram announcements of live punches.
 *
 * The kiosk records the punch (convex/badges.ts `punch`) and schedules this
 * right after; a real-time "who just walked in" lands in the chat the
 * responsable reads, without them having the dashboard open.
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
 * internalAction: only the punch mutation can trigger it — no client input
 * reaches the destination chat or the message text beyond the employee's
 * recorded name, time and in/out type.
 */
export const announcePunch = internalAction({
  args: { nom: v.string(), type: punchEnum, at: v.number() },
  returns: v.null(),
  handler: async (_ctx, { nom, type, at }) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return null;

    const text =
      type === "in"
        ? `🟢 ${nom} — entrée à ${timeLabel(at)}`
        : `🔴 ${nom} — sortie à ${timeLabel(at)}`;

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    // A dead bot must never fail the punch that was just recorded: the
    // badge is the work record, the message is a convenience beside it.
    if (!res.ok) {
      console.error(`Telegram announce failed: ${res.status} ${await res.text()}`);
    }
    return null;
  },
});
