import { formatDateTime } from "@sialokasi/shared";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ClipboardList,
  FlaskConical,
  MapPinned,
  Package,
  RefreshCw,
  ScrollText,
  Users,
  Warehouse,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Alert } from "../../components/Alert";
import { Button, buttonStyles } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { PageHeader } from "../../components/PageHeader";
import { Section } from "../../components/Section";
import { Skeleton } from "../../components/Skeleton";
import { StatCard } from "../../components/StatCard";
import { AppShell } from "../../layouts/AppShell";
import { api } from "../../lib/api";

const ENTITY_LABEL: Record<string, string> = {
  User: "akun",
  AidItem: "jenis bantuan",
  Region: "kecamatan",
  Posko: "posko",
};

const ACTION_LABEL: Record<string, string> = {
  BUAT: "menambah",
  UBAH: "mengubah",
  NONAKTIFKAN: "menonaktifkan",
  AKTIFKAN: "mengaktifkan",
  UBAH_PERAN: "mengubah peran",
  REGISTER: "mendaftar sebagai",
  REGISTER_ULANG: "memperbarui pendaftaran",
};

const SHORTCUTS = [
  {
    to: "/admin/akun",
    title: "Akun & peran",
    description: "Aktifkan pendaftar baru dan atur hak akses.",
    icon: Users,
  },
  {
    to: "/admin/bantuan",
    title: "Jenis bantuan",
    description: "Atur nama, satuan, ikon, dan standar per jiwa.",
    icon: Package,
  },
  {
    to: "/admin/wilayah",
    title: "Wilayah & posko",
    description: "Kelola kecamatan dan titik posko di peta.",
    icon: MapPinned,
  },
  {
    to: "/stok",
    title: "Ringkasan stok",
    description: "Lihat ketersediaan bantuan per posko.",
    icon: Warehouse,
  },
  {
    to: "/admin/audit",
    title: "Audit & riwayat",
    description: "Periksa siapa mengubah apa, lengkap dengan nilai sebelum dan sesudah.",
    icon: ScrollText,
  },
  {
    to: "/dev",
    title: "Panel demo",
    description: "Majukan waktu, isi contoh laporan, atau reset untuk demo baru.",
    icon: FlaskConical,
  },
];

