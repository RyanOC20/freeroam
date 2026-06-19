import FitParser from "fit-file-parser";
import type { LatLng } from "../types";

export function parseFit(bytes: ArrayBuffer): Promise<LatLng[]> {
  return new Promise((resolve) => {
    const parser = new FitParser({ force: true, mode: "list" });

    parser.parse(bytes, (error, data) => {
      if (error || !data.records) {
        resolve([]);
        return;
      }

      const points: LatLng[] = [];
      for (const record of data.records) {
        // fit-file-parser converts sint32 fields (including position_lat/long)
        // by multiplying by 180/2^31, so values arrive in degrees already.
        if (record.position_lat != null && record.position_long != null) {
          points.push({ lat: record.position_lat, lng: record.position_long });
        }
      }

      resolve(points);
    });
  });
}
