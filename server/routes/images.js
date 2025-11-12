import express from 'express'
import { randomUUID } from 'crypto'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import {
  createImage,
  getImages,
  getImage,
  deleteImage
} from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// Image storage paths
const IMAGES_BASE_DIR = path.join(__dirname, '../../data/images')
const THUMBNAILS_DIR = path.join(__dirname, '../../data/thumbnails')

// Ensure directories exist
function ensureDirectories() {
  if (!fs.existsSync(IMAGES_BASE_DIR)) {
    fs.mkdirSync(IMAGES_BASE_DIR, { recursive: true })
  }
  if (!fs.existsSync(THUMBNAILS_DIR)) {
    fs.mkdirSync(THUMBNAILS_DIR, { recursive: true })
  }
}

ensureDirectories()

/**
 * POST /api/images/upload
 * Upload an image (for img2img)
 * Expects multipart/form-data with 'image' field
 */
router.post('/upload', requireAuth, async (req, res) => {
  try {
    // Parse multipart form data
    const chunks = []
    let contentType = null
    let filename = null

    // Simple multipart parser (we'll implement proper multipart handling)
    // For now, we'll accept raw image data or use a library

    // TODO: Implement proper multipart/form-data parsing
    // For now, return error asking for proper implementation
    return res.status(501).json({
      success: false,
      error: 'Not Implemented',
      message: 'Image upload requires multer middleware - will be implemented next'
    })

  } catch (error) {
    console.error('Error uploading image:', error)

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to upload image',
      details: error.message
    })
  }
})

/**
 * GET /api/images/gallery
 * Get list of generated images for authenticated device
 */
router.get('/gallery', requireAuth, (req, res) => {
  try {
    const { limit = 20, offset = 0, sort = 'created_at_desc' } = req.query

    // Parse pagination parameters
    const limitNum = Math.min(parseInt(limit) || 20, 100) // Max 100
    const offsetNum = parseInt(offset) || 0

    // Get images for this device
    const images = getImages(req.device.id, {
      limit: limitNum,
      offset: offsetNum,
      sort
    })

    // Transform for API response
    const transformedImages = images.map((img) => ({
      id: img.id,
      filename: img.filename,
      url: `/api/images/${img.id}`,
      thumbnailUrl: `/api/images/${img.id}/thumb`,
      width: img.width,
      height: img.height,
      filesize: img.filesize,
      prompt: img.prompt,
      negativePrompt: img.negative_prompt,
      settings: typeof img.settings === 'string' ? JSON.parse(img.settings) : img.settings,
      presetId: img.preset_id,
      createdAt: img.created_at
    }))

    // Get total count for pagination
    const allImages = getImages(req.device.id, {})
    const total = allImages.length

    res.json({
      success: true,
      images: transformedImages,
      total,
      limit: limitNum,
      offset: offsetNum
    })
  } catch (error) {
    console.error('Error getting gallery:', error)

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to retrieve gallery'
    })
  }
})

/**
 * GET /api/images/:id
 * Download a generated image
 */
router.get('/:id', requireAuth, (req, res) => {
  try {
    const image = getImage(req.params.id)

    if (!image) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Image not found'
      })
    }

    // Verify device ownership
    if (image.device_id !== req.device.id) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Access denied: This image belongs to another device'
      })
    }

    // Check if file exists
    if (!fs.existsSync(image.filepath)) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Image file not found on server'
      })
    }

    // Determine MIME type from filename
    const ext = path.extname(image.filename).toLowerCase()
    const mimeTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp'
    }
    const mimeType = mimeTypes[ext] || 'application/octet-stream'

    // Set headers
    res.setHeader('Content-Type', mimeType)
    res.setHeader('Content-Disposition', `inline; filename="${image.filename}"`)

    // Stream file
    const fileStream = fs.createReadStream(image.filepath)
    fileStream.pipe(res)
  } catch (error) {
    console.error('Error getting image:', error)

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to retrieve image'
    })
  }
})

/**
 * GET /api/images/:id/thumb
 * Get thumbnail (256x256) of image
 */
router.get('/:id/thumb', requireAuth, async (req, res) => {
  try {
    const image = getImage(req.params.id)

    if (!image) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Image not found'
      })
    }

    // Verify device ownership
    if (image.device_id !== req.device.id) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Access denied'
      })
    }

    // Check if original file exists
    if (!fs.existsSync(image.filepath)) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Image file not found on server'
      })
    }

    // Check if thumbnail exists
    const thumbPath = image.thumbnail_path
    if (thumbPath && fs.existsSync(thumbPath)) {
      // Serve cached thumbnail
      res.setHeader('Content-Type', 'image/jpeg')
      const fileStream = fs.createReadStream(thumbPath)
      fileStream.pipe(res)
      return
    }

    // Generate thumbnail on-the-fly using sharp
    try {
      const thumbnailBuffer = await sharp(image.filepath)
        .resize(256, 256, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 85 })
        .toBuffer()

      res.setHeader('Content-Type', 'image/jpeg')
      res.send(thumbnailBuffer)
    } catch (sharpError) {
      console.error('Error generating thumbnail with sharp:', sharpError)

      // Fallback: serve original image
      res.setHeader('Content-Type', 'image/jpeg')
      const fileStream = fs.createReadStream(image.filepath)
      fileStream.pipe(res)
    }
  } catch (error) {
    console.error('Error getting thumbnail:', error)

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to retrieve thumbnail'
    })
  }
})

/**
 * DELETE /api/images/:id
 * Delete an image (soft delete)
 */
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const image = getImage(req.params.id)

    if (!image) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Image not found'
      })
    }

    // Verify device ownership
    if (image.device_id !== req.device.id) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Access denied: You can only delete your own images'
      })
    }

    // Soft delete
    const success = deleteImage(req.params.id)

    if (success) {
      console.log(`🗑️  Image deleted: ${image.filename}`)

      res.json({
        success: true,
        message: 'Image deleted successfully'
      })
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to delete image'
      })
    }
  } catch (error) {
    console.error('Error deleting image:', error)

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete image'
    })
  }
})

export default router
