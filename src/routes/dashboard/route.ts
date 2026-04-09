import { Hono } from "hono"

import type {
  CreateModelAliasInput,
  UpdateModelAliasInput,
} from "~/db/model-aliases"
import type {
  ModelBreakdownRow,
  RecentRequestRow,
  RequestLogFilter,
  RequestOverview,
  TimeSeriesPoint,
} from "~/db/request-logs"
import type { RequestSinkConfig } from "~/db/request-sink"
import type { ModelAliasRecord } from "~/lib/model-alias-store"
import type { Model } from "~/services/copilot/get-models"
import type { CopilotUsageResponse } from "~/services/github/get-copilot-usage"

interface DashboardRouteDeps {
  createAlias(input: CreateModelAliasInput): Promise<ModelAliasRecord>
  getSupportedModels(): Promise<Array<Model>>
  getUsage(): Promise<CopilotUsageResponse>
  getOverview(): Promise<RequestOverview>
  getModelBreakdown(): Promise<Array<ModelBreakdownRow>>
  listAliases(): Promise<Array<ModelAliasRecord>>
  getRecentRequests(options: {
    limit: number
    offset: number
    filter?: RequestLogFilter
  }): Promise<Array<RecentRequestRow>>
  countRequests(filter?: RequestLogFilter): Promise<number>
  removeAlias(id: string): Promise<boolean>
  updateAlias(
    id: string,
    input: UpdateModelAliasInput,
  ): Promise<ModelAliasRecord>
  getTimeSeries(options: {
    bucketMinutes: number
    limit: number
  }): Promise<Array<TimeSeriesPoint>>
  getAliasSnapshot(): {
    version: number
    count: number
    enabledCount: number
    loadedAt: string | null
    updatedAt: string | null
  }
  getSettings(): Record<string, string>
  updateSettings(entries: Record<string, string>): void
  reconfigureSink(patch: Partial<RequestSinkConfig>): void
  getSinkConfig(): RequestSinkConfig
}

export function createDashboardRoute(deps: DashboardRouteDeps) {
  const route = new Hono()

  function clampInt(
    raw: string | undefined,
    fallback: number,
    min: number,
    max: number,
  ): number {
    const n = Number.parseInt(raw ?? String(fallback), 10)
    if (!Number.isFinite(n)) return fallback
    return Math.max(min, Math.min(max, n))
  }

  route.get("/overview", async (c) => {
    const overview = await deps.getOverview()
    return c.json(overview)
  })

  route.get("/usage", async (c) => {
    const usage = await deps.getUsage()
    return c.json(usage)
  })

  route.get("/supported-models", async (c) => {
    const data = await deps.getSupportedModels()
    return c.json({
      data: data.map((model) => ({
        id: model.id,
        name: model.name,
        preview: model.preview,
        vendor: model.vendor,
      })),
    })
  })

  route.get("/models", async (c) => {
    const data = await deps.getModelBreakdown()
    return c.json({ data })
  })

  function parseRequestFilter(c: {
    req: { query(key: string): string | undefined }
  }): RequestLogFilter {
    const filter: RequestLogFilter = {}
    const model = c.req.query("model")
    const routeQ = c.req.query("route")
    const status = c.req.query("status")
    const timeFrom = c.req.query("timeFrom")
    const timeTo = c.req.query("timeTo")
    if (model) filter.model = model
    if (routeQ) filter.route = routeQ
    if (status === "success" || status === "error") filter.status = status
    if (timeFrom) filter.timeFrom = timeFrom
    if (timeTo) filter.timeTo = timeTo
    return filter
  }

  route.get("/requests", async (c) => {
    const limit = clampInt(c.req.query("limit"), 20, 1, 100)
    const offset = clampInt(c.req.query("offset"), 0, 0, 1_000_000)
    const filter = parseRequestFilter(c)
    const data = await deps.getRecentRequests({ limit, offset, filter })
    return c.json({ data, limit, offset })
  })

  route.get("/requests/count", async (c) => {
    const filter = parseRequestFilter(c)
    const total = await deps.countRequests(filter)
    return c.json({ total })
  })

  route.get("/time-series", async (c) => {
    const bucketMinutes = clampInt(c.req.query("bucket"), 60, 1, 525600)
    const limit = clampInt(c.req.query("limit"), 168, 1, 1000)
    const data = await deps.getTimeSeries({ bucketMinutes, limit })
    return c.json({ data })
  })

  route.get("/aliases", async (c) => {
    const data = await deps.listAliases()
    return c.json({
      data,
      meta: deps.getAliasSnapshot(),
    })
  })

  route.post("/aliases", async (c) => {
    const payload = await c.req.json<CreateModelAliasInput>()
    const created = await deps.createAlias(payload)
    return c.json(created, 201)
  })

  route.put("/aliases/:id", async (c) => {
    const id = c.req.param("id")
    const payload = await c.req.json<UpdateModelAliasInput>()
    const updated = await deps.updateAlias(id, payload)
    return c.json(updated)
  })

  route.delete("/aliases/:id", async (c) => {
    const removed = await deps.removeAlias(c.req.param("id"))
    return c.json({ removed })
  })

  route.get("/settings", (c) => {
    return c.json({
      settings: deps.getSettings(),
      sinkConfig: deps.getSinkConfig(),
    })
  })

  route.post("/settings", async (c) => {
    const { entries } = await c.req.json<{ entries: Record<string, string> }>()
    deps.updateSettings(entries)

    const sinkPatch: Partial<RequestSinkConfig> = {}
    const sinkKeyMap: Record<string, keyof RequestSinkConfig> = {
      sink_flush_interval_ms: "flushIntervalMs",
      sink_batch_size: "batchSize",
      sink_max_queue_size: "maxQueueSize",
      sink_max_retry_attempts: "maxRetryAttempts",
      sink_retry_window_ms: "retryWindowMs",
    }

    for (const [metaKey, configKey] of Object.entries(sinkKeyMap)) {
      if (entries[metaKey] !== undefined) {
        const parsed = Number.parseInt(entries[metaKey], 10)
        if (Number.isFinite(parsed) && parsed > 0) {
          ;(sinkPatch as Record<string, number>)[configKey] = parsed
        }
      }
    }

    if (Object.keys(sinkPatch).length > 0) {
      deps.reconfigureSink(sinkPatch)
    }

    return c.json({ ok: true })
  })

  return route
}
