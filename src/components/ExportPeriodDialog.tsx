import { useMemo, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  DEFAULT_EXPORT_CAP,
  spansFromSelection,
  summarizeSelection,
  type ExportPeriodOption,
  type ExportScale,
} from "../../convex/lib/exportRange";
import { ExportPicker } from "@/components/ExportPicker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { downloadBase64 } from "@/lib/download";
import { todayKey } from "@/lib/format";

/** A picker selection kept per scale, so switching tabs doesn't quietly drop
 *  the weeks already ticked — checking two weeks and August is a real request. */
type Picked = Record<ExportScale, string[]>;

const NO_SELECTION: Picked = { week: [], month: [], year: [] };

/** The scales, in the order the tabs read them. */
const SCALES: ExportScale[] = ["week", "month", "year"];

/**
 * Chooses what goes into one Excel file: a free date range, plus any number
 * of weeks, months and years ticked across the three tabs.
 *
 * The screen itself is `ExportPicker` — one component, no Convex inside it, so
 * it can be rendered and judged on its own. This file is the wiring around it:
 * the periods the server offers, the selection the admin makes, and the one
 * judgment both ends make — `summarizeSelection`, the same module the server
 * uses to decide whether a file may be built. A selection the server would
 * refuse is therefore refused on the screen, in the server's own words, before
 * anyone clicks.
 *
 * Mounted only while open (ExportExcelButtons), so the periods query and the
 * selection both start fresh on every visit.
 */
export function ExportPeriodDialog({
  userId,
  onOpenChange,
}: {
  userId?: Id<"users">;
  onOpenChange: (open: boolean) => void;
}) {
  const periods = useQuery(api.badges.exportPeriods, { userId });
  const toXlsx = useAction(api.export.toXlsx);

  const [scale, setScale] = useState<ExportScale>("week");
  const [picked, setPicked] = useState<Picked>(NO_SELECTION);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);

  // Every period the server offered, in one lookup. Keys never collide across
  // scales (a week is "2026-08-03", a month "2026-08", a year "2026"), which is
  // what lets a pick made on one tab resolve while another tab is showing.
  const byKey = useMemo(() => {
    const map = new Map<string, ExportPeriodOption>();
    for (const option of [
      ...(periods?.weeks ?? []),
      ...(periods?.months ?? []),
      ...(periods?.years ?? []),
    ]) {
      map.set(option.key, option);
    }
    return map;
  }, [periods]);

  const options: ExportPeriodOption[] =
    scale === "week"
      ? periods?.weeks ?? []
      : scale === "month"
        ? periods?.months ?? []
        : periods?.years ?? [];

  // The selection, as the days it covers: the ticked periods' own bounds, plus
  // the custom range when both of its dates are in order.
  const spans = spansFromSelection(
    SCALES.flatMap((s) => picked[s])
      .map((key) => byKey.get(key))
      .filter((option): option is ExportPeriodOption => option !== undefined),
    { from, to },
  );

  // The same judgment the server will make, with the same ceiling — the plan's
  // retention window, read from the periods query — run before the click.
  const summary = summarizeSelection(spans, periods?.cap ?? DEFAULT_EXPORT_CAP);

  // A range that runs backwards, or that carries only one of its two dates, is
  // a mistake, not a request: the button stays off until the two dates agree.
  // Nothing is ever exported with a half-typed range silently dropped.
  const reversed = Boolean(from && to && from > to);
  const halfFilled = Boolean(from) !== Boolean(to);
  const allowed = periods?.allowed ?? true;
  const blocked = reversed || halfFilled || summary.blocked !== null;

  function toggle(key: string) {
    setPicked((current) => {
      const list = current[scale];
      return {
        ...current,
        [scale]: list.includes(key) ? list.filter((k) => k !== key) : [...list, key],
      };
    });
  }

  function selectAll(on: boolean) {
    setPicked((current) => ({
      ...current,
      [scale]: on ? options.map((option) => option.key) : [],
    }));
  }

  async function run() {
    if (blocked) return;
    setBusy(true);
    try {
      const { filename, base64 } = await toXlsx({ userId, spans });
      downloadBase64(filename, base64);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exporter les pointages</DialogTitle>
          <DialogDescription>
            {userId
              ? "Une ou plusieurs périodes pour cet employé, dans un seul fichier."
              : "Une ou plusieurs périodes pour tous les employés, dans un seul fichier."}
          </DialogDescription>
        </DialogHeader>

        <ExportPicker
          options={options}
          scale={scale}
          onScaleChange={setScale}
          picked={picked[scale]}
          onToggle={toggle}
          onSelectAll={selectAll}
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
          today={todayKey()}
          summary={summary}
          loading={periods === undefined}
          allowed={allowed}
        />

        {allowed && (
          <DialogFooter>
            <Button disabled={busy || blocked} onClick={() => void run()}>
              {busy ? <Loader2 className="animate-spin" /> : <Download />}
              Exporter (Excel)
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
