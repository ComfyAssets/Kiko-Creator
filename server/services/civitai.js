import axios from 'axios'

const CIVITAI_API_BASE = 'https://civitai.com/api/v1'

/**
 * Fetch model metadata from CivitAI by hash
 * @param {string} hash - SHA256 hash of the model file (uppercase hex)
 * @param {string} apiKey - Optional CivitAI API key for authenticated requests
 * @returns {Promise<Object|null>} - Model metadata or null if not found
 */
export async function fetchModelMetadataByHash(hash, apiKey = null) {
  try {
    const headers = {}
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`
    }

    const response = await axios.get(
      `${CIVITAI_API_BASE}/model-versions/by-hash/${hash}`,
      {
        headers,
        timeout: 10000
      }
    )

    if (response.data) {
      return {
        id: response.data.id,
        modelId: response.data.modelId,
        name: response.data.name,
        modelName: response.data.model?.name,
        description: response.data.description,
        baseModel: response.data.baseModel,
        trainedWords: response.data.trainedWords || [],
        images: response.data.images?.map((img) => ({
          url: img.url,
          nsfw: img.nsfw,
          width: img.width,
          height: img.height
        })) || [],
        downloadUrl: response.data.downloadUrl,
        stats: {
          downloadCount: response.data.stats?.downloadCount || 0,
          rating: response.data.stats?.rating || 0,
          ratingCount: response.data.stats?.ratingCount || 0
        }
      }
    }

    return null
  } catch (error) {
    if (error.response?.status === 404) {
      console.log(`ℹ️  Model not found on CivitAI: ${hash}`)
      return null
    }

    console.warn(`⚠️  CivitAI API error for hash ${hash}:`, error.message)
    return null
  }
}

/**
 * Fetch metadata for multiple models with rate limiting
 * @param {Object} hashMap - Map of filepath to hash
 * @param {string} apiKey - Optional CivitAI API key
 * @param {number} concurrency - Max concurrent requests (default: 3)
 * @returns {Promise<Object>} - Map of filepath to metadata
 */
export async function fetchMultipleModelMetadata(hashMap, apiKey = null, concurrency = 3) {
  const results = {}
  const entries = Object.entries(hashMap).filter(([_, hash]) => hash !== null)
  const queue = [...entries]
  const inProgress = new Set()

  const processNext = async () => {
    if (queue.length === 0) return

    const [filePath, hash] = queue.shift()
    inProgress.add(filePath)

    try {
      const metadata = await fetchModelMetadataByHash(hash, apiKey)
      results[filePath] = metadata

      if (metadata) {
        console.log(`✓ Metadata fetched: ${metadata.modelName || 'Unknown'} (${filePath.split('/').pop()})`)
      }

      // Rate limiting: wait 500ms between requests
      await new Promise((resolve) => setTimeout(resolve, 500))
    } catch (error) {
      console.warn(`⚠️  Failed to fetch metadata for ${filePath}:`, error.message)
      results[filePath] = null
    } finally {
      inProgress.delete(filePath)
      if (queue.length > 0) {
        await processNext()
      }
    }
  }

  // Start initial batch
  const initialBatch = Math.min(concurrency, entries.length)
  const promises = Array.from({ length: initialBatch }, () => processNext())

  await Promise.all(promises)

  return results
}

/**
 * Search CivitAI for models by query
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Array>} - Array of model results
 */
export async function searchModels(query, options = {}) {
  try {
    const params = {
      query,
      limit: options.limit || 20,
      types: options.types || ['Checkpoint', 'LORA', 'TextualInversion'],
      sort: options.sort || 'Highest Rated',
      nsfw: options.nsfw !== undefined ? options.nsfw : false
    }

    const response = await axios.get(`${CIVITAI_API_BASE}/models`, {
      params,
      timeout: 10000
    })

    return response.data.items || []
  } catch (error) {
    console.error('CivitAI search error:', error.message)
    return []
  }
}
