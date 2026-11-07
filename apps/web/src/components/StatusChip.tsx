import {
  STATUS_LABEL,
  STATUS_TONE,
  type IncidentStatus,
  type StatusTone,
} from "@sialokasi/shared";
import { cn } from "../lib/cn";

const toneClasses: Record<StatusTone, string> = {
  info: "border-info/30 bg-info/15 text-info",
  progress: "border-violet/30 bg-violet/15 text-violet",
  warning: "border-warning/30 bg-warning/15 text-warning",
  success: "border-success/30 bg-success/15 text-success",
  calm: "border-success/40 bg-success/10 text-success",
  danger: "border-danger/30 bg-danger/15 text-danger",
  muted: "border-border bg-hover text-text-muted",
};

type StatusChipProps = {
  status: IncidentStatus;
  className?: string;
};

/** Status selalu tampil sebagai warna + teks, bukan warna saja. */
export function StatusChip({ status, className }: StatusChipProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center gap-2 rounded-full border px-3 py-1 text-base font-medium",
        toneClasses[STATUS_TONE[status]],
        className,
      )}
    >
      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}
