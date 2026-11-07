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

/** Navigasi bawah untuk layar kecil. Maksimal 4 tujuan agar tetap mudah disentuh. */
export function BottomNav({ items, className, variant = "fixed" }: BottomNavProps) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Navigasi utama"
      className={cn(
        "z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur",
        variant === "fixed" ? "fixed inset-x-0 bottom-0 md:hidden" : "relative w-full",
        className,
      )}
    >
      <ul
        className="grid"
        style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 4)}, minmax(0, 1fr))` }}
      >
        {items.slice(0, 4).map((item) => {
          const Icon = item.icon;
          return (
            <li key={`${item.to}-${item.label}`}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 text-base transition-colors",
                    isActive || item.active
                      ? "text-info"
                      : "text-text-muted hover:bg-hover/60 hover:text-text",
                  )
                }
              >
                <Icon aria-hidden="true" className="h-6 w-6" />
                <span className="leading-tight">{item.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
