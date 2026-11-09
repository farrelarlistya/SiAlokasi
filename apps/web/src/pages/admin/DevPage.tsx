import { formatDateTime } from "@sialokasi/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Clock3,
  DatabaseBackup,
  ExternalLink,
  ListChecks,
  PlayCircle,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  TimerReset,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Alert } from "../../components/Alert";
import { Button, buttonStyles } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { EmptyState } from "../../components/EmptyState";
import { PageHeader } from "../../components/PageHeader";
import { Skeleton } from "../../components/Skeleton";
import { StatCard } from "../../components/StatCard";
import { useToast } from "../../components/Toast";
import { AppShell } from "../../layouts/AppShell";
import { api } from "../../lib/api";
import { cn } from "../../lib/cn";

const TARGET_LABEL: Record<string, string> = {
  MENUNGGU: "Menunggu keputusan",
  DISETUJUI: "Sudah disetujui",
  SELESAI: "Distribusi selesai",
};

function offsetLabel(minutes: number): string {
  if (minutes === 0) return "Waktu normal";
  const direction = minutes > 0 ? "maju" : "mundur";
  const absolute = Math.abs(minutes);
  const days = Math.floor(absolute / (24 * 60));
  const hours = Math.floor((absolute % (24 * 60)) / 60);
  const rest = absolute % 60;

  const parts = [
    days > 0 ? `${days} hari` : "",
    hours > 0 ? `${hours} jam` : "",
    rest > 0 ? `${rest} menit` : "",
  ].filter(Boolean);

  return `${direction} ${parts.join(" ")}`;
}

