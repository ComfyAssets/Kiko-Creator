import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Database file location
const DB_PATH = path.join(__dirname, '../../data/models.db')

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH)
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

// Initialize database
let db = null

function getDatabase() {
  if (db) return db

  console.log('📁 Initializing SQLite database:', DB_PATH)
  db = new Database(DB_PATH)

  // Enable WAL mode for better concurrent access
  db.pragma('journal_mode = WAL')

  // Initialize schema
  const schemaPath = path.join(__dirname, 'schema.sql')
  const schema = fs.readFileSync(schemaPath, 'utf8')

  // Execute schema in a transaction
  db.exec(schema)

  // Run migrations
  runMigrations(db)

  console.log('✅ Database initialized successfully')
  return db
}

// Database migrations
function runMigrations(db) {
  // Get current schema version
  const versionRow = db.prepare('SELECT value FROM app_metadata WHERE key = ?').get('schema_version')
  const currentVersion = versionRow ? parseInt(versionRow.value) : 1

  // Migration 1 → 2: Add thumbnail_path to civitai_metadata
  if (currentVersion < 2) {
    console.log('📦 Running migration: Add thumbnail_path column')
    try {
      db.exec(`
        ALTER TABLE civitai_metadata ADD COLUMN thumbnail_path TEXT;
      `)
      db.prepare('UPDATE app_metadata SET value = ?, updated_at = datetime(\'now\') WHERE key = ?')
        .run('2', 'schema_version')
      console.log('✅ Migration completed: thumbnail_path added')
    } catch (error) {
      // Column might already exist, ignore
      if (!error.message.includes('duplicate column')) {
        console.warn('⚠️  Migration warning:', error.message)
      }
    }
  }

  // Migration 2 → 3: Create scan_history table if missing
  if (currentVersion < 3) {
    console.log('📦 Running migration: Create scan_history table')
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS scan_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          started_at TEXT NOT NULL,
          completed_at TEXT,
          yaml_path TEXT NOT NULL,
          checkpoints_found INTEGER DEFAULT 0,
          loras_found INTEGER DEFAULT 0,
          embeddings_found INTEGER DEFAULT 0,
          errors TEXT,
          civitai_enabled INTEGER DEFAULT 0,
          duration_seconds INTEGER
        );

        CREATE INDEX IF NOT EXISTS idx_scan_history_started_at ON scan_history(started_at DESC);
      `)
      db.prepare('UPDATE app_metadata SET value = ?, updated_at = datetime(\'now\') WHERE key = ?')
        .run('3', 'schema_version')
      console.log('✅ Migration completed: scan_history table created')
    } catch (error) {
      console.warn('⚠️  Migration warning:', error.message)
    }
  }
}

// Model CRUD operations

/**
 * Insert or update a model in the database
 * @param {Object} model - Model object with name, path, folder, type, size, hash, fileModifiedAt
 * @returns {number} - Model ID
 */
export function upsertModel(model) {
  const db = getDatabase()

  const stmt = db.prepare(`
    INSERT INTO models (name, path, folder, type, size, hash, file_modified_at, scanned_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(path) DO UPDATE SET
      name = excluded.name,
      folder = excluded.folder,
      size = excluded.size,
      hash = excluded.hash,
      file_modified_at = excluded.file_modified_at,
      updated_at = datetime('now')
    RETURNING id
  `)

  const result = stmt.get(
    model.name,
    model.path,
    model.folder || '',
    model.type,
    model.size,
    model.hash,
    model.fileModifiedAt
  )

  return result.id
}

/**
 * Insert or update CivitAI metadata for a model
 * @param {number} modelId - Model ID
 * @param {Object} metadata - CivitAI metadata object
 */
export function upsertCivitAIMetadata(modelId, metadata) {
  const db = getDatabase()

  const stmt = db.prepare(`
    INSERT INTO civitai_metadata (
      model_id, civitai_id, civitai_model_id, model_name, description,
      base_model, trained_words, images, thumbnail_path, stats, fetched_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(model_id) DO UPDATE SET
      civitai_id = excluded.civitai_id,
      civitai_model_id = excluded.civitai_model_id,
      model_name = excluded.model_name,
      description = excluded.description,
      base_model = excluded.base_model,
      trained_words = excluded.trained_words,
      images = excluded.images,
      thumbnail_path = excluded.thumbnail_path,
      stats = excluded.stats,
      fetched_at = datetime('now')
  `)

  stmt.run(
    modelId,
    metadata.id || null,
    metadata.modelId || null,
    metadata.modelName || null,
    metadata.description || null,
    metadata.baseModel || null,
    JSON.stringify(metadata.trainedWords || []),
    JSON.stringify(metadata.images || []),
    metadata.thumbnailPath || null,
    JSON.stringify(metadata.stats || {})
  )
}

/**
 * Get all models with optional filters
 * @param {Object} filters - { type, folder, hasMetadata, limit, offset }
 * @returns {Array} - Array of model objects
 */
export function getModels(filters = {}) {
  const db = getDatabase()

  let query = `
    SELECT
      m.*,
      c.civitai_id,
      c.civitai_model_id,
      c.model_name as civitai_model_name,
      c.description,
      c.base_model,
      c.trained_words,
      c.images,
      c.thumbnail_path,
      c.stats,
      c.fetched_at as metadata_fetched_at
    FROM models m
    LEFT JOIN civitai_metadata c ON m.id = c.model_id
    WHERE 1=1
  `

  const params = []

  if (filters.type) {
    query += ' AND m.type = ?'
    params.push(filters.type)
  }

  if (filters.folder !== undefined) {
    query += ' AND m.folder = ?'
    params.push(filters.folder)
  }

  if (filters.hasMetadata) {
    query += ' AND c.id IS NOT NULL'
  }

  query += ' ORDER BY m.folder, m.name'

  if (filters.limit) {
    query += ' LIMIT ?'
    params.push(filters.limit)
  }

  if (filters.offset) {
    query += ' OFFSET ?'
    params.push(filters.offset)
  }

  const stmt = db.prepare(query)
  const rows = stmt.all(...params)

  // Parse JSON fields
  return rows.map((row) => ({
    ...row,
    trained_words: row.trained_words ? JSON.parse(row.trained_words) : [],
    images: row.images ? JSON.parse(row.images) : [],
    stats: row.stats ? JSON.parse(row.stats) : {}
  }))
}

/**
 * Get a single model by path or hash
 * @param {string} identifier - Path or hash
 * @param {string} identifierType - 'path' or 'hash'
 * @returns {Object|null} - Model object or null
 */
export function getModel(identifier, identifierType = 'path') {
  const db = getDatabase()

  const column = identifierType === 'hash' ? 'm.hash' : 'm.path'

  const stmt = db.prepare(`
    SELECT
      m.*,
      c.civitai_id,
      c.civitai_model_id,
      c.model_name as civitai_model_name,
      c.description,
      c.base_model,
      c.trained_words,
      c.images,
      c.stats,
      c.fetched_at as metadata_fetched_at
    FROM models m
    LEFT JOIN civitai_metadata c ON m.id = c.model_id
    WHERE ${column} = ?
  `)

  const row = stmt.get(identifier)

  if (!row) return null

  return {
    ...row,
    trained_words: row.trained_words ? JSON.parse(row.trained_words) : [],
    images: row.images ? JSON.parse(row.images) : [],
    stats: row.stats ? JSON.parse(row.stats) : {}
  }
}

/**
 * Check if a model needs updating based on file modification time
 * @param {string} path - Model file path
 * @param {string} fileModifiedAt - ISO timestamp
 * @returns {boolean} - True if model needs updating
 */
export function needsUpdate(path, fileModifiedAt) {
  const db = getDatabase()

  const stmt = db.prepare(`
    SELECT file_modified_at FROM models WHERE path = ?
  `)

  const row = stmt.get(path)

  if (!row) return true // New model

  return row.file_modified_at !== fileModifiedAt
}

/**
 * Get models that need metadata refresh (hash exists but no metadata)
 * @param {string} type - Model type filter (optional)
 * @returns {Array} - Array of models needing metadata
 */
export function getModelsNeedingMetadata(type = null) {
  const db = getDatabase()

  let query = `
    SELECT m.*
    FROM models m
    LEFT JOIN civitai_metadata c ON m.id = c.model_id
    WHERE m.hash IS NOT NULL
      AND c.id IS NULL
  `

  if (type) {
    query += ' AND m.type = ?'
  }

  const stmt = db.prepare(query)
  const rows = type ? stmt.all(type) : stmt.all()

  return rows
}

// Scan history operations

/**
 * Start a new scan operation
 * @param {string} yamlPath - Path to YAML file
 * @param {boolean} civitaiEnabled - Whether CivitAI metadata will be fetched
 * @returns {number} - Scan ID
 */
export function startScan(yamlPath, civitaiEnabled = false) {
  const db = getDatabase()

  const stmt = db.prepare(`
    INSERT INTO scan_history (started_at, yaml_path, civitai_enabled)
    VALUES (datetime('now'), ?, ?)
    RETURNING id
  `)

  const result = stmt.get(yamlPath, civitaiEnabled ? 1 : 0)
  return result.id
}

/**
 * Complete a scan operation
 * @param {number} scanId - Scan ID
 * @param {Object} results - { checkpoints, loras, embeddings, errors }
 * @param {number} durationSeconds - Scan duration
 */
export function completeScan(scanId, results, durationSeconds) {
  const db = getDatabase()

  const stmt = db.prepare(`
    UPDATE scan_history
    SET completed_at = datetime('now'),
        checkpoints_found = ?,
        loras_found = ?,
        embeddings_found = ?,
        errors = ?,
        duration_seconds = ?
    WHERE id = ?
  `)

  stmt.run(
    results.checkpoints || 0,
    results.loras || 0,
    results.embeddings || 0,
    results.errors ? JSON.stringify(results.errors) : null,
    durationSeconds,
    scanId
  )

  // Update app metadata
  updateAppMetadata('last_scan', new Date().toISOString())
  updateAppMetadata('total_models', (results.checkpoints + results.loras + results.embeddings).toString())
}

/**
 * Get recent scan history
 * @param {number} limit - Number of scans to retrieve
 * @returns {Array} - Array of scan records
 */
export function getScanHistory(limit = 10) {
  const db = getDatabase()

  const stmt = db.prepare(`
    SELECT * FROM scan_history
    ORDER BY started_at DESC
    LIMIT ?
  `)

  return stmt.all(limit)
}

// App metadata operations

/**
 * Get app metadata value
 * @param {string} key - Metadata key
 * @returns {string|null} - Metadata value
 */
export function getAppMetadata(key) {
  const db = getDatabase()

  const stmt = db.prepare('SELECT value FROM app_metadata WHERE key = ?')
  const row = stmt.get(key)

  return row ? row.value : null
}

/**
 * Update app metadata
 * @param {string} key - Metadata key
 * @param {string} value - Metadata value
 */
export function updateAppMetadata(key, value) {
  const db = getDatabase()

  const stmt = db.prepare(`
    INSERT INTO app_metadata (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = datetime('now')
  `)

  stmt.run(key, value)
}

// Statistics operations

/**
 * Get model statistics
 * @returns {Object} - Statistics object
 */
export function getModelStats() {
  const db = getDatabase()

  const stats = {}

  // Count by type
  const typeStmt = db.prepare(`
    SELECT type, COUNT(*) as count
    FROM models
    GROUP BY type
  `)
  const typeCounts = typeStmt.all()
  typeCounts.forEach((row) => {
    stats[row.type] = row.count
  })

  // Count with metadata
  const metadataStmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM models m
    INNER JOIN civitai_metadata c ON m.id = c.model_id
  `)
  stats.with_metadata = metadataStmt.get().count

  // Count with hashes
  const hashStmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM models
    WHERE hash IS NOT NULL
  `)
  stats.with_hashes = hashStmt.get().count

  // Total
  const totalStmt = db.prepare('SELECT COUNT(*) as count FROM models')
  stats.total = totalStmt.get().count

  return stats
}

// Batch operations for performance

/**
 * Insert multiple models in a transaction
 * @param {Array} models - Array of model objects
 * @returns {Array} - Array of model IDs
 */
export function batchUpsertModels(models) {
  const db = getDatabase()

  const insertMany = db.transaction((modelsList) => {
    const ids = []
    for (const model of modelsList) {
      const id = upsertModel(model)
      ids.push(id)
    }
    return ids
  })

  return insertMany(models)
}

// Cleanup operations

/**
 * Remove models that no longer exist on disk
 * @param {Array} existingPaths - Array of current file paths
 * @returns {number} - Number of models removed
 */
export function cleanupMissingModels(existingPaths) {
  const db = getDatabase()

  if (existingPaths.length === 0) return 0

  const placeholders = existingPaths.map(() => '?').join(',')

  const stmt = db.prepare(`
    DELETE FROM models
    WHERE path NOT IN (${placeholders})
  `)

  const result = stmt.run(...existingPaths)
  return result.changes
}

// Database maintenance operations

/**
 * Get database statistics
 * @returns {Object} - Database statistics
 */
export function getDatabaseStats() {
  const db = getDatabase()

  // Get database size
  const dbStats = fs.statSync(DB_PATH)
  const sizeInMB = (dbStats.size / (1024 * 1024)).toFixed(2)

  // Get table counts
  const modelCount = db.prepare('SELECT COUNT(*) as count FROM models').get()
  const metadataCount = db.prepare('SELECT COUNT(*) as count FROM civitai_metadata').get()
  const scanHistoryCount = db.prepare('SELECT COUNT(*) as count FROM scan_history').get()

  // Get last scan date
  const lastScan = db.prepare('SELECT MAX(started_at) as last_scan FROM scan_history').get()

  return {
    databaseSize: `${sizeInMB} MB`,
    totalModels: modelCount.count,
    modelsWithMetadata: metadataCount.count,
    totalScans: scanHistoryCount.count,
    lastScanDate: lastScan.last_scan,
    databasePath: DB_PATH
  }
}

/**
 * Vacuum database to reclaim space and defragment
 * @returns {Object} - Result with stats
 */
export function vacuumDatabase() {
  const db = getDatabase()
  const beforeStats = fs.statSync(DB_PATH)
  const beforeSize = (beforeStats.size / (1024 * 1024)).toFixed(2)

  console.log(`📊 Database size before vacuum: ${beforeSize} MB`)

  // Run VACUUM
  db.exec('VACUUM')

  const afterStats = fs.statSync(DB_PATH)
  const afterSize = (afterStats.size / (1024 * 1024)).toFixed(2)
  const reclaimed = (beforeSize - afterSize).toFixed(2)

  console.log(`📊 Database size after vacuum: ${afterSize} MB`)
  console.log(`💾 Space reclaimed: ${reclaimed} MB`)

  return {
    success: true,
    beforeSize: `${beforeSize} MB`,
    afterSize: `${afterSize} MB`,
    spaceReclaimed: `${reclaimed} MB`,
    message: 'Database vacuumed successfully'
  }
}

/**
 * Optimize database by analyzing tables and rebuilding indexes
 * @returns {Object} - Result
 */
export function optimizeDatabase() {
  const db = getDatabase()

  console.log('📊 Analyzing database tables...')
  db.exec('ANALYZE')

  console.log('🔧 Rebuilding indexes...')
  db.exec('REINDEX')

  return {
    success: true,
    message: 'Database optimized successfully'
  }
}

/**
 * Backup database to a timestamped file
 * @returns {Object} - Result with backup path
 */
export function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  const backupPath = path.join(dataDir, `models_backup_${timestamp}.db`)

  console.log(`💾 Creating backup: ${backupPath}`)

  // Create backup using better-sqlite3's backup API
  const db = getDatabase()
  db.backup(backupPath)

  const backupStats = fs.statSync(backupPath)
  const backupSize = (backupStats.size / (1024 * 1024)).toFixed(2)

  console.log(`✅ Backup created: ${backupSize} MB`)

  return {
    success: true,
    backupPath,
    backupSize: `${backupSize} MB`,
    timestamp,
    message: 'Database backup created successfully'
  }
}

// Export database instance for advanced queries
export { getDatabase }
