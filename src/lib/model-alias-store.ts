export interface ModelAliasRecord {
  createdAt: string
  enabled: boolean
  id: string
  sourceModel: string
  targetModel: string
  updatedAt: string
}

export interface ModelAliasRepository {
  list(): Promise<Array<ModelAliasRecord>>
}

interface ModelAliasSnapshot {
  count: number
  enabledCount: number
  loadedAt: string | null
  updatedAt: string | null
  version: number
}

function normalizeModelId(value: string): string {
  return value.trim().toLowerCase()
}

export function createModelAliasStore(repository: ModelAliasRepository) {
  let records = new Map<string, ModelAliasRecord>()
  let version = 0
  let loadedAt: string | null = null
  let updatedAt: string | null = null
  let totalCount = 0
  let enabledCount = 0

  const rebuild = (nextRecords: Array<ModelAliasRecord>) => {
    const enabledRecords = nextRecords.filter((record) => record.enabled)
    records = new Map(
      enabledRecords.map((record) => [
        normalizeModelId(record.sourceModel),
        record,
      ]),
    )
    totalCount = nextRecords.length
    enabledCount = enabledRecords.length
    version += 1
    loadedAt = new Date().toISOString()
    updatedAt =
      nextRecords
        .map((record) => record.updatedAt)
        .sort()
        .at(-1) ?? null
  }

  return {
    async load(): Promise<void> {
      const nextRecords = await repository.list()
      rebuild(nextRecords)
    },

    async reload(): Promise<void> {
      const nextRecords = await repository.list()
      rebuild(nextRecords)
    },

    resolveTargetModel(sourceModel: string): string {
      const normalizedSourceModel = normalizeModelId(sourceModel)
      return (
        records.get(normalizedSourceModel)?.targetModel ?? normalizedSourceModel
      )
    },

    getSnapshot(): ModelAliasSnapshot {
      return {
        count: totalCount,
        enabledCount,
        loadedAt,
        updatedAt,
        version,
      }
    },
  }
}
