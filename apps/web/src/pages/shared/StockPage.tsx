import { formatDateTime, formatNumber } from "@sialokasi/shared";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  History,
  Info,
  MapPinned,
  Package,
  RefreshCw,
  Warehouse,
} from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { AidIcon } from "../../components/AidIcon";
import { Alert } from "../../components/Alert";
import { Button, buttonStyles } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { PageHeader } from "../../components/PageHeader";
import { Skeleton } from "../../components/Skeleton";
import { StatCard } from "../../components/StatCard";
import { AppShell } from "../../layouts/AppShell";
import { api } from "../../lib/api";

export function StockPage() {
  const { user } = useAuth();
  const stock = useQuery({ queryKey: ["stock", "summary"], queryFn: api.stockSummary });
  const movements = useQuery({
    queryKey: ["stock", "movements"],
    queryFn: () => api.stockMovements(30),
  });

  const { maxByItem, lowCount } = useMemo(() => {
    const max = new Map<string, number>();
    for (const posko of stock.data?.poskos ?? []) {
      for (const row of posko.stocks) {
        max.set(row.aidItemId, Math.max(max.get(row.aidItemId) ?? 0, row.qty));
      }
    }

    let low = 0;
    for (const posko of stock.data?.poskos ?? []) {
      for (const row of posko.stocks) {
        const top = max.get(row.aidItemId) ?? 0;
        const isLow = top === 0 ? row.qty === 0 : row.qty <= top * 0.2;
        if (isLow) low += 1;
      }
    }

    return { maxByItem: max, lowCount: low };
  }, [stock.data]);

  const poskos = stock.data?.poskos ?? [];
  const items = stock.data?.aidItems ?? [];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Stok bantuan"
        title="Ringkasan stok per posko"
        description="Pantau ketersediaan bantuan sebelum menentukan posko tujuan izin distribusi. Halaman ini hanya untuk dilihat."
        actions={
          <>
            <Button
              variant="secondary"
              leadingIcon={<RefreshCw />}
              onClick={() => {
                void stock.refetch();
                void movements.refetch();
              }}
              disabled={stock.isRefetching || movements.isRefetching}
            >
              {stock.isRefetching || movements.isRefetching ? "Sedang memuat…" : "Muat ulang"}
            </Button>
            {user?.role === "ADMIN" ? (
              <Link to="/admin/wilayah" className={buttonStyles("secondary", "md")}>
                <MapPinned aria-hidden="true" className="h-5 w-5" />
                Kelola posko
              </Link>
            ) : null}
          </>
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Posko aktif"
          value={poskos.length}
          loading={stock.isPending}
          icon={Warehouse}
        />
        <StatCard
          label="Jenis bantuan dipantau"
          value={items.length}
          loading={stock.isPending}
          icon={Package}
        />
        <StatCard
          label="Baris stok menipis"
          value={lowCount}
          loading={stock.isPending}
          tone={lowCount > 0 ? "warning" : "success"}
          icon={AlertTriangle}
          hint="Menipis berarti sisa ≤ 20% dari stok tertinggi item yang sama."
        />
      </div>

      {lowCount > 0 ? (
        <Alert tone="warning" title={`${formatNumber(lowCount)} baris stok perlu perhatian.`} className="mt-6">
          Stok menipis bisa membuat persetujuan ditolak. Pilih posko lain atau sesuaikan jumlah
          bantuan sebelum menerbitkan izin.
        </Alert>
      ) : null}

      <section className="mt-6 overflow-hidden rounded-lg border border-border bg-surface">
        <div className="border-b border-border p-5">
          <h2 className="text-[22px] font-semibold leading-[30px]">Matriks stok</h2>
          <p className="mt-1 text-base text-text-muted">
            {stock.data?.note ?? "Ringkasan stok hanya untuk dilihat."}
          </p>
        </div>

        <div className="p-5">
          {stock.isPending ? (
            <div className="space-y-3" aria-busy="true">
              <span className="sr-only">Sedang memuat ringkasan stok</span>
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : stock.isError ? (
            <Alert
              tone="danger"
              title="Ringkasan stok belum bisa dimuat."
              action={
                <Button variant="secondary" onClick={() => void stock.refetch()}>
                  Coba lagi
                </Button>
              }
            >
              Periksa koneksi, lalu tekan Coba lagi.
            </Alert>
          ) : items.length === 0 || poskos.length === 0 ? (
            <EmptyState
              compact
              icon={<Warehouse />}
              title="Belum ada data stok untuk ditampilkan."
              description="Tambahkan jenis bantuan dan posko aktif lebih dahulu. Ringkasan akan muncul otomatis di sini."
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left text-base">
                  <caption className="sr-only">
                    Stok setiap jenis bantuan di setiap posko aktif
                  </caption>
                  <thead>
                    <tr className="border-b border-border bg-elevated text-text-muted">
                      <th
                        scope="col"
                        className="sticky left-0 z-10 bg-elevated px-4 py-3 font-medium"
                      >
                        Jenis bantuan
                      </th>
                      {poskos.map((posko) => (
                        <th key={posko.id} scope="col" className="px-4 py-3 font-medium">
                          <span className="block text-text">{posko.name}</span>
                          <span className="block text-base font-normal text-text-muted">
                            {posko.regionName}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <th
                          scope="row"
                          className="sticky left-0 z-10 bg-surface px-4 py-4 text-left font-medium text-text"
                        >
                          <span className="flex items-center gap-3">
                            <AidIcon name={item.icon} />
                            <span>
                              {item.name}
                              <span className="block text-base font-normal text-text-muted">
                                satuan {item.unit}
                              </span>
                            </span>
                          </span>
                        </th>
                        {poskos.map((posko) => {
                          const row = posko.stocks.find((stockRow) => stockRow.aidItemId === item.id);
                          const qty = row?.qty ?? 0;
                          const top = maxByItem.get(item.id) ?? 0;
                          const isLow = top === 0 ? qty === 0 : qty <= top * 0.2;

                          return (
                            <td key={posko.id} className="px-4 py-4">
                              <span className="block text-text">
                                {formatNumber(qty)} {item.unit}
                              </span>
                              {isLow ? (
                                <span className="mt-1 inline-flex items-center gap-1 text-base text-warning">
                                  <span
                                    aria-hidden="true"
                                    className="h-2 w-2 rounded-full bg-current"
                                  />
                                  Menipis
                                </span>
                              ) : null}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-start gap-2 border-t border-border pt-4 text-base text-text-muted">
                <Info aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-info" />
                <p>
                  Stok berkurang otomatis saat izin distribusi terbit. Angka di atas adalah sisa
                  stok saat ini, dan setiap perubahan tercatat di jurnal stok di bawah.
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
          <div>
            <h2 className="flex items-center gap-2 text-[22px] font-semibold leading-[30px]">
              <History aria-hidden="true" className="h-6 w-6 text-info" />
              Jurnal stok terakhir
            </h2>
            <p className="mt-1 text-base text-text-muted">
              {movements.data?.note ??
                "Setiap pengambilan dan pengembalian stok meninggalkan satu baris yang tidak bisa dihapus."}
            </p>
          </div>
          <span className="inline-flex min-h-9 items-center rounded-full border border-border bg-elevated px-3 text-base text-text-muted">
            {movements.isPending
              ? "Memuat…"
              : `${formatNumber(movements.data?.movements.length ?? 0)} baris terakhir`}
          </span>
        </div>

        <div className="p-5">
          {movements.isPending ? (
            <div className="space-y-3" aria-busy="true">
              <span className="sr-only">Sedang memuat jurnal stok</span>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : movements.isError ? (
            <Alert
              tone="danger"
              title="Jurnal stok belum bisa dimuat."
              action={
                <Button variant="secondary" onClick={() => void movements.refetch()}>
                  Coba lagi
                </Button>
              }
            >
              Periksa koneksi, lalu tekan Coba lagi.
            </Alert>
          ) : (movements.data?.movements.length ?? 0) === 0 ? (
            <EmptyState
              compact
              icon={<History />}
              title="Belum ada perubahan stok."
              description="Jurnal akan terisi saat pimpinan menyetujui izin atau saat izin dikoreksi. Stok awal dari seed tidak dihitung sebagai perubahan."
            />
          ) : (
            <ul className="divide-y divide-border">
              {movements.data?.movements.map((movement) => {
                const isRelease = movement.kind === "RELEASE";
                const Icon = isRelease ? ArrowUpRight : ArrowDownRight;
                return (
                  <li key={movement.id} className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-base text-text">
                        <span className="font-medium">{movement.aidItemName}</span> ·{" "}
                        {movement.poskoName}
                      </p>
                      <p className="mt-1 text-base text-text-muted">
                        {movement.permitNumber ? (
                          <span className="font-mono text-info">{movement.permitNumber}</span>
                        ) : (
                          "Tanpa izin"
                        )}
                        {movement.actorName ? ` · ${movement.actorName}` : ""} ·{" "}
                        {formatDateTime(movement.createdAt)}
                      </p>
                      {movement.note ? (
                        <p className="mt-1 text-base text-text-muted">{movement.note}</p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <p
                        className={
                          isRelease
                            ? "inline-flex min-h-9 items-center gap-1 font-mono text-base font-semibold text-success"
                            : "inline-flex min-h-9 items-center gap-1 font-mono text-base font-semibold text-danger"
                        }
                      >
                        <Icon aria-hidden="true" className="h-5 w-5" />
                        {movement.qtyDelta > 0 ? "+" : "−"}
                        {formatNumber(Math.abs(movement.qtyDelta))} {movement.unit}
                      </p>
                      <p className="text-base text-text-muted">
                        Sisa {formatNumber(movement.balanceAfter)} {movement.unit}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </AppShell>
  );
}
