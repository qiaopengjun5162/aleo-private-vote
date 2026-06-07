# Aleo Private Vote

Aleo Private Vote is a privacy-preserving voting DApp MVP built for the Aleo 101 Bootcamp.

The project starts from the official `ProvableHQ/leo-examples` voting example and turns it into a small full-stack DApp with a Leo program, a TypeScript SDK client, a backend API, and a frontend voting dashboard.

## Why This Project

Voting is a natural privacy use case: voters should be able to cast a choice without exposing how they voted, while the final tally should remain publicly verifiable. Aleo's local private execution and public verification model fits this workflow well.

## Voting Logic

The MVP has two layers of voting logic:

1. **Leo privacy model**: `private_vote.aleo` defines proposals, ticket records, vote records, and public mappings for proposal metadata, ticket counts, agree votes, and disagree votes.
2. **Demo verifier path**: `main(public agree_count, public disagree_count) -> bool` returns whether the public tally passes the rule `agree >= disagree`. The browser, TypeScript client, and Rust client all execute this function locally so the demo can prove a small voting rule quickly.

The DApp flow is:

1. The frontend loads a proposal from the backend.
2. The user requests a private ticket; the backend issues a demo ticket commitment and increments `ticketsIssued`.
3. The user chooses `Agree` or `Disagree`.
4. The frontend runs `private_vote.aleo/main` in an Aleo SDK Web Worker with the next public tally.
5. If the SDK execution returns `true`, the frontend submits a verification report to the backend.
6. The backend stores the report and returns the updated public tally.

In a real deployed version, `propose`, `new_ticket`, `agree`, and `disagree` are the on-chain private record flow. For the Bootcamp MVP, the lightweight `main` verifier keeps screenshots, CI, and local demos fast and reliable while still showing the Aleo privacy execution path.

## Architecture

```text
aleo-private-vote/
  leo/private_vote/  # Leo program and tests
  client-ts/         # Aleo SDK dry-run and optional testnet execution
  client-rust/       # snarkVM Rust client for local dry-run and testnet execution
  backend/           # Demo API for proposals and verification reports
  frontend/          # DApp UI
  screenshots/       # Submission screenshots
```

## Commands

```bash
pnpm install
just leo-test
just backend-dev
just frontend-dev
just client-dry-run
just rust-dry-run
just rust-execute-testnet
pnpm --filter @aleo-private-vote/backend test
pnpm --filter @aleo-private-vote/frontend test
just deploy-testnet
just execute-testnet
```

Run `just leo-test` before `just client-dry-run` so `leo/private_vote/build/main.aleo` exists for the SDK.
Run `just rust-dry-run` to execute the same local Aleo program through the Rust snarkVM client.

For the full-stack demo, open two terminals:

```bash
just backend-dev
```

```bash
just frontend-dev
```

The frontend uses `http://127.0.0.1:8787` by default. Override it with `VITE_API_URL` when needed.

## MVP Scope

- Create and display voting proposals.
- Issue private voting tickets.
- Cast agree or disagree votes.
- Show public vote tallies.
- Generate a local verification report for the demo.
- Keep testnet execution available through both TypeScript SDK and Rust snarkVM clients.

## Backend API

- `GET /health`: health check.
- `GET /api/proposals`: list demo proposals and public tallies.
- `POST /api/tickets`: issue a private ticket commitment for a proposal.
- `POST /api/reports`: store a verified demo vote report and return the updated tally.

## Testing

- Leo tests cover the voting rule in `leo/private_vote/tests`.
- Vitest covers backend API behavior through Fastify injection.
- Vitest covers frontend voting math through pure helper tests.
- `just check` runs Leo tests, TypeScript type checks, Vitest tests, production builds, and Rust `cargo check`.

## Browser SDK Notes

The frontend follows the official React + Leo SDK scaffold pattern:

- Load the compiled Aleo instructions with `?raw`.
- Run `initThreadPool()` inside a Web Worker.
- Execute `ProgramManager.run()` locally before showing the verification report.
- Ship `_headers` with `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` for `SharedArrayBuffer` support on static hosts.
- Build Vite workers as ES modules because the SDK browser bundle uses top-level await.

## Task 4 Testnet Path

The MVP keeps testnet execution isolated in CLI clients:

1. Run `just leo-test` to compile `private_vote.aleo`.
2. Set `PRIVATE_KEY` locally when using a funded Aleo testnet account.
3. Confirm the program id in `leo/private_vote/src/main.leo` is unique on testnet before deployment.
4. Run `just deploy-testnet` to broadcast the deployment.
5. Run `just rust-execute-testnet` or `just execute-testnet` to broadcast one `main 3u64 2u64` interaction.
6. For final Bootcamp submission, add the deployed program id, interaction transaction, and Explorer screenshot.

## Rust Client Notes

The Rust client follows the working pattern from the local `hello/client-rust` project:

- `just rust-dry-run` reads `leo/private_vote/build/main.aleo` and executes `main 3u64 2u64` locally.
- `just rust-execute-testnet` fetches the deployed program from testnet and broadcasts a transaction.
- `PRIVATE_KEY` is required for testnet broadcast. Dry-run uses a dev key if `PRIVATE_KEY` is not set.
- `NODE_URL` defaults to `https://api.provable.com/v2/testnet`.

## References

- https://github.com/ProvableHQ/leo-examples/tree/main/vote
- https://docs.aleo.org/build/sdk/overview
- https://github.com/provablehq/sdk/tree/mainnet/sdk
