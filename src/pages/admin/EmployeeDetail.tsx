import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { DayList } from "@/components/DayList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMinutes, longDate } from "@/lib/format";

export function EmployeeDetail() {
  const { id } = useParams();
  const userId = id as Id<"users">;

  const employee = useQuery(api.employees.get, { userId });
  const days = useQuery(api.badges.forEmployee, { userId });
  const shifts = useQuery(api.shifts.forEmployee, { userId });
  const update = useMutation(api.employees.update);

  // Uncontrolled until first edit, so the fields fill in when the query lands.
  const [draft, setDraft] = useState<{ nom: string; poste: string } | null>(null);
  const nom = draft?.nom ?? employee?.nom ?? "";
  const poste = draft?.poste ?? employee?.poste ?? "";

  async function save() {
    try {
      await update({ userId, nom, poste });
      setDraft(null);
      toast.success("Fiche enregistrée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible");
    }
  }

  if (employee === undefined) return null;
  if (employee === null) {
    return <p className="text-sm text-muted-foreground">Employé introuvable.</p>;
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="wordmark text-lg">{employee.nom || employee.email}</h1>
        <p className="text-sm text-muted-foreground">{employee.email}</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Fiche
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom</Label>
            <Input
              id="nom"
              value={nom}
              onChange={(event) => setDraft({ nom: event.target.value, poste })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="poste">Poste</Label>
            <Input
              id="poste"
              value={poste}
              placeholder="Vendeur, responsable…"
              onChange={(event) => setDraft({ nom, poste: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Rôle</Label>
            <Select
              value={employee.role}
              onValueChange={(role) =>
                void update({ userId, role: role as "employee" | "admin" })
                  .then(() => toast.success("Rôle modifié"))
                  .catch((error: Error) => toast.error(error.message))
              }
            >
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Employé</SelectItem>
                <SelectItem value="admin">Administrateur</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={() => void save()} disabled={draft === null}>
          Enregistrer
        </Button>
      </section>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Pointages
          </h2>
          {days && days.length > 0 && (
            <p className="tnum text-sm text-muted-foreground">
              {formatMinutes(days.reduce((sum, day) => sum + day.minutes, 0))} au total
            </p>
          )}
        </div>
        <DayList days={days} />
      </section>

      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Créneaux
        </h2>
        {shifts === undefined ? null : shifts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun créneau.</p>
        ) : (
          <ul className="tnum divide-y border-y">
            {shifts.map((shift) => (
              <li key={shift._id} className="flex justify-between gap-4 py-3">
                <span className="capitalize">{longDate(shift.date)}</span>
                <span>
                  {shift.start} — {shift.end}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
