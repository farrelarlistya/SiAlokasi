import type { LucideIcon } from "lucide-react";
import { Skeleton } from "./Skeleton";
import { cn } from "../lib/cn";

type StatCardProps = {
  label: string;
  value?: number | string;
  hint?: string;
  icon?: LucideIcon;
  loading?: boolean;
  /** `sm` dipakai untuk metrik pendukung agar tidak bersaing dengan angka fokus. */
  size?: "lg" | "sm";
  tone?: "default" | "warning" | "success" | "danger" | "info";
};

/**
 * Angka adalah produknya: mono tabular besar, label tenang di bawahnya.
 * Tidak ada kartu berbingkai, ikon di atas judul, atau gradien.
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  loading = false,
  size = "lg",
  tone = "default",
}: StatCardProps) {
  const figureTone =
    tone === "warning" ? "text-primary" : tone === "danger" ? "text-danger" : "text-text";

  return (
    <div className="flex flex-col gap-1 border-t border-border pt-4">
      <p className="flex items-center gap-2 text-base text-text-muted">
        {Icon ? <Icon aria-hidden="true" className="h-5 w-5 text-text-disabled" /> : null}
        {label}
      </p>

      {loading ? (
        <>
          <span className="sr-only">Sedang memuat {label}</span>
          <Skeleton className={size === "lg" ? "mt-2 h-10 w-24" : "mt-1 h-6 w-16"} />
        </>
      ) : (
        <p
          className={cn(
            "font-mono tabular-nums",
            size === "lg"
              ? "text-[40px] font-medium leading-[44px] tracking-[-0.03em]"
              : "text-section font-normal",
            figureTone,
          )}
        >
          {typeof value === "number" ? new Intl.NumberFormat("id-ID").format(value) : value ?? "-"}
        </p>
      )}

      {hint ? <p className="text-base text-text-muted">{hint}</p> : null}
    </div>
  );
}
