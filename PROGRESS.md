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

## 2026-06-09 Contribution Guide

- Added `CONTRIBUTING.md` with project scope, setup commands, testnet safety notes, change guidelines, and a PR checklist.
- Documented that testnet logs must be sanitized because Leo can print `.env` values.

## 2026-06-09 README Badges

- Added README badges for Leo 4.0.2, Rust 1.96.0, Node.js 24.15.0, Next.js 16.2.7, and MIT license.

## 2026-06-09 README Project Positioning

- Reworked `README.md` and `README_zh.md` to present Aleo Private Vote as an independent project instead of a Bootcamp task submission.
- Renamed Task-oriented sections to project and testnet deployment sections.

## 2026-06-09 License

- Added the MIT `LICENSE` file.
- Added License sections to `README.md` and `README_zh.md`.

## 2026-06-09 Vercel Deployment

- Deployed the Next.js frontend to Vercel production.
- Renamed the Vercel project to `aleo-private-vote`.
- Added the production alias `https://aleo-private-vote.vercel.app`.
- Added the live demo URL to `README.md` and `README_zh.md`.
- Added `.vercel/` to `.gitignore` so local Vercel project metadata stays out of git.

## 2026-06-09 README Contributors

- Added `.all-contributorsrc` based on the `qiaopengjun5162/gogen` README contributor setup.
- Added the all-contributors badge and Contributors table to `README.md`.
- Added README links for Chinese documentation and contribution guidelines.

## 2026-06-09 Leo Wallet Connection

- Added the first frontend wallet provider and connected address display.
- Added a wallet connect button and connected address display to the main DApp header.
- Required a connected wallet before issuing a ticket or casting a vote.
- Updated README documentation to describe the wallet-first DApp flow.

## 2026-06-09 Wallet Execution Path

- Added wallet execution support for `private_vote.aleo/main`.
- Changed the vote flow to run the local SDK check first, then request a wallet-approved testnet execution.
- Display the returned wallet execution transaction id with a Provable Explorer link.
- Added a compact three-step status strip so users can see the required flow at a glance.
- Documented the current limitation that browser voting still uses the lightweight verifier, not the full record-based flow.

## 2026-06-09 Official Wallet Adapter Migration

- Migrated the frontend wallet integration to the official Aleo wallet adapter packages from the docs.
- Replaced the old Demox Leo-only adapter with `@provablehq/aleo-wallet-adaptor-*`.
- Added support for Leo, Shield, Puzzle, and Fox wallet adapters.
- Switched wallet execution calls to the official `executeTransaction()` API.
- Kept a custom React 19-compatible provider/button because the official React UI package currently peers React 18.
- Reframed README limitations as a production roadmap covering record-based voting, chain state, backend persistence, transaction tracking, recovery paths, and E2E tests.

## 2026-06-09 Production Quality Bar

- Updated `CONTRIBUTING.md` to define a production-grade quality bar instead of positioning the project as a Bootcamp MVP.
- Added project guidance to keep wallet, backend, local demo, and on-chain state honest and user-verifiable.
- Added review/refactor expectations for correctness, security, maintainability, explicit failure states, and focused tests.

## 2026-06-09 Wallet Selector Customization

- Kept official `@provablehq/aleo-wallet-adaptor-*` packages for wallet detection, connection, and transaction execution.
- Added a React 19-compatible custom wallet selector that always shows Leo, Shield, Puzzle, and Fox Wallet before browser extension detection finishes.
- Split wallet options into clear connect/install states so the DApp no longer looks empty when no wallet extension is detected.
- Added Vitest coverage for wallet option merging and readiness handling.
- Added `.vercelignore` after Vercel attempted to upload local dependency and build caches from the monorepo root.
- Redeployed the frontend from `frontend/` after the root deployment failed to detect Next.js in the workspace shell package.
- Vercel deployment `dpl_3Ye6CzELo3sNqqHPzBUwLX2w7naC` is Ready and `aleo-private-vote.vercel.app` points to `aleo-private-vote-fifcobpoj-qiaopengjuns-projects.vercel.app`.

## 2026-06-09 Wallet Execute Guide Follow-up

