import type { HillshadeLayerSpecification, RasterDEMSourceSpecification } from "maplibre-gl";

// Free, keyless sources for the 3D maps:
// - Elevation: AWS Terrain Tiles (open data, "terrarium" encoding).
// - Basemap: OpenFreeMap's Positron style (OpenStreetMap data).

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

export const BASEMAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

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

export const TERRAIN_CREDIT = "Terrain: AWS Terrain Tiles. Map data © OpenStreetMap contributors, OpenFreeMap.";
