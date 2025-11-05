import dotenv from 'dotenv'

dotenv.config()

export default {
  port: process.env.PORT || 3000,
  comfyuiApiUrl: process.env.COMFYUI_API_URL || 'http://127.0.0.1:8188',
  nodeEnv: process.env.NODE_ENV || 'development',
  dataDir: './data',
  settingsFile: './data/settings.json'
}