- Attempted to read the official Aleo wallet adapter execute guide, but `docs.aleo.org` returned a Cloudflare challenge in this environment.
- Cross-checked the installed official `@provablehq/aleo-types` README and wallet adapter sources for `TransactionOptions` and `executeTransaction()` behavior.
- Added a wallet execution request panel that displays program id, function, inputs, testnet network, public fee, and execution state before and after wallet approval.
- Tracked execution states as local Aleo check, wallet approval, submitted, and failed so users can see where the flow is blocked.
- Vercel deployment `dpl_Dz2J1ckT9neUgZacVz4o8afmQWK2` is Ready and `aleo-private-vote.vercel.app` points to `aleo-private-vote-a1oma71js-qiaopengjuns-projects.vercel.app`.

## 2026-06-09 Optional Embedded Wallet Support

- Added optional Dynamic embedded Aleo wallet provider and button components.
- Gated the embedded wallet UI behind `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` so production does not show a non-functional wallet path by default.
- Kept the current vote execution path on the official external wallet adapter `executeTransaction()` flow.
- Documented that `ProvableHQ/aleo-dev-toolkit` is the source repository for the official Aleo wallet adapter packages used by the frontend.
- Documented the future requirement to validate Dynamic embedded wallet proving and broadcasting with a real Dynamic environment before wiring it into voting execution.
- Vercel deployment `dpl_2ar8k7YFGZXWRhrAyiMmoyvWwGff` is Ready and `aleo-private-vote.vercel.app` points to `aleo-private-vote-7053dss3l-qiaopengjuns-projects.vercel.app`.
- Disabled Vercel SSO deployment protection after the live `vercel.app` domain redirected to Vercel Login.
- Verified the public live page in Browser: external wallet options render, the execution request panel renders, and the Dynamic embedded wallet button remains hidden without `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID`.

## 2026-06-09 README Open Source Polish

- Reworked `README.md` to follow the `qiaopengjun5162/gogen` open-source project structure.
- Added Overview, Features, Quick Start, Installation, Usage, Requirements, and Project Structure sections.
- Kept the all-contributors badge, Contributors table, and `.all-contributorsrc` convention intact for PR-based contribution attribution.
- Added AGENTS guidance to preserve the README structure and all-contributors markers.

## 2026-06-09 Wallet Transaction Status

- Added a same-origin Next API route at `/api/testnet/transactions/[txId]` to query Provable testnet transaction status.
- Normalized wallet-submitted transaction status into checking, pending, accepted, and unavailable states.
- Added frontend polling after the wallet returns a transaction id and displayed accepted transaction details in the execution panel.
- Added Vitest coverage for transaction status payload parsing and UI labels.
- Verified the route locally with the known interaction tx `at1pwcdsarry997563mt69tg45a8ur72mr88l609jvz2peh38emsgrqsp83se`, which returned accepted `private_vote.aleo/main`.
- PR #2 was merged into `main`, and Vercel deployment `dpl_4ATfWxfTpEbGmUwadMMipYwCynAH` is Ready.
- `aleo-private-vote.vercel.app` points to `aleo-private-vote-b1ow85hx5-qiaopengjuns-projects.vercel.app`.
- Verified the production route `/api/testnet/transactions/at1pwcdsarry997563mt69tg45a8ur72mr88l609jvz2peh38emsgrqsp83se`, which returned accepted `private_vote.aleo/main`.

## 2026-06-09 v0.1.0 Release

- Created GitHub release `v0.1.0 - Aleo Private Vote testnet MVP`.
- Fixed the README release badge by publishing the first release; Shields now returns `release: v0.1.0`.
- Release notes include live demo, supported wallets, testnet deployment transaction, interaction transaction, and verification checks.

## 2026-06-09 Unified Wallet Connect Modal

- Replaced the split external-wallet and embedded-wallet header buttons with one `Connect Wallet` modal.
- Matched the Aleo wallet adapter docs pattern with top-level `Aleo Wallet Adapter` and `Dynamic` choices.
- Kept external wallet execution on the official adapter path and kept Dynamic disabled unless `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` is configured.
- Reviewed local Bootcamp examples; most use a single adapter provider path, so this project keeps the official adapter logic while adding the docs-style aggregated connection surface.
- PR #5 was merged into `main`, and Vercel deployment `dpl_5oniWWwnwoTcoud1CoExo43c7jRR` is Ready.
- `aleo-private-vote.vercel.app` points to `aleo-private-vote-hhb7rzjwt-qiaopengjuns-projects.vercel.app`.
- Verified production Browser smoke: one `Connect Wallet` button, no separate embedded wallet button, modal shows `Aleo Wallet Adapter` and disabled `Dynamic`, and adapter expansion shows Leo, Shield, Puzzle, and Fox.

