import { Database } from "bun:sqlite"

import { createDashboardMetaRepository } from "~/db/dashboard-meta"
import {
  type CreateModelAliasInput,
  createModelAliasRepository,
  type UpdateModelAliasInput,
} from "~/db/model-aliases"
import {
  type CreateModelMappingInput,
  createModelMappingRepository,
  type UpdateModelMappingInput,
} from "~/db/model-mappings"
import { createRequestLogRepository } from "~/db/request-logs"
import { createRequestSink, type RequestSinkConfig } from "~/db/request-sink"
import { initDatabase } from "~/db/schema"
import {
  getDashboardRuntimeConfig,
  getMonthlyRetentionCutoff,
  getRequestLogRetentionCutoff,
} from "~/lib/dashboard-config"
import { createModelAliasStore } from "~/lib/model-alias-store"
import { createModelMappingStore } from "~/lib/model-mapping-store"
import { PATHS } from "~/lib/paths"

const db = new Database(process.env.COPILOT_API_DB_PATH ?? PATHS.DATABASE_PATH)
initDatabase(db)
const dashboardRuntimeConfig = getDashboardRuntimeConfig()

const dashboardMetaRepository = createDashboardMetaRepository(db)
const modelAliasRepository = createModelAliasRepository(db)
const modelMappingRepository = createModelMappingRepository(db)
const requestLogRepository = createRequestLogRepository(db)
const modelAliasStore = createModelAliasStore(modelAliasRepository)
const modelMappingStore = createModelMappingStore(modelMappingRepository)
const requestSink = createRequestSink({
  writeBatch(records) {
    return requestLogRepository.insertBatch(records)
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

export async function initializeDashboardRuntime(): Promise<void> {
  if (initialized) {
    return
  }

  if (!initializationPromise) {
    initializationPromise = Promise.all([
      modelAliasStore.load(),
      modelMappingStore.load(),
    ]).then(async () => {
      requestSink.start()

      await pruneExpiredRequestLogs()

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

export function getModelMappingStore() {
  return modelMappingStore
}

export function getModelAliasStore() {
  return modelAliasStore
}

export function getModelAliasRepository() {
  return modelAliasRepository
}

export function getModelMappingRepository() {
  return modelMappingRepository
}

export function getRequestLogRepository() {
  return requestLogRepository
}

export function getDashboardMetaRepository() {
  return dashboardMetaRepository
}

export function getDashboardConfig() {
  return dashboardRuntimeConfig
}

export async function createModelMapping(input: CreateModelMappingInput) {
  const record = await modelMappingRepository.create(input)
  await modelMappingStore.reload()
  return record
}

export async function createModelAlias(input: CreateModelAliasInput) {
  const record = await modelAliasRepository.create(input)
  await modelAliasStore.reload()
  return record
}

export async function updateModelMapping(
  id: string,
  input: UpdateModelMappingInput,
) {
  const record = await modelMappingRepository.update(id, input)
  await modelMappingStore.reload()
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

export async function removeModelMapping(id: string) {
  const removed = await modelMappingRepository.remove(id)
  if (removed) {
    await modelMappingStore.reload()
  }
  return removed
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
