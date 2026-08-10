import { cn } from "@/lib/utils";

/**
 * One punch, one line: time, then what it was.
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

  return (
    <div className="flex items-center gap-3 py-2">
      {/* Colour bar: the fastest thing to read down a long column. */}
      <span
        aria-hidden
        className={cn("h-8 w-1 shrink-0 rounded-full", isIn ? "bg-enter" : "bg-exit")}
      />

      <span className="tnum w-14 shrink-0 text-base">{time}</span>

      <span
        className={cn(
          "shrink-0 rounded px-2 py-0.5 text-xs font-medium uppercase tracking-wider",
          isIn ? "bg-enter-bg text-enter" : "bg-exit-bg text-exit",
        )}
      >
        {isIn ? "Entrée" : "Sortie"}
      </span>

      <span className="tnum ml-auto text-sm text-muted-foreground">
        {duration ?? ""}
      </span>

      {right}
    </div>
  );
}
