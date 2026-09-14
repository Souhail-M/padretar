import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { ArrowDownLeft, ArrowUpRight, ChevronRight } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { PunchRow } from "@/components/PunchRow";
import { KioskPasswordCard } from "@/components/KioskPasswordCard";
import { ExportExcelButtons } from "@/components/ExportExcelButtons";
import { cn } from "@/lib/utils";
import { formatMinutes } from "@/lib/format";
import { minutesSince, useNow } from "@/lib/useNow";

/** One glanceable number, the vocabulary of a dashboard's top row. */
function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
      <p className="tnum mt-1 text-2xl">{value}</p>
    </div>
  );
}

/**
 * Total minutes worked today, across everyone, live.
 *
 * `recentActivity` gives raw punches, not durations — this pairs each in
 * with the out right after it, same rule as groupByDay in convex/badges.ts,
 * but across users. A shift still open counts up to `now`, so the tile ticks
 * instead of freezing at the last punch — the point of a live dashboard.
 */
function todayMinutesTotal(feed: { userId: string; at: number; type: "in" | "out" }[], now: number) {
  const byUser = new Map<string, typeof feed>();
  for (const p of feed) byUser.set(p.userId, [...(byUser.get(p.userId) ?? []), p]);

  let total = 0;
  for (const punches of byUser.values()) {
    let openedAt: number | null = null;
    for (const p of punches) {
      if (p.type === "in") openedAt = p.at;
      else if (openedAt !== null) {
        total += p.at - openedAt;
        openedAt = null;
      }
    }
    if (openedAt !== null) total += now - openedAt;
  }
  return Math.round(total / 60_000);
}

export function Dashboard() {
  const presence = useQuery(api.badges.whoIsIn);
  const employees = useQuery(api.employees.list);
  const activity = useQuery(api.badges.recentActivity, { limit: 60 });

  // Convex pushes these the instant someone punches; durations need their own
  // clock, since no data changes while time passes.
  const now = useNow();

  const pending = employees?.filter((e) => e.status === "pending") ?? [];
  const activeCount = employees?.filter((e) => e.status === "active").length ?? 0;
  const today = new Date().toISOString().slice(0, 10);
  const insideCount = presence?.filter((r) => r.isIn).length ?? 0;

  // recentActivity comes back newest first; a timesheet reads forwards.
  const todayFeed = (activity ?? [])
    .filter((a) => a.date === today)
    .sort((a, b) => a.at - b.at);
  const todayMinutes = todayMinutesTotal(todayFeed, now);

  return (
    <div className="space-y-8">
      {pending.length > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-foreground/40 bg-card p-4">
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Présents" value={`${insideCount}`} />
        <StatTile label="Employés actifs" value={`${activeCount}`} />
        <StatTile label="Heures aujourd'hui" value={formatMinutes(todayMinutes)} />
        <StatTile label="En attente" value={`${pending.length}`} />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
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
            <div className="rounded-xl border bg-card">
              <ul className="divide-y divide-border/50">
                {presence.map((row) => {
                  const Icon = row.isIn ? ArrowDownLeft : ArrowUpRight;
                  return (
                    <li key={row.userId}>
                      {/* The whole row is the link: tapping a name is how you
                          get to that employee's timesheet. */}
                      <Link
                        to={`/admin/employes/${row.userId}`}
                        className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-accent/50"
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-full",
                            row.isIn ? "bg-enter-bg text-enter" : "bg-exit-bg text-exit",
                          )}
                        >
                          <Icon className="size-4" />
                        </span>

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
                  );
                })}
              </ul>
            </div>
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
            <div className="rounded-xl border bg-card">
              <ul className="divide-y divide-border/50">
                {todayFeed.map((a) => (
                  <li key={a._id}>
                    <Link
                      to={`/admin/employes/${a.userId}`}
                      className="block px-1 transition-colors hover:bg-accent/50"
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
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Export
          </h2>
          <div className="space-y-3 rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">
              Semaine ou mois en cours, tous les employés.
            </p>
            <ExportExcelButtons />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Kiosque
          </h2>
          <KioskPasswordCard />
          <Button asChild variant="outline" className="w-full">
            <Link to="/admin/kiosque">Ouvrir l'écran kiosque</Link>
          </Button>
        </section>
      </div>
    </div>
  );
}
