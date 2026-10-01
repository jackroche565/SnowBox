"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { ELEVATION, SHADING, hillshadeLayer } from "@/lib/terrain";

type Props = { lat: number; lon: number };

const ZOOM = 12.2;
const PITCH = 66;
const EXAGGERATION = 1.5;
/** How far out (in degrees of latitude, ~2.5 km) to look for the high ground. */
const SAMPLE_RADIUS = 0.022;
const SAMPLE_DIRECTIONS = 12;
/** How far from the base toward the high ground to center the view (0 = base, 1 = summit). */
const TOWARD_SUMMIT = 0.4;

/**
 * A still, 3D view of the mountain. Resort coordinates usually sit at the base area, so once the
 * terrain loads we sample the ground around it, turn to face the highest point and move partway
 * toward it.
 */
export default function TerrainHero({ lat, lon }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!container.current) return;
    const map = new maplibregl.Map({
      container: container.current,
      style: {
        version: 8,
        sources: { terrain: ELEVATION, shading: SHADING },
        layers: [{ id: "ground", type: "background", paint: { "background-color": "#e8eef4" } }, hillshadeLayer()],
        terrain: { source: "terrain", exaggeration: EXAGGERATION },
        sky: {
          "sky-color": "#c9dcec",
          "horizon-color": "#f3f6f9",
          "fog-color": "#f3f6f9",
          "sky-horizon-blend": 0.7,
          "horizon-fog-blend": 0.5,
          "fog-ground-blend": 0.35,
        },
      },
      center: [lon, lat],
      zoom: ZOOM,
      pitch: PITCH,
      interactive: false,
      attributionControl: false,
    });

    let aimed = false;
    map.on("idle", () => {
      if (aimed) return;
      aimed = true;
      const lonScale = 1 / Math.cos((lat * Math.PI) / 180);
      let best: { bearing: number; lat: number; lon: number; height: number } | null = null;
      for (let i = 0; i < SAMPLE_DIRECTIONS; i++) {
        const bearing = (360 / SAMPLE_DIRECTIONS) * i;
        const rad = (bearing * Math.PI) / 180;
        const point = { lat: lat + Math.cos(rad) * SAMPLE_RADIUS, lon: lon + Math.sin(rad) * SAMPLE_RADIUS * lonScale };
        const height = map.queryTerrainElevation([point.lon, point.lat]);
        if (height != null && (!best || height > best.height)) best = { bearing, ...point, height };
      }
      if (best) {
        // Center partway toward the summit so the mountain fills the top of the frame.
        map.jumpTo({
          bearing: best.bearing,
          center: [lon + (best.lon - lon) * TOWARD_SUMMIT, lat + (best.lat - lat) * TOWARD_SUMMIT],
        });
        map.once("idle", () => setShown(true));
      } else {
        setShown(true);
      }
    });

    return () => map.remove();
  }, [lat, lon]);

  return (
    <div
      ref={container}
      aria-hidden="true"
      className={`absolute inset-0 transition-opacity duration-700 ${shown ? "opacity-100" : "opacity-0"}`}
    />
  );
}
