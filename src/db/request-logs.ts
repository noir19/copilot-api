import type { Database } from "bun:sqlite"

import { randomUUID } from "node:crypto"

import type { RequestLogRecord } from "~/db/request-sink"

export interface RequestOverview {
  totalRequests: number
  successRate: number
  errorRate: number
  totalTokens: number
  averageLatencyMs: number
  openRouterEstimatedCostUsd: number
}

export interface ModelBreakdownRow {
  modelRaw: string | null
  modelDisplay: string | null
  requestCount: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  lastRequestedAt: string
  openRouterEstimatedCostUsd: number | null
  openRouterModelId: string | null
}

export interface RecentRequestRow extends RequestLogRecord {
  id: string
}

export interface TimeSeriesPoint {
  bucket: string
  requests: number
  tokens: number
  errors: number
}

interface OverviewRow {
  total_requests: number
  success_count: number
  error_count: number
  total_tokens: number
  average_latency_ms: number | null
}

interface ModelBreakdownDbRow {
  model_raw: string | null
  model_display: string | null
  request_count: number
  input_tokens: number
  output_tokens: number
  total_tokens: number
  last_requested_at: string
}

interface RecentRequestDbRow {
  id: string
  timestamp: string
  route: string
  model_raw: string | null
  model_display: string | null
  stream: number
  status: "success" | "error"
  status_code: number
  latency_ms: number | null
  input_tokens: number | null
  output_tokens: number | null
  total_tokens: number | null
  error_message: string | null
  account_type: string
}

function toRecentRequest(row: RecentRequestDbRow): RecentRequestRow {
  return {
    id: row.id,
    timestamp: row.timestamp,
    route: row.route,
    modelRaw: row.model_raw,
    modelDisplay: row.model_display,
    stream: row.stream === 1,
    status: row.status,
    statusCode: row.status_code,
    latencyMs: row.latency_ms,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    totalTokens: row.total_tokens,
    errorMessage: row.error_message,
    accountType: row.account_type,
  }
}

function insertRequestLogs(
  db: Database,
  records: Array<RequestLogRecord>,
): void {
  const insert = db.query(
    `INSERT INTO request_logs (
      id,
      request_id,
      timestamp,
      route,
      model_raw,
      model_display,
      stream,
      status,
      status_code,
      latency_ms,
      input_tokens,
      output_tokens,
      total_tokens,
      error_message,
      account_type
    ) VALUES (
      $id,
      $request_id,
      $timestamp,
      $route,
      $model_raw,
      $model_display,
      $stream,
      $status,
      $status_code,
      $latency_ms,
      $input_tokens,
      $output_tokens,
      $total_tokens,
      $error_message,
      $account_type
    )`,
  )

  const transaction = db.transaction((batch: Array<RequestLogRecord>) => {
    for (const record of batch) {
      insert.run({
        $id: randomUUID(),
        $request_id: null,
        $timestamp: record.timestamp,
        $route: record.route,
        $model_raw: record.modelRaw,
        $model_display: record.modelDisplay,
        $stream: record.stream ? 1 : 0,
        $status: record.status,
        $status_code: record.statusCode,
        $latency_ms: record.latencyMs,
        $input_tokens: record.inputTokens,
        $output_tokens: record.outputTokens,
        $total_tokens: record.totalTokens,
        $error_message: record.errorMessage,
        $account_type: record.accountType,
      })
    }
  })

  transaction(records)
}

function readOverview(db: Database): RequestOverview {
  const row = db
    .query<OverviewRow, []>(
      `SELECT
         COUNT(*) AS total_requests,
         SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS success_count,
         SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS error_count,
         COALESCE(SUM(total_tokens), 0) AS total_tokens,
         AVG(latency_ms) AS average_latency_ms
       FROM request_logs`,
    )
    .get()

  const totalRequests = row?.total_requests ?? 0
  const successCount = row?.success_count ?? 0
  const errorCount = row?.error_count ?? 0

  return {
    totalRequests,
    successRate: totalRequests > 0 ? (successCount / totalRequests) * 100 : 0,
    errorRate: totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0,
    totalTokens: row?.total_tokens ?? 0,
    averageLatencyMs: Math.round(row?.average_latency_ms ?? 0),
    openRouterEstimatedCostUsd: 0,
  }
}

