import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  /** Fakta atau langkah tindakan, maksimal dua baris. Bukan tagline. */
  brief?: string;
  actions?: ReactNode;
};

export function PageHeader({ eyebrow, title, brief, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="text-base text-text-muted">{eyebrow}</p> : null}
        <h1 className="text-page text-text">{title}</h1>
        {brief ? <p className="mt-2 max-w-[68ch] text-base text-text-muted">{brief}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}
