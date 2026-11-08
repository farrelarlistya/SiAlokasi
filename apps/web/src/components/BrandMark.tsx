import logoUrl from "../assets/brand/sialokasi-logo.png";
import { cn } from "../lib/cn";

type BrandMarkProps = {
  className?: string;
  /** Isi bila lambang berdiri sendiri tanpa teks "SiAlokasi" di sebelahnya. */
  title?: string;
};

/**
 * Lambang resmi SiAlokasi: pin bantuan di atas lipatan peta, dikelilingi
 * gelombang, api, dan gunung berapi. Berkas berasal dari logo yang diberikan
 * pemilik proyek dan sudah dipotong latar hitamnya.
 */
export function BrandMark({ className, title }: BrandMarkProps) {
  return (
    <img
      src={logoUrl}
      alt={title ?? ""}
      aria-hidden={title ? undefined : true}
      width={256}
      height={256}
      draggable={false}
      className={cn("block select-none", className)}
    />
  );
}
