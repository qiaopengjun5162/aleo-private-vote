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

- Treat this as a production-grade product, not a disposable demo or Bootcamp-only submission.
- Prefer real, verifiable wallet/testnet/backend behavior over presentation-only UI.
- Keep local demo fallbacks visibly labeled and do not let them masquerade as completed on-chain flows.
- Proposal creation and closing are in-memory demo flows unless a real persisted backend or on-chain proposal path is explicitly added.
- The current frontend vote type is binary agree/disagree per issued demo ticket. The browser workspace blocks the same connected wallet from voting twice on the same proposal locally, but this is not an on-chain nullifier or durable backend guarantee.
- Do not imply candidate voting, weighted voting, or chain-enforced one-wallet-one-vote until those mechanics are implemented.
- Review and refactor code for correctness, error handling, maintainability, and security as part of normal delivery.
- After every code or configuration change, update the relevant docs in the same change set.
- Keep `README.md` structured like an independent open-source project: overview, features, quick start, installation, usage, requirements, project structure, contributing, contributors, and license.
- Preserve the all-contributors badge/list markers in `README.md` and keep `.all-contributorsrc` in sync with the Contributors section.
- Record what changed, what broke, and how it was fixed in `PROGRESS.md` before committing.
- Each completed change set should be committed and pushed to GitHub.
- When GitHub network access fails, retry with the local proxy `127.0.0.1:7890`; sandboxed commands may not reach it, so use approved escalation for GitHub checks when needed.
- Use Node.js instead of Bun for `@provablehq/sdk` because Bun can hang during WASM thread-pool initialization.
- Keep real testnet execution optional so the MVP remains demonstrable without faucet balance or network availability.
- `client-ts` reads `leo/private_vote/build/main.aleo`; run `just leo-test` or `cd leo/private_vote && leo build` before SDK dry-runs.
- `client-ts` and `backend` compile TypeScript before running Node because `tsx` can fail to create IPC sockets in this sandbox.
- The frontend uses Next.js App Router, React, Tailwind CSS, and local shadcn/ui-style components.
- Wallet integration uses official `@provablehq/aleo-wallet-adaptor-*` core/adapters with a custom React 19-compatible selector instead of the official React UI package, whose peer range is React 18.
- The wallet adapter packages come from `ProvableHQ/aleo-dev-toolkit`; prefer those official packages for extension-wallet execution before considering custom wallet code.
- Dynamic embedded wallet support is optional and gated by `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID`; the unified wallet modal may show it as disabled, but do not document it as enabled unless a real Dynamic environment is configured.
- Current browser voting execution still uses the external wallet adapter `executeTransaction()` path. Do not claim Dynamic embedded wallet execution is wired until `proveTransaction()` is validated with a real environment and testnet account.
- Wallet execution UI should show the program, function, inputs, network, public fee, and execution status before asking the user to approve a transaction.
- Wallet ownership proof uses the selected official adapter's `signMessage()` API and local `Signature.verify(Address, message)` before showing the proof as verified.
- Treat the value returned by `executeTransaction()` as a wallet execution id first; resolve the on-chain `transactionId` through `transactionStatus()` before using Explorer or testnet API checks.
- External wallet connections request `WalletDecryptPermission.OnChainHistory` for `private_vote.aleo`; use `requestTransactionHistory(programId)` for wallet-scoped history and keep explorer/API checks as the on-chain acceptance signal.
- Wallet transaction status checks use the frontend route `/api/testnet/transactions/[txId]`, which proxies `https://api.provable.com/v2/testnet/transaction/{txId}` by default and can be pointed elsewhere with `ALEO_TESTNET_API_URL`.
- Wallet, signature, history, broadcast, and testnet-status failures should use `createRecoveryNotice()` and the shared recovery panel instead of raw unclassified messages.
- Next serves `public/programs/private_vote.aleo`; refresh it from `leo/private_vote/build/main.aleo` after Leo program changes.
- The browser SDK still runs inside a Web Worker; keep COOP/COEP headers in `next.config.ts` for SharedArrayBuffer support.
- Use `next build --webpack` because Next 16 Turbopack tries to bind a local port in this sandbox and fails with `Operation not permitted`.
- `pnpm --filter @aleo-private-vote/frontend typecheck` reads `.next/types`; run `pnpm --filter @aleo-private-vote/frontend build` first if those generated files are missing.
- Vercel production deploys must run from `frontend/` with the linked project. Deploying from the repository root can fail because the root `package.json` does not declare `next`.
- Start the backend before the frontend for full-stack demos. If the API is unavailable, the frontend intentionally falls back to local demo mode.
- In local demo mode, the frontend persists proposals, the current ticket, latest report, local wallet vote locks, and the last wallet execution id in `localStorage` under `aleo-private-vote.session.v1`.
- Vercel project SSO deployment protection must stay disabled for the public `aleo-private-vote.vercel.app` demo; if the live URL redirects to Vercel Login, check `vercel project protection aleo-private-vote --format json --scope qiaopengjuns-projects`.
- Before running `just deploy-testnet`, confirm the Leo `program ...` id is unique on testnet; `private_vote.aleo` may need to be renamed for a real deployment.
- `private_vote.aleo` is now deployed on testnet. Deployment tx: `at18jhvcs9gnjwhnqhzgu6sl5mkuyqc9vgt8h5et8sxh98udyg70vpqdyg87a`.
- With the current local `leo 4.0.2`, testnet deploy needed explicit `--consensus-version 14`; automatic consensus-version detection failed against `https://api.explorer.provable.com/v1` in this environment.
- Leo commands run under a directory tree containing `.env` can print loaded env values. Use a temp copy without `.env` or sanitize logs before sharing.
- `client-rust` dry-run can run without `PRIVATE_KEY`; testnet broadcast must use a funded testnet key from `.env`.
- Use Vitest instead of Jest for fast TypeScript unit coverage; it keeps tests lightweight while Next handles production builds.
- Keep comments focused on WHY a design exists. Avoid comments that simply restate the line of code.
