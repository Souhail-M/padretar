import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Loader2 } from "lucide-react";

import { Wordmark } from "./Wordmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Sign in, or sign up. There is no "forgot password" link here on purpose:
 * a shop shares a room, so the way back in is the responsable resetting the
 * password from the employee's fiche, and the responsable's own is the CLI
 * break-glass (convex/password.ts). A link that couldn't have worked — the
 * emailed-code flow is gone — would only be a dead end to promise otherwise.
 */
export function SignIn() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const formData = new FormData(event.currentTarget);
    formData.set("flow", flow);
    try {
      await signIn("password", formData);
    } catch {
      // Convex Auth deliberately does not distinguish "no such account" from
      // "wrong password"; keep the message equally vague so it stays that way.
      setError(
        flow === "signIn"
          ? "Email ou mot de passe incorrect."
          : "Inscription impossible. Cet email a peut-être déjà un compte.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <Wordmark className="mb-2 text-2xl" />
      <p className="mb-10 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Padretar
      </p>

      <form onSubmit={onSubmit} className="w-full max-w-xs space-y-4">
        {flow === "signUp" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="prenom">Prénom</Label>
              <Input id="prenom" name="prenom" autoComplete="given-name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nom">Nom</Label>
              <Input id="nom" name="nom" autoComplete="family-name" required />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={flow === "signIn" ? "current-password" : "new-password"}
            required
          />
        </div>

        {error && <p className="text-sm text-muted-foreground">{error}</p>}

        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />}
          {flow === "signIn" ? "Se connecter" : "Créer mon compte"}
        </Button>

        <button
          type="button"
          className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => {
            setFlow(flow === "signIn" ? "signUp" : "signIn");
            setError(null);
          }}
        >
          {flow === "signIn"
            ? "Pas encore de compte ? En créer un"
            : "J'ai déjà un compte"}
        </button>
      </form>
    </div>
  );
}
