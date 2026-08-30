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

  test("first punch of the day is an entry, a later one is an exit", async () => {
    const { t, as, code, userId } = await shopWith();

    expect(await as.mutation(api.badges.punch, { code })).toBe("in");

    // Push that punch outside the duplicate window so the next one counts as a
    // genuine second gesture rather than the same scan decoded again.
    await t.run(async (ctx) => {
      const last = await ctx.db
        .query("badges")
        .withIndex("by_user_at", (q) => q.eq("userId", userId as Id<"users">))
        .order("desc")
        .first();
      await ctx.db.patch(last!._id, { at: Date.now() - 60_000 });
    });

    expect(await as.mutation(api.badges.punch, { code })).toBe("out");
  });

  test("one scan decoded twice does not record an entry and an exit", async () => {
    const { as, code } = await shopWith();

    // The camera decodes the same QR several times a second.
    expect(await as.mutation(api.badges.punch, { code })).toBe("in");
    expect(await as.mutation(api.badges.punch, { code })).toBe("in");
    expect(await as.mutation(api.badges.punch, { code })).toBe("in");

    const days = await as.query(api.badges.mine, {});
    expect(days[0].punches).toHaveLength(1);
    expect(days[0].incomplete).toBe(true); // still inside, no exit invented
  });

  test("concurrent decodes of the same scan still record one punch", async () => {
    const { as, code } = await shopWith();

    const results = await Promise.all([
      as.mutation(api.badges.punch, { code }),
      as.mutation(api.badges.punch, { code }),
    ]);
    expect(results).toEqual(["in", "in"]);

    const days = await as.query(api.badges.mine, {});
    expect(days[0].punches).toHaveLength(1);
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

describe("weekly and monthly totals", () => {
  /** A shop with an admin reading the timesheet of one employee. */
  async function shopWithHistory(punches: { at: string; type: "in" | "out" }[]) {
    const t = convexTest(schema, modules);

    const { adminId, userId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        email: "employe@example.com",
        role: "employee",
        status: "active",
      });
      for (const p of punches) {
        await ctx.db.insert("badges", {
          userId,
          at: Date.parse(p.at),
          type: p.type,
        });
      }
      return {
        userId,
        adminId: await ctx.db.insert("users", {
          email: "patron@example.com",
          role: "admin",
          status: "active",
        }),
      };
    });

    return {
      t,
      userId,
      admin: t.withIdentity({ subject: `${adminId}|session` }),
      employee: t.withIdentity({ subject: `${userId}|session` }),
    };
  }

  test("groups days into Monday weeks and calendar months", async () => {
    // Paris is UTC+2 in August, so the offsets are written out explicitly.
    const { admin, userId } = await shopWithHistory([
      // Thursday 30 July — week of Monday 27 July, month of July.
      { at: "2026-07-30T09:00:00+02:00", type: "in" },
      { at: "2026-07-30T12:00:00+02:00", type: "out" }, // 3h
      // Monday 3 August, then Wednesday 5 — same week, and August.
      { at: "2026-08-03T09:00:00+02:00", type: "in" },
      { at: "2026-08-03T17:00:00+02:00", type: "out" }, // 8h
      { at: "2026-08-05T09:00:00+02:00", type: "in" },
      { at: "2026-08-05T11:30:00+02:00", type: "out" }, // 2h30
    ]);

    const { weeks, months } = await admin.query(api.badges.forEmployee, { userId });

    expect(weeks).toEqual([
      { key: "2026-08-03", minutes: 630, incomplete: false },
      { key: "2026-07-27", minutes: 180, incomplete: false },
    ]);
    expect(months).toEqual([
      { key: "2026-08", minutes: 630, incomplete: false },
      { key: "2026-07", minutes: 180, incomplete: false },
    ]);
  });

  test("a day with no exit marks its week and month as under-counted", async () => {
    const { admin, userId } = await shopWithHistory([
      { at: "2026-08-03T09:00:00+02:00", type: "in" },
      { at: "2026-08-03T17:00:00+02:00", type: "out" }, // 8h
      { at: "2026-08-06T09:00:00+02:00", type: "in" }, // never clocked out
    ]);

    const { weeks, months } = await admin.query(api.badges.forEmployee, { userId });

    // The missing exit adds no invented minutes, and says so.
    expect(weeks).toEqual([{ key: "2026-08-03", minutes: 480, incomplete: true }]);
    expect(months).toEqual([{ key: "2026-08", minutes: 480, incomplete: true }]);
  });

  test("a week is counted whole even when it straddles two months", async () => {
    // Monday 31 August 2026 opens a week that ends in September.
    const { admin, userId } = await shopWithHistory([
      { at: "2026-08-31T09:00:00+02:00", type: "in" },
      { at: "2026-08-31T17:00:00+02:00", type: "out" }, // 8h, August
      { at: "2026-09-01T09:00:00+02:00", type: "in" },
      { at: "2026-09-01T13:00:00+02:00", type: "out" }, // 4h, September
    ]);

    const { weeks, months } = await admin.query(api.badges.forEmployee, { userId });

    expect(weeks).toEqual([{ key: "2026-08-31", minutes: 720, incomplete: false }]);
    expect(months).toEqual([
      { key: "2026-09", minutes: 240, incomplete: false },
      { key: "2026-08", minutes: 480, incomplete: false },
    ]);
  });

  test("two shifts in one day add up, and the day totals match the week", async () => {
    const { admin, userId } = await shopWithHistory([
      { at: "2026-08-03T09:00:00+02:00", type: "in" },
      { at: "2026-08-03T12:00:00+02:00", type: "out" }, // 3h
      { at: "2026-08-03T14:00:00+02:00", type: "in" },
      { at: "2026-08-03T18:30:00+02:00", type: "out" }, // 4h30
    ]);

    const { days, weeks } = await admin.query(api.badges.forEmployee, { userId });

    expect(days).toHaveLength(1);
    expect(days[0].minutes).toBe(450);
    expect(days[0].punches).toHaveLength(4);
    expect(weeks[0].minutes).toBe(450);
  });

  test("an employee cannot read another employee's timesheet", async () => {
    const { employee, userId } = await shopWithHistory([]);
    await expect(
      employee.query(api.badges.forEmployee, { userId }),
    ).rejects.toThrow(/administrateurs/);
  });

  test("an employee cannot reset a password", async () => {
    const { employee, userId } = await shopWithHistory([]);
    await expect(
      employee.action(api.password.resetForEmployee, {
        userId,
        password: "motdepasse",
      }),
    ).rejects.toThrow(/administrateurs/);
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
