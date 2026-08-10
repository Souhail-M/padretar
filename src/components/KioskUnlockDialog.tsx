import { useState } from "react";
import { useQuery } from "convex/react";
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
 * Asks for the admin password before the kiosk will let go of the screen.
 *
 * The password is checked by signing in again with the account already in
 * session: Convex Auth owns the hashing, so re-running its own sign-in is the
 * only way to verify a password without reimplementing that — and getting
 * password verification subtly wrong is exactly the kind of thing not to
 * hand-roll. A wrong password throws and the kiosk stays put.
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
  const { signIn } = useAuthActions();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!me?.email) return;

    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("email", me.email);
      form.set("password", password);
      form.set("flow", "signIn");
      await signIn("password", form);

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
            Cet écran est ouvert en boutique. Le mot de passe du compte
            responsable est demandé pour en sortir.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="kiosk-password">
              Mot de passe {me?.email ? `de ${me.email}` : ""}
            </Label>
            <Input
              id="kiosk-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoFocus
              required
            />
          </div>

          {error && <p className="text-sm text-exit">{error}</p>}

          <Button type="submit" className="w-full" disabled={busy || !password}>
            {busy && <Loader2 className="animate-spin" />}
            Déverrouiller
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
