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

interface RequestSinkTimerApi {
  setInterval(handler: () => void, delayMs: number): TimerHandle
  clearInterval(handle: TimerHandle): void
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

type TimerHandle = ReturnType<typeof setInterval>

const defaultClock: RequestSinkClock = {
  now: () => Date.now(),
}

const defaultTimers: RequestSinkTimerApi = {
  setInterval(handler, delayMs) {
    return setInterval(handler, delayMs)
  },
  clearInterval(handle) {
    clearInterval(handle)
  },
}

function recalculateRetrying(retryQueue: Array<PendingBatch>): number {
  return retryQueue.reduce(
    (count, pending) => count + pending.records.length,
    0,
  )
}

function shouldDropBatch(
  batch: PendingBatch,
  clock: RequestSinkClock,
  cfg: Pick<RequestSinkConfig, "maxRetryAttempts" | "retryWindowMs">,
): boolean {
  const ageMs = clock.now() - batch.firstQueuedAt
  return batch.attempts >= cfg.maxRetryAttempts || ageMs > cfg.retryWindowMs
}

async function flushBatch(
  records: Array<RequestLogRecord>,
  writeBatch: (records: Array<RequestLogRecord>) => Promise<void>,
  clock: RequestSinkClock,
): Promise<PendingBatch | null> {
  if (records.length === 0) {
    return null
  }

  const batch: PendingBatch = {
    records,
    firstQueuedAt: clock.now(),
    attempts: 1,
  }

  try {
    await writeBatch(records)
    return null
  } catch {
    return batch
  }
}

export type RequestSinkConfig = Pick<
  RequestSinkOptions,
  | "flushIntervalMs"
  | "batchSize"
  | "maxQueueSize"
  | "maxRetryAttempts"
  | "retryWindowMs"
>

export function createRequestSink(options: RequestSinkOptions) {
  const clock = options.clock ?? defaultClock
  const timers = defaultTimers
  const writeBatch = (records: Array<RequestLogRecord>) =>
    options.writeBatch(records)
  const config: RequestSinkConfig = {
    flushIntervalMs: options.flushIntervalMs,
    batchSize: options.batchSize,
    maxQueueSize: options.maxQueueSize,
    maxRetryAttempts: options.maxRetryAttempts,
    retryWindowMs: options.retryWindowMs,
  }
  const queue: Array<RequestLogRecord> = []
  const retryQueue: Array<PendingBatch> = []
  const metrics: RequestSinkMetrics = {
    queued: 0,
    retrying: 0,
    dropped: 0,
  }

  const trimQueue = () => {
    while (queue.length > config.maxQueueSize) {
      queue.shift()
      metrics.dropped += 1
    }
    metrics.queued = queue.length
  }

  const markBatchForRetry = (batch: PendingBatch) => {
    retryQueue.push(batch)
    metrics.retrying = recalculateRetrying(retryQueue)
  }

  let flushTimer: TimerHandle | undefined

  const enqueue = (record: RequestLogRecord) => {
    queue.push(record)
    trimQueue()
  }

  const flushNow = async () => {
    const records = queue.splice(0, config.batchSize)
    metrics.queued = queue.length
    const failedBatch = await flushBatch(records, writeBatch, clock)
    if (failedBatch) {
      markBatchForRetry(failedBatch)
    }
  }

  const retryFailed = async () => {
    const pending = retryQueue.splice(0)

    for (const batch of pending) {
      if (shouldDropBatch(batch, clock, config)) {
        metrics.dropped += batch.records.length
        continue
      }

      const nextBatch: PendingBatch = {
        ...batch,
        attempts: batch.attempts + 1,
      }

      try {
        await writeBatch(batch.records)
      } catch {
        if (shouldDropBatch(nextBatch, clock, config)) {
          metrics.dropped += nextBatch.records.length
        } else {
          retryQueue.push(nextBatch)
        }
      }
    }

    metrics.retrying = recalculateRetrying(retryQueue)
  }

  const start = (flush: () => Promise<void>, retry: () => Promise<void>) => {
    if (flushTimer) {
      return
    }

    flushTimer = timers.setInterval(() => {
      void flush()
      void retry()
    }, config.flushIntervalMs)
  }

  const stop = () => {
    if (!flushTimer) {
      return
    }

    timers.clearInterval(flushTimer)
    flushTimer = undefined
  }

  const getMetrics = (): RequestSinkMetrics => ({
    ...metrics,
  })

  const getSnapshot = (): RequestSinkSnapshot => ({
    queued: [...queue],
    retrying: retryQueue.flatMap((batch) => batch.records),
  })

  return {
    enqueue,
    flushNow,
    retryFailed,
    getMetrics,
    getSnapshot,
    getConfig(): RequestSinkConfig {
      return { ...config }
    },
    reconfigure(patch: Partial<RequestSinkConfig>) {
      const restartTimer =
        patch.flushIntervalMs !== undefined &&
        patch.flushIntervalMs !== config.flushIntervalMs
      Object.assign(config, patch)
      if (restartTimer && flushTimer) {
        stop()
        start(flushNow, retryFailed)
      }
    },
    start() {
      start(flushNow, retryFailed)
    },
    stop,
  }
}
