import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { networkInterfaces } from 'os'
import setupRoutes from './routes/setup.js'
import charactersRoutes from './routes/characters.js'
import comfyuiRoutes from './routes/comfyui.js'
import generationRoutes from './routes/generation.js'
import modelsRoutes from './routes/models.js'
import progressRoutes from './routes/progress.js'
import maintenanceRoutes from './routes/maintenance.js'
import tagsRoutes from './routes/tags.js'
import wildcardsRoutes from './routes/wildcards.js'
import viewTagsRoutes from './routes/viewTags.js'
import tagService from './services/tagService.js'
import wildcardService from './services/wildcardService.js'
import characterService from './services/characterService.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

// CORS configuration for network access
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)

    // Allow all origins in development
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true)
    }

    // In production, you can restrict to specific origins
    callback(null, true)
  },
  credentials: true,
  optionsSuccessStatus: 200
}

// Middleware
app.use(cors(corsOptions))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  next()
})

// Serve cached thumbnails as static files
const thumbnailsPath = path.join(__dirname, '../data/thumbnails')
app.use('/api/thumbnails', express.static(thumbnailsPath, {
  maxAge: '7d', // Cache for 7 days
  etag: true,
  lastModified: true
}))

// Routes
app.use('/api/setup', setupRoutes)
app.use('/api/characters', charactersRoutes)
app.use('/api/comfyui', comfyuiRoutes)
app.use('/api/generation', generationRoutes)
app.use('/api/models', modelsRoutes)
app.use('/api/progress', progressRoutes)
app.use('/api/maintenance', maintenanceRoutes)
app.use('/api/tags', tagsRoutes)
app.use('/api/wildcards', wildcardsRoutes)
app.use('/api/view-tags', viewTagsRoutes)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  })
})

// Helper to get local network IP
function getLocalNetworkIP() {
  const nets = networkInterfaces()

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip internal and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address
      }
    }
  }
  return 'localhost'
}

// Initialize services
async function initializeServices() {
  try {
    const dataPath = path.join(__dirname, '../data')
    const referenceDataPath = path.join(__dirname, '../referance/character_select_stand_alone_app/data')

    const tagFilePath = path.join(dataPath, 'danbooru_e621_merged.csv')
    const wildcardsPath = path.join(dataPath, 'wildcards')
    const charactersFilePath = path.join(referenceDataPath, 'wai_characters.csv')
    const thumbnailsFilePath = path.join(referenceDataPath, 'wai_character_thumbs.json')

    // Load tag database
    await tagService.loadTags(tagFilePath)

    // Load wildcards
    wildcardService.loadWildcards(wildcardsPath)

    // Add wildcards to tag database for autocomplete
    const wildcardNames = wildcardService.getWildcardNames()
    tagService.addWildcards(wildcardNames)

    // Load character database
    await characterService.loadCharacters(charactersFilePath, thumbnailsFilePath)

    console.log('✅ Services initialized successfully')
  } catch (error) {
    console.error('❌ Error initializing services:', error)
  }
}

// Initialize and start server
initializeServices().then(() => {
  // Start server on all network interfaces (0.0.0.0)
  app.listen(PORT, '0.0.0.0', () => {
    const localIP = getLocalNetworkIP()

    console.log('\n🚀 Kiko Creator API Server Started!\n')
    console.log(`   Local:    http://localhost:${PORT}`)
    console.log(`   Network:  http://${localIP}:${PORT}`)
    console.log(`\n📡 ComfyUI API URL: ${process.env.COMFYUI_API_URL || 'Not configured'}`)
    console.log(`\n✨ Server is accessible from other devices on your network!\n`)
  })
})

export default app
