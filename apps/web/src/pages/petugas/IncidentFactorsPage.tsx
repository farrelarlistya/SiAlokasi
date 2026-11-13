import {
  DAMAGE_LABEL,
  DAMAGE_LEVELS,
  DENSITY_LABEL,
  DENSITY_LEVELS,
  disasterLabel,
  canCancelByPetugas,
  formatDateTime,
  formatDistance,
  formatModelVersion,
  formatNumber,
  incidentFactorsSchema,
  ROAD_ACCESS_LABEL,
  ROAD_ACCESS_OPTIONS,
  WEATHER_LABEL,
  WEATHER_OPTIONS,
  type DamageLevel,
  type DensityLevel,
  type IncidentFactorsInput,
  type RoadAccess,
  type WeatherCondition,
} from "@sialokasi/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Ban,
  Calculator,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Lock,
  MapPin,
  RefreshCw,
  Send,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { AidIcon } from "../../components/AidIcon";
import { Alert } from "../../components/Alert";
import { Button, buttonStyles } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Field, SelectInput, TextInput } from "../../components/Field";
import { IncidentTimeline } from "../../components/IncidentTimeline";
import { PageHeader } from "../../components/PageHeader";
import { Section } from "../../components/Section";
import { Skeleton } from "../../components/Skeleton";
import { StepRail } from "../../components/StepRail";
import { StatusChip } from "../../components/StatusChip";
import { useToast } from "../../components/Toast";
import { IncidentFocusMap } from "../../components/map/IncidentFocusMap";
import { AppShell } from "../../layouts/AppShell";
import { api } from "../../lib/api";
import { focusSection } from "../../lib/focus";

type FactorForm = {
  affectedPeople: string;
  damageLevel: DamageLevel;
  vulnerableBabies: string;
  vulnerableElderly: string;
  vulnerablePregnant: string;
  vulnerableDisabled: string;
  roadAccess: RoadAccess;
  weather: WeatherCondition;
  density: DensityLevel;
};

type FactorField = keyof FactorForm;
type FieldErrors = Partial<Record<FactorField, string>>;

const EMPTY_FACTORS: FactorForm = {
  affectedPeople: "",
  damageLevel: "SEDANG",
  vulnerableBabies: "0",
  vulnerableElderly: "0",
  vulnerablePregnant: "0",
  vulnerableDisabled: "0",
  roadAccess: "TERBUKA",
  weather: "CERAH",
  density: "SEDANG",
};

function factorsToForm(factors: IncidentFactorsInput): FactorForm {
  return {
    affectedPeople: String(factors.affectedPeople),
    damageLevel: factors.damageLevel,
    vulnerableBabies: String(factors.vulnerableBabies),
    vulnerableElderly: String(factors.vulnerableElderly),
    vulnerablePregnant: String(factors.vulnerablePregnant),
    vulnerableDisabled: String(factors.vulnerableDisabled),
    roadAccess: factors.roadAccess,
    weather: factors.weather,
    density: factors.density,
  };
}

