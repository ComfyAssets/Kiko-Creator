import express from 'express'
import { randomUUID } from 'crypto'
import {
  registerDevice,
  verifyDeviceToken,
  updateDevicePushToken,
  getDevice
} from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

/**
 * POST /api/auth/device
 * Register a new mobile device
 */
router.post('/device', (req, res) => {
  try {
    const { deviceName, platform, pushToken } = req.body

    // Validation
    if (!deviceName || !platform) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'deviceName and platform are required',
        details: {
          deviceName: !deviceName ? 'Required' : undefined,
          platform: !platform ? 'Required' : undefined
        }
      })
    }

    // Validate platform
    if (!['android', 'ios'].includes(platform)) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid platform',
        details: {
          platform: "Must be 'android' or 'ios'"
        }
      })
    }

    // Generate device ID and token
    const deviceId = randomUUID()
    const token = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '') // 64 char hex

    // Register device
    const device = registerDevice({
      id: deviceId,
      deviceName,
      platform,
      token,
      pushToken: pushToken || null
    })

    console.log(`📱 Device registered: ${deviceName} (${platform})`)

    res.status(201).json({
      success: true,
      device: {
        id: device.id,
        deviceName: device.device_name,
        platform: device.platform,
        token: device.token,
        createdAt: device.created_at
      }
    })
  } catch (error) {
    console.error('Error registering device:', error)

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to register device',
      details: error.message
    })
  }
})

/**
 * GET /api/auth/verify
 * Verify authentication token
 */
router.get('/verify', requireAuth, (req, res) => {
  try {
    // If we get here, authentication was successful (requireAuth middleware)
    res.json({
      success: true,
      device: {
        id: req.device.id,
        deviceName: req.device.name,
        platform: req.device.platform,
        lastSeen: req.device.lastSeen,
        createdAt: req.device.createdAt
      }
    })
  } catch (error) {
    console.error('Error verifying token:', error)

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to verify token'
    })
  }
})

/**
 * PUT /api/auth/device/push-token
 * Update FCM/APNs push token
 */
router.put('/device/push-token', requireAuth, (req, res) => {
  try {
    const { pushToken } = req.body

    if (!pushToken) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'pushToken is required'
      })
    }

    // Update push token
    updateDevicePushToken(req.device.id, pushToken)

    console.log(`🔔 Push token updated for device: ${req.device.name}`)

    res.json({
      success: true,
      message: 'Push token updated successfully'
    })
  } catch (error) {
    console.error('Error updating push token:', error)

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to update push token',
      details: error.message
    })
  }
})

/**
 * GET /api/auth/device
 * Get current device info
 */
router.get('/device', requireAuth, (req, res) => {
  try {
    const device = getDevice(req.device.id)

    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Device not found'
      })
    }

    res.json({
      success: true,
      device: {
        id: device.id,
        deviceName: device.device_name,
        platform: device.platform,
        createdAt: device.created_at,
        lastSeen: device.last_seen,
        hasPushToken: !!device.push_token
      }
    })
  } catch (error) {
    console.error('Error getting device info:', error)

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get device info'
    })
  }
})

export default router
