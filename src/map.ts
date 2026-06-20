import maplibregl from "maplibre-gl";
import type { ParsedTrack } from "./types";
import { resample } from "./resample";

const STYLE_URL = `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${import.meta.env.VITE_MAPTILER_KEY}`;

const HEATMAP_SOURCE = "heatmap-source";
const HEATMAP_LAYER  = "heatmap-layer";
const TRACK_SOURCE   = "track-source";
const TRACK_LAYER    = "track-layer";

// Three sample runs in London: two share the same loop (to demo frequency stacking),
// one goes a different way. Replaced once real data is loaded.
const SAMPLE_TRACKS: ParsedTrack[] = [
  {
    activityId: "sample-1",
    points: [
      { lat: 51.500, lng: -0.180 }, { lat: 51.503, lng: -0.178 },
      { lat: 51.507, lng: -0.172 }, { lat: 51.511, lng: -0.168 },
      { lat: 51.513, lng: -0.175 }, { lat: 51.510, lng: -0.183 },
      { lat: 51.505, lng: -0.188 }, { lat: 51.500, lng: -0.180 },
    ],
  },
  {
    activityId: "sample-2",
    points: [
      { lat: 51.500, lng: -0.180 }, { lat: 51.503, lng: -0.178 },
      { lat: 51.507, lng: -0.172 }, { lat: 51.511, lng: -0.168 },
      { lat: 51.513, lng: -0.175 }, { lat: 51.510, lng: -0.183 },
      { lat: 51.505, lng: -0.188 }, { lat: 51.500, lng: -0.180 },
    ],
  },
  {
    activityId: "sample-3",
    points: [
      { lat: 51.498, lng: -0.162 }, { lat: 51.502, lng: -0.158 },
      { lat: 51.506, lng: -0.151 }, { lat: 51.510, lng: -0.145 },
      { lat: 51.513, lng: -0.140 },
    ],
  },
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
  map.on("load", () => addTracks(SAMPLE_TRACKS));

  return map;
}

// ─── GeoJSON builders ────────────────────────────────────────────────────────

function buildHeatmapGeoJson(
  tracks: ParsedTrack[]
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  // Resample here so frequency weighting is normalised across activities:
  // each pass contributes exactly one point per 25 m regardless of GPS sample rate.
  const features: GeoJSON.Feature<GeoJSON.Point>[] = [];
  for (const track of tracks) {
    for (const { lat, lng } of resample(track.points, 25)) {
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [lng, lat] },
        properties: {},
      });
    }
  }
  return { type: "FeatureCollection", features };
}

function buildTrackGeoJson(
  tracks: ParsedTrack[]
): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  return {
    type: "FeatureCollection",
    features: tracks
      .filter((t) => t.points.length >= 2)
      .map((t) => ({
        type: "Feature" as const,
        geometry: {
          type: "LineString" as const,
          coordinates: t.points.map(({ lat, lng }) => [lng, lat]),
        },
        properties: {},
      })),
  };
}

// ─── Layer setup ─────────────────────────────────────────────────────────────

