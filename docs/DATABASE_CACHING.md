# Database Caching System

## Overview

Kiko Creator uses **SQLite** for persistent caching of model metadata, hashes, and CivitAI data. This dramatically speeds up subsequent scans and reduces API calls.

## Why Caching?

**Without caching:**
- Hash calculation: ~5-30 seconds per GB model file
- CivitAI API calls: 136 models × 500ms = 68+ seconds + rate limits
- **Total first scan: 5-10 minutes** for 136 models

**With caching:**
- Unchanged files: instant (read from DB)
- Changed files: only hash those specific files
- Metadata: reused for duplicate hashes across files
- **Subsequent scans: 5-10 seconds**

## Database Schema

### Tables

#### 1. `models`
Stores core model information with file tracking.

```sql
CREATE TABLE models (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,              -- Filename
  path TEXT NOT NULL UNIQUE,       -- Absolute path (unique)
  folder TEXT,                     -- Relative folder
  type TEXT NOT NULL,              -- checkpoint/lora/embedding
  size INTEGER NOT NULL,           -- File size in bytes
  hash TEXT UNIQUE,                -- SHA256 hash
  file_modified_at TEXT NOT NULL,  -- ISO timestamp
  scanned_at TEXT NOT NULL,        -- First discovered
  updated_at TEXT NOT NULL         -- Last updated
);
```

**Key:** Uses `path` as unique identifier, `file_modified_at` for cache invalidation.

#### 2. `civitai_metadata`
Stores CivitAI metadata linked to models.

```sql
CREATE TABLE civitai_metadata (
  id INTEGER PRIMARY KEY,
  model_id INTEGER UNIQUE,         -- FK to models.id
  civitai_id INTEGER,              -- CivitAI version ID
  model_name TEXT,                 -- Human-readable name
  description TEXT,
  base_model TEXT,                 -- SD 1.5, SDXL, etc.
  trained_words TEXT,              -- JSON array
  images TEXT,                     -- JSON array
  stats TEXT,                      -- JSON object
  fetched_at TEXT NOT NULL
);
```

**Key:** One-to-one with models, stores JSON for complex data.

#### 3. `scan_history`
Tracks all discovery operations for debugging and analytics.

```sql
CREATE TABLE scan_history (
  id INTEGER PRIMARY KEY,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  yaml_path TEXT NOT NULL,
  checkpoints_found INTEGER,
  loras_found INTEGER,
  embeddings_found INTEGER,
  errors TEXT,                     -- JSON array
  civitai_enabled INTEGER,
  duration_seconds INTEGER
);
```

#### 4. `app_metadata`
Key-value store for application-level settings.

```sql
CREATE TABLE app_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

Stores: `schema_version`, `last_scan`, `total_models`.

## Caching Strategy

### Smart Cache Invalidation

```
┌─────────────────────────────────────────┐
│  File discovered during scan            │
└──────────────┬──────────────────────────┘
               │
               ▼
       ┌───────────────┐
       │ In database?  │
       └───┬───────┬───┘
           │       │
          NO      YES
           │       │
           │       ▼
           │   ┌────────────────────┐
           │   │ File modified_at   │
           │   │ matches DB?        │
           │   └───┬────────────┬───┘
           │       │            │
           │      YES          NO
           │       │            │
           │       ▼            │
           │   ┌────────────┐  │
           │   │ USE CACHE  │  │
           │   │ (instant)  │  │
           │   └────────────┘  │
           │                   │
           ▼                   ▼
      ┌────────────────────────────┐
      │  Calculate hash (slow)     │
      └──────────┬─────────────────┘
                 │
                 ▼
         ┌──────────────┐
         │ Hash in DB?  │
         └───┬──────┬───┘
             │      │
            YES    NO
             │      │
             ▼      ▼
    ┌────────────────────────┐
    │ Reuse metadata         │
    │ OR fetch from CivitAI  │
    └────────┬───────────────┘
             │
             ▼
    ┌────────────────┐
    │  Save to DB    │
    └────────────────┘
