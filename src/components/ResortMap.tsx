"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { LatLon } from "@/lib/geo";
import type { ResortForecast } from "@/lib/forecast";
import { formatInches, passColor } from "@/lib/format";
import type { Resort } from "@/lib/resorts";

export type MapFocus = LatLon & { zoom: number; key: number };

type Props = {
  resorts: Resort[];
  forecasts: Record<string, ResortForecast> | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  origin: LatLon | null;
  focus: MapFocus | null;
};

// Roughly frames VT, NH, ME and eastern NY.
const NORTHEAST_CENTER: [number, number] = [44.0, -72.0];
const NORTHEAST_ZOOM = 6;

function FocusController({ focus }: { focus: MapFocus | null }) {
  const map = useMap();
  useEffect(() => {
    if (focus) map.flyTo([focus.lat, focus.lon], focus.zoom, { duration: 0.8 });
  }, [map, focus]);
  return null;
}

export default function ResortMap({ resorts, forecasts, selectedId, onSelect, origin, focus }: Props) {
  return (
    <MapContainer
      center={NORTHEAST_CENTER}
      zoom={NORTHEAST_ZOOM}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FocusController focus={focus} />
      {origin && (
        <CircleMarker
          center={[origin.lat, origin.lon]}
          radius={6}
          pathOptions={{ color: "#111827", fillColor: "#111827", fillOpacity: 1 }}
        >
          <Tooltip>Your location</Tooltip>
        </CircleMarker>
      )}
      {resorts.map((resort) => {
        const selected = resort.id === selectedId;
        const color = passColor(resort.passes);
        const next7 = forecasts?.[resort.id]?.next7In;
        return (
          <CircleMarker
            key={resort.id}
            center={[resort.lat, resort.lon]}
            radius={selected ? 11 : 8}
            pathOptions={{
              color: selected ? "#111827" : "#ffffff",
              weight: 2,
              fillColor: color,
              fillOpacity: 0.9,
            }}
            eventHandlers={{ click: () => onSelect(resort.id) }}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              <strong>{resort.name}</strong>
              {next7 !== undefined && <> · {formatInches(next7)} next 7 days</>}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