function setupLayers(): void {
  // ── Heatmap source + layer (low zoom: density overview) ──────────────────
  map.addSource(HEATMAP_SOURCE, {
    type: "geojson",
    data: buildHeatmapGeoJson([]),
  });

  map.addLayer({
    id: HEATMAP_LAYER,
    type: "heatmap",
    source: HEATMAP_SOURCE,
    paint: {
      "heatmap-weight": 1,

      // Radius: small at low zoom so routes look like thin lines, not blobs.
      // Points are sub-pixel below zoom 13 so even 2–4 px fills the gap.
      "heatmap-radius": [
        "interpolate", ["linear"], ["zoom"],
        1,  1,
        8,  2,
        11, 3,
        13, 5,
      ],

      // Keep intensity low so a single long route doesn't self-accumulate into
      // a high-density reading — the signal should come from repeated passes.
      "heatmap-intensity": [
        "interpolate", ["linear"], ["zoom"],
        1,  0.08,
        13, 0.32,
      ],

      // Hard threshold at density ~0.07: routes at less than ~7% of the viewport
      // maximum stay invisible. In a mixed view this hides once-traveled routes
      // while frequently-traveled corridors still glow. In a quiet area where
      // once-traveled routes are the viewport maximum, they'll still show — that's
      // intentional. Alpha is capped at 0.62 so the basemap always shows through.
      "heatmap-color": [
        "interpolate", ["linear"], ["heatmap-density"],
        0,     "rgba(0,0,0,0)",
        0.07,  "rgba(0,0,0,0)",
        0.10,  "rgba(255,160,55,0.08)",
        0.18,  "rgba(255,135,25,0.22)",
        0.35,  "rgba(255,100,8,0.38)",
        0.58,  "rgba(230,55,0,0.50)",
        0.82,  "rgba(195,22,0,0.58)",
        1.0,   "rgba(160,8,0,0.62)",
      ],

      // Fade the heatmap out as the line layer takes over.
      "heatmap-opacity": [
        "interpolate", ["linear"], ["zoom"],
        11, 0.9,
        14, 0,
      ],
    },
  });

  // ── Track source + layer (high zoom: connected polylines) ─────────────────
  map.addSource(TRACK_SOURCE, {
    type: "geojson",
    data: buildTrackGeoJson([]),
  });

  map.addLayer({
    id: TRACK_LAYER,
    type: "line",
    source: TRACK_SOURCE,
    layout: {
      "line-join": "round",
      "line-cap": "round",
    },
    paint: {
      "line-color": "#ff6b2b",

      // Constant-ish screen width — stays thin at every zoom level.
      "line-width": [
        "interpolate", ["linear"], ["zoom"],
        11, 1,
        16, 1.5,
        20, 2,
      ],

      // Each activity is semi-transparent. Repeated passes on the same route
      // stack their opacity: 1 pass ≈ 22 %, 4 passes ≈ 63 %, 10 passes ≈ 91 %.
      // This gives a natural, free frequency signal without any aggregation step.
      "line-opacity": [
        "interpolate", ["linear"], ["zoom"],
        11, 0,
        13, 0.22,
      ],
    },
  });
}

// ─── Public API ──────────────────────────────────────────────────────────────

let storedTracks: ParsedTrack[] = [];

function applyTracks(tracks: ParsedTrack[]): void {
  if (!map.isStyleLoaded()) {
    map.once("load", () => applyTracks(tracks));
    return;
  }

  const heatmapSource = map.getSource(HEATMAP_SOURCE) as maplibregl.GeoJSONSource | undefined;
  const trackSource   = map.getSource(TRACK_SOURCE)   as maplibregl.GeoJSONSource | undefined;

  if (heatmapSource && trackSource) {
    heatmapSource.setData(buildHeatmapGeoJson(tracks));
    trackSource.setData(buildTrackGeoJson(tracks));
  } else {
    setupLayers();
    (map.getSource(HEATMAP_SOURCE) as maplibregl.GeoJSONSource).setData(buildHeatmapGeoJson(tracks));
    (map.getSource(TRACK_SOURCE)   as maplibregl.GeoJSONSource).setData(buildTrackGeoJson(tracks));
  }
}

export function addTracks(tracks: ParsedTrack[]): void {
  storedTracks = tracks;
  applyTracks(tracks);
}

// Pass null to show all types, or a Set of type strings to filter.
// Tracks with no activityType are hidden whenever a filter is active.
export function setVisibleTypes(types: Set<string> | null): void {
  const visible =
    types === null
      ? storedTracks
      : storedTracks.filter((t) => t.activityType != null && types.has(t.activityType));
  applyTracks(visible);
}

export function getMap(): maplibregl.Map {
  return map;
}
