import type { Role } from "./domain";

/**
 * Kata sandi akun demo. Hanya dipakai saat `DEMO_MODE=true` agar pemilik
 * proyek bisa masuk tanpa mengatur kata sandi sendiri. Ganti saat produksi
 * nyata (lihat README).
 */
export const DEMO_PASSWORD = "Sialokasi#2026";

/** Data pengguna yang aman ditampilkan di antarmuka setelah masuk. */
export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  regionId: string | null;
  regionName: string | null;
};

export type AuthMeResponse = {
  user: AuthUser | null;
};

export type LoginResponse = {
  user: AuthUser;
  message: string;
};

/** Respon CRUD data master memakai bentuk yang sama agar mudah ditampilkan. */
export type MutationResponse<T> = {
  data: T;
  message: string;
};
