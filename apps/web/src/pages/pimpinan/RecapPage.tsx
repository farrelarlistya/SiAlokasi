import {
  DISASTER_LABEL,
  DISASTER_TYPES,
  formatDateTime,
  formatNumber,
  RECAP_GROUP_LABEL,
  RECAP_GROUPS,
  type RecapFilter,
  type RecapGroup,
} from "@sialokasi/shared";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Filter,
  RefreshCw,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { Alert } from "../../components/Alert";
import { Button, buttonStyles } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { Field, SelectInput, TextInput } from "../../components/Field";
import { PageHeader } from "../../components/PageHeader";
import { Skeleton } from "../../components/Skeleton";
import { StatCard } from "../../components/StatCard";
import { AppShell } from "../../layouts/AppShell";
import { api, recapCsvUrl } from "../../lib/api";

type RecapForm = {
  from: string;
  to: string;
  regionId: string;
  disasterType: string;
  groupBy: RecapGroup;
};

const INITIAL_FORM: RecapForm = {
  from: "",
  to: "",
  regionId: "",
  disasterType: "",
  groupBy: "region",
};

function toFilter(form: RecapForm): RecapFilter {
  return {
    from: form.from || undefined,
    to: form.to || undefined,
    regionId: form.regionId || undefined,
    disasterType: form.disasterType
      ? (form.disasterType as RecapFilter["disasterType"])
      : undefined,
    groupBy: form.groupBy,
  };
}

