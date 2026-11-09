import {
  DISASTER_LABEL,
  formatDateTime,
  formatDistance,
  formatNumber,
  SURABAYA_CENTER,
  trackingCodeSchema,
} from "@sialokasi/shared";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Clock3,
  FileCheck2,
  Info,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { Alert } from "../../components/Alert";
import { AppHeader } from "../../components/AppHeader";
import { Button, buttonStyles } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { Field, TextInput } from "../../components/Field";
import { IncidentTimeline } from "../../components/IncidentTimeline";
import { NotificationBell } from "../../components/NotificationBell";
import { Skeleton } from "../../components/Skeleton";
import { StatusChip } from "../../components/StatusChip";
import { IncidentFocusMap } from "../../components/map/IncidentFocusMap";
import { MapCanvas } from "../../components/map/MapCanvas";
import { api, ApiError } from "../../lib/api";
import { homePathForRole } from "../../lib/roles";

export function TrackingPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const codeParam = searchParams.get("kode") ?? "";

  const initialCode = trackingCodeSchema.safeParse(codeParam);
  const [codeInput, setCodeInput] = useState(codeParam.toUpperCase());
  const [submittedCode, setSubmittedCode] = useState<string | null>(
    initialCode.success ? initialCode.data : null,
  );
  const [codeError, setCodeError] = useState<string | undefined>();

  useEffect(() => {
    const normalized = codeParam.trim().toUpperCase();
    if (!normalized) return;
    setCodeInput(normalized);
    const parsed = trackingCodeSchema.safeParse(normalized);
    if (parsed.success) setSubmittedCode(parsed.data);
  }, [codeParam]);

  const tracking = useQuery({
    queryKey: ["public", "tracking", submittedCode],
    queryFn: () => api.publicTracking(submittedCode as string),
    enabled: Boolean(submittedCode),
    retry: false,
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = trackingCodeSchema.safeParse(codeInput);
    if (!parsed.success) {
      setCodeError(
        parsed.error.issues[0]?.message ??
          "Kode lacak terdiri dari SIA- lalu 5 huruf atau angka, contoh: SIA-7K2Q9.",
      );
      return;
    }

    setCodeError(undefined);
    setSubmittedCode(parsed.data);
    setSearchParams({ kode: parsed.data });
  };

  const result = tracking.data;
  const notFound = tracking.error instanceof ApiError && tracking.error.status === 404;

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader
        user={user ? { name: user.name, role: user.role } : null}
        actions={
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex">
              <Link to="/" className={buttonStyles("secondary", "md")}>
                Peta kejadian
              </Link>
            </span>
            {user ? <NotificationBell /> : null}
            {user ? (
              <Link to={homePathForRole(user.role)} className={buttonStyles("primary", "md")}>
                Dasbor
              </Link>
            ) : (
              <Link to="/masuk" className={buttonStyles("primary", "md")}>
                Masuk
              </Link>
            )}
          </div>
        }
      />

      <main id="isi-utama" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        <div className="border-b border-border pb-6">
          <p className="text-base font-medium text-info">Lacak laporan</p>
          <h1 className="mt-1 text-[28px] font-bold leading-[36px] text-text sm:text-[32px] sm:leading-[40px]">
            Pantau status bantuan
          </h1>
          <p className="mt-2 max-w-3xl text-base text-text-muted">
            Masukkan kode lacak dari petugas untuk melihat status terbaru, riwayat, dan bantuan
            yang sudah disetujui. Tidak perlu masuk.
          </p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-6">
            <section className="rounded-lg border border-border bg-surface p-5">
              <h2 className="text-[22px] font-semibold leading-[30px]">Kode lacak</h2>
              <p className="mt-1 text-base text-text-muted">
                Kode terdiri dari SIA- lalu lima huruf atau angka.
              </p>

              <form onSubmit={submit} className="mt-4 grid gap-4" noValidate>
                <Field
                  id="tracking-code"
                  label="Kode lacak laporan"
                  hint="Contoh: SIA-7K2Q9. Huruf besar dan kecil sama-sama bisa."
                  error={codeError}
                  required
                >
                  <TextInput
                    value={codeInput}
                    placeholder="SIA-7K2Q9"
                    maxLength={9}
                    autoComplete="off"
                    className="font-mono text-[22px] tracking-[0.12em]"
                    onChange={(event) => {
                      setCodeInput(event.target.value.toUpperCase());
                      if (codeError) setCodeError(undefined);
                    }}
                  />
                </Field>

                <Button type="submit" size="lg" leadingIcon={<Search />} className="w-full">
                  Lacak laporan
                </Button>
              </form>
            </section>

            {!submittedCode ? (
              <EmptyState
                icon={<ShieldCheck />}
                title="Masukkan kode lacak untuk mulai."
                description="Kode lacak diberikan petugas saat laporan dibuat. Tanpa kode, Anda tetap bisa melihat kejadian aktif di peta publik."
                action={
                  <Link to="/" className={buttonStyles("secondary", "md")}>
                    Lihat peta kejadian
                  </Link>
                }
              />
            ) : tracking.isPending ? (
              <div className="space-y-4" aria-busy="true">
                <span className="sr-only">Sedang mencari kode lacak</span>
                <Skeleton variant="card" className="h-48" />
                <Skeleton variant="card" className="h-64" />
              </div>
            ) : tracking.isError ? (
              <Alert
                tone="danger"
                title={
                  notFound
                    ? "Kode lacak tidak ditemukan."
                    : "Status laporan belum bisa dimuat."
                }
                action={
                  <Button
                    variant="secondary"
                    leadingIcon={<RefreshCw />}
                    onClick={() => void tracking.refetch()}
                    disabled={tracking.isRefetching}
                  >
                    {tracking.isRefetching ? "Sedang mencoba…" : "Coba lagi"}
                  </Button>
                }
              >
                {notFound
                  ? "Periksa kembali huruf dan angka pada kode. Bila masih tidak ditemukan, minta kode terbaru ke petugas yang membuat laporan."
                  : tracking.error instanceof Error
                    ? tracking.error.message
                    : "Periksa koneksi, lalu tekan Coba lagi."}
              </Alert>
            ) : result ? (
              <>
                <section className="rounded-lg border border-border bg-surface p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-base text-info">{result.incident.code}</p>
                      <h2 className="mt-1 text-[22px] font-semibold leading-[30px]">
                        {result.incident.title}
                      </h2>
                      <p className="mt-1 text-base text-text-muted">
                        {DISASTER_LABEL[result.incident.disasterType]} ·{" "}
                        {result.incident.regionName ?? "Kecamatan belum diisi"}
                      </p>
                    </div>
                    <StatusChip status={result.incident.status} />
                  </div>

                  <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-md border border-border bg-elevated p-3">
                      <dt className="flex items-center gap-2 text-base text-text-muted">
                        <Clock3 aria-hidden="true" className="h-5 w-5" />
                        Waktu kejadian
                      </dt>
                      <dd className="mt-1 text-base text-text">
                        {formatDateTime(result.incident.occurredAt)}
                      </dd>
                    </div>
                    <div className="rounded-md border border-border bg-elevated p-3">
                      <dt className="flex items-center gap-2 text-base text-text-muted">
                        <MapPin aria-hidden="true" className="h-5 w-5" />
                        Wilayah terdampak
                      </dt>
                      <dd className="mt-1 text-base text-text">
                        {formatDistance(result.incident.radiusM)}
                      </dd>
                    </div>
                    <div className="rounded-md border border-border bg-elevated p-3">
                      <dt className="flex items-center gap-2 text-base text-text-muted">
                        <Users aria-hidden="true" className="h-5 w-5" />
                        Jiwa terdampak
                      </dt>
                      <dd className="mt-1 text-base text-text">
                        {result.incident.affectedPeople === null
                          ? "Belum diisi"
                          : `${formatNumber(result.incident.affectedPeople)} jiwa`}
                      </dd>
                    </div>
                    <div className="rounded-md border border-border bg-elevated p-3">
                      <dt className="flex items-center gap-2 text-base text-text-muted">
                        <FileCheck2 aria-hidden="true" className="h-5 w-5" />
                        Izin distribusi
                      </dt>
                      <dd className="mt-1 font-mono text-base text-text">
                        {result.permit?.number ?? "Belum terbit"}
                      </dd>
                    </div>
                  </dl>
                </section>

                <section className="rounded-lg border border-border bg-surface p-5">
                  <h2 className="text-[22px] font-semibold leading-[30px]">Riwayat status</h2>
                  <p className="mt-1 text-base text-text-muted">
                    Empat langkah utama dari laporan dibuat sampai bantuan disetujui.
                  </p>
                  <div className="mt-4">
                    <IncidentTimeline
                      timeline={result.timeline}
                      currentStatus={result.incident.status}
                    />
                  </div>
                </section>

                {result.aid ? (
                  <section className="rounded-lg border border-border bg-surface">
                    <div className="border-b border-border p-5">
                      <h2 className="text-[22px] font-semibold leading-[30px]">
                        Bantuan yang disetujui
                      </h2>
                      <p className="mt-1 text-base text-text-muted">
                        {formatNumber(result.aid.totalPeople)} jiwa ·{" "}
                        {result.aid.items.length} jenis bantuan
                      </p>
                    </div>
                    <div className="p-5">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[520px] border-collapse text-left text-base">
                          <caption className="sr-only">Daftar bantuan yang disetujui</caption>
                          <thead>
                            <tr className="border-b border-border text-text-muted">
                              <th scope="col" className="px-2 py-3 font-medium">Jenis bantuan</th>
                              <th scope="col" className="px-2 py-3 text-right font-medium">Jumlah</th>
                              <th scope="col" className="px-2 py-3 font-medium">Satuan</th>
                              <th scope="col" className="px-2 py-3 font-medium">Alasan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {result.aid.items.map((item) => (
                              <tr key={`${item.name}-${item.unit}`} className="align-top">
                                <th scope="row" className="px-2 py-3 text-left font-medium text-text">
                                  {item.name}
                                </th>
                                <td className="px-2 py-3 text-right font-semibold text-text">
                                  {formatNumber(item.qty)}
                                </td>
                                <td className="px-2 py-3 text-text-muted">{item.unit}</td>
                                <td className="px-2 py-3 text-text-muted">{item.reason}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </section>
                ) : null}

                {result.permit ? (
                  <section className="rounded-lg border border-border bg-surface p-5">
                    <h2 className="flex items-center gap-2 text-[22px] font-semibold leading-[30px]">
                      <FileCheck2 aria-hidden="true" className="h-6 w-6 text-success" />
                      Izin distribusi
                    </h2>
                    <dl className="mt-4 space-y-3 text-base">
                      <div className="flex justify-between gap-3">
                        <dt className="text-text-muted">Nomor izin</dt>
                        <dd className="font-mono text-text">{result.permit.number}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-text-muted">Posko tujuan</dt>
                        <dd className="text-right text-text">{result.permit.poskoName}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-text-muted">Tanggal terbit</dt>
                        <dd className="text-right text-text">
                          {formatDateTime(result.permit.issuedAt)}
                        </dd>
                      </div>
                      {result.permit.validUntil ? (
                        <div className="flex justify-between gap-3">
                          <dt className="text-text-muted">Berlaku sampai</dt>
                          <dd className="text-right text-text">
                            {formatDateTime(result.permit.validUntil)}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  </section>
                ) : null}

                <p className="flex items-start gap-2 text-base text-text-muted">
                  <Info aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-info" />
                  {result.note}
                </p>
              </>
            ) : null}
          </div>

          <aside className="min-w-0 self-start lg:sticky lg:top-24">
            <section className="overflow-hidden rounded-lg border border-border bg-surface">
              <div className="border-b border-border p-5">
                <h2 className="text-[22px] font-semibold leading-[30px]">Peta laporan</h2>
                <p className="mt-1 text-base text-text-muted">
                  Titik dan radius wilayah terdampak dari laporan yang dilacak.
                </p>
              </div>

              {result ? (
                <IncidentFocusMap
                  lat={result.incident.lat}
                  lng={result.incident.lng}
                  radiusM={result.incident.radiusM}
                  title={result.incident.title}
                  heightClass="h-[420px]"
                  plain
                />
              ) : (
                <div className="relative h-[420px]">
                  <MapCanvas center={SURABAYA_CENTER} zoom={12} />
                  <div className="pointer-events-none absolute inset-x-4 bottom-4 z-[500] rounded-md border border-border bg-surface/95 p-4 text-base text-text-muted">
                    Peta akan menyorot titik laporan setelah kode lacak ditemukan.
                  </div>
                </div>
              )}
            </section>

            <div className="mt-4 rounded-lg border border-border bg-surface p-5">
              <h2 className="flex items-center gap-2 text-[22px] font-semibold leading-[30px]">
                <ShieldCheck aria-hidden="true" className="h-6 w-6 text-success" />
                Data yang ditampilkan
              </h2>
              <ul className="mt-3 space-y-2 text-base text-text-muted">
                <li>Status dan riwayat perjalanan laporan.</li>
                <li>Ringkasan bantuan yang sudah disetujui.</li>
                <li>Nomor izin dan posko tujuan.</li>
              </ul>
              <p className="mt-3 border-t border-border pt-3 text-base text-text-muted">
                Nama, email, dan nomor telepon pelapor tidak ditampilkan di halaman ini.
              </p>
              <Link
                to="/"
                className="mt-4 inline-flex min-h-11 items-center gap-2 text-base font-medium text-info underline-offset-4 hover:underline"
              >
                Kembali ke peta kejadian
                <ArrowRight aria-hidden="true" className="h-5 w-5" />
              </Link>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
