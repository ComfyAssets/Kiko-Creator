import express from 'express'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import config from '../config.js'
import {
  readSafetensorsMetadata,
  readSafetensorsMetadataSync,
  extractTriggerWords,
  extractDescription,
  extractBaseModel,
  extractCivitAIDataSync
} from '../utils/safetensors.js'
import { getAllEmbeddingPaths } from '../utils/comfyui-paths.js'

const router = express.Router()

// Submit prompt to ComfyUI
router.post('/prompt', async (req, res) => {
  try {
    const { workflow } = req.body

    if (!workflow) {
      return res.status(400).json({ error: 'Workflow is required' })
    }

    // Forward to ComfyUI
    const response = await axios.post(
      `${config.comfyuiApiUrl}/prompt`,
      { prompt: workflow },
      { timeout: 30000 }
    )

    res.json(response.data)
  } catch (error) {
    res.status(500).json({
      error: error.message,
      details: error.response?.data
    })
  }
})

// Get generation history
router.get('/history/:promptId', async (req, res) => {
  try {
    const { promptId } = req.params

    // Forward to ComfyUI
    const response = await axios.get(
      `${config.comfyuiApiUrl}/history/${promptId}`,
      { timeout: 10000 }
    )

    res.json(response.data)
  } catch (error) {
    res.status(500).json({
      error: error.message,
      details: error.response?.data
    })
  }
})

// Get object info (includes all available models, samplers, etc.)
router.get('/object_info', async (req, res) => {
  try {
    const response = await axios.get(
      `${config.comfyuiApiUrl}/object_info`,
      { timeout: 10000 }
    )

    res.json(response.data)
  } catch (error) {
    res.status(500).json({
      error: error.message,
      details: error.response?.data
    })
  }
})

// Get available checkpoints (simplified endpoint)
router.get('/checkpoints', async (req, res) => {
  try {
    const { comfyUIUrl, modelsPath } = req.query
    const comfyURL = comfyUIUrl || config.comfyuiApiUrl
    const baseModelsPath = modelsPath || config.comfyuiModelsPath

    const response = await axios.get(
      `${comfyURL}/object_info/CheckpointLoaderSimple`,
      { timeout: 10000 }
    )

    // Extract checkpoint names from the response (includes full paths with subdirectories)
    const checkpointNames = response.data?.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] || []

    // If we have a models path, enrich with metadata
    let checkpoints = checkpointNames
    if (baseModelsPath && fs.existsSync(baseModelsPath)) {
      const checkpointsPath = path.join(baseModelsPath, 'checkpoints')

      if (fs.existsSync(checkpointsPath)) {
        checkpoints = checkpointNames.map(ckptName => {
          // Construct full path to checkpoint file
          const ckptFilePath = path.join(checkpointsPath, ckptName)

          // Read metadata if file exists
          if (fs.existsSync(ckptFilePath)) {
            const metadata = readSafetensorsMetadataSync(ckptFilePath)
            const civitaiData = extractCivitAIDataSync(ckptFilePath)

            return {
              name: ckptName,
              path: ckptName,
              description: metadata ? extractDescription(metadata) : null,
              baseModel: metadata ? extractBaseModel(metadata) : null,
              civitai: civitaiData || {}
            }
          }

          return {
            name: ckptName,
            path: ckptName,
            description: null,
            baseModel: null,
            civitai: {}
          }
        })
      } else {
        // Checkpoints path doesn't exist, return simple format
        checkpoints = checkpointNames.map(name => ({ name, path: name, description: null, baseModel: null, civitai: {} }))
      }
    } else {
      // No models path provided, return simple format
      checkpoints = checkpointNames.map(name => ({ name, path: name, description: null, baseModel: null, civitai: {} }))
    }

    res.json({ checkpoints })
  } catch (error) {
    res.status(500).json({
      error: error.message,
      details: error.response?.data
    })
  }
})

