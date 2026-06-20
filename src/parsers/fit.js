import FitParser from "fit-file-parser";
export function parseFit(bytes) {
    return new Promise((resolve) => {
        // Validate the FIT header before invoking the parser. A bad magic string
        // means this isn't a FIT file at all; feeding it to the binary parser can
        // cause the internal while-loop to run for an extremely long time.
        const view = new Uint8Array(bytes);
        if (view.length < 12) {
            resolve([]);
            return;
        }
        const magic = String.fromCharCode(view[8], view[9], view[10], view[11]);
        if (magic !== ".FIT") {
            resolve([]);
            return;
        }
        try {
            const parser = new FitParser({ force: true, mode: "list" });
            parser.parse(bytes, (error, data) => {
                try {
                    if (error || !data?.records) {
                        resolve([]);
                        return;
                    }
                    const points = [];
                    for (const record of data.records) {
                        // fit-file-parser multiplies sint32 position fields by 180/2^31,
                        // so position_lat / position_long arrive in degrees already.
                        if (record.position_lat != null && record.position_long != null) {
                            points.push({ lat: record.position_lat, lng: record.position_long });
                        }
                    }
                    resolve(points);
                }
                catch {
                    resolve([]);
                }
            });
        }
        catch {
            resolve([]);
        }
    });
}
