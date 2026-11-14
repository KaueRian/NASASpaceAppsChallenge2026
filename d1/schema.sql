-- EarthTrend Detective — Cloudflare D1 Schema
-- Tables for caching raw NASA POWER monthly climatology and persisting shared dossiers.

CREATE TABLE IF NOT EXISTS nasa_cache (
  cache_key TEXT PRIMARY KEY,
  lat_round REAL NOT NULL,
  lon_round REAL NOT NULL,
  variable TEXT NOT NULL,
  start_year INTEGER NOT NULL,
  end_year INTEGER NOT NULL,
  payload_json TEXT NOT NULL,
  retrieved_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_nasa_cache_lookup
  ON nasa_cache (lat_round, lon_round, variable);

CREATE TABLE IF NOT EXISTS dossiers (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  location_label TEXT NOT NULL,
  variable TEXT NOT NULL,
  season TEXT NOT NULL,
  start_year INTEGER NOT NULL,
  end_year INTEGER NOT NULL,
  result_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dossiers_created_at
  ON dossiers (created_at DESC);
