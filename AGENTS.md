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
- `frontend`: Next.js + React DApp interface with shadcn/ui-style components

## Commands

- `just leo-test`: run Leo tests
- `just backend-dev`: start the backend API
- `just frontend-dev`: start the frontend
- `just client-dry-run`: run the TypeScript SDK dry-run script
- `just rust-dry-run`: run the Rust snarkVM client against local `build/main.aleo`
- `just rust-execute-testnet`: broadcast `main 3u64 2u64` through the Rust snarkVM client
- `pnpm --filter @aleo-private-vote/backend test`: run backend Vitest API tests
- `pnpm --filter @aleo-private-vote/frontend test`: run frontend Vitest helper tests
- `just deploy-testnet`: deploy the current Leo program to testnet with `PRIVATE_KEY`
- `just execute-testnet`: execute `private_vote.aleo/main` on testnet with `PRIVATE_KEY`
- `pnpm --filter @aleo-private-vote/frontend build`: run a Next.js production build
- `pnpm --filter @aleo-private-vote/backend start`: compile and start the API on `127.0.0.1:8787`

## Notes

- After every code or configuration change, update the relevant docs in the same change set.
- Record what changed, what broke, and how it was fixed in `PROGRESS.md` before committing.
- Each completed change set should be committed and pushed to GitHub.
- When GitHub network access fails, retry with the local proxy `127.0.0.1:7890`; sandboxed commands may not reach it, so use approved escalation for GitHub checks when needed.
- Use Node.js instead of Bun for `@provablehq/sdk` because Bun can hang during WASM thread-pool initialization.
- Keep real testnet execution optional so the MVP remains demonstrable without faucet balance or network availability.
- `client-ts` reads `leo/private_vote/build/main.aleo`; run `just leo-test` or `cd leo/private_vote && leo build` before SDK dry-runs.
- `client-ts` and `backend` compile TypeScript before running Node because `tsx` can fail to create IPC sockets in this sandbox.
- The frontend uses Next.js App Router, React, Tailwind CSS, and local shadcn/ui-style components.
- Next serves `public/programs/private_vote.aleo`; refresh it from `leo/private_vote/build/main.aleo` after Leo program changes.
- The browser SDK still runs inside a Web Worker; keep COOP/COEP headers in `next.config.ts` for SharedArrayBuffer support.
- Use `next build --webpack` because Next 16 Turbopack tries to bind a local port in this sandbox and fails with `Operation not permitted`.
- Start the backend before the frontend for full-stack demos. If the API is unavailable, the frontend intentionally falls back to local demo mode.
- Before running `just deploy-testnet`, confirm the Leo `program ...` id is unique on testnet; `private_vote.aleo` may need to be renamed for a real deployment.
- `private_vote.aleo` is now deployed on testnet. Deployment tx: `at18jhvcs9gnjwhnqhzgu6sl5mkuyqc9vgt8h5et8sxh98udyg70vpqdyg87a`.
- With the current local `leo 4.0.2`, testnet deploy needed explicit `--consensus-version 14`; automatic consensus-version detection failed against `https://api.explorer.provable.com/v1` in this environment.
- Leo commands run under a directory tree containing `.env` can print loaded env values. Use a temp copy without `.env` or sanitize logs before sharing.
- `client-rust` dry-run can run without `PRIVATE_KEY`; testnet broadcast must use a funded testnet key from `.env`.
- Use Vitest instead of Jest for fast TypeScript unit coverage; it keeps tests lightweight while Next handles production builds.
- Keep comments focused on WHY a design exists. Avoid comments that simply restate the line of code.
