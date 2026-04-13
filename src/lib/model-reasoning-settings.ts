import type { ChatCompletionsPayload } from "~/services/copilot/create-chat-completions"

export const REASONING_EFFORTS = [
  "none",
  "low",
  "medium",
  "high",
  "xhigh",
] as const
export type ReasoningEffort = (typeof REASONING_EFFORTS)[number]

export function modelReasoningEffortKey(model: string): string {
  return `model_reasoning_effort:${model}`
}

export function parseReasoningEffort(
  value: string | null | undefined,
): ReasoningEffort | undefined {
  return REASONING_EFFORTS.find((effort) => effort === value)
}

export function applyModelReasoningEffort(
  payload: ChatCompletionsPayload,
  getSetting: (key: string) => string | null | undefined,
): ChatCompletionsPayload {
  const effort = parseReasoningEffort(
    getSetting(modelReasoningEffortKey(payload.model)),
  )
  if (!effort) {
    return payload
  }

  return {
    ...payload,
    reasoning_effort: effort,
  }
}
