import express from 'express'
import axios from 'axios'
import config from '../config.js'

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
    const { comfyUIUrl } = req.query
    const comfyURL = comfyUIUrl || config.comfyuiApiUrl

    const response = await axios.get(
      `${comfyURL}/object_info/CheckpointLoaderSimple`,
      { timeout: 10000 }
    )

    // Extract checkpoint names from the response (includes full paths with subdirectories)
    const checkpoints = response.data?.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] || []

    res.json({ checkpoints })
  } catch (error) {
    res.status(500).json({
      error: error.message,
      details: error.response?.data
    })
  }
})

// Get available LoRAs (simplified endpoint)
router.get('/loras', async (req, res) => {
  try {
    const { comfyUIUrl } = req.query
    const comfyURL = comfyUIUrl || config.comfyuiApiUrl

    const response = await axios.get(
      `${comfyURL}/object_info/LoraLoader`,
      { timeout: 10000 }
    )

    // Extract LoRA names from the response (includes full paths with subdirectories)
    const loras = response.data?.LoraLoader?.input?.required?.lora_name?.[0] || []

    res.json({ loras })
  } catch (error) {
    res.status(500).json({
      error: error.message,
      details: error.response?.data
    })
  }
})

export default router
