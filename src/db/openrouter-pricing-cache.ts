import type { Database } from "bun:sqlite"

export interface OpenRouterPricingCacheRow {
  completionUsdPerToken: number
  modelId: string
  normalizedKey: string
  promptUsdPerToken: number
  requestUsd: number
  snapshotDate: string
  updatedAt: string
}

interface OpenRouterPricingCacheDbRow {
  completion_usd_per_token: number
  model_id: string
  normalized_key: string
  prompt_usd_per_token: number
  request_usd: number
  snapshot_date: string
  updated_at: string
}

function toRow(row: OpenRouterPricingCacheDbRow): OpenRouterPricingCacheRow {
  return {
    completionUsdPerToken: row.completion_usd_per_token,
    modelId: row.model_id,
    normalizedKey: row.normalized_key,
    promptUsdPerToken: row.prompt_usd_per_token,
    requestUsd: row.request_usd,
    snapshotDate: row.snapshot_date,
    updatedAt: row.updated_at,
  }
}

export function createOpenRouterPricingCacheRepository(db: Database) {
  return {
    listSnapshot(snapshotDate: string): Array<OpenRouterPricingCacheRow> {
      const rows = db
        .query<OpenRouterPricingCacheDbRow, [string]>(
          `SELECT
             normalized_key,
             model_id,
             prompt_usd_per_token,
             completion_usd_per_token,
             request_usd,
             snapshot_date,
             updated_at
           FROM openrouter_pricing_cache
           WHERE snapshot_date = ?1`,
        )
        .all(snapshotDate)

      return rows.map((row) => toRow(row))
    },

    getLatestSnapshotDate(): string | null {
      const row = db
        .query<{ snapshot_date: string }, []>(
          `SELECT snapshot_date
           FROM openrouter_pricing_cache
           ORDER BY snapshot_date DESC
           LIMIT 1`,
        )
        .get()

      return row?.snapshot_date ?? null
    },

    replaceSnapshot(
      snapshotDate: string,
      rows: Array<
        Omit<OpenRouterPricingCacheRow, "snapshotDate" | "updatedAt">
      >,
    ): void {
      const updatedAt = new Date().toISOString()

      const transaction = db.transaction(
        (
          currentSnapshotDate: string,
          records: Array<
            Omit<OpenRouterPricingCacheRow, "snapshotDate" | "updatedAt">
          >,
        ) => {
          db.query(
            "DELETE FROM openrouter_pricing_cache WHERE snapshot_date = ?1",
          ).run(currentSnapshotDate)

          const insert = db.query(
            `INSERT INTO openrouter_pricing_cache (
              normalized_key,
              model_id,
              prompt_usd_per_token,
              completion_usd_per_token,
              request_usd,
              snapshot_date,
              updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
          )

          for (const row of records) {
            insert.run(
              row.normalizedKey,
              row.modelId,
              row.promptUsdPerToken,
              row.completionUsdPerToken,
              row.requestUsd,
              currentSnapshotDate,
              updatedAt,
            )
          }

          db.query(
            "DELETE FROM openrouter_pricing_cache WHERE snapshot_date <> ?1",
          ).run(currentSnapshotDate)
        },
      )

      transaction(snapshotDate, rows)
    },
  }
}
