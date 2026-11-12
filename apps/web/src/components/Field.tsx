import { AlertCircle, ChevronDown } from "lucide-react";
import {
  Children,
  cloneElement,
  isValidElement,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "../lib/cn";

type FieldProps = {
  /** Harus sama dengan `id` kontrol di dalamnya agar label terhubung. */
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
};

/**
 * Membungkus satu kontrol formulir: label di atas, petunjuk, dan pesan kesalahan
 * tepat di bawah kolom. Atribut aksesibilitas disuntikkan ke kontrol anak.
 */
export function Field({ id, label, hint, error, required, children, className }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  let control = children;
  if (isValidElement(children) && Children.count(children) === 1) {
    control = cloneElement(children as ReactElement<Record<string, unknown>>, {
      id,
      "aria-invalid": error ? true : undefined,
      "aria-describedby": describedBy,
    });
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-base font-medium text-text">
        {label}
        {required ? (
          <>
            <span aria-hidden="true" className="ml-1 text-danger">
              *
            </span>
            <span className="sr-only"> wajib diisi</span>
          </>
        ) : null}
      </label>

      {control}

      {hint ? (
        <p id={hintId} className="text-base text-text-muted">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} className="flex items-start gap-2 text-base text-danger">
          <AlertCircle aria-hidden="true" className="mt-1 h-5 w-5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

const controlBase =
  "w-full rounded-none border border-border-strong bg-sunken px-4 text-base text-text placeholder:text-text-disabled transition-colors hover:border-text-muted focus:border-accent focus-visible:outline-none aria-[invalid=true]:border-danger";

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlBase, "min-h-12", className)} {...rest} />;
}

export function SelectInput({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative w-full">
      <select
        className={cn(controlBase, "min-h-12 appearance-none pr-12", className)}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted"
      />
    </div>
  );
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlBase, "min-h-32 py-3", className)} {...rest} />;
}
