import { Database } from "bun:sqlite"

import {
  type CreateModelMappingInput,
  createModelMappingRepository,
  type UpdateModelMappingInput,
} from "~/db/model-mappings"
import { createRequestSink, type RequestLogRecord } from "~/db/request-sink"
import { initDatabase } from "~/db/schema"
import { createModelMappingStore } from "~/lib/model-mapping-store"
import { PATHS } from "~/lib/paths"

const db = new Database(process.env.COPILOT_API_DB_PATH ?? PATHS.DATABASE_PATH)
initDatabase(db)

const modelMappingRepository = createModelMappingRepository(db)
const modelMappingStore = createModelMappingStore(modelMappingRepository)
const requestSink = createRequestSink({
  writeBatch(records) {
    if (records.length === 0) {
      return Promise.resolve()
    }

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
          $id: crypto.randomUUID(),
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
    return Promise.resolve()
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
