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

export interface ModelMappingRecord {
  createdAt: string
  displayName: string
  enabled: boolean
  id: string
  sourceModel: string
  updatedAt: string
}

export interface MappingSnapshot {
  count: number
  enabledCount: number
  loadedAt: string | null
  updatedAt: string | null
  version: number
}

export interface DashboardData {
  overview: RequestOverview
  recentRequests: Array<RecentRequestRow>
  requestModels: Array<ModelBreakdownRow>
  usage: CopilotUsageResponse
}

export interface MappingsResponse {
  data: Array<ModelMappingRecord>
  meta: MappingSnapshot
}

interface RequestsResponse {
  data: Array<RecentRequestRow>
}

interface ModelsResponse {
  data: Array<ModelBreakdownRow>
}

export interface MappingDraft {
  displayName: string
  enabled: boolean
  sourceModel: string
}

export const EMPTY_DRAFT: MappingDraft = {
  displayName: "",
  enabled: true,
  sourceModel: "",
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
  const [overview, usage, models, requests] = await Promise.all([
    fetchJson<RequestOverview>("/api/dashboard/overview"),
    fetchJson<CopilotUsageResponse>("/api/dashboard/usage"),
    fetchJson<ModelsResponse>("/api/dashboard/models"),
    fetchJson<RequestsResponse>("/api/dashboard/requests?limit=20"),
  ])

  return {
    overview,
    recentRequests: requests.data,
    requestModels: models.data,
    usage,
  }
}

export function loadMappings(): Promise<MappingsResponse> {
  return fetchJson<MappingsResponse>("/api/dashboard/mappings")
}

export function createMapping(
  draft: MappingDraft,
): Promise<ModelMappingRecord> {
  return fetchJson<ModelMappingRecord>("/api/dashboard/mappings", {
    body: JSON.stringify(draft),
    method: "POST",
  })
}

export function updateMapping(
  id: string,
  draft: MappingDraft,
): Promise<ModelMappingRecord> {
  return fetchJson<ModelMappingRecord>(`/api/dashboard/mappings/${id}`, {
    body: JSON.stringify(draft),
    method: "PUT",
  })
}

export function deleteMapping(id: string): Promise<{ removed: boolean }> {
  return fetchJson<{ removed: boolean }>(`/api/dashboard/mappings/${id}`, {
    method: "DELETE",
  })
}
