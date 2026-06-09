# Progress

## 2026-06-07

- Chose `Aleo Private Vote` as the Boot Camp MVP project.
- Created the `aleo-private-vote` workspace.
- Added the initial `private_vote.aleo` Leo program.
- Planned four project layers: Leo, TypeScript SDK client, backend API, and frontend DApp.
- Verified `just leo-test`: 3 / 3 Leo tests passed.
- Verified TypeScript type checks for backend, frontend, and client-ts.
- Verified `just client-dry-run` with network access for Aleo SDK parameters.
- Verified frontend production build with Vite.
- Started the frontend locally at `http://127.0.0.1:5173/`.
- Read the official SDK overview and `ProvableHQ/sdk` sources supplied by the user.
- Added the browser Aleo Worker plan based on the official React + Leo scaffold.
- Added browser SDK execution through a Vite Web Worker with ES module output.
- Added backend `POST /api/tickets` and `POST /api/reports` integration.
- Wired the frontend to load proposals, issue tickets, submit reports, and fall back to local demo mode when the backend is unavailable.
- Replaced sandbox-fragile backend `tsx` startup with `tsc` + `node dist/server.js`.
- Verified backend smoke test with `/health`, `/api/proposals`, `/api/tickets`, and `/api/reports`.
- Updated CI and `just check` to include TypeScript builds.
- Verified `just check`: Leo tests, backend build, frontend build, and client-ts build passed.
- Verified `just client-dry-run`: SDK offline execution returned `true`.
- Added optional `just deploy-testnet` and `just execute-testnet` commands for Task 4.
- Added `client-rust` based on the working local `hello/client-rust` snarkVM pattern.
- Verified `cargo check` for `client-rust`.
- Verified `just rust-dry-run`: local snarkVM execution returned `true`.
- Verified backend runtime smoke test: `/health`, `/api/proposals`, `/api/tickets`, and `/api/reports` all returned expected data.
- Verified frontend runtime smoke test: Vite served the DApp HTML with HTTP 200.
- Verified both clients after integration: `just client-dry-run` and `just rust-dry-run` returned `true`.

## Next

- Add demo screenshots after the app runs locally.
- Choose or rename to a unique testnet program id before running `just deploy-testnet`.
- Record the final testnet program ID, interaction transaction, and Explorer screenshot for Task 4.

## 2026-06-08

- Ran pre-commit validation.
- Verified `cargo fmt --manifest-path client-rust/Cargo.toml -- --check`.
- Verified `git diff --check`.
- Verified `just check`: Leo tests, backend build, frontend build, client-ts build, and client-rust check passed.
- Verified `just client-dry-run`: TypeScript SDK dry-run returned `true`.
- Verified `just rust-dry-run`: Rust snarkVM dry-run returned `true`.
- Confirmed the repository had no commits and no GitHub remote yet.
- Added the project rule that every change must update related docs, record issues and fixes, then commit and push.
- Created the GitHub repository `qiaopengjun5162/aleo-private-vote`.
- First push attempt failed with `Error in the HTTP2 framing layer`.
- Local proxy retry failed because `127.0.0.1:7897` was not listening.
- Later confirmed the active local GitHub proxy is `127.0.0.1:7890`; sandboxed commands may not see it, but escalated `curl -x http://127.0.0.1:7890 https://api.github.com/rate_limit` succeeds.
- Git HTTP/1.1 retry failed because direct `github.com:443` timed out.
- Confirmed GitHub API access still worked and used the GitHub Git Data API as the push fallback.
- GitHub API push succeeded for remote commit `386f850b1ad1527f3ef7615053957f6fb4e87717`.
- Verified GitHub Actions CI completed successfully for `main`.
- CI emitted a Node.js 20 Actions deprecation annotation despite using Node.js 24 for project setup.
- Added `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` to the workflow environment to opt action runtimes into Node.js 24.

## 2026-06-08 Testing and Logic Documentation

