#!/usr/bin/env node

// Quick test script to verify YAML parsing
import { parseYAMLFile } from './services/setup.js'

const yamlPath = process.argv[2] || '/home/vito/ai-apps/ComfyUI/extra_model_paths.yaml'

console.log('🔍 Testing YAML Parser...\n')
console.log(`📄 File: ${yamlPath}\n`)

try {
  const result = await parseYAMLFile(yamlPath)

  console.log('✅ Parsed successfully!\n')
  console.log('📦 Checkpoints:')
  result.checkpoints.forEach((p, i) => console.log(`  ${i + 1}. ${p}`))

  console.log('\n🎨 LoRAs:')
  result.loras.forEach((p, i) => console.log(`  ${i + 1}. ${p}`))

  console.log('\n📝 Embeddings:')
  result.embeddings.forEach((p, i) => console.log(`  ${i + 1}. ${p}`))

} catch (error) {
  console.error('❌ Error:', error.message)
  process.exit(1)
}
