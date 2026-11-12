import { cn } from "../lib/cn";

type SkeletonProps = {
  className?: string;
  /** text: satu baris; card: kartu; circle: avatar. */
  variant?: "text" | "card" | "circle";
};

/**
 * Kerangka muat yang mengikuti bentuk konten asli. Selalu disembunyikan dari
 * pembaca layar; halaman menyediakan teks "Sedang memuat" di sampingnya.
 */
export function Skeleton({ className, variant = "text" }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "skeleton",
        variant === "text" && "h-4 w-full rounded-none",
        variant === "card" && "h-32 w-full rounded-none",
        variant === "circle" && "h-11 w-11 rounded-none",
        className,
      )}
    />
  );
}
