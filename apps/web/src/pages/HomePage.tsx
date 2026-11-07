import { formatDateTime, formatNumber } from "@sialokasi/shared";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  Calculator,
  ClipboardCheck,
  FileCheck2,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";
import { Button, buttonStyles } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { MapIllustration } from "../components/MapIllustration";
import { Modal } from "../components/Modal";
import { Skeleton } from "../components/Skeleton";
import { api } from "../lib/api";
import { cn } from "../lib/cn";

const FLOW_STEPS = [
  {
    icon: MapPin,
    title: "Tandai lokasi",
    description:
      "Petugas menaruh titik kejadian dan menarik radius wilayah terdampak langsung di peta.",
  },
  {
    icon: Calculator,
    title: "Hitung estimasi",
    description:
      "Delapan faktor lapangan berubah menjadi daftar bantuan, lengkap dengan alasan yang bisa dibaca.",
  },
  {
    icon: ClipboardCheck,
    title: "Putuskan dengan data",
    description:
      "Pimpinan meninjau peta dan rincian, menyesuaikan jumlah bila perlu, lalu menyetujui atau menolak.",
  },
  {
    icon: FileCheck2,
    title: "Terbitkan izin",
    description:
      "Izin distribusi bernomor siap dijalankan di posko dan bisa dilacak warga tanpa membuat akun.",
  },
] as const;

