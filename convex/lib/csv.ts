/**
 * Minimal CSV: ';' delimiter (what French Excel expects by default) and a
 * leading UTF-8 BOM so accented names open correctly without a manual
 * encoding prompt.
 */
function field(value: string): string {
  return /[;"\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(rows: string[][]): string {
  const body = rows.map((row) => row.map(field).join(";")).join("\n");
  return `﻿${body}\n`;
}
