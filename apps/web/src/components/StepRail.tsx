import { cn } from "../lib/cn";

export type StepState = "selesai" | "aktif" | "belum";

type StepRailProps = {
  steps: string[];
  /** Indeks langkah aktif, mulai dari 0. */
  current: number;
  label?: string;
  className?: string;
};

const STATE_TEXT: Record<StepState, string> = {
  selesai: "sudah selesai",
  aktif: "langkah saat ini",
  belum: "belum dimulai",
};

/**
 * Tiga langkah alur laporan. Penanda kotak 8 px, bukan pil,
 * agar status langkah terbaca tanpa bergantung pada warna saja.
 */
export function StepRail({ steps, current, label = "Langkah laporan", className }: StepRailProps) {
  return (
    <nav aria-label={label} className={cn("border-t border-border pt-4", className)}>
      <ol className="grid max-w-[640px] grid-cols-3 gap-x-4 gap-y-3">
        {steps.map((step, index) => {
          const state: StepState =
            index < current ? "selesai" : index === current ? "aktif" : "belum";
          return (
            <li key={step} className="flex min-h-6 items-start gap-2">
              <span
                aria-hidden="true"
                className={cn(
                  "mt-2 h-2 w-2 shrink-0",
                  state === "aktif"
                    ? "bg-primary"
                    : state === "selesai"
                      ? "bg-text-muted"
                      : "border border-border-strong",
                )}
              />
              <span
                aria-current={state === "aktif" ? "step" : undefined}
                className={cn(
                  "text-base",
                  state === "aktif"
                    ? "font-medium text-text"
                    : state === "selesai"
                      ? "text-text-muted"
                      : "text-text-disabled",
                )}
              >
                {step}
              </span>
              <span className="sr-only">({STATE_TEXT[state]})</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
