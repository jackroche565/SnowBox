"use client";

import "leaflet/dist/leaflet.css";
import { latLngBounds, type CircleMarker as LeafletCircleMarker } from "leaflet";
import { useEffect, useRef } from "react";
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { LatLon } from "@/lib/geo";
import type { ResortForecast } from "@/lib/forecast";
import { formatInches, passColor } from "@/lib/format";
import { resorts as allResorts, type Resort } from "@/lib/resorts";

export type MapFocus = LatLon & { zoom: number; key: number };

type Props = {
  resorts: Resort[];
  forecasts: Record<string, ResortForecast> | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  origin: LatLon | null;
  focus: MapFocus | null;
};

const ALL_RESORT_BOUNDS = latLngBounds(allResorts.map((r) => [r.lat, r.lon]));
const BOUNDS_PADDING: [number, number] = [24, 24];

// Pins grow with the week's forecast snow so the snowiest corner of the map stands out.
// Square root keeps a 20" storm from swallowing its neighbors.
const PIN_RADIUS = 7;
const MAX_PIN_RADIUS = 17;
function pinRadius(next7In: number | undefined): number {
  if (!next7In) return PIN_RADIUS;
  return Math.min(MAX_PIN_RADIUS, PIN_RADIUS + Math.sqrt(next7In) * 2);
}

function FocusController({ focus }: { focus: MapFocus | null }) {
  const map = useMap();

  const hasFocused = useRef(false);

  // The panel's final size isn't known when Leaflet first measures it, so re-measure on
  // resize, and keep every resort in frame until the user picks a place to look at.
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
      if (!hasFocused.current) map.fitBounds(ALL_RESORT_BOUNDS, { padding: BOUNDS_PADDING });
    });
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);

  useEffect(() => {
    if (!focus) return;
    hasFocused.current = true;
    map.flyTo([focus.lat, focus.lon], focus.zoom, { duration: 0.8 });
  }, [map, focus]);
  return null;
}

export default function ResortMap({
  resorts,
  forecasts,
  hoveredId,
  onSelect,
  onHover,
  origin,
  focus,
}: Props) {
  const markers = useRef(new Map<string, LeafletCircleMarker>());

  // Hovering a card in the list lifts its pin above its neighbors and shows its label.
  useEffect(() => {
    if (!hoveredId) return;
    const marker = markers.current.get(hoveredId);
    marker?.bringToFront();
    marker?.openTooltip();
    return () => {
      marker?.closeTooltip();
    };
  }, [hoveredId]);

  return (
    <MapContainer
      bounds={ALL_RESORT_BOUNDS}
      boundsOptions={{ padding: BOUNDS_PADDING }}
      scrollWheelZoom
      className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FocusController focus={focus} />
      {origin && (
        <CircleMarker
          center={[origin.lat, origin.lon]}
          radius={6}
          pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#e85d3d", fillOpacity: 1 }}
        >
          <Tooltip>Your location</Tooltip>
        </CircleMarker>
      )}
      {resorts.map((resort) => {
        const active = resort.id === hoveredId;
        const next7 = forecasts?.[resort.id]?.next7In;
        return (
          <CircleMarker
            key={resort.id}
            ref={(marker) => {
              if (marker) markers.current.set(resort.id, marker);
              else markers.current.delete(resort.id);
            }}
            center={[resort.lat, resort.lon]}
            radius={pinRadius(next7) + (active ? 4 : 0)}
            pathOptions={{
              color: active ? "#101826" : "#ffffff",
              weight: active ? 3 : 2,
              fillColor: passColor(resort.passes),
              fillOpacity: 0.95,
            }}
            eventHandlers={{
              click: () => onSelect(resort.id),
              mouseover: () => onHover(resort.id),
              mouseout: () => onHover(null),
            }}
          >
            <Tooltip direction="top" offset={[0, -10]}>
              <strong>{resort.name}</strong>
              {next7 !== undefined && <> · {formatInches(next7)} next 7 days</>}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
