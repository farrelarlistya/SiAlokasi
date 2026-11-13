import {
  disasterLabel,
  formatDateTime,
  formatDistance,
  formatNumber,
} from "@sialokasi/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Lock, RefreshCw, Send } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AidIcon } from "../../components/AidIcon";
import { Alert } from "../../components/Alert";
import { Button, buttonStyles } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { PageHeader } from "../../components/PageHeader";
import { Section } from "../../components/Section";
import { Skeleton } from "../../components/Skeleton";
import { StepRail } from "../../components/StepRail";
import { StatusChip } from "../../components/StatusChip";
import { useToast } from "../../components/Toast";
import { IncidentFocusMap } from "../../components/map/IncidentFocusMap";
import { AppShell } from "../../layouts/AppShell";
import { api } from "../../lib/api";

export function SubmitIncidentPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const detail = useQuery({
    queryKey: ["petugas", "incident", id],
    queryFn: () => api.petugasIncident(id),
    enabled: id !== "",
  });

  const incident = detail.data?.data;
  const recommendation = incident?.recommendation ?? null;

  const submit = async () => {
    setBusy(true);
    try {
      const response = await api.submitIncident(id);
      queryClient.setQueryData(["petugas", "incident", id], { data: response.data });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["petugas", "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["petugas", "incidents"] }),
        queryClient.invalidateQueries({ queryKey: ["public", "incidents"] }),
        queryClient.invalidateQueries({ queryKey: ["pimpinan"] }),
      ]);
      toast.push({ tone: "success", title: response.message });
      setConfirmOpen(false);
      navigate(`/petugas/laporan/${id}`, { replace: true });
    } catch (error) {
      toast.push({
        tone: "danger",
        title: "Laporan belum bisa diajukan.",
        description:
          error instanceof Error
            ? error.message
            : "Periksa koneksi, lalu coba lagi.",
      });
    } finally {
      setBusy(false);
    }
  };

  if (detail.isPending) {
    return (
      <AppShell>
        <PageHeader title="Ajukan laporan ke pimpinan" />
        <div className="mt-6 space-y-4" aria-busy="true">
          <span className="sr-only">Sedang memuat ringkasan laporan</span>
          <Skeleton variant="card" className="h-56" />
          <Skeleton variant="card" className="h-80" />
        </div>
      </AppShell>
    );
  }

  if (detail.isError || !incident) {
    return (
      <AppShell>
        <PageHeader title="Ajukan laporan ke pimpinan" />
        <Alert
          tone="danger"
          title="Ringkasan laporan belum bisa dimuat."
          className="mt-6"
          action={
            <Button variant="secondary" leadingIcon={<RefreshCw />} onClick={() => void detail.refetch()}>
              Coba lagi
            </Button>
          }
        >
          Periksa koneksi, lalu tekan Coba lagi.
        </Alert>
      </AppShell>
    );
  }

  if (incident.status !== "DIPERIKSA" || !recommendation) {
    return (
      <AppShell>
        <PageHeader
          eyebrow={`Laporan ${incident.code}`}
          title="Laporan belum siap diajukan"
          actions={
            <Link to={`/petugas/laporan/${incident.id}`} className={buttonStyles("secondary", "md")}>
              <ArrowLeft aria-hidden="true" className="h-5 w-5" />
              Kembali ke laporan
            </Link>
          }
        />
        <Alert tone="warning" title="Laporan ini belum bisa diajukan." className="mt-6">
          {incident.status === "BARU"
            ? "Isi faktor lapangan dan hitung estimasi terlebih dahulu. Setelah itu laporan bisa diajukan ke pimpinan."
            : incident.status === "MENUNGGU_PERSETUJUAN"
              ? "Laporan ini sudah diajukan dan sedang menunggu keputusan pimpinan."
              : "Laporan ini sudah diputuskan atau dibatalkan, sehingga tidak bisa diajukan lagi."}
        </Alert>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow={`Laporan ${incident.code}`}
        title="Ajukan laporan ke pimpinan"
        brief="Periksa rincian bantuan, lalu ajukan ke pimpinan."
        actions={
          <Link to={`/petugas/laporan/${incident.id}`} className={buttonStyles("secondary", "md")}>
            <ArrowLeft aria-hidden="true" className="h-5 w-5" />
            Kembali
          </Link>
        }
      />

      <StepRail
        steps={["Titik & wilayah", "Estimasi", "Ajukan"]}
        current={2}
        className="mt-5"
      />

      <Section
        tone="focus"
        headingId="bantuan-diajukan"
        title="Bantuan yang diajukan"
        brief={`${recommendation.items.length} jenis bantuan · ${formatNumber(
          recommendation.totalPeople,
        )} jiwa terdampak`}
        className="mt-6"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left text-base">
            <caption className="sr-only">Daftar bantuan yang akan diajukan</caption>
            <thead>
              <tr className="border-b border-border text-text-muted">
                <th scope="col" className="px-2 py-3 font-medium">
                  Jenis bantuan
                </th>
                <th scope="col" className="px-2 py-3 text-right font-medium">
                  Jumlah
                </th>
                <th scope="col" className="px-2 py-3 font-medium">
                  Satuan
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recommendation.items.map((item) => (
                <tr key={item.id}>
                  <th scope="row" className="px-2 py-3 text-left font-medium text-text">
                    <span className="flex items-center gap-3">
                      <AidIcon name={item.icon} />
                      <span>{item.name}</span>
                    </span>
                  </th>
                  <td className="px-2 py-3 text-right font-mono text-base text-text">
                    {formatNumber(item.finalQty)}
                  </td>
                  <td className="px-2 py-3 text-text-muted">{item.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Alert tone="warning" title="Setelah diajukan, laporan terkunci." className="mt-5">
          <p className="flex items-start gap-2">
            <Lock aria-hidden="true" className="mt-1 h-5 w-5 shrink-0" />
            <span>
              Petugas tidak bisa mengubah isi laporan setelah diajukan. Pimpinan akan meninjau,
              menyesuaikan jumlah bila perlu, lalu memberi keputusan.
            </span>
          </p>
        </Alert>

        <div className="mt-6 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <Link to={`/petugas/laporan/${incident.id}`} className={buttonStyles("secondary", "lg")}>
            Periksa lagi
          </Link>
          <Button
            size="lg"
            leadingIcon={<Send />}
            onClick={() => setConfirmOpen(true)}
            disabled={busy}
          >
            Ajukan ke pimpinan
          </Button>
        </div>
      </Section>

      <Section title="Lokasi & dampak" className="mt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-medium text-text">{incident.title}</p>
            <p className="mt-1 text-base text-text-muted">
              {disasterLabel(incident.disasterType, incident.disasterDetail)} ·{" "}
              {incident.region?.name ?? "Kecamatan belum diisi"}
            </p>
          </div>
          <StatusChip status={incident.status} />
        </div>

        <div className="mt-4">
          <IncidentFocusMap
            lat={incident.lat}
            lng={incident.lng}
            radiusM={incident.radiusM}
            title={incident.title}
          />
        </div>

        <dl className="mt-4 grid gap-x-6 gap-y-3 text-base sm:grid-cols-2">
          <div className="flex justify-between gap-3">
            <dt className="text-text-muted">Waktu kejadian</dt>
            <dd className="text-right text-text">{formatDateTime(incident.occurredAt)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-text-muted">Jiwa terdampak</dt>
            <dd className="text-right font-mono text-text">
              {incident.affectedPeople === null
                ? "Belum diisi"
                : `${formatNumber(incident.affectedPeople)} jiwa`}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-text-muted">Radius wilayah</dt>
            <dd className="text-right text-text">{formatDistance(incident.radiusM)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-text-muted">Kode lacak</dt>
            <dd className="text-right font-mono text-info">{incident.code}</dd>
          </div>
        </dl>
      </Section>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void submit()}
        busy={busy}
        tone="primary"
        title="Ajukan laporan ini ke pimpinan?"
        description={`Laporan ${incident.code} akan masuk antrian keputusan. Setelah diajukan, isi laporan tidak bisa diubah lagi.`}
        confirmLabel="Ya, ajukan sekarang"
        cancelLabel="Periksa lagi"
      />
    </AppShell>
  );
}
