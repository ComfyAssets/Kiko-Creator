import express from 'express'
import { getDatabase } from '../db/index.js'

const router = express.Router()

/**
 * Helper function to parse setting values from DB
 * Converts string booleans, numbers, and JSON arrays
 */
function parseSettingValue(key, value) {
  // Boolean settings
  if (value === 'true') return true
  if (value === 'false') return false

  // Number settings
  if (key.startsWith('defaults_') && !key.endsWith('_checkpoint') && !key.endsWith('_sampler') && !key.endsWith('_scheduler') && !key.endsWith('_loras')) {
    const num = Number(value)
    if (!isNaN(num)) return num
  }

  // JSON array settings
  if (key.endsWith('_loras') || key.startsWith('favorite_') || key === 'hidden_models') {
    try {
      return JSON.parse(value)
    } catch (e) {
      console.error(`Failed to parse JSON for ${key}:`, value)
      return []
    }
  }

  // String settings
  return value
}

/**
 * Helper function to serialize setting values for DB
 * Converts booleans, numbers, and arrays to strings
 */
function serializeSettingValue(value) {
  if (typeof value === 'boolean') return value.toString()
  if (typeof value === 'number') return value.toString()
  if (Array.isArray(value) || typeof value === 'object') return JSON.stringify(value)
  return value.toString()
}

// GET /api/settings - Get all settings
router.get('/', (req, res) => {
  try {
    const db = getDatabase()
    const rows = db.prepare('SELECT key, value FROM app_metadata').all()

    // Build settings object with parsed values
    const settings = {}
    rows.forEach(row => {
      settings[row.key] = parseSettingValue(row.key, row.value)
    })

    res.json(settings)
  } catch (error) {
    console.error('Failed to get settings:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/settings/:key - Get specific setting
router.get('/:key', (req, res) => {
  try {
    const { key } = req.params
    const db = getDatabase()
    const row = db.prepare('SELECT value FROM app_metadata WHERE key = ?').get(key)

    if (!row) {
      return res.status(404).json({ error: `Setting '${key}' not found` })
    }

    res.json({
      key,
      value: parseSettingValue(key, row.value)
    })
  } catch (error) {
    console.error(`Failed to get setting '${req.params.key}':`, error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/settings - Batch update settings
router.post('/', (req, res) => {
  try {
    const settings = req.body

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Settings object required' })
    }

    const db = getDatabase()
    const updated = []

    // Use transaction for batch update
    const updateStmt = db.prepare(`
      INSERT INTO app_metadata (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `)

    const transaction = db.transaction((entries) => {
      for (const [key, value] of entries) {
        const serialized = serializeSettingValue(value)
        updateStmt.run(key, serialized)
        updated.push(key)
      }
    })

    transaction(Object.entries(settings))

    console.log(`✅ Updated ${updated.length} settings:`, updated)

    res.json({
      success: true,
      updated,
      count: updated.length
    })
  } catch (error) {
    console.error('Failed to update settings:', error)
    res.status(500).json({ error: error.message })
  }
})

// PUT /api/settings/:key - Update specific setting
router.put('/:key', (req, res) => {
  try {
    const { key } = req.params
    const { value } = req.body

    if (value === undefined) {
      return res.status(400).json({ error: 'Value required' })
    }

    const db = getDatabase()
    const serialized = serializeSettingValue(value)

    db.prepare(`
      INSERT INTO app_metadata (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `).run(key, serialized)

    console.log(`✅ Updated setting '${key}':`, value)

    res.json({
      success: true,
      key,
      value: parseSettingValue(key, serialized)
    })
  } catch (error) {
    console.error(`Failed to update setting '${req.params.key}':`, error)
    res.status(500).json({ error: error.message })
  }
})

// DELETE /api/settings/:key - Delete specific setting
router.delete('/:key', (req, res) => {
  try {
    const { key } = req.params
    const db = getDatabase()

    const result = db.prepare('DELETE FROM app_metadata WHERE key = ?').run(key)

    if (result.changes === 0) {
      return res.status(404).json({ error: `Setting '${key}' not found` })
    }

    console.log(`✅ Deleted setting '${key}'`)

    res.json({
      success: true,
      deleted: key
    })
  } catch (error) {
    console.error(`Failed to delete setting '${req.params.key}':`, error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/settings/migrate - Migrate from localStorage
router.post('/migrate', (req, res) => {
  try {
    const { localStorage: localStorageData } = req.body

    if (!localStorageData || !localStorageData.state) {
      return res.status(400).json({ error: 'localStorage data required' })
    }

    const { state } = localStorageData
    const db = getDatabase()
    const migrated = []

    // Map localStorage structure to DB keys
    const mapping = {
      // Setup
      setupComplete: 'setup_complete',

      // ComfyUI
      'comfyui.apiUrl': 'comfyui_api_url',
      'comfyui.modelsPath': 'comfyui_models_path',
      'comfyui.comfyuiDir': 'comfyui_dir',
      'comfyui.version': 'comfyui_version',
      'comfyui.hasMira': 'comfyui_has_mira',

      // CivitAI
      'civitai.apiKey': 'civitai_api_key',
      'civitai.huggingfaceToken': 'civitai_huggingface_token',
      'civitai.enabled': 'civitai_enabled',

      // Defaults
      'defaults.checkpoint': 'defaults_checkpoint',
      'defaults.steps': 'defaults_steps',
      'defaults.cfg': 'defaults_cfg',
      'defaults.sampler': 'defaults_sampler',
      'defaults.scheduler': 'defaults_scheduler',
      'defaults.width': 'defaults_width',
      'defaults.height': 'defaults_height',
      'defaults.loras': 'defaults_loras',

      // Preferences
      favoriteCheckpoints: 'favorite_checkpoints',
      favoriteUpscalers: 'favorite_upscalers',
      favoriteEmbeddings: 'favorite_embeddings',
      hiddenModels: 'hidden_models'
    }

    const updateStmt = db.prepare(`
      INSERT INTO app_metadata (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `)

    const transaction = db.transaction(() => {
      // Direct mappings
      for (const [localKey, dbKey] of Object.entries(mapping)) {
        if (localKey.includes('.')) {
          // Nested property (e.g., 'comfyui.apiUrl')
          const [parent, child] = localKey.split('.')
          if (state[parent] && state[parent][child] !== undefined) {
            const value = serializeSettingValue(state[parent][child])
            updateStmt.run(dbKey, value)
            migrated.push(dbKey)
          }
        } else {
          // Top-level property
          if (state[localKey] !== undefined) {
            const value = serializeSettingValue(state[localKey])
            updateStmt.run(dbKey, value)
            migrated.push(dbKey)
          }
        }
      }
    })

    transaction()

    console.log(`✅ Migrated ${migrated.length} settings from localStorage`)

    res.json({
      success: true,
      migrated: migrated.length,
      keys: migrated,
      message: 'Settings migrated successfully'
    })
  } catch (error) {
    console.error('Failed to migrate settings:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
