import { Database } from "bun:sqlite"
import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import {
  type CreateModelMappingInput,
  createModelMappingRepository,
} from "~/db/model-mappings"
import { initDatabase } from "~/db/schema"

describe("model mappings repository", () => {
  let tempDir: string
  let dbPath: string
  let db: Database

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "copilot-api-db-"))
    dbPath = path.join(tempDir, "copilot-api.db")
    db = new Database(dbPath)
    initDatabase(db)
  })

  afterEach(async () => {
    db.close()
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  test("creates and lists mappings", async () => {
    const repository = createModelMappingRepository(db)
    const input: CreateModelMappingInput = {
      sourceModel: "claude-sonnet-4-5",
      displayName: "Claude Sonnet 4.5",
      enabled: true,
    }

    const created = await repository.create(input)
    const records = await repository.list()

    expect(created.id).toBeString()
    expect(records).toHaveLength(1)
    expect(records[0]?.sourceModel).toBe(input.sourceModel)
    expect(records[0]?.displayName).toBe(input.displayName)
    expect(records[0]?.enabled).toBe(true)
  })

  test("updates mappings and preserves uniqueness by source model", async () => {
    const repository = createModelMappingRepository(db)
    const created = await repository.create({
      sourceModel: "claude-sonnet-4-5",
      displayName: "Claude Sonnet 4.5",
      enabled: true,
    })

    const updated = await repository.update(created.id, {
      sourceModel: "claude-sonnet-4-5",
      displayName: "Claude Sonnet",
      enabled: false,
    })

    expect(updated.displayName).toBe("Claude Sonnet")
    expect(updated.enabled).toBe(false)
  })

  test("deletes mappings", async () => {
    const repository = createModelMappingRepository(db)
    const created = await repository.create({
      sourceModel: "claude-sonnet-4-5",
      displayName: "Claude Sonnet 4.5",
      enabled: true,
    })

    const removed = await repository.remove(created.id)
    const records = await repository.list()

    expect(removed).toBe(true)
    expect(records).toHaveLength(0)
  })
})
