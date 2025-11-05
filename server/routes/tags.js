import express from 'express'
import tagService from '../services/tagService.js'

const router = express.Router()

// Search for tags
router.get('/search', (req, res) => {
  try {
    const { q, limit = 50 } = req.query

    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' })
    }

    const results = tagService.search(q, parseInt(limit))

    res.json({
      success: true,
      query: q,
      results,
      count: results.length
    })
  } catch (error) {
    console.error('Tag search error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get tag statistics
router.get('/stats', (req, res) => {
  try {
    res.json({
      success: true,
      loaded: tagService.loaded,
      totalTags: tagService.tags.length
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
