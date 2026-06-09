# Aleo Private Vote

在线演示：https://aleo-private-vote.vercel.app

Aleo Private Vote 是一个基于 Aleo 的隐私投票 DApp，用于演示私密票据驱动的投票流程。

项目基于官方 `ProvableHQ/leo-examples` 的 `vote` 示例扩展而来，包含 Leo 程序、TypeScript SDK 调用、Rust snarkVM 客户端、后端 API 和前端 DApp 界面。

## 为什么做隐私投票

投票天然需要隐私：外部可以看到公开计票结果，但不应该知道某个具体地址投了赞成还是反对。Aleo 的“本地隐私执行 + 公开验证”模型很适合这个场景。

## 投票逻辑

这个项目有两层投票逻辑：

1. **Leo 隐私模型**：`private_vote.aleo` 定义提案、私密票据 record、投票 record，以及提案信息、票据数量、赞成票、反对票这些公开 mapping。
2. **演示验证路径**：`main(public agree_count, public disagree_count) -> bool` 判断公开计票是否满足 `agree >= disagree`。浏览器、TypeScript 客户端和 Rust 客户端都会本地执行这个函数，用一个很轻量的投票规则证明 Aleo 执行链路是通的。

DApp 的交互流程是：

1. 用户先在前端连接支持的 Aleo 钱包。
2. 用户在 proposal room 里选择现有提案，或者用当前钱包地址创建一个 demo 提案。
3. 用户可以签名一个 ownership challenge，前端会用已连接的 Aleo 地址本地验证签名。
4. 用户为当前 active 提案请求一张私密票据，后端签发 demo ticket commitment，并增加 `ticketsIssued`。
5. 用户选择 `Agree` 或 `Disagree`。
6. 前端把下一轮公开计票传给 Aleo SDK Web Worker，执行 `private_vote.aleo/main`。
7. 本地 SDK 执行返回 `true` 后，前端打开已连接的钱包，请求广播一次 `private_vote.aleo/main` 测试网 execution。
8. 钱包返回交易 id 后，前端展示 Explorer 链接，并把 verification report 发送给后端。
9. 后端保存 report，并返回更新后的公开计票。
10. 用户可以关闭提案，按当前 `agree >= disagree` 规则把结果固定为 `passed` 或 `failed`。

后端不可用时，前端会把 proposal room、当前 ticket、最近 report、本地钱包投票锁和最后一次钱包 execution id 保存在浏览器里。这样 Vercel 在线演示刷新后可以恢复工作区，但这些本地数据不会被描述成链上状态。

完整上链流程里，`propose`、`new_ticket`、`agree`、`disagree` 用于建模 record 驱动的隐私投票。轻量的 `main` 验证函数让本地演示、CI 和 SDK 检查保持快速，同时保留 Aleo 隐私执行的核心路径。

## 架构

