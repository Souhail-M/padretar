import { PunchChip } from "./PunchChip";
import { formatMinutes, longDate } from "@/lib/format";

type Day = {
  date: string;
  punches: { at: number; type: "in" | "out"; label: string }[];
  minutes: number;
  incomplete: boolean;
};

/** Punch history, one block per day. Shared by the employee and admin screens. */
export function DayList({ days }: { days: Day[] | undefined }) {
  if (days === undefined) return null;
  if (days.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun pointage.</p>;
  }

  return (
    <ul className="divide-y border-y">
      {days.map((day) => (
        <li key={day.date} className="space-y-2 py-3">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-sm capitalize">{longDate(day.date)}</p>
            <p className="tnum shrink-0 text-right text-sm">
              {formatMinutes(day.minutes)}
            </p>
          </div>

          {/* Each punch spelled out rather than an arrow glyph. */}
          <div className="flex flex-wrap gap-1.5">
            {day.punches.map((p) => (
              <PunchChip key={p.at} type={p.type} time={p.label} />
            ))}
          </div>

          {day.incomplete && (
            // Stated plainly rather than closed at a guessed time — inventing
            // an end time would fabricate worked hours.
            <p className="text-xs text-muted-foreground">
              Sortie manquante — journée incomplète.
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
