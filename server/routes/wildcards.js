import express from 'express'
import wildcardService from '../services/wildcardService.js'

const router = express.Router()

// Get list of all wildcard names
router.get('/', (req, res) => {
  try {
    const wildcards = wildcardService.getWildcardNames()

    res.json({
      success: true,
      wildcards,
      count: wildcards.length
    })
  } catch (error) {
    console.error('Wildcards list error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get values for a specific wildcard
router.get('/:name', (req, res) => {
  try {
    const { name } = req.params
    const values = wildcardService.getWildcardValues(name)

    if (values.length === 0) {
      return res.status(404).json({ error: `Wildcard "${name}" not found` })
    }

    res.json({
      success: true,
      name,
      values,
      count: values.length
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get random value from a wildcard
router.get('/:name/random', (req, res) => {
  try {
    const { name } = req.params
    const value = wildcardService.getRandomValue(name)

    if (!value) {
      return res.status(404).json({ error: `Wildcard "${name}" not found or empty` })
    }

    res.json({
      success: true,
      name,
      value
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Process a prompt with wildcards
router.post('/process', (req, res) => {
  try {
    const { prompt } = req.body

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' })
    }

    const processed = wildcardService.processPrompt(prompt)

    res.json({
      success: true,
      original: prompt,
      processed
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
