import { ArrowLeft, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BrandMark } from "../../components/BrandMark";
import { MapIllustration } from "../../components/MapIllustration";

type AuthLayoutProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-border bg-surface p-10 lg:flex">
        <div className="relative z-10">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-3 rounded-md text-base font-semibold text-text"
          >
            <BrandMark className="h-11 w-11 shrink-0" />
            SiAlokasi
          </Link>

          <h2 className="mt-10 max-w-lg text-[36px] font-bold leading-[44px]">
            Ruang kendali yang tenang saat lapangan bergerak cepat.
          </h2>
          <p className="mt-4 max-w-md text-base text-text-muted">
            Satu tempat untuk laporan kejadian, perhitungan bantuan, dan keputusan pimpinan.
            Setiap keputusan meninggalkan jejak.
          </p>

          <ul className="mt-8 space-y-4">
            {[
              "Masuk tanpa kata sandi, cukup kode sekali pakai.",
              "Menu menyesuaikan peran: petugas, pimpinan, atau admin.",
              "Data master dikelola tanpa menghapus riwayat laporan.",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-base text-text">
                <ShieldCheck
                  aria-hidden="true"
                  className="mt-1 h-5 w-5 shrink-0 text-success"
                />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="pointer-events-none absolute -bottom-10 -right-16 h-[420px] w-[620px] rotate-[-6deg] rounded-xl border border-border opacity-70">
          <MapIllustration />
        </div>
      </aside>

      <main id="isi-utama" className="flex min-w-0 flex-col bg-canvas">
        <div className="flex min-w-0 items-center justify-between gap-3 px-4 py-4 sm:px-8">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-base text-text-muted transition-colors hover:bg-hover hover:text-text"
          >
            <ArrowLeft aria-hidden="true" className="h-5 w-5" />
            Kembali ke peta
          </Link>
          <span className="inline-flex items-center gap-2 text-base text-text-muted lg:hidden">
            <BrandMark className="h-8 w-8" />
            SiAlokasi
          </span>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-center px-4 pb-10 sm:px-8">
          <div className="w-full max-w-lg rounded-lg border border-border bg-surface p-6 shadow-panel sm:p-8">
            <h1 className="text-[28px] font-bold leading-[36px] text-text">{title}</h1>
            <p className="mt-2 text-base text-text-muted">{description}</p>
            <div className="mt-6">{children}</div>
            {footer ? <div className="mt-6 border-t border-border pt-5">{footer}</div> : null}
          </div>
        </div>
      </main>
    </div>
  );
}
