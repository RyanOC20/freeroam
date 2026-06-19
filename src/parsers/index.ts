import { unzip, gunzip } from "fflate";
import type { LatLng, ParsedTrack } from "../types";
import { parseGpx } from "./gpx";
import { parseTcx } from "./tcx";
import { parseFit } from "./fit";
import { resample } from "../resample";

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
  if (ext === "fit") return parseFit(bytes.buffer as ArrayBuffer);

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
  let done = 0;
  const tracks: ParsedTrack[] = [];

  await Promise.all(
    activityEntries.map(async ([path, data]) => {
      const name = path.split("/").pop() ?? path;

      let points: LatLng[];
      try {
        points = await parseEntry(name, data);
      } catch (err) {
        console.warn(`Skipping ${name}:`, err);
        onProgress?.(++done, total);
        return;
      }

      // Indoor/manual activities have no GPS — skip them gracefully.
      if (points.length >= 2) {
        const activityId = name.replace(ACTIVITY_RE, "");
        tracks.push({ points: resample(points), activityId });
      }

      onProgress?.(++done, total);
    })
  );

  return tracks;
}
