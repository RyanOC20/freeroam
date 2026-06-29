import type { LatLng, WorkerMessage } from "./types";
import { addTracks, getMap } from "./map";
import { initFilterUi } from "./filter-ui";

const dropzone   = document.getElementById("dropzone") as HTMLDivElement;
const browseBtn  = document.getElementById("browse") as HTMLButtonElement;
const ctaBtn     = document.getElementById("cta") as HTMLButtonElement;
const navImport  = document.getElementById("navImport") as HTMLButtonElement;
const fileInput  = document.getElementById("file") as HTMLInputElement;
const pzFill     = document.getElementById("pzFill") as HTMLDivElement;
const pzCount    = document.getElementById("pzCount") as HTMLSpanElement;
const statusText = document.getElementById("status-text") as HTMLSpanElement;
const statusBar  = document.getElementById("status-bar") as HTMLDivElement;

let hideTimer: ReturnType<typeof setTimeout> | null = null;

function showStatus(msg: string): void {
  if (hideTimer !== null) { clearTimeout(hideTimer); hideTimer = null; }
  statusText.textContent = msg;
  statusBar.classList.add("visible");
}

function hideStatus(delayMs: number): void {
  hideTimer = setTimeout(() => statusBar.classList.remove("visible"), delayMs);
}

function setProgress(done: number, total: number): void {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  pzFill.style.width = `${pct}%`;
  pzCount.textContent = `${done.toLocaleString()} / ${total.toLocaleString()}`;
}

function showParsingState(): void {
  dropzone.classList.remove("is-done");
  dropzone.classList.add("is-parsing");
  pzFill.style.width = "0%";
  pzCount.textContent = "0 / 0";
}

function showLanding(): void {
  const map = document.getElementById("map")!;
  const landing = document.getElementById("landing")!;
  map.style.display = "block";
  landing.style.display = "none";
  document.body.style.overflow = "hidden";
}

function flyToPoints(points: LatLng[]): void {
  if (points.length === 0) return;
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const { lat, lng } of points) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  getMap().fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 40, duration: 1000 });
}

function handleFile(file: File): void {
  showParsingState();

  const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });

  worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
    const msg = e.data;

    if (msg.type === "progress") {
      if (msg.total > 0) setProgress(msg.done, msg.total);
      return;
    }

    worker.terminate();

    if (msg.type === "error") {
      console.error("Parse Worker error:", msg.message);
      dropzone.classList.remove("is-parsing");
      showStatus("Could not read this file. Is it a valid Strava export ZIP?");
      hideStatus(6000);
      return;
    }

    // msg.type === "done"
    const { tracks } = msg;

    if (tracks.length === 0) {
      dropzone.classList.remove("is-parsing");
      showStatus("No GPS tracks found in this archive.");
      hideStatus(4000);
      return;
    }

    addTracks(tracks);
    initFilterUi(tracks);
    flyToPoints(tracks.flatMap((t) => t.points));

    showLanding();

    const t = tracks.length.toLocaleString();
    showStatus(`${t} track${tracks.length === 1 ? "" : "s"} loaded`);
    hideStatus(5000);
  };

  worker.onerror = (err) => {
    worker.terminate();
    console.error("Worker crashed:", err);
    dropzone.classList.remove("is-parsing");
    showStatus("Parse failed — check the console for details.");
    hideStatus(6000);
  };

  file.arrayBuffer().then((buffer) => {
    worker.postMessage({ buffer }, [buffer]);
  });
}

let dragDepth = 0;

function onDragEnter(e: DragEvent): void {
  e.preventDefault();
  dragDepth++;
  dropzone.classList.add("drag");
}

function onDragOver(e: DragEvent): void {
  e.preventDefault();
}

function onDragLeave(e: DragEvent): void {
  e.preventDefault();
  dragDepth = Math.max(0, dragDepth - 1);
  if (!dragDepth) dropzone.classList.remove("drag");
}

function onDrop(e: DragEvent): void {
  e.preventDefault();
  dragDepth = 0;
  dropzone.classList.remove("drag");
  const file = e.dataTransfer?.files[0];
  if (file) handleFile(file);
}

function onFileChange(): void {
  const file = fileInput.files?.[0];
  if (file) handleFile(file);
}

function openPicker(): void {
  fileInput.click();
}

export function initDropzone(): void {
  document.addEventListener("dragenter", onDragEnter);
  document.addEventListener("dragover", onDragOver);
  document.addEventListener("dragleave", onDragLeave);
  document.addEventListener("drop", onDrop);

  browseBtn.addEventListener("click", openPicker);
  ctaBtn.addEventListener("click", openPicker);
  navImport.addEventListener("click", () => { window.scrollTo(0, 0); openPicker(); });
  fileInput.addEventListener("change", onFileChange);
}
