import axios from 'axios'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Thumbnail cache directory
const THUMBNAIL_DIR = path.join(__dirname, '../../data/thumbnails')

// Ensure thumbnail directory exists
async function ensureThumbnailDir() {
  try {
    await fs.access(THUMBNAIL_DIR)
  } catch {
    await fs.mkdir(THUMBNAIL_DIR, { recursive: true })
    console.log('📁 Created thumbnails directory:', THUMBNAIL_DIR)
  }
}

/**
 * Download and cache a thumbnail from URL
 * @param {string} imageUrl - CivitAI image URL
 * @param {string} modelHash - Model hash to use as filename
 * @returns {Promise<string>} - Relative path to cached thumbnail
 */
export async function downloadAndCacheThumbnail(imageUrl, modelHash) {
  try {
    await ensureThumbnailDir()

    // Generate unique filename based on hash
    const ext = path.extname(new URL(imageUrl).pathname) || '.jpg'
    const filename = `${modelHash}${ext}`
    const filepath = path.join(THUMBNAIL_DIR, filename)

    // Check if already cached
    try {
      await fs.access(filepath)
      console.log(`💾 Thumbnail already cached: ${filename}`)
      return `thumbnails/${filename}`
    } catch {
      // Not cached, download it
    }

    // Download thumbnail with timeout
    console.log(`📥 Downloading thumbnail: ${imageUrl}`)
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: {
        'User-Agent': 'Kiko-Creator/1.0'
      }
    })

    // Save to filesystem
    await fs.writeFile(filepath, response.data)
    console.log(`✅ Cached thumbnail: ${filename}`)

    return `thumbnails/${filename}`
  } catch (error) {
    console.warn(`⚠️  Failed to cache thumbnail:`, error.message)
    return null
  }
}

/**
 * Get the first suitable thumbnail from CivitAI images array
 * @param {Array} images - Array of CivitAI image objects
 * @returns {string|null} - URL of first suitable thumbnail
 */
export function getFirstThumbnailUrl(images) {
  if (!images || !Array.isArray(images) || images.length === 0) {
    return null
  }

  // Find first image with a URL
  const firstImage = images[0]
  if (!firstImage || !firstImage.url) {
    return null
  }

  // Prefer smaller thumbnail if available, otherwise use full URL
  return firstImage.url
}

/**
 * Download and cache thumbnail for a model with CivitAI metadata
 * @param {string} modelHash - Model hash
 * @param {Object} metadata - CivitAI metadata object with images array
 * @returns {Promise<string|null>} - Relative path to cached thumbnail or null
 */
export async function cacheThumbnailForModel(modelHash, metadata) {
  if (!metadata || !metadata.images) {
    return null
  }

  const thumbnailUrl = getFirstThumbnailUrl(metadata.images)
  if (!thumbnailUrl) {
    return null
  }

  return await downloadAndCacheThumbnail(thumbnailUrl, modelHash)
}

/**
 * Get absolute path to thumbnail file
 * @param {string} relativePath - Relative path (e.g., "thumbnails/abc123.jpg")
 * @returns {string} - Absolute filesystem path
 */
export function getThumbnailAbsolutePath(relativePath) {
  if (!relativePath) return null
  return path.join(__dirname, '../../data', relativePath)
}

/**
 * Check if cached thumbnail exists
 * @param {string} relativePath - Relative path to thumbnail
 * @returns {Promise<boolean>} - True if thumbnail file exists
 */
export async function thumbnailExists(relativePath) {
  if (!relativePath) return false
  try {
    const absolutePath = getThumbnailAbsolutePath(relativePath)
    await fs.access(absolutePath)
    return true
  } catch {
    return false
  }
}
