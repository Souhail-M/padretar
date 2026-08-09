import { useAuthActions } from "@convex-dev/auth/react";
import { Wordmark } from "@/components/Wordmark";
import { Button } from "@/components/ui/button";

/**
 * A signed-up employee holds a session but no access until an admin approves.
 * Every backend function refuses them (lib/auth.ts), so this screen is the
 * whole experience until that happens.
 */
export function Pending({ status }: { status: "pending" | "disabled" }) {
  const { signOut } = useAuthActions();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Wordmark className="mb-10 text-xl" />

      <p className="max-w-xs text-balance text-lg">
        {status === "pending"
          ? "Votre compte a bien été créé. Un responsable doit le valider avant que vous puissiez pointer."
          : "Votre accès a été désactivé. Rapprochez-vous d'un responsable."}
      </p>

      <Button variant="ghost" className="mt-10" onClick={() => void signOut()}>
        Se déconnecter
      </Button>
    </div>
  );
}
