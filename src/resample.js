const EARTH_RADIUS_M = 6_371_000;
function toRad(deg) {
    return (deg * Math.PI) / 180;
}
function haversineMeters(a, b) {
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const s = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(s));
}
function lerp(a, b, t) {
    return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
}
/**
 * Resample a GPS track so consecutive points are at most `spacingMeters` apart.
 * Segments shorter than the spacing are kept as-is; longer segments get
 * intermediate points interpolated at uniform intervals along the straight line.
 * This normalises point density across activities so the heatmap reflects
 * frequency of travel rather than GPS sample rate.
 */
export function resample(points, spacingMeters = 25) {
    if (points.length < 2)
        return [...points];
    const out = [points[0]];
    for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];
        const dist = haversineMeters(a, b);
        if (dist <= spacingMeters) {
            out.push(b);
        }
        else {
            const steps = Math.ceil(dist / spacingMeters);
            for (let s = 1; s <= steps; s++) {
                out.push(lerp(a, b, s / steps));
            }
        }
    }
    return out;
}
