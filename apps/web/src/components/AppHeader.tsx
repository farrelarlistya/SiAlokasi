import { ROLE_LABEL, type Role } from "@sialokasi/shared";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "../lib/cn";
import { BrandMark } from "./BrandMark";

type AppHeaderUser = {
  name: string;
  role: Role;
};

type AppHeaderProps = {
  actions?: ReactNode;
  nav?: ReactNode;
  user?: AppHeaderUser | null;
  className?: string;
  /** inline dipakai di halaman pemeriksaan komponen. */
  variant?: "sticky" | "inline";
};

export function AppHeader({ actions, nav, user, className, variant = "sticky" }: AppHeaderProps) {
  return (
    <header
      className={cn(
        "app-header z-30 border-b border-border bg-canvas",
        variant === "sticky" ? "sticky top-0" : "relative",
        className,
      )}
    >
      <div className="flex min-h-16 w-full items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-8">
          <Link
            to="/"
            className="flex min-h-11 min-w-11 shrink-0 items-center gap-3"
            aria-label="SiAlokasi, kembali ke beranda"
          >
            <BrandMark className="h-8 w-8 shrink-0" />
            <span className="hidden text-[20px] font-medium leading-none tracking-[-0.01em] text-text sm:inline">
              SiAlokasi
            </span>
          </Link>

          {nav ? <div className="hidden items-center gap-7 lg:flex">{nav}</div> : null}
        </div>

        <div className="flex min-w-0 items-center gap-4">
          {actions}

          {user ? (
            <div className="hidden min-w-0 flex-col border-l border-border pl-4 leading-tight sm:flex">
              <span className="truncate text-base font-medium text-text">{user.name}</span>
              <span className="truncate text-base text-text-muted">{ROLE_LABEL[user.role]}</span>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
