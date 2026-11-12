import {
  formatDateTime,
  ROLE_LABEL,
  STATUS_LABEL,
  type IncidentStatus,
} from "@sialokasi/shared";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  Filter,
  RefreshCw,
  ScrollText,
  ShieldCheck,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { Field, SelectInput, TextInput } from "../../components/Field";
import { PageHeader } from "../../components/PageHeader";
import { Section } from "../../components/Section";
import { Skeleton } from "../../components/Skeleton";
import { StatusChip } from "../../components/StatusChip";
import { AppShell } from "../../layouts/AppShell";
import { api } from "../../lib/api";
import { cn } from "../../lib/cn";

const ACTION_LABEL: Record<string, string> = {
  BUAT: "Menambah data",
  UBAH: "Mengubah data",
  NONAKTIFKAN: "Menonaktifkan",
  AKTIFKAN: "Mengaktifkan",
  UBAH_PERAN: "Mengubah peran",
  REGISTER: "Pendaftaran akun",
  REGISTER_ULANG: "Memperbarui pendaftaran",
  HITUNG_ESTIMASI: "Menghitung estimasi",
  AJUKAN: "Mengajukan laporan",
  BATALKAN: "Membatalkan laporan",
  SETUJUI: "Menyetujui laporan",
  TOLAK: "Menolak laporan",
  SELESAI: "Menandai distribusi selesai",
  UBAH_JUMLAH: "Mengubah jumlah bantuan",
  KOREKSI_IZIN: "Mengoreksi izin",
  ISI_CONTOH: "Mengisi contoh demo",
};

const ENTITY_LABEL: Record<string, string> = {
  User: "Akun",
  AidItem: "Jenis bantuan",
  Region: "Kecamatan",
  Posko: "Posko",
  Incident: "Laporan kejadian",
  RecommendationItem: "Baris bantuan",
};

const PAGE_SIZE = 20;

