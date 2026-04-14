# 2026-04-14 Bun Idle Timeout And Alias Reasoning Review

## 背景

Docker 日志里出现 `[Bun.serve]: request timed out after 10 seconds. Pass idleTimeout to configure.`。实际日志显示触发点是 `POST /v1/messages?beta=true`，其中一次请求最终 200 返回但耗时 32 秒，超过了 Bun server 默认 10 秒空闲窗口。

Dashboard 的模型别名列表也需要把目标模型的思考深度配置暴露出来，便于查看和调整同一 Copilot 目标模型的 reasoning effort。

## 调整

- 新增 `createServeOptions`，集中生成 `srvx` 启动参数。
- 通过 `bun.idleTimeout: 300` 把 Bun server 的空闲超时提高到 300 秒，避免正常长模型请求在 10 秒空闲窗口下被提前关闭。
- 模型别名表格新增“思考深度”列，并把空状态 `colSpan` 从 5 调整到 6。
- 每行根据目标模型能力展示默认、不支持、不可选、未命中模型清单，或可选的 reasoning effort 下拉框。

## 验证

- `bun test tests/start-options.test.ts`
- `bun run typecheck`
- `bun run lint`
- `bunx biome check src/start.ts src/lib/serve-options.ts tests/start-options.test.ts`
