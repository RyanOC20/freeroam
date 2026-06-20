import type { ParsedTrack } from "./types";
import { setVisibleTypes } from "./map";

const TYPE_LABELS: Record<string, string> = {
  AlpineSki:                     "Alpine Ski",
  Badminton:                     "Badminton",
  BackcountrySki:                "Backcountry Ski",
  Canoeing:                      "Canoe",
  Crossfit:                      "CrossFit",
  EBikeRide:                     "E-Bike",
  Elliptical:                    "Elliptical",
  EMountainBikeRide:             "E-MTB",
  Golf:                          "Golf",
  GravelRide:                    "Gravel",
  Handcycle:                     "Handcycle",
  HighIntensityIntervalTraining: "HIIT",
  Hike:                          "Hike",
  IceSkate:                      "Ice Skate",
  InlineSkate:                   "Inline Skate",
  Kayaking:                      "Kayak",
  Kitesurf:                      "Kitesurf",
  MountainBikeRide:              "MTB",
  NordicSki:                     "Nordic Ski",
  Pickleball:                    "Pickleball",
  Pilates:                       "Pilates",
  Racquetball:                   "Racquetball",
  Ride:                          "Ride",
  RockClimbing:                  "Rock Climbing",
  RollerSki:                     "Roller Ski",
  Rowing:                        "Row",
  Run:                           "Run",
  Sail:                          "Sail",
  Skateboard:                    "Skateboard",
  Snowboard:                     "Snowboard",
  Snowshoe:                      "Snowshoe",
  Soccer:                        "Soccer",
  Squash:                        "Squash",
  StairStepper:                  "Stair Stepper",
  StandUpPaddling:               "SUP",
  Surfing:                       "Surf",
  Swim:                          "Swim",
  TableTennis:                   "Table Tennis",
  Tennis:                        "Tennis",
  TrailRun:                      "Trail Run",
  Velomobile:                    "Velomobile",
  VirtualRide:                   "Virtual Ride",
  VirtualRow:                    "Virtual Row",
  VirtualRun:                    "Virtual Run",
  Walk:                          "Walk",
  WeightTraining:                "Weights",
  Wheelchair:                    "Wheelchair",
  Windsurf:                      "Windsurf",
  Workout:                       "Workout",
  Yoga:                          "Yoga"
};

function displayLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}

export function initFilterUi(tracks: ParsedTrack[]): void {
  const dropdown = document.getElementById("filter-dropdown");
  const btn      = document.getElementById("filter-btn")    as HTMLButtonElement | null;
  const panel    = document.getElementById("filter-panel")  as HTMLDivElement    | null;
  const labelEl  = dropdown?.querySelector<HTMLSpanElement>(".filter-label");
  if (!dropdown || !btn || !panel || !labelEl) return;

  // Re-capture after guard so closures see non-nullable types.
  const $btn    = btn;
  const $panel  = panel;
  const $label  = labelEl;

  // Count GPS-bearing tracks per sport type.
  const counts = new Map<string, number>();
  for (const track of tracks) {
    if (track.activityType == null) continue;
    counts.set(track.activityType, (counts.get(track.activityType) ?? 0) + 1);
  }
  if (counts.size === 0) return;

  const types  = [...counts.keys()].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));
  const active = new Set(types);

  // ── Label update ──────────────────────────────────────────────────────────

  function updateLabel(): void {
    if (active.size === types.length) {
      $label.textContent = "All activities";
      return;
    }
    if (active.size === 0) {
      $label.textContent = "No activities";
      return;
    }
    const names = [...active].map(displayLabel);
    $label.textContent =
      names.length <= 2 ? names.join(", ") : `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
  }

  function syncMap(): void {
    setVisibleTypes(active.size === types.length ? null : new Set(active));
  }

  // ── Build panel rows ──────────────────────────────────────────────────────

  panel.innerHTML = "";

  const checkboxes = new Map<string, HTMLInputElement>();

  for (const type of types) {
    const row = document.createElement("label");
    row.className = "filter-row";

    const checkbox = document.createElement("input");
    checkbox.type    = "checkbox";
    checkbox.checked = true;
    checkbox.className = "filter-check";
    checkboxes.set(type, checkbox);

    const name = document.createElement("span");
    name.className   = "filter-row-label";
    name.textContent = displayLabel(type);

    const count = document.createElement("span");
    count.className   = "filter-row-count";
    count.textContent = String(counts.get(type));

    row.append(checkbox, name, count);

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        active.add(type);
      } else {
        // Prevent unchecking the last active type — reset to all instead.
        if (active.size === 1) {
          checkbox.checked = true;
          return;
        }
        active.delete(type);
      }
      updateLabel();
      syncMap();
    });

    $panel.appendChild(row);
  }

  // ── Dropdown toggle ───────────────────────────────────────────────────────

  function closePanel(): void {
    $panel.classList.remove("open");
    $btn.classList.remove("open");
  }

  $btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const opening = !$panel.classList.contains("open");
    $panel.classList.toggle("open", opening);
    $btn.classList.toggle("open", opening);
  });

  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target as Node)) closePanel();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePanel();
  });

  dropdown.classList.add("visible");
}
