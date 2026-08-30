import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

/** A signed-in admin and a signed-in employee, and no exit password yet. */
async function shopWith() {
  const t = convexTest(schema, modules);

  const { adminId, employeeId } = await t.run(async (ctx) => {
    const adminId = await ctx.db.insert("users", {
      email: "patron@example.com",
      role: "admin",
      status: "active",
    });
    const employeeId = await ctx.db.insert("users", {
      email: "employe@example.com",
      role: "employee",
      status: "active",
    });
    return { adminId, employeeId };
  });

  return {
    t,
    admin: t.withIdentity({ subject: `${adminId}|session` }),
    employee: t.withIdentity({ subject: `${employeeId}|session` }),
  };
}

describe("kioskExit", () => {
  test("without one set, nothing verifies — the login password stays the gate", async () => {
    const { admin } = await shopWith();
    expect(await admin.query(api.kioskExit.state, {})).toEqual({
      configured: false,
    });
    expect(await admin.mutation(api.kioskExit.verify, { password: "whatever" })).toBe(
      false,
    );
  });

  test("the set password verifies, another does not", async () => {
    const { admin } = await shopWith();
    await admin.mutation(api.kioskExit.set, { password: "sortie2026" });

    expect(await admin.query(api.kioskExit.state, {})).toEqual({
      configured: true,
    });
    expect(await admin.mutation(api.kioskExit.verify, { password: "sortie2026" })).toBe(
      true,
    );
    expect(await admin.mutation(api.kioskExit.verify, { password: "sortie2027" })).toBe(
      false,
    );
  });

  test("setting a replacement retires the previous password", async () => {
    const { admin } = await shopWith();
    await admin.mutation(api.kioskExit.set, { password: "premier1" });
    await admin.mutation(api.kioskExit.set, { password: "second22" });

    expect(await admin.mutation(api.kioskExit.verify, { password: "premier1" })).toBe(
      false,
    );
    expect(await admin.mutation(api.kioskExit.verify, { password: "second22" })).toBe(
      true,
    );
  });

  test("clearing it returns to the login-password fallback", async () => {
    const { admin } = await shopWith();
    await admin.mutation(api.kioskExit.set, { password: "sortie2026" });
    await admin.mutation(api.kioskExit.clear, {});

    expect(await admin.query(api.kioskExit.state, {})).toEqual({
      configured: false,
    });
    expect(await admin.mutation(api.kioskExit.verify, { password: "sortie2026" })).toBe(
      false,
    );
  });

  test("refuses anything shorter than six characters", async () => {
    const { admin } = await shopWith();
    await expect(
      admin.mutation(api.kioskExit.set, { password: "abc12" }),
    ).rejects.toThrow(/trop court/);
  });

  test("an employee cannot read, set or clear it", async () => {
    const { employee } = await shopWith();

    await expect(employee.query(api.kioskExit.state, {})).rejects.toThrow(
      /administrateurs/,
    );
    await expect(
      employee.mutation(api.kioskExit.set, { password: "sortie2026" }),
    ).rejects.toThrow(/administrateurs/);
    await expect(employee.mutation(api.kioskExit.clear, {})).rejects.toThrow(
      /administrateurs/,
    );
  });

  test("a plain employee at the locked screen may still try the password", async () => {
    // The lock holds an admin session, but verification itself only asks for
    // an active account — the screen must stay freeable by whoever stands
    // there, and this keeps that promise pinned down.
    const { employee, admin } = await shopWith();
    await admin.mutation(api.kioskExit.set, { password: "sortie2026" });
    expect(await employee.mutation(api.kioskExit.verify, { password: "sortie2026" })).toBe(
      true,
    );
  });

  test("an anonymous visitor cannot even probe it", async () => {
    const { t, admin } = await shopWith();
    await admin.mutation(api.kioskExit.set, { password: "sortie2026" });
    await expect(
      t.mutation(api.kioskExit.verify, { password: "sortie2026" }),
    ).rejects.toThrow(/Non authentifié/);
  });
});
