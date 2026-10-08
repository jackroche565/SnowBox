import type { HillshadeLayerSpecification, RasterDEMSourceSpecification, StyleSpecification } from "maplibre-gl";

// Free, keyless sources for the maps:
// - Elevation: AWS Terrain Tiles (open data, "terrarium" encoding).
// - Map data: OpenFreeMap vector tiles (OpenStreetMap data).

export const ELEVATION: RasterDEMSourceSpecification = {
  type: "raster-dem",
  tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
  encoding: "terrarium",
  tileSize: 256,
  // Higher zooms show terracing in this dataset, so the terrain mesh stops here.
  maxzoom: 12,
  attribution: '<a href="https://registry.opendata.aws/terrain-tiles/">Terrain Tiles</a>',
};

/** Shading reads finer detail than the 3D mesh needs. */
export const SHADING: RasterDEMSourceSpecification = { ...ELEVATION, maxzoom: 13 };

/**
 * Snowbox's own quiet map: snow land, ice-blue water, relief, dashed state lines, and only state and
 * city names. No roads, buildings or anything else that doesn't help you find a mountain.
 */
export const QUIET_STYLE: StyleSpecification = {
  version: 8,
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  sources: {
    map: {
      type: "vector",
      url: "https://tiles.openfreemap.org/planet",
      attribution: '<a href="https://openfreemap.org">OpenFreeMap</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
    shading: { ...ELEVATION, maxzoom: 12 },
  },
  layers: [
    { id: "land", type: "background", paint: { "background-color": "#f3f5f8" } },
    {
      id: "relief",
      type: "hillshade",
      source: "shading",
      paint: {
        "hillshade-shadow-color": "#7d90a6",
        "hillshade-highlight-color": "#ffffff",
        "hillshade-accent-color": "#a9b8c8",
        "hillshade-exaggeration": 0.55,
        "hillshade-illumination-direction": 315,
      },
    },
    { id: "water", type: "fill", source: "map", "source-layer": "water", paint: { "fill-color": "#d5e2ec" } },
    {
      id: "states",
      type: "line",
      source: "map",
      "source-layer": "boundary",
      filter: ["all", ["==", ["get", "admin_level"], 4], ["!=", ["get", "maritime"], 1]],
      paint: { "line-color": "#9aa6b5", "line-width": 1, "line-dasharray": [2, 2] },
    },
    {
      id: "countries",
      type: "line",
      source: "map",
      "source-layer": "boundary",
      filter: ["all", ["==", ["get", "admin_level"], 2], ["!=", ["get", "maritime"], 1]],
      paint: { "line-color": "#8f9aab", "line-width": 1.2 },
    },
    {
      id: "state-names",
      type: "symbol",
      source: "map",
      "source-layer": "place",
      filter: ["==", ["get", "class"], "state"],
      layout: {
        "text-field": ["coalesce", ["get", "name_en"], ["get", "name"]],
        "text-font": ["Noto Sans Regular"],
        "text-size": 10,
        "text-transform": "uppercase",
        "text-letter-spacing": 0.35,
      },
      paint: { "text-color": "#9aa6b5" },
    },
    {
      id: "cities",
      type: "symbol",
      source: "map",
      "source-layer": "place",
      filter: ["==", ["get", "class"], "city"],
      layout: { "text-field": ["coalesce", ["get", "name_en"], ["get", "name"]], "text-font": ["Noto Sans Regular"], "text-size": 11 },
      paint: { "text-color": "#6b7585", "text-halo-color": "#f3f5f8", "text-halo-width": 1.5 },
    },
  ],
};

/** Snow-white relief: cool slate shadows, white highlights. */
export function hillshadeLayer(exaggeration = 0.65): HillshadeLayerSpecification {
  return {
    id: "hillshade",
    type: "hillshade",
    source: "shading",
    paint: {
      "hillshade-shadow-color": "#2a3a52",
      "hillshade-highlight-color": "#ffffff",
      "hillshade-accent-color": "#7f9ab3",
      "hillshade-exaggeration": exaggeration,
      "hillshade-illumination-direction": 315,
    },
  };
}

export const TERRAIN_CREDIT = "Terrain: AWS. Map © OpenStreetMap, OpenFreeMap.";
