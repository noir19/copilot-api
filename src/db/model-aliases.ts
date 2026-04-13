import type { Database } from "bun:sqlite"

import { randomUUID } from "node:crypto"

import type {
  ModelAliasRecord,
  ModelAliasRepository,
} from "~/lib/model-alias-store"

export class ModelAliasConflictError extends Error {
  readonly enabled: boolean
  readonly sourceModel: string

  constructor(sourceModel: string, enabled: boolean) {
    super(
      enabled
        ? `模型别名已存在：请求模型 ${sourceModel} 已有启用配置`
        : `模型别名已存在：请求模型 ${sourceModel} 的配置冲突`,
    )
    this.name = "ModelAliasConflictError"
    this.enabled = enabled
    this.sourceModel = sourceModel
  }
}

export class ModelAliasNotFoundError extends Error {
  constructor(id: string) {
    super(`模型别名不存在：${id}`)
    this.name = "ModelAliasNotFoundError"
  }
}

export interface CreateModelAliasInput {
  enabled: boolean
  sourceModel: string
  targetModel: string
}

export interface UpdateModelAliasInput {
  enabled: boolean
  sourceModel: string
  targetModel: string
}

interface ModelAliasRow {
  created_at: string
  enabled: number
  id: string
  source_model: string
  target_model: string
  updated_at: string
}

function normalizeModelId(value: string): string {
  return value.trim().toLowerCase()
}

function isSqliteConstraintError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("constraint failed")
}

function toRecord(row: ModelAliasRow): ModelAliasRecord {
  return {
    createdAt: row.created_at,
    enabled: row.enabled === 1,
    id: row.id,
    sourceModel: normalizeModelId(row.source_model),
    targetModel: normalizeModelId(row.target_model),
    updatedAt: row.updated_at,
  }
}

export function createModelAliasRepository(
  db: Database,
): ModelAliasRepository & {
  create(input: CreateModelAliasInput): Promise<ModelAliasRecord>
  getById(id: string): Promise<ModelAliasRecord | null>
  remove(id: string): Promise<boolean>
  update(id: string, input: UpdateModelAliasInput): Promise<ModelAliasRecord>
} {
  return {
    list(): Promise<Array<ModelAliasRecord>> {
      const rows = db
        .query<ModelAliasRow, []>(
          `SELECT id, source_model, target_model, enabled, created_at, updated_at
           FROM model_aliases
           ORDER BY updated_at DESC, created_at DESC`,
        )
        .all()

      return Promise.resolve(rows.map((row) => toRecord(row)))
    },

    create(input: CreateModelAliasInput): Promise<ModelAliasRecord> {
      const now = new Date().toISOString()
      const id = randomUUID()
      const sourceModel = normalizeModelId(input.sourceModel)
      const targetModel = normalizeModelId(input.targetModel)

      try {
        db.query(
          `INSERT INTO model_aliases (
            id,
            source_model,
            target_model,
            enabled,
            created_at,
            updated_at
          ) VALUES ($id, $source_model, $target_model, $enabled, $created_at, $updated_at)`,
        ).run({
          $created_at: now,
          $enabled: input.enabled ? 1 : 0,
          $id: id,
          $source_model: sourceModel,
          $target_model: targetModel,
          $updated_at: now,
        })
      } catch (error) {
        if (isSqliteConstraintError(error)) {
          throw new ModelAliasConflictError(sourceModel, input.enabled)
        }
        throw error
      }

      return Promise.resolve({
        createdAt: now,
        enabled: input.enabled,
        id,
        sourceModel,
        targetModel,
        updatedAt: now,
      })
    },

    async update(
      id: string,
      input: UpdateModelAliasInput,
    ): Promise<ModelAliasRecord> {
      const existing = await this.getById(id)
      if (!existing) {
        throw new ModelAliasNotFoundError(id)
      }

      const updatedAt = new Date().toISOString()
      const sourceModel = normalizeModelId(input.sourceModel)
      const targetModel = normalizeModelId(input.targetModel)

      try {
        db.query(
          `UPDATE model_aliases
           SET source_model = $source_model,
               target_model = $target_model,
               enabled = $enabled,
               updated_at = $updated_at
           WHERE id = $id`,
        ).run({
          $enabled: input.enabled ? 1 : 0,
          $id: id,
          $source_model: sourceModel,
          $target_model: targetModel,
          $updated_at: updatedAt,
        })
      } catch (error) {
        if (isSqliteConstraintError(error)) {
          throw new ModelAliasConflictError(sourceModel, input.enabled)
        }
        throw error
      }

      return {
        ...existing,
        enabled: input.enabled,
        sourceModel,
        targetModel,
        updatedAt,
      }
    },

    remove(id: string): Promise<boolean> {
      const result = db
        .query("DELETE FROM model_aliases WHERE id = $id")
        .run({ $id: id })

      return Promise.resolve(result.changes > 0)
    },

    getById(id: string): Promise<ModelAliasRecord | null> {
      const row = db
        .query<ModelAliasRow, [string]>(
          `SELECT id, source_model, target_model, enabled, created_at, updated_at
           FROM model_aliases
           WHERE id = ?1`,
        )
        .get(id)

      return Promise.resolve(row ? toRecord(row) : null)
    },
  }
}
