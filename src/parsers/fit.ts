import type { LatLng } from "../types";

// TODO: implement using fit-file-parser
// Input: raw bytes of a .fit file (ArrayBuffer)
// Output: array of LatLng points extracted from record messages
export function parseFit(_bytes: ArrayBuffer): LatLng[] {
  console.warn("FIT parser not yet implemented");
  return [];
}
