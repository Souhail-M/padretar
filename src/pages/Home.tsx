import { useState } from "react";
import { useQuery } from "convex/react";
import { QrCode } from "lucide-react";

import { api } from "../../convex/_generated/api";
import { PunchDialog } from "@/components/PunchDialog";
import { DayList } from "@/components/DayList";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatMinutes, longDate, timeLabel } from "@/lib/format";

export function Home() {
  const [scanning, setScanning] = useState(false);
  const status = useQuery(api.badges.myStatus);
  const days = useQuery(api.badges.mine);
  const today = useQuery(api.shifts.myToday);

  const isIn = status?.isIn ?? false;

  return (
    <div className="space-y-8">
      {/* State is carried by fill vs outline, never by colour. */}
      <section
        className={cn(
          "rounded-lg border p-8 text-center transition-colors",
          isIn ? "bg-primary text-primary-foreground" : "bg-transparent",
        )}
      >
        <p
          className={cn(
            "text-xs uppercase tracking-[0.2em]",
            isIn ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          {status === undefined ? " " : isIn ? "Vous êtes" : "Vous êtes"}
        </p>
        <p className="wordmark mt-2 text-4xl">
          {status === undefined ? "…" : isIn ? "Dedans" : "Dehors"}
        </p>
        {status?.since && (
          <p className="tnum mt-2 text-sm opacity-70">
            depuis {timeLabel(status.since)}
          </p>
        )}
      </section>

      <Button size="lg" className="h-16 w-full text-base" onClick={() => setScanning(true)}>
        <QrCode className="size-5" />
        {isIn ? "Pointer ma sortie" : "Pointer mon entrée"}
      </Button>

      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Aujourd'hui
        </h2>
        {today === undefined ? null : today.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun créneau prévu — {longDate(new Date().toISOString().slice(0, 10))}.
          </p>
        ) : (
          <ul className="tnum space-y-1">
            {today.map((shift) => (
              <li key={shift._id} className="text-lg">
                {shift.start} — {shift.end}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Mes pointages
        </h2>
        <DayList days={days?.slice(0, 7)} />
        {days && days.length > 0 && (
          <p className="tnum pt-2 text-sm text-muted-foreground">
            Total sur ces {Math.min(days.length, 7)} jours :{" "}
            {formatMinutes(
              days.slice(0, 7).reduce((sum, day) => sum + day.minutes, 0),
            )}
          </p>
        )}
      </section>

      <PunchDialog open={scanning} onOpenChange={setScanning} />
    </div>
  );
}
