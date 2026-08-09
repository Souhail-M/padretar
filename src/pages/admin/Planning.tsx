import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMinutes, longDate, shortDate } from "@/lib/format";

/** Shift a "YYYY-MM-DD" by whole days. Noon UTC dodges every DST edge. */
function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

type Editing = {
  shiftId?: Id<"shifts">;
  userId: Id<"users">;
  date: string;
  start: string;
  end: string;
};

export function Planning() {
  const [anchor, setAnchor] = useState(() => new Date().toISOString().slice(0, 10));
  const [editing, setEditing] = useState<Editing | null>(null);

  const week = useQuery(api.shifts.week, { date: anchor });
  const upsert = useMutation(api.shifts.upsert);
  const remove = useMutation(api.shifts.remove);

  async function save() {
    if (!editing) return;
    try {
      const { shiftId, ...shift } = editing;
      await upsert({ shiftId, ...shift });
      setEditing(null);
      toast.success("Créneau enregistré");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible");
    }
  }

  async function drop() {
    if (!editing?.shiftId) return;
    try {
      await remove({ shiftId: editing.shiftId });
      setEditing(null);
      toast.success("Créneau supprimé");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Suppression impossible");
    }
  }

  const total = week?.shifts.reduce((sum, s) => sum + s.minutes, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="wordmark text-lg">Planning</h1>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Semaine précédente"
            onClick={() => setAnchor(addDays(anchor, -7))}>
            <ChevronLeft />
          </Button>
          <span className="tnum min-w-40 text-center text-sm capitalize">
            {week ? `${shortDate(week.days[0])} — ${shortDate(week.days[6])}` : "…"}
          </span>
          <Button variant="ghost" size="icon" aria-label="Semaine suivante"
            onClick={() => setAnchor(addDays(anchor, 7))}>
            <ChevronRight />
          </Button>
        </div>
      </div>

      {week && week.employees.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Aucun employé actif. Validez d'abord un compte dans Employés.
        </p>
      )}

      {week && week.employees.length > 0 && (
        // The only screen that assumes a wide viewport; it scrolls sideways on
        // a phone rather than collapsing into something unreadable.
        <div className="overflow-x-auto">
          <table className="w-full min-w-3xl border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-background border-b p-2 text-left font-normal text-muted-foreground">
                  Employé
                </th>
                {week.days.map((day) => (
                  <th
                    key={day}
                    className="border-b p-2 text-center font-normal capitalize text-muted-foreground"
                  >
                    {shortDate(day)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {week.employees.map((employee) => (
                <tr key={employee._id}>
                  <td className="sticky left-0 z-10 truncate border-b bg-background p-2">
                    {employee.nom}
                  </td>
                  {week.days.map((day) => {
                    const cell = week.shifts.filter(
                      (s) => s.userId === employee._id && s.date === day,
                    );
                    return (
                      <td key={day} className="border-b p-1 align-top">
                        <div className="flex flex-col gap-1">
                          {cell.map((shift) => (
                            <button
                              key={shift._id}
                              onClick={() =>
                                setEditing({
                                  shiftId: shift._id,
                                  userId: employee._id,
                                  date: day,
                                  start: shift.start,
                                  end: shift.end,
                                })
                              }
                              className="tnum rounded bg-primary px-2 py-1 text-xs text-primary-foreground"
                            >
                              {shift.start}–{shift.end}
                            </button>
                          ))}
                          <button
                            aria-label={`Ajouter un créneau pour ${employee.nom}`}
                            onClick={() =>
                              setEditing({
                                userId: employee._id,
                                date: day,
                                start: "09:00",
                                end: "18:00",
                              })
                            }
                            className="flex items-center justify-center rounded border border-dashed py-1 text-muted-foreground transition-colors hover:border-solid hover:text-foreground"
                          >
                            <Plus className="size-3" />
                          </button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 0 && (
        <p className="tnum text-sm text-muted-foreground">
          Total planifié cette semaine : {formatMinutes(total)}
        </p>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="capitalize">
              {editing ? longDate(editing.date) : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start">Début</Label>
              <Input
                id="start"
                type="time"
                value={editing?.start ?? ""}
                onChange={(event) =>
                  setEditing((prev) =>
                    prev ? { ...prev, start: event.target.value } : prev,
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">Fin</Label>
              <Input
                id="end"
                type="time"
                value={editing?.end ?? ""}
                onChange={(event) =>
                  setEditing((prev) =>
                    prev ? { ...prev, end: event.target.value } : prev,
                  )
                }
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {editing?.shiftId ? (
              <Button variant="outline" onClick={() => void drop()}>
                Supprimer
              </Button>
            ) : (
              <span />
            )}
            <Button onClick={() => void save()}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
