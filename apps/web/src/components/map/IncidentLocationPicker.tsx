import { SURABAYA_CENTER } from "@sialokasi/shared";
import L, { type DragEndEvent } from "leaflet";
import { useEffect } from "react";
import { Circle, Marker, useMap, useMapEvents } from "react-leaflet";
import { cn } from "../../lib/cn";
import { MapCanvas } from "./MapCanvas";

export type MapPoint = { lat: number; lng: number };

type IncidentLocationPickerProps = {
  value: MapPoint | null;
  radiusM: number;
  onChange: (value: MapPoint) => void;
  className?: string;
};

const pinIcon = L.divIcon({
  className: "map-incident-pin",
  html: '<span class="map-incident-pin__dot"></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function ClickToPick({ onChange }: { onChange: (value: MapPoint) => void }) {
  useMapEvents({
    click(event) {
      onChange({
        lat: Number(event.latlng.lat.toFixed(6)),
        lng: Number(event.latlng.lng.toFixed(6)),
      });
    },
  });

  return null;
}

function SyncView({ value }: { value: MapPoint }) {
  const map = useMap();

  useEffect(() => {
    map.setView([value.lat, value.lng], Math.max(map.getZoom(), 14));
  }, [map, value.lat, value.lng]);

  return null;
}

/** Peta pemilih titik kejadian: klik untuk menaruh titik, geser untuk memindahkan. */
export function IncidentLocationPicker({
  value,
  radiusM,
  onChange,
  className,
}: IncidentLocationPickerProps) {
  return (
    <div
      className={cn(
        "relative h-[340px] overflow-hidden rounded-md border border-border",
        className,
      )}
    >
      <MapCanvas center={value ?? SURABAYA_CENTER} zoom={value ? 14 : 12}>
        <ClickToPick onChange={onChange} />
        {value ? <SyncView value={value} /> : null}

        {value ? (
          <>
            <Circle
              center={[value.lat, value.lng]}
              radius={radiusM}
              pathOptions={{ className: "map-radius map-radius-selected", interactive: false }}
            />
            <Marker
              position={[value.lat, value.lng]}
              icon={pinIcon}
              draggable
              eventHandlers={{
                dragend: (event: DragEndEvent) => {
                  const latlng = event.target.getLatLng();
                  onChange({
                    lat: Number(latlng.lat.toFixed(6)),
                    lng: Number(latlng.lng.toFixed(6)),
                  });
                },
              }}
            />
          </>
        ) : null}
      </MapCanvas>

      {!value ? (
        <p className="pointer-events-none absolute inset-x-0 bottom-0 z-[500] bg-surface/95 px-4 py-3 text-base text-text-muted">
          Klik peta untuk menandai titik kejadian. Titik bisa digeser setelah muncul.
        </p>
      ) : null}
    </div>
  );
}
