import {
  formatDateTime,
  formatRelativeTime,
  NOTIFICATION_KIND_LABEL,
  type NotificationView,
} from "@sialokasi/shared";
import { ChevronRight, FileCheck2, FileText, Gavel, Info } from "lucide-react";
import { cn } from "../lib/cn";

const KIND_STYLE = {
  LAPORAN: { icon: FileText, box: "border-info/30 bg-info/10 text-info" },
  KEPUTUSAN: { icon: Gavel, box: "border-warning/30 bg-warning/10 text-warning" },
  IZIN: { icon: FileCheck2, box: "border-success/30 bg-success/10 text-success" },
  SISTEM: { icon: Info, box: "border-border bg-elevated text-text-muted" },
} as const;

type NotificationItemProps = {
  item: NotificationView;
  onOpen: () => void;
};

/** Satu baris notifikasi; seluruh baris menjadi target sentuh yang besar. */
export function NotificationItem({ item, onOpen }: NotificationItemProps) {
  const style = KIND_STYLE[item.kind] ?? KIND_STYLE.SISTEM;
  const Icon = style.icon;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-full items-start gap-3 border-b border-border px-4 py-4 text-left transition-colors last:border-b-0 hover:bg-hover/60",
        !item.readAt && "bg-accent/5",
      )}
    >
      <span
        aria-hidden="true"
        className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-md border", style.box)}
      >
        <Icon className="h-5 w-5" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-base font-semibold text-text">{item.title}</span>
          {!item.readAt ? (
            <span className="inline-flex min-h-6 items-center rounded-full bg-info/15 px-2 text-base font-medium text-info">
              Baru
            </span>
          ) : null}
        </span>
        <span className="mt-1 block text-base text-text-muted">{item.body}</span>
        <span className="mt-2 flex flex-wrap items-center gap-2 text-base text-text-muted">
          <span>{NOTIFICATION_KIND_LABEL[item.kind] ?? "Informasi"}</span>
          <span aria-hidden="true">·</span>
          <span title={formatDateTime(item.createdAt)}>{formatRelativeTime(item.createdAt)}</span>
        </span>
      </span>

      <ChevronRight aria-hidden="true" className="mt-2 h-5 w-5 shrink-0 text-text-muted" />
    </button>
  );
}
