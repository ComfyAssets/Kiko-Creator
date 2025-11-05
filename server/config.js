import dotenv from 'dotenv'

dotenv.config()

export default {
  port: process.env.PORT || 3000,
  comfyuiApiUrl: process.env.COMFYUI_API_URL || 'http://127.0.0.1:8188',
  // ComfyUI models directory (for reading safetensors metadata)
  // If not set, metadata features will be limited to API-only data
  comfyuiModelsPath: process.env.COMFYUI_MODELS_PATH || null,
  // ComfyUI installation directory (for parsing extra_model_paths.yaml)
  comfyuiDir: process.env.COMFYUI_DIR || null,
  nodeEnv: process.env.NODE_ENV || 'development',
  dataDir: './data',
  settingsFile: './data/settings.json'
}
