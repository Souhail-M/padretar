import { PunchRow } from "./PunchRow";
import { formatMinutes, longDate } from "@/lib/format";

type Punch = { at: number; type: "in" | "out"; label: string };

type Day = {
  date: string;
  punches: Punch[];
  minutes: number;
  incomplete: boolean;
};

/** Pair each exit with the entry before it, so a line can show its own span. */
function withSpans(punches: Punch[]) {
  let openedAt: number | null = null;
  return punches.map((p) => {
    if (p.type === "in") {
      openedAt = p.at;
      return { ...p, duration: null as string | null };
    }
    const duration =
      openedAt === null
        ? null
        : formatMinutes(Math.round((p.at - openedAt) / 60_000));
    openedAt = null;
    return { ...p, duration };
  });
}

/**
 * Timesheet: one day per block, one line per punch, in chronological order.
 * Shared by the employee screens and the admin employee detail.
 */
export function DayList({ days }: { days: Day[] | undefined }) {
  if (days === undefined) return null;
  if (days.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun pointage.</p>;
  }

  return (
    <ul className="divide-y border-y">
      {days.map((day) => (
        <li key={day.date} className="py-3">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-sm capitalize text-muted-foreground">
              {longDate(day.date)}
            </p>
            <p className="tnum shrink-0 text-sm">
              Total {formatMinutes(day.minutes)}
            </p>
          </div>

          <div className="mt-1 divide-y divide-border/50">
            {withSpans(day.punches).map((p) => (
              <PunchRow
                key={p.at}
                type={p.type}
                time={p.label}
                duration={p.duration}
              />
            ))}
          </div>

          {day.incomplete && (
            // Stated plainly rather than closed at a guessed time — inventing
            // an end time would fabricate worked hours.
            <p className="pt-1 text-xs text-exit">
              Sortie manquante — journée incomplète.
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
