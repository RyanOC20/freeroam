import type { LatLng } from "./types";
import { parseArchive } from "./parsers/index";
import { addHeatmapPoints, getMap } from "./map";

const dropzone = document.getElementById("dropzone") as HTMLDivElement;
const dropTarget = document.getElementById("drop-target") as HTMLDivElement;
const browseBtn = document.getElementById("browse-btn") as HTMLButtonElement;
const fileInput = document.getElementById("file-input") as HTMLInputElement;
const statusBar = document.getElementById("status-bar") as HTMLDivElement;

function showStatus(msg: string): void {
  statusBar.textContent = msg;
  statusBar.classList.add("visible");
}

function hideStatus(): void {
  statusBar.classList.remove("visible");
}

function hideDropzone(): void {
  dropzone.classList.add("hidden");
}

function flyToPoints(points: LatLng[]): void {
  if (points.length === 0) return;

  const lngs = points.map((p) => p.lng);
  const lats = points.map((p) => p.lat);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  getMap().fitBounds(
    [
      [minLng, minLat],
      [maxLng, maxLat],
    ],
    { padding: 40, duration: 1000 }
  );
}

async function handleFile(file: File): Promise<void> {
  hideDropzone();
  showStatus(`Processing ${file.name}…`);

  try {
    const tracks = await parseArchive(file);
    const allPoints = tracks.flatMap((t) => t.points);

    if (allPoints.length === 0) {
      showStatus("No GPS tracks found in this archive.");
      setTimeout(hideStatus, 4000);
      return;
    }

    addHeatmapPoints(allPoints);
    flyToPoints(allPoints);

    showStatus(
      `${allPoints.toLocaleString()} points from ${tracks.length} track${tracks.length === 1 ? "" : "s"}`
    );
    setTimeout(hideStatus, 5000);
  } catch (err) {
    console.error("Parse error:", err);
    showStatus("Could not read this file. Is it a valid Strava export ZIP?");
    setTimeout(hideStatus, 6000);
  }
}

function onDragOver(e: DragEvent): void {
  e.preventDefault();
  dropzone.classList.add("drag-over");
}

function onDragLeave(): void {
  dropzone.classList.remove("drag-over");
}

function onDrop(e: DragEvent): void {
  e.preventDefault();
  dropzone.classList.remove("drag-over");
  const file = e.dataTransfer?.files[0];
  if (file) void handleFile(file);
}

function onFileChange(): void {
  const file = fileInput.files?.[0];
  if (file) void handleFile(file);
}

export function initDropzone(): void {
  document.addEventListener("dragover", onDragOver);
  document.addEventListener("dragleave", onDragLeave);
  document.addEventListener("drop", onDrop);

  browseBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  fileInput.addEventListener("change", onFileChange);

  // Clicking the drop target also opens the picker.
  dropTarget.addEventListener("click", () => fileInput.click());
}
