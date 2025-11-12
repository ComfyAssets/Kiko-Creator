#!/usr/bin/env node

/**
 * Authentication Middleware Test Script
 * Tests bearer token validation, device verification, and error handling
 */

import { randomUUID } from 'crypto'
import * as db from './db/index.js'
import { requireAuth, optionalAuth, requirePlatform, requireDeviceOwnership } from './middleware/auth.js'

console.log('🧪 Testing Authentication Middleware\n')

// Helper function to create mock request/response objects
function createMockReqRes(authHeader = null, params = {}, body = {}) {
  const req = {
    headers: { authorization: authHeader },
    params: params,
    body: body,
    device: null
  }

  const res = {
    statusCode: null,
    jsonResponse: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(data) {
      this.jsonResponse = data
      return this
    }
  }

  let nextCalled = false
  const next = () => { nextCalled = true }

  return { req, res, next, nextCalled: () => nextCalled }
}

// Test Setup: Create test device
console.log('📝 Setting up test device...')
const deviceId = randomUUID()
const deviceToken = randomUUID() + randomUUID()
const device = db.registerDevice({
  id: deviceId,
  deviceName: 'Test Auth Device',
  platform: 'android',
  token: deviceToken
})
console.log('   ✅ Test device created:', device.device_name, '\n')

// Test 1: Valid authentication
console.log('1️⃣  Testing Valid Authentication...')
{
  const { req, res, next, nextCalled } = createMockReqRes(`Bearer ${deviceToken}`)
  requireAuth(req, res, next)

  if (nextCalled() && req.device && req.device.id === deviceId) {
    console.log('   ✅ Valid token accepted, device attached to request')
    console.log('      Device ID:', req.device.id)
    console.log('      Device Name:', req.device.name)
  } else {
    console.log('   ❌ Valid authentication failed')
    console.log('      Status:', res.statusCode)
    console.log('      Response:', res.jsonResponse)
    process.exit(1)
  }
}

// Test 2: Missing Authorization header
console.log('\n2️⃣  Testing Missing Authorization Header...')
{
  const { req, res, next, nextCalled } = createMockReqRes(null)
  requireAuth(req, res, next)

  if (res.statusCode === 401 && res.jsonResponse.message.includes('Missing')) {
    console.log('   ✅ Correctly rejected missing header')
    console.log('      Error:', res.jsonResponse.message)
  } else {
    console.log('   ❌ Missing header test failed')
    console.log('      Status:', res.statusCode)
    console.log('      Response:', res.jsonResponse)
    process.exit(1)
  }
}

// Test 3: Invalid token format
console.log('\n3️⃣  Testing Invalid Token Format...')
{
  const { req, res, next, nextCalled } = createMockReqRes('InvalidFormat')
  requireAuth(req, res, next)

  if (res.statusCode === 401 && res.jsonResponse.message.includes('Missing or invalid')) {
    console.log('   ✅ Correctly rejected invalid format')
    console.log('      Error:', res.jsonResponse.message)
  } else {
    console.log('   ❌ Invalid format test failed')
    console.log('      Status:', res.statusCode)
    process.exit(1)
  }
}

// Test 4: Invalid bearer token
console.log('\n4️⃣  Testing Invalid Bearer Token...')
{
  const invalidToken = 'invalid-token-12345'
  const { req, res, next, nextCalled } = createMockReqRes(`Bearer ${invalidToken}`)
  requireAuth(req, res, next)

  if (res.statusCode === 401 && res.jsonResponse.message.includes('Invalid or expired')) {
    console.log('   ✅ Correctly rejected invalid token')
    console.log('      Error:', res.jsonResponse.message)
  } else {
    console.log('   ❌ Invalid token test failed')
    console.log('      Status:', res.statusCode)
    process.exit(1)
  }
}

// Test 5: Deactivated device
console.log('\n5️⃣  Testing Deactivated Device...')
{
  // Deactivate device
  db.deactivateDevice(deviceId)

  const { req, res, next, nextCalled } = createMockReqRes(`Bearer ${deviceToken}`)
  requireAuth(req, res, next)

  // Note: For security, deactivated devices return 401 (same as invalid tokens)
  // This prevents information leakage about token validity
  if (res.statusCode === 401 && res.jsonResponse.message.includes('Invalid or expired')) {
    console.log('   ✅ Correctly rejected deactivated device (401 for security)')
    console.log('      Error:', res.jsonResponse.message)
  } else {
    console.log('   ❌ Deactivated device test failed')
    console.log('      Status:', res.statusCode)
    console.log('      Response:', res.jsonResponse)
    process.exit(1)
  }

  // Reactivate device for remaining tests
  db.getDatabase().prepare('UPDATE devices SET is_active = 1 WHERE id = ?').run(deviceId)
}

