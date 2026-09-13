/**
 * Per-deployment limits, read from env vars set once at onboarding — same
 * tier as ADMIN_EMAIL/AUTH_RESEND_KEY. There is no plan table: one Convex
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
