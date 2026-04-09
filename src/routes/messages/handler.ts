import consola from "consola"
import type { Context } from "hono"
import { streamSSE } from "hono/streaming"

import { awaitApproval } from "~/lib/approval"
import { checkRateLimit } from "~/lib/rate-limit"
import { enqueueRequestLog } from "~/lib/request-log"
import { state } from "~/lib/state"
import { extractCompletionUsage } from "~/lib/stream-usage"
import {
  type ChatCompletionChunk,
  type ChatCompletionResponse,
  createChatCompletions,
} from "~/services/copilot/create-chat-completions"

import type {
  AnthropicMessagesPayload,
  AnthropicStreamState,
} from "./anthropic-types"
import {
  translateToAnthropic,
  translateToOpenAI,
} from "./non-stream-translation"
import { translateChunkToAnthropicEvents } from "./stream-translation"

export async function handleCompletion(c: Context) {
  const startedAt = Date.now()
  await checkRateLimit(state)

  const anthropicPayload = await c.req.json<AnthropicMessagesPayload>()
  consola.debug("Anthropic request payload:", JSON.stringify(anthropicPayload))

  const openAIPayload = translateToOpenAI(anthropicPayload)
  consola.debug(
    "Translated OpenAI request payload:",
    JSON.stringify(openAIPayload),
  )

  if (state.manualApprove) {
    await awaitApproval()
  }

  try {
    const response = await createChatCompletions(openAIPayload)

    if (isNonStreaming(response)) {
      consola.debug(
        "Non-streaming response from Copilot:",
        JSON.stringify(response).slice(-400),
      )
      const anthropicResponse = translateToAnthropic(response)
      consola.debug(
        "Translated Anthropic response:",
        JSON.stringify(anthropicResponse),
      )
      enqueueRequestLog({
        route: c.req.path,
        startedAt,
        model: openAIPayload.model,
        stream: false,
        responseStatus: 200,
        inputTokens: response.usage?.prompt_tokens ?? null,
        outputTokens: response.usage?.completion_tokens ?? null,
        totalTokens: response.usage?.total_tokens ?? null,
        accountType: state.accountType,
      })
      return c.json(anthropicResponse)
    }

    consola.debug("Streaming response from Copilot")
    return streamSSE(c, async (stream) => {
      const streamState: AnthropicStreamState = {
        messageStartSent: false,
        contentBlockIndex: 0,
        contentBlockOpen: false,
        toolCalls: {},
      }
      let usage: ReturnType<typeof extractCompletionUsage> = null

      try {
        for await (const rawEvent of response) {
          consola.debug("Copilot raw stream event:", JSON.stringify(rawEvent))
          if (rawEvent.data === "[DONE]") {
            break
          }

          if (!rawEvent.data) {
            continue
          }

          const chunk = JSON.parse(rawEvent.data) as ChatCompletionChunk
          usage = extractCompletionUsage(chunk) ?? usage
          const events = translateChunkToAnthropicEvents(chunk, streamState)

          for (const event of events) {
            consola.debug("Translated Anthropic event:", JSON.stringify(event))
            await stream.writeSSE({
              event: event.type,
              data: JSON.stringify(event),
            })
          }
        }

        enqueueRequestLog({
          route: c.req.path,
          startedAt,
          model: openAIPayload.model,
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
          model: openAIPayload.model,
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
      model: openAIPayload.model,
      stream: openAIPayload.stream ?? false,
      error,
      accountType: state.accountType,
    })
    throw error
  }
}

const isNonStreaming = (
  response: Awaited<ReturnType<typeof createChatCompletions>>,
): response is ChatCompletionResponse => Object.hasOwn(response, "choices")
