import express from 'express'
import progressTracker from '../services/progress.js'

const router = express.Router()

// SSE endpoint for scan progress
router.get('/scan-progress', (req, res) => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // Disable buffering in nginx

  // Send initial state
  const currentProgress = progressTracker.getCurrentProgress()
  if (currentProgress) {
    res.write(`data: ${JSON.stringify(currentProgress)}\n\n`)
  } else {
    res.write(`data: ${JSON.stringify({ phase: 'idle', message: 'No scan in progress' })}\n\n`)
  }

  // Listen for progress updates
  const progressHandler = (progress) => {
    res.write(`data: ${JSON.stringify(progress)}\n\n`)
  }

  progressTracker.on('progress', progressHandler)

  // Send heartbeat every 30 seconds to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`)
  }, 30000)

  // Cleanup on client disconnect
  req.on('close', () => {
    clearInterval(heartbeat)
    progressTracker.off('progress', progressHandler)
    res.end()
  })
})

export default router
