/**
 * Authentication Middleware for Mobile API
 * Handles bearer token validation and device verification
 */

import { verifyDeviceToken } from '../db/index.js'

/**
 * Extract bearer token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} - Extracted token or null
 */
function extractBearerToken(authHeader) {
  if (!authHeader) return null

  // Expected format: "Bearer <token>"
  const parts = authHeader.split(' ')

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null
  }

  return parts[1]
}

/**
 * Middleware to authenticate mobile device requests
 * Validates bearer token and attaches device info to req.device
 *
 * Usage:
 *   app.get('/api/presets', requireAuth, (req, res) => {
 *     // req.device contains authenticated device info
 *   })
 */
export function requireAuth(req, res, next) {
  try {
    // Extract token from Authorization header
    const token = extractBearerToken(req.headers.authorization)

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header. Expected: Bearer <token>'
      })
    }

    // Verify token and get device info
    const device = verifyDeviceToken(token)

    if (!device) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or expired authentication token'
      })
    }

    // Check if device is active
    if (!device.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Device has been deactivated'
      })
    }

    // Attach device info to request for use in route handlers
    req.device = {
      id: device.id,
      name: device.device_name,
      platform: device.platform,
      createdAt: device.created_at,
      lastSeen: device.last_seen
    }

    // Continue to next middleware/route handler
    next()
  } catch (error) {
    console.error('Authentication middleware error:', error)

    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred during authentication'
    })
  }
}

/**
 * Optional authentication middleware
 * Attaches device info if token is present, but doesn't require it
 * Useful for endpoints that work for both authenticated and unauthenticated requests
 *
 * Usage:
 *   app.get('/api/public-data', optionalAuth, (req, res) => {
 *     if (req.device) {
 *       // User is authenticated, personalize response
 *     } else {
 *       // User is not authenticated, return generic response
 *     }
 *   })
 */
export function optionalAuth(req, res, next) {
  try {
    // Extract token from Authorization header
    const token = extractBearerToken(req.headers.authorization)

    if (!token) {
      // No token provided, continue without authentication
      return next()
    }

    // Verify token and get device info
    const device = verifyDeviceToken(token)

    if (device && device.is_active) {
      // Attach device info to request
      req.device = {
        id: device.id,
        name: device.device_name,
        platform: device.platform,
        createdAt: device.created_at,
        lastSeen: device.last_seen
      }
    }

    // Continue regardless of token validity
    next()
  } catch (error) {
    console.error('Optional authentication middleware error:', error)
    // Continue even if there's an error
    next()
  }
}

/**
 * Platform-specific authentication middleware
 * Restricts access to specific platform (android or ios)
 *
 * Usage:
 *   app.post('/api/android-only', requirePlatform('android'), (req, res) => {
 *     // Only Android devices can access this endpoint
 *   })
 */
export function requirePlatform(platform) {
  return (req, res, next) => {
    // Must be used after requireAuth
    if (!req.device) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required'
      })
    }

    if (req.device.platform !== platform) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `This endpoint is only available for ${platform} devices`
      })
    }

    next()
  }
}

/**
 * Device ownership verification middleware
 * Ensures the authenticated device owns the requested resource
 * Checks req.params.deviceId or req.body.deviceId against req.device.id
 *
 * Usage:
 *   app.get('/api/devices/:deviceId/presets', requireAuth, requireDeviceOwnership, (req, res) => {
 *     // User can only access their own presets
 *   })
 */
export function requireDeviceOwnership(req, res, next) {
  // Must be used after requireAuth
  if (!req.device) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication required'
    })
  }

  // Check params.deviceId or body.deviceId
  const requestedDeviceId = req.params.deviceId || req.body.deviceId

  if (!requestedDeviceId) {
    // No device ID in request, allow (other middleware can handle validation)
    return next()
  }

  if (requestedDeviceId !== req.device.id) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Access denied: You can only access your own resources'
    })
  }

  next()
}

/**
 * Error handling wrapper for async route handlers
 * Catches errors and passes them to Express error handler
 *
 * Usage:
 *   app.get('/api/presets', asyncHandler(async (req, res) => {
 *     const presets = await someAsyncOperation()
 *     res.json({ presets })
 *   }))
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * Global error handler middleware
 * Formats errors consistently and logs them
 * Should be added at the end of middleware stack
 *
 * Usage:
 *   app.use(errorHandler)
 */
export function errorHandler(err, req, res, next) {
  console.error('Error:', err)

  // Default error status and message
  const status = err.status || err.statusCode || 500
  const message = err.message || 'An unexpected error occurred'

  // Send error response
  res.status(status).json({
    success: false,
    error: err.name || 'Error',
    message: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
}
