import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import QrScanner from "qr-scanner";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Turn a getUserMedia failure into something an employee can act on. */
function cameraMessage(error: unknown): string {
  if (!window.isSecureContext || !navigator.mediaDevices) {
    return (
      "Le scan exige une connexion sécurisée (https). Sur cette adresse le " +
      "navigateur ne donne aucun accès à la caméra. Saisissez le code."
    );
  }

  const name = error instanceof Error ? error.name : String(error);
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return (
        "Accès à la caméra refusé. Ouvrez les réglages du site dans le " +
        "navigateur (l'icône à gauche de l'adresse) et autorisez la caméra."
      );
    case "NotFoundError":
    case "OverconstrainedError":
      return "Aucune caméra trouvée sur cet appareil. Saisissez le code.";
    case "NotReadableError":
      return (
        "La caméra est déjà utilisée par une autre application. Fermez-la " +
        "puis réessayez."
      );
    default:
      return `Caméra indisponible (${name}). Saisissez le code.`;
  }
}

/**
 * Reads the kiosk code and sends it. Two ways in, one mutation:
 * the camera, and typing the six characters printed under the QR.
 *
 * The manual path is not a fallback bolted on — it is the same string, so it
 * costs nothing and covers a refused camera permission, a locked-down phone,
 * or simply someone in a hurry.
 */
export function PunchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const punch = useMutation(api.badges.punch);

  // A callback ref kept in state, not useRef: Radix mounts the dialog's
  // content one commit after `open` flips, so an effect keyed on `open` alone
  // runs while the <video> does not exist yet, bails out, and never retries —
  // a permanently black square with no permission prompt. Holding the element
  // in state makes the effect wait for the node instead.
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);
  // Bumped to re-run the camera effect when the employee retries.
  const [attempt, setAttempt] = useState(0);

  // The camera decodes the same QR several times a second. Without a latch,
  // one scan records an entry and then immediately an exit: the first punch
  // resolves, the guard clears, and the dialog is still closing with the code
  // in view. So the latch is only released on failure — a success keeps it
  // shut and the dialog goes away.
  const submitting = useRef(false);
  const scannerRef = useRef<QrScanner | null>(null);

  async function send(code: string) {
    if (submitting.current) return;
    submitting.current = true;
    // Stop feeding decodes before awaiting anything.
    scannerRef.current?.pause();
    setBusy(true);

    try {
      const type = await punch({ code });
      toast.success(type === "in" ? "Entrée enregistrée" : "Sortie enregistrée");
      setManual("");
      onOpenChange(false);
      // Deliberately not releasing the latch here.
    } catch (error) {
      toast.error(
        error instanceof Error && error.message.includes("Code invalide")
          ? "Code invalide ou expiré. Regardez à nouveau l'écran."
          : "Pointage impossible.",
      );
      submitting.current = false;
      void scannerRef.current?.start();
    } finally {
      setBusy(false);
    }
  }

  // Held in a ref so the camera effect depends on nothing that changes per
  // render. `send` closes over useMutation's result, which is a fresh function
  // identity on every render; depending on it would destroy and restart the
  // scanner continuously — the same trap that made the kiosk code rotate in a
  // loop.
  const sendRef = useRef(send);
  sendRef.current = send;

  useEffect(() => {
    // Waits for the element rather than bailing out; see setVideoEl above.
    if (!open || !videoEl) return;

    // Fresh dialog, fresh latch — the previous session closes it on success.
    submitting.current = false;
    setCameraError(null);

    // Browsers expose getUserMedia only in a secure context (https, or
    // localhost). Over plain http on a LAN address navigator.mediaDevices is
    // undefined rather than refused, so no prompt ever appears.
    if (!window.isSecureContext || !navigator.mediaDevices) {
      setCameraError(cameraMessage(null));
      return;
    }

    const scanner = new QrScanner(
      videoEl,
      (result) => void sendRef.current(result.data),
      {
        highlightScanRegion: true,
        maxScansPerSecond: 4,
        preferredCamera: "environment",
      },
    );

    scannerRef.current = scanner;

    let cancelled = false;
    scanner.start().catch((error: unknown) => {
      if (cancelled) return;
      // Surface the real reason: "camera unavailable" alone is impossible to
      // act on, and hides a denied permission behind the same words as a
      // missing device.
      console.error("[padretar] camera start failed:", error);
      setCameraError(cameraMessage(error));
    });

    return () => {
      cancelled = true;
      scannerRef.current = null;
      scanner.destroy();
    };
  }, [open, videoEl, attempt]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Pointer</DialogTitle>
          <DialogDescription>
            Scannez le QR affiché en boutique, ou tapez le code en dessous.
          </DialogDescription>
        </DialogHeader>

        {/* The video stays mounted whatever happens: unmounting it on error
            takes the element away and makes retrying impossible. The message
            sits on top instead. */}
        <div className="relative aspect-square overflow-hidden rounded-md border bg-black">
          <video
            ref={setVideoEl}
            playsInline
            muted
            className="size-full object-cover"
          />

          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 px-4 text-center">
              <p className="text-sm text-muted-foreground">{cameraError}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAttempt((n) => n + 1)}
              >
                Réessayer
              </Button>
            </div>
          )}
        </div>

        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (manual.trim()) void send(manual.trim());
          }}
        >
          <Input
            value={manual}
            onChange={(event) => setManual(event.target.value.toUpperCase())}
            placeholder="CODE"
            maxLength={6}
            autoCapitalize="characters"
            autoComplete="off"
            className="tnum tracking-[0.3em]"
          />
          <Button type="submit" disabled={busy || manual.trim().length < 6}>
            {busy ? <Loader2 className="animate-spin" /> : "Valider"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
