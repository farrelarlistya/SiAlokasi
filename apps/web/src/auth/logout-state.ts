/**
 * Penanda keluar yang disengaja. Saat sesi dihapus, halaman berperan tidak
 * boleh mengirim pengguna ke /masuk?next=... karena tujuan lama bisa terbawa
 * saat masuk lagi dengan peran berbeda.
 */
let loggingOut = false;

export function beginLogout(): void {
  loggingOut = true;
}

export function endLogout(): void {
  loggingOut = false;
}

export function isLoggingOut(): boolean {
  return loggingOut;
}
