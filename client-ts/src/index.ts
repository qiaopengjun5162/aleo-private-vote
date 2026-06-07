import { Account, initThreadPool, ProgramManager } from "@provablehq/sdk/testnet.js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

async function main() {
  await initThreadPool();

  const programPath = resolve("../leo/private_vote/build/main.aleo");
  const program = await readFile(programPath, "utf8");
  const programManager = new ProgramManager("https://api.provable.com/v2");
  const account = new Account(process.env.PRIVATE_KEY ? { privateKey: process.env.PRIVATE_KEY } : undefined);
  programManager.setAccount(account);

  const result = await programManager.run(program, "main", ["3u64", "2u64"], false);
  const outputs = result.getOutputs();

  console.log("Aleo Private Vote dry-run");
  console.log(`Function: private_vote.aleo/main`);
  console.log(`Account:  ${account.address()}`);
  console.log(`Inputs:   3u64 agree, 2u64 disagree`);
  console.log(`Output:   ${outputs[0]}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
