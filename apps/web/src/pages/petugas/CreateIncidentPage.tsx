import {
  DISASTER_LABEL,
  DISASTER_TYPES,
  formatDistance,
  formatTime,
  haversineMeters,
  incidentDraftSchema,
  resolveRegionForPoint,
  SURABAYA_CENTER,
  type DisasterType,
} from "@sialokasi/shared";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert } from "../../components/Alert";
import { Button, buttonStyles } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Field, SelectInput, TextInput } from "../../components/Field";
import { MapWorkspace } from "../../components/MapWorkspace";
import { Section } from "../../components/Section";
import { StepRail } from "../../components/StepRail";
import { useToast } from "../../components/Toast";
import {
  IncidentLocationPicker,
  type MapPoint,
} from "../../components/map/IncidentLocationPicker";
import { AppShell } from "../../layouts/AppShell";
import { api } from "../../lib/api";

const DRAFT_KEY = "sialokasi.draft.laporan-baru";

type DraftForm = {
  title: string;
  disasterType: DisasterType;
  disasterDetail: string;
  occurredAt: string;
  point: MapPoint | null;
  radiusM: number;
};

type StoredDraft = {
  savedAt: string;
  form: DraftForm;
};

type FieldErrors = Partial<
  Record<"title" | "disasterType" | "disasterDetail" | "occurredAt" | "point" | "radiusM", string>
>;

function toDateTimeLocal(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function emptyForm(): DraftForm {
  return {
    title: "",
    disasterType: "BANJIR",
    disasterDetail: "",
    occurredAt: toDateTimeLocal(new Date(Date.now() - 30 * 60_000)),
    point: null,
    radiusM: 1_000,
  };
}

function readDraft(): StoredDraft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft;
    if (!parsed.form || typeof parsed.form.title !== "string") return null;
    // Draf lama belum menyimpan keterangan jenis bencana.
    if (typeof parsed.form.disasterDetail !== "string") parsed.form.disasterDetail = "";
    return parsed;
  } catch {
    return null;
  }
}

function saveDraft(form: DraftForm): string | null {
  try {
    const savedAt = new Date().toISOString();
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt, form }));
    return savedAt;
  } catch {
    return null;
  }
}

function removeDraft(): void {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Draf lokal tidak tersedia; formulir tetap bisa dipakai.
  }
}

