# Contributing

Thanks for helping improve Aleo Private Vote. This project is a Bootcamp MVP, so contributions should keep the demo clear, reproducible, and safe to run without requiring testnet funds by default.

## Project Scope

- Keep the Leo voting program in `leo/private_vote`.
- Keep browser execution in `frontend` optional and demo-friendly.
- Keep testnet deployment and execution behind explicit CLI commands.
- Do not commit real `.env` files, private keys, wallet records, generated secrets, `node_modules`, `.next`, `dist`, or Rust `target` directories.

## Development Setup

Install dependencies from the repository root:

```bash
pnpm install
```

Useful commands:

```bash
just leo-test
just client-dry-run
just rust-dry-run
pnpm --filter @aleo-private-vote/backend test
pnpm --filter @aleo-private-vote/frontend test
pnpm --filter @aleo-private-vote/frontend build
```

For a full local demo, start the backend before the frontend:

```bash
just backend-dev
just frontend-dev
```

## Testnet Safety

Testnet commands require a funded Aleo testnet private key:

```bash
just deploy-testnet
just execute-testnet
just rust-execute-testnet
```

Before broadcasting anything:

- Confirm the target program ID is still correct.
- Confirm the command is using `testnet`, not another network.
- Keep logs sanitized because Leo can print loaded `.env` values.
- Prefer a temporary copy without `.env` when sharing command output.

## Change Guidelines

- Keep changes small and focused.
- Prefer existing project patterns over new abstractions.
- Update relevant docs when behavior, commands, or architecture changes.
- Record notable changes, failures, and fixes in `PROGRESS.md`.
- Do not add comments that restate the code; only explain non-obvious design reasons.

## Pull Request Checklist

- [ ] Leo changes include or update tests in `leo/private_vote/tests`.
- [ ] Frontend behavior changes include focused Vitest coverage when practical.
- [ ] Backend API changes include Fastify injection tests.
- [ ] `git diff --check` passes.
- [ ] Relevant docs and `PROGRESS.md` are updated.
- [ ] No secrets, generated dependency folders, or build artifacts are committed.
