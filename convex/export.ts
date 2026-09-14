"use node";

import { v } from "convex/values";
import ExcelJS from "exceljs";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { ExportPayload } from "./badges";

/**
 * Builds the styled payroll Excel file from convex/badges.ts `exportData`.
 *
 * A separate file because Convex's "use node" directive is file-scoped and
 * only actions may live in a Node file — the reactive query/mutation logic
 * stays in badges.ts, called here via `ctx.runQuery`.
 *
 * No real logo file exists in this repo (only an unrelated placeholder
 * favicon), so the header band is a styled text wordmark, matching how the
 * rest of the app's own branding (Wordmark.tsx) is typography, not an
 * image. Swap in `worksheet.addImage` here if a real logo ever exists.
 */

const INK = "FF1A1F1C";
const PAPER_BAND = "FFF0F1EE";
const WEEK_BAND = "FFFAFAF8";
const HEADER_BG = "FF0A0A0A";
const HEADER_FG = "FFFAFAFA";
const MUTED = "FF6F766F";
const ENTER = "FF1F7A4C";
const EXIT = "FFB1543A";
const LINE = "FFE4E1DB";

const thinBottom = { bottom: { style: "thin" as const, color: { argb: LINE } } };

/** "2026-08-03" -> "lundi 3 août" — the same rule as src/lib/format.ts
 *  longDate, duplicated here since a Node action can't import from src/. */
function dateLabel(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

function fillRow(sheet: ExcelJS.Worksheet, row: number, argb: string) {
  for (const col of ["A", "B", "C", "D"]) {
    sheet.getCell(`${col}${row}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
  }
}

function buildWorkbook(payload: ExportPayload): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Padretar";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Pointages", {
    views: [{ showGridLines: false }],
    pageSetup: { fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  sheet.columns = [{ width: 30 }, { width: 12 }, { width: 12 }, { width: 18 }];

  // Header band: the wordmark, centered, on the app's own near-black.
  sheet.mergeCells("A1:D1");
  sheet.getRow(1).height = 32;
  fillRow(sheet, 1, HEADER_BG);
  const title = sheet.getCell("A1");
  title.value = "P A D R E T A R";
  title.font = { name: "Calibri", size: 20, bold: true, color: { argb: HEADER_FG } };
  title.alignment = { horizontal: "center", vertical: "middle" };

  sheet.mergeCells("A2:D2");
  fillRow(sheet, 2, HEADER_BG);
  const subtitle = sheet.getCell("A2");
  const label = payload.periodLabel.charAt(0).toUpperCase() + payload.periodLabel.slice(1);
  subtitle.value = `${label} — généré le ${payload.generatedAt}`;
  subtitle.font = { size: 10, italic: true, color: { argb: "FFC7CCC3" } };
  subtitle.alignment = { horizontal: "center" };

  let r = 4;
  for (const employee of payload.employees) {
    sheet.mergeCells(`A${r}:D${r}`);
    fillRow(sheet, r, PAPER_BAND);
    const nameCell = sheet.getCell(`A${r}`);
    nameCell.value = employee.name;
    nameCell.font = { bold: true, size: 13, color: { argb: INK } };
    sheet.getRow(r).height = 22;
    r++;

    for (const week of employee.weeks) {
      sheet.mergeCells(`A${r}:D${r}`);
      fillRow(sheet, r, WEEK_BAND);
      const weekCell = sheet.getCell(`A${r}`);
      weekCell.value = week.label;
      weekCell.font = { italic: true, size: 10, color: { argb: MUTED } };
      r++;

      const headerRow = r;
      ["Date", "Entrée", "Sortie", "Durée"].forEach((h, i) => {
        const cell = sheet.getCell(headerRow, i + 1);
        cell.value = h;
        cell.font = { bold: true, size: 10, color: { argb: MUTED } };
        cell.border = thinBottom;
      });
      r++;

      for (const shift of week.shifts) {
        sheet.getCell(`A${r}`).value = dateLabel(shift.date);
        sheet.getCell(`A${r}`).border = thinBottom;

        const inCell = sheet.getCell(`B${r}`);
        inCell.value = shift.inLabel;
        inCell.font = { color: { argb: ENTER } };
        inCell.border = thinBottom;

        const outCell = sheet.getCell(`C${r}`);
        outCell.value = shift.outLabel;
        outCell.font = { color: { argb: shift.missingExit ? EXIT : ENTER } };
        outCell.border = thinBottom;

        const durationCell = sheet.getCell(`D${r}`);
        durationCell.value = shift.duration;
        if (shift.missingExit) durationCell.font = { italic: true, color: { argb: EXIT } };
        durationCell.border = thinBottom;
        r++;
      }

      sheet.mergeCells(`A${r}:C${r}`);
      const weekTotalLabel = sheet.getCell(`A${r}`);
      weekTotalLabel.value = `Total ${week.label.toLowerCase()}`;
      weekTotalLabel.font = { bold: true, size: 10 };
      weekTotalLabel.alignment = { horizontal: "right" };
      const weekTotalValue = sheet.getCell(`D${r}`);
      weekTotalValue.value = formatDuration(week.minutes);
      weekTotalValue.font = { bold: true, size: 10 };
      fillRow(sheet, r, WEEK_BAND);
      r++;
    }

    sheet.mergeCells(`A${r}:C${r}`);
    fillRow(sheet, r, PAPER_BAND);
    const totalLabel = sheet.getCell(`A${r}`);
    totalLabel.value = `Total ${employee.name}`;
    totalLabel.font = { bold: true, size: 12, color: { argb: INK } };
    totalLabel.alignment = { horizontal: "right" };
    const totalValue = sheet.getCell(`D${r}`);
    totalValue.value = formatDuration(employee.totalMinutes);
    totalValue.font = { bold: true, size: 12, color: { argb: INK } };
    fillRow(sheet, r, PAPER_BAND);
    r += 2; // blank spacer row between employees
  }

  if (payload.grandTotalMinutes !== null) {
    sheet.mergeCells(`A${r}:C${r}`);
    fillRow(sheet, r, HEADER_BG);
    sheet.getRow(r).height = 24;
    const label = sheet.getCell(`A${r}`);
    label.value = "TOTAL GÉNÉRAL";
    label.font = { bold: true, size: 13, color: { argb: HEADER_FG } };
    label.alignment = { horizontal: "right", vertical: "middle" };
    const value = sheet.getCell(`D${r}`);
    value.value = formatDuration(payload.grandTotalMinutes);
    value.font = { bold: true, size: 13, color: { argb: HEADER_FG } };
    value.alignment = { vertical: "middle" };
  }

  return workbook;
}

/** 447 -> "7h27" — same rule as convex/lib/day.ts formatMinutes, duplicated
 *  since the payload already carries formatted shift durations as strings
 *  but week/employee totals arrive as raw minutes. */
function formatDuration(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

export const toXlsx = action({
  args: {
    userId: v.optional(v.id("users")),
    period: v.union(v.literal("week"), v.literal("month")),
  },
  returns: v.object({ filename: v.string(), base64: v.string() }),
  handler: async (ctx, { userId, period }) => {
    const payload: ExportPayload = await ctx.runQuery(internal.badges.exportData, {
      userId,
      period,
    });

    const workbook = buildWorkbook(payload);
    const buffer = await workbook.xlsx.writeBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    const today = new Date().toISOString().slice(0, 10);
    const scope = period === "week" ? "semaine" : "mois";
    return { filename: `pointages-${scope}-${today}.xlsx`, base64 };
  },
});
