import { useState } from "react";
import { useAction } from "convex/react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { downloadBase64 } from "@/lib/download";

/**
 * Two buttons — cette semaine, ce mois — as a styled Excel download. Pass
 * `userId` for one employee's export, omit it for every employee (the
 * payroll run). Admin only and plan-gated server-side
 * (convex/badges.ts exportData); these buttons simply don't render for a
 * plan without export.
 */
export function ExportExcelButtons({ userId }: { userId?: Id<"users"> }) {
  const toXlsx = useAction(api.export.toXlsx);
  const [busy, setBusy] = useState<"week" | "month" | null>(null);

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
    </div>
  );
}
