# Aleo Private Vote

Aleo Private Vote 是一个为 Aleo 101 Bootcamp 准备的隐私投票 DApp MVP。

项目基于官方 `ProvableHQ/leo-examples` 的 `vote` 示例扩展而来，目标是做成一个完整的小型作品：包含 Leo 程序、TypeScript SDK 调用、后端 API、前端 DApp 界面和最终提交截图。

## 为什么做隐私投票

投票天然需要隐私：外部可以看到公开计票结果，但不应该知道某个具体地址投了赞成还是反对。Aleo 的“本地隐私执行 + 公开验证”模型很适合这个场景。

## 投票逻辑

这个 MVP 有两层投票逻辑：

1. **Leo 隐私模型**：`private_vote.aleo` 定义提案、私密票据 record、投票 record，以及提案信息、票据数量、赞成票、反对票这些公开 mapping。
2. **演示验证路径**：`main(public agree_count, public disagree_count) -> bool` 判断公开计票是否满足 `agree >= disagree`。浏览器、TypeScript 客户端和 Rust 客户端都会本地执行这个函数，用一个很轻量的投票规则证明 Aleo 执行链路是通的。

DApp 的交互流程是：

1. 前端从后端加载提案。
2. 用户请求一张私密票据，后端签发 demo ticket commitment，并增加 `ticketsIssued`。
3. 用户选择 `Agree` 或 `Disagree`。
4. 前端把下一轮公开计票传给 Aleo SDK Web Worker，执行 `private_vote.aleo/main`。
5. SDK 执行返回 `true` 后，前端把 verification report 提交给后端。
6. 后端保存 report，并返回更新后的公开计票。

真实上链版本里，`propose`、`new_ticket`、`agree`、`disagree` 是 record 驱动的隐私投票流程。Bootcamp MVP 里先用轻量的 `main` 验证函数保证截图、CI 和本地演示都足够快，同时保留 Aleo 隐私执行的核心路径。

## 架构

```text
aleo-private-vote/
  leo/private_vote/  # Leo 隐私投票程序和测试
  client-ts/         # Aleo SDK 本地 dry-run 和可选测试网上链
  client-rust/       # snarkVM Rust 客户端，本地 dry-run 和测试网执行
  backend/           # 提案和验证报告 API
  frontend/          # Next.js + shadcn/ui 风格投票 DApp 界面
  screenshots/       # 作业提交截图
```

## 命令

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

运行 `just client-dry-run` 前先运行 `just leo-test`，确保 SDK 需要的 `leo/private_vote/build/main.aleo` 已生成。
运行 `just rust-dry-run` 可以通过 Rust snarkVM 客户端执行同一个本地 Aleo 程序。

完整前后端演示时，开两个终端：

```bash
just backend-dev
```

```bash
just frontend-dev
```

前端默认连接 `http://127.0.0.1:8787`。如果后端地址不同，可以通过 `NEXT_PUBLIC_API_URL` 覆盖。

## MVP 范围

- 创建和展示投票提案。
- 发放私密投票票据。
- 投赞成票或反对票。
- 展示公开计票结果。
- 生成本地验证报告用于演示。
- 通过 TypeScript SDK 和 Rust snarkVM 客户端保留测试网执行入口。

## 后端 API

- `GET /health`：健康检查。
- `GET /api/proposals`：返回演示提案和公开计票。
- `POST /api/tickets`：为提案签发一个私密票据 commitment。
- `POST /api/reports`：保存验证报告，并返回更新后的计票结果。

## 测试

- Leo tests 覆盖合约投票规则。
- 后端使用 Vitest + Fastify injection 测 API 行为。
- 前端使用 Vitest 测纯投票计算逻辑。
- `just check` 会跑 Leo 测试、TypeScript 类型检查、Vitest 测试、生产构建和 Rust `cargo check`。

## 浏览器 SDK 说明

前端现在使用 Next.js App Router、React、Tailwind CSS 和本地 shadcn/ui 风格组件：

- 从 `frontend/public/programs/private_vote.aleo` 提供编译后的 Aleo instructions。
- 在 Web Worker 中运行 `initThreadPool()`。
- 用 `ProgramManager.run()` 做本地执行，再展示验证报告。
- 在 `next.config.ts` 配置 COOP / COEP 头，为 `SharedArrayBuffer` 提供支持。
- 使用 `next build --webpack`，因为 Next 16 的 Turbopack 在当前沙箱里会尝试绑定本地端口并触发 `Operation not permitted`。
- Leo 程序变化后，需要把 `leo/private_vote/build/main.aleo` 同步到 `frontend/public/programs/private_vote.aleo`。

## Task 4 测试网路径

MVP 先把测试网执行入口隔离在 CLI 客户端里：

1. 运行 `just leo-test` 编译 `private_vote.aleo`。
2. 使用有测试网余额的账号时，在本地设置 `PRIVATE_KEY`。
3. 部署前确认 `leo/private_vote/src/main.leo` 里的 program id 在测试网上是唯一的。
4. 运行 `just deploy-testnet` 广播部署交易。
5. 运行 `just rust-execute-testnet` 或 `just execute-testnet` 广播一次 `main 3u64 2u64` 交互。
6. 最终提交 Bootcamp 时，补充部署后的 program id、交互交易和 Explorer 截图。

当前测试网部署：

- Program：`private_vote.aleo`
- 部署交易：`at18jhvcs9gnjwhnqhzgu6sl5mkuyqc9vgt8h5et8sxh98udyg70vpqdyg87a`
- 手续费交易：`at1uwugmx0jhup86mhvv0xchw85jfwzyn28c2qhwzp9948l5ungzgrsrpj07y`
- 交互交易：`at1pwcdsarry997563mt69tg45a8ur72mr88l609jvz2peh38emsgrqsp83se`
- 交互结果：`main 3u64 2u64` 返回 `true`
- Explorer：`https://testnet.explorer.provable.com/transaction/at18jhvcs9gnjwhnqhzgu6sl5mkuyqc9vgt8h5et8sxh98udyg70vpqdyg87a`

## Rust 客户端说明

Rust 客户端参考当前目录里已经调通的 `hello/client-rust` 项目：

- `just rust-dry-run` 读取 `leo/private_vote/build/main.aleo`，本地执行 `main 3u64 2u64`。
- `just rust-execute-testnet` 从测试网拉取已部署程序并广播交易。
- 测试网广播需要 `PRIVATE_KEY`；dry-run 未设置 `PRIVATE_KEY` 时使用开发用私钥。
- `NODE_URL` 默认是 `https://api.provable.com/v2/testnet`。
