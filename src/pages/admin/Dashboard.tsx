import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { PunchRow } from "@/components/PunchRow";
import { cn } from "@/lib/utils";
import { formatMinutes } from "@/lib/format";
import { minutesSince, useNow } from "@/lib/useNow";

export function Dashboard() {
  const presence = useQuery(api.badges.whoIsIn);
  const employees = useQuery(api.employees.list);
  const activity = useQuery(api.badges.recentActivity, { limit: 60 });

  // Convex pushes these the instant someone punches; durations need their own
  // clock, since no data changes while time passes.
  const now = useNow();

  const pending = employees?.filter((e) => e.status === "pending") ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const insideCount = presence?.filter((r) => r.isIn).length ?? 0;

  // recentActivity comes back newest first; a timesheet reads forwards.
  const todayFeed = (activity ?? [])
    .filter((a) => a.date === today)
    .sort((a, b) => a.at - b.at);

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
              <li key={row.userId}>
                {/* The whole row is the link: tapping a name is how you get to
                    that employee's timesheet. */}
                <Link
                  to={`/admin/employes/${row.userId}`}
                  className="flex items-center gap-3 py-3 transition-colors hover:bg-accent/50"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "h-9 w-1 shrink-0 rounded-full",
                      row.isIn ? "bg-enter" : "bg-border",
                    )}
                  />

                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{row.nom}</span>
                    {row.poste && (
                      <span className="block truncate text-sm text-muted-foreground">
                        {row.poste}
                      </span>
                    )}
                  </span>

                  <span className="tnum shrink-0 text-right text-sm">
                    {row.isIn && row.sinceAt ? (
                      <>
                        <span className="block font-medium uppercase tracking-wider text-enter">
                          Dedans
                        </span>
                        <span className="block text-muted-foreground">
                          depuis {row.sinceLabel} ·{" "}
                          {formatMinutes(minutesSince(row.sinceAt, now))}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="block uppercase tracking-wider text-muted-foreground">
                          Dehors
                        </span>
                        <span className="block text-muted-foreground">
                          {row.lastLabel
                            ? row.lastIsToday
                              ? `${row.lastType === "out" ? "sorti" : "entré"} à ${row.lastLabel}`
                              : "aucun pointage aujourd'hui"
                            : "jamais pointé"}
                        </span>
                      </>
                    )}
                  </span>

                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Pointages du jour
        </h2>
        {activity === undefined ? null : todayFeed.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun pointage aujourd'hui.
          </p>
        ) : (
          <ul className="divide-y border-y">
            {todayFeed.map((a) => (
              <li key={a._id}>
                <Link
                  to={`/admin/employes/${a.userId}`}
                  className="block transition-colors hover:bg-accent/50"
                >
                  <PunchRow
                    type={a.type}
                    time={a.time}
                    right={
                      <span className="ml-3 min-w-0 max-w-[45%] truncate text-sm">
                        {a.nom}
                      </span>
                    }
                  />
                </Link>
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
