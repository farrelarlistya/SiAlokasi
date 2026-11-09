import type { Role } from "@sialokasi/shared";
import { ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";
import { buttonStyles } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import { homePathForRole } from "../lib/roles";
import { useAuth } from "./AuthProvider";
import { isLoggingOut } from "./logout-state";

function AuthLoadingScreen() {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-10 sm:px-6">
        <span className="sr-only">Sedang memeriksa sesi Anda</span>
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton variant="card" className="mt-4 h-40" />
      </main>
    </div>
  );
}

function ForbiddenPage() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader user={user ? { name: user.name, role: user.role } : null} />
      <main id="isi-utama" className="mx-auto flex w-full max-w-3xl flex-1 items-center px-4 py-12 sm:px-6">
        <div className="w-full rounded-lg border border-border bg-surface p-6 shadow-panel sm:p-8">
          <span
            aria-hidden="true"
            className="grid h-16 w-16 place-items-center rounded-md border border-warning/30 bg-warning/10 text-warning"
          >
            <ShieldAlert className="h-9 w-9" />
          </span>
          <h1 className="mt-5 text-[28px] font-bold leading-[36px] text-text">
            Halaman ini bukan untuk peran Anda
          </h1>
          <p className="mt-3 text-base text-text-muted">
            Menu yang tersedia sudah disesuaikan dengan peran Anda. Kembali ke dasbor untuk
            melanjutkan pekerjaan.
          </p>
          <div className="mt-6">
            <Link
              to={user ? homePathForRole(user.role) : "/"}
              className={buttonStyles("primary", "lg")}
            >
              Kembali ke dasbor saya
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

type RequireRoleProps = {
  roles: readonly Role[];
  children: ReactNode;
};

export function RequireRole({ roles, children }: RequireRoleProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <AuthLoadingScreen />;

  if (!user) {
    // Jangan simpan alamat halaman berperan saat pengguna memang baru keluar.
    if (isLoggingOut()) return <AuthLoadingScreen />;
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/masuk?next=${next}`} replace />;
  }

  if (!roles.includes(user.role)) {
    return <ForbiddenPage />;
  }

  return <>{children}</>;
}