// Get available LoRAs with metadata (trigger words, descriptions, etc.)
router.get('/loras', async (req, res) => {
  try {
    const { comfyUIUrl, modelsPath } = req.query
    const comfyURL = comfyUIUrl || config.comfyuiApiUrl
    const baseModelsPath = modelsPath || config.comfyuiModelsPath

    const response = await axios.get(
      `${comfyURL}/object_info/LoraLoader`,
      { timeout: 10000 }
    )

    // Extract LoRA names from the response (includes full paths with subdirectories)
    const loraNames = response.data?.LoraLoader?.input?.required?.lora_name?.[0] || []

    // If we have a models path, enrich with metadata
    let loras = loraNames
    if (baseModelsPath && fs.existsSync(baseModelsPath)) {
      const lorasPath = path.join(baseModelsPath, 'loras')

      if (fs.existsSync(lorasPath)) {
        loras = loraNames.map(loraName => {
          // Construct full path to LoRA file
          const loraFilePath = path.join(lorasPath, loraName)

          // Read metadata if file exists
          if (fs.existsSync(loraFilePath)) {
            const metadata = readSafetensorsMetadataSync(loraFilePath)
            const civitaiData = extractCivitAIDataSync(loraFilePath)

            return {
              name: loraName,
              path: loraName,
              triggerWords: metadata ? extractTriggerWords(metadata) : [],
              description: metadata ? extractDescription(metadata) : null,
              baseModel: metadata ? extractBaseModel(metadata) : null,
              civitai: civitaiData || {}
            }
          }

          return {
            name: loraName,
            path: loraName,
            triggerWords: [],
            description: null,
            baseModel: null,
            civitai: {}
          }
        })
      } else {
        // LoRAs path doesn't exist, return simple format
        loras = loraNames.map(name => ({ name, path: name, triggerWords: [], description: null, baseModel: null, civitai: {} }))
      }
    } else {
      // No models path provided, return simple format
      loras = loraNames.map(name => ({ name, path: name, triggerWords: [], description: null, baseModel: null, civitai: {} }))
    }

    res.json({ loras })
  } catch (error) {
    res.status(500).json({
      error: error.message,
      details: error.response?.data
    })
  }
})

// Get available upscale models (simplified endpoint)
router.get('/upscalers', async (req, res) => {
  try {
    const { comfyUIUrl } = req.query
    const comfyURL = comfyUIUrl || config.comfyuiApiUrl

    const response = await axios.get(
      `${comfyURL}/object_info/UpscaleModelLoader`,
      { timeout: 10000 }
    )

    // Extract upscaler names from the response
    // ComfyUI returns: ["COMBO", { multiselect: false, options: [...models...] }]
    const modelData = response.data?.UpscaleModelLoader?.input?.required?.model_name
    const upscalers = modelData?.[1]?.options || []

    res.json({ upscalers })
  } catch (error) {
    res.status(500).json({
      error: error.message,
      details: error.response?.data
    })
  }
})

// Get available embeddings (textual inversion)
router.get('/embeddings', async (req, res) => {
  try {
    const { modelsPath } = req.query
    const baseModelsPath = modelsPath || config.comfyuiModelsPath
    const comfyuiDir = config.comfyuiDir

    let embeddings = []

    if (baseModelsPath || comfyuiDir) {
      // Get all embedding directories (including extra model paths from yaml)
      const embeddingDirs = getAllEmbeddingPaths(baseModelsPath, comfyuiDir)

      if (embeddingDirs.length === 0) {
        console.warn('⚠️ No embedding directories found')
        return res.json({ embeddings: [] })
      }

      console.log(`📂 Scanning ${embeddingDirs.length} embedding directories`)

      // Scan all directories recursively
      const scanDirectory = (dir) => {
        const results = []

        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true })

          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name)

            if (entry.isDirectory()) {
              // Recursively scan subdirectories
              results.push(...scanDirectory(fullPath))
            } else if (entry.name.endsWith('.pt') || entry.name.endsWith('.safetensors') || entry.name.endsWith('.bin')) {
              // Get relative path from the base embeddings directory for the name
              const relativePath = path.relative(dir, fullPath)
              const dirName = path.basename(dir)

              // Use subdirectory name + filename if in subdirectory, otherwise just filename
              const name = relativePath.includes(path.sep)
                ? relativePath.replace(/\.(pt|safetensors|bin)$/, '')
                : entry.name.replace(/\.(pt|safetensors|bin)$/, '')

              // Try to read metadata from safetensors files
              let description = null
              let civitai = {}
              if (entry.name.endsWith('.safetensors')) {
                const metadata = readSafetensorsMetadata(fullPath)
                description = metadata ? extractDescription(metadata) : null
                civitai = extractCivitAIData(fullPath)
              }

              results.push({
                name,
                fileName: entry.name,
                description,
                civitai
              })
            }
          }
        } catch (error) {
          console.error(`⚠️ Error scanning directory ${dir}:`, error.message)
        }

        return results
      }

      // Scan all embedding directories
      for (const dir of embeddingDirs) {
        embeddings.push(...scanDirectory(dir))
      }

      console.log(`✅ Found ${embeddings.length} embeddings`)
    } else {
      console.warn('⚠️ Models path not configured, cannot scan for embeddings')
    }

    res.json({ embeddings })
  } catch (error) {
    res.status(500).json({
      error: error.message,
      details: error.response?.data
    })
  }
})

export default router