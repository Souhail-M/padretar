import { useConvexConnectionState } from "convex/react";

/**
 * A thin bar the instant the realtime connection drops — after having
 * worked once. Never shown on the very first connect: a slow initial
 * handshake isn't a "drop", and flashing this on every cold load would
 * train everyone to ignore it. The client already retries with backoff on
 * its own (convex/react); this only makes that retry visible, since a
 * silent kiosk during a drop is what makes a punch look lost, not the drop
 * itself.
 */
export function ConnectionBanner() {
  const { isWebSocketConnected, hasEverConnected } = useConvexConnectionState();
  if (isWebSocketConnected || !hasEverConnected) return null;

  return (
    <div
      role="status"
      className="bg-exit-bg px-4 py-2 text-center text-sm text-exit"
    >
      Connexion interrompue — reconnexion en cours…
    </div>
  );
}