function readModelBreakdown(db: Database): Array<ModelBreakdownRow> {
  const rows = db
    .query<ModelBreakdownDbRow, []>(
      `SELECT
         model_raw,
         model_display,
         COUNT(*) AS request_count,
         COALESCE(SUM(input_tokens), 0) AS input_tokens,
         COALESCE(SUM(output_tokens), 0) AS output_tokens,
         COALESCE(SUM(total_tokens), 0) AS total_tokens,
         MAX(timestamp) AS last_requested_at
       FROM request_logs
       GROUP BY model_display, model_raw
       ORDER BY request_count DESC, last_requested_at DESC`,
    )
    .all()

  return rows.map((row) => ({
    modelRaw: row.model_raw,
    modelDisplay: row.model_display,
    requestCount: row.request_count,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    totalTokens: row.total_tokens,
    lastRequestedAt: row.last_requested_at,
    openRouterEstimatedCostUsd: null,
    openRouterModelId: null,
  }))
}

export interface RequestLogFilter {
  model?: string
  route?: string
  status?: "success" | "error"
  timeFrom?: string
  timeTo?: string
}

function buildWhereClause(filter: RequestLogFilter): {
  clause: string
  params: Array<string>
} {
  const conditions: Array<string> = []
  const params: Array<string> = []

  if (filter.model) {
    params.push(filter.model)
    conditions.push(`model_raw = ?${params.length}`)
  }
  if (filter.route) {
    params.push(`%${filter.route}%`)
    conditions.push(`route LIKE ?${params.length}`)
  }
  if (filter.status) {
    params.push(filter.status)
    conditions.push(`status = ?${params.length}`)
  }
  if (filter.timeFrom) {
    params.push(filter.timeFrom)
    conditions.push(`timestamp >= ?${params.length}`)
  }
  if (filter.timeTo) {
    params.push(filter.timeTo)
    conditions.push(`timestamp <= ?${params.length}`)
  }

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  }
}

function readFilteredRequests(
  db: Database,
  options: { limit: number; offset: number; filter: RequestLogFilter },
): Array<RecentRequestRow> {
  const { clause, params } = buildWhereClause(options.filter)

  const rows = db
    .query<RecentRequestDbRow, Array<string | number>>(
      `SELECT
         id,
         timestamp,
         route,
         model_raw,
         model_display,
         stream,
         status,
         status_code,
         latency_ms,
         input_tokens,
         output_tokens,
         total_tokens,
         error_message,
         account_type
       FROM request_logs
       ${clause}
       ORDER BY timestamp DESC
       LIMIT ?${params.length + 1} OFFSET ?${params.length + 2}`,
    )
    .all(...params, options.limit, options.offset)

  return rows.map((row) => toRecentRequest(row))
}

function countFilteredRequests(db: Database, filter: RequestLogFilter): number {
  const { clause, params } = buildWhereClause(filter)
  const row = db
    .query<{ cnt: number }, Array<string>>(
      `SELECT COUNT(*) AS cnt FROM request_logs ${clause}`,
    )
    .get(...params)
  return row?.cnt ?? 0
}

interface TimeSeriesDbRow {
  bucket: string
  requests: number
  tokens: number
  errors: number
}

function bucketKind(bucketMinutes: number): "hour" | "day" | "month" {
  if (bucketMinutes >= 43200) return "month"
  if (bucketMinutes >= 1440) return "day"
  return "hour"
}

function formatBucketDate(date: Date, bucketMinutes: number): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")
  const hour = String(date.getUTCHours()).padStart(2, "0")

  switch (bucketKind(bucketMinutes)) {
    case "month":
      return `${year}-${month}-01T00:00:00Z`
    case "day":
      return `${year}-${month}-${day}T00:00:00Z`
    case "hour":
      return `${year}-${month}-${day}T${hour}:00:00Z`
  }
}

