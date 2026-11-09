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
import { Skeleton } from "../../components/Skeleton";
import { StatCard } from "../../components/StatCard";
import { AppShell } from "../../layouts/AppShell";
import { api } from "../../lib/api";
import { useAuth } from "../../auth/AuthProvider";

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
  const { user } = useAuth();
  const summary = useQuery({ queryKey: ["admin", "summary"], queryFn: api.adminSummary });
  const data = summary.data?.summary;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Dasbor Admin"
        title={`Selamat datang, ${user?.name.split(" ")[0] ?? "Admin"}`}
        description="Kelola akun dan data master tanpa menghapus riwayat laporan yang sudah tercatat."
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

      <section aria-labelledby="ringkasan-admin" className="mt-6">
        <h2 id="ringkasan-admin" className="sr-only">
          Ringkasan data
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Menunggu aktivasi"
            value={data?.pendingUsers}
            loading={summary.isPending}
            icon={AlertCircle}
            tone="warning"
            hint="Pendaftar petugas yang belum bisa masuk."
          />
          <StatCard
            label="Akun aktif"
            value={data?.activeUsers}
            loading={summary.isPending}
            icon={Users}
            tone="success"
          />
          <StatCard
            label="Laporan tercatat"
            value={data?.incidents}
            loading={summary.isPending}
            icon={ClipboardList}
          />
          <StatCard
            label="Jenis bantuan aktif"
            value={data?.activeAidItems}
            loading={summary.isPending}
            icon={Package}
          />
          <StatCard
            label="Kecamatan aktif"
            value={data?.activeRegions}
            loading={summary.isPending}
            icon={MapPinned}
          />
          <StatCard
            label="Posko aktif"
            value={data?.activePoskos}
            loading={summary.isPending}
            icon={Warehouse}
          />
        </div>
      </section>

      <section aria-labelledby="pintasan-admin" className="mt-8">
        <h2 id="pintasan-admin" className="text-[22px] font-semibold leading-[30px]">
          Pintasan pengelolaan
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {SHORTCUTS.map((shortcut) => {
            const Icon = shortcut.icon;
            return (
              <Link
                key={shortcut.to}
                to={shortcut.to}
                className="group rounded-lg border border-border bg-surface p-5 shadow-card transition-colors hover:border-accent/60 hover:bg-hover/40"
              >
                <span
                  aria-hidden="true"
                  className="grid h-12 w-12 place-items-center rounded-md border border-info/20 bg-info/10 text-info"
                >
                  <Icon className="h-6 w-6" />
                </span>
                <p className="mt-4 text-[22px] font-semibold leading-[30px] text-text">
                  {shortcut.title}
                </p>
                <p className="mt-1 text-base text-text-muted">{shortcut.description}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="aktivitas-admin" className="mt-8 rounded-lg border border-border bg-surface">
        <div className="border-b border-border p-5">
          <h2 id="aktivitas-admin" className="text-[22px] font-semibold leading-[30px]">
            Aktivitas terakhir
          </h2>
          <p className="mt-1 text-base text-text-muted">
            Catatan perubahan data master. Riwayat ini tidak bisa dihapus.
          </p>
        </div>

        <div className="p-5">
          {summary.isPending ? (
            <div className="space-y-3" aria-busy="true">
              <span className="sr-only">Sedang memuat aktivitas terakhir</span>
              <Skeleton variant="card" className="h-16" />
              <Skeleton variant="card" className="h-16" />
              <Skeleton variant="card" className="h-16" />
            </div>
          ) : (summary.data?.audit.length ?? 0) === 0 ? (
            <EmptyState
              compact
              icon={<ClipboardList />}
              title="Belum ada perubahan data master."
              description="Setiap penambahan, perubahan, atau penonaktifan data akan tercatat di sini."
            />
          ) : (
            <ul className="divide-y divide-border">
              {summary.data?.audit.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-start justify-between gap-2 py-3 first:pt-0 last:pb-0">
                  <p className="text-base text-text">
                    <span className="font-medium">{entry.actorName}</span>{" "}
                    {ACTION_LABEL[entry.action] ?? "mengubah"}{" "}
                    {ENTITY_LABEL[entry.entity] ?? entry.entity}.
                  </p>
                  <p className="text-base text-text-muted">{formatDateTime(entry.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div className="mt-6">
        <Link to="/admin/akun" className={buttonStyles("primary", "lg")}>
          Kelola akun & peran
        </Link>
      </div>
    </AppShell>
  );
}