```text
aleo-private-vote/
  leo/private_vote/  # Leo 隐私投票程序和测试
  client-ts/         # Aleo SDK 本地 dry-run 和可选测试网上链
  client-rust/       # snarkVM Rust 客户端，本地 dry-run 和测试网执行
  backend/           # 提案和验证报告 API
  frontend/          # Next.js + shadcn/ui 风格投票 DApp 界面
  screenshots/       # 演示和测试网截图
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

## 项目范围

- 创建、选择、关闭和展示 demo 投票提案。
- 连接 Leo、Shield、Puzzle 或 Fox Wallet 后签发票据和投票。
- 在浏览器工作区持久化本地提案、ticket、report 和最近一次钱包 execution。
- 配置 `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` 后，可启用 Dynamic 嵌入式 Aleo 钱包入口。
- 通过 `signMessage()` 签名 ownership challenge，并用当前连接地址本地验签。
- 发放私密投票票据。
- 每张 demo ticket 投一次赞成票或反对票，并在浏览器工作区阻止同一个连接钱包对同一提案重复投票。
- 展示提案当前结果和关闭后的最终结果，规则是 `agree >= disagree` 即通过。
- 通过 Aleo 钱包广播 `private_vote.aleo/main` 测试网 execution。
- 钱包批准前展示 execution request，包括 program、function、inputs、network 和 public fee。
- 跟踪钱包提交后的 testnet transaction 状态：checking、pending、accepted 或 unavailable。
- 在钱包授权 on-chain history 后，读取当前钱包里 `private_vote.aleo` 的交易历史。
- 钱包、签名、交易历史、广播或 testnet 状态检查失败时，展示分类后的恢复方案和可重试动作。
- 展示公开计票结果。
- 生成本地验证报告用于演示。
- 通过 TypeScript SDK 和 Rust snarkVM 客户端保留测试网执行入口。

## 钱包集成

默认生产路径使用 `ProvableHQ/aleo-dev-toolkit` 里的官方钱包适配器包：

- `@provablehq/aleo-wallet-adaptor-core`
- `@provablehq/aleo-wallet-adaptor-leo`
- `@provablehq/aleo-wallet-adaptor-shield`
- `@provablehq/aleo-wallet-adaptor-puzzle`
- `@provablehq/aleo-wallet-adaptor-fox`
- `@provablehq/aleo-wallet-standard`

这条路径连接浏览器钱包扩展，通过选中 adapter 的 `signMessage()` API 做钱包 ownership proof，并通过 `executeTransaction()` API 请求测试网 execution。ownership proof 会签名一个绑定当前域名、program 和地址的 challenge，并用 `Signature.verify(Address, message)` 在前端本地验签。由于 wallet adapter 可能先返回 temporary execution id，前端会调用 `transactionStatus(walletExecutionId)` 解析真正的 on-chain `transactionId`，再打开 Explorer 链接或检查 testnet accepted 状态。连接钱包时会为 `private_vote.aleo` 请求 `WalletDecryptPermission.OnChainHistory`，这样前端可以调用 `requestTransactionHistory(programId)`，在 explorer 状态检查旁边展示钱包返回的 program-scoped 交易历史。

前端也接入了基于 `@dynamic-labs/sdk-react-core` 和 `@dynamic-labs/aleo` 的可选 Dynamic 嵌入式钱包。它默认关闭。只有在 Dynamic dashboard 创建并验证真实环境后，才设置 `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID`：

```bash
NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID=your_dynamic_environment_id pnpm --filter @aleo-private-vote/frontend dev
```

未设置这个变量时，统一钱包弹窗会保留 Dynamic 选项但置为禁用，并且不会加载 embedded wallet provider。因为它是 `NEXT_PUBLIC_` 变量，生产部署必须在 `next build` 前设置，比如先在 Vercel Project Settings 里配置再重新部署。当前投票 execution 仍然走外部 Aleo 钱包 adapter；Dynamic 嵌入式钱包的交易证明和广播路径，要等真实 Dynamic 环境和测试网账号验证后再接入。

## 后端 API

- `GET /health`：健康检查。
- `GET /api/proposals`：返回演示提案和公开计票。
- `POST /api/proposals`：创建一个内存里的 demo 提案。
- `POST /api/proposals/:proposalId/close`：关闭 active demo 提案，并标记为 passed 或 failed。
- `POST /api/tickets`：为提案签发一个私密票据 commitment。
- `POST /api/reports`：保存验证报告，并返回更新后的计票结果。

## 前端 API Routes

- `GET /api/testnet/transactions/:txId`：查询 Provable testnet API 中的钱包提交交易，并统一返回 `checking`、`pending`、`accepted` 或 `unavailable`。

这个 route 默认使用 `https://api.provable.com/v2/testnet`，可以通过 `ALEO_TESTNET_API_URL` 覆盖。

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
- 使用官方 `@provablehq/aleo-wallet-adaptor-*` 包接入钱包连接和 execution。
- 使用自定义 React 19 兼容钱包选择器，在扩展探测完成前也稳定展示所有支持的钱包入口。
- 使用一个 `Connect Wallet` 弹窗统一展示外部 Aleo wallet adapter 和 Dynamic embedded wallet 路径。
- 未配置 `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` 时，Dynamic 选项保持禁用。
- 使用 `signMessage()` 做钱包 ownership proof，并在显示 verified 前本地验签。
- 展示准确的钱包 execution request，并跟踪本地检查、钱包批准、已提交和失败状态。
- 本地 SDK 检查通过后，请求钱包广播测试网 execution。
- 通过 `transactionStatus()` 解析钱包返回的 temporary execution id，再把它作为 on-chain transaction id 使用。
- 请求钱包 on-chain history 权限，并通过 `requestTransactionHistory()` 提供 `private_vote.aleo` 交易历史刷新。
- 钱包返回交易 id 后，轮询同源 `/api/testnet/transactions/:txId` route，避免浏览器直接跨域依赖 Provable API。
- 钱包、签名、交易历史、广播和 testnet 状态失败统一进入恢复 helper，给用户明确下一步，而不是只暴露原始 adapter 错误。
- 在 `next.config.ts` 配置 COOP / COEP 头，为 `SharedArrayBuffer` 提供支持。
- 使用 `next build --webpack`，因为 Next 16 的 Turbopack 在当前沙箱里会尝试绑定本地端口并触发 `Operation not permitted`。
- Leo 程序变化后，需要把 `leo/private_vote/build/main.aleo` 同步到 `frontend/public/programs/private_vote.aleo`。

## 测试网部署

测试网执行入口隔离在 CLI 客户端里，这样本地演示不依赖 faucet 余额或网络可用性。

1. 运行 `just leo-test` 编译 `private_vote.aleo`。
2. 使用有测试网余额的账号时，在本地设置 `PRIVATE_KEY`。
3. 部署前确认 `leo/private_vote/src/main.leo` 里的 program id 在测试网上是唯一的。
4. 运行 `just deploy-testnet` 广播部署交易。
5. 运行 `just rust-execute-testnet` 或 `just execute-testnet` 广播一次 `main 3u64 2u64` 交互。
6. 记录部署后的 program id、交互交易和 Explorer 截图，作为发布证据。

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

## 生产级路线

这个项目可以很小，但产品体验仍然应该可信、清楚、可恢复：

- 把浏览器投票从轻量 `main` 验证函数升级到完整 record 驱动的 `new_ticket`、`agree`、`disagree` 流程。
- 用真实 record/nullifier 策略强制每个合格投票人只能投一次，而不是当前浏览器本地钱包投票锁。
- 尽可能从链上数据读取提案状态和计票结果，而不是依赖本地 demo 状态。
- 部署带持久化存储、限流和健康检查的后端 API。
- 把钱包提交交易的状态历史持久化到 durable storage，而不是只保存在浏览器里。
- 增加恢复结果 telemetry，在不收集私密投票数据的前提下复盘高频钱包和测试网失败模式。
- 增加端到端测试，覆盖连接钱包、签发票据、批准 execution 和 Explorer 链接展示。

## 许可证

MIT
