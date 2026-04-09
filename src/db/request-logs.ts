import type { Database } from "bun:sqlite"

import { randomUUID } from "node:crypto"

import type { RequestLogRecord } from "~/db/request-sink"

export interface RequestOverview {
  totalRequests: number
  successRate: number
  errorRate: number
  totalTokens: number
  averageLatencyMs: number
}

export interface ModelBreakdownRow {
  modelRaw: string | null
  modelDisplay: string | null
  requestCount: number
  totalTokens: number
  lastRequestedAt: string
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
  }
}

function readModelBreakdown(db: Database): Array<ModelBreakdownRow> {
  const rows = db
    .query<ModelBreakdownDbRow, []>(
      `SELECT
         model_raw,
         model_display,
         COUNT(*) AS request_count,
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
    totalTokens: row.total_tokens,
    lastRequestedAt: row.last_requested_at,
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

function countFilteredRequests(
  db: Database,
  filter: RequestLogFilter,
): number {
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

function getBucketFormat(bucketMinutes: number): string {
  if (bucketMinutes >= 1440) return "%Y-%m-%dT00:00:00Z"
  if (bucketMinutes >= 60) return "%Y-%m-%dT%H:00:00Z"
  return "%Y-%m-%dT%H:%M:00Z"
}

function readTimeSeries(
  db: Database,
  bucketMinutes: number,
  limit: number,
): Array<TimeSeriesPoint> {
  const format = getBucketFormat(bucketMinutes)
  const rows = db
    .query<TimeSeriesDbRow, [number]>(
      `SELECT
         strftime('${format}', timestamp) AS bucket,
         COUNT(*) AS requests,
         COALESCE(SUM(total_tokens), 0) AS tokens,
         SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS errors
       FROM request_logs
       GROUP BY bucket
       ORDER BY bucket DESC
       LIMIT ?1`,
    )
    .all(limit)

  return rows.reverse()
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
    }): Promise<Array<TimeSeriesPoint>> {
      return Promise.resolve(
        readTimeSeries(db, options.bucketMinutes, options.limit),
      )
    },
  }
}
