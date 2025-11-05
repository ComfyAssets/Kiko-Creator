import axios from 'axios'
import fs from 'fs/promises'
import path from 'path'
import yaml from 'yaml'
import config from '../config.js'
import { calculateFileHash } from '../utils/crypto.js'
import { fetchModelMetadataByHash } from './civitai.js'
import { cacheThumbnailForModel } from './thumbnails.js'
import {
  getModel,
  upsertModel,
  upsertCivitAIMetadata,
  startScan,
  completeScan,
  needsUpdate
} from '../db/index.js'
import progressTracker from './progress.js'

// Test ComfyUI API connection
export async function testConnection(apiUrl) {
  try {
    // Test basic connectivity
    const systemStatsResponse = await axios.get(`${apiUrl}/system_stats`, {
      timeout: 10000
    })

    if (!systemStatsResponse.data) {
      throw new Error('Invalid response from ComfyUI')
    }

    // Try to get object info to extract version
    let version = 'unknown'
    try {
      const objectInfoResponse = await axios.get(`${apiUrl}/object_info`, {
        timeout: 10000
      })
      if (objectInfoResponse.data) {
        version = 'connected'
      }
    } catch (err) {
      console.warn('Could not get object info:', err.message)
    }

    // Check for ComfyUI_Mira extension
    // Note: This is a simplified check - in production you'd query the extensions endpoint
    let hasMira = true // Assume true for now, can be enhanced later

    return {
      success: true,
      version,
      hasMira,
      systemStats: systemStatsResponse.data
    }
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to connect to ComfyUI',
      details: error.response?.data
    }
  }
}

// Helper function to parse multiline path strings
function parsePathField(field, basePath) {
  if (!field) return []

  const paths = []

  if (Array.isArray(field)) {
    // Already an array
    paths.push(...field)
  } else if (typeof field === 'string') {
    // Split by newlines (handles YAML pipe notation |)
    const lines = field.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
    paths.push(...lines)
  }

  // Join with base path and resolve to absolute paths
  return paths.map(p => {
    // If path is already absolute, use it as-is
    if (path.isAbsolute(p)) {
      return p
    }
    // Otherwise join with base path
    return path.join(basePath, p)
  })
}

// Get ComfyUI base models directory paths
async function getComfyUIBaseModelPaths(yamlPath) {
  try {
    // Derive ComfyUI directory from YAML path
    // extra_model_paths.yaml is typically in ComfyUI root directory
    const comfyuiDir = path.dirname(yamlPath)
    const modelsDir = path.join(comfyuiDir, 'models')

    // Check if models directory exists
    try {
      await fs.access(modelsDir)
    } catch {
      console.log('⚠️  ComfyUI models directory not found, skipping base models')
      return { checkpoints: [], loras: [], embeddings: [] }
    }

    // Return base model paths
    const basePaths = {
      checkpoints: [
        path.join(modelsDir, 'checkpoints'),
        path.join(modelsDir, 'diffusion_models'),
        path.join(modelsDir, 'unet')
      ],
      loras: [path.join(modelsDir, 'loras')],
      embeddings: [path.join(modelsDir, 'embeddings')]
    }

    console.log('📂 ComfyUI base models directory:', modelsDir)
    return basePaths
  } catch (error) {
    console.warn('⚠️  Could not determine ComfyUI base models path:', error.message)
    return { checkpoints: [], loras: [], embeddings: [] }
  }
}

// Parse extra_model_paths.yaml file
export async function parseYAMLFile(yamlPath) {
  try {
    // Check if file exists
    await fs.access(yamlPath)

    // Read file content
    const fileContent = await fs.readFile(yamlPath, 'utf8')

    // Parse YAML
    const parsedYAML = yaml.parse(fileContent)

    if (!parsedYAML) {
      throw new Error('Invalid YAML file')
    }

    // ComfyUI uses a 'comfyui' section with base_path and model paths
    const comfyuiConfig = parsedYAML.comfyui || parsedYAML
    const basePath = comfyuiConfig.base_path || ''

    if (!basePath) {
      throw new Error('No base_path found in YAML file')
    }

    // Extract model paths using the helper function
    // Checkpoints can be in: checkpoints, diffusion_models, or unet fields
    const checkpointPaths = [
      ...parsePathField(comfyuiConfig.checkpoints, basePath),
      ...parsePathField(comfyuiConfig.diffusion_models, basePath),
      ...parsePathField(comfyuiConfig.unet, basePath)
    ]

    // Get ComfyUI base models directory paths
    const baseModelPaths = await getComfyUIBaseModelPaths(yamlPath)

    // Merge extra paths with base paths
    const paths = {
      checkpoints: [...baseModelPaths.checkpoints, ...checkpointPaths],
      loras: [...baseModelPaths.loras, ...parsePathField(comfyuiConfig.loras, basePath)],
      embeddings: [...baseModelPaths.embeddings, ...parsePathField(comfyuiConfig.embeddings, basePath)],
      basePath: basePath // Include base path for reference
    }

    console.log('Parsed YAML paths:', JSON.stringify(paths, null, 2))

    return paths
  } catch (error) {
    throw new Error(`Failed to parse YAML file: ${error.message}`)
  }
}

