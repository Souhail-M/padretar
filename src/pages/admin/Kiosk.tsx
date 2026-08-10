import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { QRCodeSVG } from "qrcode.react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import { Wordmark } from "@/components/Wordmark";
import { KioskUnlockDialog } from "@/components/KioskUnlockDialog";
import { useKioskLock } from "@/lib/useKioskLock";

/** Matches the 60s TTL in convex/kiosk.ts, halved: a code is always replaced
 *  well before it can expire under someone's camera. */
const ROTATE_MS = 30_000;

/**
 * The shop display. Full black, one giant QR, and the same six characters in
 * plain text underneath so the code can also be typed or read out.
 *
 * The rotation is what makes a photographed QR worthless: a code lives 30
 * seconds. Convex pushes the new code to every open kiosk screen on its own.
 */
export function Kiosk() {
  const kiosk = useQuery(api.kiosk.current);
  const rotate = useMutation(api.kiosk.rotate);
  const navigate = useNavigate();
  const { lock, unlock } = useKioskLock();
  const [asking, setAsking] = useState(false);

  // Opening the kiosk locks the app to it. The screen sits unattended in the
  // shop under an admin session, so leaving must cost a password — and the
  // lock has to survive the back button and the address bar, not just the
  // close control.
  useEffect(() => {
    lock();
  }, [lock]);

  // The mutation is held in a ref so the interval can depend on nothing.
  // useMutation returns a fresh function identity on every render, so keying
  // the effect on it made each rotation re-run the effect and rotate again —
  // a loop that changed the code faster than anyone could type it.
  const rotateRef = useRef(rotate);
  rotateRef.current = rotate;

  // On mount the query still holds the *previous* code, which is usually
  // already expired. Showing it would hand out a QR that gets refused, so
  // nothing scannable is displayed until this screen's own rotation lands.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const tick = () => void rotateRef.current().then(() => setReady(true));
    tick();
    const timer = setInterval(tick, ROTATE_MS);
    return () => clearInterval(timer);
  }, []);

  const code = ready ? kiosk?.code : undefined;

  // Keep the shop screen awake — a sleeping kiosk is a kiosk nobody can punch at.
  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;
    const request = () =>
      navigator.wakeLock
        ?.request("screen")
        .then((granted) => {
          sentinel = granted;
        })
        .catch(() => {
          // Unsupported or denied; the screen's own timeout takes over.
        });

    void request();
    // A wake lock is dropped whenever the tab is hidden, so re-take it on return.
    const onVisible = () => {
      if (document.visibilityState === "visible") void request();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release();
    };
  }, []);

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center gap-10 bg-black px-6 py-10">
      <button
        type="button"
        onClick={() => setAsking(true)}
        aria-label="Quitter le kiosque"
        className="absolute right-4 top-4 rounded-md p-2 text-neutral-700 transition-colors hover:text-neutral-300"
      >
        <Lock className="size-5" />
      </button>

      <KioskUnlockDialog
        open={asking}
        onOpenChange={setAsking}
        onUnlocked={() => {
          unlock();
          navigate("/admin", { replace: true });
        }}
      />

      <Wordmark className="text-xl text-neutral-400" />

      <div className="rounded-2xl bg-white p-6 sm:p-8">
        {code ? (
          <QRCodeSVG
            value={code}
            size={320}
            level="M"
            className="h-[min(60vw,20rem)] w-[min(60vw,20rem)]"
          />
        ) : (
          <div className="h-[min(60vw,20rem)] w-[min(60vw,20rem)]" />
        )}
      </div>

      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
          ou saisissez ce code
        </p>
        <p className="tnum mt-3 text-5xl font-light tracking-[0.35em] text-white sm:text-6xl">
          {code ?? "······"}
        </p>
      </div>
    </div>
  );
}
