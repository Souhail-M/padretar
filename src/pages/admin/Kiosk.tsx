import { useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { QRCodeSVG } from "qrcode.react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import { Wordmark } from "@/components/Wordmark";

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

  useEffect(() => {
    void rotate();
    const timer = setInterval(() => void rotate(), ROTATE_MS);
    return () => clearInterval(timer);
  }, [rotate]);

  // Keep the shop screen awake — a sleeping kiosk is a kiosk nobody can punch at.
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = () =>
      navigator.wakeLock
        ?.request("screen")
        .then((sentinel) => {
          lock = sentinel;
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
      void lock?.release();
    };
  }, []);

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center gap-10 bg-black px-6 py-10">
      <Link
        to="/admin"
        aria-label="Quitter le kiosque"
        className="absolute right-4 top-4 rounded-md p-2 text-neutral-700 transition-colors hover:text-neutral-300"
      >
        <X className="size-5" />
      </Link>

      <Wordmark className="text-xl text-neutral-400" />

      <div className="rounded-2xl bg-white p-6 sm:p-8">
        {kiosk ? (
          <QRCodeSVG
            value={kiosk.code}
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
          {kiosk?.code ?? "······"}
        </p>
      </div>
    </div>
  );
}
