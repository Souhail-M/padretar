/** Triggers a browser save-file prompt for base64-encoded bytes, e.g. the
 *  Excel export (convex/export.ts returns the file this way — a Convex
 *  action's return value has to be JSON, not raw binary). */
export function downloadBase64(
  filename: string,
  base64: string,
  mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
