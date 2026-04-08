import { Database } from "bun:sqlite"
import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import {
  type CreateModelAliasInput,
  createModelAliasRepository,
} from "~/db/model-aliases"
import { initDatabase } from "~/db/schema"

describe("model aliases repository", () => {
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

  test("creates and lists aliases", async () => {
    const repository = createModelAliasRepository(db)
    const input: CreateModelAliasInput = {
      sourceModel: "haiku",
      targetModel: "claude-haiku-4-5",
      enabled: true,
    }

    const created = await repository.create(input)
    const records = await repository.list()

    expect(created.id).toBeString()
    expect(records).toHaveLength(1)
    expect(records[0]?.sourceModel).toBe(input.sourceModel)
    expect(records[0]?.targetModel).toBe(input.targetModel)
    expect(records[0]?.enabled).toBe(true)
  })

  test("updates aliases and preserves the source-to-target relationship", async () => {
    const repository = createModelAliasRepository(db)
    const created = await repository.create({
      sourceModel: "haiku",
      targetModel: "claude-haiku-4-5",
      enabled: true,
    })

    const updated = await repository.update(created.id, {
      sourceModel: "haiku",
      targetModel: "claude-haiku-4-5-latest",
      enabled: false,
    })

    expect(updated.targetModel).toBe("claude-haiku-4-5-latest")
    expect(updated.enabled).toBe(false)
  })

  test("deletes aliases", async () => {
    const repository = createModelAliasRepository(db)
    const created = await repository.create({
      sourceModel: "haiku",
      targetModel: "claude-haiku-4-5",
      enabled: true,
    })

    const removed = await repository.remove(created.id)
    const records = await repository.list()

    expect(removed).toBe(true)
    expect(records).toHaveLength(0)
  })
})
