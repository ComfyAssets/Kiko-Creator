-- Kiko Creator Model Metadata Database Schema
-- SQLite database for caching model information, hashes, and CivitAI metadata

-- Models table: Core model information
CREATE TABLE IF NOT EXISTS models (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,                    -- Filename (e.g., "model_v1.safetensors")
  path TEXT NOT NULL UNIQUE,             -- Absolute file path
  folder TEXT,                           -- Relative folder path from base
  type TEXT NOT NULL,                    -- "checkpoint", "lora", "embedding"
  size INTEGER NOT NULL,                 -- File size in bytes
  hash TEXT UNIQUE,                      -- SHA256 hash (nullable for failed calculations)
  file_modified_at TEXT NOT NULL,        -- ISO timestamp of file modification
  scanned_at TEXT NOT NULL,              -- ISO timestamp when first discovered
  updated_at TEXT NOT NULL,              -- ISO timestamp when last updated
  CONSTRAINT chk_type CHECK (type IN ('checkpoint', 'lora', 'embedding'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_models_type ON models(type);
CREATE INDEX IF NOT EXISTS idx_models_folder ON models(folder);
CREATE INDEX IF NOT EXISTS idx_models_hash ON models(hash);
CREATE INDEX IF NOT EXISTS idx_models_updated_at ON models(updated_at DESC);

-- CivitAI metadata table: Cached data from CivitAI API
CREATE TABLE IF NOT EXISTS civitai_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_id INTEGER NOT NULL UNIQUE,      -- FK to models.id
  civitai_id INTEGER,                    -- CivitAI model version ID
  civitai_model_id INTEGER,              -- CivitAI model ID (parent)
  model_name TEXT,                       -- Human-readable name from CivitAI
  description TEXT,                      -- Model description
  base_model TEXT,                       -- Base model (e.g., "SD 1.5", "SDXL")
  trained_words TEXT,                    -- JSON array of trigger words
  images TEXT,                           -- JSON array of preview images
  thumbnail_path TEXT,                   -- Local filesystem path to cached thumbnail
  stats TEXT,                            -- JSON object with rating, downloads, etc.
  fetched_at TEXT NOT NULL,              -- ISO timestamp when metadata was fetched
  FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE
);

-- Index for CivitAI lookups
CREATE INDEX IF NOT EXISTS idx_civitai_model_id ON civitai_metadata(model_id);
CREATE INDEX IF NOT EXISTS idx_civitai_civitai_id ON civitai_metadata(civitai_id);

-- Scan history table: Track discovery operations
CREATE TABLE IF NOT EXISTS scan_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL,              -- ISO timestamp when scan started
  completed_at TEXT,                     -- ISO timestamp when scan completed (null if failed/in-progress)
  yaml_path TEXT NOT NULL,               -- Path to extra_model_paths.yaml
  checkpoints_found INTEGER DEFAULT 0,   -- Count of checkpoints discovered
  loras_found INTEGER DEFAULT 0,         -- Count of LoRAs discovered
  embeddings_found INTEGER DEFAULT 0,    -- Count of embeddings discovered
  errors TEXT,                           -- JSON array of error messages
  civitai_enabled INTEGER DEFAULT 0,     -- 1 if CivitAI metadata was fetched
  duration_seconds INTEGER               -- Total scan duration
);

-- Index for recent scan history
CREATE INDEX IF NOT EXISTS idx_scan_history_started_at ON scan_history(started_at DESC);

-- Settings/metadata table: App-level configuration
CREATE TABLE IF NOT EXISTS app_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Initial app metadata
INSERT OR IGNORE INTO app_metadata (key, value, updated_at) VALUES
  ('schema_version', '1', datetime('now')),
  ('last_scan', '', datetime('now')),
  ('total_models', '0', datetime('now'));
