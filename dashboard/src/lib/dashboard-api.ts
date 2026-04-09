export interface RequestOverview {
  averageLatencyMs: number
  errorRate: number
  successRate: number
  totalRequests: number
  totalTokens: number
}

export interface QuotaDetail {
  entitlement: number
  overage_count: number
  overage_permitted: boolean
  percent_remaining: number
  quota_id: string
  quota_remaining: number
  remaining: number
  unlimited: boolean
}

export interface CopilotUsageResponse {
  access_type_sku: string
  copilot_plan: string
  quota_reset_date: string
  quota_snapshots: {
    chat: QuotaDetail
    completions: QuotaDetail
    premium_interactions: QuotaDetail
  }
}

export interface ModelBreakdownRow {
  lastRequestedAt: string
  modelDisplay: string | null
  modelRaw: string | null
  requestCount: number
  totalTokens: number
}

export interface RecentRequestRow {
  accountType: string
  errorMessage: string | null
  id: string
  inputTokens: number | null
  latencyMs: number | null
  modelDisplay: string | null
  modelRaw: string | null
  outputTokens: number | null
  route: string
  status: "error" | "success"
  statusCode: number
  stream: boolean
  timestamp: string
  totalTokens: number | null
}

export interface ModelAliasRecord {
  createdAt: string
  enabled: boolean
  id: string
  sourceModel: string
  targetModel: string
  updatedAt: string
}

export interface MappingSnapshot {
  count: number
  enabledCount: number
  loadedAt: string | null
  updatedAt: string | null
  version: number
}

export interface RequestLogFilter {
  model?: string
  route?: string
  status?: "success" | "error"
  timeFrom?: string
  timeTo?: string
}

export interface DashboardData {
  overview: RequestOverview
  requestModels: Array<ModelBreakdownRow>
  timeSeries: Array<TimeSeriesPoint>
  usage: CopilotUsageResponse
}

export interface TimeSeriesPoint {
  bucket: string
  requests: number
  tokens: number
  errors: number
}

export interface SettingsResponse {
  settings: Record<string, string>
  sinkConfig: {
    flushIntervalMs: number
    batchSize: number
    maxQueueSize: number
    maxRetryAttempts: number
    retryWindowMs: number
  }
}

export interface AliasesResponse {
  data: Array<ModelAliasRecord>
  meta: MappingSnapshot
}

interface RequestsResponse {
  data: Array<RecentRequestRow>
}

interface CountResponse {
  total: number
}

interface ModelsResponse {
  data: Array<ModelBreakdownRow>
}

interface TimeSeriesResponse {
  data: Array<TimeSeriesPoint>
}

export interface AliasDraft {
  enabled: boolean
  sourceModel: string
  targetModel: string
}

export const EMPTY_ALIAS_DRAFT: AliasDraft = {
  enabled: true,
  sourceModel: "",
  targetModel: "",
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  headers.set("Content-Type", "application/json")

  const response = await fetch(path, {
    ...init,
    headers,
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(errorBody || `Request failed: ${response.status}`)
  }

  return (await response.json()) as T
}

export async function loadDashboardData(): Promise<DashboardData> {
  const [overview, usage, models, timeSeries] = await Promise.all([
    fetchJson<RequestOverview>("/api/dashboard/overview"),
    fetchJson<CopilotUsageResponse>("/api/dashboard/usage"),
    fetchJson<ModelsResponse>("/api/dashboard/models"),
    fetchJson<TimeSeriesResponse>(
      "/api/dashboard/time-series?bucket=1440&limit=7",
    ),
  ])

  return {
    overview,
    requestModels: models.data,
    timeSeries: timeSeries.data,
    usage,
  }
}

function buildFilterParams(filter?: RequestLogFilter): URLSearchParams {
  const params = new URLSearchParams()
  if (filter?.model) params.set("model", filter.model)
  if (filter?.route) params.set("route", filter.route)
  if (filter?.status) params.set("status", filter.status)
  if (filter?.timeFrom)
    params.set("timeFrom", new Date(filter.timeFrom).toISOString())
  if (filter?.timeTo)
    params.set("timeTo", new Date(filter.timeTo).toISOString())
  return params
}

export async function loadRequests(
  page: number,
  pageSize: number,
  filter?: RequestLogFilter,
): Promise<Array<RecentRequestRow>> {
  const params = buildFilterParams(filter)
  params.set("limit", String(pageSize))
  params.set("offset", String(page * pageSize))
  const res = await fetchJson<RequestsResponse>(
    `/api/dashboard/requests?${params.toString()}`,
  )
  return res.data
}

export async function loadRequestCount(
  filter?: RequestLogFilter,
): Promise<number> {
  const params = buildFilterParams(filter)
  const res = await fetchJson<CountResponse>(
    `/api/dashboard/requests/count?${params.toString()}`,
  )
  return res.total
}

export async function loadTimeSeries(
  bucketMinutes: number,
  limit: number,
): Promise<Array<TimeSeriesPoint>> {
  const res = await fetchJson<TimeSeriesResponse>(
    `/api/dashboard/time-series?bucket=${bucketMinutes}&limit=${limit}`,
  )
  return res.data
}

export function loadAliases(): Promise<AliasesResponse> {
  return fetchJson<AliasesResponse>("/api/dashboard/aliases")
}

export function createAlias(draft: AliasDraft): Promise<ModelAliasRecord> {
  return fetchJson<ModelAliasRecord>("/api/dashboard/aliases", {
    body: JSON.stringify(draft),
    method: "POST",
  })
}

export function updateAlias(
  id: string,
  draft: AliasDraft,
): Promise<ModelAliasRecord> {
  return fetchJson<ModelAliasRecord>(`/api/dashboard/aliases/${id}`, {
    body: JSON.stringify(draft),
    method: "PUT",
  })
}

export function deleteAlias(id: string): Promise<{ removed: boolean }> {
  return fetchJson<{ removed: boolean }>(`/api/dashboard/aliases/${id}`, {
    method: "DELETE",
  })
}

export function loadSettings(): Promise<SettingsResponse> {
  return fetchJson<SettingsResponse>("/api/dashboard/settings")
}

export function saveSettings(
  entries: Record<string, string>,
): Promise<{ ok: boolean }> {
  return fetchJson<{ ok: boolean }>("/api/dashboard/settings", {
    body: JSON.stringify({ entries }),
    method: "POST",
  })
}
