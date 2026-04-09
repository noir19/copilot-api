import { describe, expect, test } from "bun:test"

import {
  buildPricingLookup,
  createOpenRouterPricingService,
  estimateOpenRouterCostUsd,
  roundUsd,
} from "~/services/openrouter/pricing"

describe("openrouter pricing", () => {
  test("builds aliases for full and short model ids", () => {
    const lookup = buildPricingLookup([
      {
        id: "anthropic/claude-sonnet-4.5",
        canonical_slug: "anthropic/claude-sonnet-4.5",
        pricing: {
          prompt: "0.000003",
          completion: "0.000015",
          request: "0",
        },
      },
    ])

    expect(lookup.get("anthropic-claude-sonnet-4-5")?.promptUsdPerToken).toBe(
      0.000003,
    )
    expect(lookup.get("claude-sonnet-4-5")?.completionUsdPerToken).toBe(
      0.000015,
    )
  })

  test("estimates request cost from input and output tokens", () => {
    const cost = estimateOpenRouterCostUsd({
      inputTokens: 1_000_000,
      completionTokens: 100_000,
      pricing: {
        modelId: "anthropic/claude-sonnet-4.5",
        promptUsdPerToken: 0.000003,
        completionUsdPerToken: 0.000015,
        requestUsd: 0,
      },
    })

    expect(roundUsd(cost)).toBe(4.5)
  })

  test("caches remote model pricing", async () => {
    let calls = 0
    const service = createOpenRouterPricingService({
      cacheTtlMs: 60_000,
      fetchImpl: async () => {
        calls += 1
        return new Response(
          JSON.stringify({
            data: [
              {
                id: "anthropic/claude-sonnet-4.5",
                pricing: {
                  prompt: "0.000003",
                  completion: "0.000015",
                  request: "0",
                },
              },
            ],
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        )
      },
    })

    await service.getPricing("claude-sonnet-4-5")
    await service.getPricing("anthropic/claude-sonnet-4.5")

    expect(calls).toBe(1)
  })
})
