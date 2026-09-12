import { convexTest } from "convex-test";
import { beforeAll, describe, expect, test } from "vitest";

import schema from "./schema";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");

/**
 * Signing up for real goes through Convex Auth, which mints a session token —
 * so the suite needs a signing key. It is generated per run rather than
 * committed: a key in the repo is a key someone eventually reuses.
 */
beforeAll(async () => {
  const { privateKey } = (await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;

  const pkcs8 = await crypto.subtle.exportKey("pkcs8", privateKey);
  const body = btoa(String.fromCharCode(...new Uint8Array(pkcs8))).replace(
    /(.{64})/g,
    "$1\n",
  );
  process.env.JWT_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----`;
  process.env.SITE_URL = "http://localhost:5173";
  process.env.CONVEX_SITE_URL = "http://localhost:5173";
});

type Shop = ReturnType<typeof convexTest>;
type Params = Record<string, string>;

const signUp = (t: Shop, params: Params) =>
  t.action(api.auth.signIn, {
    provider: "password",
    params: { flow: "signUp", ...params },
  });

const signIn = (t: Shop, params: Params) =>
  t.action(api.auth.signIn, {
    provider: "password",
    params: { flow: "signIn", ...params },
  });

const users = (t: Shop) =>
  t.run(async (ctx) => await ctx.db.query("users").collect());

/** A shop whose responsable signed up through ADMIN_EMAIL. */
async function shopWithAdmin() {
  process.env.ADMIN_EMAIL = "patron@example.com";
  const t = convexTest(schema, modules);
  await signUp(t, {
    email: "patron@example.com",
    password: "motdepasse",
    nom: "Patron",
  });
  const [admin] = await users(t);
  return {
    t,
    adminId: admin._id,
    as: t.withIdentity({ subject: `${admin._id}|session` }),
  };
}

describe("account creation", () => {
  test("a new sign-up waits for approval and can do nothing yet", async () => {
    // The employee must not be the first-ever account in this instance, or
    // the bootstrap rule below would promote them instead of the admin.
    const { t, adminId } = await shopWithAdmin();

    await signUp(t, {
      email: "employe@example.com",
      password: "motdepasse",
      nom: "Employé",
    });

    const user = (await users(t)).find((u) => u._id !== adminId)!;
    expect(user).toMatchObject({
      email: "employe@example.com",
      nom: "Employé",
      role: "employee",
      status: "pending",
    });

    // It holds a session — that is what puts the "waiting" screen on — but the
    // backend hands it nothing.
    const as = t.withIdentity({ subject: `${user._id}|session` });
    expect(await as.query(api.auth.me, {})).toMatchObject({ status: "pending" });
    await expect(as.query(api.badges.mine, {})).rejects.toThrow(/en attente/);
  });

  test("the email is normalised and the name trimmed", async () => {
    const t = convexTest(schema, modules);

    await signUp(t, {
      email: "  Employe@Example.COM  ",
      password: "motdepasse",
      nom: "  Employé  ",
    });

    const [user] = await users(t);
    expect(user.email).toBe("employe@example.com");
    expect(user.nom).toBe("Employé");
  });

  test("the ADMIN_EMAIL sign-up bootstraps an active admin, whatever its casing", async () => {
    process.env.ADMIN_EMAIL = "  Patron@Example.com ";
    const t = convexTest(schema, modules);

    await signUp(t, { email: "patron@example.com", password: "motdepasse" });

    const [user] = await users(t);
    expect(user).toMatchObject({ role: "admin", status: "active" });
  });

  test("the very first sign-up ever becomes an active admin, no ADMIN_EMAIL needed", async () => {
    delete process.env.ADMIN_EMAIL;
    const t = convexTest(schema, modules);

    await signUp(t, { email: "patron@example.com", password: "motdepasse" });

    const [user] = await users(t);
    expect(user).toMatchObject({ role: "admin", status: "active" });
  });

  test("a second sign-up, with no ADMIN_EMAIL, still lands pending", async () => {
    delete process.env.ADMIN_EMAIL;
    const t = convexTest(schema, modules);

    await signUp(t, { email: "patron@example.com", password: "motdepasse" });
    await signUp(t, { email: "employe@example.com", password: "motdepasse" });

    const employee = (await users(t)).find((u) => u.email === "employe@example.com");
    expect(employee).toMatchObject({ role: "employee", status: "pending" });
  });

  test("a second sign-up on the same email is refused", async () => {
    const { t } = await shopWithAdmin();
    await expect(
      signUp(t, { email: "patron@example.com", password: "autrepass" }),
    ).rejects.toThrow();
  });

  test("a disabled account is refused a session even with the right password", async () => {
    const { t } = await shopWithAdmin();
    await signUp(t, { email: "employe@example.com", password: "motdepasse" });

    await t.run(async (ctx) => {
      const employee = (await ctx.db.query("users").collect()).find(
        (u) => u.email === "employe@example.com",
      )!;
      await ctx.db.patch(employee._id, { status: "disabled" });
    });

    await expect(
      signIn(t, { email: "employe@example.com", password: "motdepasse" }),
    ).rejects.toThrow(/désactivé/);
  });

  test("the wrong password does not open a session", async () => {
    const { t } = await shopWithAdmin();
    await expect(
      signIn(t, { email: "patron@example.com", password: "pasbonmotdepasse" }),
    ).rejects.toThrow();
  });
});

describe("admin validation", () => {
  /** The responsable, plus one employee waiting on them. */
  async function shopWithPending() {
    const { t, adminId, as } = await shopWithAdmin();
    await signUp(t, {
      email: "employe@example.com",
      password: "motdepasse",
      nom: "Employé",
    });
    const employee = (await users(t)).find(
      (u) => u.email === "employe@example.com",
    )!;
    return {
      t,
      admin: as,
      adminId,
      userId: employee._id as Id<"users">,
      employee: t.withIdentity({ subject: `${employee._id}|session` }),
    };
  }

  test("pending accounts come first — they are the ones needing a decision", async () => {
    const { admin, userId } = await shopWithPending();

    const before = await admin.query(api.employees.list, {});
    expect(before.map((u) => u.status)).toEqual(["pending", "active"]);

    await admin.mutation(api.employees.approve, { userId });

    const after = await admin.query(api.employees.list, {});
    expect(after.every((u) => u.status === "active")).toBe(true);
  });

  test("approval is what lets an employee punch", async () => {
    const { t, admin, employee, userId } = await shopWithPending();
    await t.run(async (ctx) => {
      await ctx.db.insert("kiosk", {
        code: "ABC234",
        expiresAt: Date.now() + 60_000,
      });
    });

    await expect(
      employee.mutation(api.badges.punch, { code: "ABC234" }),
    ).rejects.toThrow(/en attente/);

    await admin.mutation(api.employees.approve, { userId });

    expect(await employee.mutation(api.badges.punch, { code: "ABC234" })).toBe(
      "in",
    );
  });

  test("disabling revokes access without erasing the work record", async () => {
    const { t, admin, employee, userId } = await shopWithPending();
    await admin.mutation(api.employees.approve, { userId });
    await t.run(async (ctx) => {
      await ctx.db.insert("badges", { userId, at: Date.now(), type: "in" });
    });

    await admin.mutation(api.employees.setStatus, { userId, status: "disabled" });
    await expect(employee.query(api.badges.mine, {})).rejects.toThrow(/désactivé/);

    // The punches are still there for the admin to read.
    const { days } = await admin.query(api.badges.forEmployee, { userId });
    expect(days[0].punches).toHaveLength(1);

    // And re-enabling gives the access back.
    await admin.mutation(api.employees.setStatus, { userId, status: "active" });
    expect(await employee.query(api.badges.mine, {})).toHaveLength(1);
  });

  test("an admin cannot lock themselves out", async () => {
    const { admin, adminId } = await shopWithPending();

    await expect(
      admin.mutation(api.employees.setStatus, {
        userId: adminId as Id<"users">,
        status: "disabled",
      }),
    ).rejects.toThrow(/votre propre compte/);

    await expect(
      admin.mutation(api.employees.update, {
        userId: adminId as Id<"users">,
        role: "employee",
      }),
    ).rejects.toThrow(/votre propre rôle/);
  });

  test("promoting an employee gives them the admin screens", async () => {
    const { admin, employee, userId } = await shopWithPending();
    await admin.mutation(api.employees.approve, { userId });

    await expect(employee.query(api.employees.list, {})).rejects.toThrow(
      /administrateurs/,
    );

    await admin.mutation(api.employees.update, {
      userId,
      role: "admin",
      poste: "Responsable",
    });

    expect(await employee.query(api.employees.list, {})).toHaveLength(2);
    expect((await admin.query(api.employees.get, { userId }))?.poste).toBe(
      "Responsable",
    );
  });

  test("an employee cannot approve, disable or edit anyone", async () => {
    const { admin, employee, userId } = await shopWithPending();
    await admin.mutation(api.employees.approve, { userId });

    await expect(
      employee.mutation(api.employees.approve, { userId }),
    ).rejects.toThrow(/administrateurs/);
    await expect(
      employee.mutation(api.employees.setStatus, { userId, status: "disabled" }),
    ).rejects.toThrow(/administrateurs/);
    await expect(
      employee.mutation(api.employees.update, { userId, nom: "Moi-même" }),
    ).rejects.toThrow(/administrateurs/);
    await expect(employee.query(api.employees.get, { userId })).rejects.toThrow(
      /administrateurs/,
    );
  });

  test("a pending account cannot approve itself", async () => {
    const { employee, userId } = await shopWithPending();
    await expect(
      employee.mutation(api.employees.approve, { userId }),
    ).rejects.toThrow(/en attente/);
  });
});
