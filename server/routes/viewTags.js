import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// Load view tags from JSON file
let viewTags = null

function loadViewTags() {
  try {
    const viewTagsPath = path.join(__dirname, '../../data/view_tags.json')
    const data = fs.readFileSync(viewTagsPath, 'utf-8')
    viewTags = JSON.parse(data)
    console.log('✅ View tags loaded successfully')
  } catch (error) {
    console.error('❌ Error loading view tags:', error)
    viewTags = { angle: [], camera: [], background: [], style: [] }
  }
}

// Load tags on module initialization
loadViewTags()

// Get all view tags
router.get('/', (req, res) => {
  try {
    res.json({
      success: true,
      viewTags
    })
  } catch (error) {
    console.error('View tags error:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
