"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import type { ResortForecast } from "@/lib/forecast";
import { formatInches, resortColor } from "@/lib/format";
import type { LatLon } from "@/lib/geo";
import { resorts as allResorts, type Resort } from "@/lib/resorts";
import { BASEMAP_STYLE, SHADING, hillshadeLayer } from "@/lib/terrain";

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

/** Below this, a week's snow gets no label on the map. */
const LABEL_INCHES = 0.5;

// Basemap layers that add detail but not orientation: buildings, every road and rail line, airports,
// villages and road names. What's left: relief, water, woods, borders, towns and cities.
const CLUTTER = /^(building|landuse_residential|park|aeroway|airport|road|highway|tunnel|railway|label_other|label_village|waterway_line_label)/;

const DOT_RADIUS = 6;

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
    features: list.map((r) => {
      const snow = forecasts?.[r.id]?.next7In ?? 0;
      return {
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [r.lon, r.lat] },
        properties: {
          id: r.id,
          name: r.name,
          snow,
          color: resortColor(r.passes),
          label: snow >= LABEL_INCHES ? formatInches(snow) : "",
        },
      };
    }),
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

const HOVERED = ["boolean", ["feature-state", "hover"], false] as unknown as maplibregl.ExpressionSpecification;

export default function ResortMap({ resorts, forecasts, hoveredId, onSelect, onHover, origin, focus }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const popup = useRef<maplibregl.Popup | null>(null);
  const [ready, setReady] = useState(false);
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
      // Flat and north-up: no tilting or rotating.
      maxPitch: 0,
      dragRotate: false,
      touchPitch: false,
      pitchWithRotate: false,
      attributionControl: { compact: true },
    });
    map.touchZoomRotate.disableRotation();
    mapRef.current = map;
    popup.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });

    // "style.load" fires as soon as the basemap style is in; "load" waits for a first full render,
    // which a background tab can hold back.
    map.once("style.load", () => {
      for (const layer of map.getStyle().layers) {
        if (CLUTTER.test(layer.id)) map.removeLayer(layer.id);
      }
      // A faint icy tint on water, and relief shading (flat, 2D) under the borders and labels.
      map.setPaintProperty("water", "fill-color", "#d3dfe8");
      map.addSource("shading", SHADING);
      map.addLayer(hillshadeLayer(0.5), "boundary_3");
      // State lines at every zoom (the basemap hides them below zoom 8 and mixes in counties).
      map.setLayerZoomRange("boundary_3", 0, 24);
      map.setFilter("boundary_3", ["all", ["==", ["get", "admin_level"], 4], ["!=", ["get", "maritime"], 1]]);
      map.setPaintProperty("boundary_3", "line-color", "#8f9aab");
      map.setPaintProperty("boundary_3", "line-dasharray", [3, 2]);
      map.setPaintProperty("boundary_3", "line-width", ["interpolate", ["linear"], ["zoom"], 5, 1, 10, 1.6]);
      map.setPaintProperty("boundary_2", "line-color", "#8f9aab");

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
        },
      });

      map.addSource("resorts", { type: "geojson", data: resortFeatures([], null), promoteId: "id" });
      map.addLayer({
        id: "resorts",
        type: "circle",
        source: "resorts",
        paint: {
          "circle-radius": ["case", HOVERED, DOT_RADIUS + 3, DOT_RADIUS],
          "circle-color": ["get", "color"],
          "circle-stroke-color": ["case", HOVERED, "#0f1a2a", "#ffffff"],
          "circle-stroke-width": ["case", HOVERED, 2.5, 2],
        },
      });
      // The week's snow beside any resort expecting some.
      map.addLayer({
        id: "resort-snow",
        type: "symbol",
        source: "resorts",
        layout: {
          "text-field": ["get", "label"],
          "text-font": ["Noto Sans Bold"],
          "text-size": 12,
          "text-anchor": "left",
          "text-offset": [0.9, 0],
          "text-allow-overlap": false,
        },
        paint: { "text-color": "#0f1a2a", "text-halo-color": "#ffffff", "text-halo-width": 1.5 },
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

  // Hover from either side (map or list): highlight the dot and label it.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !hoveredId) return;
    const resort = allResorts.find((r) => r.id === hoveredId);
    map.setFeatureState({ source: "resorts", id: hoveredId }, { hover: true });
    if (resort) {
      const label = document.createElement("span");
      const name = document.createElement("strong");
      name.textContent = resort.name;
      label.append(name, ` · ${formatInches(forecasts?.[resort.id]?.next7In)} next 7 days`);
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

  return (
    <div className="relative h-full w-full">
      <div ref={container} className="h-full w-full" />
      <div className="absolute right-3 bottom-8 z-10 flex flex-col overflow-hidden rounded-[10px] bg-white shadow-[0_1px_4px_rgb(15_26_42/0.12)]">
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
