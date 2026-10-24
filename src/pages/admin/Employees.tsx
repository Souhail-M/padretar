import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STATUS_LABEL = {
  pending: "En attente",
  active: "Actif",
  disabled: "Désactivé",
} as const;

export function Employees() {
  const employees = useQuery(api.employees.list);
  const me = useQuery(api.auth.me);
  const approve = useMutation(api.employees.approve);
  const setStatus = useMutation(api.employees.setStatus);
  const removeEmployee = useMutation(api.employees.remove);

  const [confirm, setConfirm] = useState<{ id: Id<"users">; nom: string } | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  async function run(action: Promise<unknown>, done: string) {
    try {
      await action;
      toast.success(done);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action impossible");
    }
  }

  async function removeNow() {
    if (!confirm) return;
    setDeleting(true);
    try {
      await removeEmployee({ userId: confirm.id });
      toast.success("Compte supprimé");
      setConfirm(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Suppression impossible",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="wordmark text-lg">Employés</h1>
        <p className="text-sm text-muted-foreground">
          Un employé crée son compte lui-même, puis vous le validez ici.
        </p>
      </div>

      {employees === undefined ? null : employees.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun compte.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {employees.map((employee) => (
            <div
              key={employee._id}
              className="flex flex-col gap-3 rounded-xl border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <Link
                  to={`/admin/employes/${employee._id}`}
                  className="min-w-0 truncate font-medium underline-offset-4 hover:underline"
                >
                  {employee.nom || employee.email}
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  {employee.role === "admin" && (
                    <Badge variant="outline">Admin</Badge>
                  )}
                  <Badge
                    variant={employee.status === "active" ? "default" : "outline"}
                  >
                    {STATUS_LABEL[employee.status]}
                  </Badge>
                </div>
              </div>

              <p className="truncate text-sm text-muted-foreground">
                {[employee.poste, employee.email].filter(Boolean).join(" · ")}
              </p>

              {/* Full-width thumb targets in portrait, right-aligned compact
                  buttons on desktop. */}
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                {employee.status === "pending" && (
                  <Button
                    size="sm"
                    className="min-h-[44px] w-full sm:min-h-0 sm:w-auto"
                    onClick={() =>
                      void run(
                        approve({ userId: employee._id }),
                        "Compte validé",
                      )
                    }
                  >
                    Valider
                  </Button>
                )}
                {employee.status === "active" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="min-h-[44px] w-full sm:min-h-0 sm:w-auto"
                    onClick={() =>
                      void run(
                        setStatus({ userId: employee._id, status: "disabled" }),
                        "Accès retiré",
                      )
                    }
                  >
                    Désactiver
                  </Button>
                )}
                {employee.status === "disabled" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="min-h-[44px] w-full sm:min-h-0 sm:w-auto"
                    onClick={() =>
                      void run(
                        setStatus({ userId: employee._id, status: "active" }),
                        "Accès rétabli",
                      )
                    }
                  >
                    Réactiver
                  </Button>
                )}
                {/* Deletion sits next to the access toggle but only where it
                    is allowed to succeed: an account with a timesheet keeps
                    it, and nobody deletes their own row. The server enforces
                    both, this only keeps the click out of reach. */}
                {!employee.hasPunches && employee._id !== me?._id && (
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Supprimer ${employee.nom || employee.email}`}
                    className="min-h-[44px] w-full text-muted-foreground hover:text-foreground sm:min-h-0 sm:w-auto"
                    onClick={() =>
                      setConfirm({
                        id: employee._id,
                        nom: employee.nom || employee.email,
                      })
                    }
                  >
                    <Trash2 />
                    Supprimer
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
      >
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Supprimer ce compte ?</DialogTitle>
            <DialogDescription>
              {confirm?.nom} ne pourra plus se connecter. Irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="w-full"
              disabled={deleting}
              onClick={() => setConfirm(null)}
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
    </div>
  );
}
