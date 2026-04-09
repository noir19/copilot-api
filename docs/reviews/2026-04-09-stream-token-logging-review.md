# 2026-04-09 Stream Token Logging Review

## 范围

- 修复流式 `chat/messages` 请求日志缺失 token 统计的问题

## 根因

- 之前流式请求在开始返回流时就立即写入一条成功日志
- 这时上游最终 `usage` 还没有到达，所以 `input_tokens`、`output_tokens`、`total_tokens` 都是空
- 结果是 dashboard 对流式请求几乎一直显示 `0` 或空值

## 改动

- 新增 `src/lib/stream-usage.ts`
  - 提取 streamed chunk 中的 `usage`
- `chat-completions` 流式路径改为：
  - 在流结束后再写成功日志
  - 使用最后一个带 `usage` 的 chunk 填充 token 数
- `messages` 流式路径改为同样策略
- 流式过程中如果抛错，仍然记录错误日志

## 验证

- `bun run lint:fix`
- `bun run typecheck`
- `bun test tests/stream-usage.test.ts tests/anthropic-response.test.ts tests/request-logs-repository.test.ts`
