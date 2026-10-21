import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { dateLabel } from "@/lib/format";
import {
  presetSpan,
  type ExportPeriodOption,
  type ExportScale,
  type ExportSelectionSummary,
} from "../../convex/lib/exportRange";

/** The three granularities the picker offers, in the order they are read. */
const SCALES: { value: ExportScale; label: string }[] = [
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" },
  { value: "year", label: "Année" },
];

/**
 * What the picker shows, and what it asks for.
 *
 * Every value comes from the parent: the periods the server offered, the
 * selection the parent holds, and the summary the parent computed with the
 * very module the server will use. Nothing here talks to Convex, so the
 * picker can be read, reasoned about and rendered on its own.
 */
export type ExportPickerProps = {
  /** The periods offered on the tab being shown. */
  options: ExportPeriodOption[];
  /** The tab being shown. */
  scale: ExportScale;
  onScaleChange: (scale: ExportScale) => void;
  /** The keys ticked on the tab being shown. */
  picked: string[];
  onToggle: (key: string) => void;
  /** Tick or untick every period of the tab being shown. */
  onSelectAll: (on: boolean) => void;
  /** The custom range, exactly as typed. */
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  /** The last day an export can cover — today. */
  today: string;
  /** What the whole selection covers, and what stands in its way. */
  summary: ExportSelectionSummary;
  /** True while the periods are still being read. */
  loading: boolean;
  /** False when the plan doesn't include the export. */
  allowed: boolean;
};

/**
 * Picks what goes into one Excel file: a free date range, plus any number of
 * weeks, months and years ticked across the three tabs.
 *
 * The range comes first because it is what the admin came for; the tabs below
 * add the periods the shop has actually worked, and the two date shortcuts
 * fill the range in one click. Under the dates, one line says what the
 * selection actually covers, and the same module the server will use says
 * when it covers too much — the plan's ceiling is a sentence on the screen,
 * not a refusal after the click.
 */
export function ExportPicker({
  options,
  scale,
  onScaleChange,
  picked,
  onToggle,
  onSelectAll,
  from,
  to,
  onFromChange,
  onToChange,
  today,
  summary,
  loading,
  allowed,
}: ExportPickerProps) {
  if (!allowed) {
    return (
      <p className="py-2 text-sm text-muted-foreground">
        L'export n'est pas inclus dans ce forfait.
      </p>
    );
  }

  const reversed = Boolean(from && to && from > to);
  // A half-filled range is a mistake, not a request: the two dates have to
  // agree before the span is ever built.
  const halfFilled = Boolean(from) !== Boolean(to);
  const overCap = !summary.empty && summary.days > summary.cap.days;
  const allChecked = options.length > 0 && picked.length === options.length;

  // The shortcuts write into the two fields rather than holding a hidden
  // selection, so every day that will be exported is visible in the range.
  function fill(period: "week" | "month") {
    const span = presetSpan(period, today);
    onFromChange(span.from);
    onToChange(span.to);
  }

  // The stretch the selection covers, in words.
  const extent =
    summary.from && summary.to
      ? summary.from === summary.to
        ? dateLabel(summary.from)
        : `${dateLabel(summary.from)} – ${dateLabel(summary.to)}`
      : "";

  // French agrees on the number: "1 jour", "12 jours".
  const dayWord = (count: number) => (count > 1 ? "jours" : "jour");
  const excess = summary.days - summary.cap.days;

  return (
    <div className="space-y-5">
      {/* The scope, first: the dates the export covers, and the two shortcuts
          that fill them without a dialog of their own. */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p id="export-period" className="text-sm font-medium">
            Période
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fill("week")}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              Cette semaine
            </button>
            <button
              type="button"
              onClick={() => fill("month")}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              Ce mois-ci
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2" role="group" aria-labelledby="export-period">
          <Input
            type="date"
            aria-label="Du"
            max={today}
            value={from}
            onChange={(event) => onFromChange(event.target.value)}
            className="flex-1"
          />
          <span className="text-sm text-muted-foreground">au</span>
          <Input
            type="date"
            aria-label="Au"
            max={today}
            value={to}
            onChange={(event) => onToChange(event.target.value)}
            className="flex-1"
          />
        </div>

        {/* One line answers "what will be exported?" — the days it covers and
            the stretch they cover. */}
        {!summary.empty && (
          <p className="text-sm">
            <span className="tnum text-foreground">{summary.days}</span>{" "}
            <span className="text-muted-foreground">
              {dayWord(summary.days)} couvert{summary.days > 1 ? "s" : ""}
            </span>
            <span className="text-muted-foreground">{" · "}{extent}</span>
          </p>
        )}

        {reversed && (
          <p className="text-sm text-foreground">La date de fin précède la date de début.</p>
        )}
        {halfFilled && (
          <p className="text-sm text-foreground">
            Indiquez les deux dates de la plage, ou effacez-la.
          </p>
        )}
        {overCap ? (
          <p className="text-sm text-foreground">
            La limite est de <span className="tnum">{summary.cap.days}</span> jours (
            {summary.cap.reason}) par export — retirez{" "}
            <span className="tnum">{excess}</span> {dayWord(excess)}.
          </p>
        ) : (
          !summary.empty &&
          summary.blocked && (
            <p className="text-sm text-foreground">{summary.blocked}</p>
          )
        )}
      </div>

      {/* The shortcuts: the periods the shop has actually worked, one
          granularity at a time. Scope on the left, utility on the right. */}
      <div className="space-y-2">
        {/* The app's own segmented control (see EmployeeDetail's day/week/month
            switcher): filled for the tab in view, quiet for the others. */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex items-center gap-1" role="tablist" aria-label="Granularité des périodes">
            {SCALES.map((s) => (
              <Button
                key={s.value}
                type="button"
                size="sm"
                role="tab"
                aria-selected={scale === s.value}
                variant={scale === s.value ? "default" : "ghost"}
                onClick={() => onScaleChange(s.value)}
              >
                {s.label}
              </Button>
            ))}
          </div>
          {!loading && options.length > 0 && (
            <button
              type="button"
              onClick={() => onSelectAll(!allChecked)}
              className="whitespace-nowrap text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {allChecked ? "Tout retirer" : "Tout sélectionner"}
            </button>
          )}
        </div>

        {loading ? (
          <SkeletonList />
        ) : options.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            Aucun pointage sur cette période.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <div className="flex items-center justify-between gap-3 px-3 pt-2.5 text-xs text-muted-foreground">
              <span>Période</span>
              <span className="tnum">Jours pointés</span>
            </div>
            <ul className="max-h-56 divide-y divide-border/50 overflow-y-auto">
              {options.map((option) => (
                <li key={option.key}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm">
                    <Checkbox
                      checked={picked.includes(option.key)}
                      onCheckedChange={() => onToggle(option.key)}
                    />
                    <span className="flex-1 truncate">{option.label}</span>
                    <span className="tnum shrink-0 text-muted-foreground">{option.days} j</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The list's own shape while the periods are read: the frame stays, the rows
 * are grey bars at the size the rows will take, and nothing shifts when the
 * periods land.
 */
function SkeletonList() {
  return (
    <ul
      className="max-h-56 divide-y divide-border/50 overflow-hidden rounded-lg border"
      aria-hidden
    >
      {[0, 1, 2, 3].map((row) => (
        <li key={row} className="flex items-center gap-3 px-3 py-2.5">
          <span className="size-4 shrink-0 rounded-[4px] bg-muted" />
          <span className="h-3 flex-1 rounded bg-muted" />
          <span className="h-3 w-6 shrink-0 rounded bg-muted" />
        </li>
      ))}
    </ul>
  );
}
