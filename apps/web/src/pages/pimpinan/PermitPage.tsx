import {
  compareStock,
  DISASTER_LABEL,
  formatDate,
  formatDateTime,
  formatNumber,
} from "@sialokasi/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Printer, RefreshCw, Stamp } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Alert } from "../../components/Alert";
import { Button, buttonStyles } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { EmptyState } from "../../components/EmptyState";
import { PageHeader } from "../../components/PageHeader";
import { Skeleton } from "../../components/Skeleton";
import { StatusChip } from "../../components/StatusChip";
import { useToast } from "../../components/Toast";
import { AppShell } from "../../layouts/AppShell";
import { api } from "../../lib/api";

const PERMIT_STATUS_LABEL: Record<string, string> = {
  TERBIT: "Terbit",
  DICETAK: "Sudah dicetak",
  SELESAI: "Selesai",
  DIBATALKAN: "Dibatalkan",
};

export function PermitPage() {
  const { id = "" } = useParams();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const detail = useQuery({
    queryKey: ["pimpinan", "incident", id],
    queryFn: () => api.pimpinanIncident(id),
    enabled: id !== "",
  });

  const incident = detail.data?.data;
  const permit = incident?.permit ?? null;
  const posko = incident?.poskos.find((item) => item.id === permit?.posko.id) ?? null;

  const shortages = useMemo(() => {
    if (!permit || !posko) return [];
    return compareStock(
      permit.items.map((item) => ({ aidItemId: item.aidItemId, qty: item.qty })),
      posko.stocks,
    ).filter((row) => row.shortage > 0);
  }, [permit, posko]);

  const complete = async () => {
    setBusy(true);
    try {
      const response = await api.completeIncident(id);
      queryClient.setQueryData(["pimpinan", "incident", id], { data: response.data });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pimpinan", "summary"] }),
        queryClient.invalidateQueries({ queryKey: ["public", "incidents"] }),
        queryClient.invalidateQueries({ queryKey: ["petugas", "dashboard"] }),
      ]);
      toast.push({ tone: "success", title: response.message });
      setConfirmCompleteOpen(false);
    } catch (error) {
      toast.push({
        tone: "danger",
        title: "Distribusi belum bisa ditandai selesai.",
        description:
          error instanceof Error ? error.message : "Periksa koneksi, lalu coba lagi.",
      });
      setConfirmCompleteOpen(false);
    } finally {
      setBusy(false);
    }
  };

  if (detail.isPending) {
    return (
      <AppShell>
        <PageHeader eyebrow="Izin distribusi" title="Memuat dokumen izin" />
        <div className="mt-6 space-y-4" aria-busy="true">
          <span className="sr-only">Sedang memuat izin distribusi</span>
          <Skeleton variant="card" className="h-16" />
          <Skeleton variant="card" className="mx-auto h-[560px] max-w-[760px]" />
        </div>
      </AppShell>
    );
  }

  if (detail.isError || !incident) {
    return (
      <AppShell>
        <PageHeader eyebrow="Izin distribusi" title="Dokumen izin" />
        <Alert
          tone="danger"
          title="Dokumen izin belum bisa dimuat."
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

  if (!permit) {
    return (
      <AppShell>
        <PageHeader
          eyebrow={`Laporan ${incident.code}`}
          title="Izin distribusi belum terbit"
          actions={
            <Link to="/pimpinan" className={buttonStyles("secondary", "md")}>
              <ArrowLeft aria-hidden="true" className="h-5 w-5" />
              Kembali ke antrian
            </Link>
          }
        />
        <EmptyState
          className="mt-6"
          icon={<Stamp />}
          title="Izin distribusi belum tersedia."
          description="Izin hanya terbit setelah pimpinan menyetujui laporan. Buka antrian untuk meninjau laporan yang masih menunggu keputusan."
          action={
            <Link to="/pimpinan" className={buttonStyles("primary", "md")}>
              Buka antrian keputusan
            </Link>
          }
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="print-hidden">
        <PageHeader
          eyebrow={`Laporan ${incident.code}`}
          title="Izin distribusi bantuan"
          description="Dokumen ini menjadi dasar pengambilan bantuan di posko tujuan. Periksa nomor izin dan daftar bantuan sebelum dicetak."
          actions={
            <>
              <Link to="/pimpinan" className={buttonStyles("secondary", "md")}>
                <ArrowLeft aria-hidden="true" className="h-5 w-5" />
                Antrian
              </Link>
              <Button
                variant="secondary"
                leadingIcon={<Printer />}
                onClick={() => window.print()}
              >
                Cetak
              </Button>
              {incident.status === "DISETUJUI" ? (
                <Button leadingIcon={<CheckCircle2 />} onClick={() => setConfirmCompleteOpen(true)}>
                  Tandai distribusi selesai
                </Button>
              ) : null}
            </>
          }
        />

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <StatusChip status={incident.status} />
          <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border bg-elevated px-3 text-base text-text-muted">
            <Stamp aria-hidden="true" className="h-5 w-5" />
            {PERMIT_STATUS_LABEL[permit.status] ?? permit.status}
          </span>
        </div>

        {incident.status === "SELESAI" ? (
          <Alert tone="success" title="Distribusi sudah ditandai selesai." className="mt-4">
            Laporan ini ditutup. Dokumen izin tetap tersimpan dan bisa dicetak ulang.
          </Alert>
        ) : null}

        {shortages.length > 0 ? (
          <Alert
            tone="warning"
            title={`Stok di ${permit.posko.name} kurang untuk ${shortages.length} jenis bantuan.`}
            className="mt-4"
          >
            <p>
              Izin tetap berlaku, tetapi koordinasikan dengan posko tujuan sebelum pengambilan
              bantuan. Kekurangan yang tercatat:
            </p>
            <ul className="mt-2 space-y-1">
              {shortages.map((row) => {
                const item = permit.items.find((permitItem) => permitItem.aidItemId === row.aidItemId);
                return (
                  <li key={row.aidItemId}>
                    {item?.name ?? "Bantuan"}: kurang {formatNumber(row.shortage)} {item?.unit ?? ""}
                  </li>
                );
              })}
            </ul>
          </Alert>
        ) : null}
      </div>

      <article className="print-document mx-auto mt-6 w-full max-w-[760px] rounded-lg p-6 shadow-panel sm:p-10">
        <header className="flex flex-col gap-4 border-b-2 border-paper-border pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-base font-semibold text-ink-muted">SiAlokasi</p>
            <h1 className="mt-1 text-[28px] font-bold leading-[36px] text-ink">
              Izin Distribusi Bantuan
            </h1>
            <p className="mt-2 text-base text-ink-muted">
              Ruang kendali darurat bencana Kota Surabaya
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-base text-ink-muted">Nomor izin</p>
            <p className="font-mono text-[22px] font-semibold leading-[30px] text-ink">
              {permit.number}
            </p>
          </div>
        </header>

        <dl className="mt-6 grid gap-4 text-base sm:grid-cols-2">
          <div>
            <dt className="text-ink-muted">Tanggal terbit</dt>
            <dd className="mt-1 font-medium text-ink">{formatDateTime(permit.issuedAt)}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Berlaku sampai</dt>
            <dd className="mt-1 font-medium text-ink">
              {permit.validUntil ? formatDate(permit.validUntil) : "Tidak dibatasi"}
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted">Posko tujuan</dt>
            <dd className="mt-1 font-medium text-ink">
              {permit.posko.name} · {permit.posko.regionName}
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted">Status izin</dt>
            <dd className="mt-1 font-medium text-ink">
              {PERMIT_STATUS_LABEL[permit.status] ?? permit.status}
            </dd>
          </div>
        </dl>

        <section className="mt-6 border-t border-paper-border pt-5">
          <h2 className="text-[22px] font-semibold leading-[30px] text-ink">Ringkasan kejadian</h2>
          <dl className="mt-3 grid gap-3 text-base sm:grid-cols-2">
            <div>
              <dt className="text-ink-muted">Kode lacak</dt>
              <dd className="mt-1 font-mono font-medium text-ink">{incident.code}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Jenis bencana</dt>
              <dd className="mt-1 font-medium text-ink">
                {DISASTER_LABEL[incident.disasterType]}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-ink-muted">Judul laporan</dt>
              <dd className="mt-1 font-medium text-ink">{incident.title}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Waktu kejadian</dt>
              <dd className="mt-1 font-medium text-ink">{formatDateTime(incident.occurredAt)}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Jiwa terdampak</dt>
              <dd className="mt-1 font-medium text-ink">
                {incident.affectedPeople === null
                  ? "Belum diisi"
                  : `${formatNumber(incident.affectedPeople)} jiwa`}
              </dd>
            </div>
          </dl>
        </section>

        <section className="mt-6 border-t border-paper-border pt-5">
          <h2 className="text-[22px] font-semibold leading-[30px] text-ink">Daftar bantuan</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left text-base">
              <caption className="sr-only">Daftar bantuan pada izin distribusi</caption>
              <thead>
                <tr className="border-b border-paper-border text-ink-muted">
                  <th scope="col" className="px-2 py-2 font-medium">No</th>
                  <th scope="col" className="px-2 py-2 font-medium">Jenis bantuan</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">Jumlah</th>
                  <th scope="col" className="px-2 py-2 font-medium">Satuan</th>
                  <th scope="col" className="px-2 py-2 font-medium">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-border">
                {permit.items.map((item, index) => (
                  <tr key={item.id} className="align-top">
                    <td className="px-2 py-3 text-ink-muted">{index + 1}</td>
                    <th scope="row" className="px-2 py-3 text-left font-medium text-ink">
                      {item.name}
                    </th>
                    <td className="px-2 py-3 text-right font-semibold text-ink">
                      {formatNumber(item.qty)}
                    </td>
                    <td className="px-2 py-3 text-ink-muted">{item.unit}</td>
                    <td className="px-2 py-3 text-ink-muted">{item.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {shortages.length > 0 ? (
            <div className="mt-4 rounded-md border border-warning/50 bg-warning/10 p-3 text-base text-ink">
              <p className="font-medium">Catatan stok</p>
              <p className="mt-1">
                Sebagian bantuan belum mencukupi di posko tujuan. Koordinasikan dengan petugas posko
                sebelum pengambilan.
              </p>
            </div>
          ) : null}
        </section>

        <footer className="mt-10 flex flex-col gap-8 border-t border-paper-border pt-6 text-base sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-ink-muted">Diterbitkan oleh</p>
            <p className="mt-8 font-semibold text-ink">{permit.issuedBy.name}</p>
            <p className="text-ink-muted">Pimpinan</p>
          </div>
          <div className="sm:text-right">
            <p className="text-ink-muted">Tanggal terbit</p>
            <p className="mt-1 font-medium text-ink">{formatDateTime(permit.issuedAt)}</p>
          </div>
        </footer>

        <p className="mt-6 border-t border-paper-border pt-4 text-base text-ink-muted">
          Dokumen ini dihasilkan oleh SiAlokasi. Periksa nomor izin sebelum menyerahkan bantuan.
        </p>
      </article>

      <ConfirmDialog
        open={confirmCompleteOpen}
        onClose={() => setConfirmCompleteOpen(false)}
        onConfirm={() => void complete()}
        busy={busy}
        tone="primary"
        title="Tandai distribusi selesai?"
        description="Status laporan akan menjadi Selesai dan laporan ditutup. Dokumen izin tetap tersimpan dan bisa dicetak ulang."
        confirmLabel="Ya, tandai selesai"
        cancelLabel="Belum"
      />
    </AppShell>
  );
}
