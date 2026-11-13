import {
  formatDate,
  ROLES,
  ROLE_LABEL,
  type Role,
} from "@sialokasi/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Search, UserCheck, UserRoundCog, UserX } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { EmptyState } from "../../components/EmptyState";
import { Field, SelectInput, TextInput } from "../../components/Field";
import { Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { Section } from "../../components/Section";
import { Skeleton } from "../../components/Skeleton";
import { useToast } from "../../components/Toast";
import { AppShell } from "../../layouts/AppShell";
import { api, type AdminUser } from "../../lib/api";
import { cn } from "../../lib/cn";

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className="inline-flex min-h-8 items-center border border-border text-base text-text">
      <span
        aria-hidden="true"
        className={cn("h-8 w-0.5 shrink-0", active ? "bg-info" : "bg-text-disabled")}
      />
      <span className="px-2.5">{active ? "Aktif" : "Menunggu aktivasi"}</span>
    </span>
  );
}

export function AdminUsersPage() {
  const { user: me } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | undefined>();

  const [deactivateTarget, setDeactivateTarget] = useState<AdminUser | null>(null);
  const [roleTarget, setRoleTarget] = useState<AdminUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>("PETUGAS");
  const [roleError, setRoleError] = useState<string | undefined>();

  const users = useQuery({
    queryKey: ["admin", "users", deferredSearch, roleFilter, statusFilter],
    queryFn: () =>
      api.adminUsers({
        search: deferredSearch || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
      }),
  });

  const summary = useQuery({ queryKey: ["admin", "summary"], queryFn: api.adminSummary });

  const updateUser = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { role?: Role; isActive?: boolean } }) =>
      api.updateUser(id, body),
    onSuccess: async (response) => {
      toast.push({ tone: "success", title: response.message });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "summary"] }),
      ]);
    },
  });

  const runUpdate = async (
    target: AdminUser,
    body: { role?: Role; isActive?: boolean },
  ): Promise<boolean> => {
    setBusyId(target.id);
    setActionError(undefined);

    try {
      await updateUser.mutateAsync({ id: target.id, body });
      return true;
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Perubahan belum bisa disimpan. Periksa koneksi, lalu coba lagi.",
      );
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const handleActivate = async (target: AdminUser) => {
    await runUpdate(target, { isActive: true });
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    const ok = await runUpdate(deactivateTarget, { isActive: false });
    if (ok) setDeactivateTarget(null);
  };

  const handleSaveRole = async () => {
    if (!roleTarget) return;
    if (selectedRole === roleTarget.role) {
      setRoleTarget(null);
      return;
    }
    setRoleError(undefined);
    const ok = await runUpdate(roleTarget, { role: selectedRole });
    if (ok) {
      setRoleTarget(null);
    } else {
      setRoleError("Peran belum bisa diubah. Periksa koneksi, lalu coba lagi.");
    }
  };

  const list = users.data?.users ?? [];
  const pendingTotal = summary.data?.summary.pendingUsers ?? 0;
  const hasFilter = deferredSearch !== "" || roleFilter !== "" || statusFilter !== "";
  const isFirstLoad = users.isPending;

  const resetFilters = () => {
    setSearch("");
    setRoleFilter("");
    setStatusFilter("");
  };

  return (
    <AppShell>
      <PageHeader
        title="Akun"
        actions={
          <Button
            variant="secondary"
            leadingIcon={<RefreshCw />}
            onClick={() => void users.refetch()}
            disabled={users.isRefetching}
          >
            {users.isRefetching ? "Sedang memuat…" : "Muat ulang"}
          </Button>
        }
      />

      {pendingTotal > 0 ? (
        <Alert
          tone="warning"
          title={`${pendingTotal} akun menunggu aktivasi.`}
          className="mt-6"
        >
          Aktifkan akun setelah identitas petugas dipastikan. Akun yang belum aktif tidak bisa
          masuk.
        </Alert>
      ) : null}

      {actionError ? (
        <Alert tone="danger" title="Perubahan belum tersimpan." className="mt-6">
          {actionError}
        </Alert>
      ) : null}

      <Section title="Saring akun" className="mt-6">
        <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <Field id="admin-user-search" label="Cari nama atau email">
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted"
              />
              <TextInput
                type="search"
                value={search}
                placeholder="Contoh: Rina atau petugas@"
                className="pl-10"
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </Field>

          <Field id="admin-user-role" label="Peran">
            <SelectInput value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
              <option value="">Semua peran</option>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABEL[role]}
                </option>
              ))}
            </SelectInput>
          </Field>

          <Field id="admin-user-status" label="Status akun">
            <SelectInput
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">Semua status</option>
              <option value="active">Aktif</option>
              <option value="pending">Menunggu aktivasi</option>
            </SelectInput>
          </Field>
        </div>

        {hasFilter ? (
          <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
            <Button variant="ghost" onClick={resetFilters}>
              Bersihkan saringan
            </Button>
          </div>
        ) : null}
      </Section>

      <Section
        tone="focus"
        headingId="daftar-akun"
        title="Daftar akun"
        actions={
          <span className="font-mono text-base text-text-muted">
            {isFirstLoad ? "…" : `${list.length} akun`}
          </span>
        }
        className="mt-4"
      >
        {isFirstLoad ? (
          <div className="space-y-3 p-5" aria-busy="true">
            <span className="sr-only">Sedang memuat daftar akun</span>
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : users.isError ? (
          <div className="p-5">
            <Alert
              tone="danger"
              title="Daftar akun belum bisa dimuat."
              action={
                <Button variant="secondary" onClick={() => void users.refetch()}>
                  Coba lagi
                </Button>
              }
            >
              Periksa koneksi, lalu tekan Coba lagi.
            </Alert>
          </div>
        ) : list.length === 0 ? (
          <div className="p-5">
            <EmptyState
              compact
              icon={<UserRoundCog />}
              title={hasFilter ? "Tidak ada akun yang cocok." : "Belum ada akun terdaftar."}
              description={
                hasFilter
                  ? "Ubah kata kunci atau bersihkan saringan untuk melihat semua akun."
                  : "Akun petugas yang mendaftar akan muncul di sini untuk diaktifkan."
              }
              action={
                hasFilter ? (
                  <Button variant="secondary" onClick={resetFilters}>
                    Bersihkan saringan
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left text-base">
                <caption className="sr-only">Daftar akun pengguna dan perannya</caption>
                <thead>
                  <tr className="border-b border-border bg-elevated text-text-muted">
                    <th scope="col" className="px-4 py-3 font-medium">Nama & email</th>
                    <th scope="col" className="px-4 py-3 font-medium">Peran</th>
                    <th scope="col" className="px-4 py-3 font-medium">Kecamatan</th>
                    <th scope="col" className="px-4 py-3 font-medium">Status</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {list.map((row) => {
                    const isSelf = row.id === me?.id;
                    const busy = busyId === row.id;

                    return (
                      <tr key={row.id} className="align-top">
                        <td className="px-4 py-4">
                          <p className="font-medium text-text">
                            {row.name}
                            {isSelf ? (
                              <span className="ml-2 rounded-full border border-info/30 bg-info/10 px-2 py-0.5 text-base text-info">
                                Akun Anda
                              </span>
                            ) : null}
                          </p>
                          <p className="mt-1 break-all text-text-muted">{row.email}</p>
                          <p className="mt-1 text-text-muted">Terdaftar {formatDate(row.createdAt)}</p>
                        </td>
                        <td className="px-4 py-4">{ROLE_LABEL[row.role]}</td>
                        <td className="px-4 py-4">{row.region?.name ?? "-"}</td>
                        <td className="px-4 py-4">
                          <StatusBadge active={row.isActive} />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap justify-end gap-2">
                            {!row.isActive ? (
                              <Button
                                variant="secondary"
                                leadingIcon={<UserCheck />}
                                disabled={busy}
                                onClick={() => void handleActivate(row)}
                              >
                                {busy ? "Sedang…" : "Aktifkan"}
                              </Button>
                            ) : null}
                            {!isSelf ? (
                              <>
                                <Button
                                  variant="secondary"
                                  leadingIcon={<UserRoundCog />}
                                  disabled={busy}
                                  onClick={() => {
                                    setRoleTarget(row);
                                    setSelectedRole(row.role);
                                    setRoleError(undefined);
                                  }}
                                >
                                  Ubah peran
                                </Button>
                                {row.isActive ? (
                                  <Button
                                    variant="outlineDanger"
                                    leadingIcon={<UserX />}
                                    disabled={busy}
                                    onClick={() => setDeactivateTarget(row)}
                                  >
                                    Nonaktifkan
                                  </Button>
                                ) : null}
                              </>
                            ) : (
                              <span className="max-w-[220px] text-right text-text-muted">
                                Akun sendiri tidak bisa dinonaktifkan.
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-border md:hidden">
              {list.map((row) => {
                const isSelf = row.id === me?.id;
                const busy = busyId === row.id;

                return (
                  <li key={row.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-text">{row.name}</p>
                        <p className="mt-1 break-all text-base text-text-muted">{row.email}</p>
                      </div>
                      <StatusBadge active={row.isActive} />
                    </div>
                    <dl className="mt-3 space-y-1 text-base">
                      <div className="flex justify-between gap-3">
                        <dt className="text-text-muted">Peran</dt>
                        <dd className="text-text">
                          {ROLE_LABEL[row.role]}
                          {isSelf ? " (akun Anda)" : ""}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-text-muted">Kecamatan</dt>
                        <dd className="text-right text-text">{row.region?.name ?? "-"}</dd>
                      </div>
                    </dl>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {!row.isActive ? (
                        <Button
                          variant="secondary"
                          leadingIcon={<UserCheck />}
                          disabled={busy}
                          onClick={() => void handleActivate(row)}
                        >
                          {busy ? "Sedang…" : "Aktifkan"}
                        </Button>
                      ) : null}
                      {!isSelf ? (
                        <>
                          <Button
                            variant="secondary"
                            leadingIcon={<UserRoundCog />}
                            disabled={busy}
                            onClick={() => {
                              setRoleTarget(row);
                              setSelectedRole(row.role);
                              setRoleError(undefined);
                            }}
                          >
                            Ubah peran
                          </Button>
                          {row.isActive ? (
                            <Button
                              variant="outlineDanger"
                              leadingIcon={<UserX />}
                              disabled={busy}
                              onClick={() => setDeactivateTarget(row)}
                            >
                              Nonaktifkan
                            </Button>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Section>

      <ConfirmDialog
        open={deactivateTarget !== null}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={() => void handleDeactivate()}
        busy={busyId !== null}
        title={
          deactivateTarget ? `Nonaktifkan akun ${deactivateTarget.name}?` : "Nonaktifkan akun?"
        }
        description="Akun tidak bisa masuk lagi sampai diaktifkan kembali. Riwayat laporan dan izin yang pernah dibuat tetap tersimpan."
        confirmLabel="Ya, nonaktifkan akun"
        cancelLabel="Kembali"
      />

      <Modal
        open={roleTarget !== null}
        onClose={() => setRoleTarget(null)}
        title={roleTarget ? `Ubah peran ${roleTarget.name}` : "Ubah peran"}
        description="Menu dan hak akses di server langsung menyesuaikan setelah peran disimpan."
        footer={
          <>
            <Button variant="secondary" onClick={() => setRoleTarget(null)} disabled={busyId !== null}>
              Batal
            </Button>
            <Button onClick={() => void handleSaveRole()} disabled={busyId !== null}>
              {busyId !== null ? "Sedang menyimpan…" : "Simpan peran"}
            </Button>
          </>
        }
      >
        {roleError ? (
          <Alert tone="danger" title="Peran belum tersimpan." className="mb-4">
            {roleError}
          </Alert>
        ) : null}

        <Field id="ubah-peran" label="Peran baru" required>
          <SelectInput
            value={selectedRole}
            onChange={(event) => setSelectedRole(event.target.value as Role)}
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABEL[role]}
              </option>
            ))}
          </SelectInput>
        </Field>
      </Modal>
    </AppShell>
  );
}