function formatJson(value: unknown): string {
  if (value === null || value === undefined) return "-";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function AdminAuditPage() {
  const [tab, setTab] = useState<"audit" | "logs">("audit");
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const [searchText, setSearchText] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [logPage, setLogPage] = useState(0);

  const audit = useQuery({
    queryKey: ["admin", "audit", entity, action, appliedSearch, page],
    queryFn: () =>
      api.adminAudit({
        entity: entity || undefined,
        action: action || undefined,
        search: appliedSearch || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
  });

  const logs = useQuery({
    queryKey: ["admin", "incident-logs", logPage],
    queryFn: () => api.adminIncidentLogs(PAGE_SIZE, logPage * PAGE_SIZE),
    enabled: tab === "logs",
  });

  const applySearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(0);
    setAppliedSearch(searchText.trim());
  };

  const resetFilters = () => {
    setEntity("");
    setAction("");
    setSearchText("");
    setAppliedSearch("");
    setPage(0);
  };

  const auditTotal = audit.data?.total ?? 0;
  const auditPageCount = Math.max(1, Math.ceil(auditTotal / PAGE_SIZE));
  const logTotal = logs.data?.total ?? 0;
  const logPageCount = Math.max(1, Math.ceil(logTotal / PAGE_SIZE));

  return (
    <AppShell>
      <PageHeader
        title="Audit"
        brief="Periksa perubahan data dan riwayat status laporan."
        actions={
          <Button
            variant="secondary"
            leadingIcon={<RefreshCw />}
            onClick={() => {
              if (tab === "audit") void audit.refetch();
              else void logs.refetch();
            }}
            disabled={audit.isRefetching || logs.isRefetching}
          >
            {audit.isRefetching || logs.isRefetching ? "Sedang memuat…" : "Muat ulang"}
          </Button>
        }
      />

      <div
        className="mt-6 flex flex-col gap-2 sm:flex-row"
        role="group"
        aria-label="Jenis riwayat"
      >
        <button
          type="button"
          aria-pressed={tab === "audit"}
          onClick={() => setTab("audit")}
          className={cn(
            "inline-flex min-h-11 items-center justify-center gap-2 border px-4 text-base transition-colors",
            tab === "audit"
              ? "border-primary bg-surface font-medium text-text"
              : "border-border text-text-muted hover:bg-hover hover:text-text",
          )}
        >
          <ScrollText aria-hidden="true" className="h-5 w-5" />
          Perubahan data
        </button>
        <button
          type="button"
          aria-pressed={tab === "logs"}
          onClick={() => setTab("logs")}
          className={cn(
            "inline-flex min-h-11 items-center justify-center gap-2 border px-4 text-base transition-colors",
            tab === "logs"
              ? "border-primary bg-surface font-medium text-text"
              : "border-border text-text-muted hover:bg-hover hover:text-text",
          )}
        >
          <ClipboardList aria-hidden="true" className="h-5 w-5" />
          Riwayat status laporan
        </button>
      </div>

      {tab === "audit" ? (
        <div className="flex flex-col">
          <Section title="Saring audit" className="order-2 mt-6 sm:order-1">
            <form onSubmit={applySearch}>
              <div className="grid gap-4 lg:grid-cols-4">
                <Field id="audit-entity" label="Jenis data">
                  <SelectInput
                    value={entity}
                    onChange={(event) => {
                      setEntity(event.target.value);
                      setPage(0);
                    }}
                  >
                    <option value="">Semua jenis data</option>
                    {(audit.data?.options.entities ?? []).map((value) => (
                      <option key={value} value={value}>
                        {ENTITY_LABEL[value] ?? value}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
                <Field id="audit-action" label="Tindakan">
                  <SelectInput
                    value={action}
                    onChange={(event) => {
                      setAction(event.target.value);
                      setPage(0);
                    }}
                  >
                    <option value="">Semua tindakan</option>
                    {(audit.data?.options.actions ?? []).map((value) => (
                      <option key={value} value={value}>
                        {ACTION_LABEL[value] ?? value}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
                <Field id="audit-search" label="Cari pelaku atau nomor data">
                  <TextInput
                    value={searchText}
                    placeholder="Contoh: Sari atau kode laporan"
                    onChange={(event) => setSearchText(event.target.value)}
                  />
                </Field>
                <div className="flex flex-col justify-end gap-2 sm:flex-row lg:flex-col">
                  <Button type="submit" leadingIcon={<Filter />}>
                    Terapkan
                  </Button>
                  <Button type="button" variant="secondary" onClick={resetFilters}>
                    Bersihkan
                  </Button>
                </div>
              </div>
            </form>
          </Section>

          <Section
            tone="focus"
            headingId="catatan-perubahan"
            title="Catatan perubahan"
            brief={audit.data?.note ?? "Catatan ini hanya menerima penambahan."}
            actions={
              <span className="font-mono text-base text-text-muted">
                {audit.isPending ? "…" : `${auditTotal} catatan`}
              </span>
            }
            className="order-1 mt-6 sm:order-2"
          >
            {audit.isPending ? (
              <div className="space-y-3" aria-busy="true">
                <span className="sr-only">Sedang memuat catatan audit</span>
                <Skeleton variant="card" className="h-24" />
                <Skeleton variant="card" className="h-24" />
                <Skeleton variant="card" className="h-24" />
              </div>
            ) : audit.isError ? (
              <Alert
                tone="danger"
                title="Catatan audit belum bisa dimuat."
                action={
                  <Button variant="secondary" onClick={() => void audit.refetch()}>
                    Coba lagi
                  </Button>
                }
              >
                Periksa koneksi, lalu tekan Coba lagi. Catatan yang sudah tersimpan tidak berubah.
              </Alert>
            ) : (audit.data?.entries.length ?? 0) === 0 ? (
              <EmptyState
                compact
                icon={<ScrollText />}
                title="Belum ada catatan yang cocok."
                description="Ubah saringan, atau lakukan perubahan data terlebih dahulu. Setiap perubahan akan muncul di sini."
                action={
                  <Button variant="secondary" onClick={resetFilters}>
                    Tampilkan semua catatan
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {audit.data?.entries.map((entry) => (
                  <li key={entry.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-base text-text">
                          <span className="font-semibold">{entry.actorName}</span>
                          {entry.actorRole ? `, ${ROLE_LABEL[entry.actorRole]}` : ""}{" "}
                          {ACTION_LABEL[entry.action]?.toLowerCase() ?? "mengubah data"}{" "}
                          <span className="font-medium">
                            {ENTITY_LABEL[entry.entity] ?? entry.entity}
                          </span>
                          .
                        </p>
                        <p className="mt-1 break-all font-mono text-base text-info">
                          {entry.entityId}
                        </p>
                      </div>
                      <p className="text-base text-text-muted">{formatDateTime(entry.createdAt)}</p>
                    </div>

                    <details className="mt-3">
                      <summary className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-base font-medium text-info">
                        <ShieldCheck aria-hidden="true" className="h-5 w-5" />
                        Lihat nilai sebelum dan sesudah
                      </summary>
                      <div className="mt-3 grid gap-3 lg:grid-cols-2">
                        <div className="border border-border bg-canvas p-3">
                          <p className="text-base font-medium text-text-muted">Sebelum</p>
                          <pre className="mt-2 whitespace-pre-wrap break-words text-base text-text">
                            {formatJson(entry.before)}
                          </pre>
                        </div>
                        <div className="border border-border bg-canvas p-3">
                          <p className="text-base font-medium text-text-muted">Sesudah</p>
                          <pre className="mt-2 whitespace-pre-wrap break-words text-base text-text">
                            {formatJson(entry.after)}
                          </pre>
                        </div>
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            )}

            {auditTotal > PAGE_SIZE ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <p className="text-base text-text-muted">
                  Halaman {page + 1} dari {auditPageCount}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    leadingIcon={<ArrowLeft />}
                    disabled={page === 0}
                    onClick={() => setPage((current) => Math.max(0, current - 1))}
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={page + 1 >= auditPageCount}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Berikutnya
                    <ArrowRight aria-hidden="true" className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            ) : null}
          </Section>
        </div>
      ) : (
        <Section
          tone="focus"
          headingId="riwayat-status"
          title="Riwayat status laporan"
          brief={logs.data?.note ?? "Riwayat status tidak bisa diubah atau dihapus."}
          actions={
            <span className="font-mono text-base text-text-muted">
              {logs.isPending ? "…" : `${logTotal} baris`}
            </span>
          }
          className="mt-6"
        >
          {logs.isPending ? (
            <div className="space-y-3" aria-busy="true">
              <span className="sr-only">Sedang memuat riwayat status</span>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : logs.isError ? (
            <Alert
              tone="danger"
              title="Riwayat status belum bisa dimuat."
              action={
                <Button variant="secondary" onClick={() => void logs.refetch()}>
                  Coba lagi
                </Button>
              }
            >
              Periksa koneksi, lalu tekan Coba lagi.
            </Alert>
          ) : (logs.data?.logs.length ?? 0) === 0 ? (
            <EmptyState
              compact
              icon={<ClipboardList />}
              title="Belum ada riwayat status."
              description="Riwayat muncul setelah ada laporan kejadian yang dibuat dan berubah status."
            />
          ) : (
            <ul className="divide-y divide-border">
              {logs.data?.logs.map((log) => (
                <li key={log.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-text">{log.incidentTitle}</p>
                      <p className="mt-1 font-mono text-base text-info">{log.incidentCode}</p>
                    </div>
                    <StatusChip status={log.toStatus} />
                  </div>
                  <p className="mt-2 text-base text-text-muted">
                    {log.fromStatus
                      ? `${STATUS_LABEL[log.fromStatus as IncidentStatus]} → ${
                          STATUS_LABEL[log.toStatus]
                        }`
                      : `Dibuat sebagai ${STATUS_LABEL[log.toStatus]}`}
                    {", "}
                    {log.actorName}, {formatDateTime(log.createdAt)}
                  </p>
                  {log.note ? <p className="mt-1 text-base text-text">{log.note}</p> : null}
                </li>
              ))}
            </ul>
          )}

          {logTotal > PAGE_SIZE ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <p className="text-base text-text-muted">
                Halaman {logPage + 1} dari {logPageCount}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  leadingIcon={<ArrowLeft />}
                  disabled={logPage === 0}
                  onClick={() => setLogPage((current) => Math.max(0, current - 1))}
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="secondary"
                  disabled={logPage + 1 >= logPageCount}
                  onClick={() => setLogPage((current) => current + 1)}
                >
                  Berikutnya
                  <ArrowRight aria-hidden="true" className="h-5 w-5" />
                </Button>
              </div>
            </div>
          ) : null}
        </Section>
      )}
    </AppShell>
  );
}
