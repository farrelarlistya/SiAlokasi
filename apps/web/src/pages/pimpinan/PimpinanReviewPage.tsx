import {
  adjustRecommendationItemSchema,
  compareStock,
  DAMAGE_LABEL,
  DENSITY_LABEL,
  DISASTER_LABEL,
  formatDateTime,
  formatDistance,
  formatModelVersion,
  formatNumber,
  ROAD_ACCESS_LABEL,
  WEATHER_LABEL,
  type RecommendationItemView,
} from "@sialokasi/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle2,
  ClipboardCheck,
  MapPin,
  Package,
  Pencil,
  RefreshCw,
  Users,
  Warehouse,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AidIcon } from "../../components/AidIcon";
import { Alert } from "../../components/Alert";
import { Button, buttonStyles } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Field, SelectInput, Textarea, TextInput } from "../../components/Field";
import { Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { Skeleton } from "../../components/Skeleton";
import { StatusChip } from "../../components/StatusChip";
import { useToast } from "../../components/Toast";
import { IncidentFocusMap } from "../../components/map/IncidentFocusMap";
import { AppShell } from "../../layouts/AppShell";
import { api } from "../../lib/api";
import { cn } from "../../lib/cn";

type AdjustErrors = Partial<Record<"finalQty" | "reason", string>>;

export function PimpinanReviewPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const detail = useQuery({
    queryKey: ["pimpinan", "incident", id],
    queryFn: () => api.pimpinanIncident(id),
    enabled: id !== "",
  });

  const [selectedPoskoId, setSelectedPoskoId] = useState("");
  const [decisionReason, setDecisionReason] = useState("");
  const [decisionError, setDecisionError] = useState<string | undefined>();
  const [confirmApproveOpen, setConfirmApproveOpen] = useState(false);
  const [confirmRejectOpen, setConfirmRejectOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState<string | undefined>();

  const [adjustTarget, setAdjustTarget] = useState<RecommendationItemView | null>(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustErrors, setAdjustErrors] = useState<AdjustErrors>({});
  const [adjustFormError, setAdjustFormError] = useState<string | undefined>();

  const incident = detail.data?.data;
  const recommendation = incident?.recommendation ?? null;
  const poskos = incident?.poskos ?? [];
  const isWaiting = incident?.status === "MENUNGGU_PERSETUJUAN";

  useEffect(() => {
    if (selectedPoskoId || poskos.length === 0) return;
    setSelectedPoskoId(poskos[0]?.id ?? "");
  }, [poskos, selectedPoskoId]);

  const selectedPosko = poskos.find((posko) => posko.id === selectedPoskoId) ?? poskos[0];

  const stockComparisons = useMemo(() => {
    if (!recommendation || !selectedPosko) return [];
    return compareStock(
      recommendation.items.map((item) => ({ aidItemId: item.aidItemId, qty: item.finalQty })),
      selectedPosko.stocks,
    );
  }, [recommendation, selectedPosko]);

  const stockByItem = useMemo(
    () => new Map(stockComparisons.map((row) => [row.aidItemId, row])),
    [stockComparisons],
  );
  const shortages = stockComparisons.filter((row) => row.shortage > 0);

  const openAdjust = (item: RecommendationItemView) => {
    setAdjustTarget(item);
    setAdjustQty(String(item.finalQty));
    setAdjustReason("");
    setAdjustErrors({});
    setAdjustFormError(undefined);
  };

  const closeAdjust = () => {
    if (busy) return;
    setAdjustTarget(null);
  };

  const saveAdjust = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!adjustTarget) return;
    setAdjustFormError(undefined);

    const parsed = adjustRecommendationItemSchema.safeParse({
      finalQty: adjustQty,
      reason: adjustReason,
    });

    if (!parsed.success) {
      const nextErrors: AdjustErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if ((key === "finalQty" || key === "reason") && !nextErrors[key]) {
          nextErrors[key] = issue.message;
        }
      }
      setAdjustErrors(nextErrors);
      return;
    }

    setAdjustErrors({});
    setBusy(true);

    try {
      const response = await api.adjustIncidentItem(id, adjustTarget.id, parsed.data);
      queryClient.setQueryData(["pimpinan", "incident", id], { data: response.data });
      await queryClient.invalidateQueries({ queryKey: ["pimpinan", "summary"] });
      toast.push({ tone: "success", title: response.message });
      setAdjustTarget(null);
    } catch (error) {
      setAdjustFormError(
        error instanceof Error
          ? error.message
          : "Perubahan belum bisa disimpan. Periksa koneksi, lalu coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  };

  const requestApprove = () => {
    setDecisionError(undefined);
    if (!selectedPoskoId) {
      setDecisionError("Pilih posko tujuan distribusi sebelum menyetujui laporan.");
      return;
    }
    if (shortages.length > 0) {
      setDecisionError(
        `Stok di ${selectedPosko?.name ?? "posko terpilih"} belum cukup untuk ${shortages.length} jenis bantuan. Pilih posko lain atau sesuaikan jumlah bantuan terlebih dahulu.`,
      );
      return;
    }
    setConfirmApproveOpen(true);
  };

  const requestReject = () => {
    setDecisionError(undefined);
    if (decisionReason.trim().length < 5) {
      setDecisionError(
        "Tulis alasan penolakan minimal 5 karakter agar petugas tahu apa yang perlu diperbaiki.",
      );
      return;
    }
    setConfirmRejectOpen(true);
  };

  const approve = async () => {
    setBusy(true);
    try {
      const response = await api.decideIncident(id, {
        decision: "APPROVE",
        poskoId: selectedPoskoId,
        reason: decisionReason.trim() || undefined,
      });
      queryClient.setQueryData(["pimpinan", "incident", id], { data: response.data });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pimpinan", "summary"] }),
        queryClient.invalidateQueries({ queryKey: ["public", "incidents"] }),
        queryClient.invalidateQueries({ queryKey: ["petugas", "dashboard"] }),
      ]);
      toast.push({ tone: "success", title: response.message });
      setConfirmApproveOpen(false);
      navigate(`/pimpinan/izin/${id}`, { replace: true });
    } catch (error) {
      setDecisionError(
        error instanceof Error
          ? error.message
          : "Keputusan belum bisa disimpan. Periksa koneksi, lalu coba lagi.",
      );
      setConfirmApproveOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    setBusy(true);
    try {
      const response = await api.decideIncident(id, {
        decision: "REJECT",
        reason: decisionReason.trim(),
      });
      queryClient.setQueryData(["pimpinan", "incident", id], { data: response.data });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pimpinan", "summary"] }),
        queryClient.invalidateQueries({ queryKey: ["public", "incidents"] }),
        queryClient.invalidateQueries({ queryKey: ["petugas", "dashboard"] }),
      ]);
      toast.push({ tone: "info", title: response.message });
      setConfirmRejectOpen(false);
      navigate("/pimpinan", { replace: true });
    } catch (error) {
      setDecisionError(
        error instanceof Error
          ? error.message
          : "Penolakan belum bisa disimpan. Periksa koneksi, lalu coba lagi.",
      );
      setConfirmRejectOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setCancelError(undefined);
    if (cancelReason.trim().length < 5) {
      setCancelError(
        "Tulis alasan pembatalan minimal 5 karakter agar petugas tahu kenapa laporan dihentikan.",
      );
      return;
    }

    setBusy(true);
    try {
      const response = await api.cancelIncidentByPimpinan(id, {
        reason: cancelReason.trim(),
      });
      queryClient.setQueryData(["pimpinan", "incident", id], { data: response.data });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pimpinan", "summary"] }),
        queryClient.invalidateQueries({ queryKey: ["public", "incidents"] }),
        queryClient.invalidateQueries({ queryKey: ["petugas", "dashboard"] }),
      ]);
      toast.push({ tone: "info", title: response.message });
      setCancelOpen(false);
      navigate("/pimpinan", { replace: true });
    } catch (error) {
      setCancelError(
        error instanceof Error
          ? error.message
          : "Pembatalan belum bisa disimpan. Periksa koneksi, lalu coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (detail.isPending) {
    return (
      <AppShell>
        <PageHeader eyebrow="Tinjau laporan" title="Memuat rincian laporan" />
        <div className="mt-6 grid gap-6 xl:grid-cols-2" aria-busy="true">
          <span className="sr-only">Sedang memuat rincian laporan</span>
          <Skeleton variant="card" className="h-[420px]" />
          <Skeleton variant="card" className="h-[520px]" />
        </div>
      </AppShell>
    );
  }

  if (detail.isError || !incident) {
    return (
      <AppShell>
        <PageHeader eyebrow="Tinjau laporan" title="Rincian laporan" />
        <Alert
          tone="danger"
          title="Rincian laporan belum bisa dimuat."
          className="mt-6"
          action={
            <Button variant="secondary" leadingIcon={<RefreshCw />} onClick={() => void detail.refetch()}>
              Coba lagi
            </Button>
          }
        >
          Periksa koneksi, lalu tekan Coba lagi. Bila laporan ini sudah diputuskan, buka dari
          antrian terbaru di dasbor.
        </Alert>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Tinjau laporan"
        title={incident.title}
        description={`${incident.code} · ${DISASTER_LABEL[incident.disasterType]} · ${
          incident.region?.name ?? "Kecamatan belum diisi"
        }`}
        actions={
          <>
            <Link to="/pimpinan" className={buttonStyles("secondary", "md")}>
              <ArrowLeft aria-hidden="true" className="h-5 w-5" />
              Antrian
            </Link>
            <Link
              to={`/lacak?kode=${encodeURIComponent(incident.code)}`}
              className={buttonStyles("secondary", "md")}
            >
              <MapPin aria-hidden="true" className="h-5 w-5" />
              Lihat publik
            </Link>
          </>
        }
      />

      {!isWaiting ? (
        <Alert
          tone={
            incident.status === "DITOLAK"
              ? "danger"
              : incident.status === "DISETUJUI" || incident.status === "SELESAI"
                ? "success"
                : "info"
          }
          title={
            incident.status === "DITOLAK"
              ? "Laporan ini sudah ditolak."
              : incident.status === "DIBATALKAN"
                ? "Laporan ini sudah dibatalkan."
                : incident.status === "DISETUJUI"
                  ? "Laporan ini sudah disetujui."
                  : incident.status === "SELESAI"
                    ? "Distribusi laporan ini sudah selesai."
                    : "Laporan ini tidak sedang menunggu keputusan."
          }
          className="mt-6"
          action={
            incident.permit ? (
              <Link to={`/pimpinan/izin/${incident.id}`} className={buttonStyles("secondary", "md")}>
                Buka izin distribusi
              </Link>
            ) : undefined
          }
        >
          {incident.status === "DITOLAK"
            ? incident.decision?.reason ??
              "Alasan penolakan tidak tercatat. Hubungi admin bila perlu memeriksa riwayat."
            : incident.status === "DIBATALKAN"
              ? incident.cancelReason ?? "Laporan ini dibatalkan sebelum diputuskan."
              : incident.status === "DISETUJUI" || incident.status === "SELESAI"
                ? `Izin distribusi ${incident.permit?.number ?? "belum tersedia"} sudah tercatat.`
                : "Kembali ke antrian untuk memilih laporan yang masih menunggu keputusan."}
        </Alert>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="min-w-0 space-y-6">
          <section className="rounded-lg border border-border bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-[22px] font-semibold leading-[30px]">Lokasi & dampak</h2>
                <p className="mt-1 text-base text-text-muted">
                  Titik dan radius sesuai laporan petugas.
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

            <dl className="mt-4 space-y-3 text-base">
              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">Waktu kejadian</dt>
                <dd className="text-right text-text">{formatDateTime(incident.occurredAt)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">Pelapor</dt>
                <dd className="text-right text-text">{incident.reporter?.name ?? "Tidak tercatat"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">Jiwa terdampak</dt>
                <dd className="text-right text-text">
                  {incident.affectedPeople === null
                    ? "Belum diisi"
                    : `${formatNumber(incident.affectedPeople)} jiwa`}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">Radius wilayah</dt>
                <dd className="text-right text-text">{formatDistance(incident.radiusM)}</dd>
              </div>
            </dl>
          </section>

          {incident.factors ? (
            <section className="rounded-lg border border-border bg-surface p-5">
              <h2 className="text-[22px] font-semibold leading-[30px]">Delapan faktor lapangan</h2>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-border bg-elevated p-3">
                  <dt className="text-base text-text-muted">Kerusakan rumah</dt>
                  <dd className="mt-1 text-base text-text">
                    {DAMAGE_LABEL[incident.factors.damageLevel]}
                  </dd>
                </div>
                <div className="rounded-md border border-border bg-elevated p-3">
                  <dt className="text-base text-text-muted">Lama penanganan</dt>
                  <dd className="mt-1 text-base text-text">
                    {formatNumber(incident.factors.handlingDays)} hari
                  </dd>
                </div>
                <div className="rounded-md border border-border bg-elevated p-3">
                  <dt className="text-base text-text-muted">Kelompok rentan</dt>
                  <dd className="mt-1 text-base text-text">
                    {formatNumber(
                      incident.factors.vulnerableBabies +
                        incident.factors.vulnerableElderly +
                        incident.factors.vulnerablePregnant +
                        incident.factors.vulnerableDisabled,
                    )}{" "}
                    jiwa
                  </dd>
                </div>
                <div className="rounded-md border border-border bg-elevated p-3">
                  <dt className="text-base text-text-muted">Akses jalan</dt>
                  <dd className="mt-1 text-base text-text">
                    {ROAD_ACCESS_LABEL[incident.factors.roadAccess]}
                  </dd>
                </div>
                <div className="rounded-md border border-border bg-elevated p-3">
                  <dt className="text-base text-text-muted">Cuaca</dt>
                  <dd className="mt-1 text-base text-text">
                    {WEATHER_LABEL[incident.factors.weather]}
                  </dd>
                </div>
                <div className="rounded-md border border-border bg-elevated p-3">
                  <dt className="text-base text-text-muted">Kepadatan penduduk</dt>
                  <dd className="mt-1 text-base text-text">
                    {DENSITY_LABEL[incident.factors.density]}
                  </dd>
                </div>
              </dl>
            </section>
          ) : null}
        </div>

        <div className="min-w-0 space-y-6">
          <section className="rounded-lg border border-border bg-surface">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-5">
              <div>
                <h2 className="text-[22px] font-semibold leading-[30px]">Rekomendasi bantuan</h2>
                <p className="mt-1 text-base text-text-muted">
                  Tinjau setiap baris. Ubah jumlah hanya bila kondisi lapangan menuntut.
                </p>
              </div>
              {recommendation ? (
                <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border bg-elevated px-3 text-base text-text-muted">
                  <Package aria-hidden="true" className="h-5 w-5" />
                  {recommendation.items.length} jenis
                </span>
              ) : null}
            </div>

            <div className="p-5">
              {!recommendation ? (
                <Alert tone="warning" title="Perhitungan bantuan belum tersedia.">
                  Minta petugas menghitung estimasi terlebih dahulu sebelum laporan diputuskan.
                </Alert>
              ) : (
                <>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-elevated p-3 text-base">
                    <span className="text-text-muted">
                      Perhitungan otomatis ·{" "}
                      <span className="text-text">
                        {formatModelVersion(recommendation.modelVersion)}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 text-text-muted">
                      <Users aria-hidden="true" className="h-5 w-5" />
                      {formatNumber(recommendation.totalPeople)} jiwa
                    </span>
                  </div>

                  {incident.corrections.length > 0 ? (
                    <Alert
                      tone="info"
                      title="Jumlah final sudah dikoreksi di dokumen izin."
                      className="mb-4"
                    >
                      Tabel ini menampilkan usulan awal. Jumlah yang berlaku ada pada{" "}
                      <Link
                        to={`/pimpinan/izin/${incident.id}`}
                        className="font-medium text-info underline-offset-4 hover:underline"
                      >
                        izin distribusi terbaru
                      </Link>
                      .
                    </Alert>
                  ) : null}

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] table-fixed border-collapse text-left text-base">
                      <caption className="sr-only">Rekomendasi bantuan dan penyesuaiannya</caption>
                      <colgroup>
                        <col style={{ width: "21%" }} />
                        <col style={{ width: "9%" }} />
                        <col style={{ width: "12%" }} />
                        <col style={{ width: "16%" }} />
                        <col style={{ width: "26%" }} />
                        {isWaiting ? <col style={{ width: "16%" }} /> : null}
                      </colgroup>
                      <thead>
                        <tr className="border-b border-border text-text-muted">
                          <th scope="col" className="px-2 py-3 font-medium">Jenis bantuan</th>
                          <th scope="col" className="px-2 py-3 text-right font-medium">Usulan</th>
                          <th scope="col" className="px-2 py-3 text-right font-medium">Final</th>
                          <th scope="col" className="px-2 py-3 font-medium">Stok posko</th>
                          <th scope="col" className="px-2 py-3 font-medium">Alasan</th>
                          {isWaiting ? (
                            <th scope="col" className="px-2 py-3 text-right font-medium">
                              Tindakan
                            </th>
                          ) : null}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {recommendation.items.map((item) => {
                          const adjusted = item.finalQty !== item.baseQty;
                          const stock = stockByItem.get(item.aidItemId);

                          return (
                            <tr
                              key={item.id}
                              className={cn("align-top", adjusted && "bg-accent/5")}
                            >
                              <th scope="row" className="px-2 py-4 text-left font-medium text-text">
                                <span className="flex items-start gap-2">
                                  <AidIcon name={item.icon} />
                                  <span className="min-w-0 break-words">
                                    {item.name}
                                    {adjusted ? (
                                      <span className="mt-1 block text-base font-normal text-info">
                                        Disesuaikan pimpinan
                                      </span>
                                    ) : null}
                                  </span>
                                </span>
                              </th>
                              <td className="px-2 py-4 text-right text-text-muted">
                                {formatNumber(item.baseQty)}
                              </td>
                              <td className="px-2 py-4 text-right text-[22px] font-semibold text-text">
                                {formatNumber(item.finalQty)}
                                <span className="block text-base font-normal text-text-muted">
                                  {item.unit}
                                </span>
                              </td>
                              <td className="px-2 py-4">
                                {stock ? (
                                  stock.shortage > 0 ? (
                                    <span className="inline-flex items-center gap-2 text-base text-warning">
                                      <AlertTriangle aria-hidden="true" className="h-5 w-5" />
                                      Kurang {formatNumber(stock.shortage)} {item.unit}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-2 text-base text-success">
                                      <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
                                      Cukup
                                    </span>
                                  )
                                ) : (
                                  <span className="text-base text-text-muted">—</span>
                                )}
                              </td>
                              <td className="break-words px-2 py-4 text-text-muted">
                                {adjusted && item.adjustReason ? (
                                  <span>
                                    <span className="block text-base font-medium text-text">
                                      Alasan perubahan
                                    </span>
                                    {item.adjustReason}
                                  </span>
                                ) : (
                                  item.reason
                                )}
                              </td>
                              {isWaiting ? (
                                <td className="px-2 py-4 text-right">
                                  <Button
                                    variant="secondary"
                                    leadingIcon={<Pencil />}
                                    className="whitespace-nowrap px-3"
                                    onClick={() => openAdjust(item)}
                                  >
                                    Ubah
                                  </Button>
                                </td>
                              ) : null}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-surface p-5">
            <h2 className="flex items-center gap-2 text-[22px] font-semibold leading-[30px]">
              <Warehouse aria-hidden="true" className="h-6 w-6 text-info" />
              Keputusan pimpinan
            </h2>
            <p className="mt-1 text-base text-text-muted">
              Pilih posko tujuan, lalu setujui atau tolak laporan ini.
            </p>

            {isWaiting ? (
              <div className="mt-5 grid gap-5">
                <Field
                  id="posko-tujuan"
                  label="Posko tujuan distribusi"
                  hint={
                    selectedPosko
                      ? `${selectedPosko.regionName} · ${
                          shortages.length === 0
                            ? "semua bantuan tercukupi"
                            : `${shortages.length} jenis bantuan kurang`
                        }`
                      : "Belum ada posko aktif."
                  }
                  required
                >
                  <SelectInput
                    value={selectedPoskoId}
                    disabled={poskos.length === 0}
                    onChange={(event) => {
                      setSelectedPoskoId(event.target.value);
                      setDecisionError(undefined);
                    }}
                  >
                    <option value="">Pilih posko tujuan</option>
                    {poskos.map((posko) => (
                      <option key={posko.id} value={posko.id}>
                        {posko.name} · {posko.regionName}
                      </option>
                    ))}
                  </SelectInput>
                </Field>

                {shortages.length > 0 ? (
                  <Alert
                    tone="danger"
                    title={`Stok di ${selectedPosko?.name ?? "posko terpilih"} belum mencukupi untuk ${shortages.length} jenis bantuan.`}
                  >
                    Persetujuan akan ditolak oleh server sampai stok cukup. Pilih posko lain atau
                    sesuaikan jumlah bantuan terlebih dahulu. Stok diambil otomatis saat izin
                    terbit.
                  </Alert>
                ) : selectedPosko ? (
                  <Alert tone="success" title={`Stok di ${selectedPosko.name} mencukupi.`}>
                    Semua bantuan final tersedia dan akan langsung diambil dari posko ini saat izin
                    terbit.
                  </Alert>
                ) : null}

                <Field
                  id="decision-reason"
                  label="Catatan keputusan"
                  hint="Wajib diisi bila menolak. Boleh dikosongkan bila menyetujui."
                >
                  <Textarea
                    value={decisionReason}
                    placeholder="Contoh: Lokasi belum bisa dipastikan, mohon perbarui titik kejadian."
                    maxLength={300}
                    onChange={(event) => {
                      setDecisionReason(event.target.value);
                      if (decisionError) setDecisionError(undefined);
                    }}
                  />
                </Field>

                {decisionError ? (
                  <Alert tone="danger" title="Keputusan belum bisa disimpan.">
                    {decisionError}
                  </Alert>
                ) : null}

                <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
                  <Button
                    variant="secondary"
                    size="lg"
                    leadingIcon={<Ban />}
                    disabled={busy}
                    onClick={() => {
                      setCancelReason("");
                      setCancelError(undefined);
                      setCancelOpen(true);
                    }}
                  >
                    Batalkan laporan
                  </Button>
                  <Button
                    variant="outlineDanger"
                    size="lg"
                    leadingIcon={<XCircle />}
                    disabled={busy}
                    onClick={requestReject}
                  >
                    Tolak
                  </Button>
                  <Button
                    size="lg"
                    leadingIcon={<ClipboardCheck />}
                    disabled={busy || poskos.length === 0 || shortages.length > 0}
                    onClick={requestApprove}
                  >
                    Setujui & terbitkan izin
                  </Button>
                </div>
              </div>
            ) : (
              <Alert tone="info" title="Tidak ada keputusan yang perlu diambil." className="mt-5">
                {incident.permit ? (
                  <Link
                    to={`/pimpinan/izin/${incident.id}`}
                    className="inline-flex min-h-11 items-center font-medium text-info underline-offset-4 hover:underline"
                  >
                    Buka izin distribusi {incident.permit.number}
                  </Link>
                ) : (
                  "Laporan ini sudah tidak berada di antrian keputusan."
                )}
              </Alert>
            )}
          </section>
        </div>
      </div>

      <Modal
        open={adjustTarget !== null}
        onClose={closeAdjust}
        title="Ubah jumlah bantuan"
        description={
          adjustTarget
            ? `${adjustTarget.name}: jumlah sebelumnya ${formatNumber(adjustTarget.finalQty)} ${adjustTarget.unit}. Setiap perubahan wajib disertai alasan.`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={closeAdjust} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" form="form-adjust-item" disabled={busy}>
              {busy ? "Sedang menyimpan…" : "Simpan perubahan"}
            </Button>
          </>
        }
      >
        {adjustFormError ? (
          <Alert tone="danger" title="Perubahan belum tersimpan." className="mb-4">
            {adjustFormError}
          </Alert>
        ) : null}

        {adjustTarget ? (
          <form
            id="form-adjust-item"
            onSubmit={(event) => void saveAdjust(event)}
            className="grid gap-5"
            noValidate
          >
            <Field
              id="adjust-qty"
              label={`Jumlah final (${adjustTarget.unit})`}
              error={adjustErrors.finalQty}
              required
            >
              <TextInput
                data-autofocus
                type="number"
                min={0}
                max={1_000_000}
                value={adjustQty}
                onChange={(event) => {
                  setAdjustQty(event.target.value);
                  if (adjustErrors.finalQty) {
                    setAdjustErrors((current) => ({ ...current, finalQty: undefined }));
                  }
                }}
              />
            </Field>

            <Field
              id="adjust-reason"
              label="Alasan perubahan"
              hint="Jelaskan singkat kenapa jumlahnya berbeda dari usulan perhitungan."
              error={adjustErrors.reason}
              required
            >
              <Textarea
                value={adjustReason}
                placeholder="Contoh: Stok posko tujuan lebih dekat dan jumlah jiwa sudah diperbarui."
                maxLength={300}
                onChange={(event) => {
                  setAdjustReason(event.target.value);
                  if (adjustErrors.reason) {
                    setAdjustErrors((current) => ({ ...current, reason: undefined }));
                  }
                }}
              />
            </Field>
          </form>
        ) : null}
      </Modal>

      <Modal
        open={cancelOpen}
        onClose={() => {
          if (!busy) setCancelOpen(false);
        }}
        title="Batalkan laporan ini?"
        description="Laporan akan ditutup dengan status Dibatalkan. Tulis alasan yang bisa dibaca petugas agar laporan bisa dibuat ulang dengan benar."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelOpen(false)} disabled={busy}>
              Kembali
            </Button>
            <Button variant="danger" onClick={() => void cancel()} disabled={busy}>
              {busy ? "Sedang membatalkan…" : "Ya, batalkan laporan"}
            </Button>
          </>
        }
      >
        {cancelError ? (
          <Alert tone="danger" title="Laporan belum bisa dibatalkan." className="mb-4">
            {cancelError}
          </Alert>
        ) : null}

        <Field
          id="cancel-reason"
          label="Alasan pembatalan"
          hint="Contoh: laporan dobel, lokasi salah, atau kejadian sudah ditangani posko lain."
          required
        >
          <Textarea
            data-autofocus
            value={cancelReason}
            placeholder="Tulis alasan pembatalan minimal 5 karakter."
            maxLength={300}
            onChange={(event) => {
              setCancelReason(event.target.value);
              if (cancelError) setCancelError(undefined);
            }}
          />
        </Field>
      </Modal>

      <ConfirmDialog
        open={confirmApproveOpen}
        onClose={() => setConfirmApproveOpen(false)}
        onConfirm={() => void approve()}
        busy={busy}
        tone="primary"
        title="Setujui laporan dan terbitkan izin?"
        description={`Izin distribusi akan terbit untuk ${
          selectedPosko?.name ?? "posko terpilih"
        } dan stok posko langsung berkurang. Setelah disetujui, jumlah bantuan hanya bisa diperbaiki lewat izin koreksi.`}
        confirmLabel="Ya, setujui & terbitkan"
        cancelLabel="Periksa lagi"
      />

      <ConfirmDialog
        open={confirmRejectOpen}
        onClose={() => setConfirmRejectOpen(false)}
        onConfirm={() => void reject()}
        busy={busy}
        title="Tolak laporan ini?"
        description={`Laporan akan ditutup dengan status Ditolak. Alasan yang Anda tulis akan dibaca petugas: "${
          decisionReason.trim() || "belum diisi"
        }".`}
        confirmLabel="Ya, tolak laporan"
        cancelLabel="Kembali"
      />
    </AppShell>
  );
}
