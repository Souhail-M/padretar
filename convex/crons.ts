import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// No-ops when the plan has no RETENTION_MONTHS set (see convex/plan.ts).
crons.interval("purge old badges", { hours: 24 }, internal.badges.purgeOld, {});

export default crons;
