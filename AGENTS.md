# AGENTS.md

## Project

- Project name: Aleo Private Vote
- Repository name: `aleo-private-vote`
- Leo program: `private_vote.aleo`

## Architecture

- `leo/private_vote`: Leo voting program based on `ProvableHQ/leo-examples/vote`
- `client-ts`: TypeScript SDK path for local dry-run and optional testnet execution
- `client-rust`: Rust snarkVM client based on the local `hello/client-rust` project
- `backend`: Lightweight API for proposals and demo verification reports
- `frontend`: DApp interface for private voting and public tally reports

## Commands

- `just leo-test`: run Leo tests
- `just backend-dev`: start the backend API
- `just frontend-dev`: start the frontend
- `just client-dry-run`: run the TypeScript SDK dry-run script
- `just rust-dry-run`: run the Rust snarkVM client against local `build/main.aleo`
- `just rust-execute-testnet`: broadcast `main 3u64 2u64` through the Rust snarkVM client
- `just deploy-testnet`: deploy the current Leo program to testnet with `PRIVATE_KEY`
- `just execute-testnet`: execute `private_vote.aleo/main` on testnet with `PRIVATE_KEY`
- `pnpm --filter @aleo-private-vote/frontend build`: type-check and build the DApp
- `pnpm --filter @aleo-private-vote/backend start`: compile and start the API on `127.0.0.1:8787`

## Notes

- After every code or configuration change, update the relevant docs in the same change set.
- Record what changed, what broke, and how it was fixed in `PROGRESS.md` before committing.
- Each completed change set should be committed and pushed to GitHub.
- Use Node.js instead of Bun for `@provablehq/sdk` because Bun can hang during WASM thread-pool initialization.
- Keep real testnet execution optional so the MVP remains demonstrable without faucet balance or network availability.
- `client-ts` reads `leo/private_vote/build/main.aleo`; run `just leo-test` or `cd leo/private_vote && leo build` before SDK dry-runs.
- `client-ts` and `backend` compile TypeScript before running Node because `tsx` can fail to create IPC sockets in this sandbox.
- The frontend mirrors the official React + Leo scaffold: load `build/main.aleo?raw`, run SDK code in a Web Worker, and keep `_headers` for COOP/COEP.
- Vite worker output must stay `format: "es"` because `@provablehq/sdk` uses top-level await in browser worker bundles.
- Start the backend before the frontend for full-stack demos. If the API is unavailable, the frontend intentionally falls back to local demo mode.
- Before running `just deploy-testnet`, confirm the Leo `program ...` id is unique on testnet; `private_vote.aleo` may need to be renamed for a real deployment.
- `client-rust` dry-run can run without `PRIVATE_KEY`; testnet broadcast must use a funded testnet key from `.env`.
