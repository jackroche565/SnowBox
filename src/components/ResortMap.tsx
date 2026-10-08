"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap, type RasterTileSource } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { formatInches, snowBucketColor } from "@/lib/format";
import type { LatLon } from "@/lib/geo";
import type { Bounds } from "@/lib/regions";
import type { Resort } from "@/lib/resorts";
import { QUIET_STYLE } from "@/lib/terrain";

export type MapFocus = LatLon & { zoom: number; key: number };

type Props = {
  resorts: Resort[];
  /** Forecast snow over the next 7 days, by resort id. */
  snow: Record<string, number>;
  favoriteIds: string[];
  hoveredId: string | null;
  selectedId: string | null;
  /** A dot was tapped (its id), or empty map was tapped (null). */
  onSelect: (id: string | null) => void;
  origin: LatLon | null;
  focus: MapFocus | null;
  /** Show the national radar under the dots. */
  radar: boolean;
  /** The region to frame; the map re-frames when it changes. */
  frame: Bounds;
};

/** NOAA's national radar composite, tiled by the Iowa Environmental Mesonet (public domain). */
const RADAR_TILES = "https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png";
/** The composite updates every 5 minutes. */
const RADAR_REFRESH_MS = 5 * 60 * 1000;

const DOT_RADIUS = 5.5;
const FAVORITE_RADIUS = 7;

/** Room at the top for the layer switch and key. */
const FRAME_PADDING = { top: 84, bottom: 32, left: 24, right: 24 };

