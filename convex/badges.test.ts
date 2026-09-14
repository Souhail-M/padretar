import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import schema from "./schema";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { dayKey, formatMinutes, minutesBetween, monthsAgo, parisToUtc } from "./lib/day";

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

describe("weekly and monthly totals", () => {
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

describe("manual punch corrections", () => {
  test("editPunch fixes a wrong time and type", async () => {
    const { t, admin, userId } = await shopWithHistory([
      { at: "2026-08-03T09:00:00+02:00", type: "in" },
    ]);
    const [badge] = await t.run(async (ctx) => ctx.db.query("badges").collect());

    await admin.mutation(api.badges.editPunch, {
      badgeId: badge._id,
      date: "2026-08-03",
      time: "09:30",
      type: "out",
    });

    const [updated] = await t.run(async (ctx) => ctx.db.query("badges").collect());
    expect(updated.type).toBe("out");
    // 09:30 Paris in August (UTC+2) is 07:30 UTC.
    expect(new Date(updated.at).toISOString()).toBe("2026-08-03T07:30:00.000Z");
  });

  test("addPunch fills the exit a forgotten clock-out never recorded", async () => {
    const { t, admin, userId } = await shopWithHistory([
      { at: "2026-08-03T09:00:00+02:00", type: "in" },
    ]);

    let days = (await admin.query(api.badges.forEmployee, { userId })).days;
    expect(days[0].incomplete).toBe(true);

    await admin.mutation(api.badges.addPunch, {
      userId,
      date: "2026-08-03",
      time: "17:00",
      type: "out",
    });

    days = (await admin.query(api.badges.forEmployee, { userId })).days;
    expect(days[0].incomplete).toBe(false);
    expect(days[0].minutes).toBe(480);
  });

  test("deletePunch removes an erroneous duplicate", async () => {
    const { t, admin } = await shopWithHistory([
      { at: "2026-08-03T09:00:00+02:00", type: "in" },
      { at: "2026-08-03T09:00:05+02:00", type: "in" },
    ]);
    const [first] = await t.run(async (ctx) => ctx.db.query("badges").collect());

    await admin.mutation(api.badges.deletePunch, { badgeId: first._id });

    const remaining = await t.run(async (ctx) => ctx.db.query("badges").collect());
    expect(remaining).toHaveLength(1);
  });

  test("an employee cannot edit, add or delete a punch", async () => {
    const { t, employee, userId } = await shopWithHistory([
      { at: "2026-08-03T09:00:00+02:00", type: "in" },
    ]);
    const [badge] = await t.run(async (ctx) => ctx.db.query("badges").collect());

    await expect(
      employee.mutation(api.badges.editPunch, {
        badgeId: badge._id,
        date: "2026-08-03",
        time: "10:00",
        type: "in",
      }),
    ).rejects.toThrow(/administrateurs/);
    await expect(
      employee.mutation(api.badges.addPunch, {
        userId,
        date: "2026-08-03",
        time: "17:00",
        type: "out",
      }),
    ).rejects.toThrow(/administrateurs/);
    await expect(
      employee.mutation(api.badges.deletePunch, { badgeId: badge._id }),
    ).rejects.toThrow(/administrateurs/);
  });
});

describe("retention", () => {
  test("purgeOld deletes punches past RETENTION_MONTHS and keeps the rest", async () => {
    process.env.RETENTION_MONTHS = "6";
    const t = convexTest(schema, modules);

    const userId = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        email: "employe@example.com",
        role: "employee",
        status: "active",
      });
      await ctx.db.insert("badges", { userId, at: monthsAgo(7), type: "in" }); // too old
      await ctx.db.insert("badges", { userId, at: monthsAgo(1), type: "in" }); // kept
      return userId;
    });

    await t.mutation(internal.badges.purgeOld, {});

    const remaining = await t.run(async (ctx) =>
      ctx.db
        .query("badges")
        .withIndex("by_user_at", (q) => q.eq("userId", userId))
        .collect(),
    );
    expect(remaining).toHaveLength(1);
    delete process.env.RETENTION_MONTHS;
  });

  test("purgeOld is a no-op with no RETENTION_MONTHS set", async () => {
    delete process.env.RETENTION_MONTHS;
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        email: "e@example.com",
        role: "employee",
        status: "active",
      });
      await ctx.db.insert("badges", { userId, at: monthsAgo(24), type: "in" });
    });

    await t.mutation(internal.badges.purgeOld, {});
    const remaining = await t.run(async (ctx) => ctx.db.query("badges").collect());
    expect(remaining).toHaveLength(1);
  });
});

