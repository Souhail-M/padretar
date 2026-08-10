import { useCallback, useEffect, useState } from "react";

const KEY = "padretar_kiosk_locked";
const EVENT = "padretar:kiosk-lock";

/**
 * Kiosk lock.
 *
 * The kiosk runs on a screen left unattended in the shop, signed in as an
 * admin — so anything that leaves the kiosk hands a stranger the admin
 * account. Guarding only the close button would be pointless: the browser's
 * back button and the address bar both go around it.
 *
 * So the lock is app-wide. While it is set, the router refuses to render
 * anything except the kiosk, whatever the URL says, until the admin password
 * is re-entered. It is stored in localStorage so a reload or an accidental
 * navigation cannot clear it.
 *
 * Ceiling, stated honestly: this stops a person with a browser, not a person
 * with devtools who can empty localStorage. Locking the device down at OS
 * level is the next step up, and is outside the app.
 */
export function useKioskLock() {
  const [locked, setLocked] = useState(
    () => localStorage.getItem(KEY) === "1",
  );

  useEffect(() => {
    // Keep every tab and hook instance in step.
    const sync = () => setLocked(localStorage.getItem(KEY) === "1");
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const lock = useCallback(() => {
    localStorage.setItem(KEY, "1");
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const unlock = useCallback(() => {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { locked, lock, unlock };
}
