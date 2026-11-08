import type { LucideIcon } from "lucide-react";
import { Skeleton } from "./Skeleton";
import { cn } from "../lib/cn";

type StatCardProps = {
  label: string;
  value?: number | string;
  hint?: string;
  icon?: LucideIcon;
  loading?: boolean;
  tone?: "default" | "warning" | "success" | "danger" | "info";
};

const toneClasses = {
  default: "text-info bg-info/10 border-info/20",
  warning: "text-warning bg-warning/10 border-warning/20",
  success: "text-success bg-success/10 border-success/20",
  danger: "text-danger bg-danger/10 border-danger/20",
  info: "text-info bg-info/10 border-info/20",
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  loading = false,
  tone = "default",
}: StatCardProps) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <p className="text-base text-text-muted">{label}</p>
        {Icon ? (
          <span
            aria-hidden="true"
            className={cn("grid h-10 w-10 place-items-center rounded-md border", toneClasses[tone])}
          >
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
      </div>

      {loading ? (
        <>
          <span className="sr-only">Sedang memuat {label}</span>
          <Skeleton className="mt-3 h-10 w-24" />
        </>
      ) : (
        <p className="mt-2 text-[32px] font-bold leading-[40px] text-text">
          {typeof value === "number" ? new Intl.NumberFormat("id-ID").format(value) : value ?? "—"}
        </p>
      )}

      {hint ? <p className="mt-1 text-base text-text-muted">{hint}</p> : null}
    </div>
  );
}
