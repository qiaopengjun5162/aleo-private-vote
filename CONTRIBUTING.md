# Contributing

Thanks for helping improve Aleo Private Vote. This project should be treated as a real product, not a throwaway demo. Contributions should keep the app clear, reproducible, secure, and practical to operate while moving it toward production-grade behavior.

## Production Quality Bar

- Prefer working, user-verifiable product behavior over presentation-only changes.
- Keep wallet, testnet, backend, and UI state honest; never make a local demo path look like a completed on-chain flow.
- Review code for correctness, error handling, security, and maintainability before committing.
- Refactor when it removes real risk or complexity, but avoid broad rewrites that do not improve the product.
- Add focused tests for behavior changes, and expand coverage when touching shared flows.
- Treat docs as part of the product: setup, limitations, recovery steps, and operational assumptions must stay current.

## Project Scope

- Keep the Leo voting program in `leo/private_vote`.
- Keep browser execution in `frontend` wallet-driven and honest about what is on-chain.
- Keep testnet deployment and execution explicit, observable, and recoverable.
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
- Make failure states explicit in UI and API behavior.
- Remove demo shortcuts once a real product path exists.
- Update relevant docs when behavior, commands, or architecture changes.
- Record notable changes, failures, and fixes in `PROGRESS.md`.
- Do not add comments that restate the code; only explain non-obvious design reasons.

## Pull Request Checklist

- [ ] Leo changes include or update tests in `leo/private_vote/tests`.
- [ ] Frontend behavior changes include focused Vitest coverage when practical.
- [ ] Backend API changes include Fastify injection tests.
- [ ] User-facing flows clearly distinguish local checks, backend state, and on-chain execution.
- [ ] `git diff --check` passes.
- [ ] Relevant docs and `PROGRESS.md` are updated.
- [ ] No secrets, generated dependency folders, or build artifacts are committed.
