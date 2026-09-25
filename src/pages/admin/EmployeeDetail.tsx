import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useParams } from "react-router-dom";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { DayList } from "@/components/DayList";
import { ExportExcelButtons } from "@/components/ExportExcelButtons";
import { EditPunchDialog } from "@/components/EditPunchDialog";
import type { EditPunchTarget } from "@/components/EditPunchDialog";
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
import { formatMinutes, monthLabel, weekLabel } from "@/lib/format";

/** How many periods are worth showing; further back is history, not payroll. */
const PERIODS_SHOWN = 8;

export function EmployeeDetail() {
  const { id } = useParams();
  const userId = id as Id<"users">;

  const employee = useQuery(api.employees.get, { userId });
  const timesheet = useQuery(api.badges.forEmployee, { userId });
  const update = useMutation(api.employees.update);
  const resetPassword = useAction(api.password.resetForEmployee);

  // Uncontrolled until first edit, so the fields fill in when the query lands.
  const [draft, setDraft] = useState<{ nom: string; poste: string } | null>(null);
  const nom = draft?.nom ?? employee?.nom ?? "";
  const poste = draft?.poste ?? employee?.poste ?? "";

  const [scale, setScale] = useState<"week" | "month">("week");
  const periods = (scale === "week" ? timesheet?.weeks : timesheet?.months) ?? [];
  const shown = periods.slice(0, PERIODS_SHOWN);

  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const [editTarget, setEditTarget] = useState<EditPunchTarget | null>(null);

  async function save() {
    try {
      await update({ userId, nom, poste });
      setDraft(null);
      toast.success("Fiche enregistrée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible");
    }
  }

  async function resetPasswordNow() {
    setResetting(true);
    try {
      await resetPassword({ userId, password: newPassword });
      setNewPassword("");
      toast.success("Mot de passe changé. L'employé est déconnecté partout.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Réinitialisation impossible",
      );
    } finally {
      setResetting(false);
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

      <div className="grid gap-8 lg:grid-cols-2">
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

        <section className="space-y-4">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Mot de passe oublié
          </h2>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[14rem] flex-1 space-y-2">
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              {/* Shown in clear on purpose: this one is read out loud to the
                  employee standing there, not typed in secret. */}
              <Input
                id="new-password"
                type="text"
                autoComplete="off"
                value={newPassword}
                placeholder="8 caractères minimum"
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </div>
            <Button
              variant="outline"
              disabled={newPassword.trim().length < 8 || resetting}
              onClick={() => void resetPasswordNow()}
            >
              Réinitialiser
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Aucun email n'est envoyé ici : vous donnez le nouveau mot de passe
            à l'employé, qui le change ensuite s'il le souhaite. Ses sessions
            ouvertes sont fermées. C'est la seule façon de récupérer un mot de
            passe oublié — l'écran de connexion n'en propose aucune autre.
          </p>
        </section>
      </div>

      <section className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Totaux
          </h2>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={scale === "week" ? "default" : "ghost"}
              onClick={() => setScale("week")}
            >
              Semaine
            </Button>
            <Button
              size="sm"
              variant={scale === "month" ? "default" : "ghost"}
              onClick={() => setScale("month")}
            >
              Mois
            </Button>
          </div>
        </div>
        <ExportExcelButtons userId={userId} />

        {timesheet === undefined ? null : shown.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun pointage.</p>
        ) : (
          <>
            <div className="rounded-xl border bg-card">
              <ul className="divide-y divide-border/50">
                {shown.map((period) => (
                  <li
                    key={period.key}
                    className="flex items-baseline justify-between gap-4 px-4 py-2.5"
                  >
                    <span className="text-sm capitalize text-muted-foreground">
                      {scale === "week"
                        ? weekLabel(period.key)
                        : monthLabel(period.key)}
                    </span>
                    <span className="tnum shrink-0 text-sm">
                      {formatMinutes(period.minutes)}
                      {period.incomplete && <span className="text-exit"> *</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            {shown.some((period) => period.incomplete) && (
              <p className="text-xs text-muted-foreground">
                * contient une journée sans sortie : le total est sous-évalué.
              </p>
            )}
          </>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Pointages
        </h2>
        <DayList
          days={timesheet?.days}
          renderRight={(p, date) => (
            <button
              type="button"
              aria-label="Corriger ce pointage"
              className="ml-2 shrink-0 rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              onClick={() =>
                setEditTarget({ mode: "edit", badgeId: p._id, date, time: p.label, type: p.type })
              }
            >
              <Pencil className="size-4" />
            </button>
          )}
          renderDayExtra={(day) => (
            <button
              type="button"
              className="mt-2 flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => setEditTarget({ mode: "add", userId, date: day.date })}
            >
              <Plus className="size-3" />
              Ajouter un pointage
            </button>
          )}
        />
      </section>

      <EditPunchDialog
        target={editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
      />
    </div>
  );
}
