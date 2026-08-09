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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);

  // `submitting` guards against the scanner firing repeatedly on the same code
  // while the mutation is still in flight — otherwise one scan punches twice.
  const submitting = useRef(false);

  async function send(code: string) {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try {
      const type = await punch({ code });
      toast.success(type === "in" ? "Entrée enregistrée" : "Sortie enregistrée");
      setManual("");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error && error.message.includes("Code invalide")
          ? "Code invalide ou expiré. Regardez à nouveau l'écran."
          : "Pointage impossible.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!open || !videoRef.current) return;

    setCameraError(null);

    // Browsers only expose getUserMedia in a secure context (HTTPS, or
    // localhost). Over plain HTTP on a LAN address navigator.mediaDevices is
    // not merely refused — it is undefined, so no permission prompt ever
    // appears and the camera looks broken. Say that plainly instead.
    if (!window.isSecureContext || !navigator.mediaDevices) {
      setCameraError(
        "Le scan par caméra exige une connexion sécurisée (https). " +
          "Sur cette adresse, le navigateur n'autorise pas la caméra. " +
          "Saisissez le code affiché sur l'écran.",
      );
      return;
    }

    const scanner = new QrScanner(
      videoRef.current,
      (result) => void send(result.data),
      { highlightScanRegion: true, maxScansPerSecond: 4 },
    );

    scanner.start().catch(() => {
      setCameraError(
        "Caméra inaccessible. Vérifiez l'autorisation dans le navigateur, " +
          "ou saisissez le code affiché sur l'écran.",
      );
    });

    return () => scanner.destroy();
    // `send` is stable enough for this dialog's lifetime; re-running on every
    // render would restart the camera continuously.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Pointer</DialogTitle>
          <DialogDescription>
            Scannez le QR affiché en boutique, ou tapez le code en dessous.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-hidden rounded-md border bg-black">
          {cameraError ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              {cameraError}
            </p>
          ) : (
            <video ref={videoRef} className="aspect-square w-full object-cover" />
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
