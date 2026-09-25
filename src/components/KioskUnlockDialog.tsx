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
 * Two secrets can open it:
 *
 * - the dedicated kiosk password (kioskExit.ts), when the responsable has set
 *   one — checked by comparing its salted hash server-side;
 * - the account password — Convex Auth owns the hashing, so re-running its
 *   own sign-in is the only way to verify that without reimplementing it.
 *
 * The account password always works, dedicated one set or not: it already
 * outranks the kiosk secret security-wise, so there is no reason to lock a
 * forgotten dedicated password out of it. That is also the whole recovery path
 * for someone standing at an unattended tablet with no devtools: the toggle
 * below. Forgetting the account password too means an admin resetting it, or
 * clearing the dedicated one from the dashboard so only the account is asked
 * for — there is no emailed fallback to offer.
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
  // Undefined while it loads; true means a dedicated password exists and is
  // asked for first.
  const exitState = useQuery(api.kioskExit.state);
  const dedicated = exitState?.configured === true;

  const { signIn } = useAuthActions();
  const verifyExit = useMutation(api.kioskExit.verify);

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Switched on to bypass a forgotten dedicated password.
  const [useAccount, setUseAccount] = useState(false);
  const askingForAccount = useAccount || !dedicated;

  function resetLocal() {
    setPassword("");
    setError(null);
    setUseAccount(false);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password) return;

    setBusy(true);
    setError(null);
    try {
      if (askingForAccount) {
        if (!me?.email) throw new Error("no-session");
        const form = new FormData();
        form.set("email", me.email);
        form.set("password", password);
        form.set("flow", "signIn");
        await signIn("password", form);
      } else {
        const ok = await verifyExit({ password });
        if (!ok) throw new Error("wrong");
      }

      resetLocal();
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
        if (!next) resetLocal();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Quitter le kiosque</DialogTitle>
          <DialogDescription>
            {exitState === undefined
              ? "Cet écran est ouvert en boutique. Un mot de passe est demandé pour en sortir."
              : askingForAccount
                ? "Cet écran est ouvert en boutique. Le mot de passe du compte responsable est demandé pour en sortir."
                : "Cet écran est ouvert en boutique. Saisissez le mot de passe de sortie du kiosque."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="kiosk-password">
              {askingForAccount
                ? `Mot de passe ${me?.email ? `de ${me.email}` : ""}`
                : "Mot de passe de sortie"}
            </Label>
            <Input
              id="kiosk-password"
              type="password"
              autoComplete={askingForAccount ? "current-password" : "off"}
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

        <div className="flex flex-col gap-1 pt-1 text-center text-sm">
          {dedicated && !useAccount && (
            <button
              type="button"
              className="text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => {
                setUseAccount(true);
                setPassword("");
                setError(null);
              }}
            >
              Mot de passe de sortie oublié ? Utiliser le mot de passe du
              compte
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
