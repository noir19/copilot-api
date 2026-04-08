import consola from "consola"

import { getModelMappingStore, getRequestSink } from "~/db/runtime"
import { HTTPError } from "~/lib/error"

interface EnqueueRequestLogInput {
  route: string
  startedAt: number
  model?: string | null
  stream?: boolean
  responseStatus?: number
  totalTokens?: number | null
  inputTokens?: number | null
  outputTokens?: number | null
  error?: unknown
  accountType: string
}

function getStatusCode(input: EnqueueRequestLogInput): number {
  if (typeof input.responseStatus === "number") {
    return input.responseStatus
  }

  if (input.error instanceof HTTPError) {
    return input.error.response.status
  }

  return input.error ? 500 : 200
}

function getErrorMessage(error: unknown): string | null {
  if (!error) {
    return null
  }

  if (error instanceof Error) {
    return error.message
  }

  return typeof error === "string" ? error : JSON.stringify(error)
}

export function enqueueRequestLog(input: EnqueueRequestLogInput): void {
  try {
    const statusCode = getStatusCode(input)
    const status = statusCode >= 400 ? "error" : "success"
    const model = input.model ?? null

    getRequestSink().enqueue({
      timestamp: new Date().toISOString(),
      route: input.route,
      modelRaw: model,
      modelDisplay:
        model ? getModelMappingStore().resolveDisplayName(model) : null,
      stream: input.stream ?? false,
      status,
      statusCode,
      latencyMs: Date.now() - input.startedAt,
      inputTokens: input.inputTokens ?? null,
      outputTokens: input.outputTokens ?? null,
      totalTokens: input.totalTokens ?? null,
      errorMessage: getErrorMessage(input.error),
      accountType: input.accountType,
    })
  } catch (error) {
    consola.warn("Failed to enqueue request log:", error)
  }
}
