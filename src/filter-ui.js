import { setVisibleTypes } from "./map";
const TYPE_LABELS = {
    AlpineSki: "Alpine Ski",
    BackcountrySki: "Backcountry Ski",
    Canoeing: "Canoe",
    EBikeRide: "E-Bike",
    GravelRide: "Gravel",
    Hike: "Hike",
    Kayaking: "Kayak",
    MountainBikeRide: "MTB",
    NordicSki: "Nordic Ski",
    Ride: "Ride",
    Rowing: "Row",
    Run: "Run",
    Snowboard: "Snowboard",
    StandUpPaddling: "SUP",
    Swim: "Swim",
    TrailRun: "Trail Run",
    VirtualRide: "Virtual Ride",
    VirtualRun: "Virtual Run",
    Walk: "Walk",
    WeightTraining: "Weights",
    Workout: "Workout",
    Yoga: "Yoga",
};
function displayLabel(type) {
    return TYPE_LABELS[type] ?? type;
}
export function initFilterUi(tracks) {
    const bar = document.getElementById("filter-bar");
    if (!bar)
        return;
    // Count GPS-bearing tracks per sport type.
    const counts = new Map();
    for (const track of tracks) {
        if (track.activityType == null)
            continue;
        counts.set(track.activityType, (counts.get(track.activityType) ?? 0) + 1);
    }
    // No type data available — nothing useful to show.
    if (counts.size === 0)
        return;
    // Sort by descending count so most-used types come first.
    const types = [...counts.keys()].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));
    const active = new Set(types);
    bar.innerHTML = "";
    function syncMap() {
        setVisibleTypes(active.size === types.length ? null : new Set(active));
    }
    for (const type of types) {
        const chip = document.createElement("button");
        chip.className = "filter-chip active";
        const labelEl = document.createElement("span");
        labelEl.textContent = displayLabel(type);
        const countEl = document.createElement("span");
        countEl.className = "chip-count";
        countEl.textContent = String(counts.get(type));
        chip.append(labelEl, countEl);
        chip.addEventListener("click", () => {
            if (active.has(type)) {
                // Don't allow deactivating the last chip — reset to all instead.
                if (active.size === 1) {
                    for (const t of types)
                        active.add(t);
                    bar.querySelectorAll(".filter-chip").forEach((c) => c.classList.add("active"));
                    setVisibleTypes(null);
                    return;
                }
                active.delete(type);
                chip.classList.remove("active");
            }
            else {
                active.add(type);
                chip.classList.add("active");
            }
            syncMap();
        });
        bar.appendChild(chip);
    }
    bar.classList.add("visible");
}
