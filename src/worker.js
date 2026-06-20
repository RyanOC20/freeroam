import { parseArchive } from "./parsers/index";
self.onmessage = async (e) => {
    const { buffer } = e.data;
    try {
        const tracks = await parseArchive(buffer, (done, total) => {
            const msg = { type: "progress", done, total };
            self.postMessage(msg);
        });
        const msg = { type: "done", tracks };
        self.postMessage(msg);
    }
    catch (err) {
        const msg = { type: "error", message: String(err) };
        self.postMessage(msg);
    }
};
