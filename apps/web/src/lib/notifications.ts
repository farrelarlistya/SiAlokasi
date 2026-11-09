import type { NotificationView, Role } from "@sialokasi/shared";

/** Tujuan yang aman dibuka dari sebuah notifikasi, sesuai peran pengguna. */
export function notificationTarget(item: NotificationView, role: Role): string | null {
  if (!item.incidentId) return null;

  if (role === "PIMPINAN") {
    return item.permitId ? `/pimpinan/izin/${item.permitId}` : `/pimpinan/laporan/${item.incidentId}`;
  }

  if (role === "PETUGAS") {
    return `/petugas/laporan/${item.incidentId}`;
  }

  return null;
}