export function RecapPage() {
  const [form, setForm] = useState<RecapForm>(INITIAL_FORM);
  const [applied, setApplied] = useState<RecapFilter>({ groupBy: "region" });
  const [formError, setFormError] = useState<string | undefined>();

  const master = useQuery({ queryKey: ["master", "options"], queryFn: api.masterOptions });
  const recap = useQuery({
    queryKey: ["pimpinan", "recap", applied],
    queryFn: () => api.recap(applied),
  });

  const data = recap.data;
  const totals = data?.totals;
  const rows = data?.rows ?? [];

  const apply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(undefined);

    if (form.from && form.to && form.from > form.to) {
      setFormError("Tanggal awal tidak boleh setelah tanggal akhir.");
      return;
    }

    setApplied(toFilter(form));
  };

  return (
    <AppShell>
      <PageHeader
        title="Rekap laporan bantuan"
        actions={
          <>
            <Button
              variant="secondary"
              leadingIcon={<RefreshCw />}
              onClick={() => void recap.refetch()}
              disabled={recap.isRefetching}
            >
              {recap.isRefetching ? "Sedang memuat…" : "Muat ulang"}
            </Button>
            <a
              href={recapCsvUrl(applied)}
              download
              className={buttonStyles("primary", "md")}
            >
              <Download aria-hidden="true" className="h-5 w-5" />
              Unduh CSV
            </a>
          </>
        }
      />

      <form
        onSubmit={apply}
        className="mt-6 border-t border-border pt-5"
        aria-labelledby="filter-rekap"
      >
        <div className="flex items-center gap-2">
          <Filter aria-hidden="true" className="h-5 w-5 text-info" />
          <h2 id="filter-rekap" className="text-section text-text/90">
            Saring data
          </h2>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-4">
          <Field id="recap-from" label="Dari tanggal">
            <TextInput
              type="date"
              value={form.from}
              onChange={(event) => setForm((current) => ({ ...current, from: event.target.value }))}
            />
          </Field>
          <Field id="recap-to" label="Sampai tanggal">
            <TextInput
              type="date"
              value={form.to}
              onChange={(event) => setForm((current) => ({ ...current, to: event.target.value }))}
            />
          </Field>
          <Field id="recap-region" label="Kecamatan">
            <SelectInput
              value={form.regionId}
              onChange={(event) =>
                setForm((current) => ({ ...current, regionId: event.target.value }))
              }
            >
              <option value="">Semua kecamatan</option>
              {(master.data?.regions ?? []).map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field id="recap-disaster" label="Jenis bencana">
            <SelectInput
              value={form.disasterType}
              onChange={(event) =>
                setForm((current) => ({ ...current, disasterType: event.target.value }))
              }
            >
              <option value="">Semua jenis</option>
              {DISASTER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {DISASTER_LABEL[type]}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>

        <fieldset className="mt-4">
          <legend className="text-base font-medium text-text">Kelompokkan menurut</legend>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            {RECAP_GROUPS.map((group) => (
              <button
                key={group}
                type="button"
                aria-pressed={form.groupBy === group}
                onClick={() => setForm((current) => ({ ...current, groupBy: group }))}
                className={
                  form.groupBy === group
                    ? "inline-flex min-h-11 items-center justify-center rounded-md border border-info/50 bg-info/15 px-4 text-base font-medium text-text"
                    : "inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-elevated px-4 text-base text-text-muted transition-colors hover:bg-hover hover:text-text"
                }
              >
                {RECAP_GROUP_LABEL[group]}
              </button>
            ))}
          </div>
        </fieldset>

        {formError ? (
          <Alert tone="danger" title="Saringan belum bisa dipakai." className="mt-4">
            {formError}
          </Alert>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <Button type="submit" leadingIcon={<BarChart3 />}>
            Terapkan saringan
          </Button>
        </div>
      </form>

      <section aria-labelledby="ringkasan-rekap" className="mt-6">
        <h2 id="ringkasan-rekap" className="sr-only">
          Ringkasan rekap
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Laporan tercatat"
            value={totals?.totalReports}
            loading={recap.isPending}
            icon={FileSpreadsheet}
          />
          <StatCard
            label="Jiwa terdampak"
            value={totals?.affectedPeople}
            loading={recap.isPending}
            icon={Users}
            tone="info"
          />
          <StatCard
            label="Sudah disetujui"
            value={totals?.approved}
            loading={recap.isPending}
            icon={ShieldCheck}
            tone="success"
          />
          <StatCard
            label="Izin terbit aktif"
            value={totals?.permits}
            loading={recap.isPending}
            icon={BarChart3}
            hint="Izin yang sudah digantikan koreksi tidak dihitung dua kali."
          />
        </div>
      </section>

      <section className="mt-6 border-t border-border">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
          <div>
            <h2 className="text-section text-text/90">
              Rekap per {RECAP_GROUP_LABEL[applied.groupBy].toLowerCase()}
            </h2>
            <p className="mt-1 text-base text-text-muted">
              {data?.note ?? "Angka dihitung dari laporan yang tercatat di aplikasi."}
            </p>
          </div>
          <span className="inline-flex min-h-9 items-center rounded-full border border-border bg-elevated px-3 text-base text-text-muted">
            {recap.isPending ? "Memuat…" : `${formatNumber(rows.length)} kelompok`}
          </span>
        </div>

        <div className="p-5">
          {recap.isPending ? (
            <div className="space-y-3" aria-busy="true">
              <span className="sr-only">Sedang memuat rekap laporan</span>
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : recap.isError ? (
            <Alert
              tone="danger"
              title="Rekap belum bisa dimuat."
              action={
                <Button variant="secondary" onClick={() => void recap.refetch()}>
                  Coba lagi
                </Button>
              }
            >
              Periksa koneksi, lalu tekan Coba lagi. Data yang sudah tercatat tidak berubah.
            </Alert>
          ) : rows.length === 0 ? (
            <EmptyState
              compact
              icon={<XCircle />}
              title="Belum ada laporan pada saringan ini."
              description="Ubah tanggal atau kecamatan, lalu tekan Terapkan saringan. Laporan yang baru dibuat akan langsung masuk rekap."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setForm(INITIAL_FORM);
                    setApplied({ groupBy: "region" });
                  }}
                >
                  Tampilkan semua data
                </Button>
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-left text-base">
                  <caption className="sr-only">
                    Rekap laporan per {RECAP_GROUP_LABEL[applied.groupBy].toLowerCase()}
                  </caption>
                  <thead>
                    <tr className="border-b border-border bg-elevated text-text-muted">
                      <th scope="col" className="px-4 py-3 font-medium">
                        {RECAP_GROUP_LABEL[applied.groupBy]}
                      </th>
                      <th scope="col" className="px-4 py-3 text-right font-medium">
                        Laporan
                      </th>
                      <th scope="col" className="px-4 py-3 text-right font-medium">
                        Jiwa
                      </th>
                      <th scope="col" className="px-4 py-3 text-right font-medium">
                        Disetujui
                      </th>
                      <th scope="col" className="px-4 py-3 text-right font-medium">
                        Belum diputuskan
                      </th>
                      <th scope="col" className="px-4 py-3 text-right font-medium">
                        Ditolak
                      </th>
                      <th scope="col" className="px-4 py-3 text-right font-medium">
                        Dibatalkan
                      </th>
                      <th scope="col" className="px-4 py-3 text-right font-medium">
                        Izin
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Kejadian terakhir
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((row) => (
                      <tr key={row.key}>
                        <th scope="row" className="px-4 py-4 text-left font-medium text-text">
                          {row.label}
                        </th>
                        <td className="px-4 py-4 text-right text-text">
                          {formatNumber(row.totalReports)}
                        </td>
                        <td className="px-4 py-4 text-right text-text">
                          {formatNumber(row.affectedPeople)}
                        </td>
                        <td className="px-4 py-4 text-right text-success">
                          {formatNumber(row.approved)}
                        </td>
                        <td className="px-4 py-4 text-right text-warning">
                          {formatNumber(row.waiting)}
                        </td>
                        <td className="px-4 py-4 text-right text-danger">
                          {formatNumber(row.rejected)}
                        </td>
                        <td className="px-4 py-4 text-right text-text-muted">
                          {formatNumber(row.cancelled)}
                        </td>
                        <td className="px-4 py-4 text-right text-text">
                          {formatNumber(row.permits)}
                        </td>
                        <td className="px-4 py-4 text-text-muted">
                          {row.lastOccurredAt ? formatDateTime(row.lastOccurredAt) : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-elevated">
                      <th scope="row" className="px-4 py-4 text-left font-semibold text-text">
                        Jumlah
                      </th>
                      <td className="px-4 py-4 text-right font-semibold text-text">
                        {formatNumber(totals?.totalReports ?? 0)}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-text">
                        {formatNumber(totals?.affectedPeople ?? 0)}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-success">
                        {formatNumber(totals?.approved ?? 0)}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-warning">
                        {formatNumber(totals?.waiting ?? 0)}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-danger">
                        {formatNumber(totals?.rejected ?? 0)}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-text-muted">
                        {formatNumber(totals?.cancelled ?? 0)}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-text">
                        {formatNumber(totals?.permits ?? 0)}
                      </td>
                      <td className="px-4 py-4 text-text-muted">-</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <p className="mt-4 flex items-start gap-2 border-t border-border pt-4 text-base text-text-muted">
                <Download aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-info" />
                Tombol Unduh CSV memakai saringan yang sama. Berkas memuat BOM UTF-8 agar huruf
                Indonesia tampil benar di Excel.
              </p>
            </>
          )}
        </div>
      </section>
    </AppShell>
  );
}
