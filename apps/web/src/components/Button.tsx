import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outlineDanger";
export type ButtonSize = "md" | "lg" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover",
  secondary: "border border-border bg-elevated text-text hover:bg-hover",
  ghost: "text-text-muted hover:bg-hover hover:text-text",
  danger: "bg-danger text-white hover:brightness-110",
  outlineDanger: "border border-danger/60 text-danger hover:bg-danger/10",
};

const sizes: Record<ButtonSize, string> = {
  md: "min-h-11 px-4 text-base",
  lg: "min-h-12 px-5 text-base",
  icon: "min-h-11 min-w-11 px-0 text-base",
};

export function buttonStyles(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  extra?: string,
): string {
  return cn(base, variants[variant], sizes[size], extra);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  leadingIcon,
  trailingIcon,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={buttonStyles(variant, size, className)} {...rest}>
      {leadingIcon ? <span className="[&>svg]:h-5 [&>svg]:w-5">{leadingIcon}</span> : null}
      {children}
      {trailingIcon ? <span className="[&>svg]:h-5 [&>svg]:w-5">{trailingIcon}</span> : null}
    </button>
  );
}
