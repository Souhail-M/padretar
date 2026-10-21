import { useState } from "react";
import { useQuery } from "convex/react";
import { Download } from "lucide-react";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ExportPeriodDialog } from "@/components/ExportPeriodDialog";

/**
 * The export button on the admin screens.
 *
 * One button, one dialog: a free range of dates, any number of weeks, months
 * and years ticked, or the "cette semaine" / "ce mois-ci" shortcuts inside.
 * The admin sees the period the file will be named after before it is built,
 * and nothing is exported that the screen did not spell out.
 *
 * The plan is read before the button is offered (convex/plan.ts capabilities):
 * a plan without the export shows why, in place, instead of offering a button
 * the server would refuse a second later. The server still refuses it — the
 * screen is not the lock, it is the warning. The dialog is mounted only while
 * open, so its periods query never runs on a screen nobody opened.
 */
export function ExportExcelButtons({ userId }: { userId?: Id<"users"> }) {
  const plan = useQuery(api.plan.capabilities);
  const [pickerOpen, setPickerOpen] = useState(false);

  if (plan && !plan.exportExcel) {
    return (
      <div className="rounded-lg border bg-muted/40 px-4 py-3">
        <p className="text-sm">L'export n'est pas inclus dans ce forfait.</p>
      </div>
    );
  }

  // Until the plan is known, nothing is live: a button that turns out to be
  // locked is the refusal this screen exists to avoid.
  const checking = plan === undefined;

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        size="sm"
        disabled={checking}
        onClick={() => setPickerOpen(true)}
      >
        <Download />
        Exporter (Excel)
      </Button>

      {pickerOpen && (
        <ExportPeriodDialog userId={userId} onOpenChange={setPickerOpen} />
      )}

      {checking && (
        <p className="text-sm text-muted-foreground">Vérification du forfait…</p>
      )}
    </div>
  );
}
