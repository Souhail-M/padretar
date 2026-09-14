import { NavLink, Outlet } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { LogOut, QrCode } from "lucide-react";

import { Wordmark } from "./Wordmark";
import { ConnectionBanner } from "./ConnectionBanner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavLinkDef = {
  to: string;
  label: string;
  end: boolean;
  icon?: typeof QrCode;
};

/** The dashboard is where an admin lands and checks first; the kiosk is a
 *  different kind of destination (it locks the screen, see useKioskLock) so
 *  it gets an icon rather than a new colour — this app stays monochrome
 *  outside entry/exit. Profil is the least-visited page, kept last. */
const adminNav: NavLinkDef[] = [
  { to: "/admin", label: "Tableau de bord", end: true },
  { to: "/", label: "Pointage", end: true },
  { to: "/admin/employes", label: "Employés", end: false },
  { to: "/admin/kiosque", label: "Kiosque", end: false, icon: QrCode },
  { to: "/profil", label: "Profil", end: false },
];

const employeeNav: NavLinkDef[] = [
  { to: "/", label: "Pointage", end: true },
  { to: "/profil", label: "Profil", end: false },
];

export function Layout({ isAdmin, nom }: { isAdmin: boolean; nom: string }) {
  const { signOut } = useAuthActions();
  const links = isAdmin ? adminNav : employeeNav;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <ConnectionBanner />
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <Wordmark className="text-base shrink-0" />
          <div className="flex items-center gap-1 text-sm">
            <span className="hidden truncate text-muted-foreground sm:inline">
              {nom}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Se déconnecter"
              onClick={() => void signOut()}
            >
              <LogOut />
            </Button>
          </div>
        </div>

        {/* Horizontal scroll rather than a burger menu: at most six links, and
            the employee side is used one-handed on a phone. */}
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 pb-2">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : Icon
                        ? "border border-border text-foreground hover:bg-accent"
                        : "font-normal text-muted-foreground hover:bg-accent hover:text-foreground",
                  )
                }
              >
                {Icon && <Icon className="size-3.5" />}
                {link.label}
              </NavLink>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
