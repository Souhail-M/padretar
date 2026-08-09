import { useMutation, useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const STATUS_LABEL = {
  pending: "En attente",
  active: "Actif",
  disabled: "Désactivé",
} as const;

export function Employees() {
  const employees = useQuery(api.employees.list);
  const approve = useMutation(api.employees.approve);
  const setStatus = useMutation(api.employees.setStatus);

  async function run(action: Promise<unknown>, done: string) {
    try {
      await action;
      toast.success(done);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action impossible");
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
        <ul className="divide-y border-y">
          {employees.map((employee) => (
            <li
              key={employee._id}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0 flex-1">
                <Link
                  to={`/admin/employes/${employee._id}`}
                  className="underline-offset-4 hover:underline"
                >
                  {employee.nom || employee.email}
                </Link>
                <p className="truncate text-sm text-muted-foreground">
                  {[employee.poste, employee.email].filter(Boolean).join(" · ")}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {employee.role === "admin" && (
                  <Badge variant="outline">Admin</Badge>
                )}
                <Badge
                  variant={employee.status === "active" ? "default" : "outline"}
                >
                  {STATUS_LABEL[employee.status]}
                </Badge>

                {employee.status === "pending" && (
                  <Button
                    size="sm"
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
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
