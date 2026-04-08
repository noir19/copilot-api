import { describe, expect, test } from "bun:test"
import { Hono } from "hono"

import type { CopilotUsageResponse } from "~/services/github/get-copilot-usage"

import { createDashboardRoute } from "~/routes/dashboard/route"

interface DashboardResponse<T> {
  data: T
  meta?: {
    version: number
    count: number
    enabledCount: number
    loadedAt: string | null
    updatedAt: string | null
  }
}

function createUsageResponse(): CopilotUsageResponse {
  return {
    access_type_sku: "copilot_individual",
    analytics_tracking_id: "track-1",
    assigned_date: "2026-04-01",
    can_signup_for_limited: false,
    chat_enabled: true,
    copilot_plan: "individual",
    organization_login_list: [],
    organization_list: [],
    quota_reset_date: "2026-04-30",
    quota_snapshots: {
      chat: {
        entitlement: 100,
        overage_count: 0,
        overage_permitted: false,
        percent_remaining: 80,
        quota_id: "chat",
        quota_remaining: 80,
        remaining: 80,
        unlimited: false,
      },
      completions: {
        entitlement: 100,
        overage_count: 0,
        overage_permitted: false,
        percent_remaining: 70,
        quota_id: "completions",
        quota_remaining: 70,
        remaining: 70,
        unlimited: false,
      },
      premium_interactions: {
        entitlement: 100,
        overage_count: 0,
        overage_permitted: false,
        percent_remaining: 60,
        quota_id: "premium",
        quota_remaining: 60,
        remaining: 60,
        unlimited: false,
      },
    },
  }
}

function createReadOnlyApp(): Hono {
  const app = new Hono()
  app.route(
    "/api/dashboard",
    createDashboardRoute({
      getUsage() {
        return Promise.resolve(createUsageResponse())
      },
      getOverview() {
        return Promise.resolve({
          totalRequests: 10,
          successRate: 90,
          errorRate: 10,
          totalTokens: 1234,
          averageLatencyMs: 180,
        })
      },
      getModelBreakdown() {
        return Promise.resolve([
          {
            modelRaw: "claude-sonnet-4-5",
            modelDisplay: "Claude Sonnet",
            requestCount: 7,
            totalTokens: 1000,
            lastRequestedAt: "2026-04-08T12:00:00.000Z",
          },
        ])
      },
      getRecentRequests() {
        return Promise.resolve([
          {
            id: "req-1",
            timestamp: "2026-04-08T12:00:00.000Z",
            route: "/v1/chat/completions",
            modelRaw: "claude-sonnet-4-5",
            modelDisplay: "Claude Sonnet",
            stream: false,
            status: "success",
            statusCode: 200,
            latencyMs: 180,
            inputTokens: 10,
            outputTokens: 20,
            totalTokens: 30,
            errorMessage: null,
            accountType: "individual",
          },
        ])
      },
      listMappings() {
        return Promise.resolve([
          {
            id: "map-1",
            sourceModel: "claude-sonnet-4-5",
            displayName: "Claude Sonnet",
            enabled: true,
            createdAt: "2026-04-08T11:00:00.000Z",
            updatedAt: "2026-04-08T11:00:00.000Z",
          },
        ])
      },
      createMapping(input) {
        return Promise.resolve({
          id: "map-2",
          sourceModel: input.sourceModel,
          displayName: input.displayName,
          enabled: input.enabled,
          createdAt: "2026-04-08T12:00:00.000Z",
          updatedAt: "2026-04-08T12:00:00.000Z",
        })
      },
      updateMapping(id, input) {
        return Promise.resolve({
          id,
          sourceModel: input.sourceModel,
          displayName: input.displayName,
          enabled: input.enabled,
          createdAt: "2026-04-08T12:00:00.000Z",
          updatedAt: "2026-04-08T12:05:00.000Z",
        })
      },
      removeMapping() {
        return Promise.resolve(true)
      },
      getMappingSnapshot() {
        return {
          version: 1,
          count: 1,
          enabledCount: 1,
          loadedAt: "2026-04-08T11:00:00.000Z",
          updatedAt: "2026-04-08T11:00:00.000Z",
        }
      },
    }),
  )

  return app
}

