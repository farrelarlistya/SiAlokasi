import {
  House,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Package,
  Users,
  Warehouse,
} from "lucide-react";
import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { AppHeader } from "../components/AppHeader";
import { BottomNav, type BottomNavItem } from "../components/BottomNav";
import { Button } from "../components/Button";
import { useToast } from "../components/Toast";
import { cn } from "../lib/cn";

type NavItem = BottomNavItem & { mobile?: boolean };

function navItemsForRole(role: "PETUGAS" | "PIMPINAN" | "ADMIN"): NavItem[] {
  if (role === "ADMIN") {
    return [
      { label: "Dasbor", to: "/admin", icon: LayoutDashboard, mobile: true },
      { label: "Akun", to: "/admin/akun", icon: Users, mobile: true },
      { label: "Bantuan", to: "/admin/bantuan", icon: Package, mobile: true },
      { label: "Wilayah", to: "/admin/wilayah", icon: MapPinned, mobile: true },
      { label: "Stok", to: "/stok", icon: Warehouse, mobile: false },
    ];
  }

  if (role === "PIMPINAN") {
    return [
      { label: "Dasbor", to: "/pimpinan", icon: LayoutDashboard, mobile: true },
      { label: "Stok", to: "/stok", icon: Warehouse, mobile: true },
      { label: "Peta", to: "/", icon: House, mobile: true },
    ];
  }

  return [
    { label: "Dasbor", to: "/petugas", icon: LayoutDashboard, mobile: true },
    { label: "Peta publik", to: "/", icon: House, mobile: true },
  ];
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  if (!user) return null;

  const items = navItemsForRole(user.role);
  const mobileItems = items.filter((item) => item.mobile !== false);

  const handleLogout = async () => {
    try {
      await logout();
      toast.push({ tone: "info", title: "Anda sudah keluar." });
      navigate("/", { replace: true });
    } catch (error) {
      toast.push({
        tone: "danger",
        title: "Belum bisa keluar.",
        description:
          error instanceof Error
            ? error.message
            : "Periksa koneksi, lalu coba tekan Keluar lagi.",
      });
    }
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader
        user={{ name: user.name, role: user.role }}
        actions={
          <Button
            variant="secondary"
            size="md"
            leadingIcon={<LogOut />}
            onClick={() => void handleLogout()}
            aria-label="Keluar dari akun"
          >
            <span className="hidden sm:inline">Keluar</span>
          </Button>
        }
        nav={
          <>
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/admin" || item.to === "/petugas" || item.to === "/pimpinan"}
                  className={({ isActive }) =>
                    cn(
                      "inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-base transition-colors",
                      isActive
                        ? "bg-hover text-text"
                        : "text-text-muted hover:bg-hover/60 hover:text-text",
                    )
                  }
                >
                  <Icon aria-hidden="true" className="h-5 w-5" />
                  {item.label}
                </NavLink>
              );
            })}
          </>
        }
      />

      <main id="isi-utama" className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-6 sm:px-6 lg:pb-10">
        {children}
      </main>

      <BottomNav items={mobileItems} />
    </div>
  );
}
