import { query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

/**
 * Per-deployment limits, read from env vars set once at onboarding — same
 * tier as ADMIN_EMAIL. There is no plan table: one Convex
 * project per client (see the pricing notes), so there is nothing to look up
 * and nothing for a client to change themselves.
 */
export function planLimits() {
  const months = Number(process.env.RETENTION_MONTHS ?? "");
  const maxEmployees = Number(process.env.MAX_EMPLOYEES ?? "");
  return {
    /** null = unlimited. */
    retentionMonths: Number.isFinite(months) && months > 0 ? months : null,
    /** null = unlimited. */
    maxEmployees:
      Number.isFinite(maxEmployees) && maxEmployees > 0 ? maxEmployees : null,
    csvExport: process.env.CSV_EXPORT === "true",
  };
}

/**
 * What this deployment's plan allows the interface to offer.
 *
 * The export used to be gated only at the moment it was clicked: the buttons
 * rendered for every admin, and the server refused the click. A refusal the
 * screen could have avoided is a refusal the screen shows instead — this
 * query is what lets the export say "not in this plan" before it offers the
 * action, rather than after.
 *
 * Admin only, and it reads nothing from the database: the whole plan is a
 * handful of environment variables.
 */
export const capabilities = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return { exportExcel: planLimits().csvExport };
  },
});