function moveBucket(date: Date, bucketMinutes: number, step: number): Date {
  const next = new Date(date)

  switch (bucketKind(bucketMinutes)) {
    case "month":
      next.setUTCMonth(next.getUTCMonth() + step)
      next.setUTCDate(1)
      next.setUTCHours(0, 0, 0, 0)
      return next
    case "day":
      next.setUTCDate(next.getUTCDate() + step)
      next.setUTCHours(0, 0, 0, 0)
      return next
    case "hour":
      next.setUTCHours(next.getUTCHours() + step, 0, 0, 0)
      return next
  }
}

function fillMissingTimeSeriesBuckets(
  rows: Array<TimeSeriesDbRow>,
  bucketMinutes: number,
  limit: number,
): Array<TimeSeriesPoint> {
  if (rows.length === 0) {
    return []
  }

  const latestBucket = new Date(rows[0].bucket)
  const rowMap = new Map(rows.map((row) => [row.bucket, row]))
  const buckets: Array<TimeSeriesPoint> = []

  for (let index = limit - 1; index >= 0; index -= 1) {
    const bucketDate = moveBucket(latestBucket, bucketMinutes, -index)
    const bucket = formatBucketDate(bucketDate, bucketMinutes)
    const row = rowMap.get(bucket)

    buckets.push({
      bucket,
      requests: row?.requests ?? 0,
      tokens: row?.tokens ?? 0,
      errors: row?.errors ?? 0,
    })
  }

  return buckets
}

function getBucketFormat(bucketMinutes: number): string {
  if (bucketMinutes >= 525600) return "%Y-01-01T00:00:00Z"
  if (bucketMinutes >= 43200) return "%Y-%m-01T00:00:00Z"
  if (bucketMinutes >= 1440) return "%Y-%m-%dT00:00:00Z"
  if (bucketMinutes >= 60) return "%Y-%m-%dT%H:00:00Z"
  return "%Y-%m-%dT%H:%M:00Z"
}

function readTimeSeries(
  db: Database,
  bucketMinutes: number,
  limit: number,
  timeFrom?: string,
): Array<TimeSeriesPoint> {
  const format = getBucketFormat(bucketMinutes)
  const whereClause = timeFrom ? `WHERE timestamp >= ?2` : ""
  const params: Array<string | number> = [limit]
  if (timeFrom) params.push(timeFrom)

  const rows = db
    .query<TimeSeriesDbRow, Array<unknown>>(
      `SELECT
         strftime('${format}', timestamp) AS bucket,
         COUNT(*) AS requests,
         COALESCE(SUM(total_tokens), 0) AS tokens,
         SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS errors
       FROM request_logs
       ${whereClause}
       GROUP BY bucket
       ORDER BY bucket DESC
       LIMIT ?1`,
    )
    .all(...params)

  return fillMissingTimeSeriesBuckets(rows, bucketMinutes, limit)
}

export function createRequestLogRepository(db: Database) {
  return {
    insertBatch(records: Array<RequestLogRecord>): Promise<void> {
      if (records.length === 0) {
        return Promise.resolve()
      }

      insertRequestLogs(db, records)
      return Promise.resolve()
    },

    getOverview(): Promise<RequestOverview> {
      return Promise.resolve(readOverview(db))
    },

    getModelBreakdown(): Promise<Array<ModelBreakdownRow>> {
      return Promise.resolve(readModelBreakdown(db))
    },

    getRecentRequests(options: {
      limit: number
      offset: number
      filter?: RequestLogFilter
    }): Promise<Array<RecentRequestRow>> {
      return Promise.resolve(
        readFilteredRequests(db, {
          limit: options.limit,
          offset: options.offset,
          filter: options.filter ?? {},
        }),
      )
    },

    countRequests(filter?: RequestLogFilter): Promise<number> {
      return Promise.resolve(countFilteredRequests(db, filter ?? {}))
    },

    deleteOlderThan(cutoff: string): Promise<number> {
      const result = db
        .query("DELETE FROM request_logs WHERE timestamp < ?1")
        .run(cutoff)

      return Promise.resolve(result.changes)
    },

    getTimeSeries(options: {
      bucketMinutes: number
      limit: number
      timeFrom?: string
    }): Promise<Array<TimeSeriesPoint>> {
      return Promise.resolve(
        readTimeSeries(
          db,
          options.bucketMinutes,
          options.limit,
          options.timeFrom,
        ),
      )
    },
  }
}
