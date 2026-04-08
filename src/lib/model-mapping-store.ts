export interface ModelMappingRecord {
  id: string
  sourceModel: string
  displayName: string
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface ModelMappingRepository {
  list(): Promise<Array<ModelMappingRecord>>
}

interface ModelMappingSnapshot {
  version: number
  count: number
  enabledCount: number
  loadedAt: string | null
  updatedAt: string | null
}

export function createModelMappingStore(repository: ModelMappingRepository) {
  let records = new Map<string, ModelMappingRecord>()
  let version = 0
  let loadedAt: string | null = null
  let updatedAt: string | null = null
  let totalCount = 0
  let enabledCount = 0

  const rebuild = (nextRecords: Array<ModelMappingRecord>) => {
    const enabledRecords = nextRecords.filter((record) => record.enabled)
    records = new Map(
      enabledRecords.map((record) => [record.sourceModel, record]),
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

    resolveDisplayName(sourceModel: string): string {
      return records.get(sourceModel)?.displayName ?? sourceModel
    },

    getSnapshot(): ModelMappingSnapshot {
      return {
        version,
        count: totalCount,
        enabledCount,
        loadedAt,
        updatedAt,
      }
    },
  }
}
