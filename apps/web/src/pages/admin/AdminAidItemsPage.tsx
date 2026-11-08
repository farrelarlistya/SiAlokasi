import {
  AID_ICON_LABEL,
  AID_ICON_NAMES,
  aidItemInputSchema,
  formatNumber,
  type AidIconName,
} from "@sialokasi/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, Pencil, Plus, RefreshCw, ToggleLeft, ToggleRight } from "lucide-react";
import { useDeferredValue, useState, type FormEvent } from "react";
import { AidIcon } from "../../components/AidIcon";
import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { EmptyState } from "../../components/EmptyState";
import { Field, SelectInput, TextInput } from "../../components/Field";
import { Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { Skeleton } from "../../components/Skeleton";
import { useToast } from "../../components/Toast";
import { AppShell } from "../../layouts/AppShell";
import { api, type AdminAidItem } from "../../lib/api";
import { cn } from "../../lib/cn";

type EditorState = {
  mode: "create" | "edit";
  target: AdminAidItem | null;
  name: string;
  unit: string;
  icon: AidIconName;
  standardPerPerson: string;
};

type FieldErrors = Partial<Record<"name" | "unit" | "icon" | "standardPerPerson", string>>;

const EMPTY_EDITOR: EditorState = {
  mode: "create",
  target: null,
  name: "",
  unit: "",
  icon: "package",
  standardPerPerson: "0",
};

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

export function AdminAidItemsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [statusFilter, setStatusFilter] = useState("");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<AdminAidItem | null>(null);

  const items = useQuery({ queryKey: ["admin", "aid-items"], queryFn: api.adminAidItems });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "aid-items"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "summary"] }),
      queryClient.invalidateQueries({ queryKey: ["master", "options"] }),
    ]);
  };

  const openCreate = () => {
    setEditor({ ...EMPTY_EDITOR });
    setErrors({});
    setFormError(undefined);
  };

  const openEdit = (item: AdminAidItem) => {
    setEditor({
      mode: "edit",
      target: item,
      name: item.name,
      unit: item.unit,
      icon: (AID_ICON_NAMES.includes(item.icon as AidIconName)
        ? item.icon
        : "package") as AidIconName,
      standardPerPerson: String(item.standardPerPerson),
    });
    setErrors({});
    setFormError(undefined);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor) return;
    setFormError(undefined);

    const parsed = aidItemInputSchema.safeParse({
      name: editor.name,
      unit: editor.unit,
      icon: editor.icon,
      standardPerPerson: editor.standardPerPerson,
    });

    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (
          (key === "name" ||
            key === "unit" ||
            key === "icon" ||
            key === "standardPerPerson") &&
          !nextErrors[key]
        ) {
          nextErrors[key] = issue.message;
        }
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setBusy(true);

    try {
      const response =
        editor.mode === "create"
          ? await api.createAidItem(parsed.data)
          : await api.updateAidItem(editor.target?.id ?? "", parsed.data);
      toast.push({ tone: "success", title: response.message });
      await refresh();
      setEditor(null);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Data belum bisa disimpan. Periksa koneksi, lalu coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (item: AdminAidItem) => {
    setBusy(true);
    try {
      const response = await api.updateAidItem(item.id, { isActive: !item.isActive });
      toast.push({ tone: "success", title: response.message });
      await refresh();
    } catch (error) {
      toast.push({
        tone: "danger",
        title: "Status belum berubah.",
        description:
          error instanceof Error
            ? error.message
            : "Periksa koneksi, lalu coba lagi.",
      });
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async () => {
    if (!deactivateTarget) return;
    setBusy(true);
    try {
      const response = await api.updateAidItem(deactivateTarget.id, { isActive: false });
      toast.push({ tone: "success", title: response.message });
      await refresh();
      setDeactivateTarget(null);
    } catch (error) {
      toast.push({
        tone: "danger",
        title: "Jenis bantuan belum bisa dinonaktifkan.",
        description:
          error instanceof Error ? error.message : "Periksa koneksi, lalu coba lagi.",
      });
    } finally {
      setBusy(false);
    }
  };

  const allItems = items.data?.items ?? [];
  const searchText = deferredSearch.trim().toLowerCase();
  const list = allItems.filter((item) => {
    const matchesSearch =
      searchText === "" ||
      item.name.toLowerCase().includes(searchText) ||
      item.unit.toLowerCase().includes(searchText);
    const matchesStatus =
      statusFilter === "" ||
      (statusFilter === "active" && item.isActive) ||
      (statusFilter === "inactive" && !item.isActive);
    return matchesSearch && matchesStatus;
  });
  const hasFilter = searchText !== "" || statusFilter !== "";

  return (
    <AppShell>
      <PageHeader
        eyebrow="Data master"
        title="Jenis bantuan"
        description="Atur daftar bantuan yang dipakai saat menghitung kebutuhan. Menonaktifkan item tidak menghapus data laporan lama."
        actions={
          <>
            <Button
              variant="secondary"
              leadingIcon={<RefreshCw />}
              onClick={() => void items.refetch()}
              disabled={items.isRefetching}
            >
              {items.isRefetching ? "Sedang memuat…" : "Muat ulang"}
            </Button>
            <Button leadingIcon={<Plus />} onClick={openCreate}>
              Tambah jenis bantuan
            </Button>
          </>
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-base text-text-muted">Total item</p>
          <p className="mt-1 text-[28px] font-bold leading-[36px]">
            {items.isPending ? "…" : formatNumber(items.data?.summary.total ?? 0)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-base text-text-muted">Aktif</p>
          <p className="mt-1 text-[28px] font-bold leading-[36px] text-success">
            {items.isPending ? "…" : formatNumber(items.data?.summary.active ?? 0)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-base text-text-muted">Nonaktif</p>
          <p className="mt-1 text-[28px] font-bold leading-[36px] text-text-muted">
            {items.isPending ? "…" : formatNumber(items.data?.summary.inactive ?? 0)}
          </p>
        </div>
      </div>

      <section aria-label="Saringan jenis bantuan" className="mt-4 rounded-lg border border-border bg-surface p-5">
        <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Field id="aid-search" label="Cari nama atau satuan">
            <TextInput
              type="search"
              value={search}
              placeholder="Contoh: air atau liter"
              onChange={(event) => setSearch(event.target.value)}
            />
          </Field>
          <Field id="aid-status" label="Status item">
            <SelectInput
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">Semua status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </SelectInput>
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-base text-text-muted">
            {items.isPending
              ? "Sedang memuat jenis bantuan…"
              : `${list.length} item ditampilkan${hasFilter ? " sesuai saringan" : ""}.`}
          </p>
          {hasFilter ? (
            <Button
              variant="ghost"
              onClick={() => {
                setSearch("");
                setStatusFilter("");
              }}
            >
              Bersihkan saringan
            </Button>
          ) : null}
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-lg border border-border bg-surface">
        {items.isPending ? (
          <div className="space-y-3 p-5" aria-busy="true">
            <span className="sr-only">Sedang memuat jenis bantuan</span>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : items.isError ? (
          <div className="p-5">
            <Alert
              tone="danger"
              title="Daftar jenis bantuan belum bisa dimuat."
              action={
                <Button variant="secondary" onClick={() => void items.refetch()}>
                  Coba lagi
                </Button>
              }
            >
              Periksa koneksi, lalu tekan Coba lagi.
            </Alert>
          </div>
        ) : list.length === 0 ? (
          <div className="p-5">
            <EmptyState
              compact
              icon={<Package />}
              title={hasFilter ? "Tidak ada item yang cocok." : "Belum ada jenis bantuan."}
              description={
                hasFilter
                  ? "Ubah kata kunci atau status untuk melihat item lain."
                  : "Tambahkan jenis bantuan pertama agar petugas bisa memilihnya di laporan."
              }
              action={
                hasFilter ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("");
                    }}
                  >
                    Bersihkan saringan
                  </Button>
                ) : (
                  <Button leadingIcon={<Plus />} onClick={openCreate}>
                    Tambah jenis bantuan
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left text-base">
                <caption className="sr-only">Daftar jenis bantuan logistik</caption>
                <thead>
                  <tr className="border-b border-border bg-elevated text-text-muted">
                    <th scope="col" className="px-4 py-3 font-medium">Jenis bantuan</th>
                    <th scope="col" className="px-4 py-3 font-medium">Satuan</th>
                    <th scope="col" className="px-4 py-3 font-medium">Standar per jiwa</th>
                    <th scope="col" className="px-4 py-3 font-medium">Dipakai di laporan</th>
                    <th scope="col" className="px-4 py-3 font-medium">Status</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {list.map((item) => (
                    <tr key={item.id} className="align-top">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <AidIcon name={item.icon} framed />
                          <div>
                            <p className="font-medium text-text">{item.name}</p>
                            <p className="mt-1 text-text-muted">Urutan {item.sortOrder}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">{item.unit}</td>
                      <td className="px-4 py-4">{formatNumber(item.standardPerPerson)}</td>
                      <td className="px-4 py-4">
                        {item.usageCount === 0
                          ? "Belum dipakai"
                          : `${formatNumber(item.usageCount)} baris rekomendasi`}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge active={item.isActive} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            variant="secondary"
                            leadingIcon={<Pencil />}
                            onClick={() => openEdit(item)}
                          >
                            Ubah
                          </Button>
                          {item.isActive ? (
                            <Button
                              variant="outlineDanger"
                              leadingIcon={<ToggleLeft />}
                              onClick={() => setDeactivateTarget(item)}
                            >
                              Nonaktifkan
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              leadingIcon={<ToggleRight />}
                              disabled={busy}
                              onClick={() => void toggleActive(item)}
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
              {list.map((item) => (
                <li key={item.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <AidIcon name={item.icon} framed />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium text-text">{item.name}</p>
                        <StatusBadge active={item.isActive} />
                      </div>
                      <p className="mt-1 text-base text-text-muted">
                        {item.unit} · standar {formatNumber(item.standardPerPerson)} per jiwa
                      </p>
                      <p className="mt-1 text-base text-text-muted">
                        {item.usageCount === 0
                          ? "Belum dipakai di laporan"
                          : `${formatNumber(item.usageCount)} baris rekomendasi`}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="secondary" leadingIcon={<Pencil />} onClick={() => openEdit(item)}>
                      Ubah
                    </Button>
                    {item.isActive ? (
                      <Button
                        variant="outlineDanger"
                        leadingIcon={<ToggleLeft />}
                        onClick={() => setDeactivateTarget(item)}
                      >
                        Nonaktifkan
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        leadingIcon={<ToggleRight />}
                        disabled={busy}
                        onClick={() => void toggleActive(item)}
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
        open={editor !== null}
        onClose={() => setEditor(null)}
        title={editor?.mode === "edit" ? "Ubah jenis bantuan" : "Tambah jenis bantuan"}
        description="Perubahan di sini dipakai saat menghitung rekomendasi baru. Laporan lama tetap memakai data yang sudah tercatat."
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditor(null)} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" form="form-aid-item" disabled={busy}>
              {busy ? "Sedang menyimpan…" : "Simpan"}
            </Button>
          </>
        }
      >
        {formError ? (
          <Alert tone="danger" title="Data belum tersimpan." className="mb-4">
            {formError}
          </Alert>
        ) : null}

        {editor ? (
          <form id="form-aid-item" onSubmit={(event) => void submit(event)} className="grid gap-5" noValidate>
            <Field id="aid-name" label="Nama jenis bantuan" error={errors.name} required>
              <TextInput
                data-autofocus
                value={editor.name}
                placeholder="Contoh: Air bersih"
                onChange={(event) => {
                  setEditor({ ...editor, name: event.target.value });
                  if (errors.name) setErrors((current) => ({ ...current, name: undefined }));
                }}
              />
            </Field>

            <Field
              id="aid-unit"
              label="Satuan"
              hint="Tulis satuan yang dipakai di lapangan, contoh: liter, paket, unit."
              error={errors.unit}
              required
            >
              <TextInput
                value={editor.unit}
                placeholder="Contoh: liter"
                onChange={(event) => {
                  setEditor({ ...editor, unit: event.target.value });
                  if (errors.unit) setErrors((current) => ({ ...current, unit: undefined }));
                }}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <Field id="aid-icon" label="Ikon" error={errors.icon} required>
                <SelectInput
                  value={editor.icon}
                  onChange={(event) => {
                    setEditor({ ...editor, icon: event.target.value as AidIconName });
                    if (errors.icon) setErrors((current) => ({ ...current, icon: undefined }));
                  }}
                >
                  {AID_ICON_NAMES.map((icon) => (
                    <option key={icon} value={icon}>
                      {AID_ICON_LABEL[icon]}
                    </option>
                  ))}
                </SelectInput>
              </Field>

              <div className="flex items-center gap-3 pb-1">
                <AidIcon name={editor.icon} framed />
                <span className="text-base text-text-muted">Pratinjau ikon</span>
              </div>
            </div>

            <Field
              id="aid-standard"
              label="Standar per jiwa"
              hint="Angka acuan untuk perhitungan otomatis. Boleh desimal, hasil akhir tetap bilangan bulat."
              error={errors.standardPerPerson}
              required
            >
              <TextInput
                type="number"
                min={0}
                max={1000}
                step="0.01"
                value={editor.standardPerPerson}
                onChange={(event) => {
                  setEditor({ ...editor, standardPerPerson: event.target.value });
                  if (errors.standardPerPerson) {
                    setErrors((current) => ({ ...current, standardPerPerson: undefined }));
                  }
                }}
              />
            </Field>
          </form>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={deactivateTarget !== null}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={() => void deactivate()}
        busy={busy}
        title={
          deactivateTarget
            ? `Nonaktifkan "${deactivateTarget.name}"?`
            : "Nonaktifkan jenis bantuan?"
        }
        description="Item ini hilang dari pilihan formulir baru, tetapi tetap tampil di laporan lama dan riwayat rekomendasi. Anda bisa mengaktifkannya kembali kapan saja."
        confirmLabel="Ya, nonaktifkan"
        cancelLabel="Kembali"
      />
    </AppShell>
  );
}