// Discover models in the specified directories
export async function discoverModels(apiUrl, yamlPath, options = {}) {
  const scanStartTime = Date.now()
  let scanId = null

  try {
    const { civitaiKey = null, calculateHashes = true, fetchMetadata = true } = options

    console.log('🔍 Starting model discovery...')
    if (civitaiKey && fetchMetadata) {
      console.log('🔑 CivitAI API key provided - will fetch metadata')
    }

    // Start scan tracking
    scanId = startScan(yamlPath, civitaiKey && fetchMetadata)
    console.log(`📊 Scan ID: ${scanId}`)

    // Start progress tracking
    progressTracker.startScan(scanId)
    progressTracker.updatePhase('parsing', 'Parsing YAML configuration...')

    // Parse YAML to get paths
    const paths = await parseYAMLFile(yamlPath)

    // Count total files for progress tracking
    progressTracker.updatePhase('counting', 'Counting model files...')
    const totalFiles = await countModelFiles(paths, ['.safetensors', '.ckpt', '.pt', '.bin'])
    progressTracker.updateProgress(0, totalFiles, `Found ${totalFiles} model files`)

    // Scan directories for models with enhanced metadata and database caching
    progressTracker.updatePhase('scanning_checkpoints', 'Scanning checkpoints...')
    console.log('\n📦 Scanning checkpoints...')
    const checkpoints = await scanModelDirectory(
      paths.checkpoints,
      ['.safetensors', '.ckpt', '.pt'],
      {
        type: 'checkpoint',
        calculateHashes,
        fetchMetadata: fetchMetadata && civitaiKey,
        civitaiKey,
        basePaths: paths.checkpoints
      }
    )

    progressTracker.updatePhase('scanning_loras', 'Scanning LoRAs...')
    console.log('\n🎨 Scanning LoRAs...')
    const loras = await scanModelDirectory(
      paths.loras,
      ['.safetensors', '.pt'],
      {
        type: 'lora',
        calculateHashes,
        fetchMetadata: fetchMetadata && civitaiKey,
        civitaiKey,
        basePaths: paths.loras
      }
    )

    progressTracker.updatePhase('scanning_embeddings', 'Scanning embeddings...')
    console.log('\n📝 Scanning embeddings...')
    const embeddings = await scanModelDirectory(
      paths.embeddings,
      ['.safetensors', '.pt', '.bin'],
      {
        type: 'embedding',
        calculateHashes,
        fetchMetadata: fetchMetadata && civitaiKey,
        civitaiKey,
        basePaths: paths.embeddings
      }
    )

    const scanDuration = Math.round((Date.now() - scanStartTime) / 1000)

    const stats = {
      duration: scanDuration,
      cached: checkpoints.filter(m => m.cached).length + loras.filter(m => m.cached).length + embeddings.filter(m => m.cached).length,
      total: checkpoints.length + loras.length + embeddings.length,
      checkpoints: checkpoints.length,
      loras: loras.length,
      embeddings: embeddings.length
    }

    // Complete scan tracking
    completeScan(scanId, {
      checkpoints: checkpoints.length,
      loras: loras.length,
      embeddings: embeddings.length
    }, scanDuration)

    // Complete progress tracking
    progressTracker.completeScan(stats)

    console.log(`\n✅ Model discovery complete in ${scanDuration}s!`)
    console.log(`   Cached: ${stats.cached} models`)
    console.log(`   Hashed: ${checkpoints.filter(m => m.hash).length + loras.filter(m => m.hash).length + embeddings.filter(m => m.hash).length} models`)
    console.log(`   Metadata: ${checkpoints.filter(m => m.metadata).length + loras.filter(m => m.metadata).length + embeddings.filter(m => m.metadata).length} models`)

    return {
      checkpoints,
      loras,
      embeddings,
      paths,
      scanId,
      stats
    }
  } catch (error) {
    if (scanId) {
      const scanDuration = Math.round((Date.now() - scanStartTime) / 1000)
      completeScan(scanId, { errors: [error.message] }, scanDuration)
    }
    progressTracker.errorScan(error)
    throw new Error(`Failed to discover models: ${error.message}`)
  }
}

