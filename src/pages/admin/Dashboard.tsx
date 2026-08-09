import { useQuery } from "convex/react";
import { Link } from "react-router-dom";

import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { longDate } from "@/lib/format";

export function Dashboard() {
  const presence = useQuery(api.badges.whoIsIn);
  const employees = useQuery(api.employees.list);
  const week = useQuery(api.shifts.week, {});

  const pending = employees?.filter((e) => e.status === "pending") ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const todayShifts = week?.shifts.filter((s) => s.date === today) ?? [];
  const nameOf = (userId: string) =>
    week?.employees.find((e) => e._id === userId)?.nom ?? "—";

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

      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Présents maintenant
        </h2>
        {presence === undefined ? null : presence.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun employé actif.</p>
        ) : (
          <ul className="divide-y border-y">
            {presence.map((row) => (
              <li
                key={row.userId}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div className="min-w-0">
                  <Link
                    to={`/admin/employes/${row.userId}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {row.nom}
                  </Link>
                  {row.poste && (
                    <p className="truncate text-sm text-muted-foreground">
                      {row.poste}
                    </p>
                  )}
                </div>
                <span
                  className={cn(
                    "tnum shrink-0 rounded-md px-2.5 py-1 text-sm",
                    row.isIn
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {row.isIn ? `depuis ${row.since} · ${row.duration}` : "dehors"}
                </span>
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