export function HomePage() {
  const [healthOpen, setHealthOpen] = useState(false);

  const summary = useQuery({
    queryKey: ["master-summary"],
    queryFn: api.masterSummary,
  });

  const health = useQuery({
    queryKey: ["health"],
    queryFn: api.health,
    enabled: healthOpen,
    retry: 0,
  });

  const closeHealth = useCallback(() => setHealthOpen(false), []);

  const stats = [
    { label: "Jenis bantuan", value: summary.data?.aidItems },
    { label: "Kecamatan", value: summary.data?.regions },
    { label: "Posko", value: summary.data?.poskos },
    { label: "Laporan aktif", value: summary.data?.incidents },
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader
        actions={
          <Link to="/ui" className={buttonStyles("secondary", "md")}>
            Komponen UI
          </Link>
        }
      />

      <main id="isi-utama" className="flex-1">
        <section className="mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6 lg:pb-16 lg:pt-14">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-base text-text-muted">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-success" />
                Satu ruang kendali untuk keputusan yang cepat
              </p>

              <h1 className="mt-5 text-[28px] font-bold leading-[36px] text-text sm:text-[40px] sm:leading-[48px]">
                Dari laporan lapangan sampai izin distribusi, tanpa berpindah aplikasi.
              </h1>

              <p className="mt-5 max-w-xl text-base text-text-muted">
                SiAlokasi menyatukan peta kejadian, perhitungan kebutuhan bantuan yang bisa
                dijelaskan, dan ruang keputusan pimpinan. Setiap angka punya alasan, setiap
                keputusan meninggalkan jejak.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link to="/ui" className={buttonStyles("primary", "lg")}>
                  Lihat komponen UI
                  <ArrowRight aria-hidden="true" className="h-5 w-5" />
                </Link>
                <Button
                  variant="secondary"
                  size="lg"
                  leadingIcon={<Activity />}
                  onClick={() => setHealthOpen(true)}
                >
                  Cek status layanan
                </Button>
              </div>

              <p className="mt-5 flex items-center gap-2 text-base text-text-muted">
                <Users aria-hidden="true" className="h-5 w-5 shrink-0 text-info" />
                Dirancang untuk petugas lapangan yang bekerja di bawah tekanan waktu.
              </p>
            </div>

            <div className="relative overflow-hidden rounded-lg border border-border bg-surface shadow-panel">
              <div className="map-canvas aspect-[4/3] w-full sm:aspect-[800/520]">
                <MapIllustration />
              </div>

              <div className="p-3 sm:pointer-events-none sm:absolute sm:inset-x-5 sm:bottom-5 sm:p-0">
                <div className="pointer-events-auto rounded-md border border-border bg-surface/95 p-4 shadow-panel backdrop-blur sm:max-w-sm sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-text">Kejadian aktif</p>
                      <p className="text-base text-text-muted">Kota Surabaya</p>
                    </div>
                    <span className="inline-flex min-h-8 items-center rounded-full border border-border bg-elevated px-3 text-base text-text-muted">
                      {summary.isPending ? "…" : `${formatNumber(summary.data?.incidents ?? 0)} laporan`}
                    </span>
                  </div>

                  <div className="mt-3 border-t border-border pt-3">
                    {summary.isPending ? (
                      <div className="space-y-2" aria-busy="true">
                        <span className="sr-only">Sedang memuat data kejadian</span>
                        <Skeleton className="h-4 w-4/5" />
                        <Skeleton className="h-4 w-3/5" />
                      </div>
                    ) : summary.isError ? (
                      <p className="text-base text-text-muted">
                        Data kejadian belum bisa dimuat. Tekan Coba lagi di bawah.
                      </p>
                    ) : (summary.data?.incidents ?? 0) === 0 ? (
                      <p className="flex items-start gap-2 text-base text-text-muted">
                        <ShieldCheck
                          aria-hidden="true"
                          className="mt-1 h-5 w-5 shrink-0 text-success"
                        />
                        Belum ada laporan kejadian. Wilayah Surabaya saat ini aman.
                      </p>
                    ) : (
                      <p className="text-base text-text-muted">
                        {formatNumber(summary.data?.incidents ?? 0)} laporan sedang ditangani.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="ringkasan-data"
          className="border-y border-border bg-surface/40"
        >
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="ringkasan-data" className="text-[22px] font-semibold leading-[30px]">
                  Data master siap dipakai
                </h2>
                <p className="mt-1 text-base text-text-muted">
                  Kondisi awal bersih: belum ada riwayat transaksi.
                </p>
              </div>

              {summary.isError ? (
                <Button
                  variant="secondary"
                  leadingIcon={<RefreshCw />}
                  onClick={() => void summary.refetch()}
                  disabled={summary.isRefetching}
                >
                  {summary.isRefetching ? "Sedang mencoba…" : "Coba lagi"}
                </Button>
              ) : null}
            </div>

            {summary.isError ? (
              <p className="mt-5 rounded-md border border-danger/30 bg-danger/10 p-4 text-base text-text">
                {summary.error instanceof Error
                  ? summary.error.message
                  : "Data master belum bisa dimuat. Coba lagi sebentar."}
              </p>
            ) : (
              <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg border border-border bg-surface p-5 shadow-card"
                  >
                    {summary.isPending ? (
                      <>
                        <span className="sr-only">Sedang memuat {stat.label}</span>
                        <Skeleton className="h-10 w-20" />
                        <Skeleton className="mt-3 h-4 w-24" />
                      </>
                    ) : (
                      <>
                        <dd className="text-[32px] font-bold leading-[40px] text-text sm:text-[40px] sm:leading-[48px]">
                          {formatNumber(stat.value ?? 0)}
                        </dd>
                        <dt className="mt-1 text-base text-text-muted">{stat.label}</dt>
                      </>
                    )}
                  </div>
                ))}
              </dl>
            )}
          </div>
        </section>

        <section aria-labelledby="alur-kerja" className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <h2 id="alur-kerja" className="text-[28px] font-bold leading-[36px]">
            Empat langkah yang dijaga dari awal sampai akhir
          </h2>
          <p className="mt-2 max-w-3xl text-base text-text-muted">
            Setiap langkah punya satu aksi utama, sehingga petugas tidak perlu menebak apa yang
            harus dilakukan berikutnya.
          </p>

          <ol className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {FLOW_STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.title}
                  className="rounded-lg border border-border bg-surface p-5 shadow-card"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-12 w-12 place-items-center rounded-md border border-accent/30 bg-accent/10 text-info">
                      <Icon aria-hidden="true" className="h-6 w-6" />
                    </span>
                    <span className="font-mono text-base font-medium text-text-muted">
                      Langkah {index + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 text-[22px] font-semibold leading-[30px]">{step.title}</h3>
                  <p className="mt-2 text-base text-text-muted">{step.description}</p>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
          <EmptyState
            icon={<MapPin />}
            title="Peta kejadian menunggu laporan pertama"
            description="Saat petugas mengirim laporan, titik kejadian dan radius wilayah terdampak akan muncul di sini untuk semua orang."
            action={
              <Link to="/ui" className={buttonStyles("secondary", "md")}>
                Periksa kesiapan tampilan
              </Link>
            }
          />
        </section>
      </main>

      <footer className="border-t border-border bg-surface/40">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-base text-text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>SiAlokasi — ruang kendali tanggap darurat bencana.</p>
          <p className="flex items-center gap-2">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-success" />
            Wilayah demo: Kota Surabaya
          </p>
        </div>
      </footer>

      <Modal
        open={healthOpen}
        onClose={closeHealth}
        title="Status layanan"
        description="Pemeriksaan singkat apakah data dan waktu layanan siap dipakai."
        footer={
          <Button variant="secondary" onClick={closeHealth}>
            Tutup
          </Button>
        }
      >
        {health.isPending ? (
          <div className="space-y-3" aria-busy="true">
            <span className="sr-only">Sedang memeriksa status layanan</span>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : health.isError ? (
          <div className="space-y-4">
            <p className="text-base text-text">
              {health.error instanceof Error
                ? health.error.message
                : "Status layanan belum bisa diperiksa. Coba lagi sebentar."}
            </p>
            <Button
              variant="secondary"
              leadingIcon={<RefreshCw />}
              onClick={() => void health.refetch()}
              disabled={health.isRefetching}
            >
              {health.isRefetching ? "Sedang mencoba…" : "Coba lagi"}
            </Button>
          </div>
        ) : health.data ? (
          <dl className="divide-y divide-border">
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-base text-text-muted">Layanan</dt>
              <dd
                className={cn(
                  "inline-flex items-center gap-2 text-base font-medium",
                  health.data.ok ? "text-success" : "text-danger",
                )}
              >
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-current" />
                {health.data.ok ? "Tersambung" : "Belum tersambung"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-base text-text-muted">Waktu layanan</dt>
              <dd className="text-base text-text">{formatDateTime(health.data.time)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-base text-text-muted">Penyimpanan data</dt>
              <dd className="text-base text-text">
                {health.data.database === "ok" ? "Normal" : "Perlu diperiksa"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-base text-text-muted">Mode demo</dt>
              <dd className="text-base text-text">
                {health.data.demoMode ? "Aktif" : "Tidak aktif"}
              </dd>
            </div>
          </dl>
        ) : null}
      </Modal>
    </div>
  );
}
