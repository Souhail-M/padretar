import { formatMinutes, longDate } from "@/lib/format";

type Day = {
  date: string;
  punches: { at: number; type: "in" | "out"; label: string }[];
  minutes: number;
  incomplete: boolean;
};

/** Punch history, one row per day. Shared by the employee and admin screens. */
export function DayList({ days }: { days: Day[] | undefined }) {
  if (days === undefined) return null;
  if (days.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun pointage.</p>;
  }

  return (
    <ul className="divide-y border-y">
      {days.map((day) => (
        <li key={day.date} className="flex items-baseline justify-between gap-4 py-3">
          <div className="min-w-0">
            <p className="text-sm capitalize">{longDate(day.date)}</p>
            <p className="tnum truncate text-sm text-muted-foreground">
              {day.punches
                .map((p) => `${p.type === "in" ? "↓" : "↑"} ${p.label}`)
                .join("   ")}
            </p>
          </div>
          <p className="tnum shrink-0 text-right">
            {formatMinutes(day.minutes)}
            {day.incomplete && (
              // Stated plainly rather than closed at a guessed time — an
              // invented end time would fabricate worked hours.
              <span className="block text-xs text-muted-foreground">
                sortie manquante
              </span>
            )}
          </p>
        </li>
      ))}
    </ul>
  );
}
