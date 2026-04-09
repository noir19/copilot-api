interface OpenRouterModelDescriptor {
  canonical_slug?: string
  id: string
  pricing?: {
    completion?: string
    prompt?: string
    request?: string
  }
}

interface OpenRouterModelsResponse {
  data?: Array<OpenRouterModelDescriptor>
}

export interface OpenRouterModelPricing {
  completionUsdPerToken: number
  modelId: string
  promptUsdPerToken: number
  requestUsd: number
}

type FetchLike = (input: string) => Promise<Response>

function parsePrice(value: string | undefined): number {
  const parsed = Number.parseFloat(value ?? "0")
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeModelKey(model: string): string {
  return model
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function appendAlias(
  map: Map<string, OpenRouterModelPricing>,
  alias: string | undefined,
  pricing: OpenRouterModelPricing,
): void {
  if (!alias) {
    return
  }

  const key = normalizeModelKey(alias)
  if (!key || map.has(key)) {
    return
  }

  map.set(key, pricing)
}

export function buildPricingLookup(
  models: Array<OpenRouterModelDescriptor>,
): Map<string, OpenRouterModelPricing> {
  const lookup = new Map<string, OpenRouterModelPricing>()

  for (const model of models) {
    const pricing: OpenRouterModelPricing = {
      completionUsdPerToken: parsePrice(model.pricing?.completion),
      modelId: model.id,
      promptUsdPerToken: parsePrice(model.pricing?.prompt),
      requestUsd: parsePrice(model.pricing?.request),
    }

    appendAlias(lookup, model.id, pricing)
    appendAlias(lookup, model.canonical_slug, pricing)
    appendAlias(lookup, model.id.split("/").at(-1), pricing)
    appendAlias(lookup, model.canonical_slug?.split("/").at(-1), pricing)
  }

  return lookup
}

export function estimateOpenRouterCostUsd(input: {
  completionTokens: number
  inputTokens: number
  pricing: OpenRouterModelPricing
}): number {
  return (
    input.pricing.requestUsd +
    input.inputTokens * input.pricing.promptUsdPerToken +
    input.completionTokens * input.pricing.completionUsdPerToken
  )
}

export function roundUsd(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000
}

export function createOpenRouterPricingService(options?: {
  cacheTtlMs?: number
  fetchImpl?: FetchLike
}) {
  const fetchImpl = options?.fetchImpl ?? fetch
  const cacheTtlMs = options?.cacheTtlMs ?? 6 * 60 * 60 * 1000

  let cachedAt = 0
  let cachedLookup = new Map<string, OpenRouterModelPricing>()

  async function refreshIfNeeded(): Promise<void> {
    if (Date.now() - cachedAt < cacheTtlMs && cachedLookup.size > 0) {
      return
    }

    const response = await fetchImpl("https://openrouter.ai/api/v1/models")
    if (!response.ok) {
      throw new Error(`OpenRouter pricing request failed: ${response.status}`)
    }

    const body = (await response.json()) as OpenRouterModelsResponse
    cachedLookup = buildPricingLookup(body.data ?? [])
    cachedAt = Date.now()
  }

  return {
    async getPricing(model: string | null | undefined) {
      if (!model) {
        return null
      }

      try {
        await refreshIfNeeded()
      } catch {
        if (cachedLookup.size === 0) {
          cachedAt = Date.now()
        }
        return cachedLookup.get(normalizeModelKey(model)) ?? null
      }

      return cachedLookup.get(normalizeModelKey(model)) ?? null
    },
  }
}
