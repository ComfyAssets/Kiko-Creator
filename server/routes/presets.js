import express from 'express'
import { randomUUID } from 'crypto'
import {
  getPresets,
  getPreset,
  createPreset,
  updatePreset,
  deletePreset,
  getPresetsModifiedSince
} from '../db/index.js'
import { optionalAuth } from '../middleware/auth.js'

const router = express.Router()

// Get all presets (with optional device filtering for mobile)
router.get('/', optionalAuth, (req, res) => {
  try {
    // If authenticated (mobile), filter by device_id
    // If not authenticated (browser), return all presets
    const deviceId = req.device?.id || null
    const presets = getPresets(deviceId)
    res.json({ success: true, presets })
  } catch (error) {
    console.error('Error getting presets:', error)
    res.status(500).json({ success: false, message: 'Failed to get presets', error: error.message })
  }
})

// Get preset delta sync (mobile-specific)
router.get('/sync', optionalAuth, (req, res) => {
  try {
    const { since } = req.query
    const deviceId = req.device?.id

    if (!deviceId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required for preset sync'
      })
    }

    if (!since) {
      return res.status(400).json({
        success: false,
        message: 'since parameter is required (Unix timestamp in milliseconds)'
      })
    }

    const sinceTimestamp = parseInt(since)
    if (isNaN(sinceTimestamp)) {
      return res.status(400).json({
        success: false,
        message: 'since must be a valid Unix timestamp'
      })
    }

    const modifiedPresets = getPresetsModifiedSince(deviceId, sinceTimestamp)
    const serverTime = Date.now()

    res.json({
      success: true,
      presets: modifiedPresets,
      serverTime
    })
  } catch (error) {
    console.error('Error syncing presets:', error)
    res.status(500).json({ success: false, message: 'Failed to sync presets', error: error.message })
  }
})

// Get single preset by ID
router.get('/:id', (req, res) => {
  try {
    const preset = getPreset(req.params.id)
    if (!preset) {
      return res.status(404).json({ success: false, message: 'Preset not found' })
    }
    res.json({ success: true, preset })
  } catch (error) {
    console.error('Error getting preset:', error)
    res.status(500).json({ success: false, message: 'Failed to get preset', error: error.message })
  }
})

// Create new preset (with optional device association for mobile)
router.post('/', optionalAuth, (req, res) => {
  try {
    const { name, description, settings, thumbnailPath, isFavorite, usageCount } = req.body

    if (!name || !settings) {
      return res.status(400).json({ success: false, message: 'Name and settings are required' })
    }

    const presetData = {
      id: randomUUID(),
      deviceId: req.device?.id || null, // Associate with device if authenticated
      name,
      description: description || '',
      settings,
      thumbnailPath: thumbnailPath || null,
      isFavorite: isFavorite || false,
      usageCount: usageCount || 0
    }

    const preset = createPreset(presetData)
    res.json({ success: true, message: `Created preset: ${name}`, preset })
  } catch (error) {
    console.error('Error creating preset:', error)
    res.status(500).json({ success: false, message: 'Failed to create preset', error: error.message })
  }
})

// Update existing preset
router.put('/:id', (req, res) => {
  try {
    const { name, description, settings, thumbnailPath, isFavorite, usageCount } = req.body

    const updates = {}
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (settings !== undefined) updates.settings = settings
    if (thumbnailPath !== undefined) updates.thumbnailPath = thumbnailPath
    if (isFavorite !== undefined) updates.isFavorite = isFavorite
    if (usageCount !== undefined) updates.usageCount = usageCount

    const preset = updatePreset(req.params.id, updates)

    if (!preset) {
      return res.status(404).json({ success: false, message: 'Preset not found' })
    }

    res.json({ success: true, message: `Updated preset: ${preset.name}`, preset })
  } catch (error) {
    console.error('Error updating preset:', error)
    res.status(500).json({ success: false, message: 'Failed to update preset', error: error.message })
  }
})

// Delete preset (soft delete)
router.delete('/:id', (req, res) => {
  try {
    const preset = getPreset(req.params.id)
    if (!preset) {
      return res.status(404).json({ success: false, message: 'Preset not found' })
    }

    const success = deletePreset(req.params.id)

    if (success) {
      res.json({ success: true, message: `Deleted preset: ${preset.name}` })
    } else {
      res.status(500).json({ success: false, message: 'Failed to delete preset' })
    }
  } catch (error) {
    console.error('Error deleting preset:', error)
    res.status(500).json({ success: false, message: 'Failed to delete preset', error: error.message })
  }
})

// Increment usage count
router.post('/:id/increment-usage', (req, res) => {
  try {
    const preset = getPreset(req.params.id)
    if (!preset) {
      return res.status(404).json({ success: false, message: 'Preset not found' })
    }

    const updated = updatePreset(req.params.id, { usageCount: preset.usageCount + 1 })
    res.json({ success: true, preset: updated })
  } catch (error) {
    console.error('Error incrementing usage:', error)
    res.status(500).json({ success: false, message: 'Failed to increment usage', error: error.message })
  }
})

// Toggle favorite
router.post('/:id/toggle-favorite', (req, res) => {
  try {
    const preset = getPreset(req.params.id)
    if (!preset) {
      return res.status(404).json({ success: false, message: 'Preset not found' })
    }

    const updated = updatePreset(req.params.id, { isFavorite: !preset.isFavorite })
    res.json({
      success: true,
      isFavorite: updated.isFavorite,
      message: updated.isFavorite ? 'Added to favorites' : 'Removed from favorites',
      preset: updated
    })
  } catch (error) {
    console.error('Error toggling favorite:', error)
    res.status(500).json({ success: false, message: 'Failed to toggle favorite', error: error.message })
  }
})

export default router
