// SDXL and additional resolutions from KikoTools
export const RESOLUTION_PRESETS = [
  // SDXL Square
  { label: '1024×1024 - 1:1 (SDXL)', width: 1024, height: 1024, category: 'SDXL Square' },

  // SDXL Landscape
  { label: '1152×896 - 9:7 (SDXL)', width: 1152, height: 896, category: 'SDXL Landscape' },
  { label: '1216×832 - 19:13 (SDXL)', width: 1216, height: 832, category: 'SDXL Landscape' },
  { label: '1344×768 - 7:4 (SDXL Wide)', width: 1344, height: 768, category: 'SDXL Landscape' },
  { label: '1536×640 - 12:5 (SDXL Ultra-Wide)', width: 1536, height: 640, category: 'SDXL Landscape' },
  { label: '1024×960 - 16:15 (SDXL)', width: 1024, height: 960, category: 'SDXL Landscape' },
  { label: '1728×576 - 3:1 (SDXL Panoramic)', width: 1728, height: 576, category: 'SDXL Landscape' },

  // SDXL Portrait
  { label: '896×1152 - 7:9 (SDXL)', width: 896, height: 1152, category: 'SDXL Portrait' },
  { label: '832×1216 - 13:19 (SDXL)', width: 832, height: 1216, category: 'SDXL Portrait' },
  { label: '768×1344 - 4:7 (SDXL Tall)', width: 768, height: 1344, category: 'SDXL Portrait' },
  { label: '640×1536 - 5:12 (SDXL Ultra-Tall)', width: 640, height: 1536, category: 'SDXL Portrait' },
  { label: '960×1024 - 15:16 (SDXL)', width: 960, height: 1024, category: 'SDXL Portrait' },
  { label: '704×1408 - 1:2 (SDXL)', width: 704, height: 1408, category: 'SDXL Portrait' },

  // 16:9 Widescreen HD
  { label: '1280×720 - 16:9 (HD)', width: 1280, height: 720, category: 'HD Widescreen' },
  { label: '1600×900 - 16:9 (HD+)', width: 1600, height: 900, category: 'HD Widescreen' },
  { label: '1920×1088 - 16:9 (Full HD)', width: 1920, height: 1088, category: 'HD Widescreen' },

  // Legacy SD resolutions
  { label: '512×512 - 1:1 (SD)', width: 512, height: 512, category: 'SD' },
  { label: '768×768 - 1:1 (SD)', width: 768, height: 768, category: 'SD' },
  { label: '512×768 - 2:3 (SD Portrait)', width: 512, height: 768, category: 'SD' },
  { label: '768×512 - 3:2 (SD Landscape)', width: 768, height: 512, category: 'SD' }
]

// Group resolutions by category for organized display
export const RESOLUTIONS_BY_CATEGORY = RESOLUTION_PRESETS.reduce((acc, preset) => {
  if (!acc[preset.category]) {
    acc[preset.category] = []
  }
  acc[preset.category].push(preset)
  return acc
}, {})
