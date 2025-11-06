import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.VITE_API_URL || 'http://localhost:3001'

  // CSP Plugin to inject Content Security Policy dynamically
  function cspPlugin() {
    return {
      name: 'html-transform',
      transformIndexHtml(html) {
        const url = new URL(apiUrl)
        const apiOrigin = url.origin

        // WebSocket URLs for HMR (dev mode only, but included in CSP for safety)
        // In production build, these won't be used but CSP needs to allow them
        const wsUrl = `ws://${url.hostname}:*`
        const localhostWs = 'ws://localhost:*'

        // ComfyUI URL - support both env variable and default
        const comfyUrl = env.VITE_COMFYUI_URL || 'http://127.0.0.1:8188'

        // Parse ComfyUI URL to get websocket version
        let comfyWsUrl = ''
        try {
          const comfyUrlObj = new URL(comfyUrl)
          // Convert http/https to ws/wss
          const wsProtocol = comfyUrlObj.protocol === 'https:' ? 'wss:' : 'ws:'
          comfyWsUrl = `${wsProtocol}//${comfyUrlObj.host}`
        } catch (e) {
          console.warn('Invalid ComfyUI URL, using default')
        }

        // Build CSP directives - allow both http and ws versions of ComfyUI
        const csp = [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          `connect-src 'self' ${apiOrigin} ${wsUrl} ${localhostWs} ${comfyUrl} ${comfyWsUrl} http://127.0.0.1:8188 ws://127.0.0.1:8188`,
          `img-src 'self' data: ${apiOrigin} ${comfyUrl} http://127.0.0.1:8188 https://image.civitai.com`
        ].join('; ')

        return html.replace(
          '<!-- CSP will be set by Vite plugin based on environment variables -->',
          `<meta http-equiv="Content-Security-Policy" content="${csp}" />`
        )
      }
    }
  }

  return {
    plugins: [react(), cspPlugin()],
    server: {
      port: 5173,
      host: true, // Listen on all network interfaces (0.0.0.0)
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3001',
          changeOrigin: true,
          secure: false
        }
      }
    },
    preview: {
      port: 5173, // Use same port as dev to preserve localStorage (presets, etc.)
      host: true, // Listen on all network interfaces (0.0.0.0)
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3001',
          changeOrigin: true,
          secure: false
        }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: true
    }
  }
})
