import { useEffect, useState } from "react";

/**
 * A clock that ticks, for durations that must keep counting.
 *
 * Convex re-runs a query only when the data it read changes, so any elapsed
 * time computed on the server freezes until the next punch. Durations are
 * therefore derived on the client from a raw timestamp plus this tick.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    // Catch up immediately when the tab is brought back: a background tab
    // gets its timers throttled, so the figure on screen can be minutes stale.
    const onVisible = () => {
      if (document.visibilityState === "visible") setNow(Date.now());
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs]);

  return now;
}

/** Minutes elapsed between a timestamp and now, never negative. */
export function minutesSince(at: number, now: number): number {
  return Math.max(0, Math.round((now - at) / 60_000));
}
