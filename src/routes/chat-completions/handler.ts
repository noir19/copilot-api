import consola from "consola"
import type { Context } from "hono"
import { type SSEMessage, streamSSE } from "hono/streaming"

import { getDashboardMetaRepository } from "~/db/runtime"
import { awaitApproval } from "~/lib/approval"
import { applyModelReasoningEffort } from "~/lib/model-reasoning-settings"
import { checkRateLimit } from "~/lib/rate-limit"
import { enqueueRequestLog } from "~/lib/request-log"
import { state } from "~/lib/state"
import { extractCompletionUsage } from "~/lib/stream-usage"
import { getTokenCount } from "~/lib/tokenizer"
import { isNullish } from "~/lib/utils"
import {
  type ChatCompletionChunk,
  type ChatCompletionResponse,
  type ChatCompletionsPayload,
  createChatCompletions,
} from "~/services/copilot/create-chat-completions"

export async function handleCompletion(c: Context) {
  const startedAt = Date.now()
  await checkRateLimit(state)

  let payload = await c.req.json<ChatCompletionsPayload>()
  consola.debug("Request payload:", JSON.stringify(payload).slice(-400))

  // Find the selected model
  const selectedModel = state.models?.data.find(
    (model) => model.id === payload.model,
  )

  // Calculate and display token count
  try {
    if (selectedModel) {
      const tokenCount = await getTokenCount(payload, selectedModel)
      consola.info("Current token count:", tokenCount)
    } else {
      consola.warn("No model selected, skipping token count calculation")
    }
  } catch (error) {
    consola.warn("Failed to calculate token count:", error)
  }

  if (state.manualApprove) await awaitApproval()

  // GPT-5 series requires max_completion_tokens instead of max_tokens
  const usesCompletionTokens = payload.model.toLowerCase().startsWith("gpt-5")

  if (isNullish(payload.max_tokens)) {
    const limit = selectedModel?.capabilities.limits.max_output_tokens
    if (usesCompletionTokens) {
      payload = { ...payload, max_completion_tokens: limit }
    } else {
      payload = { ...payload, max_tokens: limit }
    }
    consola.debug("Set token limit to:", limit)
  } else if (usesCompletionTokens) {
    // Translate max_tokens → max_completion_tokens for GPT-5
    payload = {
      ...payload,
      max_completion_tokens: payload.max_tokens,
      max_tokens: undefined,
    }
  }

  payload = applyModelReasoningEffort(payload, (key) =>
    getDashboardMetaRepository().get(key),
  )

  try {
    const response = await createChatCompletions(payload)

    if (isNonStreaming(response)) {
      consola.debug("Non-streaming response:", JSON.stringify(response))
      enqueueRequestLog({
        route: c.req.path,
        startedAt,
        requestModel: payload.model,
        targetModel: payload.model,
        stream: false,
        responseStatus: 200,
        inputTokens: response.usage?.prompt_tokens ?? null,
        outputTokens: response.usage?.completion_tokens ?? null,
        totalTokens: response.usage?.total_tokens ?? null,
        accountType: state.accountType,
      })
      return c.json(response)
    }

    consola.debug("Streaming response")
    return streamSSE(c, async (stream) => {
      let usage: ReturnType<typeof extractCompletionUsage> = null

      try {
        for await (const chunk of response) {
          consola.debug("Streaming chunk:", JSON.stringify(chunk))

          if (chunk.data && chunk.data !== "[DONE]") {
            const parsedChunk = JSON.parse(chunk.data) as ChatCompletionChunk
            usage = extractCompletionUsage(parsedChunk) ?? usage
          }

          await stream.writeSSE(chunk as SSEMessage)
        }

        enqueueRequestLog({
          route: c.req.path,
          startedAt,
          requestModel: payload.model,
          targetModel: payload.model,
          stream: true,
          responseStatus: 200,
          inputTokens: usage?.promptTokens ?? null,
          outputTokens: usage?.completionTokens ?? null,
          totalTokens: usage?.totalTokens ?? null,
          accountType: state.accountType,
        })
      } catch (error) {
        enqueueRequestLog({
          route: c.req.path,
          startedAt,
          requestModel: payload.model,
          targetModel: payload.model,
          stream: true,
          error,
          accountType: state.accountType,
        })
        throw error
      }
    })
  } catch (error) {
    enqueueRequestLog({
      route: c.req.path,
      startedAt,
      model: payload.model,
      stream: payload.stream ?? false,
      error,
      accountType: state.accountType,
    })
    throw error
  }
}

const isNonStreaming = (
  response: Awaited<ReturnType<typeof createChatCompletions>>,
): response is ChatCompletionResponse => Object.hasOwn(response, "choices")
