import { gpx } from "@tmcw/togeojson";
import { DOMParser } from "@xmldom/xmldom";
export function parseGpx(xml) {
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    const fc = gpx(doc);
    const points = [];
    for (const feature of fc.features) {
        const { geometry } = feature;
        if (!geometry)
            continue;
        if (geometry.type === "LineString") {
            for (const [lng, lat] of geometry.coordinates) {
                points.push({ lat, lng });
            }
        }
        else if (geometry.type === "MultiLineString") {
            for (const line of geometry.coordinates) {
                for (const [lng, lat] of line) {
                    points.push({ lat, lng });
                }
            }
        }
    }
    return points;
}
