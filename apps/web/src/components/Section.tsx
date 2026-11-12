import { useId, type ReactNode } from "react";
import { cn } from "../lib/cn";

export type SectionTone = "focus" | "default" | "quiet";

type SectionProps = {
  /** `focus` menonjol (garis aksen + permukaan), `default` tenang, `quiet` paling redup. */
  tone?: SectionTone;
  title?: string;
  /** Fakta atau langkah tindakan, maksimal dua baris. Bukan tagline. */
  brief?: string;
  actions?: ReactNode;
  headingId?: string;
  /** Level judul; `2` untuk bagian utama, `3` untuk subbagian di dalam blok fokus. */
  headingLevel?: 2 | 3;
  className?: string;
  children: ReactNode;
};

/**
 * Satu bagian halaman dengan bobot visual yang jelas.
 * Fokus dibentuk oleh permukaan, garis aksen, dan ruang — bukan kartu berbingkai.
 */
export function Section({
  tone = "default",
  title,
  brief,
  actions,
  headingId,
  headingLevel = 2,
  className,
  children,
}: SectionProps) {
  const autoId = useId();
  const generatedId = `bagian-${autoId.replace(/[^a-zA-Z0-9-]/g, "")}`;
  const titleId = headingId ?? (title ? generatedId : undefined);
  const isFocus = tone === "focus";
  const headingClass = cn(
    "text-balance focus:outline-none",
    isFocus
      ? "text-focus text-text"
      : tone === "quiet"
        ? "text-base font-medium text-text-muted"
        : "text-section text-text/90",
  );

  return (
    <section
      aria-labelledby={titleId}
      aria-label={title ? undefined : "Bagian halaman"}
      className={cn(
        isFocus
          ? "focus-rule bg-surface p-5 sm:p-6"
          : tone === "quiet"
            ? "border-t border-border pt-5"
            : "border-t border-border pt-5",
        className,
      )}
    >
      {title ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 sm:flex-1">
            {headingLevel === 3 ? (
              <h3
                id={titleId}
                tabIndex={isFocus ? -1 : undefined}
                className={headingClass}
              >
                {title}
              </h3>
            ) : (
              <h2
                id={titleId}
                tabIndex={isFocus ? -1 : undefined}
                className={headingClass}
              >
                {title}
              </h2>
            )}
            {brief ? (
              <p className="mt-1 max-w-[64ch] text-base text-text-muted">{brief}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>
          ) : null}
        </div>
      ) : null}

      <div className={cn(title ? (isFocus ? "mt-5" : "mt-4") : undefined)}>{children}</div>
    </section>
  );
}
