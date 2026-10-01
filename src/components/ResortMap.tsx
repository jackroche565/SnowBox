"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import type { ResortForecast } from "@/lib/forecast";
import { SNOW_SCALE, formatInches } from "@/lib/format";
import type { LatLon } from "@/lib/geo";
import { resorts as allResorts, type Resort } from "@/lib/resorts";
import { BASEMAP_STYLE, ELEVATION, SHADING, hillshadeLayer } from "@/lib/terrain";

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

const PITCH_3D = 50;
const EXAGGERATION = 1.4;

function bounds(list: Resort[]): [[number, number], [number, number]] {
  const lons = list.map((r) => r.lon);
  const lats = list.map((r) => r.lat);
  return [
    [Math.min(...lons), Math.min(...lats)],
    [Math.max(...lons), Math.max(...lats)],
  ];
}

function resortFeatures(list: Resort[], forecasts: Record<string, ResortForecast> | null) {
  return {
    type: "FeatureCollection" as const,
    features: list.map((r) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [r.lon, r.lat] },
      properties: { id: r.id, name: r.name, snow: forecasts?.[r.id]?.next7In ?? 0 },
    })),
  };
}

function originFeatures(origin: LatLon | null) {
  return {
    type: "FeatureCollection" as const,
    features: origin
      ? [{ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [origin.lon, origin.lat] }, properties: {} }]
      : [],
  };
}

// Pin color steps up the snow scale; size grows with snow (square root keeps big storms in check).
const SNOW_COLOR = [
  "step",
  ["get", "snow"],
  SNOW_SCALE[0].color,
  ...SNOW_SCALE.slice(1).flatMap((s) => [s.from, s.color]),
] as unknown as maplibregl.ExpressionSpecification;
const SNOW_RADIUS = ["min", 13, ["+", 5, ["*", 2, ["sqrt", ["get", "snow"]]]]] as unknown as maplibregl.ExpressionSpecification;
const HOVERED = ["boolean", ["feature-state", "hover"], false] as unknown as maplibregl.ExpressionSpecification;

export default function ResortMap({ resorts, forecasts, hoveredId, onSelect, onHover, origin, focus }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const popup = useRef<maplibregl.Popup | null>(null);
  const [ready, setReady] = useState(false);
  const [threeD, setThreeD] = useState(true);
  // Handlers change every render; the map's listeners read the latest through a ref.
  const handlers = useRef({ onSelect, onHover });
  useEffect(() => {
    handlers.current = { onSelect, onHover };
  });

  useEffect(() => {
    if (!container.current) return;
    const map = new maplibregl.Map({
      container: container.current,
      style: BASEMAP_STYLE,
      bounds: bounds(allResorts),
      // Extra room at the top for the floating search and pass filters.
      fitBoundsOptions: { padding: { top: 120, bottom: 48, left: 24, right: 56 } },
      pitch: PITCH_3D,
      maxPitch: 70,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    popup.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });

    // "style.load" fires as soon as the basemap style is in; "load" waits for a first full render,
    // which a background tab can hold back.
    map.once("style.load", () => {
      map.addSource("terrain", ELEVATION);
      map.addSource("shading", SHADING);
      // Relief sits under roads and labels so the map stays readable.
      const firstSymbol = map.getStyle().layers.find((l) => l.type === "symbol")?.id;
      map.addLayer(hillshadeLayer(0.5), firstSymbol);
      map.setTerrain({ source: "terrain", exaggeration: EXAGGERATION });

      map.addSource("origin", { type: "geojson", data: originFeatures(null) });
      map.addLayer({
        id: "origin",
        type: "circle",
        source: "origin",
        paint: {
          "circle-radius": 6,
          "circle-color": "#e0532f",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2.5,
          "circle-pitch-alignment": "map",
        },
      });

      map.addSource("resorts", { type: "geojson", data: resortFeatures([], null), promoteId: "id" });
      map.addLayer({
        id: "resorts",
        type: "circle",
        source: "resorts",
        paint: {
          "circle-radius": ["case", HOVERED, ["+", SNOW_RADIUS, 3], SNOW_RADIUS],
          "circle-color": SNOW_COLOR,
          "circle-stroke-color": ["case", HOVERED, "#0f1a2a", "#ffffff"],
          "circle-stroke-width": ["case", HOVERED, 2.5, 2],
          "circle-pitch-alignment": "map",
        },
      });

      map.on("click", "resorts", (e) => {
        const id = e.features?.[0]?.properties?.id;
        if (typeof id === "string") handlers.current.onSelect(id);
      });
      map.on("mousemove", "resorts", (e) => {
        map.getCanvas().style.cursor = "pointer";
        const id = e.features?.[0]?.properties?.id;
        if (typeof id === "string") handlers.current.onHover(id);
      });
      map.on("mouseleave", "resorts", () => {
        map.getCanvas().style.cursor = "";
        handlers.current.onHover(null);
      });
      setReady(true);
    });

    return () => {
      popup.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // The visible resorts and their snow.
  useEffect(() => {
    if (!ready) return;
    (mapRef.current?.getSource("resorts") as GeoJSONSource | undefined)?.setData(resortFeatures(resorts, forecasts));
  }, [ready, resorts, forecasts]);

  useEffect(() => {
    if (!ready) return;
    (mapRef.current?.getSource("origin") as GeoJSONSource | undefined)?.setData(originFeatures(origin));
  }, [ready, origin]);

  // Hover from either side (map or list): highlight the pin and label it.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !hoveredId) return;
    const resort = allResorts.find((r) => r.id === hoveredId);
    map.setFeatureState({ source: "resorts", id: hoveredId }, { hover: true });
    if (resort) {
      const label = document.createElement("span");
      label.innerHTML = "<strong></strong>";
      label.querySelector("strong")!.textContent = resort.name;
      label.append(` · ${formatInches(forecasts?.[resort.id]?.next7In)} next 7 days`);
      popup.current?.setLngLat([resort.lon, resort.lat]).setDOMContent(label).addTo(map);
    }
    return () => {
      map.setFeatureState({ source: "resorts", id: hoveredId }, { hover: false });
      popup.current?.remove();
    };
  }, [ready, hoveredId, forecasts]);

  useEffect(() => {
    if (!focus) return;
    mapRef.current?.flyTo({ center: [focus.lon, focus.lat], zoom: focus.zoom, duration: 900 });
  }, [focus]);

  function toggle3D() {
    const map = mapRef.current;
    if (!map) return;
    const next = !threeD;
    setThreeD(next);
    map.setTerrain(next ? { source: "terrain", exaggeration: EXAGGERATION } : null);
    map.easeTo({ pitch: next ? PITCH_3D : 0, duration: 600 });
  }

  return (
    <div className="relative h-full w-full">
      <div ref={container} className="h-full w-full" />
      <div className="absolute right-3 bottom-8 z-10 flex flex-col overflow-hidden rounded-[10px] bg-white shadow-[0_1px_4px_rgb(15_26_42/0.12)]">
        <button
          type="button"
          onClick={toggle3D}
          aria-pressed={threeD}
          aria-label={threeD ? "Flatten map" : "Tilt map to 3D"}
          className="h-10 w-10 border-b border-hairline text-xs font-bold text-ink"
        >
          {threeD ? "2D" : "3D"}
        </button>
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => mapRef.current?.zoomIn()}
          className="h-10 w-10 border-b border-hairline text-lg leading-none text-ink"
        >
          +
        </button>
        <button type="button" aria-label="Zoom out" onClick={() => mapRef.current?.zoomOut()} className="h-10 w-10 text-lg leading-none text-ink">
          −
        </button>
      </div>
    </div>
  );
}
