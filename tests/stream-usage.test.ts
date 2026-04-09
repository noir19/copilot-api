import { describe, expect, test } from "bun:test"

import { extractCompletionUsage } from "~/lib/stream-usage"
import type { ChatCompletionChunk } from "~/services/copilot/create-chat-completions"

describe("stream usage", () => {
  test("extracts usage from a streamed completion chunk", () => {
    const chunk: ChatCompletionChunk = {
      id: "cmpl-1",
      object: "chat.completion.chunk",
      created: 1677652288,
      model: "claude-opus-4.6",
      choices: [
        {
          index: 0,
          delta: {},
          finish_reason: "stop",
          logprobs: null,
        },
      ],
      usage: {
        prompt_tokens: 120,
        completion_tokens: 45,
        total_tokens: 165,
      },
    }

    expect(extractCompletionUsage(chunk)).toEqual({
      promptTokens: 120,
      completionTokens: 45,
      totalTokens: 165,
    })
  })

  test("returns null when the streamed completion chunk has no usage", () => {
    const chunk: ChatCompletionChunk = {
      id: "cmpl-2",
      object: "chat.completion.chunk",
      created: 1677652288,
      model: "claude-opus-4.6",
      choices: [
        {
          index: 0,
          delta: { content: "hello" },
          finish_reason: null,
          logprobs: null,
        },
      ],
    }

    expect(extractCompletionUsage(chunk)).toBeNull()
  })
})
