import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CAT = '[TagService]'

// Category markers matching reference app
const groupNames = {
  0: '[G]',   // General
  1: '[A]',   // Artist
  3: '[©]',   // Copyright
  4: '[C]',   // Character
  5: '[M]',   // Meta
  255: '[WC]' // Wildcards
}

class TagService {
  constructor() {
    this.tags = []
    this.loaded = false
  }

  async loadTags(tagFilePath) {
    try {
      console.log(CAT, 'Loading tag database...')
      const tagData = fs.readFileSync(tagFilePath, 'utf-8')
      const lines = tagData.split('\n').filter(line => line.trim())

      for (const line of lines) {
        const parts = line.split(',')
        if (parts.length >= 3) {
          const tag = parts[0].trim()
          const category = parseInt(parts[1].trim()) || 0
          const postCount = parseInt(parts[2].trim()) || 0
          const aliases = parts[3] ? parts[3].trim() : ''

          this.tags.push({
            tag,
            category,
            postCount,
            aliases,
            categoryLabel: groupNames[category] || '[?]'
          })
        }
      }

      // Sort by post count (popularity)
      this.tags.sort((a, b) => b.postCount - a.postCount)
      this.loaded = true
      console.log(CAT, `Loaded ${this.tags.length} tags`)
    } catch (error) {
      console.error(CAT, 'Error loading tags:', error.message)
      this.loaded = false
    }
  }

  search(query, limit = 50) {
    if (!this.loaded || !query) {
      return []
    }

    const searchTerm = query.toLowerCase().trim()
    if (!searchTerm) {
      return []
    }

    const matches = []

    for (const tagInfo of this.tags) {
      const tag = tagInfo.tag.toLowerCase()
      const aliases = tagInfo.aliases ? tagInfo.aliases.toLowerCase().split(',') : []

      // Check if tag or aliases match
      let matched = false
      let matchedText = null

      // Exact tag match
      if (tag.includes(searchTerm)) {
        matched = true
        matchedText = tagInfo.tag
      } else {
        // Check aliases
        const matchingAlias = aliases.find(alias => alias.trim().includes(searchTerm))
        if (matchingAlias) {
          matched = true
          matchedText = matchingAlias.trim()
        }
      }

      if (matched) {
        matches.push({
          tag: tagInfo.tag,
          category: tagInfo.category,
          categoryLabel: tagInfo.categoryLabel,
          postCount: tagInfo.postCount,
          matchedText: matchedText || tagInfo.tag,
          aliases: tagInfo.aliases
        })

        if (matches.length >= limit) {
          break
        }
      }
    }

    return matches
  }

  addWildcards(wildcards) {
    for (const wildcard of wildcards) {
      this.tags.push({
        tag: `__${wildcard}__`,
        category: 255,
        postCount: 0,
        aliases: '',
        categoryLabel: groupNames[255]
      })
    }
    console.log(CAT, `Added ${wildcards.length} wildcards to tag database`)
  }
}

// Singleton instance
const tagService = new TagService()

export default tagService
