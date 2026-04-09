import type { ChatCompletionChunk } from "~/services/copilot/create-chat-completions"

export interface CompletionUsageSnapshot {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export function extractCompletionUsage(
  chunk: ChatCompletionChunk,
): CompletionUsageSnapshot | null {
  if (!chunk.usage) {
    return null
  }

  return {
    promptTokens: chunk.usage.prompt_tokens,
    completionTokens: chunk.usage.completion_tokens,
    totalTokens: chunk.usage.total_tokens,
  }
}
