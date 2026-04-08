import { Hono } from "hono"

import type {
  CreateModelMappingInput,
  UpdateModelMappingInput,
} from "~/db/model-mappings"
import type {
  ModelBreakdownRow,
  RecentRequestRow,
  RequestOverview,
} from "~/db/request-logs"
import type { ModelMappingRecord } from "~/lib/model-mapping-store"
import type { CopilotUsageResponse } from "~/services/github/get-copilot-usage"

interface DashboardRouteDeps {
  getUsage(): Promise<CopilotUsageResponse>
  getOverview(): Promise<RequestOverview>
  getModelBreakdown(): Promise<Array<ModelBreakdownRow>>
  getRecentRequests(options: {
    limit: number
    offset: number
  }): Promise<Array<RecentRequestRow>>
  listMappings(): Promise<Array<ModelMappingRecord>>
  createMapping(input: CreateModelMappingInput): Promise<ModelMappingRecord>
  updateMapping(
    id: string,
    input: UpdateModelMappingInput,
  ): Promise<ModelMappingRecord>
  removeMapping(id: string): Promise<boolean>
  getMappingSnapshot(): {
    version: number
    count: number
    enabledCount: number
    loadedAt: string | null
    updatedAt: string | null
  }
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

  route.get("/mappings", async (c) => {
    const data = await deps.listMappings()
    return c.json({
      data,
      meta: deps.getMappingSnapshot(),
    })
  })

  route.post("/mappings", async (c) => {
    const payload = await c.req.json<CreateModelMappingInput>()
    const created = await deps.createMapping(payload)
    return c.json(created, 201)
  })

  route.put("/mappings/:id", async (c) => {
    const id = c.req.param("id")
    const payload = await c.req.json<UpdateModelMappingInput>()
    const updated = await deps.updateMapping(id, payload)
    return c.json(updated)
  })

  route.delete("/mappings/:id", async (c) => {
    const removed = await deps.removeMapping(c.req.param("id"))
    return c.json({ removed })
  })

  return route
}
