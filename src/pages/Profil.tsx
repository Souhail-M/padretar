import { useQuery } from "convex/react";

import { api } from "../../convex/_generated/api";
import { DayList } from "@/components/DayList";
import { formatMinutes } from "@/lib/format";

export function Profil() {
  const me = useQuery(api.auth.me);
  const days = useQuery(api.badges.mine);

  const total = days?.reduce((sum, day) => sum + day.minutes, 0) ?? 0;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Mon profil
        </h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Nom</dt>
          <dd>{me?.nom || "—"}</dd>
          <dt className="text-muted-foreground">Poste</dt>
          <dd>{me?.poste || "—"}</dd>
          <dt className="text-muted-foreground">Email</dt>
          <dd className="break-all">{me?.email || "—"}</dd>
        </dl>
        <p className="text-xs text-muted-foreground">
          Pour corriger ces informations, demandez à un responsable.
        </p>
      </section>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Historique
          </h2>
          {days && days.length > 0 && (
            <p className="tnum text-sm text-muted-foreground">
              {formatMinutes(total)} au total
            </p>
          )}
        </div>
        <DayList days={days} />
      </section>
    </div>
  );
}
