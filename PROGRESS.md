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
- Git HTTP/1.1 retry failed because direct `github.com:443` timed out.
- Confirmed GitHub API access still worked and used the GitHub Git Data API as the push fallback.
- GitHub API push succeeded for remote commit `386f850b1ad1527f3ef7615053957f6fb4e87717`.
- Verified GitHub Actions CI completed successfully for `main`.
- CI emitted a Node.js 20 Actions deprecation annotation despite using Node.js 24 for project setup.
- Added `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` to the workflow environment to opt action runtimes into Node.js 24.
