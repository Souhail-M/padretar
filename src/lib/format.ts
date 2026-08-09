// Client-side formatting. Durations and day keys are produced by the backend
// (convex/lib/day.ts) — these are the display counterparts.

/** 447 -> "7h27" */
export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

/** "2026-08-09" -> "samedi 9 août" */
export function longDate(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

/** "2026-08-09" -> "sam. 9" — for the tight planning grid header. */
export function shortDate(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

/** A timestamp -> "14:05", Paris time. */
export function timeLabel(ts: number): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
  }).format(ts);
}
