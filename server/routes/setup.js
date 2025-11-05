import express from 'express'
import { testConnection, discoverModels, parseYAMLFile, saveSettingsToFile } from '../services/setup.js'
import { getAppMetadata, updateAppMetadata } from '../db/index.js'

const router = express.Router()

// Check if setup is complete
router.get('/status', async (req, res) => {
  try {
    const setupComplete = getAppMetadata('setup_complete')
    res.json({
      setupComplete: setupComplete === 'true'
    })
  } catch (error) {
    console.error('Failed to check setup status:', error)
    res.status(500).json({ error: error.message })
  }
})

// Reset setup status
router.post('/reset', async (req, res) => {
  try {
    updateAppMetadata('setup_complete', 'false')
    console.log('🔄 Setup status reset')
    res.json({ success: true, message: 'Setup reset successfully' })
  } catch (error) {
    console.error('Failed to reset setup status:', error)
    res.status(500).json({ error: error.message })
  }
})

// Test ComfyUI connection
router.post('/test-connection', async (req, res) => {
  try {
    const { apiUrl } = req.body

    if (!apiUrl) {
      return res.status(400).json({ error: 'API URL is required' })
    }

    const result = await testConnection(apiUrl)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Parse extra_model_paths.yaml
router.post('/parse-yaml', async (req, res) => {
  try {
    const { yamlPath } = req.body

    if (!yamlPath) {
      return res.status(400).json({ error: 'YAML path is required' })
    }

    const paths = await parseYAMLFile(yamlPath)
    res.json(paths)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Discover models
router.get('/discover-models', async (req, res) => {
  try {
    const { apiUrl, yamlPath, civitaiKey, calculateHashes, fetchMetadata } = req.query

    if (!apiUrl || !yamlPath) {
      return res.status(400).json({ error: 'API URL and YAML path are required' })
    }

    const options = {
      civitaiKey: civitaiKey || null,
      calculateHashes: calculateHashes === 'true',
      fetchMetadata: fetchMetadata === 'true'
    }

    const models = await discoverModels(apiUrl, yamlPath, options)
    res.json(models)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Save settings
router.post('/save-settings', async (req, res) => {
  try {
    const settings = req.body

    if (!settings) {
      return res.status(400).json({ error: 'Settings are required' })
    }

    const result = await saveSettingsToFile(settings)

    // Mark setup as complete in database
    updateAppMetadata('setup_complete', 'true')
    console.log('✅ Setup marked as complete in database')

    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
