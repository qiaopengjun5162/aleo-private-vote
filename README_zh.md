# Aleo Private Vote

Aleo Private Vote 是一个为 Aleo 101 Bootcamp 准备的隐私投票 DApp MVP。

项目基于官方 `ProvableHQ/leo-examples` 的 `vote` 示例扩展而来，目标是做成一个完整的小型作品：包含 Leo 程序、TypeScript SDK 调用、后端 API、前端 DApp 界面和最终提交截图。

## 为什么做隐私投票

投票天然需要隐私：外部可以看到公开计票结果，但不应该知道某个具体地址投了赞成还是反对。Aleo 的“本地隐私执行 + 公开验证”模型很适合这个场景。

## 架构

```text
aleo-private-vote/
  leo/private_vote/  # Leo 隐私投票程序和测试
  client-ts/         # Aleo SDK 本地 dry-run 和可选测试网上链
  client-rust/       # snarkVM Rust 客户端，本地 dry-run 和测试网执行
  backend/           # 提案和验证报告 API
  frontend/          # 投票 DApp 界面
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

前端默认连接 `http://127.0.0.1:8787`。如果后端地址不同，可以通过 `VITE_API_URL` 覆盖。

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

## 浏览器 SDK 说明

前端参考官方 React + Leo SDK 脚手架：

- 通过 `?raw` 加载编译后的 Aleo instructions。
- 在 Web Worker 中运行 `initThreadPool()`。
- 用 `ProgramManager.run()` 做本地执行，再展示验证报告。
- 提供 `_headers`，为静态部署开启 `SharedArrayBuffer` 所需的 COOP / COEP 头。
- Vite worker 必须以 ES module 格式输出，因为 SDK 浏览器包使用 top-level await。

## Task 4 测试网路径

MVP 先把测试网执行入口隔离在 CLI 客户端里：

1. 运行 `just leo-test` 编译 `private_vote.aleo`。
2. 使用有测试网余额的账号时，在本地设置 `PRIVATE_KEY`。
3. 部署前确认 `leo/private_vote/src/main.leo` 里的 program id 在测试网上是唯一的。
4. 运行 `just deploy-testnet` 广播部署交易。
5. 运行 `just rust-execute-testnet` 或 `just execute-testnet` 广播一次 `main 3u64 2u64` 交互。
6. 最终提交 Bootcamp 时，补充部署后的 program id、交互交易和 Explorer 截图。

## Rust 客户端说明

Rust 客户端参考当前目录里已经调通的 `hello/client-rust` 项目：

- `just rust-dry-run` 读取 `leo/private_vote/build/main.aleo`，本地执行 `main 3u64 2u64`。
- `just rust-execute-testnet` 从测试网拉取已部署程序并广播交易。
- 测试网广播需要 `PRIVATE_KEY`；dry-run 未设置 `PRIVATE_KEY` 时使用开发用私钥。
- `NODE_URL` 默认是 `https://api.provable.com/v2/testnet`。