- Clarified the voting logic in `README.md` and `README_zh.md`.
- Refactored the backend into `buildServer()` so API routes can be tested without opening a network port.
- Added Vitest backend tests for proposals, ticket issuance, report submission, and malformed report validation.
- Extracted frontend vote math into `voteFlow.ts` and added Vitest helper tests.
- Added design-focused comments for the lightweight Leo demo verifier and in-memory Bootcamp store.
- Updated `just check` and GitHub Actions CI to run backend and frontend Vitest tests.
- Chose Vitest over Jest because this workspace is Vite-based and Vitest integrates with the same TypeScript/Vite toolchain.
- Verified `cargo fmt --manifest-path client-rust/Cargo.toml -- --check`.
- Verified `git diff --check`.
- Verified `just check`: Leo tests, backend Vitest tests, frontend Vitest tests, builds, and Rust `cargo check` passed.
- Verified `just client-dry-run` and `just rust-dry-run`: both returned `true`.

## 2026-06-08 Next.js and shadcn/ui Migration

- Migrated the frontend from Vite to Next.js App Router while keeping React and the existing Aleo SDK Web Worker path.
- Added Tailwind CSS, shadcn/ui-style local components, `components.json`, and shared `cn()` utility.
- Replaced the Vite `?raw` Aleo program import with `frontend/public/programs/private_vote.aleo`.
- Replaced `VITE_API_URL` with `NEXT_PUBLIC_API_URL`.
- Added `next.config.ts` headers for COOP / COEP because the browser SDK still needs SharedArrayBuffer support.
- Allowed `sharp` in `pnpm-workspace.yaml`; Next.js installs it as a build/image dependency and pnpm blocks build scripts unless explicitly allowed.
- Next 16 Turbopack failed in this sandbox with `Operation not permitted` while trying to bind a local port during CSS processing.
- Switched frontend build/dev scripts to `next build --webpack` and `next dev --webpack`.
- Added webpack `topLevelAwait` and `asyncFunction` output support for the Aleo browser SDK bundle; this removed the Next build warning about SDK top-level await.
- Fixed local duplicate backend Vitest runs by excluding `dist/**` from backend Vitest and excluding test files from backend `tsc` output.
- Verified `just check`: Leo tests, backend Vitest tests, frontend Vitest tests, Next production build, client-ts build, and Rust `cargo check` passed.
- Verified Next production smoke test at `http://127.0.0.1:3000/` with COOP / COEP headers.
- Verified `frontend/public/programs/private_vote.aleo` matches `leo/private_vote/build/main.aleo`.
- Verified `just client-dry-run` and `just rust-dry-run`: both returned `true`.

## 2026-06-09 Testnet Deployment

- Copied the funded testnet `.env` from the local `hello` project into this project root; `.env` is gitignored.
- Confirmed `private_vote.aleo` was not already deployed before broadcasting.
- Verified a clean Leo project copy without `.env`: `leo test` passed 3 / 3 tests.
- Deployed `private_vote.aleo` to Aleo testnet with `leo 4.0.2`, explicit `--consensus-version 14`, and public fee payment.
- Deployment transaction: `at18jhvcs9gnjwhnqhzgu6sl5mkuyqc9vgt8h5et8sxh98udyg70vpqdyg87a`.
- Fee transaction: `at1uwugmx0jhup86mhvv0xchw85jfwzyn28c2qhwzp9948l5ungzgrsrpj07y`.
- Verified the program can be fetched from `https://api.provable.com/v2/testnet/program/private_vote.aleo`.
- Noted that running Leo commands inside a directory tree containing `.env` can print environment values; use a no-`.env` temp copy or sanitized logs for future verification.
- Executed `private_vote.aleo/main` on testnet with inputs `3u64 2u64`.
- Interaction transaction: `at1pwcdsarry997563mt69tg45a8ur72mr88l609jvz2peh38emsgrqsp83se`.
- Interaction fee transaction: `at1emyt5a88hx6gl2rfzrz096z443suwsahrdhfl4p27kxtx5mw6g9sq469ce`.
- Confirmed the interaction transaction was accepted and returned local plaintext output `true`; the public API shows the private boolean output as ciphertext.
- Captured the Explorer interaction screenshot at `screenshots/testnet-interaction.png`.
- Added `TASK4_SUBMISSION.md` with the deployment transaction, interaction transaction, explorer links, and screenshot path.
