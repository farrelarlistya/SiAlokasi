import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-base font-medium text-info">{eyebrow}</p>
        ) : null}
        <h1 className="mt-1 text-[28px] font-bold leading-[36px] text-text sm:text-[32px] sm:leading-[40px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-3xl text-base text-text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}
