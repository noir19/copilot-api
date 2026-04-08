import { Hono } from "hono"

import { forwardError } from "~/lib/error"
import { enqueueRequestLog } from "~/lib/request-log"
import { state } from "~/lib/state"
import {
  createEmbeddings,
  type EmbeddingRequest,
} from "~/services/copilot/create-embeddings"

export const embeddingRoutes = new Hono()

embeddingRoutes.post("/", async (c) => {
  const startedAt = Date.now()
  let payload: EmbeddingRequest | undefined
  try {
    payload = await c.req.json<EmbeddingRequest>()
    const response = await createEmbeddings(payload)
    enqueueRequestLog({
      route: c.req.path,
      startedAt,
      model: payload.model,
      stream: false,
      responseStatus: 200,
      inputTokens: response.usage.prompt_tokens,
      outputTokens: 0,
      totalTokens: response.usage.total_tokens,
      accountType: state.accountType,
    })

    return c.json(response)
  } catch (error) {
    enqueueRequestLog({
      route: c.req.path,
      startedAt,
      model: payload?.model ?? null,
      stream: false,
      error,
      accountType: state.accountType,
    })
    return await forwardError(c, error)
  }
})