// Helper function to scan a directory for model files with enhanced metadata and database caching
async function scanModelDirectory(directories, extensions, options = {}) {
  const {
    type = 'checkpoint',
    calculateHashes = false,
    fetchMetadata = false,
    civitaiKey = null,
    basePaths = []
  } = options

  const models = []

  if (!Array.isArray(directories)) {
    directories = [directories]
  }

  // Helper to determine which base path a file belongs to
  const getRelativePath = (filePath) => {
    for (const basePath of basePaths) {
      if (filePath.startsWith(basePath)) {
        const relative = path.relative(basePath, filePath)
        const folderPath = path.dirname(relative)
        return folderPath === '.' ? '' : folderPath
      }
    }
    return ''
  }

  // Recursive scan function with database caching
  const scanDirectory = async (dir, baseDir = dir) => {
    try {
      // Check if directory exists
      try {
        await fs.access(dir)
      } catch (accessError) {
        console.log(`⚠️  Skipping non-existent directory: ${dir}`)
        return []
      }

      // Check if it's actually a directory
      const stats = await fs.stat(dir)
      if (!stats.isDirectory()) {
        console.warn(`⚠️  Path is not a directory: ${dir}`)
        return []
      }

      const localModels = []
      const files = await fs.readdir(dir, { withFileTypes: true })

      for (const file of files) {
        if (file.isFile()) {
          const ext = path.extname(file.name).toLowerCase()
          if (extensions.includes(ext)) {
            const filePath = path.join(dir, file.name)
            const fileStats = await fs.stat(filePath)
            const folderPath = getRelativePath(filePath)
            const fileModifiedAt = fileStats.mtime.toISOString()

            // Check database cache
            const cachedModel = getModel(filePath, 'path')
            const needsRefresh = !cachedModel || needsUpdate(filePath, fileModifiedAt)

            let model = {
              name: file.name,
              path: filePath,
              folder: folderPath,
              type: type, // Include type for frontend filtering
              size: fileStats.size,
              sizeFormatted: formatFileSize(fileStats.size),
              modifiedAt: fileStats.mtime,
              cached: false
            }

            if (cachedModel && !needsRefresh) {
              // Use cached data
              console.log(`💾 Using cache: ${file.name}`)
              progressTracker.modelProcessing(file.name, 'Cached', true)

              model.hash = cachedModel.hash
              model.cached = true

              // Use cached metadata if available
              if (cachedModel.civitai_id) {
                model.metadata = {
                  id: cachedModel.civitai_id,
                  modelId: cachedModel.civitai_model_id,
                  modelName: cachedModel.civitai_model_name,
                  description: cachedModel.description,
                  baseModel: cachedModel.base_model,
                  trainedWords: cachedModel.trained_words,
                  images: cachedModel.images,
                  thumbnailPath: cachedModel.thumbnail_path,
                  stats: cachedModel.stats
                }
              }
            } else {
              // Calculate hash if requested or needed
              if (calculateHashes) {
                try {
                  console.log(`🔐 Calculating hash: ${file.name}`)
                  progressTracker.modelProcessing(file.name, 'Hashing', false)
                  model.hash = await calculateFileHash(filePath)
                } catch (error) {
                  console.warn(`⚠️  Failed to hash ${file.name}:`, error.message)
                  model.hash = null
                }
              }

              // Check if we have metadata for this hash in DB
              if (model.hash) {
                const modelByHash = getModel(model.hash, 'hash')
                if (modelByHash && modelByHash.civitai_id) {
                  console.log(`💾 Reusing metadata for hash: ${file.name}`)
                  model.metadata = {
                    id: modelByHash.civitai_id,
                    modelId: modelByHash.civitai_model_id,
                    modelName: modelByHash.civitai_model_name,
                    description: modelByHash.description,
                    baseModel: modelByHash.base_model,
                    trainedWords: modelByHash.trained_words,
                    images: modelByHash.images,
                    thumbnailPath: modelByHash.thumbnail_path,
                    stats: modelByHash.stats
                  }
                } else if (fetchMetadata && civitaiKey) {
                  // Fetch fresh metadata from CivitAI
                  try {
                    console.log(`📥 Fetching metadata: ${file.name}`)
                    progressTracker.modelProcessing(file.name, 'Fetching metadata', false)
                    model.metadata = await fetchModelMetadataByHash(model.hash, civitaiKey)
                    if (model.metadata) {
                      console.log(`✓ Found: ${model.metadata.modelName || 'Unknown'}`)

                      // Download and cache thumbnail
                      try {
                        const thumbnailPath = await cacheThumbnailForModel(model.hash, model.metadata)
                        if (thumbnailPath) {
                          model.metadata.thumbnailPath = thumbnailPath
                          console.log(`🖼️  Cached thumbnail: ${thumbnailPath}`)
                        }
                      } catch (thumbError) {
                        console.warn(`⚠️  Failed to cache thumbnail:`, thumbError.message)
                      }
                    }
                  } catch (error) {
                    console.warn(`⚠️  Failed to fetch metadata for ${file.name}:`, error.message)
                    model.metadata = null
                  }
                }
              }

              // Save to database
              try {
                const modelId = upsertModel({
                  name: file.name,
                  path: filePath,
                  folder: folderPath,
                  type: type,
                  size: fileStats.size,
                  hash: model.hash,
                  fileModifiedAt: fileModifiedAt
                })

                // Save metadata if available
                if (model.metadata) {
                  upsertCivitAIMetadata(modelId, model.metadata)
                }
              } catch (error) {
                console.warn(`⚠️  Failed to save to DB: ${file.name}:`, error.message)
              }
            }

            localModels.push(model)
          }
        } else if (file.isDirectory()) {
          // Recursively scan subdirectories
          const subDir = path.join(dir, file.name)
          const subModels = await scanDirectory(subDir, baseDir)
          localModels.push(...subModels)
        }
      }

      return localModels
    } catch (error) {
      console.warn(`❌ Error scanning directory ${dir}:`, error.message)
      return []
    }
  }

  // Scan all directories
  for (const dir of directories) {
    if (!dir) continue
    console.log(`📂 Scanning: ${dir}`)
    const dirModels = await scanDirectory(dir, dir)
    models.push(...dirModels)
  }

  return models
}

