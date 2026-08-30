import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Loader2 } from "lucide-react";

import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Asks for a password before the kiosk will let go of the screen.
 *
 * Two secrets can open it, in order of preference:
 *
 * - the dedicated kiosk password (kioskExit.ts), when the responsable has set
 *   one — checked by comparing its salted hash server-side;
 * - otherwise the account password, as before: Convex Auth owns the hashing,
 *   so re-running its own sign-in is the only way to verify that without
 *   reimplementing it — and getting password verification subtly wrong is
 *   exactly the kind of thing not to hand-roll.
 *
 * A wrong secret throws and the kiosk stays put.
 */
export function KioskUnlockDialog({
  open,
  onOpenChange,
  onUnlocked,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnlocked: () => void;
}) {
  const me = useQuery(api.auth.me);
  // Which secret is being asked for. Undefined while it loads; null means no
  // dedicated password exists and the login password is the gate.
  const exitState = useQuery(api.kioskExit.state);
  const dedicated = exitState?.configured === true;

  const { signIn } = useAuthActions();
  const verifyExit = useMutation(api.kioskExit.verify);

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password) return;

    setBusy(true);
    setError(null);
    try {
      if (dedicated) {
        const ok = await verifyExit({ password });
        if (!ok) throw new Error("wrong");
      } else {
        // Fallback path: the login password, verified by signing in again
        // with the account already in session.
        if (!me?.email) throw new Error("no-session");
        const form = new FormData();
        form.set("email", me.email);
        form.set("password", password);
        form.set("flow", "signIn");
        await signIn("password", form);
      }

      setPassword("");
      onOpenChange(false);
      onUnlocked();
    } catch {
      setError("Mot de passe incorrect.");
      setPassword("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setPassword("");
          setError(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Quitter le kiosque</DialogTitle>
          <DialogDescription>
            {exitState === undefined
              ? "Cet écran est ouvert en boutique. Un mot de passe est demandé pour en sortir."
              : dedicated
                ? "Cet écran est ouvert en boutique. Saisissez le mot de passe de sortie du kiosque."
                : "Cet écran est ouvert en boutique. Le mot de passe du compte responsable est demandé pour en sortir."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="kiosk-password">
              {dedicated
                ? "Mot de passe de sortie"
                : `Mot de passe ${me?.email ? `de ${me.email}` : ""}`}
            </Label>
            <Input
              id="kiosk-password"
              type="password"
              autoComplete={dedicated ? "off" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoFocus
              required
            />
          </div>

          {error && <p className="text-sm text-exit">{error}</p>}

          <Button
            type="submit"
            className="w-full"
            disabled={busy || !password || exitState === undefined}
          >
            {busy && <Loader2 className="animate-spin" />}
            Déverrouiller
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
