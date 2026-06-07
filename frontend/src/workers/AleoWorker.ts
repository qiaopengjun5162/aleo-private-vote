import { type Remote, wrap } from "comlink";
import type { WorkerApi } from "./worker";

let workerApi: Remote<WorkerApi> | null = null;

export function AleoWorker() {
  if (!workerApi) {
    const worker = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module"
    });

    worker.onerror = (event) => {
      console.error(`Aleo worker error: ${event.message}`);
    };

    workerApi = wrap<WorkerApi>(worker);
  }

  return workerApi;
}
