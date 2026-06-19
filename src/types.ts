export interface LatLng {
  lat: number;
  lng: number;
}

export interface ParsedTrack {
  points: LatLng[];
  activityId?: string;
  activityType?: string;
  name?: string;
}

// Messages sent from the main thread into the parse Worker.
export interface WorkerRequest {
  buffer: ArrayBuffer;
}

// Messages sent from the parse Worker back to the main thread.
export type WorkerMessage =
  | { type: "progress"; done: number; total: number }
  | { type: "done"; tracks: ParsedTrack[] }
  | { type: "error"; message: string };
