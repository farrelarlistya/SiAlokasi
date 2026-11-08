import { formatDateTime, formatNumber } from "@sialokasi/shared";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ClipboardList,
  Clock3,
  FilePlus2,
  MapPinned,
  RefreshCw,
  Send,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { AppShell } from "../../layouts/AppShell";
import { Alert } from "../../components/Alert";
import { Button, buttonStyles } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { PageHeader } from "../../components/PageHeader";
import { Skeleton } from "../../components/Skeleton";
import { StatCard } from "../../components/StatCard";
import { StatusChip } from "../../components/StatusChip";
import { api } from "../../lib/api";
import { useAuth } from "../../auth/AuthProvider";

export function PetugasDashboardPage() {
  const { user } = useAuth();
  const dashboard = useQuery({ queryKey: ["petugas", "dashboard"], queryFn: api.petugasDashboard });

  const counts = dashboard.data?.counts;
  const firstName = user?.name.split(" ")[0] ?? "Petugas";

  return (
    <AppShell>
      <PageHeader
        eyebrow="Dasbor Petugas"
        title={`Selamat datang, ${firstName}`}
        description="Pantau laporan yang Anda buat dan status terbarunya di satu tempat."
        actions={
          <>
            <Link to="/" className={buttonStyles("secondary", "md")}>
              <MapPinned aria-hidden="true" className="h-5 w-5" />
              Lihat peta publik
            </Link>
            <Link to="/petugas/laporan/baru" className={buttonStyles("primary", "md")}>
              <FilePlus2 aria-hidden="true" className="h-5 w-5" />
              Buat laporan
            </Link>
          </>
        }
      />

      {dashboard.isError ? (
        <Alert
          tone="danger"
          title="Ringkasan laporan belum bisa dimuat."
          className="mt-6"
          action={
            <Button
              variant="secondary"
              leadingIcon={<RefreshCw />}
              onClick={() => void dashboard.refetch()}
              disabled={dashboard.isRefetching}
            >
              {dashboard.isRefetching ? "Sedang mencoba…" : "Coba lagi"}
            </Button>
          }
        >
          Periksa koneksi, lalu tekan Coba lagi. Data lama tidak berubah.
        </Alert>
      ) : null}

      <section aria-labelledby="ringkasan-petugas" className="mt-6">
        <h2 id="ringkasan-petugas" className="sr-only">
          Ringkasan laporan saya
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total laporan saya"
            value={dashboard.data?.total}
            loading={dashboard.isPending}
            icon={ClipboardList}
          />
          <StatCard
            label="Masih draf / baru"
            value={counts?.BARU}
            loading={dashboard.isPending}
            icon={FilePlus2}
            tone="info"
            hint="Masih bisa disunting sebelum diajukan."
          />
          <StatCard
            label="Menunggu persetujuan"
            value={counts?.MENUNGGU_PERSETUJUAN}
            loading={dashboard.isPending}
            icon={Send}
            tone="warning"
            hint="Sudah terkunci dan menunggu keputusan pimpinan."
          />
          <StatCard
            label="Selesai"
            value={counts?.SELESAI}
            loading={dashboard.isPending}
            icon={ShieldCheck}
            tone="success"
            hint="Distribusi sudah dilakukan."
          />
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)]">
        <section aria-labelledby="laporan-terbaru" className="rounded-lg border border-border bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
            <div>
              <h2 id="laporan-terbaru" className="text-[22px] font-semibold leading-[30px]">
                Laporan terbaru
              </h2>
              <p className="mt-1 text-base text-text-muted">Lima laporan terakhir dari akun Anda.</p>
            </div>
            <span className="inline-flex min-h-9 items-center rounded-full border border-border bg-elevated px-3 text-base text-text-muted">
              {dashboard.isPending ? "Memuat…" : `${formatNumber(dashboard.data?.total ?? 0)} total`}
            </span>
          </div>

          <div className="p-5">
            {dashboard.isPending ? (
              <div className="space-y-3" aria-busy="true">
                <span className="sr-only">Sedang memuat laporan terbaru</span>
                <Skeleton variant="card" className="h-24" />
                <Skeleton variant="card" className="h-24" />
              </div>
            ) : (dashboard.data?.recent.length ?? 0) === 0 ? (
              <EmptyState
                compact
                icon={<ClipboardList />}
                title="Belum ada laporan dari akun Anda."
                description="Laporan yang Anda buat akan muncul di sini lengkap dengan status dan waktu kejadiannya."
                action={
                  <Link to="/petugas/laporan/baru" className={buttonStyles("primary", "md")}>
                    <FilePlus2 aria-hidden="true" className="h-5 w-5" />
                    Buat laporan pertama
                  </Link>
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {dashboard.data?.recent.map((incident) => (
                  <li key={incident.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          to={`/petugas/laporan/${incident.id}`}
                          className="inline-flex min-h-11 items-center text-base font-semibold text-text underline-offset-4 hover:text-info hover:underline"
                        >
                          {incident.title}
                        </Link>
                        <p className="mt-1 text-base text-text-muted">
                          {incident.region?.name ?? "Kecamatan belum diisi"} ·{" "}
                          {formatDateTime(incident.occurredAt)}
                        </p>
                      </div>
                      <StatusChip status={incident.status} />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="flex flex-wrap gap-x-4 gap-y-1 text-base text-text-muted">
                        <span className="font-mono text-info">{incident.code}</span>
                        <span>{formatNumber(incident.affectedPeople)} jiwa terdampak</span>
                      </p>
                      <Link
                        to={`/petugas/laporan/${incident.id}`}
                        className="inline-flex min-h-11 items-center gap-2 text-base font-medium text-info underline-offset-4 hover:underline"
                      >
                        Buka laporan
                        <ArrowRight aria-hidden="true" className="h-5 w-5" />
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-lg border border-border bg-surface p-5">
            <h2 className="text-[22px] font-semibold leading-[30px]">Profil tugas</h2>
            <dl className="mt-4 space-y-3 text-base">
              <div>
                <dt className="text-text-muted">Nama</dt>
                <dd className="mt-1 font-medium text-text">{user?.name}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Email</dt>
                <dd className="mt-1 break-all text-text">{user?.email}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Kecamatan</dt>
                <dd className="mt-1 flex items-center gap-2 text-text">
                  <MapPinned aria-hidden="true" className="h-5 w-5 text-info" />
                  {user?.regionName ?? "Belum ditentukan"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border border-border bg-surface p-5">
            <h2 className="flex items-center gap-2 text-[22px] font-semibold leading-[30px]">
              <Clock3 aria-hidden="true" className="h-6 w-6 text-info" />
              Yang terjadi setelah laporan dikirim
            </h2>
            <ol className="mt-3 space-y-3 text-base text-text-muted">
              <li>1. Pimpinan meninjau peta dan rincian bantuan.</li>
              <li>2. Keputusan dan nomor izin tercatat otomatis.</li>
              <li>3. Status terbaru bisa dipantau dari halaman ini.</li>
            </ol>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