// Helper function to quickly count model files for progress tracking
async function countModelFiles(paths, extensions) {
  let count = 0

  const countInDir = async (dir) => {
    try {
      await fs.access(dir)
      const stats = await fs.stat(dir)
      if (!stats.isDirectory()) return 0

      const files = await fs.readdir(dir, { withFileTypes: true })
      let dirCount = 0

      for (const file of files) {
        if (file.isFile()) {
          const ext = path.extname(file.name).toLowerCase()
          if (extensions.includes(ext)) dirCount++
        } else if (file.isDirectory()) {
          dirCount += await countInDir(path.join(dir, file.name))
        }
      }

      return dirCount
    } catch (error) {
      return 0
    }
  }

  // Count in all path groups
  const allPaths = [
    ...(Array.isArray(paths.checkpoints) ? paths.checkpoints : [paths.checkpoints]),
    ...(Array.isArray(paths.loras) ? paths.loras : [paths.loras]),
    ...(Array.isArray(paths.embeddings) ? paths.embeddings : [paths.embeddings])
  ].filter(Boolean)

  for (const dir of allPaths) {
    count += await countInDir(dir)
  }

  return count
}

// Helper function to format file size
function formatFileSize(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0) return '0 Byte'
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)))
  return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i]
}

// Save settings to file
export async function saveSettingsToFile(settings) {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(config.settingsFile)
    await fs.mkdir(dataDir, { recursive: true })

    // Create settings object
    const settingsData = {
      ...settings,
      setupComplete: true,
      timestamp: new Date().toISOString()
    }

    // Write to file
    await fs.writeFile(
      config.settingsFile,
      JSON.stringify(settingsData, null, 2),
      'utf8'
    )

    return { success: true, message: 'Settings saved successfully' }
  } catch (error) {
    throw new Error(`Failed to save settings: ${error.message}`)
  }
}
