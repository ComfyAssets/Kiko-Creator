import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CAT = '[WildcardService]'

class WildcardService {
  constructor() {
    this.wildcards = new Map()
    this.loaded = false
  }

  loadWildcards(wildcardsDir) {
    try {
      console.log(CAT, 'Loading wildcards from:', wildcardsDir)
      const files = fs.readdirSync(wildcardsDir)

      for (const file of files) {
        // Skip special marker files
        if (file.startsWith('#') || file.startsWith('.')) {
          continue
        }

        // Only process .txt files
        if (!file.endsWith('.txt')) {
          continue
        }

        const filePath = path.join(wildcardsDir, file)
        const wildcardName = file.replace(/^wildcard/i, '').replace('.txt', '')

        try {
          const content = fs.readFileSync(filePath, 'utf-8')
          const values = content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'))

          if (values.length > 0) {
            this.wildcards.set(wildcardName, values)
            console.log(CAT, `Loaded wildcard "${wildcardName}" with ${values.length} values`)
          }
        } catch (error) {
          console.error(CAT, `Error loading wildcard file ${file}:`, error.message)
        }
      }

      this.loaded = true
      console.log(CAT, `Loaded ${this.wildcards.size} wildcard files`)
    } catch (error) {
      console.error(CAT, 'Error loading wildcards:', error.message)
      this.loaded = false
    }
  }

  getWildcardNames() {
    return Array.from(this.wildcards.keys())
  }

  getWildcardValues(name) {
    return this.wildcards.get(name) || []
  }

  getRandomValue(name) {
    const values = this.wildcards.get(name)
    if (!values || values.length === 0) {
      return null
    }
    return values[Math.floor(Math.random() * values.length)]
  }

  // Process a prompt and replace wildcard placeholders with random values
  processPrompt(prompt) {
    let processed = prompt

    // Match __wildcardName__ or {wildcardName} patterns
    const wildcardPattern = /(__([^_]+)__|{([^}]+)})/g

    processed = processed.replace(wildcardPattern, (match, full, underscoreName, braceName) => {
      const wildcardName = underscoreName || braceName
      const randomValue = this.getRandomValue(wildcardName)
      return randomValue || match // If no wildcard found, keep original
    })

    return processed
  }
}

// Singleton instance
const wildcardService = new WildcardService()

export default wildcardService
