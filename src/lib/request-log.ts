import consola from "consola"

import { getRequestSink } from "~/db/runtime"
import { HTTPError } from "~/lib/error"

interface EnqueueRequestLogInput {
  route: string
  startedAt: number
  model?: string | null
  requestModel?: string | null
  targetModel?: string | null
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

function normalizeModel(value: string | null | undefined): string | null {
  return value?.trim().toLowerCase() ?? null
}

export function enqueueRequestLog(input: EnqueueRequestLogInput): void {
  try {
    const statusCode = getStatusCode(input)
    const status = statusCode >= 400 ? "error" : "success"
    const requestModel = normalizeModel(input.requestModel ?? input.model)
    const targetModel = normalizeModel(input.targetModel ?? requestModel)

    getRequestSink().enqueue({
      timestamp: new Date().toISOString(),
      route: input.route,
      modelRaw: targetModel,
      modelDisplay: requestModel,
      stream: input.stream ?? false,
      status,
      statusCode,
      latencyMs: Date.now() - input.startedAt,
      inputTokens: input.inputTokens ?? null,
      outputTokens: input.outputTokens ?? null,
      totalTokens: input.totalTokens ?? null,
      pricingSource: null,
      pricingModelId: null,
      pricePromptUsdPerToken: null,
      priceCompletionUsdPerToken: null,
      priceRequestUsd: null,
      estimatedCostUsd: null,
      errorMessage: getErrorMessage(input.error),
      accountType: input.accountType,
    })
  } catch (error) {
    consola.warn("Failed to enqueue request log:", error)
  }
}
