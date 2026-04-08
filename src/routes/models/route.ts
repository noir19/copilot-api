import { Hono } from "hono"

import { forwardError } from "~/lib/error"
import { enqueueRequestLog } from "~/lib/request-log"
import { state } from "~/lib/state"
import { cacheModels } from "~/lib/utils"

export const modelRoutes = new Hono()

modelRoutes.get("/", async (c) => {
  const startedAt = Date.now()
  try {
    if (!state.models) {
      // This should be handled by startup logic, but as a fallback.
      await cacheModels()
    }

    const models = state.models?.data.map((model) => ({
      id: model.id,
      object: "model",
      type: "model",
      created: 0, // No date available from source
      created_at: new Date(0).toISOString(), // No date available from source
      owned_by: model.vendor,
      display_name: model.name,
    }))

    enqueueRequestLog({
      route: c.req.path,
      startedAt,
      model: null,
      stream: false,
      responseStatus: 200,
      accountType: state.accountType,
    })

    return c.json({
      object: "list",
      data: models,
      has_more: false,
    })
  } catch (error) {
    enqueueRequestLog({
      route: c.req.path,
      startedAt,
      model: null,
      stream: false,
      error,
      accountType: state.accountType,
    })
    return await forwardError(c, error)
  }
})
