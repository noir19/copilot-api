import type { Database } from "bun:sqlite"

import { randomUUID } from "node:crypto"

import type {
  ModelMappingRecord,
  ModelMappingRepository,
} from "~/lib/model-mapping-store"

export interface CreateModelMappingInput {
  sourceModel: string
  displayName: string
  enabled: boolean
}

export interface UpdateModelMappingInput {
  sourceModel: string
  displayName: string
  enabled: boolean
}

interface ModelMappingRow {
  id: string
  source_model: string
  display_name: string
  enabled: number
  created_at: string
  updated_at: string
}

function toRecord(row: ModelMappingRow): ModelMappingRecord {
  return {
    id: row.id,
    sourceModel: row.source_model,
    displayName: row.display_name,
    enabled: row.enabled === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function createModelMappingRepository(
  db: Database,
): ModelMappingRepository & {
  create(input: CreateModelMappingInput): Promise<ModelMappingRecord>
  update(
    id: string,
    input: UpdateModelMappingInput,
  ): Promise<ModelMappingRecord>
  remove(id: string): Promise<boolean>
  getById(id: string): Promise<ModelMappingRecord | null>
} {
  return {
    list(): Promise<Array<ModelMappingRecord>> {
      const rows = db
        .query<ModelMappingRow, []>(
          `SELECT id, source_model, display_name, enabled, created_at, updated_at
           FROM model_mappings
           ORDER BY updated_at DESC, created_at DESC`,
        )
        .all()

      return Promise.resolve(rows.map((row) => toRecord(row)))
    },

    create(input: CreateModelMappingInput): Promise<ModelMappingRecord> {
      const now = new Date().toISOString()
      const id = randomUUID()

      db.query(
        `INSERT INTO model_mappings (
          id,
          source_model,
          display_name,
          enabled,
          created_at,
          updated_at
        ) VALUES ($id, $source_model, $display_name, $enabled, $created_at, $updated_at)`,
      ).run({
        $id: id,
        $source_model: input.sourceModel,
        $display_name: input.displayName,
        $enabled: input.enabled ? 1 : 0,
        $created_at: now,
        $updated_at: now,
      })

      return Promise.resolve({
        id,
        sourceModel: input.sourceModel,
        displayName: input.displayName,
        enabled: input.enabled,
        createdAt: now,
        updatedAt: now,
      })
    },

    async update(
      id: string,
      input: UpdateModelMappingInput,
    ): Promise<ModelMappingRecord> {
      const existing = await this.getById(id)
      if (!existing) {
        throw new Error(`Model mapping ${id} not found`)
      }

      const updatedAt = new Date().toISOString()
      db.query(
        `UPDATE model_mappings
         SET source_model = $source_model,
             display_name = $display_name,
             enabled = $enabled,
             updated_at = $updated_at
         WHERE id = $id`,
      ).run({
        $id: id,
        $source_model: input.sourceModel,
        $display_name: input.displayName,
        $enabled: input.enabled ? 1 : 0,
        $updated_at: updatedAt,
      })

      return {
        ...existing,
        sourceModel: input.sourceModel,
        displayName: input.displayName,
        enabled: input.enabled,
        updatedAt,
      }
    },

    remove(id: string): Promise<boolean> {
      const result = db
        .query("DELETE FROM model_mappings WHERE id = $id")
        .run({ $id: id })

      return Promise.resolve(result.changes > 0)
    },

    getById(id: string): Promise<ModelMappingRecord | null> {
      const row = db
        .query<ModelMappingRow, [string]>(
          `SELECT id, source_model, display_name, enabled, created_at, updated_at
           FROM model_mappings
           WHERE id = ?1`,
        )
        .get(id)

      return Promise.resolve(row ? toRecord(row) : null)
    },
  }
}
