import { useState } from "react";
import { useAction } from "convex/react";
import { CalendarRange, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ExportPeriodDialog } from "@/components/ExportPeriodDialog";
import { downloadBase64 } from "@/lib/download";

/**
 * The export buttons on the admin screens.
 *
 * Two one-click presets — cette semaine, ce mois — because the payroll run
 * almost always wants exactly those and shouldn't have to open a dialog to get
 * them. Everything else (a specific week, several months, a whole year, an
 * arbitrary range) goes through "Autres périodes", which opens the picker.
 *
 * Both paths end in the same place: `toXlsx` with either the `period` preset
 * or the spans the picker collected, resolved by the same code server-side
 * (convex/lib/exportRange.ts). Pass `userId` for one employee, omit it for the
 * whole shop.
 *
 * Admin only and plan-gated server-side (convex/badges.ts exportData). These
 * buttons render for any admin; a plan without export finds out on click,
 * except in the picker, which says so before offering any period.
 */
export function ExportExcelButtons({ userId }: { userId?: Id<"users"> }) {
  const toXlsx = useAction(api.export.toXlsx);
  const [busy, setBusy] = useState<"week" | "month" | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  async function download(period: "week" | "month") {
    setBusy(period);
    try {
      const { filename, base64 } = await toXlsx({ userId, period });
      downloadBase64(filename, base64);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export impossible");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={busy !== null}
        onClick={() => void download("week")}
      >
        {busy === "week" ? <Loader2 className="animate-spin" /> : <Download />}
        Semaine (Excel)
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={busy !== null}
        onClick={() => void download("month")}
      >
        {busy === "month" ? <Loader2 className="animate-spin" /> : <Download />}
        Mois (Excel)
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={busy !== null}
        onClick={() => setPickerOpen(true)}
      >
        <CalendarRange />
        Autres périodes
      </Button>

      {/* Mounted only while open, so the picker restarts on every visit and its
          periods query doesn't run on a screen the admin never opened. */}
      {pickerOpen && (
        <ExportPeriodDialog userId={userId} onOpenChange={setPickerOpen} />
      )}
    </div>
  );
}
