# Changelog

## v0.2.0 - Release Candidate

### Added

- Unified Aleo wallet connection flow with Leo, Shield, Puzzle, and Fox Wallet support.
- Wallet ownership proof with `signMessage()` and local signature verification.
- Proposal room with proposal creation, selection, closing, and active / passed / failed states.
- Browser-persisted voting workspace for local proposals, tickets, reports, vote locks, and wallet execution ids.
- Backend voter guard with active ticket reuse, duplicate report rejection, and optional JSON persistence.
- Backend rate limits for state-changing routes and configurable request body limits.
- Wallet execution status resolution, same-origin testnet transaction checks, and wallet transaction history refresh.
- Classified recovery guidance for wallet, signature, history, broadcast, and testnet status failures.
- Final release report with live demo, testnet evidence, completed scope, and known boundaries.

### Changed

- Reframed the project as an independent product surface instead of a Bootcamp task submission.
- Kept the public Vercel deployment honest about frontend-only hosting and backend fallback behavior.
- Updated documentation for local persistent backend mode, wallet setup, API limits, and production roadmap.

### Verified

- Leo tests.
- Backend typecheck, tests, and build.
- Frontend typecheck, tests, and production build.
- TypeScript client typecheck and build.
- Rust client `cargo check`.
- GitHub Actions CI on `main`.

### Known Boundaries

- Browser voting still uses the lightweight `private_vote.aleo/main` verifier.
- Record-based `new_ticket`, `agree`, and `disagree` are modeled in Leo but not yet the active browser voting path.
- One-wallet-one-vote is currently a browser/backend demo guard, not a chain-enforced nullifier.

## v0.1.0 - Testnet MVP

- Initial Leo private vote program.
- TypeScript and Rust clients.
- Next.js frontend deployment.
- Testnet deployment and interaction evidence.
