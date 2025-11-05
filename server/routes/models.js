import express from 'express'
import {
  getModels,
  getModel,
  getModelStats,
  getScanHistory,
  getModelsNeedingMetadata,
  getAppMetadata
} from '../db/index.js'

const router = express.Router()

// Get all models grouped by type (for frontend state)
router.get('/grouped', (req, res) => {
  try {
    // Get all models from database
    const allModels = getModels()

    // Group by type for frontend compatibility
    const grouped = {
      checkpoints: [],
      loras: [],
      embeddings: []
    }

    allModels.forEach(model => {
      const modelData = {
        name: model.name,
        path: model.path,
        folder: model.folder || '',
        size: model.size,
        hash: model.hash,
        type: model.type, // Include type field for frontend filtering
        // Include metadata if available
        civitai_id: model.civitai_id,
        civitai_model_name: model.civitai_model_name,
        description: model.description,
        base_model: model.base_model,
        trained_words: model.trained_words || [],
        thumbnail_path: model.thumbnail_path,
        stats: model.stats || {},
        // Include metadata object for dropdown component
        metadata: {
          modelName: model.civitai_model_name,
          thumbnailPath: model.thumbnail_path
        }
      }

      if (model.type === 'checkpoint') {
        grouped.checkpoints.push(modelData)
      } else if (model.type === 'lora') {
        grouped.loras.push(modelData)
      } else if (model.type === 'embedding') {
        grouped.embeddings.push(modelData)
      }
    })

    res.json({
      success: true,
      models: grouped,
      counts: {
        checkpoints: grouped.checkpoints.length,
        loras: grouped.loras.length,
        embeddings: grouped.embeddings.length,
        total: allModels.length
      }
    })
  } catch (error) {
    console.error('Failed to get grouped models:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get all models with optional filters
router.get('/', (req, res) => {
  try {
    const { type, folder, hasMetadata, limit, offset } = req.query

    const filters = {}

    if (type) filters.type = type
    if (folder !== undefined) filters.folder = folder
    if (hasMetadata === 'true') filters.hasMetadata = true
    if (limit) filters.limit = parseInt(limit)
    if (offset) filters.offset = parseInt(offset)

    const models = getModels(filters)

    res.json({
      success: true,
      models,
      count: models.length
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get a single model by path or hash
router.get('/by-path', (req, res) => {
  try {
    const { path } = req.query

    if (!path) {
      return res.status(400).json({ error: 'Path parameter is required' })
    }

    const model = getModel(path, 'path')

    if (!model) {
      return res.status(404).json({ error: 'Model not found' })
    }

    res.json({
      success: true,
      model
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/by-hash', (req, res) => {
  try {
    const { hash } = req.query

    if (!hash) {
      return res.status(400).json({ error: 'Hash parameter is required' })
    }

    const model = getModel(hash, 'hash')

    if (!model) {
      return res.status(404).json({ error: 'Model not found' })
    }

    res.json({
      success: true,
      model
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get models grouped by folder
router.get('/by-folder', (req, res) => {
  try {
    const { type } = req.query

    const filters = type ? { type } : {}
    const models = getModels(filters)

    // Group by folder
    const modelsByFolder = models.reduce((acc, model) => {
      const folder = model.folder || '(root)'
      if (!acc[folder]) {
        acc[folder] = []
      }
      acc[folder].push(model)
      return acc
    }, {})

    res.json({
      success: true,
      folders: Object.keys(modelsByFolder).sort(),
      modelsByFolder,
      totalModels: models.length
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get model statistics
router.get('/stats', (req, res) => {
  try {
    const stats = getModelStats()
    const lastScan = getAppMetadata('last_scan')

    res.json({
      success: true,
      stats: {
        ...stats,
        last_scan: lastScan
      }
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get scan history
router.get('/scan-history', (req, res) => {
  try {
    const { limit = 10 } = req.query

    const history = getScanHistory(parseInt(limit))

    res.json({
      success: true,
      history
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get models that need metadata (hash exists but no CivitAI data)
router.get('/needs-metadata', (req, res) => {
  try {
    const { type } = req.query

    const models = getModelsNeedingMetadata(type || null)

    res.json({
      success: true,
      models,
      count: models.length
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
