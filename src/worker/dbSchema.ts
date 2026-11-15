import type { D1Database } from "@cloudflare/workers-types";

let schemaInitialized = false;

/**
 * Ensures the `nasa_cache` and `dossiers` tables exist in the bound Cloudflare D1 database.
 * Idempotent and cached per Worker isolate so even a fresh un-migrated D1 instance works on first request.
 */
export async function ensureD1Schema(db?: D1Database): Promise<void> {
  if (!db || schemaInitialized) return;
  try {
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS nasa_cache (
          cache_key TEXT PRIMARY KEY,
          lat_round REAL NOT NULL,
          lon_round REAL NOT NULL,
          variable TEXT NOT NULL,
          start_year INTEGER NOT NULL,
          end_year INTEGER NOT NULL,
          payload_json TEXT NOT NULL,
          retrieved_at TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`,
      )
      .run();
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS dossiers (
          id TEXT PRIMARY KEY,
          lat REAL NOT NULL,
          lon REAL NOT NULL,
          location_label TEXT NOT NULL,
          variable TEXT NOT NULL,
          season TEXT NOT NULL,
          start_year INTEGER NOT NULL,
          end_year INTEGER NOT NULL,
          result_json TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`,
      )
      .run();
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS ai_cache (
          cache_key TEXT PRIMARY KEY,
          stage TEXT NOT NULL,
          response_json TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`,
      )
      .run();
    schemaInitialized = true;
  } catch {
    // Mock D1 instances in unit tests may only implement targeted prepared statements; ignore safely.
  }
}
