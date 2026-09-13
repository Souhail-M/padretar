// Convex runs in UTC; the shop lives in Paris. Every day boundary in the app
// (punch in/out toggle, daily totals, planning dates) goes through here, so
// there is exactly one answer to "what day is it" — and DST is handled for free.

const PARIS = "Europe/Paris";

/** "2026-08-09" for a timestamp, in Paris local time. */
export function dayKey(ts: number): string {
  // fr-CA formats as YYYY-MM-DD, which is also what we store and sort on.
  return new Intl.DateTimeFormat("fr-CA", { timeZone: PARIS }).format(ts);
}

/** "14:05" for a timestamp, in Paris local time. */
export function timeLabel(ts: number): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS,
    hour: "2-digit",
    minute: "2-digit",
  }).format(ts);
}

/** The "YYYY-MM-DD" of the Monday opening the week that contains `date`. */
export function mondayOf(date: string): string {
  // Noon UTC keeps the arithmetic clear of every timezone and DST edge.
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); // Monday = 0
  return d.toISOString().slice(0, 10);
}

/** The seven "YYYY-MM-DD" of the week containing `date`, Monday first. */
export function weekDays(date: string): string[] {
  const monday = new Date(`${mondayOf(date)}T12:00:00Z`);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

/** Shift the "YYYY-MM-DD" `date` by `days`. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Minutes between two "HH:MM" labels. Negative spans are clamped to 0. */
export function minutesBetween(start: string, end: string): number {
  const toMin = (s: string) => {
    const [h, m] = s.split(":").map(Number);
    return h * 60 + m;
  };
  return Math.max(0, toMin(end) - toMin(start));
}

/** 447 -> "7h27". Used for every duration shown in the UI. */
export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

/** Timestamp `months` calendar months before now — the retention cutoff. */
export function monthsAgo(months: number): number {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - months);
  return d.getTime();
}

/** Every "YYYY-MM-DD" in the calendar month "YYYY-MM". */
export function daysInMonth(month: string): string[] {
  const [y, m] = month.split("-").map(Number);
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from(
    { length: count },
    (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`,
  );
}
