import { Account, initThreadPool, ProgramManager } from "@provablehq/sdk/testnet.js";
import { expose } from "comlink";

let initialized = false;

async function ensureThreadPool() {
  if (!initialized) {
    await initThreadPool();
    initialized = true;
  }
}

async function localProgramExecution(program: string, functionName: string, inputs: string[]) {
  await ensureThreadPool();

  const programManager = new ProgramManager();
  programManager.setAccount(new Account());

  const executionResponse = await programManager.run(program, functionName, inputs, false);
  return executionResponse.getOutputs();
}

export type WorkerApi = {
  localProgramExecution: typeof localProgramExecution;
};

const workerApi: WorkerApi = {
  localProgramExecution
};

expose(workerApi);
