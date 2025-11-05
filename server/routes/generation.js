import express from 'express'
import { buildTextToImageWorkflow, validateSettings } from '../services/workflowBuilder.js'

// Note: fetch is built-in to Node.js 18+

const router = express.Router()

// Store for tracking generation progress
const activeGenerations = new Map()

/**
 * Submit a generation request to ComfyUI
 */
router.post('/generate', async (req, res) => {
  try {
    const { settings, loraSlots, comfyUIUrl, clientId } = req.body

    // Validate settings
    const validation = validateSettings(settings)
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid settings',
        details: validation.errors
      })
    }

    // Build workflow
    const workflow = buildTextToImageWorkflow(settings, loraSlots)
    console.log('📝 Generated workflow:', JSON.stringify(workflow, null, 2))

    // Submit to ComfyUI
    const comfyURL = comfyUIUrl || 'http://127.0.0.1:8188'
    const finalClientId = clientId || `kiko-creator-${Date.now()}`

    const response = await fetch(`${comfyURL}/prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: workflow,
        client_id: finalClientId
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch (e) {
        errorData = { message: errorText }
      }

      console.error('❌ ComfyUI error:', errorData)

      // Parse validation errors for better user feedback
      if (errorData.error?.type === 'prompt_outputs_failed_validation' && errorData.node_errors) {
        const nodeErrors = Object.entries(errorData.node_errors).map(([nodeId, nodeError]) => {
          const errors = nodeError.errors || []
          return errors.map(err => {
            if (err.type === 'value_not_in_list' && err.extra_info?.input_name === 'ckpt_name') {
              return `Checkpoint '${err.extra_info.received_value}' not found in ComfyUI. Please select a valid checkpoint from the dropdown.`
            }
            return `${err.message}: ${err.details || ''}`
          }).join('; ')
        }).join('; ')

        throw new Error(nodeErrors || 'Invalid workflow configuration')
      }

      throw new Error(`ComfyUI request failed: ${response.status} ${errorText}`)
    }

    const result = await response.json()
    console.log('✅ Generation submitted:', result)

    // Store generation info for progress tracking
    if (result.prompt_id) {
      activeGenerations.set(result.prompt_id, {
        settings,
        loraSlots,
        status: 'queued',
        startTime: Date.now(),
        progress: 0
      })
    }

    res.json({
      success: true,
      promptId: result.prompt_id,
      message: 'Generation started'
    })
  } catch (error) {
    console.error('❌ Generation error:', error)
    res.status(500).json({
      error: error.message,
      details: error.stack
    })
  }
})

/**
 * Get generation progress
 */
router.get('/progress/:promptId', async (req, res) => {
  try {
    const { promptId } = req.params
    const generation = activeGenerations.get(promptId)

    if (!generation) {
      return res.status(404).json({
        error: 'Generation not found'
      })
    }

    res.json({
      promptId,
      status: generation.status,
      progress: generation.progress,
      startTime: generation.startTime
    })
  } catch (error) {
    console.error('❌ Progress check error:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Get generation history from ComfyUI
 */
router.get('/history', async (req, res) => {
  try {
    const { comfyUIUrl } = req.query
    const comfyURL = comfyUIUrl || 'http://127.0.0.1:8188'

    const response = await fetch(`${comfyURL}/history`)

    if (!response.ok) {
      throw new Error(`Failed to fetch history: ${response.status}`)
    }

    const history = await response.json()
    res.json(history)
  } catch (error) {
    console.error('❌ History fetch error:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Get generated image from ComfyUI
 */
router.get('/image/:filename', async (req, res) => {
  try {
    const { filename } = req.params
    const { comfyUIUrl, subfolder = '', type = 'output' } = req.query
    const comfyURL = comfyUIUrl || 'http://127.0.0.1:8188'

    const url = `${comfyURL}/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}&type=${type}`

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`)
    }

    // Get the image as a buffer
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Set content type and send
    res.setHeader('Content-Type', response.headers.get('content-type') || 'image/png')
    res.setHeader('Content-Length', buffer.length)
    res.send(buffer)
  } catch (error) {
    console.error('❌ Image fetch error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get tag autocomplete suggestions
router.get('/tags/autocomplete', async (req, res) => {
  try {
    // TODO: Implement tag autocomplete from CSV
    // const { query, mode = 'prefix' } = req.query

    res.json({
      tags: [],
      message: 'Tag autocomplete not yet implemented'
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Export for WebSocket access
export { activeGenerations }
export default router
