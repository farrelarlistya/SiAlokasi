import {
  DISASTER_LABEL,
  formatDateTime,
  formatDistance,
  formatNumber,
} from "@sialokasi/shared";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BarChart3,
  ClipboardCheck,
  FileCheck2,
  MapPinned,
  Package,
  RefreshCw,
  Users,
  Warehouse,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Alert } from "../../components/Alert";
import { Button, buttonStyles } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { PageHeader } from "../../components/PageHeader";
import { Skeleton } from "../../components/Skeleton";
import { StatCard } from "../../components/StatCard";
import { StatusChip } from "../../components/StatusChip";
import { IncidentMarkers } from "../../components/map/IncidentMarkers";
import { MapCanvas } from "../../components/map/MapCanvas";
import { AppShell } from "../../layouts/AppShell";
import { api } from "../../lib/api";
import { useAuth } from "../../auth/AuthProvider";
import { SURABAYA_CENTER } from "@sialokasi/shared";

export function PimpinanDashboardPage() {
  const { user } = useAuth();
  const summary = useQuery({ queryKey: ["pimpinan", "summary"], queryFn: api.pimpinanSummary });
  const incidents = useQuery({ queryKey: ["public", "incidents", "", ""], queryFn: () => api.publicIncidents() });

  const firstName = user?.name.split(" ")[0] ?? "Pimpinan";
  const queue = summary.data?.queue ?? [];
  const activeIncidents = incidents.data?.incidents ?? [];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Dasbor Pimpinan"
        title={`Selamat datang, ${firstName}`}
        description="Lihat gambaran kejadian aktif, antrian keputusan, dan kondisi stok sebelum mengambil keputusan."
        actions={
          <>
            <Link to="/pimpinan/rekap" className={buttonStyles("secondary", "md")}>
              <BarChart3 aria-hidden="true" className="h-5 w-5" />
              Rekap laporan
            </Link>
            <Link to="/stok" className={buttonStyles("secondary", "md")}>
              <Warehouse aria-hidden="true" className="h-5 w-5" />
              Ringkasan stok
            </Link>
            <Link to="/" className={buttonStyles("secondary", "md")}>
              <MapPinned aria-hidden="true" className="h-5 w-5" />
              Peta publik
            </Link>
          </>
        }
      />

      {summary.isError ? (
        <Alert
          tone="danger"
          title="Ringkasan pimpinan belum bisa dimuat."
          className="mt-6"
          action={
            <Button
              variant="secondary"
              leadingIcon={<RefreshCw />}
              onClick={() => void summary.refetch()}
              disabled={summary.isRefetching}
            >
              {summary.isRefetching ? "Sedang mencoba…" : "Coba lagi"}
            </Button>
          }
        >
          Periksa koneksi, lalu tekan Coba lagi. Data yang sudah tercatat tidak berubah.
        </Alert>
      ) : null}

      <section aria-labelledby="ringkasan-pimpinan" className="mt-6">
        <h2 id="ringkasan-pimpinan" className="sr-only">
          Ringkasan keputusan
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Menunggu keputusan"
            value={summary.data?.summary.waitingCount}
            loading={summary.isPending}
            icon={ClipboardCheck}
            tone="warning"
            hint="Laporan yang sudah diajukan petugas."
          />
          <StatCard
            label="Jiwa terdampak"
            value={summary.data?.summary.affectedPeople}
            loading={summary.isPending}
            icon={Users}
            hint="Dari laporan yang masih berjalan."
          />
          <StatCard
            label="Bantuan menunggu"
            value={summary.data?.summary.waitingAidTotal}
            loading={summary.isPending}
            icon={Package}
            tone="info"
            hint="Total baris bantuan pada antrian keputusan."
          />
          <StatCard
            label="Izin terbit hari ini"
            value={summary.data?.summary.permitsToday}
            loading={summary.isPending}
            icon={FileCheck2}
            tone="success"
            hint="Mengikuti waktu layanan aplikasi."
          />
        </div>
      </section>

      {(summary.data?.summary.lowStockCount ?? 0) > 0 ? (
        <Alert
          tone="warning"
          title={`Ada ${formatNumber(summary.data?.summary.lowStockCount ?? 0)} baris stok yang menipis.`}
          className="mt-6"
          action={
            <Link to="/stok" className={buttonStyles("secondary", "md")}>
              Periksa ringkasan stok
            </Link>
          }
        >
          Stok menipis bisa membuat persetujuan ditolak. Pilih posko tujuan dengan cermat atau
          sesuaikan jumlah bantuan sebelum menerbitkan izin.
        </Alert>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="min-w-0 overflow-hidden rounded-lg border border-border bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
            <div>
              <h2 className="text-[22px] font-semibold leading-[30px]">Peta kejadian aktif</h2>
              <p className="mt-1 text-base text-text-muted">
                Radius wilayah terdampak ditampilkan sesuai laporan petugas.
              </p>
            </div>
            <span className="inline-flex min-h-9 items-center rounded-full border border-border bg-elevated px-3 text-base text-text-muted">
              {incidents.isPending ? "Memuat…" : `${formatNumber(activeIncidents.length)} titik`}
            </span>
          </div>

          <div className="h-[340px]">
            {incidents.isPending ? (
              <div className="p-5" aria-busy="true">
                <span className="sr-only">Sedang memuat peta kejadian</span>
                <Skeleton variant="card" className="h-[300px]" />
              </div>
            ) : incidents.isError ? (
              <div className="p-5">
                <Alert tone="danger" title="Peta kejadian belum bisa dimuat.">
                  Periksa koneksi, lalu muat ulang halaman ini.
                </Alert>
              </div>
            ) : (
              <MapCanvas center={SURABAYA_CENTER} zoom={12}>
                <IncidentMarkers incidents={activeIncidents} showRadius />
              </MapCanvas>
            )}
          </div>
        </section>

        <section className="min-w-0 rounded-lg border border-border bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
            <div>
              <h2 className="text-[22px] font-semibold leading-[30px]">Antrian keputusan</h2>
              <p className="mt-1 text-base text-text-muted">
                Laporan yang sudah diajukan dan menunggu tinjauan.
              </p>
            </div>
            <span className="inline-flex min-h-9 items-center rounded-full border border-warning/30 bg-warning/10 px-3 text-base text-warning">
              {summary.isPending ? "Memuat…" : `${formatNumber(queue.length)} menunggu`}
            </span>
          </div>

          <div className="p-5">
            {summary.isPending ? (
              <div className="space-y-3" aria-busy="true">
                <span className="sr-only">Sedang memuat antrian keputusan</span>
                <Skeleton variant="card" className="h-28" />
                <Skeleton variant="card" className="h-28" />
              </div>
            ) : queue.length === 0 ? (
              <EmptyState
                compact
                icon={<ClipboardCheck />}
                title="Belum ada laporan yang menunggu keputusan."
                description="Saat petugas mengajukan laporan, laporan itu muncul di sini lengkap dengan peta dan rincian bantuannya."
                action={
                  <Link to="/" className={buttonStyles("secondary", "md")}>
                    Lihat peta kejadian
                  </Link>
                }
              />
            ) : (
              <ul className="space-y-3">
                {queue.map((incident) => (
                  <li key={incident.id}>
                    <Link
                      to={`/pimpinan/laporan/${incident.id}`}
                      className="block rounded-md border border-border bg-elevated p-4 transition-colors hover:border-accent hover:bg-hover"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-base font-semibold text-text">{incident.title}</p>
                          <p className="mt-1 text-base text-text-muted">
                            {DISASTER_LABEL[incident.disasterType as keyof typeof DISASTER_LABEL] ??
                              incident.disasterType}{" "}
                            · {incident.region?.name ?? "Kecamatan belum diisi"}
                          </p>
                        </div>
                        <StatusChip status={incident.status} />
                      </div>
                      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-text-muted">
                        <span className="font-mono text-info">{incident.code}</span>
                        <span>{formatNumber(incident.affectedPeople)} jiwa</span>
                        <span>Radius {formatDistance(incident.radiusM)}</span>
                      </p>
                      <p className="mt-2 text-base text-text-muted">
                        Diajukan {formatDateTime(incident.occurredAt)} oleh {incident.reporter.name}
                      </p>
                      <span className="mt-3 inline-flex min-h-11 items-center gap-2 text-base font-medium text-info">
                        Tinjau laporan
                        <ArrowRight aria-hidden="true" className="h-5 w-5" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
