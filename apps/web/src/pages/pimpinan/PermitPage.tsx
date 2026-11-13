import {
  compareStock,
  disasterLabel,
  formatDate,
  formatDateTime,
  formatNumber,
} from "@sialokasi/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRightLeft,
  CheckCircle2,
  History,
  Pencil,
  Printer,
  RefreshCw,
  Stamp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Alert } from "../../components/Alert";
import { Button, buttonStyles } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { EmptyState } from "../../components/EmptyState";
import { Field, SelectInput, Textarea, TextInput } from "../../components/Field";
import { Modal } from "../../components/Modal";
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
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionPoskoId, setCorrectionPoskoId] = useState("");
  const [correctionQty, setCorrectionQty] = useState<Record<string, string>>({});
  const [correctionError, setCorrectionError] = useState<string | undefined>();
  const [correctionBusy, setCorrectionBusy] = useState(false);

  const detail = useQuery({
    queryKey: ["pimpinan", "incident", id],
    queryFn: () => api.pimpinanIncident(id),
    enabled: id !== "",
  });

  const incident = detail.data?.data;
  const permit = incident?.permit ?? null;

  const correctionPosko = incident?.poskos.find((item) => item.id === correctionPoskoId) ?? null;
  const correctionNeeds = useMemo(() => {
    if (!permit) return [];
    return permit.items.map((item) => ({
      aidItemId: item.aidItemId,
      qty: Number(correctionQty[item.aidItemId] ?? item.qty),
    }));
  }, [permit, correctionQty]);
  const correctionShortages = useMemo(() => {
    if (!correctionPosko) return [];
    return compareStock(correctionNeeds, correctionPosko.stocks).filter(
      (row) => row.shortage > 0,
    );
  }, [correctionNeeds, correctionPosko]);

  const canCorrect =
    incident !== undefined &&
    (incident.status === "DISETUJUI" || incident.status === "SELESAI") &&
    permit !== null &&
    permit.supersededAt === null;

  const openCorrection = () => {
    if (!permit || !incident) return;
    setCorrectionReason("");
    setCorrectionPoskoId(permit.posko.id);
    setCorrectionQty(
      Object.fromEntries(permit.items.map((item) => [item.aidItemId, String(item.qty)])),
    );
    setCorrectionError(undefined);
    setCorrectionOpen(true);
  };

  const saveCorrection = async () => {
    setCorrectionError(undefined);
    if (!permit) return;

    if (correctionReason.trim().length < 5) {
      setCorrectionError("Tulis alasan koreksi minimal 5 karakter agar perubahannya bisa dipahami.");
      return;
    }
    if (!correctionPoskoId) {
      setCorrectionError("Pilih posko tujuan untuk izin koreksi.");
      return;
    }

    const items: { aidItemId: string; qty: number }[] = [];
    for (const item of permit.items) {
      const raw = correctionQty[item.aidItemId] ?? String(item.qty);
      if (raw.trim() === "") {
        setCorrectionError(`Jumlah ${item.name} belum diisi. Isi 0 bila bantuan tidak diperlukan.`);
        return;
      }
      const qty = Number(raw);
      if (!Number.isInteger(qty) || qty < 0) {
        setCorrectionError(
          `Jumlah ${item.name} harus bilangan bulat 0 atau lebih. Periksa kembali isian tersebut.`,
        );
        return;
      }
      items.push({ aidItemId: item.aidItemId, qty });
    }

    setCorrectionBusy(true);
    try {
      const response = await api.correctIncidentPermit(id, {
        reason: correctionReason.trim(),
        poskoId: correctionPoskoId,
        items,
      });
      queryClient.setQueryData(["pimpinan", "incident", id], { data: response.data });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pimpinan", "summary"] }),
        queryClient.invalidateQueries({ queryKey: ["stock"] }),
        queryClient.invalidateQueries({ queryKey: ["public", "incidents"] }),
      ]);
      toast.push({ tone: "success", title: response.message });
      setCorrectionOpen(false);
    } catch (error) {
      setCorrectionError(
        error instanceof Error
          ? error.message
          : "Koreksi belum bisa disimpan. Periksa koneksi, lalu coba lagi.",
      );
    } finally {
      setCorrectionBusy(false);
    }
  };

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
        <PageHeader title="Memuat dokumen izin" />
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
        <PageHeader title="Dokumen izin" />
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
          brief="Periksa dokumen, lalu cetak atau tandai selesai."
          actions={
            <>
              <Button
                variant="secondary"
                leadingIcon={<Printer />}
                onClick={() => window.print()}
              >
                Cetak
              </Button>
              {canCorrect ? (
                <Button
                  variant="secondary"
                  leadingIcon={<Pencil />}
                  onClick={openCorrection}
                  disabled={correctionBusy}
                >
                  Koreksi izin
                </Button>
              ) : null}
            </>
          }
        />

        <section
          aria-labelledby="pita-izin"
          className="focus-rule mt-6 flex flex-wrap items-center justify-between gap-4 bg-surface p-5"
        >
          <div className="min-w-0">
            <p className="text-base text-text-muted">Nomor izin</p>
            <h2 id="pita-izin" tabIndex={-1} className="text-focus font-mono text-text">
              {permit.number}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <StatusChip status={incident.status} />
              <span className="inline-flex min-h-9 items-center gap-2 border border-border px-3 text-base text-text-muted">
                <Stamp aria-hidden="true" className="h-5 w-5" />
                {PERMIT_STATUS_LABEL[permit.status] ?? permit.status}
              </span>
            </div>
          </div>

          {incident.status === "DISETUJUI" ? (
            <Button size="lg" leadingIcon={<CheckCircle2 />} onClick={() => setConfirmCompleteOpen(true)}>
              Tandai distribusi selesai
            </Button>
          ) : (
            <p className="max-w-[34ch] text-base text-text-muted">
              {incident.status === "SELESAI"
                ? "Distribusi sudah selesai. Dokumen tetap bisa dicetak ulang."
                : "Izin ini sudah tidak aktif. Periksa catatan di bawah dokumen."}
            </p>
          )}
        </section>

        {incident.status === "SELESAI" ? (
          <Alert tone="success" title="Distribusi sudah ditandai selesai." className="mt-4">
            Laporan ini ditutup. Dokumen izin tetap tersimpan dan bisa dicetak ulang.
          </Alert>
        ) : null}

        {permit.supersededAt ? (
          <Alert
            tone="warning"
            title={`Izin ini sudah digantikan oleh ${permit.supersededByNumber ?? "izin koreksi"}.`}
            className="mt-4"
          >
            Dokumen ini tetap tersimpan sebagai riwayat. Gunakan izin terbaru untuk pengambilan
            bantuan.
          </Alert>
        ) : permit.replacesNumber ? (
          <Alert
            tone="info"
            title={`Izin ini menggantikan ${permit.replacesNumber}.`}
            className="mt-4"
          >
            Stok posko lama sudah dikembalikan, lalu stok posko tujuan baru diambil sesuai daftar
            pada dokumen ini.
          </Alert>
        ) : (
          <Alert tone="info" title="Stok sudah diambil saat izin terbit." className="mt-4">
            Sisa stok posko tujuan bisa dilihat di halaman Ringkasan stok. Koreksi jumlah atau posko
            dilakukan lewat tombol Koreksi izin, bukan dengan mengubah dokumen ini.
          </Alert>
        )}
      </div>

      <article className="print-document mx-auto mt-6 w-full max-w-[760px] rounded-lg p-6 shadow-panel sm:p-10">
        <header className="flex flex-col gap-4 border-b-2 border-paper-border pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-base font-semibold text-ink-muted">SiAlokasi</p>
            <h1 className="mt-1 text-[28px] font-bold leading-[36px] text-ink">
              Izin Distribusi Bantuan
            </h1>
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
              {permit.posko.name}, {permit.posko.regionName}
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted">Status izin</dt>
            <dd className="mt-1 font-medium text-ink">
              {PERMIT_STATUS_LABEL[permit.status] ?? permit.status}
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted">Jenis dokumen</dt>
            <dd className="mt-1 font-medium text-ink">
              {permit.replacesNumber ? "Izin koreksi" : "Izin pertama"}
            </dd>
          </div>
          {permit.replacesNumber ? (
            <div>
              <dt className="text-ink-muted">Menggantikan izin</dt>
              <dd className="mt-1 font-mono font-medium text-ink">{permit.replacesNumber}</dd>
            </div>
          ) : null}
        </dl>

        {permit.replacesNumber ? (
          <p className="mt-5 border border-paper-border px-4 py-3 text-base text-ink">
            Dokumen ini menggantikan izin {permit.replacesNumber}. Izin lama tetap tersimpan sebagai
            riwayat dan tidak berlaku lagi untuk pengambilan bantuan.
            {incident.corrections[0] ? (
              <span className="mt-1 block">Alasan koreksi: {incident.corrections[0].reason}</span>
            ) : null}
          </p>
        ) : null}

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
                {disasterLabel(incident.disasterType, incident.disasterDetail)}
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
                  <th scope="col" className="print-optional px-2 py-2 font-medium">
                    Catatan
                  </th>
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
                    <td className="print-optional px-2 py-3 text-ink-muted">
                      {item.reason ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

      {incident.corrections.length > 0 ? (
        <section className="print-hidden mx-auto mt-6 w-full max-w-[760px] border-t border-border pt-5">
          <h2 className="flex items-center gap-2 text-[22px] font-semibold leading-[30px]">
            <History aria-hidden="true" className="h-6 w-6 text-info" />
            Riwayat koreksi izin
          </h2>
          <p className="mt-1 text-base text-text-muted">
            Izin lama tidak dihapus. Setiap koreksi menyimpan alasan, pelaku, dan perubahan
            jumlahnya.
          </p>
          <ul className="mt-4 divide-y divide-border">
            {incident.corrections.map((correction) => (
              <li key={correction.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-base text-text">
                    <span className="font-semibold">{correction.actorName}</span> mengoreksi{" "}
                    <span className="font-mono text-info">{correction.previousPermitNumber}</span>{" "}
                    menjadi{" "}
                    <span className="font-mono text-info">{correction.newPermitNumber}</span>.
                  </p>
                  <p className="text-base text-text-muted">
                    {formatDateTime(correction.createdAt)}
                  </p>
                </div>
                <p className="mt-1 text-base text-text">{correction.reason}</p>
                <ul className="mt-2 space-y-1 text-base text-text-muted">
                  {correction.items
                    .filter((item) => item.beforeQty !== item.afterQty)
                    .map((item) => (
                      <li key={item.aidItemId} className="flex flex-wrap items-center gap-2">
                        <ArrowRightLeft aria-hidden="true" className="h-5 w-5 text-info" />
                        {item.name}: {formatNumber(item.beforeQty)} →{" "}
                        {formatNumber(item.afterQty)} {item.unit}
                      </li>
                    ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Modal
        open={correctionOpen}
        onClose={() => {
          if (!correctionBusy) setCorrectionOpen(false);
        }}
        title="Koreksi izin distribusi"
        description={
          permit
            ? `Izin ${permit.number} akan ditandai digantikan, lalu izin baru terbit dengan nomor berikutnya. Stok posko lama dikembalikan dan stok posko baru diambil otomatis.`
            : undefined
        }
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setCorrectionOpen(false)}
              disabled={correctionBusy}
            >
              Batal
            </Button>
            <Button onClick={() => void saveCorrection()} disabled={correctionBusy}>
              {correctionBusy ? "Sedang menyimpan…" : "Simpan koreksi"}
            </Button>
          </>
        }
      >
        {correctionError ? (
          <Alert tone="danger" title="Koreksi belum bisa disimpan." className="mb-4">
            {correctionError}
          </Alert>
        ) : null}

        <div className="grid gap-5">
          <Field
            id="correction-posko"
            label="Posko tujuan izin koreksi"
            hint="Boleh tetap sama atau diganti. Stok posko sebelumnya akan dikembalikan."
            required
          >
            <SelectInput
              value={correctionPoskoId}
              onChange={(event) => {
                setCorrectionPoskoId(event.target.value);
                if (correctionError) setCorrectionError(undefined);
              }}
            >
              <option value="">Pilih posko tujuan</option>
              {(incident.poskos ?? []).map((posko) => (
                <option key={posko.id} value={posko.id}>
                  {posko.name}, {posko.regionName}
                </option>
              ))}
            </SelectInput>
          </Field>

          {correctionShortages.length > 0 ? (
            <Alert
              tone="danger"
              title={`Stok ${correctionPosko?.name ?? "posko terpilih"} belum cukup untuk ${correctionShortages.length} jenis bantuan.`}
            >
              Koreksi akan ditolak sampai jumlah dikurangi atau posko diganti. Jenis yang kurang:{" "}
              {correctionShortages
                .map((row) => {
                  const item = permit?.items.find(
                    (permitItem) => permitItem.aidItemId === row.aidItemId,
                  );
                  return `${item?.name ?? "Bantuan"} kurang ${formatNumber(row.shortage)} ${
                    item?.unit ?? ""
                  }`;
                })
                .join(", ")}
              .
            </Alert>
          ) : correctionPosko ? (
            <Alert tone="success" title={`Stok ${correctionPosko.name} mencukupi untuk jumlah ini.`}>
              Angka di bawah adalah jumlah setelah koreksi, bukan tambahan.
            </Alert>
          ) : null}

          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[520px] border-collapse text-left text-base">
              <caption className="sr-only">Jumlah bantuan pada izin koreksi</caption>
              <thead>
                <tr className="border-b border-border bg-elevated text-text-muted">
                  <th scope="col" className="px-3 py-3 font-medium">
                    Jenis bantuan
                  </th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">
                    Jumlah lama
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    Jumlah baru
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {permit?.items.map((item) => (
                  <tr key={item.aidItemId}>
                    <th scope="row" className="px-3 py-3 text-left font-medium text-text">
                      {item.name}
                      <span className="block text-base font-normal text-text-muted">
                        satuan {item.unit}
                      </span>
                    </th>
                    <td className="px-3 py-3 text-right text-text-muted">
                      {formatNumber(item.qty)}
                    </td>
                    <td className="px-3 py-3">
                      <TextInput
                        id={`correction-qty-${item.aidItemId}`}
                        aria-label={`Jumlah baru ${item.name} dalam ${item.unit}`}
                        type="number"
                        min={0}
                        max={1_000_000}
                        value={correctionQty[item.aidItemId] ?? String(item.qty)}
                        onChange={(event) => {
                          setCorrectionQty((current) => ({
                            ...current,
                            [item.aidItemId]: event.target.value,
                          }));
                          if (correctionError) setCorrectionError(undefined);
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Field
            id="correction-reason"
            label="Alasan koreksi"
            hint="Jelaskan kenapa jumlah atau posko berubah agar riwayat mudah diperiksa."
            required
          >
            <Textarea
              value={correctionReason}
              placeholder="Contoh: Hasil pendataan ulang menunjukkan kebutuhan air lebih kecil."
              maxLength={300}
              onChange={(event) => {
                setCorrectionReason(event.target.value);
                if (correctionError) setCorrectionError(undefined);
              }}
            />
          </Field>
        </div>
      </Modal>

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
