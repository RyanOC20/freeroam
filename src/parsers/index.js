import { unzip, gunzip } from "fflate";
import { parseGpx } from "./gpx";
import { parseTcx } from "./tcx";
import { parseFit } from "./fit";
const ACTIVITY_RE = /\.(gpx|tcx|fit)(\.gz)?$/i;
// ─── activities.csv parsing ───────────────────────────────────────────────────
function parseCSVLine(line) {
    const fields = [];
    let field = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
                field += '"';
                i++;
            }
            else
                inQuotes = !inQuotes;
        }
        else if (ch === "," && !inQuotes) {
            fields.push(field.trim());
            field = "";
        }
        else {
            field += ch;
        }
    }
    fields.push(field.trim());
    return fields;
}
function buildTypeMap(csvText) {
    const lines = csvText.split("\n").filter((l) => l.trim());
    if (lines.length < 2)
        return new Map();
    const header = parseCSVLine(lines[0]).map((h) => h.replace(/"/g, "").toLowerCase().trim());
    const idIdx = header.findIndex((h) => h === "activity id");
    const typeIdx = header.findIndex((h) => h === "sport type" || h === "activity type" || h === "type");
    if (idIdx === -1 || typeIdx === -1)
        return new Map();
    const map = new Map();
    for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        const id = cols[idIdx]?.replace(/"/g, "").trim();
        const type = cols[typeIdx]?.replace(/"/g, "").trim();
        if (id && type)
            map.set(id, type);
    }
    return map;
}
function stripGz(name) {
    return name.endsWith(".gz") ? name.slice(0, -3) : name;
}
function extension(name) {
    return name.split(".").pop()?.toLowerCase() ?? "";
}
function unzipAsync(data) {
    return new Promise((resolve, reject) => unzip(data, (err, files) => (err ? reject(err) : resolve(files))));
}
function gunzipAsync(data) {
    return new Promise((resolve, reject) => gunzip(data, (err, result) => (err ? reject(err) : resolve(result))));
}
async function parseEntry(name, data) {
    let bytes = data;
    let filename = name;
    if (filename.endsWith(".gz")) {
        bytes = await gunzipAsync(bytes);
        filename = stripGz(filename);
    }
    const ext = extension(filename);
    if (ext === "gpx")
        return parseGpx(new TextDecoder().decode(bytes));
    if (ext === "tcx")
        return parseTcx(new TextDecoder().decode(bytes));
    if (ext === "fit") {
        // Always slice to the exact byte range of this file. If fflate hands back a
        // Uint8Array that is a view into a larger backing buffer, passing .buffer
        // directly would feed extra bytes to the FIT parser and risk an infinite loop.
        const fitBuf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        return parseFit(fitBuf);
    }
    return [];
}
export async function parseArchive(buffer, onProgress) {
    const entries = await unzipAsync(new Uint8Array(buffer));
    // Build activity-ID → sport-type map from activities.csv if present.
    const csvEntry = Object.entries(entries).find(([path]) => path.toLowerCase().endsWith("activities.csv"));
    const typeMap = csvEntry
        ? buildTypeMap(new TextDecoder().decode(csvEntry[1]))
        : new Map();
    const activityEntries = Object.entries(entries).filter(([path]) => {
        const name = path.split("/").pop() ?? path;
        return ACTIVITY_RE.test(name);
    });
    const total = activityEntries.length;
    const tracks = [];
    // Sequential loop rather than Promise.all: all parsers are CPU-synchronous so
    // true parallelism is impossible, and sequential processing ensures that one
    // bad file can't block the progress counter for every other file.
    for (let i = 0; i < activityEntries.length; i++) {
        const [path, data] = activityEntries[i];
        const name = path.split("/").pop() ?? path;
        const activityId = name.replace(ACTIVITY_RE, "");
        try {
            const points = await parseEntry(name, data);
            if (points.length >= 2) {
                tracks.push({
                    points,
                    activityId,
                    activityType: typeMap.get(activityId),
                });
            }
        }
        catch (err) {
            console.warn(`Skipping ${name}:`, err);
        }
        onProgress?.(i + 1, total);
    }
    return tracks;
}
