import express from 'express'
import {
  vacuumDatabase,
  optimizeDatabase,
  backupDatabase,
  getDatabaseStats
} from '../db/index.js'

const router = express.Router()

// Get database statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await getDatabaseStats()
    res.json(stats)
  } catch (error) {
    console.error('Failed to get database stats:', error)
    res.status(500).json({ error: error.message })
  }
})

// Vacuum database (reclaim space and defragment)
router.post('/vacuum', async (req, res) => {
  try {
    console.log('🧹 Starting database vacuum...')
    const result = await vacuumDatabase()
    console.log('✅ Database vacuum completed')
    res.json(result)
  } catch (error) {
    console.error('❌ Failed to vacuum database:', error)
    res.status(500).json({ error: error.message })
  }
})

// Optimize database (analyze and rebuild indexes)
router.post('/optimize', async (req, res) => {
  try {
    console.log('⚡ Starting database optimization...')
    const result = await optimizeDatabase()
    console.log('✅ Database optimization completed')
    res.json(result)
  } catch (error) {
    console.error('❌ Failed to optimize database:', error)
    res.status(500).json({ error: error.message })
  }
})

// Backup database
router.post('/backup', async (req, res) => {
  try {
    console.log('💾 Starting database backup...')
    const result = await backupDatabase()
    console.log('✅ Database backup completed')
    res.json(result)
  } catch (error) {
    console.error('❌ Failed to backup database:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
