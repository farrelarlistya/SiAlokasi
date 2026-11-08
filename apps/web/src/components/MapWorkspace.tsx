import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { Button } from "./Button";

type MapWorkspaceProps = {
  /** Kunci penyimpanan pilihan buka/tutup, mis. "sialokasi.panel.peta-publik". */
  storageKey: string;
  panelLabel: string;
  panelDescription?: string;
  sidebar: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
};

function readPanelState(storageKey: string, fallback: boolean): boolean {
  try {
    const value = window.localStorage.getItem(storageKey);
    if (value === "open") return true;
    if (value === "closed") return false;
    return fallback;
  } catch {
    return fallback;
  }
}

/**
 * Kanvas peta dengan panel samping yang bisa ditutup.
 *
 * Di layar besar panel berada di kiri dan peta mengisi sisa lebar; di layar
 * kecil panel menjadi lembar bawah. Pilihan buka/tutup diingat per halaman,
 * sehingga peta bisa dilihat lebar tanpa kehilangan isian formulir.
 */
export function MapWorkspace({
  storageKey,
  panelLabel,
  panelDescription,
  sidebar,
  children,
  defaultOpen = true,
  className,
}: MapWorkspaceProps) {
  const [open, setOpen] = useState(() => readPanelState(storageKey, defaultOpen));
  const panelId = useId();
  const closeId = `${panelId}-close`;
  const toggleId = `${panelId}-toggle`;
  const hasMounted = useRef(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, open ? "open" : "closed");
    } catch {
      // Pilihan tetap berlaku selama halaman terbuka.
    }
  }, [open, storageKey]);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    const target = document.getElementById(open ? closeId : toggleId);
    target?.focus();
  }, [open, closeId, toggleId]);

  return (
    <div className={cn("relative flex min-h-0 flex-1 flex-col md:flex-row", className)}>
      <aside
        id={panelId}
        aria-label={panelLabel}
        className={cn(
          "order-2 min-h-0 overflow-hidden border-t border-border bg-surface md:order-1 md:border-r md:border-t-0",
          open
            ? "flex flex-1 flex-col md:w-[360px] md:flex-none lg:w-[420px] xl:w-[440px]"
            : "hidden",
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-2">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-text">{panelLabel}</p>
            {panelDescription ? (
              <p className="truncate text-base text-text-muted">{panelDescription}</p>
            ) : null}
          </div>
          <Button
            id={closeId}
            variant="ghost"
            leadingIcon={<PanelLeftClose />}
            onClick={() => setOpen(false)}
            aria-expanded
            aria-controls={panelId}
            aria-label={`Tutup ${panelLabel}`}
            className="shrink-0 px-2 sm:px-3"
          >
            <span>Tutup</span>
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{sidebar}</div>
      </aside>

      <div
        className={cn(
          "relative order-1 min-h-0 md:order-2 md:flex-1",
          open ? "h-[45%] shrink-0 md:h-auto" : "flex-1",
        )}
      >
        {children}

        {!open ? (
          <Button
            id={toggleId}
            variant="secondary"
            className="absolute left-[72px] top-4 z-[1100] shadow-panel"
            leadingIcon={<PanelLeftOpen />}
            onClick={() => setOpen(true)}
            aria-expanded={false}
            aria-controls={panelId}
          >
            Tampilkan panel
          </Button>
        ) : null}
      </div>
    </div>
  );
}