export function IncidentFactorsPage() {
  const { id = "" } = useParams();
  const toast = useToast();
  const queryClient = useQueryClient();

  const detail = useQuery({
    queryKey: ["petugas", "incident", id],
    queryFn: () => api.petugasIncident(id),
    enabled: id !== "",
  });

  const [form, setForm] = useState<FactorForm>(EMPTY_FACTORS);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    if (!detail.data || hydrated.current) return;
    hydrated.current = true;
    if (detail.data.data.factors) {
      setForm(factorsToForm(detail.data.data.factors));
    }
  }, [detail.data]);

  const incident = detail.data?.data;
  const recommendation = incident?.recommendation ?? null;
  const isLocked =
    incident !== undefined && incident.status !== "BARU" && incident.status !== "DIPERIKSA";
  const canEstimate =
    incident !== undefined && (incident.status === "BARU" || incident.status === "DIPERIKSA");

  const updateForm = (patch: Partial<FactorForm>) => {
    setForm((current) => ({ ...current, ...patch }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(undefined);

    const parsed = incidentFactorsSchema.safeParse({
      affectedPeople: form.affectedPeople,
      damageLevel: form.damageLevel,
      vulnerableBabies: form.vulnerableBabies,
      vulnerableElderly: form.vulnerableElderly,
      vulnerablePregnant: form.vulnerablePregnant,
      vulnerableDisabled: form.vulnerableDisabled,
      roadAccess: form.roadAccess,
      weather: form.weather,
      density: form.density,
    });

    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && key in EMPTY_FACTORS && !nextErrors[key as FactorField]) {
          nextErrors[key as FactorField] = issue.message;
        }
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setBusy(true);

    try {
      const response = await api.estimateIncident(id, parsed.data);
      queryClient.setQueryData(["petugas", "incident", id], { data: response.data });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["petugas", "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["petugas", "incidents"] }),
        queryClient.invalidateQueries({ queryKey: ["public", "incidents"] }),
        queryClient.invalidateQueries({ queryKey: ["pimpinan"] }),
      ]);
      toast.push({
        tone: "success",
        title: "Estimasi siap.",
        description: "Sepuluh jenis bantuan sudah dihitung. Periksa alasannya sebelum diajukan.",
      });
      window.requestAnimationFrame(() => focusSection("hasil-estimasi"));
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Estimasi belum bisa dihitung. Periksa koneksi, lalu coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  };

  const cancelReport = async () => {
    setCancelBusy(true);
    try {
      const response = await api.cancelIncident(id, {
        reason: "Laporan tidak dilanjutkan oleh petugas.",
      });
      queryClient.setQueryData(["petugas", "incident", id], { data: response.data });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["petugas", "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["petugas", "incidents"] }),
        queryClient.invalidateQueries({ queryKey: ["public", "incidents"] }),
        queryClient.invalidateQueries({ queryKey: ["pimpinan"] }),
      ]);
      toast.push({ tone: "info", title: response.message });
      setConfirmCancelOpen(false);
    } catch (error) {
      toast.push({
        tone: "danger",
        title: "Laporan belum bisa dibatalkan.",
        description:
          error instanceof Error ? error.message : "Periksa koneksi, lalu coba lagi.",
      });
      setConfirmCancelOpen(false);
    } finally {
      setCancelBusy(false);
    }
  };

  if (detail.isPending) {
    return (
      <AppShell>
        <PageHeader title="Faktor & estimasi" />
        <div className="mt-6 space-y-6" aria-busy="true">
          <span className="sr-only">Sedang memuat laporan</span>
          <Skeleton variant="card" className="h-[360px]" />
          <Skeleton variant="card" className="h-[420px]" />
        </div>
      </AppShell>
    );
  }

  if (detail.isError || !incident) {
    return (
      <AppShell>
        <PageHeader title="Faktor & estimasi" />
        <Alert
          tone="danger"
          title="Laporan belum bisa dimuat."
          className="mt-6"
          action={
            <Button
              variant="secondary"
              leadingIcon={<RefreshCw />}
              onClick={() => void detail.refetch()}
            >
              Coba lagi
            </Button>
          }
        >
          Periksa koneksi, lalu tekan Coba lagi. Bila laporan ini bukan milik akun Anda, kembali ke
          dasbor dan pilih laporan yang benar.
        </Alert>
      </AppShell>
    );
  }

  const status = incident.status;
  const statusMessage =
    status === "MENUNGGU_PERSETUJUAN"
      ? "Laporan sudah diajukan dan menunggu keputusan pimpinan. Isi laporan terkunci sampai keputusan dibuat."
      : status === "DISETUJUI"
        ? "Laporan sudah disetujui. Izin distribusi sudah terbit dan tidak bisa diubah dari halaman ini."
        : status === "SELESAI"
          ? "Distribusi sudah ditandai selesai. Laporan ini ditutup."
          : status === "DITOLAK"
            ? incident.decision?.reason ??
              "Laporan ini ditolak pimpinan. Buat laporan baru bila ada data yang perlu diperbaiki."
            : status === "DIBATALKAN"
              ? incident.cancelReason
                ? `Laporan ini dibatalkan: ${incident.cancelReason}`
                : "Laporan ini dibatalkan dan tidak bisa dilanjutkan."
              : "";

  const factorsForm = (
    <form onSubmit={(event) => void submit(event)} className="grid gap-5" noValidate>
      <fieldset disabled={!canEstimate || busy} className="grid gap-5 disabled:opacity-80">
        <legend className="sr-only">Faktor dampak dan kondisi lapangan</legend>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="factor-people" label="Jiwa terdampak" error={errors.affectedPeople} required>
            <TextInput
              type="number"
              min={1}
              max={50_000}
              value={form.affectedPeople}
              placeholder="Contoh: 420"
              onChange={(event) => {
                updateForm({ affectedPeople: event.target.value });
                if (errors.affectedPeople) {
                  setErrors((current) => ({ ...current, affectedPeople: undefined }));
                }
              }}
            />
          </Field>

          <Field id="factor-damage" label="Kerusakan rumah" error={errors.damageLevel} required>
            <SelectInput
              value={form.damageLevel}
              onChange={(event) =>
                updateForm({ damageLevel: event.target.value as DamageLevel })
              }
            >
              {DAMAGE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {DAMAGE_LABEL[level]}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>

        <div>
          <p className="text-base font-medium text-text">Kelompok rentan</p>
          <p className="mt-1 text-base text-text-muted">
            Total kelompok rentan tidak boleh melebihi jumlah jiwa terdampak.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ["vulnerableBabies", "Bayi"],
                ["vulnerableElderly", "Lansia"],
                ["vulnerablePregnant", "Ibu hamil"],
                ["vulnerableDisabled", "Disabilitas"],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} id={`factor-${key}`} label={label} error={errors[key]}>
                <TextInput
                  type="number"
                  min={0}
                  max={50_000}
                  value={form[key]}
                  onChange={(event) => {
                    updateForm({ [key]: event.target.value });
                    if (errors[key]) {
                      setErrors((current) => ({ ...current, [key]: undefined }));
                    }
                  }}
                />
              </Field>
            ))}
          </div>
        </div>

        <div className="grid gap-4 border-t border-border pt-5 sm:grid-cols-3">
          <Field id="factor-road" label="Akses jalan" error={errors.roadAccess} required>
            <SelectInput
              value={form.roadAccess}
              onChange={(event) =>
                updateForm({ roadAccess: event.target.value as RoadAccess })
              }
            >
              {ROAD_ACCESS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {ROAD_ACCESS_LABEL[option]}
                </option>
              ))}
            </SelectInput>
          </Field>

          <Field id="factor-weather" label="Cuaca" error={errors.weather} required>
            <SelectInput
              value={form.weather}
              onChange={(event) =>
                updateForm({ weather: event.target.value as WeatherCondition })
              }
            >
              {WEATHER_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {WEATHER_LABEL[option]}
                </option>
              ))}
            </SelectInput>
          </Field>

          <Field id="factor-density" label="Kepadatan penduduk" error={errors.density} required>
            <SelectInput
              value={form.density}
              onChange={(event) => updateForm({ density: event.target.value as DensityLevel })}
            >
              {DENSITY_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {DENSITY_LABEL[level]}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
      </fieldset>

      {canEstimate ? (
        <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-base text-text-muted">
            Hasil perhitungan bisa berubah bila faktor diperbaiki. Angka final tetap ditinjau
            pimpinan.
          </p>
          <Button
            type="submit"
            size="lg"
            leadingIcon={<Calculator />}
            disabled={busy}
            className="shrink-0"
          >
            {busy
              ? "Sedang menghitung…"
              : recommendation
                ? "Hitung ulang estimasi"
                : "Hitung estimasi"}
          </Button>
        </div>
      ) : null}
    </form>
  );

  return (
    <AppShell>
      <PageHeader
        eyebrow={`Laporan ${incident.code}`}
        title="Faktor & estimasi"
        brief={
          recommendation
            ? "Periksa hasil, lalu ajukan ke pimpinan."
            : "Isi faktor lapangan, lalu hitung estimasi."
        }
        actions={
          <>
            <Link to="/petugas" className={buttonStyles("secondary", "md")}>
              <ArrowLeft aria-hidden="true" className="h-5 w-5" />
              Dasbor
            </Link>
            <Link
              to={`/lacak?kode=${encodeURIComponent(incident.code)}`}
              className={buttonStyles("secondary", "md")}
            >
              <MapPin aria-hidden="true" className="h-5 w-5" />
              Lihat kode lacak
            </Link>
            {canCancelByPetugas(incident.status) ? (
              <Button
                variant="outlineDanger"
                leadingIcon={<Ban />}
                onClick={() => setConfirmCancelOpen(true)}
                disabled={cancelBusy}
              >
                Batalkan laporan
              </Button>
            ) : null}
          </>
        }
      />

      <StepRail
        steps={["Titik & wilayah", "Faktor & estimasi", "Ajukan"]}
        current={isLocked ? 2 : 1}
        className="mt-5"
      />

      {statusMessage ? (
        <Alert
          tone={
            status === "DITOLAK"
              ? "danger"
              : status === "SELESAI"
                ? "success"
                : status === "DISETUJUI"
                  ? "success"
                  : status === "DIBATALKAN"
                    ? "info"
                    : "warning"
          }
          title={
            status === "MENUNGGU_PERSETUJUAN"
              ? "Menunggu keputusan pimpinan"
              : status === "DISETUJUI"
                ? "Sudah disetujui"
                : status === "SELESAI"
                  ? "Distribusi selesai"
                  : status === "DITOLAK"
                    ? "Laporan ditolak"
                    : "Laporan dibatalkan"
          }
          className="mt-5"
          action={
            status === "DITOLAK" ? (
              <Link to="/petugas/laporan/baru" className={buttonStyles("secondary", "md")}>
                Buat laporan baru
              </Link>
            ) : status === "DISETUJUI" || status === "SELESAI" ? (
              <Link
                to={`/lacak?kode=${encodeURIComponent(incident.code)}`}
                className={buttonStyles("secondary", "md")}
              >
                Lihat status publik
              </Link>
            ) : undefined
          }
        >
          {statusMessage}
        </Alert>
      ) : null}

      {formError ? (
        <Alert tone="danger" title="Estimasi belum bisa dihitung." className="mt-5">
          {formError}
        </Alert>
      ) : null}

      {recommendation ? (
        <Section
          tone="focus"
          headingId="hasil-estimasi"
          title="Estimasi bantuan"
          actions={
            <span
              role="status"
              className="inline-flex min-h-9 items-center gap-2 border border-border px-3 text-base text-text-muted"
            >
              <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
              Sudah dihitung
            </span>
          }
          className="mt-6"
        >
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-border pb-4">
            <div>
              <p className="text-base text-text-muted">Jiwa terdampak</p>
              <p className="text-figure text-text">{formatNumber(recommendation.totalPeople)}</p>
            </div>
            <p className="text-base text-text-muted">
              Perhitungan otomatis{" "}
              <span className="text-text">{formatModelVersion(recommendation.modelVersion)}</span> ·{" "}
              {recommendation.items.length} jenis bantuan
            </p>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left text-base">
              <caption className="sr-only">
                Estimasi kebutuhan bantuan untuk laporan ini
              </caption>
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
                  <th scope="col" className="px-2 py-3 font-medium">
                    Alasan
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recommendation.items.map((item) => (
                  <tr key={item.id} className="align-top">
                    <th scope="row" className="px-2 py-4 text-left font-medium text-text">
                      <span className="flex items-center gap-3">
                        <AidIcon name={item.icon} />
                        <span>{item.name}</span>
                      </span>
                    </th>
                    <td className="px-2 py-4 text-right font-mono text-base text-text">
                      {formatNumber(item.finalQty)}
                    </td>
                    <td className="px-2 py-4 text-text-muted">{item.unit}</td>
                    <td className="px-2 py-4 text-text-muted">{item.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {canEstimate ? (
            <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-base text-text-muted">
                Sudah yakin dengan hasilnya? Ajukan ke pimpinan untuk ditinjau.
              </p>
              <Link
                to={`/petugas/laporan/${incident.id}/ajukan`}
                className={buttonStyles("primary", "lg")}
              >
                <Send aria-hidden="true" className="h-5 w-5" />
                Ajukan ke pimpinan
              </Link>
            </div>
          ) : null}
        </Section>
      ) : null}

      <Section
        tone={recommendation ? "default" : "focus"}
        headingId={recommendation ? undefined : "faktor-lapangan"}
        title="Faktor lapangan"
        brief="Faktor dipakai untuk menghitung kebutuhan, bukan untuk menilai siapa yang salah."
        actions={
          isLocked ? (
            <span className="inline-flex min-h-9 items-center gap-2 border border-border px-3 text-base text-text-muted">
              <Lock aria-hidden="true" className="h-5 w-5" />
              Terkunci
            </span>
          ) : undefined
        }
        className="mt-6"
      >
        {factorsForm}

        {isLocked ? (
          <Alert tone="info" title="Formulir terkunci" className="mt-5">
            Laporan yang sudah diajukan tidak bisa diubah. Perbaikan data dilakukan lewat laporan
            baru atau catatan koreksi pada tahap berikutnya.
          </Alert>
        ) : null}
      </Section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Section title="Lokasi & dampak">
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

          <dl className="mt-4 space-y-3 text-base">
            <div className="flex justify-between gap-3">
              <dt className="flex items-center gap-2 text-text-muted">
                <Clock3 aria-hidden="true" className="h-5 w-5" />
                Waktu kejadian
              </dt>
              <dd className="text-right text-text">{formatDateTime(incident.occurredAt)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="flex items-center gap-2 text-text-muted">
                <MapPin aria-hidden="true" className="h-5 w-5" />
                Wilayah terdampak
              </dt>
              <dd className="text-right text-text">
                {formatDistance(incident.radiusM)}, {incident.region?.name ?? "Belum diisi"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="flex items-center gap-2 text-text-muted">
                <Users aria-hidden="true" className="h-5 w-5" />
                Jiwa terdampak
              </dt>
              <dd className="text-right font-mono text-text">
                {incident.affectedPeople === null
                  ? "Belum diisi"
                  : `${formatNumber(incident.affectedPeople)} jiwa`}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="flex items-center gap-2 text-text-muted">
                <FileCheck2 aria-hidden="true" className="h-5 w-5" />
                Kode lacak
              </dt>
              <dd className="text-right font-mono text-info">{incident.code}</dd>
            </div>
          </dl>
        </Section>

        <Section title="Riwayat status">
          <IncidentTimeline
            timeline={incident.logs.map((log) => ({
              status: log.toStatus,
              at: log.createdAt,
            }))}
            currentStatus={incident.status}
          />
        </Section>
      </div>

      <ConfirmDialog
        open={confirmCancelOpen}
        onClose={() => setConfirmCancelOpen(false)}
        onConfirm={() => void cancelReport()}
        busy={cancelBusy}
        title="Batalkan laporan ini?"
        description="Laporan akan berstatus Dibatalkan dan tidak masuk antrian pimpinan. Tindakan ini tidak bisa dibatalkan; buat laporan baru bila data perlu diperbaiki."
        confirmLabel="Ya, batalkan laporan"
        cancelLabel="Belum"
      />
    </AppShell>
  );
}
