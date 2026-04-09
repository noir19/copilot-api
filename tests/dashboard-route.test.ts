import { describe, expect, test } from "bun:test"
import { Hono } from "hono"
import { createDashboardRoute } from "~/routes/dashboard/route"
import type { CopilotUsageResponse } from "~/services/github/get-copilot-usage"

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
      createAlias(input) {
        return Promise.resolve({
          id: "alias-2",
          sourceModel: input.sourceModel,
          targetModel: input.targetModel,
          enabled: input.enabled,
          createdAt: "2026-04-08T12:00:00.000Z",
          updatedAt: "2026-04-08T12:00:00.000Z",
        })
      },
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
      getTimeSeries() {
        return Promise.resolve([
          {
            bucket: "2026-04-08T00:00:00Z",
            requests: 7,
            tokens: 1000,
            errors: 1,
          },
        ])
      },
      listAliases() {
        return Promise.resolve([
          {
            id: "alias-1",
            sourceModel: "claude-sonnet",
            targetModel: "claude-sonnet-4-5",
            enabled: true,
            createdAt: "2026-04-08T11:00:00.000Z",
            updatedAt: "2026-04-08T11:00:00.000Z",
          },
        ])
      },
      countRequests() {
        return Promise.resolve(1)
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
      removeAlias() {
        return Promise.resolve(true)
      },
      updateAlias(id, input) {
        return Promise.resolve({
          id,
          sourceModel: input.sourceModel,
          targetModel: input.targetModel,
          enabled: input.enabled,
          createdAt: "2026-04-08T12:00:00.000Z",
          updatedAt: "2026-04-08T12:05:00.000Z",
        })
      },
      getAliasSnapshot() {
        return {
          version: 1,
          count: 1,
          enabledCount: 1,
          loadedAt: "2026-04-08T11:00:00.000Z",
          updatedAt: "2026-04-08T11:00:00.000Z",
        }
      },
      getSettings() {
        return {
          request_log_retention_days: "15",
        }
      },
      updateSettings() {},
      reconfigureSink() {},
      getSinkConfig() {
        return {
          flushIntervalMs: 500,
          batchSize: 100,
          maxQueueSize: 10000,
          maxRetryAttempts: 5,
          retryWindowMs: 120000,
        }
      },
    }),
  )

  return app
}

function createMutableMappingsApp(): Hono {
  const aliases = [
    {
      id: "alias-1",
      sourceModel: "claude-sonnet",
      targetModel: "claude-sonnet-4-5",
      enabled: true,
      createdAt: "2026-04-08T11:00:00.000Z",
      updatedAt: "2026-04-08T11:00:00.000Z",
    },
  ]

  const app = new Hono()
  app.route(
    "/api/dashboard",
    createDashboardRoute({
      createAlias(input) {
        const created = {
          id: "alias-2",
          sourceModel: input.sourceModel,
          targetModel: input.targetModel,
          enabled: input.enabled,
          createdAt: "2026-04-08T12:00:00.000Z",
          updatedAt: "2026-04-08T12:00:00.000Z",
        }
        aliases.push(created)
        return Promise.resolve(created)
      },
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
      getTimeSeries() {
        return Promise.resolve([])
      },
      listAliases() {
        return Promise.resolve(aliases)
      },
      countRequests() {
        return Promise.resolve(aliases.length)
      },
      getRecentRequests() {
        return Promise.resolve([])
      },
      removeAlias(id) {
        const index = aliases.findIndex((item) => item.id === id)
        if (index === -1) {
          return Promise.resolve(false)
        }

        aliases.splice(index, 1)
        return Promise.resolve(true)
      },
      updateAlias(id, input) {
        const alias = aliases.find((item) => item.id === id)
        if (!alias) {
          throw new Error("missing alias")
        }

        alias.sourceModel = input.sourceModel
        alias.targetModel = input.targetModel
        alias.enabled = input.enabled
        alias.updatedAt = "2026-04-08T12:05:00.000Z"
        return Promise.resolve(alias)
      },
      getAliasSnapshot() {
        return {
          version: 1,
          count: aliases.length,
          enabledCount: aliases.filter((alias) => alias.enabled).length,
          loadedAt: "2026-04-08T11:00:00.000Z",
          updatedAt: "2026-04-08T11:00:00.000Z",
        }
      },
      getSettings() {
        return {
          request_log_retention_days: "15",
        }
      },
      updateSettings() {},
      reconfigureSink() {},
      getSinkConfig() {
        return {
          flushIntervalMs: 500,
          batchSize: 100,
          maxQueueSize: 10000,
          maxRetryAttempts: 5,
          retryWindowMs: 120000,
        }
      },
    }),
  )

  return app
}

describe("dashboard route", () => {
  test("returns overview, models, requests, aliases, and time-series data", async () => {
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

    const aliasesResponse = await app.request("/api/dashboard/aliases")
    const aliases = (await aliasesResponse.json()) as DashboardResponse<
      Array<unknown>
    >
    expect(aliases.data).toHaveLength(1)
    expect(aliases.meta?.version).toBe(1)

    const timeSeriesResponse = await app.request(
      "/api/dashboard/time-series?bucket=1440&limit=7",
    )
    const timeSeries = (await timeSeriesResponse.json()) as DashboardResponse<
      Array<unknown>
    >
    expect(timeSeries.data).toHaveLength(1)

    const usageResponse = await app.request("/api/dashboard/usage")
    const usage = (await usageResponse.json()) as CopilotUsageResponse
    expect(usage.copilot_plan).toBe("individual")
  })

  test("supports creating, updating, and deleting model aliases", async () => {
    const app = createMutableMappingsApp()

    const createResponse = await app.request("/api/dashboard/aliases", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sourceModel: "haiku",
        targetModel: "claude-haiku-4-5",
        enabled: true,
      }),
    })
    expect(createResponse.status).toBe(201)

    const updateResponse = await app.request("/api/dashboard/aliases/alias-2", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sourceModel: "haiku",
        targetModel: "claude-haiku-4-5-latest",
        enabled: false,
      }),
    })
    expect(updateResponse.status).toBe(200)

    const deleteResponse = await app.request("/api/dashboard/aliases/alias-2", {
      method: "DELETE",
    })
    expect(deleteResponse.status).toBe(200)

    const listResponse = await app.request("/api/dashboard/aliases")
    const list = (await listResponse.json()) as DashboardResponse<
      Array<{ id: string }>
    >
    expect(list.data).toHaveLength(1)
    expect(list.data[0]?.id).toBe("alias-1")
  })
})