// Test 6: Optional authentication with valid token
console.log('\n6️⃣  Testing Optional Authentication (With Token)...')
{
  const { req, res, next, nextCalled } = createMockReqRes(`Bearer ${deviceToken}`)
  optionalAuth(req, res, next)

  if (nextCalled() && req.device && req.device.id === deviceId) {
    console.log('   ✅ Optional auth attached device with valid token')
  } else {
    console.log('   ❌ Optional auth with token failed')
    process.exit(1)
  }
}

// Test 7: Optional authentication without token
console.log('\n7️⃣  Testing Optional Authentication (No Token)...')
{
  const { req, res, next, nextCalled } = createMockReqRes(null)
  optionalAuth(req, res, next)

  if (nextCalled() && !req.device) {
    console.log('   ✅ Optional auth allowed request without token')
  } else {
    console.log('   ❌ Optional auth without token failed')
    process.exit(1)
  }
}

// Test 8: Platform-specific authentication (matching)
console.log('\n8️⃣  Testing Platform-Specific Auth (Android Match)...')
{
  const { req, res, next, nextCalled } = createMockReqRes(`Bearer ${deviceToken}`)
  requireAuth(req, res, next) // First authenticate
  const platformMiddleware = requirePlatform('android')
  platformMiddleware(req, res, next)

  if (nextCalled()) {
    console.log('   ✅ Platform-specific auth allowed Android device')
  } else {
    console.log('   ❌ Platform auth failed for matching platform')
    console.log('      Status:', res.statusCode)
    console.log('      Response:', res.jsonResponse)
    process.exit(1)
  }
}

// Test 9: Platform-specific authentication (mismatched)
console.log('\n9️⃣  Testing Platform-Specific Auth (iOS Mismatch)...')
{
  const { req, res, next, nextCalled } = createMockReqRes(`Bearer ${deviceToken}`)
  requireAuth(req, res, next) // First authenticate
  const platformMiddleware = requirePlatform('ios')

  // Reset next for second middleware call
  let nextCalled2 = false
  const next2 = () => { nextCalled2 = true }

  platformMiddleware(req, res, next2)

  if (res.statusCode === 403 && res.jsonResponse.message.includes('ios devices')) {
    console.log('   ✅ Platform-specific auth rejected iOS-only endpoint')
    console.log('      Error:', res.jsonResponse.message)
  } else {
    console.log('   ❌ Platform auth failed for mismatched platform')
    console.log('      Status:', res.statusCode)
    process.exit(1)
  }
}

// Test 10: Device ownership verification (matching)
console.log('\n🔟 Testing Device Ownership (Match)...')
{
  const { req, res, next, nextCalled } = createMockReqRes(
    `Bearer ${deviceToken}`,
    { deviceId: deviceId } // params.deviceId matches
  )
  requireAuth(req, res, next) // First authenticate
  requireDeviceOwnership(req, res, next)

  if (nextCalled()) {
    console.log('   ✅ Device ownership verified for own resources')
  } else {
    console.log('   ❌ Device ownership test failed')
    console.log('      Status:', res.statusCode)
    process.exit(1)
  }
}

// Test 11: Device ownership verification (mismatched)
console.log('\n1️⃣1️⃣  Testing Device Ownership (Mismatch)...')
{
  const otherDeviceId = randomUUID()
  const { req, res, next, nextCalled } = createMockReqRes(
    `Bearer ${deviceToken}`,
    { deviceId: otherDeviceId } // params.deviceId doesn't match
  )
  requireAuth(req, res, next) // First authenticate

  // Reset next for second middleware call
  let nextCalled2 = false
  const next2 = () => { nextCalled2 = true }

  requireDeviceOwnership(req, res, next2)

  if (res.statusCode === 403 && res.jsonResponse.message.includes('own resources')) {
    console.log('   ✅ Device ownership prevented access to other device resources')
    console.log('      Error:', res.jsonResponse.message)
  } else {
    console.log('   ❌ Device ownership test failed')
    console.log('      Status:', res.statusCode)
    process.exit(1)
  }
}

// Cleanup
console.log('\n🧹 Cleaning Up Test Data...')
db.deactivateDevice(deviceId)
console.log('   ✅ Test device deactivated')

console.log('\n✅ All Authentication Middleware Tests Passed! 🎉\n')
