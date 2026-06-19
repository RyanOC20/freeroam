import type { LatLng } from "../types";

// TODO: implement using @tmcw/togeojson
// Input: text content of a .gpx file
// Output: array of LatLng points extracted from all <trkpt> elements
export function parseGpx(_xml: string): LatLng[] {
  console.warn("GPX parser not yet implemented");
  return [];
}
