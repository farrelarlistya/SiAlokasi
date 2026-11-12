import {
  DISASTER_LABEL,
  formatDateTime,
  formatDistance,
  formatNumber,
  SURABAYA_CENTER,
} from "@sialokasi/shared";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ClipboardCheck,
  FileCheck2,
  Package,
  RefreshCw,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Alert } from "../../components/Alert";
import { Button, buttonStyles } from "../../components/Button";
import { PageHeader } from "../../components/PageHeader";
import { Section } from "../../components/Section";
import { Skeleton } from "../../components/Skeleton";
import { StatCard } from "../../components/StatCard";
import { StatusChip } from "../../components/StatusChip";
import { IncidentMarkers } from "../../components/map/IncidentMarkers";
import { MapCanvas } from "../../components/map/MapCanvas";
import { AppShell } from "../../layouts/AppShell";
import { api } from "../../lib/api";

export function PimpinanDashboardPage() {
  const summary = useQuery({ queryKey: ["pimpinan", "summary"], queryFn: api.pimpinanSummary });
  const incidents = useQuery({
    queryKey: ["public", "incidents", "", ""],
    queryFn: () => api.publicIncidents(),
  });

  const queue = summary.data?.queue ?? [];
  const activeIncidents = incidents.data?.incidents ?? [];
  const waitingCount = summary.data?.summary.waitingCount ?? 0;
  const top = queue[0] ?? null;

  return (
    <AppShell>
      <PageHeader title="Dasbor" brief="Tinjau laporan yang menunggu keputusan." />

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

      <Section
        tone="focus"
        headingId="perlu-keputusan"
        title="Perlu keputusan"
        className="mt-6"
      >
        {summary.isPending ? (
          <div className="space-y-3" aria-busy="true">
            <span className="sr-only">Sedang memuat antrian keputusan</span>
            <Skeleton className="h-11 w-32" />
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-11 w-28" />
          </div>
        ) : top ? (
          <div className="grid gap-5">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
              <div>
                <p className="text-figure text-primary">{formatNumber(waitingCount)}</p>
                <p className="text-base text-text-muted">laporan menunggu keputusan</p>
              </div>
              <Link
                to={`/pimpinan/laporan/${top.id}`}
                className={buttonStyles("primary", "lg")}
              >
                Tinjau
                <ArrowRight aria-hidden="true" className="h-5 w-5" />
              </Link>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-base text-text-muted">Laporan teratas</p>
              <p className="mt-1 text-section text-text">{top.title}</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-text-muted">
                <span className="font-mono text-info">{top.code}</span>
                <span>{DISASTER_LABEL[top.disasterType as keyof typeof DISASTER_LABEL] ?? top.disasterType}</span>
                <span>{top.region?.name ?? "Kecamatan belum diisi"}</span>
                <span>{formatNumber(top.affectedPeople)} jiwa</span>
                <span>Radius {formatDistance(top.radiusM)}</span>
              </p>
              <p className="mt-1 text-base text-text-muted">
                Diajukan {formatDateTime(top.occurredAt)} oleh {top.reporter.name}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-focus text-text">Tidak ada laporan menunggu keputusan.</p>
              <p className="mt-1 text-base text-text-muted">
                Peta kejadian aktif tetap bisa dipantau sambil menunggu laporan baru.
              </p>
            </div>
            <Link to="/" className={buttonStyles("primary", "md")}>
              Lihat peta kejadian
            </Link>
          </div>
        )}
      </Section>

      {summary.data && summary.data.summary.lowStockCount > 0 ? (
        <Alert
          tone="warning"
          title={`Ada ${formatNumber(summary.data.summary.lowStockCount)} baris stok yang menipis.`}
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

      <Section title="Ringkasan lain" className="mt-6">
        <div className="grid gap-x-6 gap-y-6 sm:grid-cols-3">
          <StatCard
            label="Jiwa terdampak"
            value={summary.data?.summary.affectedPeople}
            loading={summary.isPending}
            icon={Users}
            size="sm"
          />
          <StatCard
            label="Bantuan menunggu"
            value={summary.data?.summary.waitingAidTotal}
            loading={summary.isPending}
            icon={Package}
            size="sm"
          />
          <StatCard
            label="Izin terbit hari ini"
            value={summary.data?.summary.permitsToday}
            loading={summary.isPending}
            icon={FileCheck2}
            size="sm"
          />
        </div>
      </Section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Section
          title="Peta kejadian aktif"
          actions={
            <span className="font-mono text-base text-text-muted">
              {incidents.isPending ? "Memuat…" : `${formatNumber(activeIncidents.length)} titik`}
            </span>
          }
        >
          <div className="h-[320px]">
            {incidents.isPending ? (
              <div aria-busy="true">
                <span className="sr-only">Sedang memuat peta kejadian</span>
                <Skeleton variant="card" className="h-[300px]" />
              </div>
            ) : incidents.isError ? (
              <Alert tone="danger" title="Peta kejadian belum bisa dimuat.">
                Periksa koneksi, lalu muat ulang halaman ini.
              </Alert>
            ) : (
              <MapCanvas center={SURABAYA_CENTER} zoom={12}>
                <IncidentMarkers incidents={activeIncidents} showRadius />
              </MapCanvas>
            )}
          </div>
        </Section>

        {queue.length > 0 ? (
          <Section title="Antrian keputusan" brief="Laporan yang sudah diajukan, urut terbaru.">
            <ul>
              {queue.map((incident) => (
                <li key={incident.id} className="border-t border-border first:border-t-0">
                  <Link
                    to={`/pimpinan/laporan/${incident.id}`}
                    className="block py-4 transition-colors hover:bg-elevated/50"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <p className="min-w-0 text-base font-semibold text-text">{incident.title}</p>
                      <StatusChip status={incident.status} />
                    </div>
                    <p className="mt-1 text-base text-text-muted">
                      {DISASTER_LABEL[incident.disasterType as keyof typeof DISASTER_LABEL] ??
                        incident.disasterType}
                      , {incident.region?.name ?? "Kecamatan belum diisi"}
                    </p>
                    <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-text-muted">
                      <span className="font-mono text-info">{incident.code}</span>
                      <span>{formatNumber(incident.affectedPeople)} jiwa</span>
                      <span>Radius {formatDistance(incident.radiusM)}</span>
                    </p>
                    <span className="mt-2 inline-flex min-h-11 items-center gap-2 text-base font-medium text-info">
                      Tinjau laporan
                      <ArrowRight aria-hidden="true" className="h-5 w-5" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        ) : (
          <Section title="Antrian keputusan">
            <p className="flex items-start gap-2 text-base text-text-muted">
              <ClipboardCheck aria-hidden="true" className="mt-1 h-5 w-5 shrink-0" />
              Tidak ada laporan di antrian. Blok di atas akan terisi otomatis saat petugas
              mengajukan laporan baru.
            </p>
          </Section>
        )}
      </div>
    </AppShell>
  );
}
