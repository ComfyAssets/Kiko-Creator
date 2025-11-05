import fs from 'fs'
import path from 'path'
import YAML from 'yaml'

/**
 * Parse ComfyUI's extra_model_paths.yaml to get additional model directories
 * @param {string} comfyuiDir - Path to ComfyUI installation directory
 * @returns {object} Object with arrays of paths for each model type
 */
export function parseExtraModelPaths(comfyuiDir) {
  const extraPathsFile = path.join(comfyuiDir, 'extra_model_paths.yaml')

  if (!fs.existsSync(extraPathsFile)) {
    return {}
  }

  try {
    const yamlContent = fs.readFileSync(extraPathsFile, 'utf8')
    const config = YAML.parse(yamlContent)

    // The config structure is: { comfyui: { base_path: '...', modeltype: '...' } }
    const result = {}

    for (const [configName, configData] of Object.entries(config)) {
      if (!configData || typeof configData !== 'object') continue

      const basePath = configData.base_path || ''

      for (const [modelType, relativePaths] of Object.entries(configData)) {
        if (modelType === 'base_path') continue

        // Handle both string and array formats (YAML pipe | means multiline string)
        let paths = []
        if (typeof relativePaths === 'string') {
          // Split by newlines and filter empty
          paths = relativePaths.split('\n').map(p => p.trim()).filter(Boolean)
        } else if (Array.isArray(relativePaths)) {
          paths = relativePaths
        }

        // Convert relative paths to absolute
        const absolutePaths = paths.map(p => path.join(basePath, p))

        // Add to result, initializing array if needed
        if (!result[modelType]) {
          result[modelType] = []
        }
        result[modelType].push(...absolutePaths)
      }
    }

    return result
  } catch (error) {
    console.error('[ComfyUI Paths] Error parsing extra_model_paths.yaml:', error.message)
    return {}
  }
}

/**
 * Get all embedding directories (including extra model paths)
 * @param {string} baseModelsPath - Base ComfyUI models directory
 * @param {string} comfyuiDir - ComfyUI installation directory
 * @returns {string[]} Array of embedding directory paths
 */
export function getAllEmbeddingPaths(baseModelsPath, comfyuiDir) {
  const paths = []

  // Add default embeddings path
  if (baseModelsPath) {
    paths.push(path.join(baseModelsPath, 'embeddings'))
  }

  // Add extra model paths
  if (comfyuiDir) {
    const extraPaths = parseExtraModelPaths(comfyuiDir)
    if (extraPaths.embeddings) {
      paths.push(...extraPaths.embeddings)
    }
  }

  // Filter to only existing directories
  return paths.filter(p => fs.existsSync(p) && fs.statSync(p).isDirectory())
}
