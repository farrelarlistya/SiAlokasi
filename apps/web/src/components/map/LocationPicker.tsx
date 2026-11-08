import { Circle, CircleMarker, useMap, useMapEvents } from "react-leaflet";
import { useEffect } from "react";
import { cn } from "../../lib/cn";
import { MapCanvas } from "./MapCanvas";

type LatLngValue = { lat: number; lng: number };

type LocationPickerProps = {
  value: LatLngValue;
  onChange: (value: LatLngValue) => void;
  className?: string;
};

function ClickToPick({ onChange }: { onChange: (value: LatLngValue) => void }) {
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

function SyncView({ value }: { value: LatLngValue }) {
  const map = useMap();

  useEffect(() => {
    map.setView([value.lat, value.lng]);
  }, [map, value.lat, value.lng]);

  return null;
}

/** Peta pemilih titik posko. Klik di peta atau isi angka lintang/bujur di formulir. */
export function LocationPicker({ value, onChange, className }: LocationPickerProps) {
  return (
    <div>
      <div className={cn("h-64 overflow-hidden rounded-md border border-border", className)}>
        <MapCanvas center={value} zoom={13}>
          <ClickToPick onChange={onChange} />
          <SyncView value={value} />
          <Circle
            center={[value.lat, value.lng]}
            radius={150}
            pathOptions={{ className: "map-picker-ring", interactive: false }}
          />
          <CircleMarker
            center={[value.lat, value.lng]}
            radius={10}
            pathOptions={{ className: "map-picker-dot", interactive: false }}
          />
        </MapCanvas>
      </div>
      <p className="mt-2 text-base text-text-muted">
        Klik peta untuk memindahkan titik posko. Angka lintang dan bujur di atas ikut berubah.
      </p>
    </div>
  );
}
