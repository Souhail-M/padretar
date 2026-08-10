import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export const roleEnum = v.union(v.literal("employee"), v.literal("admin"));

export const statusEnum = v.union(
  v.literal("pending"),
  v.literal("active"),
  v.literal("disabled"),
);

export const punchEnum = v.union(v.literal("in"), v.literal("out"));

export default defineSchema({
  ...authTables,

  // The Convex Auth `users` table, extended with the shop's own fields.
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // Padretar fields:
    nom: v.optional(v.string()),
    poste: v.optional(v.string()),
    role: roleEnum,
    status: statusEnum,
  })
    .index("by_email", ["email"])
    .index("by_status", ["status"]),

  badges: defineTable({
    userId: v.id("users"),
    at: v.number(),
    type: punchEnum,
  })
    .index("by_user_at", ["userId", "at"])
    .index("by_at", ["at"]),


  // Exactly one row. Holds the code currently displayed on the shop kiosk.
  // A random short-lived code in the database *is* the signature — no JWT,
  // no HMAC, nothing to rotate a secret for.
  kiosk: defineTable({
    code: v.string(),
    expiresAt: v.number(),
  }),
});
