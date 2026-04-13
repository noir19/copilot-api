import { Database } from "bun:sqlite"
import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import {
  type CreateModelAliasInput,
  createModelAliasRepository,
  ModelAliasConflictError,
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

  test("allows one enabled and multiple disabled aliases for the same request model", async () => {
    const repository = createModelAliasRepository(db)

    await repository.create({
      sourceModel: "haiku",
      targetModel: "claude-haiku-4-5",
      enabled: true,
    })
    await repository.create({
      sourceModel: "HAIKU",
      targetModel: "claude-haiku-4-5-disabled",
      enabled: false,
    })
    await repository.create({
      sourceModel: "haiku",
      targetModel: "claude-haiku-4-5-disabled-candidate",
      enabled: false,
    })

    const records = await repository.list()

    expect(records).toHaveLength(3)
    expect(records.map((record) => record.enabled).sort()).toEqual([
      false,
      false,
      true,
    ])
    expect(records.every((record) => record.sourceModel === "haiku")).toBe(true)
  })

  test("rejects duplicate enabled aliases for the same request model", async () => {
    const repository = createModelAliasRepository(db)

    await repository.create({
      sourceModel: "haiku",
      targetModel: "claude-haiku-4-5",
      enabled: true,
    })

    expect(() =>
      repository.create({
        sourceModel: "HAIKU",
        targetModel: "claude-haiku-4-5-latest",
        enabled: true,
      }),
    ).toThrow(ModelAliasConflictError)
  })

  test("rejects enabling a disabled alias when an enabled alias already exists", async () => {
    const repository = createModelAliasRepository(db)
    await repository.create({
      sourceModel: "haiku",
      targetModel: "claude-haiku-4-5",
      enabled: true,
    })
    const disabled = await repository.create({
      sourceModel: "haiku",
      targetModel: "claude-haiku-4-5-candidate",
      enabled: false,
    })

    expect(() =>
      repository.update(disabled.id, {
        sourceModel: "haiku",
        targetModel: "claude-haiku-4-5-candidate",
        enabled: true,
      }),
    ).toThrow(ModelAliasConflictError)
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

  test("normalizes alias source and target models to lowercase", async () => {
    const repository = createModelAliasRepository(db)

    const created = await repository.create({
      sourceModel: "Haiku",
      targetModel: "Claude-Haiku-4-5",
      enabled: true,
    })

    expect(created.sourceModel).toBe("haiku")
    expect(created.targetModel).toBe("claude-haiku-4-5")

    const updated = await repository.update(created.id, {
      sourceModel: "GPT-5.4",
      targetModel: "OPENAI/GPT-5.4",
      enabled: true,
    })

    expect(updated.sourceModel).toBe("gpt-5.4")
    expect(updated.targetModel).toBe("openai/gpt-5.4")
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
