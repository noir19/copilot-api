import { describe, expect, test } from "bun:test"

import {
  applyModelReasoningEffort,
  modelReasoningEffortKey,
} from "~/lib/model-reasoning-settings"
import type { ChatCompletionsPayload } from "~/services/copilot/create-chat-completions"

function createPayload(model: string): ChatCompletionsPayload {
  return {
    model,
    messages: [{ role: "user", content: "hello" }],
  }
}

describe("model reasoning settings", () => {
  test("uses configured reasoning effort for the final model id", () => {
    const payload = createPayload("gpt-5.4")

    const result = applyModelReasoningEffort(payload, (key) =>
      key === modelReasoningEffortKey("gpt-5.4") ? "high" : null,
    )

    expect(result).toEqual({
      ...payload,
      reasoning_effort: "high",
    })
  })

  test("preserves explicit request effort when no dashboard setting exists", () => {
    const payload: ChatCompletionsPayload = {
      ...createPayload("gpt-5.4"),
      reasoning_effort: "low",
    }

    const result = applyModelReasoningEffort(payload, () => null)

    expect(result).toBe(payload)
  })

  test("ignores invalid dashboard effort values", () => {
    const payload = createPayload("gpt-5.4")

    const result = applyModelReasoningEffort(payload, () => "extreme")

    expect(result).toBe(payload)
  })

  test("accepts none and xhigh effort values from Copilot capabilities", () => {
    const payload = createPayload("gpt-5.4-mini")

    const noneResult = applyModelReasoningEffort(payload, () => "none")
    const xhighResult = applyModelReasoningEffort(payload, () => "xhigh")

    expect(noneResult.reasoning_effort).toBe("none")
    expect(xhighResult.reasoning_effort).toBe("xhigh")
  })
})