export function DevPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [confirmSeedOpen, setConfirmSeedOpen] = useState(false);

  const status = useQuery({ queryKey: ["dev", "status"], queryFn: api.devStatus });
  const data = status.data;

  const refreshEverything = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dev"] }),
      queryClient.invalidateQueries({ queryKey: ["pimpinan"] }),
      queryClient.invalidateQueries({ queryKey: ["admin"] }),
      queryClient.invalidateQueries({ queryKey: ["petugas"] }),
      queryClient.invalidateQueries({ queryKey: ["stock"] }),
      queryClient.invalidateQueries({ queryKey: ["public"] }),
      queryClient.invalidateQueries({ queryKey: ["master"] }),
    ]);
  };

  const shiftClock = async (minutes: number) => {
    setBusyAction(`clock-${minutes}`);
    try {
      const response = await api.devSetClock(minutes);
      await refreshEverything();
      toast.push({
        tone: "success",
        title: "Waktu demo digeser.",
        description: response.message,
      });
    } catch (error) {
      toast.push({
        tone: "danger",
        title: "Waktu demo belum bisa diubah.",
        description:
          error instanceof Error ? error.message : "Periksa koneksi, lalu coba lagi.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const resetDemo = async () => {
    setBusyAction("reset");
    try {
      const response = await api.devReset();
      setConfirmResetOpen(false);
      toast.push({
        tone: "success",
        title: "Demo berhasil direset.",
        description: response.message,
      });
      queryClient.clear();
      window.setTimeout(() => window.location.assign("/masuk"), 900);
    } catch (error) {
      setConfirmResetOpen(false);
      toast.push({
        tone: "danger",
        title: "Reset demo belum berhasil.",
        description:
          error instanceof Error ? error.message : "Periksa koneksi, lalu coba lagi.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const seedExamples = async () => {
    setBusyAction("seed");
    try {
      const response = await api.devSeedExamples();
      await refreshEverything();
      setConfirmSeedOpen(false);
      toast.push({
        tone: "success",
        title: "Tiga contoh laporan sudah dibuat.",
        description: response.message,
      });
    } catch (error) {
      setConfirmSeedOpen(false);
      toast.push({
        tone: "danger",
        title: "Contoh laporan belum bisa dibuat.",
        description:
          error instanceof Error ? error.message : "Periksa koneksi, lalu coba lagi.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Admin · Panel demo"
        title="Kontrol demo SiAlokasi"
        description="Majukan waktu layanan, isi tiga contoh laporan, atau kembalikan aplikasi ke kondisi nol transaksi sebelum memulai demo berikutnya."
        actions={
          <Button
            variant="secondary"
            leadingIcon={<RefreshCw />}
            onClick={() => void status.refetch()}
            disabled={status.isRefetching}
          >
            {status.isRefetching ? "Sedang memuat…" : "Muat ulang"}
          </Button>
        }
      />

      {status.isError ? (
        <Alert tone="danger" title="Panel demo belum bisa dimuat." className="mt-6">
          Periksa koneksi ke layanan, lalu tekan Muat ulang.
        </Alert>
      ) : null}

      <section aria-labelledby="waktu-demo" className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="rounded-lg border border-border bg-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="waktu-demo" className="flex items-center gap-2 text-[22px] font-semibold leading-[30px]">
                <Clock3 aria-hidden="true" className="h-6 w-6 text-info" />
                Waktu layanan
              </h2>
              <p className="mt-1 text-base text-text-muted">
                Semua tanggal izin, batas berlaku, dan riwayat mengikuti waktu ini.
              </p>
            </div>
            <span
              className={cn(
                "inline-flex min-h-9 items-center rounded-full border px-3 text-base",
                (data?.offsetMinutes ?? 0) === 0
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-warning/30 bg-warning/10 text-warning",
              )}
            >
              {data ? offsetLabel(data.offsetMinutes) : "Memuat…"}
            </span>
          </div>

          {status.isPending ? (
            <div className="mt-5 space-y-3" aria-busy="true">
              <span className="sr-only">Sedang memuat waktu demo</span>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <>
              <div className="mt-5 rounded-md border border-border bg-elevated p-4">
                <p className="text-base text-text-muted">Waktu bisnis saat ini</p>
                <p className="mt-1 text-[28px] font-bold leading-[36px] text-text">
                  {data ? formatDateTime(data.bisnisNow) : "—"}
                </p>
                <p className="mt-1 text-base text-text-muted">
                  {data?.demoMode
                    ? "Mode demo aktif. Kode masuk akun contoh selalu 123456."
                    : "Mode demo sedang tidak aktif."}
                </p>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {[
                  { label: "Majukan 1 jam", minutes: 60 },
                  { label: "Majukan 6 jam", minutes: 6 * 60 },
                  { label: "Majukan 1 hari", minutes: 24 * 60 },
                  { label: "Majukan 3 hari", minutes: 3 * 24 * 60 },
                ].map((option) => (
                  <Button
                    key={option.minutes}
                    variant="secondary"
                    leadingIcon={<PlayCircle />}
                    disabled={busyAction !== null}
                    onClick={() => void shiftClock((data?.offsetMinutes ?? 0) + option.minutes)}
                  >
                    {busyAction === `clock-${(data?.offsetMinutes ?? 0) + option.minutes}`
                      ? "Sedang menggeser…"
                      : option.label}
                  </Button>
                ))}
              </div>

              <div className="mt-4 border-t border-border pt-4">
                <Button
                  variant="secondary"
                  leadingIcon={<TimerReset />}
                  disabled={busyAction !== null || (data?.offsetMinutes ?? 0) === 0}
                  onClick={() => void shiftClock(0)}
                >
                  Kembalikan waktu normal
                </Button>
              </div>
            </>
          )}
        </div>

        <div className="rounded-lg border border-danger/30 bg-danger/5 p-5">
          <h2 className="flex items-center gap-2 text-[22px] font-semibold leading-[30px]">
            <DatabaseBackup aria-hidden="true" className="h-6 w-6 text-danger" />
            Bersihkan untuk demo baru
          </h2>
          <p className="mt-2 text-base text-text-muted">
            Reset menghapus seluruh laporan, rekomendasi, keputusan, izin, jurnal stok, audit,
            dan sesi masuk. Data master serta 3 akun demo dipulihkan ke kondisi awal.
          </p>

          <Alert tone="warning" title="Semua pengguna akan keluar dari aplikasi." className="mt-4">
            Setelah reset, Anda perlu masuk lagi dengan akun admin. Proses ini biasanya selesai
            kurang dari satu detik.
          </Alert>

          <div className="mt-5 flex flex-col gap-3">
            <Button
              variant="danger"
              size="lg"
              leadingIcon={<RotateCcw />}
              disabled={busyAction !== null}
              onClick={() => setConfirmResetOpen(true)}
            >
              {busyAction === "reset" ? "Sedang mereset…" : "Reset transaksi & waktu demo"}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              leadingIcon={<ListChecks />}
              disabled={busyAction !== null || (data?.counts.incidents ?? 0) > 0}
              onClick={() => setConfirmSeedOpen(true)}
            >
              {busyAction === "seed" ? "Sedang mengisi…" : "Isi 3 contoh laporan"}
            </Button>
            <p className="text-base text-text-muted">
              Tombol contoh hanya aktif saat belum ada laporan. Reset terlebih dahulu bila peta
              masih berisi data lama.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="status-demo" className="mt-6">
        <h2 id="status-demo" className="sr-only">
          Status data demo
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Laporan kejadian"
            value={data?.counts.incidents}
            loading={status.isPending}
            icon={ShieldAlert}
          />
          <StatCard
            label="Izin distribusi"
            value={data?.counts.permits}
            loading={status.isPending}
            icon={ListChecks}
            tone="success"
          />
          <StatCard
            label="Catatan audit"
            value={data?.counts.auditLogs}
            loading={status.isPending}
            icon={DatabaseBackup}
          />
          <StatCard
            label="Baris jurnal stok"
            value={data?.counts.movements}
            loading={status.isPending}
            icon={Clock3}
            tone="info"
          />
          <StatCard
            label="Notifikasi tersimpan"
            value={data?.counts.notifications}
            loading={status.isPending}
            icon={Bell}
            tone="warning"
          />
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-border bg-surface">
        <div className="border-b border-border p-5">
          <h2 className="text-[22px] font-semibold leading-[30px]">Tiga contoh laporan</h2>
          <p className="mt-1 text-base text-text-muted">
            Satu laporan untuk setiap tahap demo: antrian pimpinan, izin terbit, dan distribusi
            selesai. Semua memakai perhitungan bantuan yang sama dengan alur asli.
          </p>
        </div>

        <div className="p-5">
          {status.isPending ? (
            <div className="space-y-3" aria-busy="true">
              <Skeleton variant="card" className="h-20" />
              <Skeleton variant="card" className="h-20" />
              <Skeleton variant="card" className="h-20" />
            </div>
          ) : (data?.examples.length ?? 0) === 0 ? (
            <EmptyState
              compact
              icon={<ListChecks />}
              title="Belum ada contoh yang disiapkan."
              description="Contoh bawaan akan tampil di sini setelah panel demo selesai dimuat."
            />
          ) : (
            <ul className="divide-y divide-border">
              {data?.examples.map((example) => (
                <li key={example.code} className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-text">{example.title}</p>
                    <p className="mt-1 font-mono text-base text-info">{example.code}</p>
                  </div>
                  <span className="inline-flex min-h-9 items-center rounded-full border border-border bg-elevated px-3 text-base text-text-muted">
                    {TARGET_LABEL[example.target] ?? example.target}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row">
            <Link to="/" className={buttonStyles("secondary", "md")}>
              <ExternalLink aria-hidden="true" className="h-5 w-5" />
              Buka peta publik
            </Link>
            <Link to="/lacak?kode=SIA-DEMO1" className={buttonStyles("secondary", "md")}>
              <ExternalLink aria-hidden="true" className="h-5 w-5" />
              Lacak contoh pertama
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-border bg-surface p-5">
        <h2 className="text-[22px] font-semibold leading-[30px]">Urutan demo yang disarankan</h2>
        <ol className="mt-3 space-y-2 text-base text-text-muted">
          <li>1. Reset transaksi agar peta dan antrian kembali kosong.</li>
          <li>2. Isi 3 contoh laporan untuk memperlihatkan antrian, izin, dan laporan selesai.</li>
          <li>3. Buka peta publik dan halaman lacak untuk melihat tampilan tamu.</li>
          <li>4. Majukan waktu bila ingin memperlihatkan perubahan tanggal izin dan masa berlaku.</li>
          <li>5. Reset lagi sebelum kelompok demo berikutnya.</li>
        </ol>
      </section>

      <ConfirmDialog
        open={confirmResetOpen}
        onClose={() => setConfirmResetOpen(false)}
        onConfirm={() => void resetDemo()}
        busy={busyAction === "reset"}
        title="Reset seluruh transaksi demo?"
        description="Semua laporan, izin, audit, jurnal stok, dan sesi masuk akan dihapus. Data master dan akun demo dipulihkan, lalu Anda perlu masuk lagi."
        confirmLabel="Ya, reset sekarang"
        cancelLabel="Belum"
      />

      <ConfirmDialog
        open={confirmSeedOpen}
        onClose={() => setConfirmSeedOpen(false)}
        onConfirm={() => void seedExamples()}
        busy={busyAction === "seed"}
        tone="primary"
        title="Isi tiga contoh laporan?"
        description="Aplikasi akan membuat 1 laporan menunggu keputusan, 1 laporan disetujui, dan 1 laporan selesai beserta izin dan jurnal stoknya."
        confirmLabel="Ya, isi contoh"
        cancelLabel="Belum"
      />
    </AppShell>
  );
}
