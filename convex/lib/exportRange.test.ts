import { describe, expect, test } from "vitest";

import {
  DEFAULT_EXPORT_CAP,
  MAX_EXPORT_DAYS,
  exportCap,
  presetSpan,
  resolveSelection,
  spansFromSelection,
  summarizeSelection,
} from "./exportRange";

/**
 * What the admin sees before clicking "Exporter (Excel)".
 *
 * The picker counts the days a selection covers and refuses the ones the
 * server would refuse, with the same module the server uses. These tests are
 * about that agreement: the number on the screen, and the refusal that
 * follows it.
 */
describe("what a selection would export", () => {
  test("a week covers seven days", () => {
    const summary = summarizeSelection([{ from: "2026-08-03", to: "2026-08-09" }]);
    expect(summary.days).toBe(7);
    expect(summary.blocked).toBe(null);
  });

  test("two periods that overlap are counted once", () => {
    const summary = summarizeSelection([
      { from: "2026-08-03", to: "2026-08-09" },
      { from: "2026-08-03", to: "2026-08-30" },
    ]);
    expect(summary.days).toBe(28);
  });

  test("two periods that merely touch are counted once too", () => {
    const summary = summarizeSelection([
      { from: "2026-08-03", to: "2026-08-09" },
      { from: "2026-08-10", to: "2026-08-16" },
    ]);
    expect(summary.days).toBe(14);
  });

  test("a selection of exactly the two-year ceiling is allowed", () => {
    const summary = summarizeSelection([{ from: "2024-01-01", to: "2026-01-01" }]);
    expect(summary.days).toBe(MAX_EXPORT_DAYS);
    expect(summary.blocked).toBe(null);
  });

  test("one day past the ceiling is refused, and says how far over it is", () => {
    const summary = summarizeSelection([{ from: "2024-01-01", to: "2026-01-02" }]);
    expect(summary.days).toBe(MAX_EXPORT_DAYS + 1);
    expect(summary.blocked).toMatch(/deux ans/);
  });

  test("a reversed range is refused rather than exporting nothing", () => {
    expect(summarizeSelection([{ from: "2026-08-10", to: "2026-08-03" }]).blocked).toMatch(
      /invalide/,
    );
  });

  test("an empty selection is refused", () => {
    expect(summarizeSelection([]).blocked).toMatch(/au moins une période/);
  });

  test("the server refuses exactly what the screen refuses", () => {
    const tooWide = [{ from: "2020-01-01", to: "2026-12-31" }];
    expect(summarizeSelection(tooWide).blocked).not.toBe(null);
    expect(() => resolveSelection(tooWide, undefined)).toThrow(/deux ans/);

    const reversed = [{ from: "2026-08-10", to: "2026-08-03" }];
    expect(summarizeSelection(reversed).blocked).not.toBe(null);
    expect(() => resolveSelection(reversed, undefined)).toThrow(/invalide/);
  });

  test("the days the screen counts are the days the export covers", () => {
    const spans = [{ from: "2026-08-03", to: "2026-08-09" }];
    const { days } = resolveSelection(spans, undefined);
    expect(days.size).toBe(summarizeSelection(spans).days);
  });
});

/**
 * How the picker's selection becomes the spans the action receives.
 *
 * The browser never recomputes a week or a month: it hands back the bounds the
 * server gave it. A range that isn't complete or isn't in order contributes
 * nothing — the screen refuses it rather than exporting something else.
 */
describe("what the picker hands the server", () => {
  const week = {
    key: "2026-08-03",
    label: "Semaine du 3 août 2026",
    from: "2026-08-03",
    to: "2026-08-09",
    days: 5,
  };

  test("a ticked period keeps the bounds the server gave it", () => {
    expect(spansFromSelection([week])).toEqual([{ from: "2026-08-03", to: "2026-08-09" }]);
  });

  test("the custom range joins the ticked periods", () => {
    expect(spansFromSelection([week], { from: "2026-09-01", to: "2026-09-30" })).toEqual([
      { from: "2026-08-03", to: "2026-08-09" },
      { from: "2026-09-01", to: "2026-09-30" },
    ]);
  });

  test("a range with only one of its two dates contributes nothing", () => {
    expect(spansFromSelection([week], { from: "2026-09-01", to: "" })).toEqual([
      { from: "2026-08-03", to: "2026-08-09" },
    ]);
  });

  test("a reversed range contributes nothing", () => {
    expect(spansFromSelection([week], { from: "2026-09-30", to: "2026-09-01" })).toEqual([
      { from: "2026-08-03", to: "2026-08-09" },
    ]);
  });

  test("nothing ticked and no range is an empty selection", () => {
    expect(spansFromSelection([], { from: "", to: "" })).toEqual([]);
  });
});

/**
 * The ceiling a plan gets, and the shortcuts that fill the two dates.
 *
 * The ceiling is what the picker offers, so it has to be the truth about the
 * data: a shop whose plan keeps twelve months should not be offered two years
 * of days the nightly purge has already deleted.
 */
describe("the plan's ceiling and the picker's shortcuts", () => {
  // A fixed instant, so the retention window is an arithmetic result rather
  // than whatever today happens to be.
  const now = Date.parse("2026-10-22T12:00:00Z");

  test("a plan that keeps everything gets the two-year ceiling", () => {
    expect(exportCap(null)).toEqual(DEFAULT_EXPORT_CAP);
    expect(DEFAULT_EXPORT_CAP.days).toBe(MAX_EXPORT_DAYS);
  });

  test("a plan with a retention window gets its own window", () => {
    const cap = exportCap(12, now);
    expect(cap.reason).toBe("12 mois de pointages");
    // 22 Oct 2025 to 22 Oct 2026, both days included.
    expect(cap.days).toBe(366);
  });

  test("a plan that keeps longer than the file may hold gets two years", () => {
    expect(exportCap(36, now)).toEqual(DEFAULT_EXPORT_CAP);
  });

  test("the refusal names the ceiling the screen showed", () => {
    const spans = [{ from: "2025-01-01", to: "2026-01-01" }]; // 366 days
    expect(summarizeSelection(spans).blocked).toBe(null);

    const capped = summarizeSelection(spans, exportCap(6, now));
    expect(capped.blocked).toMatch(/6 mois/);
    expect(() => resolveSelection(spans, undefined, exportCap(6, now))).toThrow(/6 mois/);
  });

  test("« cette semaine » fills the week so far, never past today", () => {
    // Wednesday the 19th: Monday to Wednesday, not the Sunday that has not
    // been worked yet.
    expect(presetSpan("week", "2026-08-19")).toEqual({ from: "2026-08-17", to: "2026-08-19" });
    // A finished week keeps its Sunday.
    expect(presetSpan("week", "2026-08-23")).toEqual({ from: "2026-08-17", to: "2026-08-23" });
  });

  test("« ce mois-ci » fills the month to date", () => {
    expect(presetSpan("month", "2026-08-19")).toEqual({ from: "2026-08-01", to: "2026-08-19" });
  });
});