## 2026-06-09 Wallet Transaction History

- Reviewed the official Aleo wallet adapter tx-history guide and the installed `@provablehq/aleo-wallet-adaptor-core` alpha.4 types.
- Switched external wallet connection permission to `WalletDecryptPermission.OnChainHistory` for `private_vote.aleo`.
- Added `requestTransactionHistory(programId)` support to the wallet context and a frontend transaction-history panel with explorer links.
- Added unit coverage for wallet transaction-history normalization and deduplication.
- PR #7 was merged into `main`, and Vercel deployment `dpl_GqPrSi1khbjgJYk5BYNAkNZso8Hx` is Ready.
- `aleo-private-vote.vercel.app` points to `aleo-private-vote-cerb7tfey-qiaopengjuns-projects.vercel.app`.
- Verified production HTML includes the `Wallet transaction history` panel and the production transaction status route still returns accepted `private_vote.aleo/main` for `at1pwcdsarry997563mt69tg45a8ur72mr88l609jvz2peh38emsgrqsp83se`.

## 2026-06-09 Wallet Execution Status Resolution

- Rechecked the installed official `@provablehq/aleo-wallet-adaptor-core` alpha.4 execute API types after reviewing the Aleo execute guide link.
- Added wallet adapter `transactionStatus(transactionId)` support so the UI does not assume the value returned by `executeTransaction()` is already the final on-chain transaction id.
- Split frontend state between wallet execution id, resolved on-chain transaction id, wallet execution status, and testnet acceptance status.
- Added unit coverage for Aleo transaction-id detection, on-chain id resolution, and wallet execution status labels.
- PR #9 was merged into `main`, and Vercel deployment `dpl_Gau762KEJGituBKtJG8uBN9Dmd2x` is Ready.
- `aleo-private-vote.vercel.app` points to `aleo-private-vote-c72yw5nqv-qiaopengjuns-projects.vercel.app`.
- Verified the production JavaScript bundle includes the `Wallet execution status`, `Wallet transaction history`, temporary execution id, and `transactionStatus` resolution paths.
- Verified the production transaction status route still returns accepted `private_vote.aleo/main` for `at1pwcdsarry997563mt69tg45a8ur72mr88l609jvz2peh38emsgrqsp83se`.

## 2026-06-09 Wallet Sign Message Proof

- Added official wallet adapter `signMessage()` support to the frontend wallet context.
- Added a domain-bound wallet ownership challenge with address, program id, nonce, and issue time.
- Added local signature verification with `Signature.fromBytesLe()` and `Signature.verify(Address, message)` before displaying the proof as verified.
- Added a wallet ownership proof panel that shows signing status, verification result, challenge transcript, and signature hex.
- Added Vitest coverage for challenge formatting, UTF-8 encoding, and signature hex serialization.
- PR #11 was merged into `main`, and Vercel deployment `dpl_JA66unZZ2Yz1YM8yJ26voZZEjxFd` is Ready.
- `aleo-private-vote.vercel.app` points to `aleo-private-vote-3bnnm84od-qiaopengjuns-projects.vercel.app`.
- Verified production HTML includes the `Wallet ownership proof` panel and `Sign challenge` button.
- Verified the production JavaScript bundle includes the `signMessage`, `fromBytesLe`, and wallet ownership challenge paths.
- Verified the production transaction status route still returns accepted `private_vote.aleo/main` for `at1pwcdsarry997563mt69tg45a8ur72mr88l609jvz2peh38emsgrqsp83se`.
- Documented that Vercel production deploys must run from `frontend/`; deploying from the repository root fails because the root package is not a Next.js app.

## 2026-06-09 Wallet Recovery Guidance

- Added a shared frontend recovery helper for wallet and testnet failures.
- Added a `Recovery plan` UI panel that keeps the original error visible, explains the likely failure class, and offers retries when the current state can safely retry.
- Classified rejected wallet signatures or requests, insufficient testnet balance, unavailable wallet extensions, disconnected wallets, failed broadcasts, wallet-history failures, and testnet API outages.
- Routed wallet connection, wallet history, signature proof, wallet execution, wallet execution status, and testnet acceptance checks through the recovery helper instead of showing only raw adapter errors.
- Added Vitest coverage for recovery message extraction and the main failure classifications.
- PR #13 was merged into `main`, and Vercel deployment `dpl_B9TzMjBhWvAr7x8YYZuS2R33EyxH` is Ready.
- `aleo-private-vote.vercel.app` points to `aleo-private-vote-8pqhgrnxm-qiaopengjuns-projects.vercel.app`.
- Verified the deployment and alias through Vercel CLI. Production HTTP smoke from this environment could not complete because shell curl and Browser access to the Vercel domain timed out or reset after deployment.

