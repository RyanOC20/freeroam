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
