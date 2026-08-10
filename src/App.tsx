import { Authenticated, Unauthenticated, AuthLoading, useQuery } from "convex/react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { api } from "../convex/_generated/api";
import { SignIn } from "@/components/SignIn";
import { Layout } from "@/components/Layout";
import { Pending } from "@/pages/Pending";
import { Home } from "@/pages/Home";
import { Profil } from "@/pages/Profil";
import { Dashboard } from "@/pages/admin/Dashboard";
import { Employees } from "@/pages/admin/Employees";
import { EmployeeDetail } from "@/pages/admin/EmployeeDetail";
import { Kiosk } from "@/pages/admin/Kiosk";
import { Toaster } from "@/components/ui/sonner";
import { useKioskLock } from "@/lib/useKioskLock";

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </div>
  );
}

function AdminOnly({ isAdmin, children }: { isAdmin: boolean; children: React.ReactNode }) {
  return isAdmin ? <>{children}</> : <Navigate to="/" replace />;
}

function Authed() {
  const me = useQuery(api.auth.me);
  const { locked, unlock } = useKioskLock();

  if (me === undefined) return <Splash />;
  if (me === null) return <Splash />;
  if (me.status !== "active") return <Pending status={me.status} />;

  const isAdmin = me.role === "admin";

  // While the kiosk is locked nothing else renders, whatever the URL says.
  // Guarding only the kiosk's own close button would achieve nothing: the
  // back button and the address bar both walk straight past it, and the
  // screen is sitting unattended in the shop under an admin session.
  if (locked) {
    if (isAdmin) return <Kiosk />;
    // A non-admin can never be behind this lock; clear the stale flag rather
    // than trapping them on a screen they have no business seeing.
    unlock();
  }

  // The kiosk is deliberately outside the layout: it is a full-screen display,
  // not a page someone navigates around from.
  return (
    <Routes>
      <Route
        path="/admin/kiosque"
        element={
          <AdminOnly isAdmin={isAdmin}>
            <Kiosk />
          </AdminOnly>
        }
      />
      <Route element={<Layout isAdmin={isAdmin} nom={me.nom ?? me.email ?? ""} />}>
        <Route path="/" element={<Home />} />
        <Route path="/profil" element={<Profil />} />
        <Route
          path="/admin"
          element={
            <AdminOnly isAdmin={isAdmin}>
              <Dashboard />
            </AdminOnly>
          }
        />
        <Route
          path="/admin/employes"
          element={
            <AdminOnly isAdmin={isAdmin}>
              <Employees />
            </AdminOnly>
          }
        />
        <Route
          path="/admin/employes/:id"
          element={
            <AdminOnly isAdmin={isAdmin}>
              <EmployeeDetail />
            </AdminOnly>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <>
      <AuthLoading>
        <Splash />
      </AuthLoading>
      <Unauthenticated>
        <SignIn />
      </Unauthenticated>
      <Authenticated>
        <Authed />
      </Authenticated>
      <Toaster />
    </>
  );
}
