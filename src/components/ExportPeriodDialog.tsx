import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { ExportPeriodOption, ExportScale, ExportSpan } from "../../convex/badges";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const SCALES: { value: ExportScale; label: string }[] = [
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" },
  { value: "year", label: "Année" },
];

/** A picker selection kept per scale, so switching tabs doesn't quietly drop
 *  the weeks already ticked — checking two weeks and August is a real request. */
type Picked = Record<ExportScale, string[]>;

const NO_SELECTION: Picked = { week: [], month: [], year: [] };

/**
 * Picks which periods go into one Excel file: any number of weeks, months and
 * years at once, plus a free date range for the gaps a calendar can't express.
 *
 * Every option is derived from punches that actually exist (convex/badges.ts
 * exportPeriods) and carries its own from/to, so this screen never has to know
 * that a week starts on Monday — it hands the bounds straight back to
 * exportData, which is the same code the one-click "Semaine" preset runs
 * through. Nothing selected, nothing exported.
 *
 * Mounted only while open (ExportExcelButtons), so the periods query and the
 * per-selection state both start fresh on every visit.
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

  const options: ExportPeriodOption[] =
    scale === "week" ? periods?.weeks ?? [] : scale === "month" ? periods?.months ?? [] : periods?.years ?? [];
  const checked = picked[scale];

  // Ticks are kept per scale, so a selection can span all three tabs at once.
  // Period keys are unique across scales (a week is "2026-08-03", a month
  // "2026-08", a year "2026"), which is what lets one flat lookup resolve a
  // pick made on a tab that isn't showing.
  const byKey = new Map(
    [...(periods?.weeks ?? []), ...(periods?.months ?? []), ...(periods?.years ?? [])].map(
      (option) => [option.key, option],
    ),
  );

  // A half-filled range is a mistake, not a request — the two dates have to
  // agree before the span is ever built.
  const customSpan: ExportSpan | null =
    from && to ? (from <= to ? { from, to } : null) : null;
  const rangeReversed = Boolean(from && to && from > to);

  const spans: ExportSpan[] = [
    ...SCALES.flatMap((s) =>
      picked[s.value]
        .map((key) => byKey.get(key))
        .filter((option): option is ExportPeriodOption => option !== undefined)
        .map(({ from: f, to: t }) => ({ from: f, to: t })),
    ),
    ...(customSpan ? [customSpan] : []),
  ];

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
      [scale]: on ? options.map((o) => o.key) : [],
    }));
  }

  async function run() {
    if (spans.length === 0) return;
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

  const allChecked = options.length > 0 && checked.length === options.length;
  const count = picked.week.length + picked.month.length + picked.year.length + (customSpan ? 1 : 0);
  const today = todayKey();

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

        <div className="space-y-4">
          <div className="flex gap-1" role="tablist" aria-label="Granularité des périodes">
            {SCALES.map((s) => (
              <Button
                key={s.value}
                size="sm"
                role="tab"
                aria-selected={scale === s.value}
                variant={scale === s.value ? "default" : "ghost"}
                onClick={() => setScale(s.value)}
              >
                {s.label}
              </Button>
            ))}
          </div>

          {periods === undefined ? (
            <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Chargement des périodes…
            </p>
          ) : !periods.allowed ? (
            <p className="py-6 text-sm text-muted-foreground">
              L'export n'est pas inclus dans ce forfait.
            </p>
          ) : options.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              Aucun pointage sur cette période.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {count === 0 ? "Aucune sélection" : `${count} période${count > 1 ? "s" : ""}`}
                </Label>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => selectAll(!allChecked)}
                >
                  {allChecked ? "Tout retirer" : "Tout sélectionner"}
                </Button>
              </div>
              <ul className="max-h-56 divide-y divide-border/50 overflow-y-auto rounded-lg border">
                {options.map((option) => (
                  <li key={option.key}>
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm">
                      <Checkbox
                        checked={checked.includes(option.key)}
                        onCheckedChange={() => toggle(option.key)}
                      />
                      <span className="flex-1">{option.label}</span>
                      <span className="tnum shrink-0 text-xs text-muted-foreground">
                        {option.days} j
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Ou une plage précise
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                aria-label="Du"
                max={today}
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />
              <span className="text-sm text-muted-foreground">au</span>
              <Input
                type="date"
                aria-label="Au"
                max={today}
                value={to}
                onChange={(event) => setTo(event.target.value)}
              />
            </div>
            {rangeReversed && (
              <p className="text-xs text-exit">La date de fin précède la date de début.</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button disabled={busy || spans.length === 0} onClick={() => void run()}>
            {busy ? <Loader2 className="animate-spin" /> : <Download />}
            Exporter (Excel)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
