import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BrandMark } from "../../components/BrandMark";
import { cn } from "../../lib/cn";

type AuthLayoutProps = {
  title: string;
  /** Fakta atau langkah tindakan, maksimal dua baris. */
  brief?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** `plain` dipakai halaman hasil tanpa formulir agar tidak menambah bingkai. */
  tone?: "focus" | "plain";
};

/**
 * Halaman masuk memakai dua kolom: pernyataan merek di kiri, formulir di kanan.
 * Fokus layar adalah formulir; panel merek tetap tenang.
 */
export function AuthLayout({
  title,
  brief,
  children,
  footer,
  tone = "focus",
}: AuthLayoutProps) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="sticky top-0 hidden h-dvh flex-col justify-between self-start border-r border-border bg-canvas p-12 lg:flex">
        <Link to="/" className="inline-flex min-h-11 items-center gap-3 self-start">
          <BrandMark className="h-8 w-8 shrink-0" />
          <span className="text-[20px] font-medium leading-none tracking-[-0.01em] text-text">
            SiAlokasi
          </span>
        </Link>

        <div className="max-w-[520px] py-10">
          <h2 className="text-focus text-text">Dari laporan lapangan ke izin distribusi.</h2>

          <ol aria-label="Alur kerja" className="mt-10 max-w-[440px]">
            {[
              "Catat kejadian dan tandai wilayah terdampak.",
              "Periksa estimasi bantuan dari kondisi lapangan.",
              "Setujui dan terbitkan izin distribusi.",
            ].map((step, index) => (
              <li key={step} className="flex gap-4 border-t border-border py-4">
                <span className="font-mono text-base tabular-nums text-text-muted">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-base text-text">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <p className="text-base text-text-muted">BPBD Kota Surabaya. Data contoh.</p>
      </aside>

      <main id="isi-utama" className="flex min-w-0 flex-col bg-canvas">
        <div className="flex min-w-0 items-center justify-between gap-3 px-4 py-4 sm:px-12">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2 text-base text-text-muted transition-colors hover:text-text"
          >
            <ArrowLeft aria-hidden="true" className="h-5 w-5" />
            Kembali ke peta
          </Link>
          <span className="inline-flex items-center gap-2 text-base text-text-muted lg:hidden">
            <BrandMark className="h-8 w-8" />
            SiAlokasi
          </span>
        </div>

        <div className="flex min-w-0 flex-1 items-start justify-center px-4 pb-12 pt-6 sm:px-12 lg:items-center lg:pt-0">
          <div className="w-full max-w-[480px]">
            <h1 className="text-page text-text">{title}</h1>
            {brief ? (
              <p className="mt-2 max-w-[46ch] text-base text-text-muted">{brief}</p>
            ) : null}
            <div
              className={cn(
                "mt-7",
                tone === "focus" ? "focus-rule bg-surface p-5 sm:p-6" : undefined,
              )}
            >
              {children}
            </div>
            {footer ? <div className="mt-7 border-t border-border pt-5">{footer}</div> : null}
          </div>
        </div>
      </main>
    </div>
  );
}
