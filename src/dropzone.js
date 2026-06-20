import { addTracks, getMap } from "./map";
import { initFilterUi } from "./filter-ui";
const dropzone = document.getElementById("dropzone");
const dropTarget = document.getElementById("drop-target");
const browseBtn = document.getElementById("browse-btn");
const fileInput = document.getElementById("file-input");
const statusText = document.getElementById("status-text");
const statusBar = document.getElementById("status-bar");
const progressTrack = document.getElementById("status-progress-track");
const progressFill = document.getElementById("status-progress-fill");
let hideTimer = null;
function showStatus(msg, withBar = false) {
    if (hideTimer !== null) {
        clearTimeout(hideTimer);
        hideTimer = null;
    }
    statusText.textContent = msg;
    statusBar.classList.add("visible");
    progressTrack.classList.toggle("active", withBar);
}
function setProgress(done, total) {
    statusText.textContent = `Parsing ${done.toLocaleString()} / ${total.toLocaleString()} activities…`;
    progressFill.style.width = `${Math.round((done / total) * 100)}%`;
}
function hideStatus(delayMs) {
    progressTrack.classList.remove("active");
    progressFill.style.width = "0%";
    hideTimer = setTimeout(() => statusBar.classList.remove("visible"), delayMs);
}
function hideDropzone() {
    dropzone.classList.add("hidden");
}
function flyToPoints(points) {
    if (points.length === 0)
        return;
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (const { lat, lng } of points) {
        if (lat < minLat)
            minLat = lat;
        if (lat > maxLat)
            maxLat = lat;
        if (lng < minLng)
            minLng = lng;
        if (lng > maxLng)
            maxLng = lng;
    }
    getMap().fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 40, duration: 1000 });
}
function handleFile(file) {
    hideDropzone();
    showStatus(`Reading ${file.name}…`, false);
    const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e) => {
        const msg = e.data;
        if (msg.type === "progress") {
            if (msg.total > 0)
                setProgress(msg.done, msg.total);
            return;
        }
        worker.terminate();
        if (msg.type === "error") {
            console.error("Parse Worker error:", msg.message);
            showStatus("Could not read this file. Is it a valid Strava export ZIP?");
            hideStatus(6000);
            return;
        }
        // msg.type === "done"
        const { tracks } = msg;
        if (tracks.length === 0) {
            showStatus("No GPS tracks found in this archive.");
            hideStatus(4000);
            return;
        }
        addTracks(tracks);
        initFilterUi(tracks);
        flyToPoints(tracks.flatMap((t) => t.points));
        const t = tracks.length.toLocaleString();
        showStatus(`${t} track${tracks.length === 1 ? "" : "s"} loaded`);
        hideStatus(5000);
    };
    worker.onerror = (err) => {
        worker.terminate();
        console.error("Worker crashed:", err);
        showStatus("Parse failed — check the console for details.");
        hideStatus(6000);
    };
    // Transfer the ArrayBuffer to the Worker (zero-copy).
    file.arrayBuffer().then((buffer) => {
        showStatus("Parsing…", true);
        worker.postMessage({ buffer }, [buffer]);
    });
}
function onDragOver(e) {
    e.preventDefault();
    dropzone.classList.add("drag-over");
}
function onDragLeave() {
    dropzone.classList.remove("drag-over");
}
function onDrop(e) {
    e.preventDefault();
    dropzone.classList.remove("drag-over");
    const file = e.dataTransfer?.files[0];
    if (file)
        handleFile(file);
}
function onFileChange() {
    const file = fileInput.files?.[0];
    if (file)
        handleFile(file);
}
export function initDropzone() {
    document.addEventListener("dragover", onDragOver);
    document.addEventListener("dragleave", onDragLeave);
    document.addEventListener("drop", onDrop);
    browseBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        fileInput.click();
    });
    fileInput.addEventListener("change", onFileChange);
    dropTarget.addEventListener("click", () => fileInput.click());
}