function resortFeatures(list: Resort[], snow: Record<string, number>, favoriteIds: string[]) {
  return {
    type: "FeatureCollection" as const,
    features: list.map((r) => {
      const inches = snow[r.id];
      return {
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [r.lon, r.lat] },
        properties: {
          id: r.id,
          label: inches == null ? r.name : `${r.name} ${formatInches(inches)}`,
          color: snowBucketColor(inches ?? 0),
          favorite: favoriteIds.includes(r.id),
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

const state = (key: "hover" | "selected") =>
  ["boolean", ["feature-state", key], false] as unknown as maplibregl.ExpressionSpecification;

export default function ResortMap({ resorts, snow, favoriteIds, hoveredId, selectedId, onSelect, origin, focus, radar, frame }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  // The handler changes every render; the map's listeners read the latest through a ref.
  const select = useRef(onSelect);
  useEffect(() => {
    select.current = onSelect;
  });

  useEffect(() => {
    if (!container.current) return;
    const map = new maplibregl.Map({
      container: container.current,
      style: QUIET_STYLE,
      bounds: frame,
      fitBoundsOptions: { padding: FRAME_PADDING },
      // Flat and north-up: no tilting or rotating.
      maxPitch: 0,
      dragRotate: false,
      touchPitch: false,
      pitchWithRotate: false,
      attributionControl: { compact: true },
    });
    map.touchZoomRotate.disableRotation();
    mapRef.current = map;

    // "style.load" fires as soon as the style is in; "load" waits for a first full render,
    // which a background tab can hold back.
    map.once("style.load", () => {
      map.addSource("radar", {
        type: "raster",
        tiles: [RADAR_TILES],
        tileSize: 256,
        attribution: '<a href="https://mesonet.agron.iastate.edu/">Radar: Iowa Environmental Mesonet</a>',
      });
      map.addLayer({
        id: "radar",
        type: "raster",
        source: "radar",
        layout: { visibility: "none" },
        paint: { "raster-opacity": 0.7 },
      });

      map.addSource("origin", { type: "geojson", data: originFeatures(null) });
      map.addLayer({
        id: "origin",
        type: "circle",
        source: "origin",
        paint: { "circle-radius": 5, "circle-color": "#ffffff", "circle-stroke-color": "#0f1a2a", "circle-stroke-width": 2.5 },
      });

      map.addSource("resorts", { type: "geojson", data: resortFeatures([], {}, []), promoteId: "id" });
      map.addLayer({
        id: "resort-halo",
        type: "circle",
        source: "resorts",
        paint: {
          "circle-radius": 15,
          "circle-color": "#0f1a2a",
          "circle-opacity": ["case", state("selected"), 0.1, 0],
        },
      });
      map.addLayer({
        id: "resorts",
        type: "circle",
        source: "resorts",
        paint: {
          "circle-radius": ["case", state("selected"), 8.5, state("hover"), 8, ["get", "favorite"], FAVORITE_RADIUS, DOT_RADIUS],
          "circle-color": ["get", "color"],
          "circle-stroke-color": ["case", state("selected"), "#0f1a2a", "#ffffff"],
          "circle-stroke-width": ["case", state("selected"), 2.5, 1.5],
        },
      });
      // Your mountains carry their names and next-7-day totals.
      map.addLayer({
        id: "favorite-names",
        type: "symbol",
        source: "resorts",
        filter: ["get", "favorite"],
        layout: {
          "text-field": ["get", "label"],
          "text-font": ["Noto Sans Bold"],
          "text-size": 11,
          "text-anchor": "left",
          "text-offset": [0.9, 0],
        },
        paint: { "text-color": "#0f1a2a", "text-halo-color": "#ffffff", "text-halo-width": 1.5 },
      });

      map.on("click", (e) => {
        const hit = map.queryRenderedFeatures(e.point, { layers: ["resorts"] })[0];
        const id = hit?.properties?.id;
        select.current(typeof id === "string" ? id : null);
      });
      map.on("mouseenter", "resorts", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "resorts", () => (map.getCanvas().style.cursor = ""));
      setReady(true);
    });

    // The map credit opens expanded; fold it to its (i) button after 5 seconds, as
    // OpenStreetMap's attribution guidelines allow.
    const foldCredit = setTimeout(() => {
      map.getContainer().querySelector(".maplibregl-compact-show")?.classList.remove("maplibregl-compact-show");
    }, 5000);

    return () => {
      clearTimeout(foldCredit);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    (mapRef.current?.getSource("resorts") as GeoJSONSource | undefined)?.setData(resortFeatures(resorts, snow, favoriteIds));
  }, [ready, resorts, snow, favoriteIds]);

  useEffect(() => {
    if (!ready) return;
    (mapRef.current?.getSource("origin") as GeoJSONSource | undefined)?.setData(originFeatures(origin));
  }, [ready, origin]);

  // Highlight a dot from outside (hovering the list, or the selected resort).
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const marks: [string | null, "hover" | "selected"][] = [
      [hoveredId, "hover"],
      [selectedId, "selected"],
    ];
    for (const [id, key] of marks) if (id) map.setFeatureState({ source: "resorts", id }, { [key]: true });
    return () => {
      // Leaving the page removes the map before this runs; then there's nothing to clear.
      if (mapRef.current !== map) return;
      for (const [id, key] of marks) if (id) map.setFeatureState({ source: "resorts", id }, { [key]: false });
    };
  }, [ready, hoveredId, selectedId]);

  // Radar on or off; while on, fetch fresh tiles as the composite updates.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    map.setLayoutProperty("radar", "visibility", radar ? "visible" : "none");
    if (!radar) return;
    const refresh = () => (map.getSource("radar") as RasterTileSource | undefined)?.setTiles([`${RADAR_TILES}?t=${Date.now()}`]);
    refresh();
    const timer = setInterval(refresh, RADAR_REFRESH_MS);
    return () => clearInterval(timer);
  }, [ready, radar]);

  // A new region: frame it (the first frame is set when the map is created).
  const framed = useRef(frame);
  useEffect(() => {
    if (!ready || framed.current === frame) return;
    framed.current = frame;
    mapRef.current?.fitBounds(frame, { padding: FRAME_PADDING, duration: 0 });
  }, [ready, frame]);

  useEffect(() => {
    if (!focus) return;
    mapRef.current?.flyTo({ center: [focus.lon, focus.lat], zoom: focus.zoom, duration: 900 });
  }, [focus]);

  return <div ref={container} className="h-full w-full" />;
}
