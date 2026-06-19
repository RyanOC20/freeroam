import { unzip, gunzip } from "fflate";
import type { LatLng, ParsedTrack } from "../types";
import { parseGpx } from "./gpx";
import { parseTcx } from "./tcx";
import { parseFit } from "./fit";

// Strips the outer .gz layer from a filename: "foo.gpx.gz" -> "foo.gpx"
function stripGz(name: string): string {
  return name.endsWith(".gz") ? name.slice(0, -3) : name;
}

function extension(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

// Converts fflate's callback-based API to a Promise.
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

async function parseEntry(
  name: string,
  data: Uint8Array
): Promise<LatLng[]> {
  let bytes = data;
  let filename = name;

  if (filename.endsWith(".gz")) {
    bytes = await gunzipAsync(bytes);
    filename = stripGz(filename);
  }

  const ext = extension(filename);

  if (ext === "gpx") {
    const text = new TextDecoder().decode(bytes);
    return parseGpx(text);
  }

  if (ext === "tcx") {
    const text = new TextDecoder().decode(bytes);
    return parseTcx(text);
  }

  if (ext === "fit") {
    return parseFit(bytes.buffer as ArrayBuffer);
  }

  // Unrecognised extension — skip silently.
  return [];
}

export async function parseArchive(file: File): Promise<ParsedTrack[]> {
  const raw = new Uint8Array(await file.arrayBuffer());
  const entries = await unzipAsync(raw);

  const tracks: ParsedTrack[] = [];

  await Promise.all(
    Object.entries(entries).map(async ([path, data]) => {
      const name = path.split("/").pop() ?? path;

      // Skip non-activity entries (activities.csv, README, etc.)
      if (
        !name.endsWith(".gpx") &&
        !name.endsWith(".tcx") &&
        !name.endsWith(".fit") &&
        !name.endsWith(".gpx.gz") &&
        !name.endsWith(".tcx.gz") &&
        !name.endsWith(".fit.gz")
      ) {
        return;
      }

      const points = await parseEntry(name, data);
      if (points.length > 0) {
        const activityId = name.replace(/\.(gpx|tcx|fit)(\.gz)?$/i, "");
        tracks.push({ points, activityId });
      }
    })
  );

  return tracks;
}