function createMutableMappingsApp(): Hono {
  const mappings = [
    {
      id: "map-1",
      sourceModel: "claude-sonnet-4-5",
      displayName: "Claude Sonnet",
      enabled: true,
      createdAt: "2026-04-08T11:00:00.000Z",
      updatedAt: "2026-04-08T11:00:00.000Z",
    },
  ]

  const app = new Hono()
  app.route(
    "/api/dashboard",
    createDashboardRoute({
      getUsage() {
        return Promise.resolve(createUsageResponse())
      },
      getOverview() {
        return Promise.resolve({
          totalRequests: 0,
          successRate: 0,
          errorRate: 0,
          totalTokens: 0,
          averageLatencyMs: 0,
        })
      },
      getModelBreakdown() {
        return Promise.resolve([])
      },
      getRecentRequests() {
        return Promise.resolve([])
      },
      listMappings() {
        return Promise.resolve(mappings)
      },
      createMapping(input) {
        const created = {
          id: "map-2",
          sourceModel: input.sourceModel,
          displayName: input.displayName,
          enabled: input.enabled,
          createdAt: "2026-04-08T12:00:00.000Z",
          updatedAt: "2026-04-08T12:00:00.000Z",
        }
        mappings.push(created)
        return Promise.resolve(created)
      },
      updateMapping(id, input) {
        const mapping = mappings.find((item) => item.id === id)
        if (!mapping) {
          throw new Error("missing mapping")
        }

        mapping.sourceModel = input.sourceModel
        mapping.displayName = input.displayName
        mapping.enabled = input.enabled
        mapping.updatedAt = "2026-04-08T12:05:00.000Z"
        return Promise.resolve(mapping)
      },
      removeMapping(id) {
        const index = mappings.findIndex((item) => item.id === id)
        if (index === -1) {
          return Promise.resolve(false)
        }

        mappings.splice(index, 1)
        return Promise.resolve(true)
      },
      getMappingSnapshot() {
        return {
          version: 1,
          count: mappings.length,
          enabledCount: mappings.filter((mapping) => mapping.enabled).length,
          loadedAt: "2026-04-08T11:00:00.000Z",
          updatedAt: "2026-04-08T11:00:00.000Z",
        }
      },
    }),
  )

  return app
}

describe("dashboard route", () => {
  test("returns overview, models, requests, and mappings data", async () => {
    const app = createReadOnlyApp()

    const overviewResponse = await app.request("/api/dashboard/overview")
    const overview = (await overviewResponse.json()) as {
      totalRequests: number
    }
    expect(overview.totalRequests).toBe(10)

    const modelsResponse = await app.request("/api/dashboard/models")
    const models = (await modelsResponse.json()) as DashboardResponse<
      Array<unknown>
    >
    expect(models.data).toHaveLength(1)

    const requestsResponse = await app.request("/api/dashboard/requests")
    const requests = (await requestsResponse.json()) as DashboardResponse<
      Array<unknown>
    >
    expect(requests.data).toHaveLength(1)

    const mappingsResponse = await app.request("/api/dashboard/mappings")
    const mappings = (await mappingsResponse.json()) as DashboardResponse<
      Array<unknown>
    >
    expect(mappings.data).toHaveLength(1)
    expect(mappings.meta?.version).toBe(1)

    const usageResponse = await app.request("/api/dashboard/usage")
    const usage = (await usageResponse.json()) as CopilotUsageResponse
    expect(usage.copilot_plan).toBe("individual")
  })

  test("supports creating, updating, and deleting model mappings", async () => {
    const app = createMutableMappingsApp()

    const createResponse = await app.request("/api/dashboard/mappings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sourceModel: "gpt-4.1",
        displayName: "GPT 4.1",
        enabled: true,
      }),
    })
    expect(createResponse.status).toBe(201)

    const updateResponse = await app.request("/api/dashboard/mappings/map-2", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sourceModel: "gpt-4.1",
        displayName: "GPT 4.1 Turbo",
        enabled: false,
      }),
    })
    expect(updateResponse.status).toBe(200)

    const deleteResponse = await app.request("/api/dashboard/mappings/map-2", {
      method: "DELETE",
    })
    expect(deleteResponse.status).toBe(200)

    const listResponse = await app.request("/api/dashboard/mappings")
    const list = (await listResponse.json()) as DashboardResponse<
      Array<{ id: string }>
    >
    expect(list.data).toHaveLength(1)
    expect(list.data[0]?.id).toBe("map-1")
  })
})
