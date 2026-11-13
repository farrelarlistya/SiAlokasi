import { X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/cn";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
  hideCloseButton?: boolean;
};

/**
 * Kotak dialog di dalam aplikasi: fokus terperangkap, Escape menutup,
 * dan fokus kembali ke tombol pemicu setelah ditutup.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  hideCloseButton = false,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  // `onClose` sering berupa fungsi baru setiap render (mis. panah inline di
  // pemanggil). Menyimpannya di ref membuat handler tetap stabil sehingga efek
  // di bawah tidak jalan ulang — kalau tidak, fokus input di dalam dialog
  // terlempar kembali ke elemen pertama setiap kali pengguna mengetik.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) => element.offsetParent !== null,
      );

      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [],
  );

  useEffect(() => {
    if (!open) return;

    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const panel = panelRef.current;
    const initial = panel?.querySelector<HTMLElement>("[data-autofocus]");
    if (initial) {
      initial.focus();
    } else {
      panel?.focus();
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus();
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return createPortal(
    <div
      className="overlay-enter fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-canvas/85 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          "panel-enter my-auto w-full rounded-none border border-border-strong bg-surface p-6 shadow-none",
          size === "lg" ? "max-w-2xl" : "max-w-lg",
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-focus text-text">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-2 text-base text-text-muted">
                {description}
              </p>
            ) : null}
          </div>

          {hideCloseButton ? null : (
            <button
              type="button"
              onClick={onClose}
              className="-mr-2 -mt-2 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-none text-text-muted transition-colors hover:bg-hover hover:text-text"
              aria-label="Tutup dialog"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          )}
        </div>

        {children ? <div className="mt-5">{children}</div> : null}

        {footer ? (
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
