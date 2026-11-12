import type { LucideIcon } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "../lib/cn";

export type BottomNavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  active?: boolean;
};

type BottomNavProps = {
  items: BottomNavItem[];
  className?: string;
  /** inline dipakai di halaman pemeriksaan komponen. */
  variant?: "fixed" | "inline";
};

/** Navigasi bawah: teks 16 px dengan garis aktif di atas, maksimal 4 tujuan. */
export function BottomNav({ items, className, variant = "fixed" }: BottomNavProps) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Navigasi utama"
      className={cn(
        "z-30 border-t border-border bg-canvas pb-[env(safe-area-inset-bottom)]",
        variant === "fixed" ? "fixed inset-x-0 bottom-0 lg:hidden" : "relative w-full",
        className,
      )}
    >
      <ul
        className="grid"
        style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 4)}, minmax(0, 1fr))` }}
      >
        {items.slice(0, 4).map((item) => (
          <li key={`${item.to}-${item.label}`}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex min-h-14 items-center justify-center border-t-2 px-1 text-base transition-colors",
                  isActive || item.active
                    ? "border-primary text-text"
                    : "border-transparent text-text-muted hover:text-text",
                )
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