## 2026-06-09 Proposal Room and Outcome Clarity

- Added proposal status to the demo data model: active, passed, and failed.
- Added backend demo endpoints to create proposals and close proposals.
- Rejected ticket issuance and report submission for closed proposals.
- Added frontend proposal selection, wallet-authored proposal creation, and proposal closing.
- Added clear current/final outcome display using the `agree >= disagree` rule.
- Documented that current voting remains binary agree/disagree per issued demo ticket and does not yet enforce one-wallet-one-vote with a real record/nullifier strategy.
- PR #14 was merged into `main`, and Vercel deployment `dpl_C4P86NKSrQRctjPQugzGZTAS7GDr` is Ready.
- `aleo-private-vote.vercel.app` points to `aleo-private-vote-2ns0uifs6-qiaopengjuns-projects.vercel.app`.
- Confirmed the new local Next.js build no longer contains the previously reported `918.*.js` chunk name, so a hard browser refresh should clear stale chunk references.

## 2026-06-10 Persistent Vote Workspace

- Added a browser-persisted vote workspace for local proposals, selected proposal, ticket receipt, latest report, proof result, wallet execution id, resolved on-chain id, and local wallet vote records.
- Added a browser-local one-wallet-per-proposal guard so the same connected wallet cannot issue another ticket or vote again on the same proposal in the same local workspace.
- Preserved successful wallet submissions when backend report storage fails by switching to a local report instead of marking the already-submitted execution as failed.
- Added a `Reset local` control and workspace saved status in the frontend header.
- Kept the docs explicit that this is a browser workspace guard, not a real chain-level record/nullifier guarantee.
- Added Vitest coverage for persisted workspace normalization and duplicate local vote replacement.
- Verified `pnpm --filter @aleo-private-vote/frontend test`: 7 files / 31 tests passed.
- Verified `pnpm --filter @aleo-private-vote/frontend typecheck`.
- Verified `pnpm --filter @aleo-private-vote/frontend build`.
- Verified `just check`: Leo tests, backend typecheck/test/build, frontend typecheck/test/build, client-ts typecheck/build, and client-rust cargo check passed.
- Verified local production smoke with `next start`: HTTP 200, desktop DOM contains `Aleo Private Vote`, `Reset local`, `Local workspace`, and `Proposal room`; console error log was empty.
- Verified mobile 390px smoke: no horizontal overflow, `Reset local` renders once, and console error log was empty.
- PR #15 was merged into `main`, and main CI run `27220532446` passed at merge commit `9c55d2968fcd157a98ec2f145e74cfc6638dbcc7`.
- Vercel deployment `dpl_56mfMarr7CiLXDe6mUaBTY4NBHgd` is Ready.
- `aleo-private-vote.vercel.app` points to `aleo-private-vote-anfs8bm4c-qiaopengjuns-projects.vercel.app`.

## 2026-06-10 Backend Persistent Voter Guard

- Added backend ticket records with voter ownership and spent status.
- Required `voter` for backend ticket issuance and report submission.
- Reused an active ticket for the same proposal and voter instead of double-counting ticket issuance.
- Rejected duplicate backend reports for the same proposal and voter.
- Added optional JSON file persistence through `VOTE_STORE_PATH`; `just backend-dev-persistent` writes to `.data/vote-store.json`.
- Kept docs explicit that backend demo guards are not a chain-level record/nullifier guarantee.
- Added backend Vitest coverage for duplicate voter rejection and JSON persistence.
- Verified `pnpm --filter @aleo-private-vote/backend typecheck`.
- Verified `pnpm --filter @aleo-private-vote/backend test`: 8 tests passed.
- Verified `pnpm --filter @aleo-private-vote/frontend test`: 7 files / 31 tests passed.
- Verified `pnpm --filter @aleo-private-vote/frontend typecheck`.
- Verified `just check`: Leo tests, backend typecheck/test/build, frontend typecheck/test/build, client-ts typecheck/build, and client-rust cargo check passed.
- Verified persistent backend runtime smoke with `just backend-dev-persistent`: `/health` returned OK, ticket issuance persisted to `.data/vote-store.json`, report submission marked the ticket spent, and a repeated voter ticket request returned 409.
