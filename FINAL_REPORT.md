# Aleo Private Vote Final Report

## Status

`Aleo Private Vote` is ready as a portfolio, hackathon, and testnet demonstration project. It is not yet a production chain-enforced private voting protocol.

The project now has a working product surface: users can connect an Aleo wallet, create or select a proposal, request a private ticket, cast an agree or disagree vote, submit a wallet execution on testnet, inspect the transaction status, and see the public tally update through the demo backend or local workspace fallback.

## Live Demo

- Frontend: https://aleo-private-vote.vercel.app
- Source: https://github.com/qiaopengjun5162/aleo-private-vote
- Current release target: `v0.2.0`

The public Vercel deployment is a frontend deployment. The backend API can run locally or be self-hosted with `VOTE_STORE_PATH`; the frontend falls back to browser workspace state when `NEXT_PUBLIC_API_URL` is unavailable.

## Testnet Evidence

- Program ID: `private_vote.aleo`
- Deployment transaction: `at18jhvcs9gnjwhnqhzgu6sl5mkuyqc9vgt8h5et8sxh98udyg70vpqdyg87a`
- Deployment explorer: https://testnet.explorer.provable.com/transaction/at18jhvcs9gnjwhnqhzgu6sl5mkuyqc9vgt8h5et8sxh98udyg70vpqdyg87a
- Interaction transaction: `at1pwcdsarry997563mt69tg45a8ur72mr88l609jvz2peh38emsgrqsp83se`
- Interaction explorer: https://testnet.explorer.provable.com/transaction/at1pwcdsarry997563mt69tg45a8ur72mr88l609jvz2peh38emsgrqsp83se
- Interaction result: `main 3u64 2u64` returned `true`
- Screenshot: `screenshots/testnet-interaction.png`

## Completed Product Scope

- Leo program with proposal, ticket, and vote records modeled in `private_vote.aleo`.
- Lightweight verifier function `main(public agree_count, public disagree_count) -> bool` for browser, TypeScript, Rust, CI, and wallet execution demos.
- Next.js frontend with one unified wallet connection flow.
- Official Aleo wallet adapter support for Leo, Shield, Puzzle, and Fox Wallet.
- Optional Dynamic embedded wallet entry gated behind `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID`.
- Wallet ownership challenge using `signMessage()` and local signature verification.
- Proposal room with create, select, close, active, passed, and failed states.
- Browser-persisted local workspace for proposals, tickets, reports, local vote locks, and wallet execution ids.
- Backend API for proposals, ticket commitments, and verification reports.
- Backend voter guard that reuses active tickets and rejects duplicate reports for the same proposal and voter.
- Optional JSON persistence through `VOTE_STORE_PATH`.
- Backend write-route rate limits and request body limits.
- Wallet execution status resolution from wallet execution id to on-chain transaction id.
- Same-origin testnet transaction status API route.
- Wallet-scoped transaction history refresh for `private_vote.aleo`.
- Classified recovery guidance for wallet, signature, history, broadcast, and testnet-status failures.
- TypeScript SDK and Rust snarkVM clients for local dry-runs and testnet execution.
- CI coverage for Leo tests, backend tests/build, frontend tests/build, TypeScript clients, and Rust client.

## How To Run

Install dependencies:

```bash
pnpm install
```

Compile and test the Leo program:

```bash
just leo-test
```

Run the full local demo:

```bash
just backend-dev-persistent
```

```bash
just frontend-dev
```

Run the full verification suite:

```bash
just check
```

## Acceptance Checks

The release candidate is considered complete when these checks pass:

- `git diff --check`
- `pnpm --filter @aleo-private-vote/backend test`
- `pnpm --filter @aleo-private-vote/frontend test`
- `pnpm --filter @aleo-private-vote/frontend build`
- `just check`
- GitHub Actions CI on `main`

## Known Boundaries

- The browser voting flow still executes the lightweight `main` verifier, not the full record-based `new_ticket`, `agree`, and `disagree` chain flow.
- One-wallet-one-vote is enforced by browser workspace state and the demo backend voter guard, not by an on-chain nullifier.
- Proposal state and tallies are demo state, not canonical chain state.
- The public Vercel deployment does not include a hosted Fastify backend by default.
- Dynamic embedded wallet execution is intentionally disabled until a real Dynamic environment and testnet broadcast path are verified.

## Next Production Steps

- Move the frontend voting flow from `main` to the full record-based Aleo functions.
- Add a chain-enforced nullifier or equivalent eligibility strategy.
- Deploy the backend with durable database storage, rate limits, health checks, and production observability.
- Persist wallet-submitted transaction status history in durable storage.
- Add end-to-end tests that cover wallet connection, ticket issuance, wallet execution approval, and explorer link display.