```

### Hash Reuse Logic

**Scenario:** Same model in multiple locations (different filenames).

```
/models/checkpoints/model_v1.safetensors  → hash: ABC123
/models/backup/old_model.safetensors      → hash: ABC123 (same file)
```

**Result:** Only one CivitAI API call, metadata reused for both.

## Database Operations

### Core Functions

#### `upsertModel(model)`
Insert or update model record.
- **Conflict resolution:** ON CONFLICT(path) DO UPDATE
- **Returns:** Model ID

#### `upsertCivitAIMetadata(modelId, metadata)`
Save CivitAI metadata for a model.
- **Conflict resolution:** ON CONFLICT(model_id) DO UPDATE

#### `getModel(identifier, type)`
Retrieve model by path or hash with joined metadata.
- **Type:** 'path' or 'hash'
- **Returns:** Complete model object or null

#### `getModels(filters)`
Query models with filters: type, folder, hasMetadata, limit, offset.
- **Returns:** Array of model objects

#### `needsUpdate(path, fileModifiedAt)`
Check if file has been modified since last scan.
- **Returns:** Boolean

### Advanced Operations

#### `batchUpsertModels(models)`
Insert many models in a transaction for performance.

#### `cleanupMissingModels(existingPaths)`
Remove database records for deleted files.

#### `getModelsNeedingMetadata(type)`
Find models with hash but no CivitAI data (useful for batch refresh).

#### `getModelStats()`
Get statistics: total, by type, with hashes, with metadata.

## API Endpoints

### `GET /api/models`
Get all models with optional filters.

**Query params:**
- `type`: checkpoint|lora|embedding
- `folder`: filter by folder path
- `hasMetadata`: true (only models with CivitAI data)
- `limit`: pagination limit
- `offset`: pagination offset

**Response:**
```json
{
  "success": true,
  "models": [...],
  "count": 136
}
```

### `GET /api/models/by-path?path=/path/to/model.safetensors`
Get single model by file path.

### `GET /api/models/by-hash?hash=ABC123...`
Get single model by SHA256 hash.

### `GET /api/models/by-folder?type=checkpoint`
Get models grouped by folder structure.

**Response:**
```json
{
  "success": true,
  "folders": ["anime", "realistic", "style"],
  "modelsByFolder": {
    "anime": [...],
    "realistic": [...]
  },
  "totalModels": 136
}
```

### `GET /api/models/stats`
Get model statistics and cache info.

**Response:**
```json
{
  "success": true,
  "stats": {
    "checkpoint": 50,
    "lora": 80,
    "embedding": 6,
    "with_metadata": 120,
    "with_hashes": 136,
    "total": 136,
    "last_scan": "2025-01-15T10:30:00Z"
  }
}
```

### `GET /api/models/scan-history?limit=10`
Get recent scan operations.

### `GET /api/models/needs-metadata?type=lora`
Get models that have hashes but no CivitAI metadata (useful for batch refresh).

## Performance Metrics

### First Scan (Cold Cache)
- **136 models, ~200GB total**
- Hash calculation: ~5-8 minutes
- CivitAI API calls: ~2-3 minutes
- Database writes: ~1 second
- **Total: ~8-12 minutes**

### Second Scan (Warm Cache, No Changes)
- Database reads: 136 models in ~100ms
- No hash calculations
- No API calls
- **Total: ~5 seconds**

### Incremental Scan (10 New Models)
- Cache hits: 126 models (~50ms)
- Hash new files: 10 models (~1-2 minutes)
- CivitAI for new: ~10-15 seconds
- **Total: ~2 minutes**

## Cache Maintenance

### When Cache is Invalidated

1. **File modified:** Hash recalculated
2. **File moved/renamed:** Treated as new file
3. **File deleted:** Removed from DB (cleanup operation)

### Manual Refresh

To force refresh of all models:
1. Delete database: `rm data/models.db`
2. Re-run discovery scan

To refresh metadata only (keep hashes):
```bash
curl http://localhost:3000/api/models/needs-metadata
# Returns models needing metadata

# Then call discovery with fetchMetadata=true
```

## Database Location

**Development:**
```
/home/vito/ai-apps/kiko-creator/data/models.db
/home/vito/ai-apps/kiko-creator/data/models.db-shm  (WAL shared memory)
/home/vito/ai-apps/kiko-creator/data/models.db-wal  (Write-Ahead Log)
```

**Production:**
Database location configurable via environment variable or config.

## Migration & Backup

### Backup Database
```bash
sqlite3 data/models.db ".backup data/models_backup.db"
```

### Export to CSV
```bash
sqlite3 data/models.db <<EOF
.headers on
.mode csv
.output data/models_export.csv
SELECT * FROM models;
EOF
```

### Schema Migration

Schema version tracked in `app_metadata`:
```sql
SELECT value FROM app_metadata WHERE key = 'schema_version';
```

Future migrations will use versioned SQL files in `server/db/migrations/`.

## Benefits Summary

✅ **Speed:** 100x faster subsequent scans
✅ **API Rate Limits:** No repeated CivitAI calls
✅ **Hash Reuse:** Duplicate files detected automatically
✅ **Offline Mode:** View cached models without network
✅ **History:** Track all scan operations
✅ **Analytics:** Statistics and trends over time
✅ **Flexibility:** Query by path, hash, folder, type

## Next Steps

1. **Install dependency:** `cd server && npm install` (installs better-sqlite3)
2. **First scan:** Database auto-initializes on first model discovery
3. **Query cache:** Use `/api/models` endpoints to access cached data
4. **Monitor:** Check `/api/models/stats` for cache effectiveness
