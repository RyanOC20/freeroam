import maplibregl from "maplibre-gl";
import type { LatLng } from "./types";

const STYLE_URL = `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${import.meta.env.VITE_MAPTILER_KEY}`;
const SOURCE_ID = "heatmap-source";
const LAYER_ID = "heatmap-layer";

// A few dozen points clustered around London for smoke-testing the render pipeline.
const SAMPLE_POINTS: LatLng[] = [
  { lat: 51.505, lng: -0.09 }, { lat: 51.506, lng: -0.088 },
  { lat: 51.504, lng: -0.091 }, { lat: 51.507, lng: -0.087 },
  { lat: 51.503, lng: -0.092 }, { lat: 51.508, lng: -0.086 },
  { lat: 51.502, lng: -0.09 },  { lat: 51.509, lng: -0.085 },
  { lat: 51.505, lng: -0.093 }, { lat: 51.506, lng: -0.084 },
  { lat: 51.501, lng: -0.09 },  { lat: 51.51,  lng: -0.083 },
  { lat: 51.505, lng: -0.095 }, { lat: 51.511, lng: -0.082 },
  { lat: 51.505, lng: -0.09 },  { lat: 51.505, lng: -0.09 },
  { lat: 51.505, lng: -0.09 },  { lat: 51.505, lng: -0.09 },
  { lat: 51.506, lng: -0.089 }, { lat: 51.506, lng: -0.089 },
  { lat: 51.506, lng: -0.089 }, { lat: 51.504, lng: -0.091 },
  { lat: 51.504, lng: -0.091 }, { lat: 51.503, lng: -0.09 },
];

let map: maplibregl.Map;

export function initMap(container: string): maplibregl.Map {
  map = new maplibregl.Map({
    container,
    style: STYLE_URL,
    center: [-0.09, 51.505],
    zoom: 11,
    attributionControl: { compact: true },
  });

  map.addControl(new maplibregl.NavigationControl(), "top-right");

  map.on("load", () => {
    addHeatmapPoints(SAMPLE_POINTS);
  });

  return map;
}

function buildGeoJson(
  points: LatLng[]
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: points.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lng, p.lat] },
      properties: {},
    })),
  };
}

export function addHeatmapPoints(points: LatLng[]): void {
  if (!map.isStyleLoaded()) {
    map.once("load", () => addHeatmapPoints(points));
    return;
  }

  const data = buildGeoJson(points);
  const existing = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;

  if (existing) {
    existing.setData(data);
    return;
  }

  map.addSource(SOURCE_ID, { type: "geojson", data });

  map.addLayer({
    id: LAYER_ID,
    type: "heatmap",
    source: SOURCE_ID,
    paint: {
      // Each point contributes equally; density comes from overlap count.
      "heatmap-weight": 1,

      // Radius in pixels — grows with zoom so the visual stays consistent.
      "heatmap-radius": [
        "interpolate", ["linear"], ["zoom"],
        5,  6,
        10, 12,
        14, 20,
        18, 35,
      ],

      // Intensity multiplier — boost at higher zooms so sparse areas show up.
      "heatmap-intensity": [
        "interpolate", ["linear"], ["zoom"],
        5,  0.4,
        14, 1.2,
      ],

      // Light (low density) → orange → dark red (high density).
      "heatmap-color": [
        "interpolate", ["linear"], ["heatmap-density"],
        0,    "rgba(0,0,0,0)",
        0.15, "rgba(255,220,100,0.4)",
        0.4,  "rgba(255,140,30,0.65)",
        0.65, "rgba(220,50,10,0.85)",
        1,    "rgba(160,10,10,1)",
      ],

      // Fade out at very low zoom; always fully opaque once zoomed in.
      "heatmap-opacity": [
        "interpolate", ["linear"], ["zoom"],
        4, 0.6,
        8, 0.9,
      ],
    },
  });
}

export function getMap(): maplibregl.Map {
  return map;
}
