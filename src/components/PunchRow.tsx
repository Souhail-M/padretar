import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * One punch, one row: icon + time, then what it was.
 *
 * A timesheet is scanned rather than read, so the arrival/departure question
 * has to be answerable before any word is. Colour carries it — the one place
 * in the app where colour is used — backed by the written label so it still
 * works for anyone who cannot separate the two hues.
 */
export function PunchRow({
  type,
  time,
  duration,
  right,
}: {
  type: "in" | "out";
  time: string;
  /** Time worked since the matching entry, shown on the exit line. */
  duration?: string | null;
  /** Optional trailing content, e.g. the employee name on admin screens. */
  right?: React.ReactNode;
}) {
  const isIn = type === "in";
  const Icon = isIn ? ArrowDownLeft : ArrowUpRight;

  return (
    <div className="flex items-center gap-4 rounded-lg px-3 py-3">
      <span
        aria-hidden
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full",
          isIn ? "bg-enter-bg text-enter" : "bg-exit-bg text-exit",
        )}
      >
        <Icon className="size-4" />
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-xs font-medium uppercase tracking-wider",
            isIn ? "text-enter" : "text-exit",
          )}
        >
          {isIn ? "Entrée" : "Sortie"}
        </span>
        <span className="tnum block text-lg leading-tight">{time}</span>
      </span>

      {duration && (
        <span className="tnum shrink-0 text-right text-sm text-muted-foreground">
          {duration}
        </span>
      )}

      {right}
    </div>
  );
}
