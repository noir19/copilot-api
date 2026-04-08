import { describe, expect, test } from "bun:test"

import {
  getDashboardRuntimeConfig,
  getRequestLogRetentionCutoff,
} from "~/lib/dashboard-config"

describe("dashboard config", () => {
  test("uses the default request log retention settings", () => {
    const previousRetentionDays =
      process.env.COPILOT_API_REQUEST_LOG_RETENTION_DAYS
    const previousCleanupInterval =
      process.env.COPILOT_API_REQUEST_LOG_CLEANUP_INTERVAL_MS

    delete process.env.COPILOT_API_REQUEST_LOG_RETENTION_DAYS
    delete process.env.COPILOT_API_REQUEST_LOG_CLEANUP_INTERVAL_MS

    const config = getDashboardRuntimeConfig()

    process.env.COPILOT_API_REQUEST_LOG_RETENTION_DAYS = previousRetentionDays
    process.env.COPILOT_API_REQUEST_LOG_CLEANUP_INTERVAL_MS =
      previousCleanupInterval

    expect(config.requestLogRetentionDays).toBe(15)
    expect(config.requestLogCleanupIntervalMs).toBe(21_600_000)
  })

  test("computes a retention cutoff from the configured number of days", () => {
    const cutoff = getRequestLogRetentionCutoff(
      new Date("2026-04-09T00:00:00.000Z"),
      15,
    )

    expect(cutoff).toBe("2026-03-25T00:00:00.000Z")
  })
})
