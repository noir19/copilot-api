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

interface OpenRouterPricingCacheRepository {
  getLatestSnapshotDate(): string | null
  listSnapshot(snapshotDate: string): Array<{
    completionUsdPerToken: number
    modelId: string
    normalizedKey: string
    promptUsdPerToken: number
    requestUsd: number
  }>
  replaceSnapshot(
    snapshotDate: string,
    rows: Array<{
      completionUsdPerToken: number
      modelId: string
      normalizedKey: string
      promptUsdPerToken: number
      requestUsd: number
    }>,
  ): void
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

function serializePricingLookup(
  lookup: Map<string, OpenRouterModelPricing>,
): Array<{
  completionUsdPerToken: number
  modelId: string
  normalizedKey: string
  promptUsdPerToken: number
  requestUsd: number
}> {
  return Array.from(lookup.entries()).map(([normalizedKey, pricing]) => ({
    normalizedKey,
    modelId: pricing.modelId,
    promptUsdPerToken: pricing.promptUsdPerToken,
    completionUsdPerToken: pricing.completionUsdPerToken,
    requestUsd: pricing.requestUsd,
  }))
}

function buildLookupFromCache(
  rows: Array<{
    completionUsdPerToken: number
    modelId: string
    normalizedKey: string
    promptUsdPerToken: number
    requestUsd: number
  }>,
): Map<string, OpenRouterModelPricing> {
  return new Map(
    rows.map((row) => [
      row.normalizedKey,
      {
        modelId: row.modelId,
        promptUsdPerToken: row.promptUsdPerToken,
        completionUsdPerToken: row.completionUsdPerToken,
        requestUsd: row.requestUsd,
      },
    ]),
  )
}

function formatNaturalDay(now: Date): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
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
  fetchImpl?: FetchLike
  now?: () => Date
  repository?: OpenRouterPricingCacheRepository
}) {
  const fetchImpl = options?.fetchImpl ?? fetch
  const now = options?.now ?? (() => new Date())
  const repository = options?.repository

  let cachedSnapshotDate: string | null = null
  let cachedLookup = new Map<string, OpenRouterModelPricing>()
  let refreshing: Promise<void> | null = null

  function loadSnapshot(snapshotDate: string): boolean {
    if (!repository) {
      return false
    }

    const rows = repository.listSnapshot(snapshotDate)
    if (rows.length === 0) {
      return false
    }

    cachedLookup = buildLookupFromCache(rows)
    cachedSnapshotDate = snapshotDate
    return true
  }

  async function refreshForDate(snapshotDate: string): Promise<void> {
    if (refreshing) {
      return refreshing
    }

    refreshing = (async () => {
      const response = await fetchImpl("https://openrouter.ai/api/v1/models")
      if (!response.ok) {
        throw new Error(`OpenRouter pricing request failed: ${response.status}`)
      }

      const body = (await response.json()) as OpenRouterModelsResponse
      const nextLookup = buildPricingLookup(body.data ?? [])

      if (repository) {
        repository.replaceSnapshot(
          snapshotDate,
          serializePricingLookup(nextLookup),
        )
      }

      cachedLookup = nextLookup
      cachedSnapshotDate = snapshotDate
    })()

    try {
      await refreshing
    } finally {
      refreshing = null
    }
  }

  async function refreshIfNeeded(): Promise<void> {
    const today = formatNaturalDay(now())
    if (cachedSnapshotDate === today && cachedLookup.size > 0) {
      return
    }

    if (loadSnapshot(today)) {
      return
    }

    if (repository) {
      const latestSnapshotDate = repository.getLatestSnapshotDate()
      if (latestSnapshotDate && latestSnapshotDate !== today) {
        loadSnapshot(latestSnapshotDate)
      }
    }

    await refreshForDate(today)
  }

  return {
    async getPricing(model: string | null | undefined) {
      if (!model) {
        return null
      }

      try {
        await refreshIfNeeded()
      } catch {
        return cachedLookup.get(normalizeModelKey(model)) ?? null
      }

      return cachedLookup.get(normalizeModelKey(model)) ?? null
    },
  }
}
