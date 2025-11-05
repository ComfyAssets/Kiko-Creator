import express from 'express'
import characterService from '../services/characterService.js'

const router = express.Router()

// Get characters with search, filtering, sorting, and pagination
router.get('/', async (req, res) => {
  try {
    const {
      q = '',           // search query
      limit = 50,       // results per page
      offset = 0,       // pagination offset
      sortBy = 'id',    // sorting: id, name-zh, name-en, popular, recent
      series = null     // filter by series
    } = req.query

    const parsedLimit = Math.min(parseInt(limit) || 50, 200) // Max 200 per request
    const parsedOffset = parseInt(offset) || 0

    const result = characterService.search(q, parsedLimit, parsedOffset, sortBy, series)

    res.json({
      characters: result.results,
      total: result.total,
      limit: parsedLimit,
      offset: parsedOffset,
      sortBy,
      series
    })
  } catch (error) {
    console.error('[CharactersRoute] Error searching characters:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get character statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = characterService.getStats()
    res.json(stats)
  } catch (error) {
    console.error('[CharactersRoute] Error getting stats:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get all unique series
router.get('/series/all', async (req, res) => {
  try {
    const series = characterService.getSeries()
    res.json({ series })
  } catch (error) {
    console.error('[CharactersRoute] Error getting series list:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get popular series
router.get('/series/popular', async (req, res) => {
  try {
    const { count = 20 } = req.query
    const popularSeries = characterService.getPopularSeries(parseInt(count))
    res.json({ series: popularSeries })
  } catch (error) {
    console.error('[CharactersRoute] Error getting popular series:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get character thumbnail by hash
router.get('/thumbnail/:hash', async (req, res) => {
  try {
    const { hash } = req.params

    if (!hash) {
      return res.status(400).json({ error: 'Hash parameter required' })
    }

    const thumbnailBuffer = characterService.getThumbnail(hash)

    if (!thumbnailBuffer) {
      return res.status(404).json({ error: 'Thumbnail not found' })
    }

    // Set caching headers (7 days)
    res.setHeader('Content-Type', 'image/webp')
    res.setHeader('Cache-Control', 'public, max-age=604800')
    res.setHeader('ETag', hash)

    res.send(thumbnailBuffer)
  } catch (error) {
    console.error('[CharactersRoute] Error getting thumbnail:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get single character by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const character = characterService.getCharacterById(id)

    if (!character) {
      return res.status(404).json({ error: 'Character not found' })
    }

    res.json({ character })
  } catch (error) {
    console.error('[CharactersRoute] Error getting character:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
