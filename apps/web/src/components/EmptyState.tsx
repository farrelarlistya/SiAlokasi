import type { ReactNode } from "react";
import { cn } from "../lib/cn";

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
};

/** Keadaan kosong: ikon garis, satu penjelasan, satu jalan keluar. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-4 border border-border p-6",
        compact && "gap-3 p-4",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="text-text-muted [&>svg]:h-12 [&>svg]:w-12 [&>svg]:stroke-[1.5]"
      >
        {icon}
      </span>
      <div className="space-y-1">
        <h3 className={cn("font-medium text-text", compact ? "text-base leading-[26px]" : "text-section")}>
          {title}
        </h3>
        <p className="text-base text-text-muted">{description}</p>
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