export function AdminSummaryPage() {
  const summary = useQuery({ queryKey: ["admin", "summary"], queryFn: api.adminSummary });
  const data = summary.data?.summary;
  const pending = data?.pendingUsers ?? 0;
  const lowStock = data?.lowStockCount ?? 0;
  const needsAction = pending > 0 || lowStock > 0;

  return (
    <AppShell>
      <PageHeader
        title="Dasbor"
        actions={
          <Button
            variant="secondary"
            leadingIcon={<RefreshCw />}
            onClick={() => void summary.refetch()}
            disabled={summary.isRefetching}
          >
            {summary.isRefetching ? "Sedang memuat…" : "Muat ulang"}
          </Button>
        }
      />

      {summary.isError ? (
        <Alert tone="danger" title="Ringkasan admin belum bisa dimuat." className="mt-6">
          Periksa koneksi, lalu tekan Muat ulang. Data yang sudah tersimpan tidak berubah.
        </Alert>
      ) : null}

      <Section
        tone="focus"
        headingId="perlu-tindakan"
        title="Perlu tindakan"
        className="mt-6"
      >
        {summary.isPending ? (
          <div className="grid gap-6 sm:grid-cols-2" aria-busy="true">
            <span className="sr-only">Sedang memuat tindakan yang perlu diselesaikan</span>
            <Skeleton className="h-11 w-32" />
            <Skeleton className="h-11 w-32" />
          </div>
        ) : needsAction ? (
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-figure text-primary">{pending.toLocaleString("id-ID")}</p>
              <p className="text-base text-text-muted">pendaftar menunggu aktivasi</p>
              <Link
                to="/admin/akun"
                className="mt-3 inline-flex min-h-11 items-center text-base font-medium text-info underline-offset-4 hover:underline"
              >
                Buka akun & peran
              </Link>
            </div>
            <div className="border-t border-border pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
              <p className="text-figure text-primary">{lowStock.toLocaleString("id-ID")}</p>
              <p className="text-base text-text-muted">baris stok menipis</p>
              <Link
                to="/stok"
                className="mt-3 inline-flex min-h-11 items-center text-base font-medium text-info underline-offset-4 hover:underline"
              >
                Periksa ringkasan stok
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-focus text-text">Tidak ada tindakan mendesak.</p>
              <p className="mt-1 text-base text-text-muted">
                Semua pendaftar sudah diaktifkan dan stok berada di atas ambang menipis.
              </p>
            </div>
            <Link to="/" className={buttonStyles("secondary", "md")}>
              Lihat peta kejadian
            </Link>
          </div>
        )}
      </Section>

      <Section title="Ringkasan data" className="mt-6">
        <div className="grid gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <StatCard
            label="Akun aktif"
            value={data?.activeUsers}
            loading={summary.isPending}
            icon={Users}
            size="sm"
          />
          <StatCard
            label="Laporan tercatat"
            value={data?.incidents}
            loading={summary.isPending}
            icon={ClipboardList}
            size="sm"
          />
          <StatCard
            label="Jenis bantuan aktif"
            value={data?.activeAidItems}
            loading={summary.isPending}
            icon={Package}
            size="sm"
          />
          <StatCard
            label="Kecamatan aktif"
            value={data?.activeRegions}
            loading={summary.isPending}
            icon={MapPinned}
            size="sm"
          />
          <StatCard
            label="Posko aktif"
            value={data?.activePoskos}
            loading={summary.isPending}
            icon={Warehouse}
            size="sm"
          />
        </div>
      </Section>

      <Section tone="quiet" title="Pintasan" className="mt-8">
        <div className="grid gap-x-10 sm:grid-cols-2 xl:grid-cols-3">
          {SHORTCUTS.map((shortcut) => {
            const Icon = shortcut.icon;
            return (
              <Link
                key={shortcut.to}
                to={shortcut.to}
                className="group flex items-start gap-3 border-t border-border py-4 transition-colors hover:text-primary"
              >
                <Icon aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-text-disabled" />
                <span className="min-w-0">
                  <span className="block text-base font-medium text-text group-hover:text-primary">
                    {shortcut.title}
                  </span>
                  <span className="mt-1 block text-base text-text-muted">
                    {shortcut.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </Section>

      <Section
        tone="quiet"
        title="Aktivitas terakhir"
        actions={<span className="text-base text-text-muted">Riwayat ini tidak bisa dihapus.</span>}
        className="mt-8"
      >
        {summary.isPending ? (
          <div className="space-y-3" aria-busy="true">
            <span className="sr-only">Sedang memuat aktivitas terakhir</span>
            <Skeleton variant="card" className="h-14" />
            <Skeleton variant="card" className="h-14" />
            <Skeleton variant="card" className="h-14" />
          </div>
        ) : (summary.data?.audit.length ?? 0) === 0 ? (
          <EmptyState
            compact
            icon={<AlertCircle />}
            title="Belum ada perubahan data master."
            description="Setiap penambahan, perubahan, atau penonaktifan data akan tercatat di sini."
          />
        ) : (
          <ul>
            {summary.data?.audit.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-baseline justify-between gap-2 border-t border-border py-4 last:border-b"
              >
                <p className="text-base text-text">
                  <span className="font-medium">{entry.actorName}</span>{" "}
                  {ACTION_LABEL[entry.action] ?? "mengubah"}{" "}
                  {ENTITY_LABEL[entry.entity] ?? entry.entity}.
                </p>
                <p className="font-mono text-base text-text-muted">
                  {formatDateTime(entry.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </AppShell>
  );
}
