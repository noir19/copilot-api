import { Database } from "bun:sqlite"

import {
  type CreateModelMappingInput,
  createModelMappingRepository,
  type UpdateModelMappingInput,
} from "~/db/model-mappings"
import { createRequestLogRepository } from "~/db/request-logs"
import { createRequestSink } from "~/db/request-sink"
import { initDatabase } from "~/db/schema"
import { createModelMappingStore } from "~/lib/model-mapping-store"
import { PATHS } from "~/lib/paths"

const db = new Database(process.env.COPILOT_API_DB_PATH ?? PATHS.DATABASE_PATH)
initDatabase(db)

const modelMappingRepository = createModelMappingRepository(db)
const requestLogRepository = createRequestLogRepository(db)
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

export async function initializeDashboardRuntime(): Promise<void> {
  if (initialized) {
    return
  }

  if (!initializationPromise) {
    initializationPromise = modelMappingStore.load().then(() => {
      requestSink.start()
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

export function getModelMappingRepository() {
  return modelMappingRepository
}

export function getRequestLogRepository() {
  return requestLogRepository
}

export async function createModelMapping(input: CreateModelMappingInput) {
  const record = await modelMappingRepository.create(input)
  await modelMappingStore.reload()
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

export async function removeModelMapping(id: string) {
  const removed = await modelMappingRepository.remove(id)
  if (removed) {
    await modelMappingStore.reload()
  }
  return removed
}
