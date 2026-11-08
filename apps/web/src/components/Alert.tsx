import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../lib/cn";

export type AlertTone = "info" | "success" | "warning" | "danger";

const toneStyles: Record<AlertTone, { wrapper: string; icon: string; Icon: typeof Info }> = {
  info: { wrapper: "border-info/30 bg-info/10", icon: "text-info", Icon: Info },
  success: { wrapper: "border-success/30 bg-success/10", icon: "text-success", Icon: CheckCircle2 },
  warning: {
    wrapper: "border-warning/30 bg-warning/10",
    icon: "text-warning",
    Icon: AlertTriangle,
  },
  danger: { wrapper: "border-danger/30 bg-danger/10", icon: "text-danger", Icon: XCircle },
};

type AlertProps = {
  tone?: AlertTone;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
};

/** Pesan dalam aplikasi yang selalu menjelaskan apa yang terjadi dan langkah berikutnya. */
export function Alert({ tone = "info", title, children, action, className }: AlertProps) {
  const style = toneStyles[tone];
  const Icon = style.Icon;

  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("flex items-start gap-3 rounded-md border p-4", style.wrapper, className)}
    >
      <Icon aria-hidden="true" className={cn("mt-1 h-5 w-5 shrink-0", style.icon)} />
      <div className="min-w-0 flex-1">
        <p className="text-base font-medium text-text">{title}</p>
        {children ? <div className="mt-1 text-base text-text-muted">{children}</div> : null}
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </div>
  );
}
