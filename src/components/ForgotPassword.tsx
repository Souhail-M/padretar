import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Self-service password reset: an emailed code, then a new password.
 *
 * This is the only way back in for the account with nobody above it (the
 * responsable) — see convex/password.ts. It works the same for an employee,
 * who may prefer it to interrupting the responsable in person.
 */
export function ForgotPassword({ onDone }: { onDone: () => void }) {
  const { signIn } = useAuthActions();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const formData = new FormData(event.currentTarget);
    try {
      await signIn("password", formData);
      setEmail(formData.get("email") as string);
      setStep("code");
    } catch {
      setError("Envoi impossible. Vérifiez l'adresse email.");
    } finally {
      setBusy(false);
    }
  }

  async function resetWithCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const formData = new FormData(event.currentTarget);
    try {
      await signIn("password", formData);
      onDone();
    } catch {
      setError("Code incorrect ou expiré.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-xs space-y-4">
      {step === "email" ? (
        <form onSubmit={(e) => void sendCode(e)} className="space-y-4">
          <input name="flow" type="hidden" value="reset" />
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email</Label>
            <Input id="reset-email" name="email" type="email" autoComplete="email" required />
          </div>
          {error && <p className="text-sm text-muted-foreground">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Loader2 className="animate-spin" />}
            Recevoir un code
          </Button>
        </form>
      ) : (
        <form onSubmit={(e) => void resetWithCode(e)} className="space-y-4">
          <input name="flow" type="hidden" value="reset-verification" />
          <input name="email" type="hidden" value={email} />
          <p className="text-sm text-muted-foreground">
            Code envoyé à {email}.
          </p>
          <div className="space-y-2">
            <Label htmlFor="reset-code">Code reçu par email</Label>
            <Input id="reset-code" name="code" autoComplete="one-time-code" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reset-new-password">Nouveau mot de passe</Label>
            <Input
              id="reset-new-password"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
            />
          </div>
          {error && <p className="text-sm text-muted-foreground">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Loader2 className="animate-spin" />}
            Changer le mot de passe
          </Button>
        </form>
      )}

      <button
        type="button"
        className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
        onClick={onDone}
      >
        Retour à la connexion
      </button>
    </div>
  );
}
