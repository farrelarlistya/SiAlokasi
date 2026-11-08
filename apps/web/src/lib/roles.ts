import type { Role } from "@sialokasi/shared";

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
