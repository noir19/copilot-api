export interface RequestLogRecord {
  timestamp: string
  route: string
  modelRaw: string | null
  modelDisplay: string | null
  stream: boolean
  status: "success" | "error"
  statusCode: number
  latencyMs: number | null
  inputTokens: number | null
  outputTokens: number | null
  totalTokens: number | null
  errorMessage: string | null
  accountType: string
}

interface PendingBatch {
  records: Array<RequestLogRecord>
  firstQueuedAt: number
  attempts: number
}

export interface RequestSinkClock {
  now(): number
}

interface RequestSinkOptions {
  writeBatch(records: Array<RequestLogRecord>): Promise<void>
  flushIntervalMs: number
  batchSize: number
  maxQueueSize: number
  maxRetryAttempts: number
  retryWindowMs: number
  clock?: RequestSinkClock
}

interface RequestSinkMetrics {
  queued: number
  retrying: number
  dropped: number
}

interface RequestSinkSnapshot {
  queued: Array<RequestLogRecord>
  retrying: Array<RequestLogRecord>
}

const defaultClock: RequestSinkClock = {
  now: () => Date.now(),
}

export function createRequestSink(options: RequestSinkOptions) {
  const clock = options.clock ?? defaultClock
  const queue: Array<RequestLogRecord> = []
  const retryQueue: Array<PendingBatch> = []
  const metrics: RequestSinkMetrics = {
    queued: 0,
    retrying: 0,
    dropped: 0,
  }

  const trimQueue = () => {
    while (queue.length > options.maxQueueSize) {
      queue.shift()
      metrics.dropped += 1
    }
    metrics.queued = queue.length
  }

  const markBatchForRetry = (batch: PendingBatch) => {
    retryQueue.push(batch)
    metrics.retrying = retryQueue.reduce(
      (count, pending) => count + pending.records.length,
      0,
    )
  }

  const shouldDropBatch = (batch: PendingBatch) => {
    const ageMs = clock.now() - batch.firstQueuedAt
    return (
      batch.attempts >= options.maxRetryAttempts
      || ageMs > options.retryWindowMs
    )
  }

  const flushBatch = async (records: Array<RequestLogRecord>) => {
    if (records.length === 0) {
      return
    }

    const batch: PendingBatch = {
      records,
      firstQueuedAt: clock.now(),
      attempts: 1,
    }

    try {
      await options.writeBatch(records)
    } catch {
      markBatchForRetry(batch)
    }
  }

  return {
    enqueue(record: RequestLogRecord): void {
      queue.push(record)
      trimQueue()
    },

    async flushNow(): Promise<void> {
      const records = queue.splice(0, options.batchSize)
      metrics.queued = queue.length
      await flushBatch(records)
    },

    async retryFailed(): Promise<void> {
      const pending = retryQueue.splice(0)

      for (const batch of pending) {
        if (shouldDropBatch(batch)) {
          metrics.dropped += batch.records.length
          continue
        }

        const nextBatch: PendingBatch = {
          ...batch,
          attempts: batch.attempts + 1,
        }

        try {
          await options.writeBatch(batch.records)
        } catch {
          if (shouldDropBatch(nextBatch)) {
            metrics.dropped += nextBatch.records.length
          } else {
            retryQueue.push(nextBatch)
          }
        }
      }

      metrics.retrying = retryQueue.reduce(
        (count, batch) => count + batch.records.length,
        0,
      )
    },

    getMetrics(): RequestSinkMetrics {
      return {
        ...metrics,
      }
    },

    getSnapshot(): RequestSinkSnapshot {
      return {
        queued: [...queue],
        retrying: retryQueue.flatMap((batch) => batch.records),
      }
    },
  }
}
