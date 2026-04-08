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
} from "~/db/request-logs"
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

  return route
}
