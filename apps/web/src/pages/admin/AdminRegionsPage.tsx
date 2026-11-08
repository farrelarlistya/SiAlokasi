import {
  formatNumber,
  poskoInputSchema,
  regionInputSchema,
  SURABAYA_CENTER,
} from "@sialokasi/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MapPinned,
  Pencil,
  Plus,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Warehouse,
} from "lucide-react";
import { useDeferredValue, useState, type FormEvent } from "react";
import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { EmptyState } from "../../components/EmptyState";
import { Field, SelectInput, TextInput } from "../../components/Field";
import { LocationPicker } from "../../components/map/LocationPicker";
import { Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { Skeleton } from "../../components/Skeleton";
import { useToast } from "../../components/Toast";
import { AppShell } from "../../layouts/AppShell";
import { api, type AdminPosko, type AdminRegion } from "../../lib/api";
import { cn } from "../../lib/cn";

type Tab = "regions" | "poskos";

type RegionEditor = {
  mode: "create" | "edit";
  target: AdminRegion | null;
  name: string;
};

type PoskoEditor = {
  mode: "create" | "edit";
  target: AdminPosko | null;
  name: string;
  regionId: string;
  lat: string;
  lng: string;
};

type PoskoErrors = Partial<Record<"name" | "regionId" | "lat" | "lng", string>>;

type ConfirmTarget =
  | { kind: "region"; item: AdminRegion }
  | { kind: "posko"; item: AdminPosko }
  | null;

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center gap-2 rounded-full border px-3 text-base",
        active
          ? "border-success/30 bg-success/10 text-success"
          : "border-border bg-hover text-text-muted",
      )}
    >
      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-current" />
      {active ? "Aktif" : "Nonaktif"}
    </span>
  );
}

