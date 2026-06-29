import "maplibre-gl/dist/maplibre-gl.css";
import { initLanding } from "./landing";
import { initMap } from "./map";
import { initDropzone } from "./dropzone";

initLanding();
initMap("map");
initDropzone();
