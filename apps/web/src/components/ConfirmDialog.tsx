import { AlertTriangle, Info } from "lucide-react";
import { Button } from "./Button";
import { Modal } from "./Modal";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/** Konfirmasi aksi berbahaya dengan konsekuensi yang ditulis jelas. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Lanjutkan",
  cancelLabel = "Batal",
  tone = "danger",
  busy = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      hideCloseButton={busy}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Sedang diproses…" : confirmLabel}
          </Button>
        </>
      }
    >
      <div
        className={
          tone === "danger"
            ? "flex items-start gap-3 rounded-md border border-danger/30 bg-danger/10 p-4"
            : "flex items-start gap-3 rounded-md border border-info/30 bg-info/10 p-4"
        }
      >
        {tone === "danger" ? (
          <AlertTriangle aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-danger" />
        ) : (
          <Info aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-info" />
        )}
        <p className="text-base text-text">
          {tone === "danger"
            ? "Tindakan ini tidak bisa dibatalkan. Pastikan data sudah diperiksa sebelum melanjutkan."
            : "Pastikan data sudah diperiksa. Setelah disimpan, tindakan ini tidak bisa dibatalkan."}
        </p>
      </div>
    </Modal>
  );
}
