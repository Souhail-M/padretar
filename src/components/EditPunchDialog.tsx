import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { longDate } from "@/lib/format";

export type EditPunchTarget =
  | { mode: "edit"; badgeId: Id<"badges">; date: string; time: string; type: "in" | "out" }
  | { mode: "add"; userId: Id<"users">; date: string };

/**
 * Corrects a wrong punch, or adds one the kiosk never recorded.
 *
 * A forgotten exit deliberately leaves a day "incomplete" rather than being
 * closed at a guessed time (see convex/badges.ts `punch`) — this dialog is
 * the visible, admin-only override for when the real time turns out to be
 * known after all.
 */
export function EditPunchDialog({
  target,
  onOpenChange,
}: {
  target: EditPunchTarget | null;
  onOpenChange: (open: boolean) => void;
}) {
  const editPunch = useMutation(api.badges.editPunch);
  const addPunch = useMutation(api.badges.addPunch);
  const deletePunch = useMutation(api.badges.deletePunch);

  const [time, setTime] = useState("");
  const [type, setType] = useState<"in" | "out">("in");
  const [busy, setBusy] = useState(false);

  // The dialog stays mounted between opens; refill whenever a new target
  // arrives rather than carrying over the previous punch's values.
  useEffect(() => {
    if (target?.mode === "edit") {
      setTime(target.time);
      setType(target.type);
    } else if (target?.mode === "add") {
      setTime("");
      setType("in");
    }
  }, [target]);

  async function save() {
    if (!target || !time) return;
    setBusy(true);
    try {
      if (target.mode === "edit") {
        await editPunch({ badgeId: target.badgeId, date: target.date, time, type });
      } else {
        await addPunch({ userId: target.userId, date: target.date, time, type });
      }
      toast.success("Pointage enregistré");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (target?.mode !== "edit") return;
    setBusy(true);
    try {
      await deletePunch({ badgeId: target.badgeId });
      toast.success("Pointage supprimé");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Suppression impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>
            {target?.mode === "edit" ? "Corriger ce pointage" : "Ajouter un pointage"}
          </DialogTitle>
          <DialogDescription className="capitalize">
            {target && longDate(target.date)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="punch-type">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as "in" | "out")}>
              <SelectTrigger id="punch-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in">Entrée</SelectItem>
                <SelectItem value="out">Sortie</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="punch-time">Heure</Label>
            <Input
              id="punch-time"
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              required
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button className="w-full" disabled={busy || !time} onClick={() => void save()}>
            {busy && <Loader2 className="animate-spin" />}
            Enregistrer
          </Button>
          {target?.mode === "edit" && (
            <Button
              variant="outline"
              className="w-full"
              disabled={busy}
              onClick={() => void remove()}
            >
              Supprimer ce pointage
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
