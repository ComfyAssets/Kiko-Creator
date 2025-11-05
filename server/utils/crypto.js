import crypto from 'crypto'
import fs from 'fs/promises'
import { createReadStream } from 'fs'

/**
 * Calculate SHA256 hash of a file
 * Used for CivitAI model metadata lookup
 * @param {string} filePath - Absolute path to file
 * @returns {Promise<string>} - Hex string of SHA256 hash
 */
export async function calculateFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    const stream = createReadStream(filePath)

    stream.on('data', (chunk) => {
      hash.update(chunk)
    })

    stream.on('end', () => {
      resolve(hash.digest('hex').toUpperCase())
    })

    stream.on('error', (error) => {
      reject(new Error(`Failed to calculate hash for ${filePath}: ${error.message}`))
    })
  })
}

/**
 * Calculate hashes for multiple files in parallel with rate limiting
 * @param {string[]} filePaths - Array of absolute file paths
 * @param {number} concurrency - Max concurrent hash calculations (default: 5)
 * @returns {Promise<Object>} - Map of filepath to hash
 */
export async function calculateMultipleHashes(filePaths, concurrency = 5) {
  const results = {}
  const queue = [...filePaths]
  const inProgress = new Set()

  const processNext = async () => {
    if (queue.length === 0) return

    const filePath = queue.shift()
    inProgress.add(filePath)

    try {
      const hash = await calculateFileHash(filePath)
      results[filePath] = hash
      console.log(`✓ Hash calculated: ${filePath.split('/').pop()}`)
    } catch (error) {
      console.warn(`⚠️  Failed to hash ${filePath}: ${error.message}`)
      results[filePath] = null
    } finally {
      inProgress.delete(filePath)
      if (queue.length > 0) {
        await processNext()
      }
    }
  }

  // Start initial batch
  const initialBatch = Math.min(concurrency, filePaths.length)
  const promises = Array.from({ length: initialBatch }, () => processNext())

  await Promise.all(promises)

  return results
}
