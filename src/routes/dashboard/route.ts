import { Hono } from "hono"

import type {
  CreateModelAliasInput,
  UpdateModelAliasInput,
} from "~/db/model-aliases"
import type {
  CreateModelMappingInput,
  UpdateModelMappingInput,
} from "~/db/model-mappings"
import type {
  ModelBreakdownRow,
  RecentRequestRow,
  RequestOverview,
  TimeSeriesPoint,
} from "~/db/request-logs"
import type { RequestSinkConfig } from "~/db/request-sink"
import type { ModelAliasRecord } from "~/lib/model-alias-store"
import type { ModelMappingRecord } from "~/lib/model-mapping-store"
import type { CopilotUsageResponse } from "~/services/github/get-copilot-usage"

interface DashboardRouteDeps {
  createAlias(input: CreateModelAliasInput): Promise<ModelAliasRecord>
  getUsage(): Promise<CopilotUsageResponse>
  getOverview(): Promise<RequestOverview>
  getModelBreakdown(): Promise<Array<ModelBreakdownRow>>
  listAliases(): Promise<Array<ModelAliasRecord>>
  getRecentRequests(options: {
    limit: number
    offset: number
  }): Promise<Array<RecentRequestRow>>
  listMappings(): Promise<Array<ModelMappingRecord>>
  removeAlias(id: string): Promise<boolean>
  createMapping(input: CreateModelMappingInput): Promise<ModelMappingRecord>
  updateMapping(
    id: string,
    input: UpdateModelMappingInput,
  ): Promise<ModelMappingRecord>
  updateAlias(
    id: string,
    input: UpdateModelAliasInput,
  ): Promise<ModelAliasRecord>
  removeMapping(id: string): Promise<boolean>
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
  getMappingSnapshot(): {
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

  route.get("/overview", async (c) => {
    const overview = await deps.getOverview()
    return c.json(overview)
  })

  route.get("/usage", async (c) => {
    const usage = await deps.getUsage()
    return c.json(usage)
  })

  route.get("/models", async (c) => {
    const data = await deps.getModelBreakdown()
    return c.json({ data })
  })

  route.get("/requests", async (c) => {
    const limit = Number.parseInt(c.req.query("limit") ?? "50", 10)
    const offset = Number.parseInt(c.req.query("offset") ?? "0", 10)
    const data = await deps.getRecentRequests({ limit, offset })
    return c.json({ data, limit, offset })
  })

  route.get("/time-series", async (c) => {
    const bucketMinutes = Number.parseInt(c.req.query("bucket") ?? "60", 10)
    const limit = Number.parseInt(c.req.query("limit") ?? "168", 10)
    const data = await deps.getTimeSeries({ bucketMinutes, limit })
    return c.json({ data })
  })

  route.get("/mappings", async (c) => {
    const data = await deps.listMappings()
    return c.json({
      data,
      meta: deps.getMappingSnapshot(),
    })
  })

  route.get("/aliases", async (c) => {
    const data = await deps.listAliases()
    return c.json({
      data,
      meta: deps.getAliasSnapshot(),
    })
  })

  route.post("/mappings", async (c) => {
    const payload = await c.req.json<CreateModelMappingInput>()
    const created = await deps.createMapping(payload)
    return c.json(created, 201)
  })

  route.post("/aliases", async (c) => {
    const payload = await c.req.json<CreateModelAliasInput>()
    const created = await deps.createAlias(payload)
    return c.json(created, 201)
  })

  route.put("/mappings/:id", async (c) => {
    const id = c.req.param("id")
    const payload = await c.req.json<UpdateModelMappingInput>()
    const updated = await deps.updateMapping(id, payload)
    return c.json(updated)
  })

  route.put("/aliases/:id", async (c) => {
    const id = c.req.param("id")
    const payload = await c.req.json<UpdateModelAliasInput>()
    const updated = await deps.updateAlias(id, payload)
    return c.json(updated)
  })

  route.delete("/mappings/:id", async (c) => {
    const removed = await deps.removeMapping(c.req.param("id"))
    return c.json({ removed })
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
