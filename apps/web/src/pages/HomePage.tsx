import {
  DISASTER_LABEL,
  DISASTER_TYPES,
  disasterLabel,
  formatDateTime,
  formatDistance,
  formatNumber,
  formatRelativeTime,
  SURABAYA_CENTER,
  type DisasterType,
} from "@sialokasi/shared";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, MapPin, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { Alert } from "../components/Alert";
import { AppHeader } from "../components/AppHeader";
import { Button, buttonStyles } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { SelectInput } from "../components/Field";
import { MapWorkspace } from "../components/MapWorkspace";
import { NotificationBell } from "../components/NotificationBell";
import { Section } from "../components/Section";
import { Skeleton } from "../components/Skeleton";
import { StatusChip } from "../components/StatusChip";
import { IncidentMarkers } from "../components/map/IncidentMarkers";
import { MapCanvas } from "../components/map/MapCanvas";
import { api } from "../lib/api";
import { focusSection } from "../lib/focus";
import { homePathForRole } from "../lib/roles";

export function HomePage() {
  const { user } = useAuth();
  const [disasterType, setDisasterType] = useState("");
  const [regionId, setRegionId] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const lastSelected = useRef<string | null>(null);

  const regions = useQuery({ queryKey: ["master", "options"], queryFn: api.masterOptions });
  const incidents = useQuery({
    queryKey: ["public", "incidents", disasterType, regionId],
    queryFn: () => api.publicIncidents({ disasterType, regionId }),
  });

  const list = incidents.data?.incidents ?? [];
  const selected = useMemo(
    () => list.find((incident) => incident.id === selectedId) ?? null,
    [list, selectedId],
  );

  useEffect(() => {
    if (selectedId && !list.some((incident) => incident.id === selectedId)) {
      setSelectedId(null);
    }
  }, [list, selectedId]);

  useEffect(() => {
    if (selectedId && lastSelected.current !== selectedId) {
      lastSelected.current = selectedId;
      focusSection("rincian-kejadian");
    }
    if (!selectedId) lastSelected.current = null;
  }, [selectedId]);

  const hasFilter = disasterType !== "" || regionId !== "";
  const waiting = list.filter((incident) => incident.status === "MENUNGGU_PERSETUJUAN").length;
  const approved = list.filter((incident) => incident.status === "DISETUJUI").length;
  const countLabel = incidents.isPending ? "…" : `${formatNumber(list.length)} laporan`;

  const listContent = incidents.isPending ? (
    <div className="space-y-4 py-2" aria-busy="true">
      <span className="sr-only">Sedang memuat daftar kejadian</span>
      <Skeleton variant="card" className="h-24" />
      <Skeleton variant="card" className="h-24" />
    </div>
  ) : incidents.isError ? (
    <Alert
      tone="danger"
      title="Daftar kejadian belum bisa dimuat."
      action={
        <Button
          variant="secondary"
          leadingIcon={<RefreshCw />}
          onClick={() => void incidents.refetch()}
          disabled={incidents.isRefetching}
        >
          {incidents.isRefetching ? "Sedang mencoba…" : "Coba lagi"}
        </Button>
      }
    >
      Periksa koneksi, lalu tekan Coba lagi. Peta tetap bisa digeser.
    </Alert>
  ) : list.length === 0 ? (
    <EmptyState
      compact
      icon={<ShieldCheck />}
      title={hasFilter ? "Tidak ada kejadian yang cocok." : "Belum ada laporan kejadian."}
      description={
        hasFilter
          ? "Coba pilih jenis bencana atau kecamatan lain."
          : "Saat petugas mengirim laporan, titik dan radiusnya muncul di sini."
      }
      action={
        hasFilter ? (
          <Button
            variant="secondary"
            onClick={() => {
              setDisasterType("");
              setRegionId("");
            }}
          >
            Tampilkan semua
          </Button>
        ) : undefined
      }
    />
  ) : (
    <ul>
      {list.map((incident) => (
        <li key={incident.id} className="border-b border-border last:border-b-0">
          <button
            type="button"
            onClick={() => setSelectedId(incident.id)}
            aria-pressed={selected?.id === incident.id}
            className={`w-full py-4 text-left transition-colors ${
              selected?.id === incident.id ? "bg-elevated" : "hover:bg-elevated/60"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base font-medium text-text">{incident.title}</p>
                <p className="mt-1 text-base text-text-muted">
                  {incident.region?.name ?? "Kecamatan belum diisi"},{" "}
                  {formatRelativeTime(incident.occurredAt)}
                </p>
              </div>
              <span className="shrink-0 font-mono text-base text-text-muted">
                {formatDistance(incident.radiusM)}
              </span>
            </div>
            <StatusChip status={incident.status} className="mt-3" />
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex h-dvh flex-col">
      <AppHeader
        user={user ? { name: user.name, role: user.role } : null}
        actions={
          <div className="flex items-center gap-4">
            {user ? <NotificationBell /> : null}
            {user ? (
              <Link to={homePathForRole(user.role)} className={buttonStyles("primary", "md")}>
                <LayoutDashboard aria-hidden="true" className="h-5 w-5" />
                Dasbor
              </Link>
            ) : (
              <>
                <Link
                  to="/masuk"
                  className="hidden min-h-11 items-center text-base font-medium text-text sm:inline-flex"
                >
                  Masuk
                </Link>
                <Link to="/lacak" className={buttonStyles("primary", "md")}>
                  <span className="sm:hidden">Lacak</span>
                  <span className="hidden sm:inline">Lacak laporan</span>
                </Link>
              </>
            )}
          </div>
        }
      />

      <main id="isi-utama" className="flex min-h-0 flex-1 flex-col">
        <MapWorkspace
          storageKey="sialokasi.panel.peta-publik"
          panelLabel="Panel kejadian"
          sidebar={
            <div className="flex h-full min-h-0 flex-col bg-surface">
              <div className="border-b border-border px-6 pb-5 pt-6">
                <h1 className="text-page text-text">Kejadian aktif</h1>

                <div className="mt-5 hidden gap-3 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))] sm:grid">
                  <SelectInput
                    aria-label="Saring jenis bencana"
                    value={disasterType}
                    onChange={(event) => setDisasterType(event.target.value)}
                    className="min-h-11"
                  >
                    <option value="">Semua bencana</option>
                    {DISASTER_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {DISASTER_LABEL[type]}
                      </option>
                    ))}
                  </SelectInput>

                  <SelectInput
                    aria-label="Saring kecamatan"
                    value={regionId}
                    onChange={(event) => setRegionId(event.target.value)}
                    disabled={regions.isPending}
                    className="min-h-11"
                  >
                    <option value="">Semua wilayah</option>
                    {(regions.data?.regions ?? []).map((region) => (
                      <option key={region.id} value={region.id}>
                        {region.name}
                      </option>
                    ))}
                  </SelectInput>
                </div>

                <div className="hidden sm:block">
                  {hasFilter ? (
                    <Button
                      variant="ghost"
                      className="mt-2 h-11 px-0"
                      onClick={() => {
                        setDisasterType("");
                        setRegionId("");
                      }}
                    >
                      Tampilkan semua kejadian
                    </Button>
                  ) : null}
                </div>

                <details className="mt-4 sm:hidden">
                  <summary className="inline-flex min-h-11 cursor-pointer items-center text-base font-medium text-text-muted">
                    Saring kejadian
                  </summary>
                  <div className="mt-3 grid gap-3">
                    <SelectInput
                      aria-label="Saring jenis bencana"
                      value={disasterType}
                      onChange={(event) => setDisasterType(event.target.value)}
                      className="min-h-11"
                    >
                      <option value="">Semua bencana</option>
                      {DISASTER_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {DISASTER_LABEL[type]}
                        </option>
                      ))}
                    </SelectInput>
                    <SelectInput
                      aria-label="Saring kecamatan"
                      value={regionId}
                      onChange={(event) => setRegionId(event.target.value)}
                      disabled={regions.isPending}
                      className="min-h-11"
                    >
                      <option value="">Semua wilayah</option>
                      {(regions.data?.regions ?? []).map((region) => (
                        <option key={region.id} value={region.id}>
                          {region.name}
                        </option>
                      ))}
                    </SelectInput>
                    {hasFilter ? (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setDisasterType("");
                          setRegionId("");
                        }}
                      >
                        Tampilkan semua kejadian
                      </Button>
                    ) : null}
                  </div>
                </details>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
                {selected ? (
                  <>
                    <Section
                      tone="focus"
                      headingId="rincian-kejadian"
                      title={selected.title}
                      actions={
                        <Button
                          variant="ghost"
                          className="h-11 px-0"
                          onClick={() => setSelectedId(null)}
                        >
                          Tutup
                        </Button>
                      }
                      className="mt-5"
                    >
                      <p className="font-mono text-base text-info">{selected.code}</p>

                      <dl className="mt-4 space-y-2 text-base">
                        <div className="flex justify-between gap-3">
                          <dt className="text-text-muted">Status</dt>
                          <dd>
                            <StatusChip status={selected.status} />
                          </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-text-muted">Waktu kejadian</dt>
                          <dd className="text-right font-mono text-text">
                            {formatDateTime(selected.occurredAt)}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-text-muted">Jenis bencana</dt>
                          <dd className="text-right text-text">
                            {disasterLabel(
                              selected.disasterType as DisasterType,
                              selected.disasterDetail,
                            )}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-text-muted">Jiwa terdampak</dt>
                          <dd className="text-right font-mono text-text">
                            {formatNumber(selected.affectedPeople)}
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-5">
                        <Link
                          to={`/lacak?kode=${encodeURIComponent(selected.code)}`}
                          className={buttonStyles("primary", "md")}
                        >
                          Lacak laporan ini
                        </Link>
                      </div>
                      <p className="mt-3 border-t border-border pt-3 text-base text-text-muted">
                        Data pribadi pelapor tidak ditampilkan.
                      </p>
                    </Section>

                    <Section
                      title="Daftar kejadian"
                      actions={<span className="font-mono text-base text-text-muted">{countLabel}</span>}
                      className="mt-6"
                    >
                      {listContent}
                    </Section>
                  </>
                ) : (
                  <Section
                    tone="focus"
                    headingId="daftar-kejadian"
                    title="Daftar kejadian"
                    actions={<span className="font-mono text-base text-text-muted">{countLabel}</span>}
                    className="mt-5"
                  >
                    {listContent}
                  </Section>
                )}
                {list.length > 0 ? (
                  <div className="mt-6 border-t border-border pt-4 sm:hidden">
                    <h2 className="text-base font-medium text-text-muted">Ringkasan</h2>
                    <dl className="mt-2 flex items-stretch justify-between gap-3">
                      {[
                        ["Laporan aktif", formatNumber(list.length)],
                        ["Menunggu", formatNumber(waiting)],
                        ["Disetujui", formatNumber(approved)],
                      ].map(([label, value], index) => (
                        <div key={label} className={index > 0 ? "border-l border-border pl-4" : ""}>
                          <dd className="font-mono text-section tabular-nums text-text">{value}</dd>
                          <dt className="text-base text-text-muted">{label}</dt>
                        </div>
                      ))}
                    </dl>
                  </div>
                ) : null}
              </div>

              {list.length > 0 ? (
                <div className="hidden border-t border-border px-6 py-4 sm:block">
                  <h2 className="text-base font-medium text-text-muted">Ringkasan</h2>
                  <dl className="mt-2 flex items-stretch justify-between gap-3">
                    {[
                      ["Laporan aktif", formatNumber(list.length)],
                      ["Menunggu", formatNumber(waiting)],
                      ["Disetujui", formatNumber(approved)],
                    ].map(([label, value], index) => (
                      <div key={label} className={index > 0 ? "border-l border-border pl-4" : ""}>
                        <dd className="font-mono text-section tabular-nums text-text">{value}</dd>
                        <dt className="text-base text-text-muted">{label}</dt>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
                    <p className="flex items-center gap-2 text-base text-text-muted">
                      <MapPin aria-hidden="true" className="h-5 w-5" />
                      Data kejadian publik
                    </p>
                    <button
                      type="button"
                      onClick={() => void incidents.refetch()}
                      className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap text-base font-medium text-text underline underline-offset-4"
                    >
                      <RefreshCw aria-hidden="true" className="h-5 w-5" />
                      Muat ulang
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          }
        >
          <MapCanvas center={SURABAYA_CENTER} zoom={12}>
            <IncidentMarkers
              incidents={list}
              selectedId={selected?.id ?? null}
              onSelect={setSelectedId}
              showRadius
              focusSelected
            />
          </MapCanvas>
        </MapWorkspace>
      </main>
    </div>
  );
}
