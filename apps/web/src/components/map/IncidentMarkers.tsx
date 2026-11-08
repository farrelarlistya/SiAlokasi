import type { PublicIncident } from "../../lib/api";
import { Circle, CircleMarker, Tooltip, useMap } from "react-leaflet";
import { Fragment, useEffect } from "react";

type IncidentMarkersProps = {
  incidents: PublicIncident[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  showRadius?: boolean;
  focusSelected?: boolean;
};

function FocusOnSelected({
  incident,
  enabled,
}: {
  incident?: PublicIncident;
  enabled: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!enabled || !incident) return;
    map.setView([incident.lat, incident.lng], Math.max(map.getZoom(), 14));
  }, [enabled, incident, map]);

  return null;
}

export function IncidentMarkers({
  incidents,
  selectedId,
  onSelect,
  showRadius = true,
  focusSelected = false,
}: IncidentMarkersProps) {
  const selected = incidents.find((incident) => incident.id === selectedId);

  return (
    <>
      <FocusOnSelected incident={selected} enabled={focusSelected} />

      {incidents.map((incident) => {
        const isSelected = incident.id === selectedId;

        return (
          <Fragment key={incident.id}>
            {showRadius ? (
              <Circle
                center={[incident.lat, incident.lng]}
                radius={incident.radiusM}
                pathOptions={{
                  className: `map-radius${isSelected ? " map-radius-selected" : ""}`,
                  interactive: Boolean(onSelect),
                }}
                eventHandlers={
                  onSelect ? { click: () => onSelect(incident.id) } : undefined
                }
              />
            ) : null}

            <CircleMarker
              center={[incident.lat, incident.lng]}
              radius={isSelected ? 11 : 8}
              pathOptions={{
                className: `map-incident-dot${isSelected ? " map-incident-dot-selected" : ""}`,
                interactive: Boolean(onSelect),
              }}
              eventHandlers={onSelect ? { click: () => onSelect(incident.id) } : undefined}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                <span className="font-medium">{incident.title}</span>
                <br />
                <span>{incident.region?.name ?? "Kecamatan belum diisi"}</span>
              </Tooltip>
            </CircleMarker>
          </Fragment>
        );
      })}
    </>
  );
}
