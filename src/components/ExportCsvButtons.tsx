import { useState } from "react";
import { useConvex } from "convex/react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { downloadText } from "@/lib/download";

/**
 * Two buttons — cette semaine, ce mois — as a CSV download. Pass `userId`
 * for one employee's export, omit it for every employee (the payroll run).
 * Admin only and plan-gated server-side (convex/badges.ts exportCsv); these
 * buttons simply don't render for a plan without CSV export.
 */
export function ExportCsvButtons({ userId }: { userId?: Id<"users"> }) {
  const convex = useConvex();
  const [busy, setBusy] = useState<"week" | "month" | null>(null);

  async function download(period: "week" | "month") {
    setBusy(period);
    try {
      const csv = await convex.query(api.badges.exportCsv, { userId, period });
      const label = period === "week" ? "semaine" : "mois";
      const today = new Date().toISOString().slice(0, 10);
      downloadText(`pointages-${label}-${today}.csv`, csv);
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
        Semaine (CSV)
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={busy !== null}
        onClick={() => void download("month")}
      >
        {busy === "month" ? <Loader2 className="animate-spin" /> : <Download />}
        Mois (CSV)
      </Button>
    </div>
  );
}
