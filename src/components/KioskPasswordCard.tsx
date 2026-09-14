import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Where the responsable sets the password that frees the kiosk screen.
 *
 * It lives next to the kiosk link on the dashboard because that is the one
 * moment the question exists ("how do I get out of that screen?"); it must
 * never live on the kiosk itself. Until a dedicated password is set, leaving
 * the kiosk costs the account password — stated plainly here rather than
 * discovered locked inside the shop.
 */
export function KioskPasswordCard() {
  const exitState = useQuery(api.kioskExit.state);
  const setExit = useMutation(api.kioskExit.set);
  const clearExit = useMutation(api.kioskExit.clear);

  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // A fresh form once the current state lands: no stale half-typed value
  // carried over from a previous render of someone else's session.
  useEffect(() => {
    if (exitState !== undefined) setPassword("");
  }, [exitState]);

  async function save() {
    setBusy(true);
    try {
      await setExit({ password });
      setPassword("");
      toast.success("Mot de passe de sortie enregistré");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible");
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    setBusy(true);
    try {
      await clearExit({});
      setPassword("");
      toast.success("Mot de passe dédié supprimé");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Suppression impossible");
    } finally {
      setBusy(false);
    }
  }

  const configured = exitState?.configured === true;

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">Sortie du kiosque</p>
        <p className="text-sm text-muted-foreground">
          {exitState === undefined
            ? "…"
            : configured
              ? "Un mot de passe dédié est actif : c'est lui qui libère l'écran kiosque, à la place du mot de passe du compte."
              : "Aucun mot de passe dédié : quitter le kiosque demande le mot de passe du compte responsable."}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[12rem] flex-1 space-y-2">
          <Label htmlFor="kiosk-exit-password" className="sr-only">
            Nouveau mot de passe de sortie
          </Label>
          <Input
            id="kiosk-exit-password"
            type="text"
            autoComplete="off"
            value={password}
            placeholder="Nouveau mot de passe (6 caractères minimum)"
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <Button
          size="sm"
          disabled={busy || password.trim().length < 6}
          onClick={() => void save()}
        >
          Enregistrer
        </Button>
        {configured && (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void reset()}
          >
            Supprimer
          </Button>
        )}
      </div>

      {/* Shown in clear on purpose: like the employee password reset, this one
          is read out loud or typed on the shop screen, not kept secret from
          the person who just set it. */}
      <p className="text-xs text-muted-foreground">
        Choisissez quelque chose de court mais pas devinable : il sera tapé sur
        l'écran de boutique, souvent, devant tout le monde.
      </p>
    </div>
  );
}
