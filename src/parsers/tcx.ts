import type { LatLng } from "../types";

// TODO: implement using @tmcw/togeojson
// Input: text content of a .tcx file
// Output: array of LatLng points extracted from all <Trackpoint> elements
export function parseTcx(_xml: string): LatLng[] {
  console.warn("TCX parser not yet implemented");
  return [];
}