function toNumber(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function AdminRegionsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>("regions");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const [busy, setBusy] = useState(false);
  const [regionEditor, setRegionEditor] = useState<RegionEditor | null>(null);
  const [regionNameError, setRegionNameError] = useState<string | undefined>();
  const [poskoEditor, setPoskoEditor] = useState<PoskoEditor | null>(null);
  const [poskoErrors, setPoskoErrors] = useState<PoskoErrors>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget>(null);

  const regions = useQuery({ queryKey: ["admin", "regions"], queryFn: api.adminRegions });
  const poskos = useQuery({ queryKey: ["admin", "poskos"], queryFn: api.adminPoskos });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin"] }),
      queryClient.invalidateQueries({ queryKey: ["master", "options"] }),
      queryClient.invalidateQueries({ queryKey: ["stock"] }),
      queryClient.invalidateQueries({ queryKey: ["public", "incidents"] }),
    ]);
  };

  const openCreateRegion = () => {
    setRegionEditor({ mode: "create", target: null, name: "" });
    setRegionNameError(undefined);
    setFormError(undefined);
  };

  const openEditRegion = (region: AdminRegion) => {
    setRegionEditor({ mode: "edit", target: region, name: region.name });
    setRegionNameError(undefined);
    setFormError(undefined);
  };

  const submitRegion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!regionEditor) return;
    setFormError(undefined);

    const parsed = regionInputSchema.safeParse({ name: regionEditor.name });
    if (!parsed.success) {
      setRegionNameError(parsed.error.issues[0]?.message ?? "Periksa nama kecamatan.");
      return;
    }

    setRegionNameError(undefined);
    setBusy(true);

    try {
      const response =
        regionEditor.mode === "create"
          ? await api.createRegion(parsed.data)
          : await api.updateRegion(regionEditor.target?.id ?? "", parsed.data);
      toast.push({ tone: "success", title: response.message });
      await refresh();
      setRegionEditor(null);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Kecamatan belum bisa disimpan. Periksa koneksi, lalu coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  };

  const openCreatePosko = () => {
    setPoskoEditor({
      mode: "create",
      target: null,
      name: "",
      regionId: "",
      lat: String(SURABAYA_CENTER.lat),
      lng: String(SURABAYA_CENTER.lng),
    });
    setPoskoErrors({});
    setFormError(undefined);
  };

  const openEditPosko = (posko: AdminPosko) => {
    setPoskoEditor({
      mode: "edit",
      target: posko,
      name: posko.name,
      regionId: posko.regionId,
      lat: String(posko.lat),
      lng: String(posko.lng),
    });
    setPoskoErrors({});
    setFormError(undefined);
  };

  const submitPosko = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!poskoEditor) return;
    setFormError(undefined);

    const parsed = poskoInputSchema.safeParse({
      name: poskoEditor.name,
      regionId: poskoEditor.regionId,
      lat: poskoEditor.lat,
      lng: poskoEditor.lng,
    });

    if (!parsed.success) {
      const nextErrors: PoskoErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if ((key === "name" || key === "regionId" || key === "lat" || key === "lng") && !nextErrors[key]) {
          nextErrors[key] = issue.message;
        }
      }
      setPoskoErrors(nextErrors);
      return;
    }

    setPoskoErrors({});
    setBusy(true);

    try {
      const response =
        poskoEditor.mode === "create"
          ? await api.createPosko(parsed.data)
          : await api.updatePosko(poskoEditor.target?.id ?? "", parsed.data);
      toast.push({ tone: "success", title: response.message });
      await refresh();
      setPoskoEditor(null);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Posko belum bisa disimpan. Periksa koneksi, lalu coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  };

  const toggleRegion = async (region: AdminRegion) => {
    setBusy(true);
    try {
      const response = await api.updateRegion(region.id, { isActive: !region.isActive });
      toast.push({ tone: "success", title: response.message });
      await refresh();
      setConfirmTarget(null);
    } catch (error) {
      toast.push({
        tone: "danger",
        title: "Status kecamatan belum berubah.",
        description:
          error instanceof Error ? error.message : "Periksa koneksi, lalu coba lagi.",
      });
    } finally {
      setBusy(false);
    }
  };

  const togglePosko = async (posko: AdminPosko) => {
    setBusy(true);
    try {
      const response = await api.updatePosko(posko.id, { isActive: !posko.isActive });
      toast.push({ tone: "success", title: response.message });
      await refresh();
      setConfirmTarget(null);
    } catch (error) {
      toast.push({
        tone: "danger",
        title: "Status posko belum berubah.",
        description:
          error instanceof Error ? error.message : "Periksa koneksi, lalu coba lagi.",
      });
    } finally {
      setBusy(false);
    }
  };

  const searchText = deferredSearch.trim().toLowerCase();
  const regionList = (regions.data?.regions ?? []).filter(
    (region) => searchText === "" || region.name.toLowerCase().includes(searchText),
  );
  const poskoList = (poskos.data?.poskos ?? []).filter(
    (posko) =>
      searchText === "" ||
      posko.name.toLowerCase().includes(searchText) ||
      posko.regionName.toLowerCase().includes(searchText),
  );

  const activeRegions = (regions.data?.regions ?? []).filter(
    (region) => region.isActive || region.id === poskoEditor?.regionId,
  );

  const pickerLat = toNumber(poskoEditor?.lat ?? "", SURABAYA_CENTER.lat);
  const pickerLng = toNumber(poskoEditor?.lng ?? "", SURABAYA_CENTER.lng);

  const isRegionTab = tab === "regions";
  const total = isRegionTab ? regions.data?.summary.total : poskos.data?.summary.total;
  const activeTotal = isRegionTab ? regions.data?.summary.active : poskos.data?.summary.active;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Data master"
        title="Wilayah & posko"
        description="Kelola kecamatan dan titik posko. Data yang dinonaktifkan tidak muncul di pilihan baru, tetapi laporan lama tetap utuh."
        actions={
          <>
            <Button
              variant="secondary"
              leadingIcon={<RefreshCw />}
              onClick={() => void Promise.all([regions.refetch(), poskos.refetch()])}
              disabled={regions.isRefetching || poskos.isRefetching}
            >
              {regions.isRefetching || poskos.isRefetching ? "Sedang memuat…" : "Muat ulang"}
            </Button>
            <Button
              leadingIcon={<Plus />}
              onClick={isRegionTab ? openCreateRegion : openCreatePosko}
            >
              {isRegionTab ? "Tambah kecamatan" : "Tambah posko"}
            </Button>
          </>
        }
      />

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div role="tablist" aria-label="Pilih data wilayah atau posko" className="inline-flex rounded-md border border-border bg-surface p-1">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "regions"}
            onClick={() => setTab("regions")}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-sm px-4 text-base transition-colors",
              tab === "regions" ? "bg-hover text-text" : "text-text-muted hover:text-text",
            )}
          >
            <MapPinned aria-hidden="true" className="h-5 w-5" />
            Kecamatan
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "poskos"}
            onClick={() => setTab("poskos")}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-sm px-4 text-base transition-colors",
              tab === "poskos" ? "bg-hover text-text" : "text-text-muted hover:text-text",
            )}
          >
            <Warehouse aria-hidden="true" className="h-5 w-5" />
            Posko
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <Field id="wilayah-search" label="Cari nama">
            <TextInput
              type="search"
              value={search}
              placeholder={isRegionTab ? "Contoh: Gubeng" : "Contoh: Posko Rungkut"}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Field>
          <p className="pb-3 text-base text-text-muted">
            {total === undefined ? "Memuat…" : `${formatNumber(activeTotal ?? 0)} aktif dari ${formatNumber(total)}`}
          </p>
        </div>
      </div>

      <section className="mt-4 overflow-hidden rounded-lg border border-border bg-surface">
        {isRegionTab ? (
          regions.isPending ? (
            <div className="space-y-3 p-5" aria-busy="true">
              <span className="sr-only">Sedang memuat kecamatan</span>
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : regions.isError ? (
            <div className="p-5">
              <Alert
                tone="danger"
                title="Daftar kecamatan belum bisa dimuat."
                action={
                  <Button variant="secondary" onClick={() => void regions.refetch()}>
                    Coba lagi
                  </Button>
                }
              >
                Periksa koneksi, lalu tekan Coba lagi.
              </Alert>
            </div>
          ) : regionList.length === 0 ? (
            <div className="p-5">
              <EmptyState
                compact
                icon={<MapPinned />}
                title={searchText ? "Tidak ada kecamatan yang cocok." : "Belum ada kecamatan."}
                description={
                  searchText
                    ? "Ubah kata kunci pencarian untuk melihat kecamatan lain."
                    : "Tambahkan kecamatan pertama agar petugas bisa memilih wilayah tugas."
                }
                action={
                  searchText ? (
                    <Button variant="secondary" onClick={() => setSearch("")}>
                      Bersihkan pencarian
                    </Button>
                  ) : (
                    <Button leadingIcon={<Plus />} onClick={openCreateRegion}>
                      Tambah kecamatan
                    </Button>
                  )
                }
              />
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full border-collapse text-left text-base">
                  <caption className="sr-only">Daftar kecamatan di Kota Surabaya</caption>
                  <thead>
                    <tr className="border-b border-border bg-elevated text-text-muted">
                      <th scope="col" className="px-4 py-3 font-medium">Kecamatan</th>
                      <th scope="col" className="px-4 py-3 font-medium">Posko</th>
                      <th scope="col" className="px-4 py-3 font-medium">Laporan</th>
                      <th scope="col" className="px-4 py-3 font-medium">Akun petugas</th>
                      <th scope="col" className="px-4 py-3 font-medium">Status</th>
                      <th scope="col" className="px-4 py-3 text-right font-medium">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {regionList.map((region) => (
                      <tr key={region.id} className="align-top">
                        <td className="px-4 py-4 font-medium text-text">{region.name}</td>
                        <td className="px-4 py-4">{formatNumber(region.poskoCount)}</td>
                        <td className="px-4 py-4">{formatNumber(region.incidentCount)}</td>
                        <td className="px-4 py-4">{formatNumber(region.userCount)}</td>
                        <td className="px-4 py-4"><StatusBadge active={region.isActive} /></td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              variant="secondary"
                              leadingIcon={<Pencil />}
                              onClick={() => openEditRegion(region)}
                            >
                              Ubah
                            </Button>
                            {region.isActive ? (
                              <Button
                                variant="outlineDanger"
                                leadingIcon={<ToggleLeft />}
                                onClick={() => setConfirmTarget({ kind: "region", item: region })}
                              >
                                Nonaktifkan
                              </Button>
                            ) : (
                              <Button
                                variant="secondary"
                                leadingIcon={<ToggleRight />}
                                disabled={busy}
                                onClick={() => void toggleRegion(region)}
                              >
                                Aktifkan
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-border md:hidden">
                {regionList.map((region) => (
                  <li key={region.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-text">{region.name}</p>
                        <p className="mt-1 text-base text-text-muted">
                          {formatNumber(region.poskoCount)} posko · {formatNumber(region.incidentCount)} laporan
                        </p>
                      </div>
                      <StatusBadge active={region.isActive} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="secondary" leadingIcon={<Pencil />} onClick={() => openEditRegion(region)}>
                        Ubah
                      </Button>
                      {region.isActive ? (
                        <Button
                          variant="outlineDanger"
                          leadingIcon={<ToggleLeft />}
                          onClick={() => setConfirmTarget({ kind: "region", item: region })}
                        >
                          Nonaktifkan
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          leadingIcon={<ToggleRight />}
                          disabled={busy}
                          onClick={() => void toggleRegion(region)}
                        >
                          Aktifkan
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )
        ) : poskos.isPending ? (
          <div className="space-y-3 p-5" aria-busy="true">
            <span className="sr-only">Sedang memuat posko</span>
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : poskos.isError ? (
          <div className="p-5">
            <Alert
              tone="danger"
              title="Daftar posko belum bisa dimuat."
              action={
                <Button variant="secondary" onClick={() => void poskos.refetch()}>
                  Coba lagi
                </Button>
              }
            >
              Periksa koneksi, lalu tekan Coba lagi.
            </Alert>
          </div>
        ) : poskoList.length === 0 ? (
          <div className="p-5">
            <EmptyState
              compact
              icon={<Warehouse />}
              title={searchText ? "Tidak ada posko yang cocok." : "Belum ada posko."}
              description={
                searchText
                  ? "Ubah kata kunci pencarian untuk melihat posko lain."
                  : "Tambahkan posko pertama agar izin distribusi punya tujuan yang jelas."
              }
              action={
                searchText ? (
                  <Button variant="secondary" onClick={() => setSearch("")}>
                    Bersihkan pencarian
                  </Button>
                ) : (
                  <Button leadingIcon={<Plus />} onClick={openCreatePosko}>
                    Tambah posko
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left text-base">
                <caption className="sr-only">Daftar posko bantuan</caption>
                <thead>
                  <tr className="border-b border-border bg-elevated text-text-muted">
                    <th scope="col" className="px-4 py-3 font-medium">Posko</th>
                    <th scope="col" className="px-4 py-3 font-medium">Kecamatan</th>
                    <th scope="col" className="px-4 py-3 font-medium">Koordinat</th>
                    <th scope="col" className="px-4 py-3 font-medium">Stok / izin</th>
                    <th scope="col" className="px-4 py-3 font-medium">Status</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {poskoList.map((posko) => (
                    <tr key={posko.id} className="align-top">
                      <td className="px-4 py-4 font-medium text-text">{posko.name}</td>
                      <td className="px-4 py-4">
                        {posko.regionName}
                        {posko.regionActive ? null : (
                          <span className="ml-2 text-text-muted">(nonaktif)</span>
                        )}
                      </td>
                      <td className="px-4 py-4 font-mono text-text-muted">
                        {posko.lat.toFixed(5)}, {posko.lng.toFixed(5)}
                      </td>
                      <td className="px-4 py-4">
                        {formatNumber(posko.stockRows)} baris stok · {formatNumber(posko.permitCount)} izin
                      </td>
                      <td className="px-4 py-4"><StatusBadge active={posko.isActive} /></td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            variant="secondary"
                            leadingIcon={<Pencil />}
                            onClick={() => openEditPosko(posko)}
                          >
                            Ubah
                          </Button>
                          {posko.isActive ? (
                            <Button
                              variant="outlineDanger"
                              leadingIcon={<ToggleLeft />}
                              onClick={() => setConfirmTarget({ kind: "posko", item: posko })}
                            >
                              Nonaktifkan
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              leadingIcon={<ToggleRight />}
                              disabled={busy}
                              onClick={() => void togglePosko(posko)}
                            >
                              Aktifkan
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-border md:hidden">
              {poskoList.map((posko) => (
                <li key={posko.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-text">{posko.name}</p>
                      <p className="mt-1 text-base text-text-muted">{posko.regionName}</p>
                      <p className="mt-1 font-mono text-base text-text-muted">
                        {posko.lat.toFixed(5)}, {posko.lng.toFixed(5)}
                      </p>
                    </div>
                    <StatusBadge active={posko.isActive} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="secondary" leadingIcon={<Pencil />} onClick={() => openEditPosko(posko)}>
                      Ubah
                    </Button>
                    {posko.isActive ? (
                      <Button
                        variant="outlineDanger"
                        leadingIcon={<ToggleLeft />}
                        onClick={() => setConfirmTarget({ kind: "posko", item: posko })}
                      >
                        Nonaktifkan
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        leadingIcon={<ToggleRight />}
                        disabled={busy}
                        onClick={() => void togglePosko(posko)}
                      >
                        Aktifkan
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <Modal
        open={regionEditor !== null}
        onClose={() => setRegionEditor(null)}
        title={regionEditor?.mode === "edit" ? "Ubah kecamatan" : "Tambah kecamatan"}
        description="Nama kecamatan dipakai di laporan, filter peta, dan data posko."
        footer={
          <>
            <Button variant="secondary" onClick={() => setRegionEditor(null)} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" form="form-region" disabled={busy}>
              {busy ? "Sedang menyimpan…" : "Simpan"}
            </Button>
          </>
        }
      >
        {formError ? (
          <Alert tone="danger" title="Kecamatan belum tersimpan." className="mb-4">
            {formError}
          </Alert>
        ) : null}

        {regionEditor ? (
          <form id="form-region" onSubmit={(event) => void submitRegion(event)} className="grid gap-5" noValidate>
            <Field id="region-name" label="Nama kecamatan" error={regionNameError} required>
              <TextInput
                data-autofocus
                value={regionEditor.name}
                placeholder="Contoh: Tambaksari"
                onChange={(event) => {
                  setRegionEditor({ ...regionEditor, name: event.target.value });
                  if (regionNameError) setRegionNameError(undefined);
                }}
              />
            </Field>
          </form>
        ) : null}
      </Modal>

      <Modal
        open={poskoEditor !== null}
        onClose={() => setPoskoEditor(null)}
        size="lg"
        title={poskoEditor?.mode === "edit" ? "Ubah posko" : "Tambah posko"}
        description="Titik posko dipakai sebagai tujuan izin distribusi. Klik peta atau isi koordinatnya langsung."
        footer={
          <>
            <Button variant="secondary" onClick={() => setPoskoEditor(null)} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" form="form-posko" disabled={busy}>
              {busy ? "Sedang menyimpan…" : "Simpan posko"}
            </Button>
          </>
        }
      >
        {formError ? (
          <Alert tone="danger" title="Posko belum tersimpan." className="mb-4">
            {formError}
          </Alert>
        ) : null}

        {poskoEditor ? (
          <form id="form-posko" onSubmit={(event) => void submitPosko(event)} className="grid gap-5" noValidate>
            <Field id="posko-name" label="Nama posko" error={poskoErrors.name} required>
              <TextInput
                data-autofocus
                value={poskoEditor.name}
                placeholder="Contoh: Posko Rungkut"
                onChange={(event) => {
                  setPoskoEditor({ ...poskoEditor, name: event.target.value });
                  if (poskoErrors.name) setPoskoErrors((current) => ({ ...current, name: undefined }));
                }}
              />
            </Field>

            <Field id="posko-region" label="Kecamatan" error={poskoErrors.regionId} required>
              <SelectInput
                value={poskoEditor.regionId}
                onChange={(event) => {
                  setPoskoEditor({ ...poskoEditor, regionId: event.target.value });
                  if (poskoErrors.regionId) {
                    setPoskoErrors((current) => ({ ...current, regionId: undefined }));
                  }
                }}
              >
                <option value="">Pilih kecamatan</option>
                {activeRegions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                    {region.isActive ? "" : " (nonaktif)"}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="posko-lat"
                label="Lintang"
                hint="Contoh: -7.2575"
                error={poskoErrors.lat}
                required
              >
                <TextInput
                  type="number"
                  step="0.000001"
                  min={-90}
                  max={90}
                  value={poskoEditor.lat}
                  onChange={(event) => {
                    setPoskoEditor({ ...poskoEditor, lat: event.target.value });
                    if (poskoErrors.lat) setPoskoErrors((current) => ({ ...current, lat: undefined }));
                  }}
                />
              </Field>
              <Field
                id="posko-lng"
                label="Bujur"
                hint="Contoh: 112.7521"
                error={poskoErrors.lng}
                required
              >
                <TextInput
                  type="number"
                  step="0.000001"
                  min={-180}
                  max={180}
                  value={poskoEditor.lng}
                  onChange={(event) => {
                    setPoskoEditor({ ...poskoEditor, lng: event.target.value });
                    if (poskoErrors.lng) setPoskoErrors((current) => ({ ...current, lng: undefined }));
                  }}
                />
              </Field>
            </div>

            <div>
              <p className="mb-2 text-base font-medium text-text">Titik posko di peta</p>
              <LocationPicker
                className="rounded-md border border-border"
                value={{ lat: pickerLat, lng: pickerLng }}
                onChange={(value) =>
                  setPoskoEditor({
                    ...poskoEditor,
                    lat: value.lat.toFixed(6),
                    lng: value.lng.toFixed(6),
                  })
                }
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                onClick={() =>
                  setPoskoEditor({
                    ...poskoEditor,
                    lat: String(SURABAYA_CENTER.lat),
                    lng: String(SURABAYA_CENTER.lng),
                  })
                }
              >
                Kembali ke pusat kota
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={confirmTarget !== null}
        onClose={() => setConfirmTarget(null)}
        onConfirm={() => {
          if (!confirmTarget) return;
          if (confirmTarget.kind === "region") {
            void toggleRegion(confirmTarget.item);
          } else {
            void togglePosko(confirmTarget.item);
          }
        }}
        busy={busy}
        title={
          confirmTarget
            ? `Nonaktifkan ${confirmTarget.kind === "region" ? "kecamatan" : "posko"} "${confirmTarget.item.name}"?`
            : "Nonaktifkan data?"
        }
        description={
          confirmTarget?.kind === "region"
            ? "Kecamatan ini hilang dari pilihan baru. Nonaktifkan poskonya lebih dahulu bila masih ada. Laporan lama tetap menyimpan nama kecamatan."
            : "Posko ini hilang dari pilihan tujuan baru. Izin lama yang memakai posko ini tetap tersimpan."
        }
        confirmLabel="Ya, nonaktifkan"
        cancelLabel="Kembali"
      />
    </AppShell>
  );
}
