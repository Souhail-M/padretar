import { useQuery } from "convex/react";
import { Link } from "react-router-dom";

import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { PunchChip } from "@/components/PunchChip";
import { cn } from "@/lib/utils";
import { formatMinutes, longDate } from "@/lib/format";
import { minutesSince, useNow } from "@/lib/useNow";

export function Dashboard() {
  const presence = useQuery(api.badges.whoIsIn);
  const employees = useQuery(api.employees.list);
  const week = useQuery(api.shifts.week, {});
  const activity = useQuery(api.badges.recentActivity, { limit: 40 });

  // Convex pushes the queries above the instant someone punches. Durations
  // need a clock of their own, since no data changes while time passes.
  const now = useNow();

  const pending = employees?.filter((e) => e.status === "pending") ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const todayShifts = week?.shifts.filter((s) => s.date === today) ?? [];
  const nameOf = (userId: string) =>
    week?.employees.find((e) => e._id === userId)?.nom ?? "—";

  const insideCount = presence?.filter((r) => r.isIn).length ?? 0;
  const todayActivity = activity?.filter((a) => a.date === today) ?? [];

  return (
    <div className="space-y-8">
      {pending.length > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-foreground/40 p-4">
          <p className="text-sm">
            {pending.length === 1
              ? "1 compte attend votre validation."
              : `${pending.length} comptes attendent votre validation.`}
          </p>
          <Button asChild size="sm">
            <Link to="/admin/employes">Voir</Link>
          </Button>
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Présence
          </h2>
          <p className="tnum text-sm text-muted-foreground">
            {insideCount} sur place
          </p>
        </div>

        {presence === undefined ? null : presence.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun employé actif.</p>
        ) : (
          <ul className="divide-y border-y">
            {presence.map((row) => (
              <li
                key={row.userId}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-3 px-3 py-3 transition-colors",
                  // Present staff are filled, absent staff are plain — the
                  // same fill-vs-outline language as everywhere else.
                  row.isIn && "bg-primary text-primary-foreground",
                )}
              >
                <div className="min-w-0">
                  <Link
                    to={`/admin/employes/${row.userId}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {row.nom}
                  </Link>
                  {row.poste && (
                    <p
                      className={cn(
                        "truncate text-sm",
                        row.isIn
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground",
                      )}
                    >
                      {row.poste}
                    </p>
                  )}
                </div>

                <div className="tnum shrink-0 text-right text-sm">
                  {row.isIn && row.sinceAt ? (
                    <>
                      <p className="font-medium uppercase tracking-wide">
                        Dedans
                      </p>
                      <p className="text-primary-foreground/70">
                        depuis {row.sinceLabel} ·{" "}
                        {formatMinutes(minutesSince(row.sinceAt, now))}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="uppercase tracking-wide text-muted-foreground">
                        Dehors
                      </p>
                      <p className="text-muted-foreground">
                        {row.lastLabel
                          ? row.lastIsToday
                            ? `${row.lastType === "out" ? "sorti" : "entré"} à ${row.lastLabel}`
                            : "aucun pointage aujourd'hui"
                          : "jamais pointé"}
                      </p>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Entrées et sorties du jour
        </h2>
        {activity === undefined ? null : todayActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun pointage aujourd'hui.
          </p>
        ) : (
          <ul className="divide-y border-y">
            {todayActivity.map((a) => (
              <li key={a._id} className="flex items-center justify-between gap-3 py-2.5">
                <Link
                  to={`/admin/employes/${a.userId}`}
                  className="min-w-0 truncate underline-offset-4 hover:underline"
                >
                  {a.nom}
                </Link>
                <PunchChip type={a.type} time={a.time} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Créneaux du jour
        </h2>
        {todayShifts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun créneau prévu pour {longDate(today)}.
          </p>
        ) : (
          <ul className="tnum divide-y border-y">
            {todayShifts
              .sort((a, b) => a.start.localeCompare(b.start))
              .map((shift) => (
                <li key={shift._id} className="flex justify-between gap-4 py-3">
                  <span>{nameOf(shift.userId)}</span>
                  <span>
                    {shift.start} — {shift.end}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </section>

      <Button asChild variant="outline" className="w-full">
        <Link to="/admin/kiosque">Ouvrir l'écran kiosque</Link>
      </Button>
    </div>
  );
}
