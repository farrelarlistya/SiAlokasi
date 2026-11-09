import type { NotificationView } from "@sialokasi/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BellOff, CheckCheck, Inbox, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { NotificationItem } from "../../components/NotificationItem";
import { PageHeader } from "../../components/PageHeader";
import { Skeleton } from "../../components/Skeleton";
import { useToast } from "../../components/Toast";
import { AppShell } from "../../layouts/AppShell";
import { api } from "../../lib/api";
import { notificationTarget } from "../../lib/notifications";

/** Log notifikasi lengkap. Menjadi pengganti kotak masuk WA/SMS pada mode demo. */
export function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [marking, setMarking] = useState(false);

  const inbox = useQuery({
    queryKey: ["notifications", "page", user?.id, unreadOnly],
    queryFn: () => api.notifications({ limit: 100, unreadOnly }),
    enabled: Boolean(user),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  if (!user) return null;

  const items = inbox.data?.notifications ?? [];
  const unreadCount = inbox.data?.unreadCount ?? 0;

  const openItem = async (item: NotificationView) => {
    if (!item.readAt) {
      try {
        await api.markNotificationsRead({ ids: [item.id] });
        await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      } catch {
        // Tetap buka laporan walau penanda baca gagal.
      }
    }
    const target = notificationTarget(item, user.role);
    if (target) navigate(target);
  };

  const markAll = async () => {
    setMarking(true);
    try {
      const response = await api.markNotificationsRead({ all: true });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.push({ tone: "success", title: response.message });
    } catch (error) {
      toast.push({
        tone: "danger",
        title: "Notifikasi belum bisa ditandai dibaca.",
        description:
          error instanceof Error ? error.message : "Periksa koneksi, lalu coba lagi.",
      });
    } finally {
      setMarking(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Kotak masuk"
        title="Notifikasi"
        description="Setiap perubahan status penting meninggalkan satu kabar di sini. Notifikasi hanya tersimpan di aplikasi, tanpa pesan WA atau SMS."
        actions={
          <>
            <Button
              variant="secondary"
              leadingIcon={<RefreshCw />}
              onClick={() => void inbox.refetch()}
              disabled={inbox.isRefetching}
            >
              {inbox.isRefetching ? "Sedang memuat…" : "Muat ulang"}
            </Button>
            <Button
              leadingIcon={<CheckCheck />}
              onClick={() => void markAll()}
              disabled={marking || unreadCount === 0}
            >
              {marking ? "Sedang menandai…" : "Tandai semua dibaca"}
            </Button>
          </>
        }
      />

      <section className="mt-6 overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
          <div>
            <h2 className="flex items-center gap-2 text-[22px] font-semibold leading-[30px]">
              <Inbox aria-hidden="true" className="h-6 w-6 text-info" />
              Log notifikasi
            </h2>
            <p className="mt-1 text-base text-text-muted">
              {inbox.isPending
                ? "Sedang memuat notifikasi…"
                : `${items.length} kabar ditampilkan · ${unreadCount} belum dibaca`}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setUnreadOnly((current) => !current)}
            aria-pressed={unreadOnly}
            className={`inline-flex min-h-11 items-center rounded-full border px-4 text-base transition-colors ${
              unreadOnly
                ? "border-info/40 bg-info/15 text-info"
                : "border-border bg-elevated text-text-muted hover:bg-hover hover:text-text"
            }`}
          >
            Hanya yang belum dibaca
          </button>
        </div>

        {inbox.isPending ? (
          <div className="space-y-3 p-5" aria-busy="true">
            <span className="sr-only">Sedang memuat notifikasi</span>
            <Skeleton variant="card" className="h-20" />
            <Skeleton variant="card" className="h-20" />
            <Skeleton variant="card" className="h-20" />
          </div>
        ) : inbox.isError ? (
          <div className="p-5">
            <Alert
              tone="danger"
              title="Notifikasi belum bisa dimuat."
              action={
                <Button
                  variant="secondary"
                  leadingIcon={<RefreshCw />}
                  onClick={() => void inbox.refetch()}
                >
                  Coba lagi
                </Button>
              }
            >
              Periksa koneksi, lalu tekan Coba lagi. Data laporan tidak berubah.
            </Alert>
          </div>
        ) : items.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<BellOff />}
              title={
                unreadOnly ? "Semua notifikasi sudah dibaca." : "Belum ada notifikasi."
              }
              description={
                unreadOnly
                  ? "Matikan saringan untuk melihat seluruh riwayat notifikasi."
                  : "Kabar tentang laporan dan izin distribusi akan muncul di sini setelah ada perubahan status."
              }
              action={
                unreadOnly ? (
                  <Button variant="secondary" onClick={() => setUnreadOnly(false)}>
                    Tampilkan semua notifikasi
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div>
            {items.map((item) => (
              <NotificationItem key={item.id} item={item} onOpen={() => void openItem(item)} />
            ))}
          </div>
        )}
      </section>

      <p className="mt-4 text-base text-text-muted">
        Notifikasi adalah catatan simulasi. Pesan WA atau SMS asli tidak dikirim pada mode demo.
      </p>
    </AppShell>
  );
}
