import {
  disasterLabel,
  formatDateTime,
  formatDistance,
  formatNumber,
  STATUS_LABEL,
  SURABAYA_CENTER,
  trackingCodeSchema,
} from "@sialokasi/shared";
import { useQuery } from "@tanstack/react-query";
import {
  Clock3,
  FileCheck2,
  Info,
  MapPin,
  RefreshCw,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { Alert } from "../../components/Alert";
import { AppHeader } from "../../components/AppHeader";
import { Button, buttonStyles } from "../../components/Button";
import { Field, TextInput } from "../../components/Field";
import { IncidentTimeline } from "../../components/IncidentTimeline";
import { NotificationBell } from "../../components/NotificationBell";
import { PageHeader } from "../../components/PageHeader";
import { Section } from "../../components/Section";
import { Skeleton } from "../../components/Skeleton";
import { StatusChip } from "../../components/StatusChip";
import { IncidentFocusMap } from "../../components/map/IncidentFocusMap";
import { MapCanvas } from "../../components/map/MapCanvas";
import { api, ApiError } from "../../lib/api";
import { focusSection } from "../../lib/focus";
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
  const lastFocused = useRef<string | null>(null);

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

  const result = tracking.data;

  useEffect(() => {
    if (!result?.incident.code || lastFocused.current === result.incident.code) return;
    lastFocused.current = result.incident.code;
    focusSection("status-laporan");
  }, [result?.incident.code]);

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

  const notFound = tracking.error instanceof ApiError && tracking.error.status === 404;

  const codeForm = (
    <form onSubmit={submit} className="grid max-w-[560px] gap-4" noValidate>
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

      <Button type="submit" size="lg" className="w-full sm:max-w-[220px]">
        Lacak laporan
      </Button>
    </form>
  );

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

      <main
        id="isi-utama"
        className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-8 sm:px-6 lg:px-12"
      >
        <PageHeader
          eyebrow={result ? `Kode ${result.incident.code}` : undefined}
          title={result ? result.incident.title : "Lacak laporan"}
          brief={
            result
              ? `${disasterLabel(result.incident.disasterType, result.incident.disasterDetail)} · ${
                  result.incident.regionName ?? "Kecamatan belum diisi"
                }`
              : "Masukkan kode lacak untuk melihat status."
          }
        />

        {!submittedCode ? (
          <Section
            tone="focus"
            headingId="kode-lacak"
            title="Kode lacak"
            brief="Kode diberikan petugas saat laporan dibuat."
            className="mt-6"
          >
            {codeForm}
            <p className="mt-5 border-t border-border pt-4 text-base text-text-muted">
              Tanpa kode, Anda tetap bisa melihat kejadian aktif di peta publik.
            </p>
          </Section>
        ) : tracking.isPending ? (
          <Section tone="focus" headingId="status-laporan" title="Status laporan" className="mt-6">
            <div className="space-y-4" aria-busy="true">
              <span className="sr-only">Sedang mencari kode lacak</span>
              <Skeleton variant="card" className="h-32" />
              <Skeleton variant="card" className="h-64" />
            </div>
          </Section>
        ) : tracking.isError ? (
          <Section tone="focus" headingId="status-laporan" title="Status laporan" className="mt-6">
            <Alert
              tone="danger"
              title={notFound ? "Kode lacak tidak ditemukan." : "Status laporan belum bisa dimuat."}
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
            <div className="mt-6 border-t border-border pt-5">
              <h3 className="text-section text-text/90">Lacak kode lain</h3>
              <div className="mt-3">{codeForm}</div>
            </div>
          </Section>
        ) : result ? (
          <>
            <Section
              tone="focus"
              headingId="status-laporan"
              title="Status laporan"
              actions={<StatusChip status={result.incident.status} />}
              className="mt-6"
            >
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-border pb-4">
                <p className="font-mono text-base text-info">{result.incident.code}</p>
                <p className="text-base text-text-muted">
                  Kejadian {formatDateTime(result.incident.occurredAt)}
                </p>
                <p role="status" className="sr-only">
                  Status laporan: {STATUS_LABEL[result.incident.status]}
                </p>
              </div>

              <div className="mt-5">
                <IncidentTimeline
                  timeline={result.timeline}
                  currentStatus={result.incident.status}
                />
              </div>

              <p className="mt-5 flex items-start gap-2 border-t border-border pt-4 text-base text-text-muted">
                <Info aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-info" />
                {result.note}
              </p>
            </Section>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <Section title="Ringkasan kejadian">
                <dl className="space-y-3 text-base">
                  <div className="flex justify-between gap-3">
                    <dt className="flex items-center gap-2 text-text-muted">
                      <Clock3 aria-hidden="true" className="h-5 w-5" />
                      Waktu kejadian
                    </dt>
                    <dd className="text-right text-text">
                      {formatDateTime(result.incident.occurredAt)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="flex items-center gap-2 text-text-muted">
                      <MapPin aria-hidden="true" className="h-5 w-5" />
                      Wilayah terdampak
                    </dt>
                    <dd className="text-right text-text">
                      {formatDistance(result.incident.radiusM)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="flex items-center gap-2 text-text-muted">
                      <Users aria-hidden="true" className="h-5 w-5" />
                      Jiwa terdampak
                    </dt>
                    <dd className="text-right font-mono text-text">
                      {result.incident.affectedPeople === null
                        ? "Belum diisi"
                        : `${formatNumber(result.incident.affectedPeople)} jiwa`}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="flex items-center gap-2 text-text-muted">
                      <FileCheck2 aria-hidden="true" className="h-5 w-5" />
                      Izin distribusi
                    </dt>
                    <dd className="text-right font-mono text-text">
                      {result.permit?.number ?? "Belum terbit"}
                    </dd>
                  </div>
                </dl>
              </Section>

              <Section title="Peta laporan">
                <IncidentFocusMap
                  lat={result.incident.lat}
                  lng={result.incident.lng}
                  radiusM={result.incident.radiusM}
                  title={result.incident.title}
                  heightClass="h-[320px]"
                  plain
                />
              </Section>
            </div>

            {result.aid ? (
              <Section
                title="Bantuan yang disetujui"
                actions={
                  <span className="font-mono text-base text-text-muted">
                    {formatNumber(result.aid.totalPeople)} jiwa · {result.aid.items.length} jenis
                  </span>
                }
                className="mt-6"
              >
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] border-collapse text-left text-base">
                    <caption className="sr-only">Daftar bantuan yang disetujui</caption>
                    <thead>
                      <tr className="border-b border-border text-text-muted">
                        <th scope="col" className="px-2 py-3 font-medium">
                          Jenis bantuan
                        </th>
                        <th scope="col" className="px-2 py-3 text-right font-medium">
                          Jumlah
                        </th>
                        <th scope="col" className="px-2 py-3 font-medium">
                          Satuan
                        </th>
                        <th scope="col" className="px-2 py-3 font-medium">
                          Alasan
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {result.aid.items.map((item) => (
                        <tr key={`${item.name}-${item.unit}`} className="align-top">
                          <th scope="row" className="px-2 py-3 text-left font-medium text-text">
                            {item.name}
                          </th>
                          <td className="px-2 py-3 text-right font-mono text-base text-text">
                            {formatNumber(item.qty)}
                          </td>
                          <td className="px-2 py-3 text-text-muted">{item.unit}</td>
                          <td className="px-2 py-3 text-text-muted">{item.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            ) : null}

            {result.permit ? (
              <Section title="Izin distribusi" className="mt-6">
                <dl className="space-y-3 text-base sm:max-w-[560px]">
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
              </Section>
            ) : null}

            <Section title="Lacak kode lain" className="mt-6">
              {codeForm}
            </Section>

            <Section tone="quiet" title="Data yang ditampilkan" className="mt-6">
              <ul className="space-y-2 text-base text-text-muted">
                <li>Status dan riwayat perjalanan laporan.</li>
                <li>Ringkasan bantuan yang sudah disetujui.</li>
                <li>Nomor izin dan posko tujuan.</li>
              </ul>
              <p className="mt-3 border-t border-border pt-3 text-base text-text-muted">
                Nama, email, dan nomor telepon pelapor tidak ditampilkan di halaman ini.
              </p>
            </Section>
          </>
        ) : (
          <Section title="Peta laporan" className="mt-6">
            <div className="relative h-[320px]">
              <MapCanvas center={SURABAYA_CENTER} zoom={12} />
              <div className="pointer-events-none absolute inset-x-4 bottom-4 z-[500] border border-border bg-surface/95 p-4 text-base text-text-muted">
                Peta akan menyorot titik laporan setelah kode lacak ditemukan.
              </div>
            </div>
          </Section>
        )}
      </main>
    </div>
  );
}
