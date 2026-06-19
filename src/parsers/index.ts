import { unzip, gunzip } from "fflate";
import type { LatLng, ParsedTrack } from "../types";
import { parseGpx } from "./gpx";
import { parseTcx } from "./tcx";
import { parseFit } from "./fit";

const ACTIVITY_RE = /\.(gpx|tcx|fit)(\.gz)?$/i;

function stripGz(name: string): string {
  return name.endsWith(".gz") ? name.slice(0, -3) : name;
}

function extension(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function unzipAsync(data: Uint8Array): Promise<Record<string, Uint8Array>> {
  return new Promise((resolve, reject) =>
    unzip(data, (err, files) => (err ? reject(err) : resolve(files)))
  );
}

function gunzipAsync(data: Uint8Array): Promise<Uint8Array> {
  return new Promise((resolve, reject) =>
    gunzip(data, (err, result) => (err ? reject(err) : resolve(result)))
  );
}

async function parseEntry(name: string, data: Uint8Array): Promise<LatLng[]> {
  let bytes = data;
  let filename = name;

  if (filename.endsWith(".gz")) {
    bytes = await gunzipAsync(bytes);
    filename = stripGz(filename);
  }

  const ext = extension(filename);

  if (ext === "gpx") return parseGpx(new TextDecoder().decode(bytes));
  if (ext === "tcx") return parseTcx(new TextDecoder().decode(bytes));
  if (ext === "fit") {
    // Always slice to the exact byte range of this file. If fflate hands back a
    // Uint8Array that is a view into a larger backing buffer, passing .buffer
    // directly would feed extra bytes to the FIT parser and risk an infinite loop.
    const fitBuf = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    ) as ArrayBuffer;
    return parseFit(fitBuf);
  }

  return [];
}

export async function parseArchive(
  buffer: ArrayBuffer,
  onProgress?: (done: number, total: number) => void
): Promise<ParsedTrack[]> {
  const entries = await unzipAsync(new Uint8Array(buffer));

  const activityEntries = Object.entries(entries).filter(([path]) => {
    const name = path.split("/").pop() ?? path;
    return ACTIVITY_RE.test(name);
  });

  const total = activityEntries.length;
  const tracks: ParsedTrack[] = [];

  // Sequential loop rather than Promise.all: all parsers are CPU-synchronous so
  // true parallelism is impossible, and sequential processing ensures that one
  // bad file can't block the progress counter for every other file.
  for (let i = 0; i < activityEntries.length; i++) {
    const [path, data] = activityEntries[i];
    const name = path.split("/").pop() ?? path;

    try {
      const points = await parseEntry(name, data);
      if (points.length >= 2) {
        tracks.push({ points, activityId: name.replace(ACTIVITY_RE, "") });
      }
    } catch (err) {
      console.warn(`Skipping ${name}:`, err);
    }

    onProgress?.(i + 1, total);
  }

  return tracks;
}
