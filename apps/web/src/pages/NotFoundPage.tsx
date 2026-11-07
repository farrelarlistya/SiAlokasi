import { Compass } from "lucide-react";
import { Link } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";
import { buttonStyles } from "../components/Button";
import { EmptyState } from "../components/EmptyState";

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />

      <main id="isi-utama" className="mx-auto flex w-full max-w-3xl flex-1 items-center px-4 py-12 sm:px-6">
        <div className="w-full">
          <EmptyState
            icon={<Compass />}
            title="Halaman tidak ditemukan."
            description="Alamat yang dibuka mungkin sudah berubah. Kembali ke beranda untuk melanjutkan."
            action={
              <Link to="/" className={buttonStyles("primary", "md")}>
                Kembali ke beranda
              </Link>
            }
          />
        </div>
      </main>
    </div>
  );
}
