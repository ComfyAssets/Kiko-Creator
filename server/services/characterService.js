import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createHash } from 'crypto'
import pako from 'pako'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CAT = '[CharacterService]'

class CharacterService {
  constructor() {
    this.characters = []
    this.thumbnails = {}
    this.loaded = false
  }

  async loadCharacters(csvPath, thumbnailsPath) {
    try {
      // Load CSV file with character data
      console.log(CAT, 'Loading character database...')
      const csvData = fs.readFileSync(csvPath, 'utf-8')
      const lines = csvData.split('\n').filter(line => line.trim())

      // Skip header and parse each line
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        // CSV format: 中文名,english_tag
        const commaIndex = line.indexOf(',')
        if (commaIndex === -1) continue

        const chineseName = line.substring(0, commaIndex).trim()
        const englishTag = line.substring(commaIndex + 1).trim()

        if (chineseName && englishTag) {
          // Generate MD5 hash for thumbnail lookup (same as reference app)
          const hash = createHash('md5')
          hash.update(englishTag)
          const md5Hash = hash.digest('hex')

          // Extract series from englishTag (text in parentheses)
          const seriesMatch = englishTag.match(/\(([^)]+)\)/)
          const series = seriesMatch ? seriesMatch[1] : 'unknown'

          this.characters.push({
            id: i - 1, // 0-based ID
            chineseName,
            englishTag,
            series,
            hash: md5Hash
          })
        }
      }

      console.log(CAT, `Loaded ${this.characters.length} characters`)

      // Load thumbnail index (but not the actual images yet)
      console.log(CAT, 'Loading thumbnail index...')
      const thumbnailData = fs.readFileSync(thumbnailsPath, 'utf-8')
      this.thumbnails = JSON.parse(thumbnailData)

      const thumbnailCount = Object.keys(this.thumbnails).length
      console.log(CAT, `Loaded ${thumbnailCount} thumbnail entries`)

      this.loaded = true
    } catch (error) {
      console.error(CAT, 'Error loading characters:', error.message)
      this.loaded = false
    }
  }

  search(query, limit = 50, offset = 0, sortBy = 'id', seriesFilter = null) {
    if (!this.loaded) {
      return { results: [], total: 0 }
    }

    let filtered = [...this.characters]

    // Apply series filter
    if (seriesFilter && seriesFilter !== 'all') {
      filtered = filtered.filter(char => char.series === seriesFilter)
    }

    // Apply search query
    if (query && query.trim()) {
      const lowerQuery = query.toLowerCase()
      filtered = filtered.filter(char =>
        char.chineseName.toLowerCase().includes(lowerQuery) ||
        char.englishTag.toLowerCase().includes(lowerQuery) ||
        char.series.toLowerCase().includes(lowerQuery)
      )
    }

    // Apply sorting
    switch (sortBy) {
      case 'name-zh':
        filtered.sort((a, b) => a.chineseName.localeCompare(b.chineseName, 'zh-CN'))
        break
      case 'name-en':
        filtered.sort((a, b) => a.englishTag.localeCompare(b.englishTag))
        break
      case 'popular':
        // Earlier IDs = more popular (proxy)
        filtered.sort((a, b) => a.id - b.id)
        break
      case 'recent':
        // Later IDs = more recent
        filtered.sort((a, b) => b.id - a.id)
        break
      case 'id':
      default:
        // Already in ID order
        break
    }

    // Paginate
    const results = filtered.slice(offset, offset + limit)
    return {
      results,
      total: filtered.length
    }
  }

  getThumbnail(hash) {
    if (!this.loaded || !hash) {
      return null
    }

    try {
      // Get the gzipped base64 data
      const gzippedBase64 = this.thumbnails[hash]
      if (!gzippedBase64) {
        console.warn(CAT, `Thumbnail not found for hash: ${hash}`)
        return null
      }

      // Decode base64 to binary
      const gzippedData = Buffer.from(gzippedBase64, 'base64')

      // Decompress using pako
      const decompressed = pako.ungzip(gzippedData)

      // Return as buffer (WebP image data)
      return Buffer.from(decompressed)
    } catch (error) {
      console.error(CAT, `Error decompressing thumbnail for ${hash}:`, error.message)
      return null
    }
  }

  getCharacterById(id) {
    if (!this.loaded) {
      return null
    }

    return this.characters.find(char => char.id === parseInt(id))
  }

  getStats() {
    return {
      loaded: this.loaded,
      characterCount: this.characters.length,
      thumbnailCount: Object.keys(this.thumbnails).length
    }
  }

  // Get list of unique series for filtering
  getSeries() {
    if (!this.loaded) return []

    const seriesSet = new Set()
    this.characters.forEach(char => {
      if (char.series && char.series !== 'unknown') {
        seriesSet.add(char.series)
      }
    })

    return Array.from(seriesSet).sort()
  }

  // Get popular series (top 20 by character count)
  getPopularSeries(count = 20) {
    if (!this.loaded) return []

    const seriesCount = {}
    this.characters.forEach(char => {
      if (char.series && char.series !== 'unknown') {
        seriesCount[char.series] = (seriesCount[char.series] || 0) + 1
      }
    })

    return Object.entries(seriesCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([series, count]) => ({ series, count }))
  }
}

// Singleton instance
const characterService = new CharacterService()

export default characterService
