import fs from 'fs'
import path from 'path'
import { executePythonScript, findPythonExecutable, checkSafetensorsAvailable } from './python_bridge.js'

// Cache Python availability to avoid repeated checks
let pythonAvailabilityCache = null
let pythonExecutableCache = null

/**
 * Check if Python with safetensors library is available
 * @returns {Promise<boolean>}
 */
async function isPythonAvailable() {
  if (pythonAvailabilityCache !== null) {
    return pythonAvailabilityCache
  }

  try {
    pythonExecutableCache = await findPythonExecutable()
    if (!pythonExecutableCache) {
      console.log('[Safetensors] Python not found, using JavaScript fallback')
      pythonAvailabilityCache = false
      return false
    }

    const hasSafetensors = await checkSafetensorsAvailable(pythonExecutableCache)
    if (!hasSafetensors) {
      console.log('[Safetensors] Python found but safetensors library not installed, using JavaScript fallback')
      console.log('[Safetensors] Install with: pip install safetensors')
      pythonAvailabilityCache = false
      return false
    }

    console.log(`[Safetensors] Using Python helper at ${pythonExecutableCache}`)
    pythonAvailabilityCache = true
    return true
  } catch (error) {
    console.warn('[Safetensors] Python check failed, using JavaScript fallback:', error.message)
    pythonAvailabilityCache = false
    return false
  }
}

/**
 * Read metadata from safetensors file using Python helper
 * @param {string} filePath - Absolute path to safetensors file
 * @returns {Promise<object|null>} Metadata object or null
 */
async function readSafetensorsMetadataViaPython(filePath) {
  try {
    const result = await executePythonScript(
      'safetensors_reader.py',
      [filePath],
      {
        timeout: 10000,
        pythonExecutable: pythonExecutableCache || 'python3'
      }
    )

    // Return the metadata field from Python result
    return result.metadata || null
  } catch (error) {
    console.warn('[Safetensors] Python reader failed:', error.message)
    return null
  }
}

/**
 * Read metadata from safetensors file using JavaScript implementation
 * Safetensors format: [8-byte header length][JSON metadata][tensor data]
 * @param {string} filePath - Absolute path to safetensors file
 * @returns {object|null} Metadata object or null if not found
 */
function readSafetensorsMetadataViaJS(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn('[Safetensors] File not found:', filePath)
      return null
    }

    // Open file descriptor for reading
    const fd = fs.openSync(filePath, 'r')

    try {
      // Read first 8 bytes (header length)
      const headerBuffer = Buffer.alloc(8)
      fs.readSync(fd, headerBuffer, 0, 8, 0)

      // Read 8-byte little-endian header (JSON length)
      let jsonLength = 0
      for (let i = 0; i < 8; i++) {
        jsonLength |= headerBuffer[i] << (i * 8)
      }

      // Validate JSON length (sanity check: metadata should be < 100MB)
      if (jsonLength <= 0 || jsonLength > 100 * 1024 * 1024) {
        console.warn('[Safetensors] Invalid JSON length:', jsonLength)
        return null
      }

      // Read only the JSON metadata bytes (not the entire file!)
      const jsonBuffer = Buffer.alloc(jsonLength)
      fs.readSync(fd, jsonBuffer, 0, jsonLength, 8)

      // Parse JSON metadata
      const jsonString = jsonBuffer.toString('utf8')
      const metadata = JSON.parse(jsonString)

      // Return __metadata__ field if it exists
      if (metadata.__metadata__) {
        return metadata.__metadata__
      }

      return null
    } finally {
      // Always close the file descriptor
      fs.closeSync(fd)
    }
  } catch (error) {
    // Only log non-size-related errors
    if (!error.message.includes('greater than') && !error.message.includes('Invalid JSON length')) {
      console.error('[Safetensors] Error reading metadata:', error.message)
    }
    return null
  }
}

/**
 * Extract trigger words from metadata
 * Common metadata fields: ss_tag_frequency, modelspec.trigger_words, etc.
 * @param {object} metadata - Safetensors metadata object
 * @returns {string[]} Array of trigger words
 */
