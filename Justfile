set dotenv-load := true

leo-test:
    cd leo/private_vote && leo test

backend-dev:
    cd backend && pnpm dev

frontend-dev:
    cd frontend && pnpm dev

client-dry-run:
    cd client-ts && pnpm dry-run

rust-dry-run:
    cd client-rust && cargo run -- --dry-run

rust-execute-testnet:
    cd client-rust && cargo run -- --program private_vote.aleo --function main --inputs 3u64,2u64

deploy-testnet:
    cd leo/private_vote && leo deploy --network testnet --endpoint https://api.explorer.provable.com/v1 --broadcast

execute-testnet:
    cd leo/private_vote && leo execute main 3u64 2u64 --network testnet --endpoint https://api.explorer.provable.com/v1 --broadcast

check:
    just leo-test
    cd backend && pnpm typecheck
    cd backend && pnpm test
    cd backend && pnpm build
    cd frontend && pnpm typecheck
    cd frontend && pnpm test
    cd frontend && pnpm build
    cd client-ts && pnpm typecheck
    cd client-ts && pnpm build
    cd client-rust && cargo check
