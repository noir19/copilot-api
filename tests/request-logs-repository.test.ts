import { Database } from "bun:sqlite"
import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { createRequestLogRepository } from "~/db/request-logs"
import { initDatabase } from "~/db/schema"

describe("request logs repository", () => {
  let tempDir: string
  let db: Database
  let repository: ReturnType<typeof createRequestLogRepository>

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "copilot-api-logs-"))
    db = new Database(path.join(tempDir, "copilot-api.db"))
    initDatabase(db)
    repository = createRequestLogRepository(db)
  })

  afterEach(async () => {
    db.close()
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  test("computes overview metrics from persisted request logs", async () => {
    await repository.insertBatch([
      {
        timestamp: "2026-04-08T12:00:00.000Z",
        route: "/v1/chat/completions",
        modelRaw: "claude-sonnet-4-5",
        modelDisplay: "Claude Sonnet 4.5",
        stream: false,
        status: "success",
        statusCode: 200,
        latencyMs: 120,
        inputTokens: 100,
        outputTokens: 200,
        totalTokens: 300,
        errorMessage: null,
        accountType: "individual",
      },
      {
        timestamp: "2026-04-08T12:05:00.000Z",
        route: "/v1/messages",
        modelRaw: "gpt-4.1",
        modelDisplay: "GPT 4.1",
        stream: true,
        status: "error",
        statusCode: 500,
        latencyMs: 300,
        inputTokens: 50,
        outputTokens: 0,
        totalTokens: 50,
        errorMessage: "upstream failed",
        accountType: "individual",
      },
    ])

    const overview = await repository.getOverview()

    expect(overview.totalRequests).toBe(2)
    expect(overview.successRate).toBe(50)
    expect(overview.errorRate).toBe(50)
    expect(overview.totalTokens).toBe(350)
    expect(overview.averageLatencyMs).toBe(210)
  })

  test("aggregates requests by display model name", async () => {
    await repository.insertBatch([
      {
        timestamp: "2026-04-08T12:00:00.000Z",
        route: "/v1/chat/completions",
        modelRaw: "claude-sonnet-4-5",
        modelDisplay: "Claude Sonnet",
        stream: false,
        status: "success",
        statusCode: 200,
        latencyMs: 120,
        inputTokens: 100,
        outputTokens: 100,
        totalTokens: 200,
        errorMessage: null,
        accountType: "individual",
      },
      {
        timestamp: "2026-04-08T12:10:00.000Z",
        route: "/v1/messages",
        modelRaw: "claude-sonnet-4-5",
        modelDisplay: "Claude Sonnet",
        stream: true,
        status: "success",
        statusCode: 200,
        latencyMs: 150,
        inputTokens: 50,
        outputTokens: 50,
        totalTokens: 100,
        errorMessage: null,
        accountType: "individual",
      },
    ])

    const models = await repository.getModelBreakdown()

    expect(models).toHaveLength(1)
    expect(models[0]?.modelDisplay).toBe("Claude Sonnet")
    expect(models[0]?.requestCount).toBe(2)
    expect(models[0]?.totalTokens).toBe(300)
  })

  test("returns recent requests sorted by newest first", async () => {
    await repository.insertBatch([
      {
        timestamp: "2026-04-08T12:00:00.000Z",
        route: "/v1/chat/completions",
        modelRaw: "claude-sonnet-4-5",
        modelDisplay: "Claude Sonnet 4.5",
        stream: false,
        status: "success",
        statusCode: 200,
        latencyMs: 120,
        inputTokens: 100,
        outputTokens: 200,
        totalTokens: 300,
        errorMessage: null,
        accountType: "individual",
      },
      {
        timestamp: "2026-04-08T12:05:00.000Z",
        route: "/v1/messages",
        modelRaw: "gpt-4.1",
        modelDisplay: "GPT 4.1",
        stream: true,
        status: "error",
        statusCode: 500,
        latencyMs: 300,
        inputTokens: 50,
        outputTokens: 0,
        totalTokens: 50,
        errorMessage: "upstream failed",
        accountType: "individual",
      },
    ])

    const requests = await repository.getRecentRequests({
      limit: 10,
      offset: 0,
    })

    expect(requests).toHaveLength(2)
    expect(requests[0]?.modelDisplay).toBe("GPT 4.1")
    expect(requests[1]?.modelDisplay).toBe("Claude Sonnet 4.5")
  })

  test("deletes request logs older than the retention cutoff", async () => {
    await repository.insertBatch([
      {
        timestamp: "2026-03-01T12:00:00.000Z",
        route: "/v1/chat/completions",
        modelRaw: "claude-sonnet-4-5",
        modelDisplay: "Claude Sonnet 4.5",
        stream: false,
        status: "success",
        statusCode: 200,
        latencyMs: 120,
        inputTokens: 100,
        outputTokens: 200,
        totalTokens: 300,
        errorMessage: null,
        accountType: "individual",
      },
      {
        timestamp: "2026-04-08T12:05:00.000Z",
        route: "/v1/messages",
        modelRaw: "gpt-4.1",
        modelDisplay: "GPT 4.1",
        stream: true,
        status: "error",
        statusCode: 500,
        latencyMs: 300,
        inputTokens: 50,
        outputTokens: 0,
        totalTokens: 50,
        errorMessage: "upstream failed",
        accountType: "individual",
      },
    ])

    const deleted = await repository.deleteOlderThan("2026-03-24T00:00:00.000Z")
    const requests = await repository.getRecentRequests({
      limit: 10,
      offset: 0,
    })

    expect(deleted).toBe(1)
    expect(requests).toHaveLength(1)
    expect(requests[0]?.modelDisplay).toBe("GPT 4.1")
  })

  test("fills missing time-series buckets with zeros", async () => {
    await repository.insertBatch([
      {
        timestamp: "2026-04-07T12:00:00.000Z",
        route: "/v1/chat/completions",
        modelRaw: "claude-sonnet-4-5",
        modelDisplay: "Claude Sonnet 4.5",
        stream: false,
        status: "success",
        statusCode: 200,
        latencyMs: 120,
        inputTokens: 100,
        outputTokens: 200,
        totalTokens: 300,
        errorMessage: null,
        accountType: "individual",
      },
      {
        timestamp: "2026-04-09T12:00:00.000Z",
        route: "/v1/chat/completions",
        modelRaw: "claude-sonnet-4-5",
        modelDisplay: "Claude Sonnet 4.5",
        stream: false,
        status: "error",
        statusCode: 500,
        latencyMs: 180,
        inputTokens: 50,
        outputTokens: 0,
        totalTokens: 50,
        errorMessage: "upstream failed",
        accountType: "individual",
      },
    ])

    const series = await repository.getTimeSeries({
      bucketMinutes: 1440,
      limit: 3,
    })

    expect(series).toHaveLength(3)
    expect(series[0]).toEqual({
      bucket: "2026-04-07T00:00:00Z",
      requests: 1,
      tokens: 300,
      errors: 0,
    })
    expect(series[1]).toEqual({
      bucket: "2026-04-08T00:00:00Z",
      requests: 0,
      tokens: 0,
      errors: 0,
    })
    expect(series[2]).toEqual({
      bucket: "2026-04-09T00:00:00Z",
      requests: 1,
      tokens: 50,
      errors: 1,
    })
  })
})
