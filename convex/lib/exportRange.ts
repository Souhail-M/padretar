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
  monthsAgo,
  shortDay,
  spanDays,
  spanLength,
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
 * How far one export may reach, and why — a ceiling the picker can explain
 * before the click and the server can enforce without re-describing.
 */
export type ExportCap = {
  /** The most calendar days one selection may cover. */
  days: number;
  /** Why that is the number, in a phrase that fits in parentheses: "deux ans",
   *  "12 mois de pointages". */
  reason: string;
};

/**
 * How far one export may reach when the plan sets no retention window. Two
 * years is a file a shop can still open; the ceiling also stops a fat-fingered
 * custom range from pulling every punch ever kept.
 */
export const MAX_EXPORT_DAYS = 732;

/** The ceiling for a plan that keeps everything. */
export const DEFAULT_EXPORT_CAP: ExportCap = {
  days: MAX_EXPORT_DAYS,
  reason: "deux ans",
};

/**
 * The export's ceiling for this plan: its retention window when it has one,
 * two years when it doesn't.
 *
 * Retention is what the shop still keeps — punches older than it are deleted
 * every night (convex/badges.ts purgeOld) — so offering a longer range would
 * offer days that no longer exist. The window is counted on the same dates the
 * purge uses, so the number on the screen is the data that is actually there.
 *
 * A plan that keeps longer than the file may hold gets the two-year ceiling
 * and says so with the same words as a plan that keeps nothing back.
 */
export function exportCap(retentionMonths: number | null, now = Date.now()): ExportCap {
  if (retentionMonths === null) return DEFAULT_EXPORT_CAP;
  const months = Math.max(1, Math.round(retentionMonths));
  const days = spanLength(dayKey(monthsAgo(months, now)), dayKey(now));
  if (days >= MAX_EXPORT_DAYS) return DEFAULT_EXPORT_CAP;
  return {
    days,
    reason: months === 1 ? "1 mois de pointages" : `${months} mois de pointages`,
  };
}

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
export function spansFromPeriod(
  period: "week" | "month",
  today = dayKey(Date.now()),
): ExportSpan[] {
  if (period === "week") {
    const monday = mondayOf(today);
    return [{ from: monday, to: addDays(monday, 6) }];
  }
  const days = daysInMonth(today.slice(0, 7));
  return [{ from: days[0], to: days[days.length - 1] }];
}

/**
 * The span a shortcut fills into the two dates, never past today.
 *
 * Mid-week, "cette semaine" means the days worked so far — the days after
 * today have not happened and the date fields refuse them. The completed
 * week is one tick away in the picker's own list.
 */
export function presetSpan(period: "week" | "month", today: string): ExportSpan {
  const [span] = spansFromPeriod(period, today);
  return { from: span.from, to: span.to < today ? span.to : today };
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

/**
 * What a selection would export, and whether it may.
 *
 * This is the one place a selection is judged. The browser asks it before it
 * offers the export button — so a selection that the server would refuse is
 * refused on the screen, in the same words — and the server asks it before it
 * builds the file. Two ends, one answer: a two-year ceiling the picker
 * respects is a ceiling the picker can explain.
 */
export type ExportSelectionSummary = {
  /** Calendar days the selection covers, overlaps counted once. */
  days: number;
  /** The first day covered, or null when nothing is selected. */
  from: string | null;
  /** The last day covered, or null. */
  to: string | null;
  /** How many separate blocks the selection makes. */
  blocks: number;
  /** The file's own header for this selection. */
  label: string;
  /** Why the selection can't be exported, or null when it can. */
  blocked: string | null;
  /** True when nothing is selected at all. */
  empty: boolean;
  /** The ceiling this selection was judged against, so the screen can name the
   *  number and the reason without being told them separately. */
  cap: ExportCap;
};

/**
 * Judge a selection: how many days it covers, and what stands in its way.
 *
 * Days are counted on the merged blocks, so ticking three weeks that overlap
 * a month counts the month once. The ceiling is the same one the server
 * enforces, computed the same way, which is what lets the picker show the
 * number before anyone clicks.
 */
export function summarizeSelection(
  spans: ExportSpan[],
  cap: ExportCap = DEFAULT_EXPORT_CAP,
): ExportSelectionSummary {
  const nothing: ExportSelectionSummary = {
    days: 0,
    from: null,
    to: null,
    blocks: 0,
    label: "",
    blocked: "Choisissez au moins une période à exporter.",
    empty: true,
    cap,
  };
  if (spans.length === 0) return nothing;
  if (spans.length > MAX_EXPORT_SPANS) {
    return {
      ...nothing,
      empty: false,
      blocked: `Trop de périodes sélectionnées (${MAX_EXPORT_SPANS} maximum).`,
    };
  }
  for (const span of spans) {
    if (spanLength(span.from, span.to) === 0) {
      return {
        ...nothing,
        empty: false,
        blocked: `Période invalide : ${span.from} → ${span.to}.`,
      };
    }
  }

  const merged = mergeSpans(spans);
  const days = merged.reduce((sum, span) => sum + spanLength(span.from, span.to), 0);
  const first = merged[0];
  const last = merged[merged.length - 1];
  const label =
    merged.length === 1
      ? first.from === first.to
        ? shortDay(first.from)
        : `${shortDay(first.from)} – ${shortDay(first.to)}`
      : `${merged.length} périodes (${shortDay(first.from)} – ${shortDay(last.to)})`;

  return {
    days,
    from: first.from,
    to: last.to,
    blocks: merged.length,
    label,
    blocked:
      days > cap.days
        ? `Export limité à ${cap.days} jours (${cap.reason}) à la fois.`
        : null,
    empty: false,
    cap,
  };
}

/**
 * The spans a picker's selection amounts to: the bounds of every ticked
 * period, plus the custom range when it is complete and in order.
 *
 * The ticked periods keep the bounds the server handed out — a week is never
 * recomputed in the browser — and a half-filled or reversed range contributes
 * nothing rather than a span the server would have to refuse. The rule lives
 * here so the browser and the server agree on what a selection is.
 */
export function spansFromSelection(
  options: ExportPeriodOption[],
  range?: { from: string; to: string } | null,
): ExportSpan[] {
  const spans: ExportSpan[] = options.map(({ from, to }) => ({ from, to }));
  if (range && range.from && range.to && range.from <= range.to) {
    spans.push({ from: range.from, to: range.to });
  }
  return spans;
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
  cap: ExportCap = DEFAULT_EXPORT_CAP,
): ExportSelection {
  const chosen = spans && spans.length > 0 ? spans : period ? spansFromPeriod(period) : [];

  // The same judgment the browser made before offering the button, with the
  // same ceiling. A client that lies about its selection is refused here with
  // the same words.
  const summary = summarizeSelection(chosen, cap);
  if (summary.blocked) throw new Error(summary.blocked);

  const days = new Set<string>();
  for (const span of chosen) {
    for (const day of spanDays(span.from, span.to)) days.add(day);
  }
  return { days, label: summary.label };
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
