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

  test("reuses the same natural-day snapshot without refetching", async () => {
    let calls = 0
    const repository = {
      getLatestSnapshotDate() {
        return "2026-04-09"
      },
      listSnapshot() {
        return [
          {
            normalizedKey: "claude-sonnet-4-5",
            modelId: "anthropic/claude-sonnet-4.5",
            promptUsdPerToken: 0.000003,
            completionUsdPerToken: 0.000015,
            requestUsd: 0,
          },
        ]
      },
      replaceSnapshot() {},
    }

    const service = createOpenRouterPricingService({
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
      now: () => new Date("2026-04-09T08:00:00+08:00"),
      repository,
    })

    await service.getPricing("claude-sonnet-4-5")
    await service.getPricing("anthropic/claude-sonnet-4-5")

    expect(calls).toBe(0)
  })

  test("refreshes once when the cached snapshot is from a previous natural day", async () => {
    let calls = 0
    const replaceCalls: Array<{ snapshotDate: string; size: number }> = []
    const repository = {
      getLatestSnapshotDate() {
        return "2026-04-08"
      },
      listSnapshot(snapshotDate: string) {
        if (snapshotDate === "2026-04-08") {
          return [
            {
              normalizedKey: "claude-sonnet-4-5",
              modelId: "anthropic/claude-sonnet-4.5",
              promptUsdPerToken: 0.000001,
              completionUsdPerToken: 0.000002,
              requestUsd: 0,
            },
          ]
        }

        return []
      },
      replaceSnapshot(
        snapshotDate: string,
        rows: Array<{ normalizedKey: string }>,
      ) {
        replaceCalls.push({ snapshotDate, size: rows.length })
      },
    }

    const service = createOpenRouterPricingService({
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
      now: () => new Date("2026-04-09T08:00:00+08:00"),
      repository,
    })

    const pricing = await service.getPricing("claude-sonnet-4-5")

    expect(calls).toBe(1)
    expect(replaceCalls).toEqual([{ snapshotDate: "2026-04-09", size: 2 }])
    expect(pricing?.promptUsdPerToken).toBe(0.000003)
  })
})
