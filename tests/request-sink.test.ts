import { describe, expect, test } from "bun:test"

import {
  createRequestSink,
  type RequestLogRecord,
  type RequestSinkClock,
} from "~/db/request-sink"

function createRecord(
  overrides: Partial<RequestLogRecord> = {},
): RequestLogRecord {
  return {
    timestamp: "2026-04-08T13:00:00.000Z",
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
    ...overrides,
  }
}

describe("request sink", () => {
  test("persists records asynchronously on flush", async () => {
    const persisted: Array<RequestLogRecord> = []
    const sink = createRequestSink({
      writeBatch(records) {
        persisted.push(...records)
        return Promise.resolve()
      },
      flushIntervalMs: 10_000,
      batchSize: 100,
      maxQueueSize: 10,
      maxRetryAttempts: 3,
      retryWindowMs: 60_000,
    })

    sink.enqueue(createRecord())

    expect(persisted).toHaveLength(0)

    await sink.flushNow()

    expect(persisted).toHaveLength(1)
    expect(persisted[0]?.modelRaw).toBe("claude-sonnet-4-5")
    expect(sink.getMetrics().queued).toBe(0)
  })

  test("retries failed batches before succeeding", async () => {
    const persisted: Array<RequestLogRecord> = []
    let attempts = 0

    const sink = createRequestSink({
      writeBatch(records) {
        attempts += 1
        if (attempts < 3) {
          return Promise.reject(new Error("database is locked"))
        }

        persisted.push(...records)
        return Promise.resolve()
      },
      flushIntervalMs: 10_000,
      batchSize: 100,
      maxQueueSize: 10,
      maxRetryAttempts: 3,
      retryWindowMs: 60_000,
    })

    sink.enqueue(createRecord())

    await sink.flushNow()
    expect(attempts).toBe(1)
    expect(persisted).toHaveLength(0)
    expect(sink.getMetrics().retrying).toBe(1)

    await sink.retryFailed()
    expect(attempts).toBe(2)
    expect(persisted).toHaveLength(0)

    await sink.retryFailed()
    expect(attempts).toBe(3)
    expect(persisted).toHaveLength(1)
    expect(sink.getMetrics().retrying).toBe(0)
  })

  test("drops records that exceed retry window", async () => {
    let now = 0
    const clock: RequestSinkClock = {
      now: () => now,
    }

    const sink = createRequestSink({
      writeBatch() {
        return Promise.reject(new Error("still failing"))
      },
      flushIntervalMs: 10_000,
      batchSize: 100,
      maxQueueSize: 10,
      maxRetryAttempts: 10,
      retryWindowMs: 1000,
      clock,
    })

    sink.enqueue(createRecord())

    await sink.flushNow()
    expect(sink.getMetrics().retrying).toBe(1)

    now = 1500
    await sink.retryFailed()

    expect(sink.getMetrics().retrying).toBe(0)
    expect(sink.getMetrics().dropped).toBe(1)
  })

  test("drops oldest queued records when queue limit is exceeded", () => {
    const sink = createRequestSink({
      writeBatch: async () => {},
      flushIntervalMs: 10_000,
      batchSize: 100,
      maxQueueSize: 2,
      maxRetryAttempts: 3,
      retryWindowMs: 60_000,
    })

    sink.enqueue(createRecord({ modelRaw: "first" }))
    sink.enqueue(createRecord({ modelRaw: "second" }))
    sink.enqueue(createRecord({ modelRaw: "third" }))

    const snapshot = sink.getSnapshot()
    expect(snapshot.queued.map((record) => record.modelRaw)).toEqual([
      "second",
      "third",
    ])
    expect(sink.getMetrics().dropped).toBe(1)
  })

  test("flushes queued records on the background interval", async () => {
    const persisted: Array<RequestLogRecord> = []
    const sink = createRequestSink({
      writeBatch(records) {
        persisted.push(...records)
        return Promise.resolve()
      },
      flushIntervalMs: 10,
      batchSize: 100,
      maxQueueSize: 10,
      maxRetryAttempts: 3,
      retryWindowMs: 60_000,
    })

    sink.start()
    sink.enqueue(createRecord())

    await new Promise((resolve) => setTimeout(resolve, 30))

    sink.stop()
    expect(persisted).toHaveLength(1)
  })
})
