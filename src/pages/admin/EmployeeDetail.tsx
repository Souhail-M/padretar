import { useMemo, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { DayCard, type Day } from "@/components/DayList";
import { ExportExcelButtons } from "@/components/ExportExcelButtons";
import { EditPunchDialog } from "@/components/EditPunchDialog";
import type { EditPunchTarget } from "@/components/EditPunchDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMinutes, monthLabel, todayKey, weekLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

/** How many periods are worth showing; further back is history, not payroll. */
const PERIODS_SHOWN = 8;

export function EmployeeDetail() {
  const { id } = useParams();
  const userId = id as Id<"users">;

  const employee = useQuery(api.employees.get, { userId });
  const timesheet = useQuery(api.badges.forEmployee, { userId });
  const update = useMutation(api.employees.update);
  const removeEmployee = useMutation(api.employees.remove);
  const navigate = useNavigate();
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // The whole history laid flat ran 400+ rows down the page; the reel is
  // read month by month anyway (payroll weeks live in the Totaux list above),
  // so the month is the scroll unit here. Days arrive newest-first from the
  // server, so insertion order into each bucket is already chronological.
  const months = useMemo(() => {
    const buckets = new Map<string, Day[]>();
    for (const day of timesheet?.days ?? []) {
      const key = day.date.slice(0, 7);
      const bucket = buckets.get(key);
      if (bucket) bucket.push(day);
      else buckets.set(key, [day]);
    }
    return [...buckets.entries()];
  }, [timesheet?.days]);

  const monthTotals = useMemo(
    () => new Map((timesheet?.months ?? []).map((p) => [p.key, p])),
    [timesheet?.months],
  );

  // One month open at a time — the page stays as short as its summary.
  // undefined = never touched (newest month open, where the recent work is);
  // null = the user closed everything on purpose.
  const [chosenMonth, setChosenMonth] = useState<string | null | undefined>(
    undefined,
  );
  const openMonth =
    chosenMonth === undefined ? (months[0]?.[0] ?? null) : chosenMonth;

  async function save() {
    try {
      await update({ userId, nom, poste });
      setDraft(null);
      toast.success("Fiche enregistrée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible");
    }
  }

  async function removeNow() {
    setDeleting(true);
    try {
      await removeEmployee({ userId });
      toast.success("Compte supprimé");
      setConfirmDelete(false);
      navigate("/admin/employes");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Suppression impossible",
      );
    } finally {
      setDeleting(false);
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
    <div className="space-y-6 sm:space-y-8">
      <div className="space-y-1">
        <h1 className="wordmark text-lg">{employee.nom || employee.email}</h1>
        <p className="text-sm text-muted-foreground">{employee.email}</p>
      </div>

      {/* Stacked in portrait, side by side from lg up. */}
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
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
          <Button
            onClick={() => void save()}
            disabled={draft === null}
            className="min-h-[44px] w-full sm:min-h-0 sm:w-auto"
          >
            Enregistrer
          </Button>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Mot de passe oublié
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="min-w-0 flex-1 space-y-2 sm:basis-56">
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
              className="min-h-[44px] w-full sm:min-h-0 sm:w-auto"
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Pointages
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs text-muted-foreground">
              {timesheet?.days.length ?? 0} jours de relevé, pliés par mois
            </p>
            {/* Always offered, including for a day the kiosk never saw: a
                forgotten clock-in is exactly the day no card exists for. */}
            <Button
              size="sm"
              variant="outline"
              className="min-h-[44px] sm:min-h-0"
              onClick={() =>
                setEditTarget({ mode: "add", userId, date: todayKey() })
              }
            >
              <Plus />
              Ajouter un pointage
            </Button>
          </div>
        </div>
        {timesheet === undefined ? null : months.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun pointage.</p>
        ) : (
          <div className="divide-y divide-border/50 rounded-xl border bg-card">
            {months.map(([month, days]) => {
              const total = monthTotals.get(month);
              const open = month === openMonth;
              return (
                <article key={month}>
                  <button
                    type="button"
                    id={`month-${month}`}
                    aria-expanded={open}
                    aria-controls={`month-panel-${month}`}
                    onClick={() => setChosenMonth(open ? null : month)}
                    className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-left transition-colors hover:bg-accent/50"
                  >
                    <span className="flex items-baseline gap-3">
                      <span className="text-sm font-medium capitalize">
                        {monthLabel(month)}
                      </span>
                      <span className="tnum text-xs text-muted-foreground">
                        {days.length}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="tnum text-sm">
                        {formatMinutes(total?.minutes ?? 0)}
                        {total?.incomplete && (
                          <span className="text-exit"> *</span>
                        )}
                      </span>
                      <ChevronDown
                        aria-hidden
                        className={cn(
                          "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                          open && "rotate-180",
                        )}
                      />
                    </span>
                  </button>
                  {open && (
                    <div
                      id={`month-panel-${month}`}
                      role="region"
                      aria-labelledby={`month-${month}`}
                      className="px-4 pb-4"
                    >
                      {days.map((day) => (
                        <DayCard
                          key={day.date}
                          day={day}
                          flat
                          renderRight={(p, date) => (
                            <button
                              type="button"
                              aria-label="Corriger ce pointage"
                              className="ml-2 flex shrink-0 items-center justify-center rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground max-sm:min-h-[44px] max-sm:min-w-[44px]"
                              onClick={() =>
                                setEditTarget({
                                  mode: "edit",
                                  badgeId: p._id,
                                  date,
                                  time: p.label,
                                  type: p.type,
                                })
                              }
                            >
                              <Pencil className="size-4" />
                            </button>
                          )}
                          renderDayExtra={(day) => (
                            <button
                              type="button"
                              className="mt-2 flex min-h-[44px] items-center gap-1 py-1 text-xs text-muted-foreground underline-offset-4 hover:underline sm:min-h-0"
                              onClick={() =>
                                setEditTarget({
                                  mode: "add",
                                  userId,
                                  date: day.date,
                                })
                              }
                            >
                              <Plus className="size-3" />
                              Ajouter un pointage
                            </button>
                          )}
                        />
                      ))}
                      {days.some((d) => d.incomplete) && (
                        <p className="pt-2 text-xs text-muted-foreground">
                          * journée sans sortie : total sous-évalué.
                        </p>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Deletion is offered only with nothing to preserve: an account that
          punched keeps its timesheet, so it is disabled from the list
          instead — the server enforces the same rule. */}
      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Supprimer
        </h2>
        {timesheet === undefined ? null : timesheet.days.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            Ce compte a un relevé de pointages : il ne peut pas être
            supprimé. Pour retirer son accès, désactivez-le depuis la liste
            des employés — son relevé sera conservé.
          </p>
        ) : (
          <div className="space-y-3 rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">
              Supprime définitivement ce compte et sa session. Irréversible —
              mais il n'a aucun pointage, donc rien d'autre ne disparaît.
            </p>
            <Button
              variant="outline"
              className="min-h-[44px] w-full sm:min-h-0 sm:w-auto"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 />
              Supprimer ce compte
            </Button>
          </div>
        )}
      </section>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Supprimer ce compte ?</DialogTitle>
            <DialogDescription>
              {employee.nom || employee.email} ne pourra plus se connecter.
              Irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="w-full"
              disabled={deleting}
              onClick={() => setConfirmDelete(false)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              className="w-full"
              disabled={deleting}
              onClick={() => void removeNow()}
            >
              {deleting ? "Suppression…" : "Supprimer définitivement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditPunchDialog
        target={editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
      />
    </div>
  );
}
