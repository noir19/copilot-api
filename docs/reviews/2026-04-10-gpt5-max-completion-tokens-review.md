# 2026-04-10 GPT-5 max_completion_tokens Fix Review

commit: `5ad9f6872ca1297e1598d226c5783749ccb0762b`

## 背景：格式转换层

本工程作为 Anthropic API → GitHub Copilot (OpenAI) 的代理：
- **入口**: 接受 Anthropic Messages API 格式（`/v1/messages`）
- **出口**: `translateToOpenAI()` 转为 OpenAI Chat Completions 格式发给 Copilot
- **回程**: `translateToAnthropic()` 把 OpenAI 响应转回 Anthropic 格式返回给客户端

## 问题

`translateToOpenAI` 对所有模型统一使用 `max_tokens` 字段。  
GPT-5 不支持 `max_tokens`，只接受 `max_completion_tokens`，导致 GPT-5 请求 token 限制失效。

## 修复

文件: `src/routes/messages/non-stream-translation.ts`

```ts
// 修复前
max_tokens: payload.max_tokens,

// 修复后
const usesCompletionTokens = model.toLowerCase().startsWith("gpt-5")
max_tokens: usesCompletionTokens ? undefined : payload.max_tokens,
max_completion_tokens: usesCompletionTokens ? payload.max_tokens : undefined,
```

## Anthropic → OpenAI 字段映射（translateToOpenAI 全量）

| Anthropic 字段 | OpenAI 字段 | 备注 |
|---|---|---|
| `model` | `model` | 经 `resolveModelName` 映射 |
| `max_tokens` | `max_tokens` | 非 GPT-5 模型 |
| `max_tokens` | `max_completion_tokens` | GPT-5 模型（此次修复） |
| `stop_sequences` | `stop` | |
| `temperature` | `temperature` | 直传 |
| `top_p` | `top_p` | 直传 |
| `metadata.user_id` | `user` | |
| `system` (string) | messages[0] role=`system` | |
| `system` (block array) | messages[0] role=`system` | 多 block 合并为文本（`\n\n` 分隔） |
| user `tool_result` blocks | role=`tool` messages | 独立拆成 tool message |
| assistant `tool_use` blocks | `tool_calls` array | |
| `thinking` blocks | 合并进 `content` 文本 | OpenAI 无 thinking 概念，拼到文本末 |
| `tool_choice: auto` | `"auto"` | |
| `tool_choice: any` | `"required"` | |
| `tool_choice: tool` | `{type:"function", function:{name}}` | |
| `tool_choice: none` | `"none"` | |
| tools `input_schema` | tools `parameters` | |

## 注意事项

- GPT-5 判断用 `startsWith("gpt-5")`，model name 需已经过 `resolveModelName` 解析
- `thinking` blocks 无法原样回传（OpenAI 响应不含 thinking），response 翻译时已注释说明
