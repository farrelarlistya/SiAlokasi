import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "../lib/cn";

export type ToastTone = "success" | "info" | "warning" | "danger";

export type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
  durationMs?: number;
};

type ToastItem = ToastInput & { id: number };

type ToastApi = {
  push: (toast: ToastInput) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const toneStyles: Record<ToastTone, { border: string; icon: string; Icon: typeof Info }> = {
  success: { border: "border-success/40", icon: "text-success", Icon: CheckCircle2 },
  info: { border: "border-info/40", icon: "text-info", Icon: Info },
  warning: { border: "border-warning/40", icon: "text-warning", Icon: AlertTriangle },
  danger: { border: "border-danger/40", icon: "text-danger", Icon: XCircle },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback((toast: ToastInput) => {
    nextId.current += 1;
    const id = nextId.current;
    setItems((current) => [...current, { ...toast, tone: toast.tone ?? "info", id }].slice(-3));
  }, []);

  useEffect(() => {
    for (const item of items) {
      if (!timers.current.has(item.id)) {
        const timer = setTimeout(() => dismiss(item.id), item.durationMs ?? 5_000);
        timers.current.set(item.id, timer);
      }
    }
  }, [items, dismiss]);

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      for (const timer of activeTimers.values()) {
        clearTimeout(timer);
      }
      activeTimers.clear();
    };
  }, []);

  const api = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}

      <div
        className="pointer-events-none fixed inset-x-4 top-4 z-[70] flex flex-col items-end gap-3 sm:left-auto sm:right-6 sm:w-[400px]"
        aria-live="polite"
        aria-atomic="false"
        role="region"
        aria-label="Pemberitahuan"
      >
        {items.map((item) => {
          const tone = toneStyles[item.tone ?? "info"];
          const ToneIcon = tone.Icon;

          return (
            <div
              key={item.id}
              className={cn(
                "toast-enter pointer-events-auto flex w-full items-start gap-3 rounded-none border border-border-strong border-l-2 bg-surface p-4 shadow-none",
                tone.border,
              )}
            >
              <ToneIcon aria-hidden="true" className={cn("mt-0.5 h-5 w-5 shrink-0", tone.icon)} />
              <div className="min-w-0 flex-1">
                <p className="text-base font-medium text-text">{item.title}</p>
                {item.description ? (
                  <p className="mt-1 text-base text-text-muted">{item.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="-mr-2 -mt-2 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-none text-text-muted transition-colors hover:bg-hover hover:text-text"
                aria-label="Tutup pemberitahuan"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("ToastProvider belum dipasang di halaman ini.");
  }
  return context;
}
