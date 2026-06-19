import { parseArchive } from "./parsers/index";
import type { WorkerMessage, WorkerRequest } from "./types";

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { buffer } = e.data;

  try {
    const tracks = await parseArchive(buffer, (done, total) => {
      const msg: WorkerMessage = { type: "progress", done, total };
      self.postMessage(msg);
    });

    const msg: WorkerMessage = { type: "done", tracks };
    self.postMessage(msg);
  } catch (err) {
    const msg: WorkerMessage = { type: "error", message: String(err) };
    self.postMessage(msg);
  }
};
