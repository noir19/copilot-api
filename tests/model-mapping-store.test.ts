import { beforeEach, describe, expect, test } from "bun:test"

import {
  createModelMappingStore,
  type ModelMappingRecord,
} from "~/lib/model-mapping-store"

class InMemoryModelMappingRepository {
  private records: Array<ModelMappingRecord> = []

  list(): Promise<Array<ModelMappingRecord>> {
    return Promise.resolve(this.records.map((record) => ({ ...record })))
  }

  replace(records: Array<ModelMappingRecord>): Promise<void> {
    this.records = records.map((record) => ({ ...record }))
    return Promise.resolve()
  }
}

describe("model mapping store", () => {
  let repository: InMemoryModelMappingRepository

  beforeEach(() => {
    repository = new InMemoryModelMappingRepository()
  })

  test("loads mappings into memory and resolves display names without reading repository again", async () => {
    await repository.replace([
      {
        id: "1",
        sourceModel: "claude-sonnet-4-5",
        displayName: "Claude Sonnet 4.5",
        enabled: true,
        createdAt: "2026-04-08T13:00:00.000Z",
        updatedAt: "2026-04-08T13:00:00.000Z",
      },
    ])

    const store = createModelMappingStore(repository)
    await store.load()

    expect(store.resolveDisplayName("claude-sonnet-4-5")).toBe(
      "Claude Sonnet 4.5",
    )
    expect(store.resolveDisplayName("gpt-4.1")).toBe("gpt-4.1")
    expect(store.getSnapshot().count).toBe(1)
  })

  test("reload picks up repository changes and bumps version", async () => {
    await repository.replace([
      {
        id: "1",
        sourceModel: "claude-sonnet-4-5",
        displayName: "Claude Sonnet 4.5",
        enabled: true,
        createdAt: "2026-04-08T13:00:00.000Z",
        updatedAt: "2026-04-08T13:00:00.000Z",
      },
    ])

    const store = createModelMappingStore(repository)
    await store.load()
    const initialVersion = store.getSnapshot().version

    await repository.replace([
      {
        id: "1",
        sourceModel: "claude-sonnet-4-5",
        displayName: "Claude Sonnet 4.5",
        enabled: false,
        createdAt: "2026-04-08T13:00:00.000Z",
        updatedAt: "2026-04-08T14:00:00.000Z",
      },
      {
        id: "2",
        sourceModel: "gpt-4.1",
        displayName: "GPT 4.1",
        enabled: true,
        createdAt: "2026-04-08T14:00:00.000Z",
        updatedAt: "2026-04-08T14:00:00.000Z",
      },
    ])

    await store.reload()

    expect(store.resolveDisplayName("claude-sonnet-4-5")).toBe(
      "claude-sonnet-4-5",
    )
    expect(store.resolveDisplayName("gpt-4.1")).toBe("GPT 4.1")
    expect(store.getSnapshot().version).toBe(initialVersion + 1)
    expect(store.getSnapshot().count).toBe(2)
  })
})
