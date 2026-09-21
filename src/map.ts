import maplibregl from "maplibre-gl";
import type { ParsedTrack } from "./types";
import { resample } from "./resample";

const STYLE_URL = `https://api.maptiler.com/maps/dataviz-dark/style.json?key=VTmfAiUPwEEnKbFgH7wD`;

const HEATMAP_SOURCE = "heatmap-source";
const HEATMAP_LAYER  = "heatmap-layer";

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

// Fixed launch camera: horizontally centered on London, vertically centered on the
// Spain/Morocco strait (≈36°N, the Strait of Gibraltar). Hardcoded so the framing
// is identical on every launch and screen, with no per-load computation.
const INITIAL_CENTER: [number, number] = [-0.13, 36]; // [London lng, Gibraltar lat]
const INITIAL_ZOOM = 2;

// Set once imported data claims the camera, so the reveal re-assert below never
// overrides where the user's tracks put the map.
let cameraClaimed = false;
let revealObserver: ResizeObserver | null = null;

export function claimCamera(): void {
  cameraClaimed = true;
  revealObserver?.disconnect();
  revealObserver = null;
}

export function initMap(container: string): maplibregl.Map {
  map = new maplibregl.Map({
    container,
    style: STYLE_URL,
    center: INITIAL_CENTER,
    zoom: INITIAL_ZOOM,
    // renderWorldCopies defaults to true — the world repeats east–west so panning
    // never hits a wall, matching Google Maps' endless horizontal scroll.
    dragRotate: false, // no right-click / ctrl drag-rotate (also disables its tilt)
    touchPitch: false, // no tilt from the two-finger touch gesture
    attributionControl: { compact: true },
  });

  map.addControl(new maplibregl.NavigationControl(), "top-right");
  map.on("load", () => addTracks(SAMPLE_TRACKS));

  // #map starts display:none (0×0). A map built in a zero-size container can drop
  // its configured center/zoom when first shown, so re-assert the fixed launch
  // framing the moment the container actually has a size — unless imported data
  // has already claimed the camera.
  revealObserver = new ResizeObserver(() => {
    const c = map.getContainer();
    if (c.clientWidth === 0 || c.clientHeight === 0) return; // still hidden
    revealObserver?.disconnect();
    revealObserver = null;
    if (!cameraClaimed) map.jumpTo({ center: INITIAL_CENTER, zoom: INITIAL_ZOOM });
  });
  revealObserver.observe(map.getContainer());

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

      // Radius grows with zoom so routes stay continuous glowing paths at every
      // zoom instead of breaking into beads. Points are resampled every ~25 m,
      // which spreads to tens of pixels apart once you zoom in, so the kernel
      // has to grow roughly in step (exponential) to keep the line unbroken.
      "heatmap-radius": [
        "interpolate", ["exponential", 2], ["zoom"],
        1,  1,
        8,  2,
        11, 4,
        14, 10,
        17, 40,
        20, 150,
      ],

      // Keep intensity low so a single long route doesn't self-accumulate into
      // a high-density reading — the signal should come from repeated passes.
      // It also tapers back down at high zoom: the larger radius above makes a
      // single route's own points overlap more, so without this a lone path
      // would self-saturate to yellow when zoomed in. Lower intensity there
      // keeps rarely-traveled routes purple at every zoom.
      "heatmap-intensity": [
        "interpolate", ["linear"], ["zoom"],
        1,  0.02,
        13, 0.09,
        16, 0.05,
        20, 0.02,
      ],

      // Hard threshold at density ~0.07: routes at less than ~7% of the viewport
      // maximum stay invisible. In a mixed view this hides once-traveled routes
      // while frequently-traveled corridors still glow. In a quiet area where
      // once-traveled routes are the viewport maximum, they'll still show — that's
      // intentional. Alpha is capped at 0.62 so the basemap always shows through.
      // Strava-style spectral ramp: the hue itself shifts with frequency.
      // Rarely-traveled routes read purple; as passes stack the color climbs
      // through magenta, red, orange, yellow to near-white at the busiest
      // corridors. Alpha rises with density so the basemap shows through the
      // faint end and the hottest paths read almost solid.
      "heatmap-color": [
        "interpolate", ["linear"], ["heatmap-density"],
        0.00, "rgba(0,0,0,0)",
        0.04, "rgba(68,20,130,0.20)",    // faint purple (infrequent)
        0.15, "rgba(104,28,168,0.42)",   // purple
        0.30, "rgba(160,32,140,0.52)",   // violet-magenta
        0.45, "rgba(206,40,92,0.58)",    // magenta-red
        0.58, "rgba(230,58,48,0.62)",    // red
        0.70, "rgba(245,112,28,0.66)",   // orange
        0.82, "rgba(250,165,40,0.72)",   // amber
        0.92, "rgba(253,205,64,0.80)",   // gold
        1.00, "rgba(255,231,110,0.88)",  // warm yellow (most frequent)
      ],

      // The heatmap is now the only route layer, so keep it fully visible at
      // every zoom instead of fading out for a vector line layer.
      "heatmap-opacity": 0.9,
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

  if (heatmapSource) {
    heatmapSource.setData(buildHeatmapGeoJson(tracks));
  } else {
    setupLayers();
    (map.getSource(HEATMAP_SOURCE) as maplibregl.GeoJSONSource).setData(buildHeatmapGeoJson(tracks));
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
