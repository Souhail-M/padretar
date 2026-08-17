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

/** A Monday "2026-08-03" -> "semaine du 3 août" */
export function weekLabel(monday: string): string {
  const day = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${monday}T12:00:00Z`));
  return `semaine du ${day}`;
}

/** "2026-08" -> "août 2026" */
export function monthLabel(month: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T12:00:00Z`));
}

/** A timestamp -> "14:05", Paris time. */
export function timeLabel(ts: number): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
  }).format(ts);
}
