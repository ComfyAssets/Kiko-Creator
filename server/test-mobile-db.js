#!/usr/bin/env node

/**
 * Mobile API Database Test Script
 * Tests database schema and CRUD operations for mobile API tables
 */

import { randomUUID } from 'crypto'
import * as db from './db/index.js'

console.log('🧪 Testing Mobile API Database Setup\n')

// Test 1: Device Registration
console.log('1️⃣  Testing Device Registration...')
const deviceId = randomUUID()
const deviceToken = randomUUID() + randomUUID() // Long token
const device = db.registerDevice({
  id: deviceId,
  deviceName: 'Test Android Phone',
  platform: 'android',
  token: deviceToken,
  pushToken: 'fcm:test_token_12345'
})
console.log('   ✅ Device registered:', device.device_name)

// Test 2: Device Token Verification
console.log('\n2️⃣  Testing Device Token Verification...')
const verifiedDevice = db.verifyDeviceToken(deviceToken)
if (verifiedDevice && verifiedDevice.id === deviceId) {
  console.log('   ✅ Device token verified successfully')
} else {
  console.log('   ❌ Device token verification failed')
  process.exit(1)
}

// Test 3: Preset Creation
console.log('\n3️⃣  Testing Preset Creation...')
const presetId = randomUUID()
const preset = db.createPreset({
  id: presetId,
  deviceId: deviceId,
  name: 'Anime Portrait',
  settings: {
    model: 'animagine_xl',
    steps: 30,
    cfg_scale: 7.0,
    sampler: 'euler_a',
    loras: [
      { name: 'detail_enhancer', strength: 0.8 }
    ],
    prompt: 'anime girl, portrait, detailed',
    negative_prompt: 'lowres, bad quality'
  }
})
console.log('   ✅ Preset created:', preset.name)

// Test 4: Preset Retrieval
console.log('\n4️⃣  Testing Preset Retrieval...')
const presets = db.getPresets(deviceId)
if (presets.length === 1 && presets[0].id === presetId) {
  console.log('   ✅ Preset retrieved:', presets[0].name)
} else {
  console.log('   ❌ Preset retrieval failed')
  process.exit(1)
}

// Test 5: Preset Update
console.log('\n5️⃣  Testing Preset Update...')
const updatedPreset = db.updatePreset(presetId, {
  name: 'Anime Portrait v2',
  settings: {
    ...preset.settings,
    steps: 40
  }
})
if (updatedPreset && updatedPreset.name === 'Anime Portrait v2') {
  console.log('   ✅ Preset updated:', updatedPreset.name)
} else {
  console.log('   ❌ Preset update failed')
  process.exit(1)
}

// Test 6: Preset Delta Sync
console.log('\n6️⃣  Testing Preset Delta Sync...')
const now = Date.now()
await new Promise(resolve => setTimeout(resolve, 10)) // Small delay
const secondPresetId = randomUUID()
db.createPreset({
  id: secondPresetId,
  deviceId: deviceId,
  name: 'Landscape Scene',
  settings: { model: 'sdxl', steps: 25 }
})
const modifiedPresets = db.getPresetsModifiedSince(deviceId, now)
if (modifiedPresets.length === 1 && modifiedPresets[0].id === secondPresetId) {
  console.log('   ✅ Delta sync working:', modifiedPresets.length, 'preset(s) modified')
} else {
  console.log('   ❌ Delta sync failed')
  process.exit(1)
}

// Test 7: Image Creation
console.log('\n7️⃣  Testing Image Creation...')
const imageId = randomUUID()
const image = db.createImage({
  id: imageId,
  deviceId: deviceId,
  presetId: presetId,
  filename: 'anime_portrait_001.png',
  filepath: '/data/outputs/anime_portrait_001.png',
  width: 1024,
  height: 1024,
  filesize: 2048000,
  prompt: 'anime girl, portrait, detailed, masterpiece',
  negativePrompt: 'lowres, bad quality',
  settings: preset.settings
})
console.log('   ✅ Image created:', image.filename)

// Test 8: Image Retrieval
console.log('\n8️⃣  Testing Image Retrieval...')
const images = db.getImages(deviceId, { limit: 10 })
if (images.length === 1 && images[0].id === imageId) {
  console.log('   ✅ Image retrieved:', images[0].filename)
} else {
  console.log('   ❌ Image retrieval failed')
  process.exit(1)
}

// Test 9: Generation Job Creation
console.log('\n9️⃣  Testing Generation Job Creation...')
const jobId = randomUUID()
const job = db.createGenerationJob({
  id: jobId,
  deviceId: deviceId,
  presetId: presetId,
  prompt: 'test generation prompt',
  settings: preset.settings
})
if (job && job.status === 'queued') {
  console.log('   ✅ Generation job created:', job.status)
} else {
  console.log('   ❌ Generation job creation failed')
  process.exit(1)
}

// Test 10: Generation Job Update
console.log('\n🔟 Testing Generation Job Update...')
const updatedJob = db.updateGenerationJob(jobId, {
  status: 'executing',
  progress: 50
})
if (updatedJob && updatedJob.status === 'executing' && updatedJob.progress === 50) {
  console.log('   ✅ Generation job updated:', updatedJob.status, `(${updatedJob.progress}%)`)
} else {
  console.log('   ❌ Generation job update failed')
  process.exit(1)
}

// Test 11: Generation Job Completion
console.log('\n1️⃣1️⃣  Testing Generation Job Completion...')
const completedJob = db.updateGenerationJob(jobId, {
  status: 'completed',
  progress: 100,
  resultImageId: imageId
})
if (completedJob && completedJob.status === 'completed' && completedJob.result_image_id === imageId) {
  console.log('   ✅ Generation job completed:', completedJob.status)
} else {
  console.log('   ❌ Generation job completion failed')
  process.exit(1)
}

// Test 12: Soft Delete Operations
console.log('\n1️⃣2️⃣  Testing Soft Delete Operations...')
const deleteSuccess = db.deletePreset(secondPresetId)
const allPresets = db.getPresets(deviceId, false) // Exclude deleted
const allPresetsWithDeleted = db.getPresets(deviceId, true) // Include deleted
if (deleteSuccess && allPresets.length === 1 && allPresetsWithDeleted.length === 2) {
  console.log('   ✅ Soft delete working: 1 active, 1 deleted')
} else {
  console.log('   ❌ Soft delete failed')
  process.exit(1)
}

// Test 13: Database Statistics
console.log('\n1️⃣3️⃣  Testing Database Statistics...')
const stats = db.getDatabaseStats()
console.log('   📊 Database Size:', stats.databaseSize)
console.log('   📊 Total Models:', stats.totalModels)
console.log('   📊 Total Scans:', stats.totalScans)
console.log('   ✅ Statistics retrieved successfully')

// Cleanup
console.log('\n🧹 Cleaning Up Test Data...')
db.deactivateDevice(deviceId)
console.log('   ✅ Test device deactivated')

console.log('\n✅ All Mobile API Database Tests Passed! 🎉\n')
