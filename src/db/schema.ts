import type { Database } from "bun:sqlite"

export function initDatabase(db: Database): void {
  db.run("PRAGMA journal_mode = WAL;")

  db.run(`
    CREATE TABLE IF NOT EXISTS request_logs (
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

    CREATE INDEX IF NOT EXISTS idx_request_logs_timestamp
      ON request_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_request_logs_model_raw
      ON request_logs(model_raw);
    CREATE INDEX IF NOT EXISTS idx_request_logs_status
      ON request_logs(status);

    CREATE TABLE IF NOT EXISTS model_mappings (
      id TEXT PRIMARY KEY,
      source_model TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_model_mappings_source_model
      ON model_mappings(source_model);

    CREATE TABLE IF NOT EXISTS model_aliases (
      id TEXT PRIMARY KEY,
      source_model TEXT NOT NULL UNIQUE,
      target_model TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_model_aliases_source_model
      ON model_aliases(source_model);

    CREATE TABLE IF NOT EXISTS dashboard_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS openrouter_pricing_cache (
      normalized_key TEXT NOT NULL,
      model_id TEXT NOT NULL,
      prompt_usd_per_token REAL NOT NULL,
      completion_usd_per_token REAL NOT NULL,
      request_usd REAL NOT NULL,
      snapshot_date TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (snapshot_date, normalized_key)
    );

    CREATE INDEX IF NOT EXISTS idx_openrouter_pricing_cache_snapshot_date
      ON openrouter_pricing_cache(snapshot_date);
  `)
}
