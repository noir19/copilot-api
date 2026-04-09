const DEFAULT_REQUEST_LOG_RETENTION_DAYS = 15
const DEFAULT_REQUEST_LOG_CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000

function parsePositiveInteger(
  rawValue: string | undefined,
  fallback: number,
): number {
  if (!rawValue) {
    return fallback
  }

  const parsed = Number.parseInt(rawValue, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }

  return parsed
}

export interface DashboardRuntimeConfig {
  requestLogCleanupIntervalMs: number
  requestLogRetentionDays: number
}

export function getDashboardRuntimeConfig(): DashboardRuntimeConfig {
  return {
    requestLogCleanupIntervalMs: parsePositiveInteger(
      process.env.COPILOT_API_REQUEST_LOG_CLEANUP_INTERVAL_MS,
      DEFAULT_REQUEST_LOG_CLEANUP_INTERVAL_MS,
    ),
    requestLogRetentionDays: parsePositiveInteger(
      process.env.COPILOT_API_REQUEST_LOG_RETENTION_DAYS,
      DEFAULT_REQUEST_LOG_RETENTION_DAYS,
    ),
  }
}

export function getRequestLogRetentionCutoff(
  now: Date,
  retentionDays: number,
): string {
  const retentionMs = retentionDays * 24 * 60 * 60 * 1000
  return new Date(now.getTime() - retentionMs).toISOString()
}

export function getMonthlyRetentionCutoff(
  now: Date,
  retainMonths: number,
): string {
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()
  return new Date(Date.UTC(year, month - retainMonths, 1)).toISOString()
}
