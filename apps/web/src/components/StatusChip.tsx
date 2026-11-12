import {
  STATUS_LABEL,
  STATUS_TONE,
  type IncidentStatus,
  type StatusTone,
} from "@sialokasi/shared";
import { cn } from "../lib/cn";

/**
 * Status selalu teks + satu batang warna di tepi kiri, bukan pil dan bukan
 * titik dekoratif. Warna tidak pernah menjadi satu-satunya penanda.
 */
const toneClasses: Record<StatusTone, { bar: string; text: string }> = {
  info: { bar: "bg-text-muted", text: "text-text" },
  progress: { bar: "bg-info", text: "text-text" },
  warning: { bar: "bg-primary", text: "text-text" },
  success: { bar: "bg-info", text: "text-text" },
  calm: { bar: "bg-text-disabled", text: "text-text" },
  danger: { bar: "bg-danger", text: "text-danger" },
  muted: { bar: "bg-text-disabled", text: "text-text-muted" },
};

type StatusChipProps = {
  status: IncidentStatus;
  className?: string;
};

export function StatusChip({ status, className }: StatusChipProps) {
  const tone = toneClasses[STATUS_TONE[status]];

  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center border border-border bg-transparent text-base font-medium",
        tone.text,
        className,
      )}
    >
      <span aria-hidden="true" className={cn("h-8 w-0.5 shrink-0", tone.bar)} />
      <span className="px-2.5">{STATUS_LABEL[status]}</span>
    </span>
  );
}
