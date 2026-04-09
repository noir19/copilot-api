import { Database } from "bun:sqlite"

import { createDashboardMetaRepository } from "~/db/dashboard-meta"
import {
  type CreateModelAliasInput,
  createModelAliasRepository,
  type UpdateModelAliasInput,
} from "~/db/model-aliases"
import { createOpenRouterPricingCacheRepository } from "~/db/openrouter-pricing-cache"
import { createRequestLogRepository } from "~/db/request-logs"
import { createRequestSink, type RequestSinkConfig } from "~/db/request-sink"
import { initDatabase } from "~/db/schema"
import {
  getDashboardRuntimeConfig,
  getMonthlyRetentionCutoff,
  getRequestLogRetentionCutoff,
} from "~/lib/dashboard-config"
import { createModelAliasStore } from "~/lib/model-alias-store"
import { PATHS } from "~/lib/paths"
import {
  createOpenRouterPricingService,
  estimateOpenRouterCostUsd,
  roundUsd,
} from "~/services/openrouter/pricing"

const db = new Database(process.env.COPILOT_API_DB_PATH ?? PATHS.DATABASE_PATH)
initDatabase(db)
const dashboardRuntimeConfig = getDashboardRuntimeConfig()

const dashboardMetaRepository = createDashboardMetaRepository(db)
const modelAliasRepository = createModelAliasRepository(db)
const openRouterPricingCacheRepository =
  createOpenRouterPricingCacheRepository(db)
const requestLogRepository = createRequestLogRepository(db)
const modelAliasStore = createModelAliasStore(modelAliasRepository)
const openRouterPricingService = createOpenRouterPricingService({
  repository: openRouterPricingCacheRepository,
})
const requestSink = createRequestSink({
  async writeBatch(records) {
    const enrichedRecords = await Promise.all(
      records.map(async (record) => {
        if (record.pricingSource || record.estimatedCostUsd != null) {
          return record
        }

        const pricing = await openRouterPricingService.getPricing(
          record.modelRaw,
        )
        if (!pricing) {
          return record
        }

        return {
          ...record,
          pricingSource: "openrouter",
          pricingModelId: pricing.modelId,
          pricePromptUsdPerToken: pricing.promptUsdPerToken,
          priceCompletionUsdPerToken: pricing.completionUsdPerToken,
          priceRequestUsd: pricing.requestUsd,
          estimatedCostUsd: roundUsd(
            estimateOpenRouterCostUsd({
              inputTokens: record.inputTokens ?? 0,
              completionTokens: record.outputTokens ?? 0,
              pricing,
            }),
          ),
        }
      }),
    )

    return requestLogRepository.insertBatch(enrichedRecords)
  },
  flushIntervalMs: 500,
  batchSize: 100,
  maxQueueSize: 10_000,
  maxRetryAttempts: 5,
  retryWindowMs: 120_000,
})

let initialized = false
let initializationPromise: Promise<void> | undefined

async function pruneExpiredRequestLogs(): Promise<number> {
  const retainMonthsRaw = dashboardMetaRepository.get("retention_months")
  const retainMonths = retainMonthsRaw
    ? Number.parseInt(retainMonthsRaw, 10)
    : null

  const cutoff =
    retainMonths && retainMonths > 0
      ? getMonthlyRetentionCutoff(new Date(), retainMonths)
      : getRequestLogRetentionCutoff(
          new Date(),
          dashboardRuntimeConfig.requestLogRetentionDays,
        )

  return requestLogRepository.deleteOlderThan(cutoff)
}

async function backfillHistoricalPricing(): Promise<number> {
  return requestLogRepository.backfillMissingPricing(async (model) => {
    const pricing = await openRouterPricingService.getPricing(model)
    if (!pricing) {
      return null
    }

    return {
      pricingSource: "openrouter",
      pricingModelId: pricing.modelId,
      pricePromptUsdPerToken: pricing.promptUsdPerToken,
      priceCompletionUsdPerToken: pricing.completionUsdPerToken,
      priceRequestUsd: pricing.requestUsd,
    }
  })
}

export async function initializeDashboardRuntime(): Promise<void> {
  if (initialized) {
    return
  }

  if (!initializationPromise) {
    initializationPromise = modelAliasStore.load().then(async () => {
      requestSink.start()

      await pruneExpiredRequestLogs()
      await backfillHistoricalPricing()

      setInterval(() => {
        void pruneExpiredRequestLogs()
      }, dashboardRuntimeConfig.requestLogCleanupIntervalMs)

      initialized = true
    })
  }

  await initializationPromise
}

export function getDashboardDatabase(): Database {
  return db
}

export function getRequestSink() {
  return requestSink
}

export function getModelAliasStore() {
  return modelAliasStore
}

export function getModelAliasRepository() {
  return modelAliasRepository
}

export function getRequestLogRepository() {
  return requestLogRepository
}

export function getDashboardMetaRepository() {
  return dashboardMetaRepository
}

export function getOpenRouterPricingCacheRepository() {
  return openRouterPricingCacheRepository
}

export function getDashboardConfig() {
  return dashboardRuntimeConfig
}

export function getOpenRouterPricingService() {
  return openRouterPricingService
}

export async function createModelAlias(input: CreateModelAliasInput) {
  const record = await modelAliasRepository.create(input)
  await modelAliasStore.reload()
  return record
}

export async function updateModelAlias(
  id: string,
  input: UpdateModelAliasInput,
) {
  const record = await modelAliasRepository.update(id, input)
  await modelAliasStore.reload()
  return record
}

export async function removeModelAlias(id: string) {
  const removed = await modelAliasRepository.remove(id)
  if (removed) {
    await modelAliasStore.reload()
  }
  return removed
}

export function reconfigureRequestSink(patch: Partial<RequestSinkConfig>) {
  requestSink.reconfigure(patch)

  const sinkKeyMap: Record<string, keyof RequestSinkConfig> = {
    sink_flush_interval_ms: "flushIntervalMs",
    sink_batch_size: "batchSize",
    sink_max_queue_size: "maxQueueSize",
    sink_max_retry_attempts: "maxRetryAttempts",
    sink_retry_window_ms: "retryWindowMs",
  }

  for (const [metaKey, configKey] of Object.entries(sinkKeyMap)) {
    if (patch[configKey] !== undefined) {
      dashboardMetaRepository.set(metaKey, String(patch[configKey]))
    }
  }
}

export function getRequestSinkConfig(): RequestSinkConfig {
  return requestSink.getConfig()
}
