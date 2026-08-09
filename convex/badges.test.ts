import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import schema from "./schema";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { dayKey, formatMinutes, minutesBetween } from "./lib/day";

const modules = import.meta.glob("./**/*.ts");

/** A signed-in employee, plus a kiosk showing `code`. */
async function shopWith(
  status: "active" | "pending" = "active",
  expiresInMs = 60_000,
) {
  const t = convexTest(schema, modules);
  const code = "ABC234";

  const userId = await t.run(async (ctx) => {
    await ctx.db.insert("kiosk", { code, expiresAt: Date.now() + expiresInMs });
    return await ctx.db.insert("users", {
      email: "employe@example.com",
      nom: "Employé",
      role: "employee",
      status,
    });
  });

  // Convex Auth encodes the identity subject as "<userId>|<sessionId>".
  return { t, code, userId, as: t.withIdentity({ subject: `${userId}|session` }) };
}

describe("punch", () => {
  test("refuses a code that is not the one on the kiosk", async () => {
    const { as } = await shopWith();
    await expect(as.mutation(api.badges.punch, { code: "ZZZZZZ" })).rejects.toThrow(
      /Code invalide/,
    );
  });

  test("refuses the right code once it has expired", async () => {
    const { as, code } = await shopWith("active", -1_000);
    await expect(as.mutation(api.badges.punch, { code })).rejects.toThrow(
      /Code invalide/,
    );
  });

  test("refuses an employee still awaiting approval", async () => {
    const { as, code } = await shopWith("pending");
    await expect(as.mutation(api.badges.punch, { code })).rejects.toThrow(
      /en attente/,
    );
  });

  test("refuses a visitor who is not signed in", async () => {
    const { t, code } = await shopWith();
    await expect(t.mutation(api.badges.punch, { code })).rejects.toThrow(
      /Non authentifié/,
    );
  });

  test("first punch of the day is an entry, the next one is an exit", async () => {
    const { as, code } = await shopWith();

    expect(await as.mutation(api.badges.punch, { code })).toBe("in");
    expect(await as.mutation(api.badges.punch, { code })).toBe("out");
    expect(await as.mutation(api.badges.punch, { code })).toBe("in");
  });

  test("accepts a lowercase code typed by hand", async () => {
    const { as, code } = await shopWith();
    expect(await as.mutation(api.badges.punch, { code: code.toLowerCase() })).toBe(
      "in",
    );
  });

  test("an entry left open yesterday does not make today start on an exit", async () => {
    const { t, as, code, userId } = await shopWith();

    // Yesterday: clocked in, never clocked out.
    await t.run(async (ctx) => {
      await ctx.db.insert("badges", {
        userId: userId as Id<"users">,
        at: Date.now() - 24 * 3600 * 1000,
        type: "in",
      });
    });

    expect(await as.mutation(api.badges.punch, { code })).toBe("in");

    const days = await as.query(api.badges.mine, {});
    expect(days.find((d) => d.incomplete)).toBeTruthy();
  });
});

describe("day helpers", () => {
  test("dayKey follows Paris, not UTC, across midnight", () => {
    // 2026-08-09 22:30 UTC is already the 10th in Paris (summer time, UTC+2).
    expect(dayKey(Date.parse("2026-08-09T22:30:00Z"))).toBe("2026-08-10");
    expect(dayKey(Date.parse("2026-08-09T21:30:00Z"))).toBe("2026-08-09");

    // In winter Paris is UTC+1, so the boundary moves by an hour.
    expect(dayKey(Date.parse("2026-01-09T23:30:00Z"))).toBe("2026-01-10");
    expect(dayKey(Date.parse("2026-01-09T22:30:00Z"))).toBe("2026-01-09");
  });

  test("shift durations and their labels", () => {
    expect(minutesBetween("09:00", "14:00")).toBe(300);
    expect(minutesBetween("14:00", "09:00")).toBe(0); // never negative
    expect(formatMinutes(300)).toBe("5h");
    expect(formatMinutes(447)).toBe("7h27");
  });
});
