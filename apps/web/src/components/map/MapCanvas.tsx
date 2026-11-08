import { MapContainer, TileLayer } from "react-leaflet";
import { useRef, useState, type ReactNode } from "react";
import { cn } from "../../lib/cn";

const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

type MapCanvasProps = {
  center: { lat: number; lng: number };
  zoom?: number;
  className?: string;
  children?: ReactNode;
};

/**
 * Kanvas peta Leaflet dengan latar daratan dari token tema. Bila tile tidak
 * bisa diunduh, peta tetap menampilkan area Surabaya dan pita peringatan.
 */
export function MapCanvas({ center, zoom = 12, className, children }: MapCanvasProps) {
  const [tileErrors, setTileErrors] = useState(0);
  const errorCount = useRef(0);

  return (
    <div className={cn("relative isolate h-full w-full overflow-hidden bg-map-land", className)}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        minZoom={10}
        maxZoom={18}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          url={OSM_URL}
          attribution={OSM_ATTRIBUTION}
          eventHandlers={{
            tileerror: () => {
              errorCount.current += 1;
              if (errorCount.current === 6) {
                setTileErrors(errorCount.current);
              }
            },
          }}
        />
        {children}
      </MapContainer>

      {tileErrors > 0 ? (
        <p className="pointer-events-none absolute inset-x-0 top-0 z-[500] bg-warning/95 px-4 py-2 text-base font-medium text-canvas">
          Peta sedang memuat terbatas. Data kejadian tetap bisa dibaca di daftar.
        </p>
      ) : null}
    </div>
  );
}
