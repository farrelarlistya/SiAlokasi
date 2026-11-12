import type { NotificationView } from "@sialokasi/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, CheckCheck, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { Alert } from "./Alert";
import { Button, buttonStyles } from "./Button";
import { EmptyState } from "./EmptyState";
import { Modal } from "./Modal";
import { NotificationItem } from "./NotificationItem";
import { Skeleton } from "./Skeleton";
import { useToast } from "./Toast";
import { api } from "../lib/api";
import { notificationTarget } from "../lib/notifications";

/** Lonceng notifikasi in-app dengan jumlah yang belum dibaca. */
export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [marking, setMarking] = useState(false);

  const inbox = useQuery({
    queryKey: ["notifications", "bell", user?.id],
    queryFn: () => api.notifications({ limit: 8 }),
    enabled: Boolean(user),
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });

  if (!user) return null;

  const unreadCount = inbox.data?.unreadCount ?? 0;
  const label =
    unreadCount > 0 ? `Notifikasi, ${unreadCount} belum dibaca` : "Notifikasi, semua sudah dibaca";

  const applyRead = async (items: NotificationView[]) => {
    const unreadIds = items.filter((item) => !item.readAt).map((item) => item.id);
    if (unreadIds.length === 0) return;
    try {
      await api.markNotificationsRead({ ids: unreadIds });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch {
      // Membaca notifikasi tidak boleh menghalangi pekerjaan utama.
    }
  };

  const openItem = async (item: NotificationView) => {
    setOpen(false);
    await applyRead([item]);
    const target = notificationTarget(item, user.role);
    if (target) navigate(target);
  };

  const markAll = async () => {
    if (unreadCount === 0) return;
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
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        aria-haspopup="dialog"
        className={buttonStyles("secondary", "icon", "relative")}
      >
        <Bell aria-hidden="true" className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 grid min-h-6 min-w-6 place-items-center rounded-full bg-danger px-1 text-base font-semibold leading-none text-white"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Notifikasi"
        size="lg"
        footer={
          <>
            <Link to="/notifikasi" className={buttonStyles("secondary", "md")}>
              Buka semua notifikasi
            </Link>
            <Button
              leadingIcon={<CheckCheck />}
              onClick={() => void markAll()}
              disabled={marking || unreadCount === 0}
            >
              {marking ? "Sedang menandai…" : "Tandai semua dibaca"}
            </Button>
          </>
        }
      >
        {inbox.isPending ? (
          <div className="space-y-3" aria-busy="true">
            <span className="sr-only">Sedang memuat notifikasi</span>
            <Skeleton variant="card" className="h-20" />
            <Skeleton variant="card" className="h-20" />
            <Skeleton variant="card" className="h-20" />
          </div>
        ) : inbox.isError ? (
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
            Periksa koneksi, lalu tekan Coba lagi.
          </Alert>
        ) : (inbox.data?.notifications.length ?? 0) === 0 ? (
          <EmptyState
            compact
            icon={<BellOff />}
            title="Belum ada notifikasi."
            description="Kabar tentang laporan dan izin distribusi akan muncul di sini."
          />
        ) : (
          <div className="-mx-6 -mb-5 overflow-hidden rounded-b-lg border-t border-border">
            {inbox.data?.notifications.map((item) => (
              <NotificationItem key={item.id} item={item} onOpen={() => void openItem(item)} />
            ))}
            {inbox.data && inbox.data.total > inbox.data.notifications.length ? (
              <p className="px-4 py-3 text-base text-text-muted">
                Menampilkan {inbox.data.notifications.length} dari {inbox.data.total} notifikasi.
              </p>
            ) : null}
          </div>
        )}
      </Modal>
    </>
  );
}
