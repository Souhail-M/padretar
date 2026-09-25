/**
 * The export's period vocabulary, shared by the three places that touch it:
 * the picker query (convex/badges.ts exportPeriods), the data query
 * (exportData), and the action that writes the file (convex/export.ts).
 *
 * The point of one module is that a period means the same thing at all three
 * ends. The picker is handed a period's bounds, hands them straight back, and
 * the action names the file after the same bounds — so "Semaine du 3 août"
 * can never be exported as different days than the ones it was labelled with,
 * and Monday-first weeks or month lengths are never reimplemented in the
 * browser.
 */

import {
  addDays,
  dayKey,
  daysInMonth,
  mondayOf,
  monthTitle,
  shortDay,
  spanDays,
  weekTitle,
} from "./day";

/** The three granularities the export picker offers. */
export type ExportScale = "week" | "month" | "year";

/** An inclusive range of "YYYY-MM-DD" days. */
export type ExportSpan = { from: string; to: string };

/** One selectable period in the picker. */
export type ExportPeriodOption = {
  key: string;
  label: string;
  from: string;
  to: string;
  /** Days carrying at least one punch in this period — the reason it is
   *  offered at all. On the shop-wide picker that's days anyone worked, not
   *  summed over employees. */
  days: number;
};

/**
 * How far one export may reach. Two years is a file a shop can still open and
 * comfortably covers the retention window plans sell; the ceiling also stops a
 * fat-fingered custom range from pulling every punch ever kept.
 */
export const MAX_EXPORT_DAYS = 732;

/** How many periods one export may name. The picker puts a checkbox on each, so
 *  a "select everything" on a long history must not build an unbounded list. */
export const MAX_EXPORT_SPANS = 120;

/** How many options each scale of the picker shows, newest first. Roughly the
 *  retention window: 60 weeks, 36 months, 10 years. */
export const MAX_PERIOD_OPTIONS: Record<ExportScale, number> = {
  week: 60,
  month: 36,
  year: 10,
};

/** The first and last day of the period `key` names, at the given scale. */
export function periodBounds(scale: ExportScale, key: string): ExportSpan {
  if (scale === "week") return { from: key, to: addDays(key, 6) };
  if (scale === "month") {
    const days = daysInMonth(key);
    return { from: days[0], to: days[days.length - 1] };
  }
  return { from: `${key}-01-01`, to: `${key}-12-31` };
}

/** The period's own name, capitalised for a dialog row or a file header. */
export function periodTitle(scale: ExportScale, key: string): string {
  if (scale === "week") return `Semaine du ${weekTitle(key)}`;
  if (scale === "month") return monthTitle(key);
  return key;
}

/** The "this week" / "this month" preset buttons, as a concrete span. */
export function spansFromPeriod(period: "week" | "month"): ExportSpan[] {
  const today = dayKey(Date.now());
  if (period === "week") {
    const monday = mondayOf(today);
    return [{ from: monday, to: addDays(monday, 6) }];
  }
  const days = daysInMonth(today.slice(0, 7));
  return [{ from: days[0], to: days[days.length - 1] }];
}

/** Sort, then join spans that overlap or merely touch. */
export function mergeSpans(spans: ExportSpan[]): ExportSpan[] {
  const sorted = [...spans].sort(
    (a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to),
  );
  const merged: ExportSpan[] = [];
  for (const span of sorted) {
    const last = merged[merged.length - 1];
    // Adjacent counts as joined as well as overlapping: checking weeks 32, 33
    // and 34 should read as one block in the file's header, not three periods.
    if (last && span.from <= addDays(last.to, 1)) {
      if (span.to > last.to) last.to = span.to;
    } else {
      merged.push({ ...span });
    }
  }
  return merged;
}

/** A resolved selection: the exact days to export, and how to name them. */
export type ExportSelection = { days: Set<string>; label: string };

/**
 * Turn whatever the caller selected into the exact set of days to export.
 *
 * Two shapes come in — the picker's `spans` (checked periods, or a custom
 * range) and the `period` preset buttons — and both land on the same day set.
 * That is the point: a three-period selection and a custom range covering the
 * same days are counted, filtered and totalled by identical code, so the two
 * entry points can't quietly disagree about what was exported.
 */
export function resolveSelection(
  spans: ExportSpan[] | undefined,
  period: "week" | "month" | undefined,
): ExportSelection {
  const chosen = spans && spans.length > 0 ? spans : period ? spansFromPeriod(period) : [];
  if (chosen.length === 0) throw new Error("Choisissez au moins une période à exporter.");
  if (chosen.length > MAX_EXPORT_SPANS) {
    throw new Error(`Trop de périodes sélectionnées (${MAX_EXPORT_SPANS} maximum).`);
  }

  const days = new Set<string>();
  for (const span of chosen) {
    const list = spanDays(span.from, span.to);
    if (list.length === 0) throw new Error(`Période invalide : ${span.from} → ${span.to}.`);
    for (const day of list) days.add(day);
  }
  if (days.size > MAX_EXPORT_DAYS) {
    throw new Error("Export limité à deux ans de pointages à la fois.");
  }

  const merged = mergeSpans(chosen);
  const first = merged[0];
  const last = merged[merged.length - 1];
  const label =
    merged.length === 1
      ? first.from === first.to
        ? shortDay(first.from)
        : `${shortDay(first.from)} – ${shortDay(first.to)}`
      : `${merged.length} périodes (${shortDay(first.from)} – ${shortDay(last.to)})`;
  return { days, label };
}

/**
 * A filesystem-safe stamp of what was exported, for the download's name:
 * "2026-08-03_2026-08-30", or "...+3" when the selection isn't one block.
 *
 * The period is the useful part of a payroll file's name — "août" told nobody
 * which August — and the length is bounded because Windows still caps a whole
 * path at 260 characters and a 120-period selection would otherwise eat the
 * budget before the browser ever saw the name.
 */
export function filenameScope(
  spans: ExportSpan[] | undefined,
  period: "week" | "month" | undefined,
): string {
  const chosen = spans && spans.length > 0 ? spans : period ? spansFromPeriod(period) : [];
  if (chosen.length === 0) return "";
  const merged = mergeSpans(chosen);
  const first = merged[0];
  const last =merged[merged.length - 1];
  const base = first.from === last.to ? first.from : `${first.from}_${last.to}`;
  const suffix = merged.length > 1 ? `+${merged.length}` : "";
  return `${base}${suffix}`.slice(0, 60);
}
