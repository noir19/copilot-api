import type { Database } from "bun:sqlite"

function addColumnIfMissing(
  db: Database,
  tableName: string,
  columnName: string,
  definition: string,
): void {
  const columns = db
    .query<{ name: string }, []>(`PRAGMA table_info(${tableName})`)
    .all()
    .map((column) => column.name)

  if (columns.includes(columnName)) {
    return
  }

  db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`)
}

function normalizeStoredModelData(db: Database): void {
  db.run(
    `UPDATE request_logs
     SET model_raw = lower(trim(model_raw)),
         model_display = lower(trim(model_display))
     WHERE model_raw IS NOT NULL OR model_display IS NOT NULL`,
  )
  db.run(
    `UPDATE model_aliases
     SET source_model = lower(trim(source_model)),
         target_model = lower(trim(target_model))`,
  )
}

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
      pricing_source TEXT,
      pricing_model_id TEXT,
      price_prompt_usd_per_token REAL,
      price_completion_usd_per_token REAL,
      price_request_usd REAL,
      estimated_cost_usd REAL,
      error_message TEXT,
      account_type TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_request_logs_timestamp
      ON request_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_request_logs_model_raw
      ON request_logs(model_raw);
    CREATE INDEX IF NOT EXISTS idx_request_logs_status
      ON request_logs(status);

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

  addColumnIfMissing(db, "request_logs", "pricing_source", "TEXT")
  addColumnIfMissing(db, "request_logs", "pricing_model_id", "TEXT")
  addColumnIfMissing(db, "request_logs", "price_prompt_usd_per_token", "REAL")
  addColumnIfMissing(
    db,
    "request_logs",
    "price_completion_usd_per_token",
    "REAL",
  )
  addColumnIfMissing(db, "request_logs", "price_request_usd", "REAL")
  addColumnIfMissing(db, "request_logs", "estimated_cost_usd", "REAL")
  normalizeStoredModelData(db)
}
