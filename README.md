# Aleo Private Vote
<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-1-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

![Leo](https://img.shields.io/badge/Leo-4.0.2-purple)
![Rust](https://img.shields.io/badge/Rust-1.96.0-orange?logo=rust)
![Node.js](https://img.shields.io/badge/Node.js-24.15.0-green?logo=node.js)
![Next.js](https://img.shields.io/badge/Next.js-16.2.7-black?logo=next.js)
![License](https://img.shields.io/badge/License-MIT-blue)

Live demo: https://aleo-private-vote.vercel.app

## Chinese Documentation

中文文档请参阅 [README_zh.md](README_zh.md)。

Aleo Private Vote is a privacy-preserving voting DApp for private ticket-based voting on Aleo.

The project starts from the official `ProvableHQ/leo-examples` voting example and turns it into a small full-stack DApp with a Leo program, a TypeScript SDK client, a backend API, and a frontend voting dashboard.

## Why This Project

Voting is a natural privacy use case: voters should be able to cast a choice without exposing how they voted, while the final tally should remain publicly verifiable. Aleo's local private execution and public verification model fits this workflow well.

## Voting Logic

The project has two layers of voting logic:

1. **Leo privacy model**: `private_vote.aleo` defines proposals, ticket records, vote records, and public mappings for proposal metadata, ticket counts, agree votes, and disagree votes.
2. **Demo verifier path**: `main(public agree_count, public disagree_count) -> bool` returns whether the public tally passes the rule `agree >= disagree`. The browser, TypeScript client, and Rust client all execute this function locally so the demo can prove a small voting rule quickly.

The DApp flow is:

1. The user connects Leo Wallet in the frontend.
2. The frontend loads a proposal from the backend.
3. The user requests a private ticket; the backend issues a demo ticket commitment and increments `ticketsIssued`.
4. The user chooses `Agree` or `Disagree`.
5. The frontend runs `private_vote.aleo/main` in an Aleo SDK Web Worker with the next public tally.
6. If the SDK execution returns `true`, the frontend submits a verification report to the backend.
7. The backend stores the report and returns the updated public tally.

In the full on-chain flow, `propose`, `new_ticket`, `agree`, and `disagree` model private record-based voting. The lightweight `main` verifier keeps local demos, CI, and SDK checks fast while still exercising the Aleo execution path.

## Architecture

```text
aleo-private-vote/
  leo/private_vote/  # Leo program and tests
  client-ts/         # Aleo SDK dry-run and optional testnet execution
  client-rust/       # snarkVM Rust client for local dry-run and testnet execution
  backend/           # Demo API for proposals and verification reports
  frontend/          # Next.js + shadcn/ui-style DApp UI
  screenshots/       # Demo and testnet screenshots
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

The frontend uses `http://127.0.0.1:8787` by default. Override it with `NEXT_PUBLIC_API_URL` when needed.

## Project Scope

- Create and display voting proposals.
- Connect Leo Wallet before issuing a ticket or casting a vote.
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

The frontend now uses Next.js App Router, React, Tailwind CSS, and local shadcn/ui-style components:

- Serve the compiled Aleo instructions from `frontend/public/programs/private_vote.aleo`.
- Run `initThreadPool()` inside a Web Worker.
- Execute `ProgramManager.run()` locally before showing the verification report.
- Set `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` in `next.config.ts` for `SharedArrayBuffer` support.
- Use `next build --webpack` because Next 16 Turbopack tries to bind a local port in this sandbox.
- Keep `frontend/public/programs/private_vote.aleo` in sync with `leo/private_vote/build/main.aleo` after Leo program changes.

## Testnet Deployment

Testnet execution is isolated in CLI clients so local demos remain usable without faucet balance or network availability.

1. Run `just leo-test` to compile `private_vote.aleo`.
2. Set `PRIVATE_KEY` locally when using a funded Aleo testnet account.
3. Confirm the program id in `leo/private_vote/src/main.leo` is unique on testnet before deployment.
4. Run `just deploy-testnet` to broadcast the deployment.
5. Run `just rust-execute-testnet` or `just execute-testnet` to broadcast one `main 3u64 2u64` interaction.
6. Record the deployed program id, interaction transaction, and Explorer screenshot for release evidence.

Current testnet deployment:

- Program: `private_vote.aleo`
- Deployment transaction: `at18jhvcs9gnjwhnqhzgu6sl5mkuyqc9vgt8h5et8sxh98udyg70vpqdyg87a`
- Fee transaction: `at1uwugmx0jhup86mhvv0xchw85jfwzyn28c2qhwzp9948l5ungzgrsrpj07y`
- Interaction transaction: `at1pwcdsarry997563mt69tg45a8ur72mr88l609jvz2peh38emsgrqsp83se`
- Interaction result: `main 3u64 2u64` returned `true`
- Explorer: `https://testnet.explorer.provable.com/transaction/at18jhvcs9gnjwhnqhzgu6sl5mkuyqc9vgt8h5et8sxh98udyg70vpqdyg87a`

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

## Contributing

Contributions are welcome. Please see [CONTRIBUTING.md](CONTRIBUTING.md) for setup, testing, testnet safety notes, and pull request guidelines.

## Contributors

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/qiaopengjun5162"><img src="https://avatars.githubusercontent.com/u/124650229?v=4?s=100" width="100px;" alt="Paxon Qiao 乔鹏军"/><br /><sub><b>Paxon Qiao 乔鹏军</b></sub></a><br /><a href="#content-qiaopengjun5162" title="Content">🖋</a></td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <td align="center" size="13px" colspan="7">
        <img src="https://raw.githubusercontent.com/all-contributors/all-contributors-cli/1b8533af435da9854653492b1327a23a4dbd0a10/assets/logo-small.svg">
          <a href="https://all-contributors.js.org/docs/en/bot/usage">Add your contributions</a>
        </img>
      </td>
    </tr>
  </tfoot>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

## License

This project is licensed under the [MIT License](LICENSE).
