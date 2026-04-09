import { Database } from "bun:sqlite"
import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { initDatabase } from "~/db/schema"

describe("database schema migrations", () => {
  let tempDir: string
  let db: Database

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "copilot-api-schema-"))
    db = new Database(path.join(tempDir, "copilot-api.db"))
  })

  afterEach(async () => {
    db.close()
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  test("adds pricing columns to an existing request_logs table", () => {
    db.run(`
      CREATE TABLE request_logs (
        id TEXT PRIMARY KEY,
        request_id TEXT,
        timestamp TEXT NOT NULL,
        route TEXT NOT NULL,
        model_raw TEXT,
        model_display TEXT,
        stream INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL,
        status_code INTEGER NOT NULL,
        latency_ms INTEGER,
        input_tokens INTEGER,
        output_tokens INTEGER,
        total_tokens INTEGER,
        error_message TEXT,
        account_type TEXT NOT NULL
      );
    `)

    initDatabase(db)

    const columns = db
      .query<{ name: string }, []>("PRAGMA table_info(request_logs)")
      .all()
      .map((column) => column.name)

    expect(columns).toContain("pricing_source")
    expect(columns).toContain("pricing_model_id")
    expect(columns).toContain("price_prompt_usd_per_token")
    expect(columns).toContain("price_completion_usd_per_token")
    expect(columns).toContain("price_request_usd")
    expect(columns).toContain("estimated_cost_usd")
  })

  test("normalizes existing stored model ids to lowercase during init", () => {
    db.run(`
      CREATE TABLE request_logs (
        id TEXT PRIMARY KEY,
        request_id TEXT,
        timestamp TEXT NOT NULL,
        route TEXT NOT NULL,
        model_raw TEXT,
        model_display TEXT,
        stream INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL,
        status_code INTEGER NOT NULL,
        latency_ms INTEGER,
        input_tokens INTEGER,
        output_tokens INTEGER,
        total_tokens INTEGER,
        error_message TEXT,
        account_type TEXT NOT NULL
      );
    `)

    db.run(`
      CREATE TABLE model_aliases (
        id TEXT PRIMARY KEY,
        source_model TEXT NOT NULL UNIQUE,
        target_model TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `)

    db.run(
      `INSERT INTO request_logs (
        id, request_id, timestamp, route, model_raw, model_display, stream, status,
        status_code, latency_ms, input_tokens, output_tokens, total_tokens, error_message, account_type
      ) VALUES (
        'req-1', NULL, '2026-04-08T12:00:00.000Z', '/v1/chat/completions', 'GPT-5.4',
        'GPT-5.4', 0, 'success', 200, 120, 10, 20, 30, NULL, 'individual'
      )`,
    )
    db.run(
      `INSERT INTO model_aliases (
        id, source_model, target_model, enabled, created_at, updated_at
      ) VALUES (
        'alias-1', 'Haiku', 'Claude-Haiku-4-5', 1, '2026-04-08T12:00:00.000Z', '2026-04-08T12:00:00.000Z'
      )`,
    )

    initDatabase(db)

    const requestLog = db
      .query<{ model_raw: string; model_display: string }, []>(
        "SELECT model_raw, model_display FROM request_logs WHERE id = 'req-1'",
      )
      .get()
    const alias = db
      .query<{ source_model: string; target_model: string }, []>(
        "SELECT source_model, target_model FROM model_aliases WHERE id = 'alias-1'",
      )
      .get()

    expect(requestLog?.model_raw).toBe("gpt-5.4")
    expect(requestLog?.model_display).toBe("gpt-5.4")
    expect(alias?.source_model).toBe("haiku")
    expect(alias?.target_model).toBe("claude-haiku-4-5")
  })
})
