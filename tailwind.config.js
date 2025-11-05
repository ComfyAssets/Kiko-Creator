/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Dark theme colors
        bg: {
          primary: '#0a0a0a',
          secondary: '#141414',
          tertiary: '#1e1e1e',
          hover: '#252525'
        },
        accent: {
          primary: '#8b5cf6',
          secondary: '#06b6d4',
          success: '#10b981',
          error: '#ef4444',
          warning: '#f59e0b'
        },
        text: {
          primary: '#f5f5f5',
          secondary: '#a3a3a3',
          tertiary: '#737373'
        },
        border: {
          primary: '#262626',
          secondary: '#404040'
        }
      },
      boxShadow: {
        'glow-purple': '0 0 20px rgba(139, 92, 246, 0.3)',
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.3)'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      backdropBlur: {
        xs: '2px'
      }
    },
  },
  plugins: [],
}
