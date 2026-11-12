import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "../lib/cn";
import { Button } from "./Button";

type MapWorkspaceProps = {
  /** Kunci penyimpanan pilihan buka/tutup, mis. "sialokasi.panel.peta-publik". */
  storageKey: string;
  panelLabel: string;
  sidebar: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
};

const MIN_PANEL_WIDTH = 340;
const MAX_PANEL_WIDTH = 640;
const DEFAULT_PANEL_WIDTH = 420;

function clampWidth(value: number, max = MAX_PANEL_WIDTH): number {
  return Math.min(max, Math.max(MIN_PANEL_WIDTH, Math.round(value)));
}

function viewportMaxWidth(): number {
  return Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, window.innerWidth - 360));
}

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

function readPanelWidth(storageKey: string): number {
  try {
    const value = Number(window.localStorage.getItem(`${storageKey}.width`));
    if (Number.isFinite(value) && value > 0) return clampWidth(value, viewportMaxWidth());
  } catch {
    // Pakai lebar bawaan.
  }
  return clampWidth(DEFAULT_PANEL_WIDTH, viewportMaxWidth());
}

/**
 * Kanvas peta dengan panel samping yang bisa ditutup dan diatur lebarnya.
 *
 * Di layar besar panel berada di kiri dan dapat digeser (pointer atau tombol
 * panah saat fokus di pegangan). Di layar kecil panel menjadi lembar bawah;
 * lebar panel tidak berlaku. Pilihan buka/tutup dan lebar diingat per halaman.
 */
export function MapWorkspace({
  storageKey,
  panelLabel,
  sidebar,
  children,
  defaultOpen = true,
  className,
}: MapWorkspaceProps) {
  const [open, setOpen] = useState(() => readPanelState(storageKey, defaultOpen));
  const [width, setWidth] = useState(() => readPanelWidth(storageKey));
  const panelId = useId();
  const closeId = `${panelId}-close`;
  const toggleId = `${panelId}-toggle`;
  const hasMounted = useRef(false);
  const dragState = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, open ? "open" : "closed");
    } catch {
      // Pilihan tetap berlaku selama halaman terbuka.
    }
  }, [open, storageKey]);

  useEffect(() => {
    const onResize = () => setWidth((current) => clampWidth(current, viewportMaxWidth()));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    const target = document.getElementById(open ? closeId : toggleId);
    target?.focus();
  }, [open, closeId, toggleId]);

  const persistWidth = (value: number) => {
    try {
      window.localStorage.setItem(`${storageKey}.width`, String(value));
    } catch {
      // Lebar tetap berlaku selama halaman terbuka.
    }
  };

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (window.matchMedia("(max-width: 767px)").matches) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = { startX: event.clientX, startWidth: width };
  };

  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragState.current) return;
    const next = clampWidth(
      dragState.current.startWidth + (event.clientX - dragState.current.startX),
      viewportMaxWidth(),
    );
    setWidth(next);
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = dragState.current;
    if (!state) return;
    dragState.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer sudah lepas.
    }
    const finalWidth = clampWidth(
      state.startWidth + (event.clientX - state.startX),
      viewportMaxWidth(),
    );
    setWidth(finalWidth);
    persistWidth(finalWidth);
  };

  const onHandleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    let next: number | null = null;
    if (event.key === "ArrowLeft") next = clampWidth(width - 16, viewportMaxWidth());
    if (event.key === "ArrowRight") next = clampWidth(width + 16, viewportMaxWidth());
    if (event.key === "Home") next = clampWidth(DEFAULT_PANEL_WIDTH, viewportMaxWidth());
    if (event.key === "End") next = viewportMaxWidth();

    if (next !== null) {
      event.preventDefault();
      setWidth(next);
      persistWidth(next);
    }
  };

  return (
    <div className={cn("relative flex min-h-0 flex-1 flex-col md:flex-row", className)}>
      <aside
        id={panelId}
        aria-label={panelLabel}
        style={{ "--panel-width": `${width}px` } as CSSProperties}
        className={cn(
          "relative order-2 min-h-0 overflow-hidden border-t border-border bg-surface md:order-1 md:border-r md:border-t-0",
          open
            ? "flex flex-1 flex-col md:w-[var(--panel-width)] md:flex-none"
            : "hidden",
        )}
      >
        <div className="flex shrink-0 items-center justify-end border-b border-border px-4 py-1">
          <Button
            id={closeId}
            variant="ghost"
            leadingIcon={<PanelLeftClose />}
            onClick={() => setOpen(false)}
            aria-expanded
            aria-controls={panelId}
            aria-label={`Tutup ${panelLabel}`}
            className="shrink-0 px-2"
          >
            <span>Tutup</span>
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{sidebar}</div>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Atur lebar panel"
          aria-valuemin={MIN_PANEL_WIDTH}
          aria-valuemax={MAX_PANEL_WIDTH}
          aria-valuenow={width}
          tabIndex={0}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onDoubleClick={() => {
            const next = clampWidth(DEFAULT_PANEL_WIDTH, viewportMaxWidth());
            setWidth(next);
            persistWidth(next);
          }}
          onKeyDown={onHandleKeyDown}
          title="Geser untuk mengatur lebar. Klik dua kali untuk lebar bawaan."
          className="group absolute inset-y-0 right-0 z-20 hidden w-3 cursor-col-resize touch-none select-none md:block"
        >
          <span className="absolute inset-y-0 right-0 w-px bg-border transition-colors group-hover:bg-accent group-focus-visible:bg-accent" />
          <span className="absolute right-0 top-1/2 h-11 w-0.5 -translate-y-1/2 bg-border-strong transition-colors group-hover:bg-accent group-focus-visible:bg-accent" />
        </div>
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
            className="absolute left-[72px] top-4 z-[1100] border-border-strong"
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
