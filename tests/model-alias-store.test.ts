import { beforeEach, describe, expect, test } from "bun:test"

import {
  createModelAliasStore,
  type ModelAliasRecord,
} from "~/lib/model-alias-store"

class InMemoryModelAliasRepository {
  private records: Array<ModelAliasRecord> = []

  list(): Promise<Array<ModelAliasRecord>> {
    return Promise.resolve(this.records.map((record) => ({ ...record })))
  }

  replace(records: Array<ModelAliasRecord>): Promise<void> {
    this.records = records.map((record) => ({ ...record }))
    return Promise.resolve()
  }
}

describe("model alias store", () => {
  let repository: InMemoryModelAliasRepository

  beforeEach(() => {
    repository = new InMemoryModelAliasRepository()
  })

  test("loads aliases into memory and resolves targets without reading the repository again", async () => {
    await repository.replace([
      {
        id: "1",
        sourceModel: "haiku",
        targetModel: "claude-haiku-4-5",
        enabled: true,
        createdAt: "2026-04-09T10:00:00.000Z",
        updatedAt: "2026-04-09T10:00:00.000Z",
      },
    ])

    const store = createModelAliasStore(repository)
    await store.load()

    expect(store.resolveTargetModel("haiku")).toBe("claude-haiku-4-5")
    expect(store.resolveTargetModel("gpt-4.1")).toBe("gpt-4.1")
    expect(store.getSnapshot().count).toBe(1)
  })

  test("reload picks up repository changes and bumps version", async () => {
    await repository.replace([
      {
        id: "1",
        sourceModel: "haiku",
        targetModel: "claude-haiku-4-5",
        enabled: true,
        createdAt: "2026-04-09T10:00:00.000Z",
        updatedAt: "2026-04-09T10:00:00.000Z",
      },
    ])

    const store = createModelAliasStore(repository)
    await store.load()
    const initialVersion = store.getSnapshot().version

    await repository.replace([
      {
        id: "1",
        sourceModel: "haiku",
        targetModel: "claude-haiku-4-5",
        enabled: false,
        createdAt: "2026-04-09T10:00:00.000Z",
        updatedAt: "2026-04-09T11:00:00.000Z",
      },
      {
        id: "2",
        sourceModel: "sonnet",
        targetModel: "claude-sonnet-4-5",
        enabled: true,
        createdAt: "2026-04-09T11:00:00.000Z",
        updatedAt: "2026-04-09T11:00:00.000Z",
      },
    ])

    await store.reload()

    expect(store.resolveTargetModel("haiku")).toBe("haiku")
    expect(store.resolveTargetModel("sonnet")).toBe("claude-sonnet-4-5")
    expect(store.getSnapshot().version).toBe(initialVersion + 1)
    expect(store.getSnapshot().count).toBe(2)
  })
})
