import type { Database } from "bun:sqlite"

interface DashboardMetaRow {
  key: string
  value: string
  updated_at: string
}

export function createDashboardMetaRepository(db: Database) {
  return {
    get(key: string): string | null {
      const row = db
        .query<DashboardMetaRow, [string]>(
          "SELECT value FROM dashboard_meta WHERE key = ?1",
        )
        .get(key)
      return row?.value ?? null
    },

    set(key: string, value: string): void {
      db.query(
        `INSERT OR REPLACE INTO dashboard_meta (key, value, updated_at)
         VALUES (?1, ?2, ?3)`,
      ).run(key, value, new Date().toISOString())
    },

    getAll(): Record<string, string> {
      const rows = db
        .query<DashboardMetaRow, []>("SELECT key, value FROM dashboard_meta")
        .all()
      const result: Record<string, string> = {}
      for (const row of rows) {
        result[row.key] = row.value
      }
      return result
    },

    remove(key: string): boolean {
      const result = db
        .query("DELETE FROM dashboard_meta WHERE key = ?1")
        .run(key)
      return result.changes > 0
    },
  }
}
