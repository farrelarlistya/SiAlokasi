import type { Role } from "@sialokasi/shared";

const PUBLIC_PATHS = ["/", "/lacak", "/masuk", "/daftar", "/ui"] as const;

const ROLE_PATHS: Record<Role, readonly string[]> = {
  PETUGAS: ["/petugas", "/notifikasi"],
  PIMPINAN: ["/pimpinan", "/stok", "/notifikasi"],
  ADMIN: ["/admin", "/stok", "/dev", "/notifikasi"],
};

export function isPublicPath(path: string): boolean {
  const clean = path.split("?")[0]?.split("#")[0] ?? "/";
  return (PUBLIC_PATHS as readonly string[]).includes(clean);
}

export function homePathForRole(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "PIMPINAN":
      return "/pimpinan";
    case "PETUGAS":
      return "/petugas";
  }
}

export function roleCan(role: Role, allowed: readonly Role[]): boolean {
  return allowed.includes(role);
}

/** Apakah sebuah alamat boleh dibuka oleh peran ini. */
export function canAccessPath(role: Role, path: string): boolean {
  const clean = path.split("?")[0]?.split("#")[0] ?? "/";

  if ((PUBLIC_PATHS as readonly string[]).includes(clean)) return true;

  return ROLE_PATHS[role].some(
    (prefix) => clean === prefix || clean.startsWith(`${prefix}/`),
  );
}

/**
 * Alamat tujuan setelah masuk. Bila `next` bukan alamat internal yang boleh
 * dibuka peran tersebut, pengguna diarahkan ke dasbor perannya sendiri.
 */
export function nextPathForRole(role: Role, next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return homePathForRole(role);
  }

  return canAccessPath(role, next) ? next : homePathForRole(role);
}
