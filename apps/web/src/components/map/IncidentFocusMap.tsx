import { Circle, CircleMarker, Tooltip } from "react-leaflet";
import { cn } from "../../lib/cn";
import { MapCanvas } from "./MapCanvas";

type IncidentFocusMapProps = {
  lat: number;
  lng: number;
  radiusM: number;
  title?: string;
  heightClass?: string;
  className?: string;
  /** Tanpa garis dan sudut, dipakai saat peta sudah berada di dalam kartu. */
  plain?: boolean;
};

/** Peta ringkas yang menyorot satu laporan dan wilayah terdampaknya. */
export function IncidentFocusMap({
  lat,
  lng,
  radiusM,
  title,
  heightClass = "h-[300px]",
  className,
  plain = false,
}: IncidentFocusMapProps) {
  return (
    <div
      className={cn(
        "overflow-hidden",
        heightClass,
        plain ? "" : "rounded-md border border-border",
        className,
      )}
    >
      <MapCanvas center={{ lat, lng }} zoom={14}>
        <Circle
          center={[lat, lng]}
          radius={radiusM}
          pathOptions={{ className: "map-radius map-radius-selected", interactive: false }}
        />
        <CircleMarker
          center={[lat, lng]}
          radius={10}
          pathOptions={{
            className: "map-incident-dot map-incident-dot-selected",
            interactive: false,
          }}
        >
          {title ? (
            <Tooltip direction="top" offset={[0, -8]}>
              {title}
            </Tooltip>
          ) : null}
        </CircleMarker>
      </MapCanvas>
    </div>
  );
}
