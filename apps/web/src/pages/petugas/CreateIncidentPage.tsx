import {
  DISASTER_LABEL,
  DISASTER_TYPES,
  formatDistance,
  formatTime,
  haversineMeters,
  incidentDraftSchema,
  SURABAYA_CENTER,
  type DisasterType,
} from "@sialokasi/shared";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  MapPin,
  Save,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert } from "../../components/Alert";
import { Button, buttonStyles } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Field, SelectInput, TextInput } from "../../components/Field";
import { PageHeader } from "../../components/PageHeader";
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
  occurredAt: string;
  regionId: string;
  point: MapPoint | null;
  radiusM: number;
};

type StoredDraft = {
  savedAt: string;
  form: DraftForm;
};

type FieldErrors = Partial<
  Record<"title" | "disasterType" | "occurredAt" | "regionId" | "point" | "radiusM", string>
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
    occurredAt: toDateTimeLocal(new Date(Date.now() - 30 * 60_000)),
    regionId: "",
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

  const master = useQuery({ queryKey: ["master", "options"], queryFn: api.masterOptions });
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
      occurredAt: form.occurredAt,
      lat: form.point?.lat,
      lng: form.point?.lng,
      radiusM: form.radiusM,
      regionId: form.regionId,
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
          key === "occurredAt" ||
          key === "regionId" ||
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
        description: `Kode lacak ${response.data.code}. Lanjutkan mengisi 8 faktor.`,
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

  return (
    <AppShell>
      <PageHeader
        eyebrow="Laporan baru"
        title="Tandai kejadian di peta"
        description="Tentukan titik kejadian dan wilayah terdampak. Setelah tersimpan, Anda bisa mengisi 8 faktor untuk menghitung kebutuhan bantuan."
        actions={
          <Link to="/petugas" className={buttonStyles("secondary", "md")}>
            <ArrowLeft aria-hidden="true" className="h-5 w-5" />
            Kembali ke dasbor
          </Link>
        }
      />

      <form onSubmit={(event) => void submit(event)} className="mt-6 grid gap-6" noValidate>
        {formError ? (
          <Alert tone="danger" title="Laporan belum tersimpan.">
            {formError}
          </Alert>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
          <section className="min-w-0 rounded-lg border border-border bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-[22px] font-semibold leading-[30px]">Titik & wilayah</h2>
                <p className="mt-1 text-base text-text-muted">
                  Klik peta untuk menaruh titik. Geser titik bila perlu, lalu atur radius.
                </p>
              </div>
              <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border bg-elevated px-3 text-base text-text-muted">
                <MapPin aria-hidden="true" className="h-5 w-5 text-danger" />
                {form.point ? "Titik sudah dipilih" : "Belum ada titik"}
              </span>
            </div>

            <div className="mt-4">
              <IncidentLocationPicker
                value={form.point}
                radiusM={form.radiusM}
                onChange={(point) => {
                  updateForm({ point });
                  if (errors.point) setErrors((current) => ({ ...current, point: undefined }));
                }}
              />
              {errors.point ? (
                <p className="mt-2 flex items-start gap-2 text-base text-danger">
                  <AlertTriangle aria-hidden="true" className="mt-1 h-5 w-5 shrink-0" />
                  <span>{errors.point}</span>
                </p>
              ) : null}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field
                id="incident-lat"
                label="Lintang"
                hint="Bisa diisi langsung bila lebih nyaman daripada menggeser peta."
              >
                <TextInput
                  type="number"
                  step="0.000001"
                  min={-90}
                  max={90}
                  value={form.point?.lat ?? ""}
                  placeholder="-7.2575"
                  onChange={(event) => {
                    const lat = event.target.value === "" ? undefined : Number(event.target.value);
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
                    const lng = event.target.value === "" ? undefined : Number(event.target.value);
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

            <div className="mt-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <label htmlFor="incident-radius" className="text-base font-medium text-text">
                  Radius wilayah terdampak
                </label>
                <span className="font-mono text-[22px] font-medium text-info">{radiusKm}</span>
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
                className="mt-3 h-11 w-full accent-primary"
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-base text-text-muted">
                <span>100 m</span>
                <span>5 km</span>
              </div>
              <Field
                id="incident-radius-number"
                label="Radius dalam meter"
                error={errors.radiusM}
                className="mt-3 max-w-xs"
              >
                <TextInput
                  type="number"
                  min={100}
                  max={5_000}
                  step={100}
                  value={form.radiusM}
                  onChange={(event) => {
                    updateForm({ radiusM: Number(event.target.value) });
                    if (errors.radiusM) {
                      setErrors((current) => ({ ...current, radiusM: undefined }));
                    }
                  }}
                />
              </Field>
            </div>

            {duplicates.length > 0 ? (
              <Alert
                tone="warning"
                title="Sudah ada laporan dalam radius 200 meter."
                className="mt-5"
              >
                <p>
                  Periksa apakah laporan ini berbeda. Anda tetap bisa melanjutkan bila memang
                  kejadiannya baru.
                </p>
                <ul className="mt-2 space-y-1">
                  {duplicates.map((incident) => (
                    <li key={incident.id}>
                      <span className="font-mono text-info">{incident.code}</span> · {incident.title}
                    </li>
                  ))}
                </ul>
              </Alert>
            ) : null}
          </section>

          <section className="min-w-0 rounded-lg border border-border bg-surface p-5">
            <h2 className="text-[22px] font-semibold leading-[30px]">Detail laporan</h2>
            <p className="mt-1 text-base text-text-muted">
              Isi singkat dan jelas. Judul akan tampil di peta publik.
            </p>

            <div className="mt-5 grid gap-5">
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

              <Field id="incident-disaster" label="Jenis bencana" error={errors.disasterType} required>
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

              <Field
                id="incident-region"
                label="Kecamatan terdampak"
                hint="Dipakai untuk menyaring peta dan laporan."
                error={errors.regionId}
                required
              >
                <SelectInput
                  value={form.regionId}
                  disabled={master.isPending}
                  onChange={(event) => {
                    updateForm({ regionId: event.target.value });
                    if (errors.regionId) {
                      setErrors((current) => ({ ...current, regionId: undefined }));
                    }
                  }}
                >
                  <option value="">{master.isPending ? "Memuat kecamatan…" : "Pilih kecamatan"}</option>
                  {(master.data?.regions ?? []).map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.name}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            </div>

            <div className="mt-6 rounded-md border border-border bg-elevated p-4">
              <p className="text-base font-medium text-text">Draf di perangkat ini</p>
              <p className="mt-1 text-base text-text-muted">
                {draftSavedAt
                  ? `Tersimpan pukul ${formatTime(draftSavedAt)}. Draf tidak hilang bila halaman tertutup.`
                  : "Isian akan disimpan otomatis di perangkat ini selama Anda mengisi formulir."}
              </p>
              {draftSavedAt ? (
                <Button
                  variant="ghost"
                  className="mt-2 px-0"
                  leadingIcon={<Trash2 />}
                  onClick={() => setClearOpen(true)}
                >
                  Hapus draf
                </Button>
              ) : null}
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <Button
                type="submit"
                size="lg"
                leadingIcon={<Save />}
                trailingIcon={<ArrowRight />}
                disabled={busy}
              >
                {busy ? "Sedang menyimpan…" : "Simpan & lanjut ke faktor"}
              </Button>
              <Link to="/petugas" className={buttonStyles("secondary", "lg")}>
                Batal, kembali ke dasbor
              </Link>
            </div>
          </section>
        </div>
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