export function CreateIncidentPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const initialDraft = useMemo(() => readDraft(), []);
  const [form, setForm] = useState<DraftForm>(initialDraft?.form ?? emptyForm());
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(
    initialDraft?.savedAt ?? null,
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);

  const publicIncidents = useQuery({
    queryKey: ["public", "incidents", "", ""],
    queryFn: () => api.publicIncidents(),
  });

  const duplicates = useMemo(() => {
    if (!form.point) return [];
    return (publicIncidents.data?.incidents ?? [])
      .filter((incident) => {
        try {
          return (
            haversineMeters(form.point as MapPoint, {
              lat: incident.lat,
              lng: incident.lng,
            }) <= 200
          );
        } catch {
          return false;
        }
      })
      .slice(0, 3);
  }, [form.point, publicIncidents.data]);

  useEffect(() => {
    if (!form.title.trim() && !form.point) {
      removeDraft();
      setDraftSavedAt(null);
      return;
    }

    const savedAt = saveDraft(form);
    if (savedAt) setDraftSavedAt(savedAt);
  }, [form]);

  const updateForm = (patch: Partial<DraftForm>) => {
    setForm((current) => ({ ...current, ...patch }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(undefined);

    const parsed = incidentDraftSchema.safeParse({
      title: form.title,
      disasterType: form.disasterType,
      disasterDetail: form.disasterDetail,
      occurredAt: form.occurredAt,
      lat: form.point?.lat,
      lng: form.point?.lng,
      radiusM: form.radiusM,
    });

    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === "lat" || key === "lng") {
          nextErrors.point = issue.message;
        } else if (
          key === "title" ||
          key === "disasterType" ||
          key === "disasterDetail" ||
          key === "occurredAt" ||
          key === "radiusM"
        ) {
          if (!nextErrors[key]) nextErrors[key] = issue.message;
        }
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setBusy(true);

    try {
      const response = await api.createIncident(parsed.data);
      removeDraft();
      toast.push({
        tone: "success",
        title: "Laporan tersimpan.",
        description: `Kode lacak ${response.data.code}. Lanjutkan mengisi faktor lapangan.`,
      });
      navigate(`/petugas/laporan/${response.data.id}`, { replace: true });
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Laporan belum bisa disimpan. Periksa koneksi, lalu coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  };

  const clearDraft = () => {
    removeDraft();
    setForm(emptyForm());
    setDraftSavedAt(null);
    setErrors({});
    setFormError(undefined);
    setClearOpen(false);
    toast.push({ tone: "info", title: "Draf di perangkat ini sudah dihapus." });
  };

  const radiusKm = formatDistance(form.radiusM);
  const detectedRegion = useMemo(
    () => (form.point ? resolveRegionForPoint(form.point.lat, form.point.lng) : null),
    [form.point],
  );
  const regionLabel = detectedRegion
    ? detectedRegion.name
    : form.point
      ? "Di luar Kota Surabaya"
      : "Titik belum dipilih";

  return (
    <AppShell fullBleed>
      <form onSubmit={(event) => void submit(event)} className="flex min-h-0 flex-1 flex-col" noValidate>
        <MapWorkspace
          storageKey="sialokasi.panel.laporan-baru"
          panelLabel="Formulir laporan"
          sidebar={
            <div className="flex min-h-full flex-col">
              <div className="border-b border-border px-6 pb-5 pt-6">
                <h1 className="text-page text-text">Laporan baru</h1>
                <p className="mt-2 text-base text-text-muted">
                  Tentukan titik dan radius, lalu lanjut ke faktor.
                </p>
                <StepRail
                  steps={["Titik & wilayah", "Faktor & estimasi", "Ajukan"]}
                  current={0}
                  className="mt-5"
                />
              </div>

              <div className="grid gap-7 px-6 py-5">
              {formError ? (
                <Alert tone="danger" title="Laporan belum tersimpan.">
                  {formError}
                </Alert>
              ) : null}

              <Section tone="focus" title="Titik & wilayah">
                <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field id="incident-lat" label="Lintang">
                    <TextInput
                      type="number"
                      step="0.000001"
                      min={-90}
                      max={90}
                      value={form.point?.lat ?? ""}
                      placeholder="-7.2575"
                      onChange={(event) => {
                        const lat =
                          event.target.value === "" ? undefined : Number(event.target.value);
                        updateForm({
                          point:
                            lat === undefined
                              ? null
                              : { lat, lng: form.point?.lng ?? SURABAYA_CENTER.lng },
                        });
                      }}
                    />
                  </Field>

                  <Field id="incident-lng" label="Bujur">
                    <TextInput
                      type="number"
                      step="0.000001"
                      min={-180}
                      max={180}
                      value={form.point?.lng ?? ""}
                      placeholder="112.7521"
                      onChange={(event) => {
                        const lng =
                          event.target.value === "" ? undefined : Number(event.target.value);
                        updateForm({
                          point:
                            lng === undefined
                              ? null
                              : { lat: form.point?.lat ?? SURABAYA_CENTER.lat, lng },
                        });
                      }}
                    />
                  </Field>
                </div>

                <div className="flex items-center justify-between gap-3 border border-border-strong bg-sunken px-4 py-3">
                  <span className="text-base text-text-muted">
                    Kecamatan terdampak · otomatis
                  </span>
                  <span
                    className={
                      detectedRegion ? "text-base font-medium text-text" : "text-base font-medium text-danger"
                    }
                  >
                    {regionLabel}
                  </span>
                </div>

                {errors.point ? (
                  <p className="flex items-start gap-2 text-base text-danger">
                    <AlertTriangle aria-hidden="true" className="mt-1 h-5 w-5 shrink-0" />
                    <span>{errors.point}</span>
                  </p>
                ) : null}

                <div>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <label htmlFor="incident-radius" className="text-base font-medium text-text">
                      Radius wilayah terdampak
                    </label>
                    <span className="font-mono text-[40px] font-medium leading-[44px] tracking-[-0.03em] text-text">
                      {radiusKm}
                    </span>
                  </div>
                  <input
                    id="incident-radius"
                    type="range"
                    min={100}
                    max={5_000}
                    step={100}
                    value={form.radiusM}
                    onChange={(event) => {
                      updateForm({ radiusM: Number(event.target.value) });
                      if (errors.radiusM) setErrors((current) => ({ ...current, radiusM: undefined }));
                    }}
                    className="mt-2 h-11 w-full accent-primary"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3 text-base text-text-muted">
                    <span>100 m</span>
                    <span>5 km</span>
                  </div>
                  {errors.radiusM ? (
                    <p className="flex items-start gap-2 text-base text-danger">
                      <AlertTriangle aria-hidden="true" className="mt-1 h-5 w-5 shrink-0" />
                      <span>{errors.radiusM}</span>
                    </p>
                  ) : null}
                </div>
                </div>
              </Section>

              {duplicates.length > 0 ? (
                <Alert
                  tone="warning"
                  title="Sudah ada laporan dalam radius 200 meter."
                >
                  <p>
                    Periksa apakah laporan ini berbeda. Anda tetap bisa melanjutkan bila memang
                    kejadiannya baru.
                  </p>
                  <ul className="mt-2 space-y-1">
                    {duplicates.map((incident) => (
                      <li key={incident.id}>
                        <span className="font-mono text-info">{incident.code}</span>, {incident.title}
                      </li>
                    ))}
                  </ul>
                </Alert>
              ) : null}

              <Section title="Detail laporan">
                <div className="grid gap-4">
                <Field id="incident-title" label="Judul laporan" error={errors.title} required>
                  <TextInput
                    value={form.title}
                    placeholder="Contoh: Banjir di Wonokromo RW 03"
                    maxLength={120}
                    onChange={(event) => {
                      updateForm({ title: event.target.value });
                      if (errors.title) setErrors((current) => ({ ...current, title: undefined }));
                    }}
                  />
                </Field>

                <Field
                  id="incident-disaster"
                  label="Jenis bencana"
                  error={errors.disasterType}
                  required
                >
                  <SelectInput
                    value={form.disasterType}
                    onChange={(event) => {
                      updateForm({ disasterType: event.target.value as DisasterType });
                      if (errors.disasterType) {
                        setErrors((current) => ({ ...current, disasterType: undefined }));
                      }
                    }}
                  >
                    {DISASTER_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {DISASTER_LABEL[type]}
                      </option>
                    ))}
                  </SelectInput>
                </Field>

                {form.disasterType === "LAINNYA" ? (
                  <Field
                    id="incident-disaster-detail"
                    label="Jenis bencana lainnya"
                    hint="Sebutkan sendiri, misalnya: tanah longsor atau letusan gunung."
                    error={errors.disasterDetail}
                    required
                  >
                    <TextInput
                      value={form.disasterDetail}
                      placeholder="Contoh: Tanah longsor"
                      maxLength={80}
                      onChange={(event) => {
                        updateForm({ disasterDetail: event.target.value });
                        if (errors.disasterDetail) {
                          setErrors((current) => ({ ...current, disasterDetail: undefined }));
                        }
                      }}
                    />
                  </Field>
                ) : null}

                <Field id="incident-time" label="Waktu kejadian" error={errors.occurredAt} required>
                  <TextInput
                    type="datetime-local"
                    value={form.occurredAt}
                    onChange={(event) => {
                      updateForm({ occurredAt: event.target.value });
                      if (errors.occurredAt) {
                        setErrors((current) => ({ ...current, occurredAt: undefined }));
                      }
                    }}
                  />
                </Field>
                </div>
              </Section>

              <div className="border-t border-border pt-4">
                <p className="font-mono text-base text-text-muted">
                  {draftSavedAt
                    ? `Draf tersimpan ${formatTime(draftSavedAt)}`
                    : "Draf tersimpan otomatis di perangkat ini."}
                </p>
                {draftSavedAt ? (
                  <button
                    type="button"
                    onClick={() => setClearOpen(true)}
                    className="mt-2 text-base font-medium text-text underline underline-offset-4"
                  >
                    Hapus draf
                  </button>
                ) : null}
              </div>
              </div>

              <div className="mt-auto flex gap-3 border-t border-border bg-surface px-6 py-4 lg:sticky lg:bottom-0">
                <Button type="submit" size="lg" className="flex-1" disabled={busy}>
                  {busy ? "Sedang menyimpan…" : "Simpan & lanjut"}
                </Button>
                <Link to="/petugas" className={buttonStyles("secondary", "lg", "shrink-0")}>
                  Batal
                </Link>
              </div>
            </div>
          }
        >
          <IncidentLocationPicker
            value={form.point}
            radiusM={form.radiusM}
            onChange={(point) => {
              updateForm({ point });
              if (errors.point) setErrors((current) => ({ ...current, point: undefined }));
            }}
            heightClass="h-full"
            plain
          />
        </MapWorkspace>
      </form>

      <ConfirmDialog
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        onConfirm={clearDraft}
        title="Hapus draf di perangkat ini?"
        description="Semua isian formulir yang belum tersimpan akan hilang. Laporan yang sudah tersimpan di server tidak terpengaruh."
        confirmLabel="Ya, hapus draf"
        cancelLabel="Kembali"
      />
    </AppShell>
  );
}
