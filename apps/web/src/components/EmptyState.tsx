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
        "flex flex-col items-start gap-4 rounded-lg border border-dashed border-border bg-surface/60 p-6",
        compact && "gap-3 p-4",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="grid h-16 w-16 place-items-center rounded-md border border-border bg-elevated text-info [&>svg]:h-12 [&>svg]:w-12"
      >
        {icon}
      </span>
      <div className="space-y-1">
        <h3 className={cn("font-semibold leading-[30px] text-text", compact ? "text-base" : "text-[22px]")}>
          {title}
        </h3>
        <p className="text-base text-text-muted">{description}</p>
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
