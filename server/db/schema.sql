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

-- ======================================
-- MOBILE API TABLES
-- ======================================

-- Devices table: Mobile device authentication
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,                   -- UUID v4
  device_name TEXT NOT NULL,             -- User-friendly device name
  platform TEXT NOT NULL CHECK(platform IN ('android', 'ios')),
  token TEXT UNIQUE NOT NULL,            -- Bearer token for authentication
  push_token TEXT,                       -- FCM/APNs push notification token
  created_at INTEGER NOT NULL,           -- Unix timestamp (milliseconds)
  last_seen INTEGER NOT NULL,            -- Unix timestamp (milliseconds)
  is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1))  -- Soft delete flag
);

CREATE INDEX IF NOT EXISTS idx_devices_token ON devices(token);
CREATE INDEX IF NOT EXISTS idx_devices_platform ON devices(platform);
CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices(last_seen DESC);

-- Presets table: User generation presets/profiles
CREATE TABLE IF NOT EXISTS presets (
  id TEXT PRIMARY KEY,                   -- UUID v4
  device_id TEXT NOT NULL,               -- FK to devices.id (owner device)
  name TEXT NOT NULL,                    -- Preset name
  settings TEXT NOT NULL,                -- JSON blob of generation settings
  thumbnail_path TEXT,                   -- Local path to preset thumbnail
  created_at INTEGER NOT NULL,           -- Unix timestamp (milliseconds)
  updated_at INTEGER NOT NULL,           -- Unix timestamp (milliseconds)
  deleted INTEGER DEFAULT 0 CHECK(deleted IN (0, 1)),  -- Soft delete flag
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_presets_device_id ON presets(device_id);
CREATE INDEX IF NOT EXISTS idx_presets_updated_at ON presets(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_presets_deleted ON presets(deleted);

-- Images table: Generated images metadata
CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,                   -- UUID v4
  device_id TEXT NOT NULL,               -- FK to devices.id (owner device)
  preset_id TEXT,                        -- FK to presets.id (nullable)
  filename TEXT NOT NULL,                -- Original filename
  filepath TEXT NOT NULL UNIQUE,         -- Full filesystem path
  width INTEGER NOT NULL,                -- Image width in pixels
  height INTEGER NOT NULL,               -- Image height in pixels
  filesize INTEGER NOT NULL,             -- File size in bytes
  prompt TEXT,                           -- Generation prompt
  negative_prompt TEXT,                  -- Negative prompt
  settings TEXT,                         -- JSON blob of generation settings
  thumbnail_path TEXT,                   -- Local path to thumbnail
  created_at INTEGER NOT NULL,           -- Unix timestamp (milliseconds)
  deleted INTEGER DEFAULT 0 CHECK(deleted IN (0, 1)),  -- Soft delete flag
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  FOREIGN KEY (preset_id) REFERENCES presets(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_images_device_id ON images(device_id);
CREATE INDEX IF NOT EXISTS idx_images_preset_id ON images(preset_id);
CREATE INDEX IF NOT EXISTS idx_images_created_at ON images(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_images_deleted ON images(deleted);

-- Generation jobs table: Track generation requests
CREATE TABLE IF NOT EXISTS generation_jobs (
  id TEXT PRIMARY KEY,                   -- UUID v4 or ComfyUI prompt_id
  device_id TEXT NOT NULL,               -- FK to devices.id
  preset_id TEXT,                        -- FK to presets.id (nullable)
  status TEXT NOT NULL CHECK(status IN ('queued', 'executing', 'completed', 'failed', 'cancelled')),
  progress INTEGER DEFAULT 0,            -- Progress percentage (0-100)
  prompt TEXT NOT NULL,                  -- Generation prompt
  settings TEXT NOT NULL,                -- JSON blob of generation settings
  result_image_id TEXT,                  -- FK to images.id (nullable, set on completion)
  error_message TEXT,                    -- Error details if failed
  created_at INTEGER NOT NULL,           -- Unix timestamp (milliseconds)
  started_at INTEGER,                    -- Unix timestamp (milliseconds)
  completed_at INTEGER,                  -- Unix timestamp (milliseconds)
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  FOREIGN KEY (preset_id) REFERENCES presets(id) ON DELETE SET NULL,
  FOREIGN KEY (result_image_id) REFERENCES images(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_generation_jobs_device_id ON generation_jobs(device_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_status ON generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_created_at ON generation_jobs(created_at DESC);