describe("Excel export", () => {
  test("exportData refuses when the plan doesn't include it", async () => {
    delete process.env.CSV_EXPORT;
    const { admin, userId } = await shopWithHistory([
      { at: "2026-08-03T09:00:00+02:00", type: "in" },
      { at: "2026-08-03T17:00:00+02:00", type: "out" },
    ]);
    await expect(
      admin.query(internal.badges.exportData, { userId, period: "month" }),
    ).rejects.toThrow(/pas inclus/);
  });

  test("exportData refuses an employee", async () => {
    process.env.CSV_EXPORT = "true";
    const { employee, userId } = await shopWithHistory([]);
    await expect(
      employee.query(internal.badges.exportData, { userId, period: "week" }),
    ).rejects.toThrow(/administrateurs/);
    delete process.env.CSV_EXPORT;
  });

  test("one employee's export lists their shifts and a total, no grand total", async () => {
    process.env.CSV_EXPORT = "true";
    const today = dayKey(Date.now());
    const { admin, userId } = await shopWithHistory([
      { at: `${today}T09:00:00Z`, type: "in" },
      { at: `${today}T17:00:00Z`, type: "out" },
    ]);

    const payload = await admin.query(internal.badges.exportData, {
      userId,
      period: "month",
    });
    expect(payload.employees).toHaveLength(1);
    // The seeded user has no `nom`, so the export falls back to their email.
    expect(payload.employees[0].name).toBe("employe@example.com");
    expect(payload.employees[0].totalMinutes).toBe(480);
    expect(payload.grandTotalMinutes).toBeNull();
    delete process.env.CSV_EXPORT;
  });

  test("the global export sums every employee into one grand total", async () => {
    process.env.CSV_EXPORT = "true";
    const today = dayKey(Date.now());
    const { t, admin } = await shopWithHistory([
      { at: `${today}T09:00:00Z`, type: "in" },
      { at: `${today}T17:00:00Z`, type: "out" }, // 8h
    ]);
    await t.run(async (ctx) => {
      const otherId = await ctx.db.insert("users", {
        email: "autre@example.com",
        role: "employee",
        status: "active",
      });
      await ctx.db.insert("badges", {
        userId: otherId,
        at: Date.parse(`${today}T09:00:00Z`),
        type: "in",
      });
      await ctx.db.insert("badges", {
        userId: otherId,
        at: Date.parse(`${today}T13:00:00Z`),
        type: "out",
      }); // 4h
    });

    // Every non-pending user, including the admin themselves (0 punches here).
    const payload = await admin.query(internal.badges.exportData, { period: "week" });
    expect(payload.employees).toHaveLength(3);
    expect(payload.grandTotalMinutes).toBe(720); // 12h
    delete process.env.CSV_EXPORT;
  });

  test("a forgotten exit is flagged in the export, not fabricated", async () => {
    process.env.CSV_EXPORT = "true";
    const today = dayKey(Date.now());
    const { admin, userId } = await shopWithHistory([
      { at: `${today}T09:00:00Z`, type: "in" },
    ]);

    const payload = await admin.query(internal.badges.exportData, {
      userId,
      period: "week",
    });
    const shift = payload.employees[0].weeks[0].shifts[0];
    expect(shift.missingExit).toBe(true);
    expect(shift.outLabel).toBe("—");
    delete process.env.CSV_EXPORT;
  });

  test("toXlsx produces a real workbook", async () => {
    process.env.CSV_EXPORT = "true";
    const today = dayKey(Date.now());
    const { admin, userId } = await shopWithHistory([
      { at: `${today}T09:00:00Z`, type: "in" },
      { at: `${today}T17:00:00Z`, type: "out" },
    ]);

    const { filename, base64 } = await admin.action(api.export.toXlsx, {
      userId,
      period: "month",
    });
    expect(filename).toMatch(/\.xlsx$/);
    // A .xlsx is a zip container; every zip starts with this signature.
    expect(Buffer.from(base64, "base64").subarray(0, 2).toString("latin1")).toBe("PK");
    delete process.env.CSV_EXPORT;
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

  test("parisToUtc reads a typed date+time as Paris local, DST included", () => {
    // Summer, UTC+2.
    expect(parisToUtc("2026-08-03", "09:00")).toBe(Date.parse("2026-08-03T07:00:00Z"));
    // Winter, UTC+1.
    expect(parisToUtc("2026-01-09", "09:00")).toBe(Date.parse("2026-01-09T08:00:00Z"));
  });
});
