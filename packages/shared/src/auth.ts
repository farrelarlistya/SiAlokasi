import type { Role } from "./domain";

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

export type RequestCodeResponse = {
  sent: boolean;
  demoMode: boolean;
  /** Hanya diisi saat DEMO_MODE=true agar panel demo mudah dipakai. */
  demoCode?: string;
  message: string;
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
