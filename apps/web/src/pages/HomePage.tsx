import {
  DISASTER_LABEL,
  DISASTER_TYPES,
  formatDateTime,
  formatDistance,
  formatNumber,
  formatRelativeTime,
} from "@sialokasi/shared";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Filter, LayoutDashboard, MapPin, RefreshCw, Search, ShieldCheck, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { Alert } from "../components/Alert";
import { AppHeader } from "../components/AppHeader";
import { Button, buttonStyles } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Field, SelectInput } from "../components/Field";
import { MapWorkspace } from "../components/MapWorkspace";
import { NotificationBell } from "../components/NotificationBell";
import { Skeleton } from "../components/Skeleton";
import { StatusChip } from "../components/StatusChip";
import { IncidentMarkers } from "../components/map/IncidentMarkers";
import { MapCanvas } from "../components/map/MapCanvas";
import { api } from "../lib/api";
import { cn } from "../lib/cn";
import { homePathForRole } from "../lib/roles";
import { SURABAYA_CENTER } from "@sialokasi/shared";

export function HomePage() {
  const { user } = useAuth();
  const [disasterType, setDisasterType] = useState("");
  const [regionId, setRegionId] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  const totalPeople = list.reduce((sum, incident) => sum + incident.affectedPeople, 0);
  const hasFilter = disasterType !== "" || regionId !== "";

  return (
    <div className="flex h-dvh flex-col">
      <AppHeader
        user={user ? { name: user.name, role: user.role } : null}
        actions={
          <div className="flex items-center gap-2">
            <Link
              to="/lacak"
              aria-label="Lacak status laporan"
              className={buttonStyles("secondary", "md", "px-3 sm:px-4")}
            >
              <Search aria-hidden="true" className="h-5 w-5 sm:hidden" />
              <span className="hidden sm:inline">Lacak</span>
            </Link>
            {user ? <NotificationBell /> : null}
            {user ? (
              <Link
                to={homePathForRole(user.role)}
                aria-label="Buka dasbor saya"
                className={buttonStyles("primary", "md", "px-3 sm:px-4")}
              >
                <LayoutDashboard aria-hidden="true" className="h-5 w-5 sm:hidden" />
                <span className="hidden sm:inline">Dasbor</span>
                <ArrowRight aria-hidden="true" className="hidden h-5 w-5 sm:inline" />
              </Link>
            ) : (
              <>
                <span className="hidden sm:inline-flex">
                  <Link to="/daftar" className={buttonStyles("secondary", "md")}>
                    Daftar petugas
                  </Link>
                </span>
                <Link to="/masuk" className={buttonStyles("primary", "md")}>
                  Masuk
                </Link>
              </>
            )}
          </div>
        }
      />

      <main id="isi-utama" className="flex min-h-0 flex-1 flex-col">
        <h1 className="sr-only">Peta kejadian aktif Kota Surabaya</h1>
        <MapWorkspace
          storageKey="sialokasi.panel.peta-publik"
          panelLabel="Panel kejadian"
          panelDescription="Bisa ditutup kapan saja"
          sidebar={
            <>
              <div className="border-b border-border p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base text-text-muted">Kota Surabaya</p>
                    <h2 className="text-[28px] font-bold leading-[36px]">Kejadian aktif</h2>
                  </div>
                  <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-elevated px-3 text-base text-text-muted">
                    <MapPin aria-hidden="true" className="h-5 w-5 text-danger" />
                    {incidents.isPending ? "Memuat…" : `${formatNumber(list.length)} laporan`}
                  </span>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-md border border-border bg-elevated p-3">
                    <dt className="text-base text-text-muted">Laporan aktif</dt>
                    <dd className="mt-1 text-[22px] font-semibold leading-[30px]">
                      {incidents.isPending ? "…" : formatNumber(list.length)}
                    </dd>
                  </div>
                  <div className="rounded-md border border-border bg-elevated p-3">
                    <dt className="text-base text-text-muted">Jiwa terdampak</dt>
                    <dd className="mt-1 text-[22px] font-semibold leading-[30px]">
                      {incidents.isPending ? "…" : formatNumber(totalPeople)}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="border-b border-border p-5">
                <p className="flex flex-wrap items-center gap-2 text-base font-medium text-text">
                  <Filter aria-hidden="true" className="h-5 w-5 text-info" />
                  Saring tampilan peta
                  {hasFilter ? (
                    <span className="rounded-full border border-info/30 bg-info/10 px-2 py-0.5 text-base text-info">
                      aktif
                    </span>
                  ) : null}
                </p>
                <div className="mt-4 grid gap-4">
                  <Field id="filter-disaster" label="Jenis bencana">
                    <SelectInput
                      value={disasterType}
                      onChange={(event) => setDisasterType(event.target.value)}
                    >
                      <option value="">Semua jenis</option>
                      {DISASTER_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {DISASTER_LABEL[type]}
                        </option>
                      ))}
                    </SelectInput>
                  </Field>

                  <Field id="filter-region" label="Kecamatan">
                    <SelectInput
                      value={regionId}
                      onChange={(event) => setRegionId(event.target.value)}
                      disabled={regions.isPending}
                    >
                      <option value="">Semua kecamatan</option>
                      {(regions.data?.regions ?? []).map((region) => (
                        <option key={region.id} value={region.id}>
                          {region.name}
                        </option>
                      ))}
                    </SelectInput>
                  </Field>
                </div>

                {hasFilter ? (
                  <Button
                    variant="ghost"
                    className="mt-2 px-0"
                    onClick={() => {
                      setDisasterType("");
                      setRegionId("");
                    }}
                  >
                    Tampilkan semua kejadian
                  </Button>
                ) : null}
              </div>

              <div className="p-5">
                {incidents.isPending ? (
                  <div className="space-y-3" aria-busy="true">
                    <span className="sr-only">Sedang memuat daftar kejadian</span>
                    <Skeleton variant="card" className="h-28" />
                    <Skeleton variant="card" className="h-28" />
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
                    title={
                      hasFilter
                        ? "Tidak ada kejadian yang cocok dengan saringan."
                        : "Belum ada laporan kejadian. Wilayah Surabaya saat ini aman."
                    }
                    description={
                      hasFilter
                        ? "Coba pilih jenis bencana atau kecamatan lain untuk melihat kejadian yang tercatat."
                        : "Saat petugas mengirim laporan, titik kejadian dan radius wilayah terdampak akan muncul di sini."
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
                      ) : user ? (
                        <Link
                          to={homePathForRole(user.role)}
                          className={buttonStyles("secondary", "md")}
                        >
                          Buka dasbor saya
                        </Link>
                      ) : (
                        <Link to="/masuk" className={buttonStyles("secondary", "md")}>
                          Masuk sebagai petugas
                        </Link>
                      )
                    }
                  />
                ) : (
                  <ul className="space-y-3">
                    {list.map((incident) => (
                      <li key={incident.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(incident.id)}
                          aria-pressed={selected?.id === incident.id}
                          className={cn(
                            "w-full rounded-md border p-4 text-left transition-colors",
                            selected?.id === incident.id
                              ? "border-accent bg-accent/10"
                              : "border-border bg-elevated hover:border-text-disabled hover:bg-hover",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-base font-semibold text-text">{incident.title}</p>
                              <p className="mt-1 text-base text-text-muted">
                                {incident.region?.name ?? "Kecamatan belum diisi"} ·{" "}
                                {formatRelativeTime(incident.occurredAt)}
                              </p>
                            </div>
                            <StatusChip status={incident.status} className="shrink-0" />
                          </div>
                          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-text-muted">
                            <span className="inline-flex items-center gap-1">
                              <Users aria-hidden="true" className="h-5 w-5" />
                              {formatNumber(incident.affectedPeople)} jiwa
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin aria-hidden="true" className="h-5 w-5" />
                              Radius {formatDistance(incident.radiusM)}
                            </span>
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {selected ? (
                  <div className="mt-4 rounded-md border border-border bg-canvas p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-[22px] font-semibold leading-[30px] text-text">
                        {selected.title}
                      </h3>
                      <Button variant="ghost" onClick={() => setSelectedId(null)}>
                        Tutup
                      </Button>
                    </div>
                    <dl className="mt-3 space-y-2 text-base">
                      <div className="flex justify-between gap-3">
                        <dt className="text-text-muted">Kode lacak</dt>
                        <dd>
                          <Link
                            to={`/lacak?kode=${encodeURIComponent(selected.code)}`}
                            className="font-mono text-info underline-offset-4 hover:underline"
                          >
                            {selected.code}
                          </Link>
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-text-muted">Waktu kejadian</dt>
                        <dd className="text-right text-text">
                          {formatDateTime(selected.occurredAt)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-text-muted">Jenis bencana</dt>
                        <dd className="text-right text-text">
                          {DISASTER_LABEL[selected.disasterType as keyof typeof DISASTER_LABEL] ??
                            selected.disasterType}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-text-muted">Wilayah terdampak</dt>
                        <dd className="text-right text-text">
                          {selected.region?.name ?? "Belum diisi"}
                        </dd>
                      </div>
                    </dl>
                    <div className="mt-4">
                      <Link
                        to={`/lacak?kode=${encodeURIComponent(selected.code)}`}
                        className={buttonStyles("primary", "md")}
                      >
                        Lacak laporan ini
                        <ArrowRight aria-hidden="true" className="h-5 w-5" />
                      </Link>
                    </div>
                    <p className="mt-3 border-t border-border pt-3 text-base text-text-muted">
                      Data pribadi pelapor tidak ditampilkan.
                    </p>
                  </div>
                ) : null}
              </div>
            </>
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
