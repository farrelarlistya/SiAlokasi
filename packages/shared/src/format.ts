const JAKARTA_TIME_ZONE = "Asia/Jakarta";

const numberFormatter = new Intl.NumberFormat("id-ID");

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: JAKARTA_TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: JAKARTA_TIME_ZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: JAKARTA_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

const compactNumberFormatter = new Intl.NumberFormat("id-ID", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function toDate(value: Date | string | number): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError("Waktu tidak valid.");
  }
  return date;
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatCompactNumber(value: number): string {
  return compactNumberFormatter.format(value);
}

export function formatDateTime(value: Date | string | number): string {
  return dateTimeFormatter.format(toDate(value)).replace(/\./g, ":");
}

export function formatDate(value: Date | string | number): string {
  return dateFormatter.format(toDate(value));
}

export function formatTime(value: Date | string | number): string {
  return timeFormatter.format(toDate(value)).replace(/\./g, ":");
}

/** Jarak ditampilkan dalam meter sampai 999 m, lalu kilometer dengan satu desimal. */
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) {
    throw new RangeError("Jarak tidak valid.");
  }
  if (meters < 1_000) {
    return `${numberFormatter.format(Math.round(meters))} m`;
  }
  const km = meters / 1_000;
  const formatted = new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(km);
  return `${formatted} km`;
}

/** Contoh: "baru saja", "12 menit lalu", "2 jam lalu", "3 hari lalu". */
export function formatRelativeTime(value: Date | string | number, nowMs: number = Date.now()): string {
  const target = toDate(value).getTime();
  const diffMs = nowMs - target;
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 0) {
    const futureMinutes = Math.abs(diffMinutes);
    if (futureMinutes < 60) return `dalam ${futureMinutes} menit`;
    const futureHours = Math.round(futureMinutes / 60);
    if (futureHours < 24) return `dalam ${futureHours} jam`;
    return `dalam ${Math.round(futureHours / 24)} hari`;
  }

  if (diffMinutes < 1) return "baru saja";
  if (diffMinutes < 60) return `${diffMinutes} menit lalu`;

  const hours = Math.round(diffMinutes / 60);
  if (hours < 24) return `${hours} jam lalu`;

  const days = Math.round(hours / 24);
  if (days === 1) return "kemarin";
  if (days < 30) return `${days} hari lalu`;

  const months = Math.round(days / 30);
  if (months < 12) return `${months} bulan lalu`;

  return `${Math.round(months / 12)} tahun lalu`;
}

/** Versi teknis diubah menjadi label ramah, contoh sialokasi-ridge-1.1.0 → Versi 1.1. */
export function formatModelVersion(version: string): string {
  const match = version.match(/(\d+\.\d+)/);
  return match ? `Versi ${match[1]}` : "Versi terbaru";
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}${"•".repeat(Math.max(2, local.length - 2))}@${domain}`;
}
