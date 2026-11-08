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
        "z-30 border-b border-border bg-canvas/85 backdrop-blur",
        variant === "sticky" ? "sticky top-0" : "relative",
        className,
      )}
    >
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
        <div className="flex min-w-0 items-center gap-5">
          <Link
            to="/"
            className="flex min-h-11 items-center gap-3 rounded-md pr-2 transition-colors hover:bg-hover/60"
          >
            <BrandMark className="h-11 w-11 shrink-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]" />
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="text-base font-semibold text-text">SiAlokasi</span>
              <span className="hidden whitespace-nowrap text-base text-text-muted xl:block">
                Ruang kendali darurat
              </span>
            </span>
          </Link>

          {nav ? <div className="hidden items-center gap-1 lg:flex">{nav}</div> : null}
        </div>

        <div className="flex min-w-0 items-center gap-2">
          {actions}

          {user ? (
            <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-2 py-1.5 sm:px-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-accent/15 text-base font-semibold text-info">
                {user.name.slice(0, 1)}
              </span>
              <span className="hidden min-w-0 flex-col leading-tight sm:flex">
                <span className="truncate text-base font-medium text-text">{user.name}</span>
                <span className="text-base text-text-muted">{ROLE_LABEL[user.role]}</span>
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