export function extractTriggerWords(metadata) {
  if (!metadata) return []

  const triggerWords = []

  // Check for common trigger word fields
  if (metadata['modelspec.trigger_words']) {
    const words = metadata['modelspec.trigger_words']
    if (Array.isArray(words)) {
      triggerWords.push(...words)
    } else if (typeof words === 'string') {
      triggerWords.push(words)
    }
  }

  // Check for activation text (common in older models)
  if (metadata.ss_tag_frequency) {
    // This is a JSON string of tag frequencies - parse and get top tags
    try {
      const tagFreq = JSON.parse(metadata.ss_tag_frequency)
      // Get all tags from the nested structure
      for (const dataset in tagFreq) {
        const tags = Object.keys(tagFreq[dataset])
        triggerWords.push(...tags.slice(0, 5)) // Top 5 tags per dataset
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  // Remove duplicates and empty strings
  return [...new Set(triggerWords.filter(Boolean))]
}

/**
 * Get model description from metadata
 * @param {object} metadata - Safetensors metadata object
 * @returns {string|null} Model description
 */
export function extractDescription(metadata) {
  if (!metadata) return null

  // Check common description fields
  return metadata['modelspec.description'] ||
         metadata.ss_comment ||
         metadata.description ||
         null
}

/**
 * Get base model from metadata
 * @param {object} metadata - Safetensors metadata object
 * @returns {string|null} Base model name
 */
export function extractBaseModel(metadata) {
  if (!metadata) return null

  return metadata['modelspec.architecture'] ||
         metadata.ss_base_model_version ||
         metadata.base_model ||
         null
}

/**
 * Read metadata from a safetensors file
 * Tries Python helper first (more robust), falls back to JavaScript implementation
 * @param {string} filePath - Absolute path to safetensors file
 * @returns {Promise<object|null>|object|null} Metadata object or null if not found
 */
export async function readSafetensorsMetadata(filePath) {
  // Try Python helper first if available
  if (await isPythonAvailable()) {
    const pythonResult = await readSafetensorsMetadataViaPython(filePath)
    if (pythonResult) {
      return pythonResult
    }
    // If Python failed, fall back to JS
    console.log('[Safetensors] Python failed, falling back to JavaScript')
  }

  // Use JavaScript implementation as fallback
  return readSafetensorsMetadataViaJS(filePath)
}

/**
 * Synchronous version for compatibility with existing code
 * Uses only JavaScript implementation
 * @param {string} filePath - Absolute path to safetensors file
 * @returns {object|null} Metadata object or null if not found
 */
export function readSafetensorsMetadataSync(filePath) {
  return readSafetensorsMetadataViaJS(filePath)
}

/**
 * Read LoRA Manager metadata.json file
 * @param {string} safetensorsPath - Path to safetensors file
 * @returns {object|null} Metadata object or null
 */
export function readLoraManagerMetadata(safetensorsPath) {
  try {
    // LoRA Manager stores metadata in .metadata.json files alongside the safetensors
    const metadataPath = safetensorsPath.replace(/\.safetensors$/, '.metadata.json')

    if (fs.existsSync(metadataPath)) {
      const jsonData = fs.readFileSync(metadataPath, 'utf8')
      return JSON.parse(jsonData)
    }
  } catch (error) {
    console.error('[LoRA Manager Metadata] Error reading:', error.message)
  }

  return null
}

/**
 * Extract CivitAI metadata from LoRA Manager .metadata.json or safetensors file
 * @param {string} filePath - Absolute path to safetensors file
 * @returns {Promise<object>} CivitAI data with modelId and id (version ID)
 */
export async function extractCivitAIData(filePath) {
  const civitaiData = {}

  // First, try to read from LoRA Manager's .metadata.json file
  const loraManagerData = readLoraManagerMetadata(filePath)
  if (loraManagerData && loraManagerData.civitai) {
    const civitai = loraManagerData.civitai

    if (civitai.modelId) {
      civitaiData.modelId = String(civitai.modelId)
    }

    if (civitai.id) {
      civitaiData.id = String(civitai.id)
    }

    // If we found CivitAI data from LoRA Manager, return it
    if (civitaiData.modelId || civitaiData.id) {
      return civitaiData
    }
  }

  // Fall back to reading from safetensors metadata
  const metadata = await readSafetensorsMetadata(filePath)
  if (!metadata) return {}

  // Check for CivitAI model ID in common metadata fields
  const modelId = metadata['modelspec.sai_model_spec'] ||
                  metadata.ss_model_id ||
                  metadata.modelId ||
                  metadata.model_id ||
                  null

  if (modelId) {
    civitaiData.modelId = String(modelId)
  }

  // Check for CivitAI version ID
  const versionId = metadata.ss_version_id ||
                    metadata.versionId ||
                    metadata.version_id ||
                    null

  if (versionId) {
    civitaiData.id = String(versionId)
  }

  return civitaiData
}

/**
 * Synchronous version of extractCivitAIData for compatibility
 * @param {string} filePath - Absolute path to safetensors file
 * @returns {object} CivitAI data with modelId and id (version ID)
 */
export function extractCivitAIDataSync(filePath) {
  const civitaiData = {}

  // First, try to read from LoRA Manager's .metadata.json file
  const loraManagerData = readLoraManagerMetadata(filePath)
  if (loraManagerData && loraManagerData.civitai) {
    const civitai = loraManagerData.civitai

    if (civitai.modelId) {
      civitaiData.modelId = String(civitai.modelId)
    }

    if (civitai.id) {
      civitaiData.id = String(civitai.id)
    }

    // Extract preview image URL from LoRA Manager metadata
    if (civitai.images && Array.isArray(civitai.images) && civitai.images.length > 0) {
      civitaiData.previewImage = civitai.images[0].url || civitai.images[0]
    }

    // If we found CivitAI data from LoRA Manager, return it
    if (civitaiData.modelId || civitaiData.id) {
      return civitaiData
    }
  }

  // Fall back to reading from safetensors metadata (sync version)
  const metadata = readSafetensorsMetadataSync(filePath)
  if (!metadata) return {}

  // Check for CivitAI model ID in common metadata fields
  const modelId = metadata['modelspec.sai_model_spec'] ||
                  metadata.ss_model_id ||
                  metadata.modelId ||
                  metadata.model_id ||
                  null

  if (modelId) {
    civitaiData.modelId = String(modelId)
  }

  // Check for CivitAI version ID
  const versionId = metadata.ss_version_id ||
                    metadata.versionId ||
                    metadata.version_id ||
                    null

  if (versionId) {
    civitaiData.id = String(versionId)
  }

  // Check for preview image URL in safetensors metadata
  const previewUrl = metadata.ss_preview_url ||
                     metadata.preview_url ||
                     metadata.previewUrl ||
                     metadata.preview_image ||
                     null

  if (previewUrl) {
    civitaiData.previewImage = String(previewUrl)
  }

  return civitaiData
}
