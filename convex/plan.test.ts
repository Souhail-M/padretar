import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

/** A shop with one admin and one employee. */
async function shop() {
  const t = convexTest(schema, modules);
  const { adminId, employeeId } = await t.run(async (ctx) => ({
    adminId: await ctx.db.insert("users", {
      email: "patron@example.com",
      role: "admin",
      status: "active",
    }),
    employeeId: await ctx.db.insert("users", {
      email: "employe@example.com",
      role: "employee",
      status: "active",
    }),
  }));

  return {
    admin: t.withIdentity({ subject: `${adminId}|session` }),
    employee: t.withIdentity({ subject: `${employeeId}|session` }),
  };
}

/**
 * What the screen is allowed to offer.
 *
 * The export used to be refused only at the moment it was clicked. The plan
 * is now read first, so the screen can say "not in this plan" instead of
 * offering a button that fails.
 */
describe("what the plan allows the screen to offer", () => {
  test("a plan without the export says so before the screen offers it", async () => {
    delete process.env.CSV_EXPORT;
    const { admin } = await shop();
    expect(await admin.query(api.plan.capabilities, {})).toEqual({ exportExcel: false });
  });

  test("a plan with the export says so", async () => {
    process.env.CSV_EXPORT = "true";
    const { admin } = await shop();
    expect(await admin.query(api.plan.capabilities, {})).toEqual({ exportExcel: true });
    delete process.env.CSV_EXPORT;
  });

  test("an employee is not told what the plan allows", async () => {
    process.env.CSV_EXPORT = "true";
    const { employee } = await shop();
    await expect(employee.query(api.plan.capabilities, {})).rejects.toThrow(/administrateurs/);
    delete process.env.CSV_EXPORT;
  });
});
