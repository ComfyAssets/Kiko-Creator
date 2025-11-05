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
          primary: '#00b4d8',      // Cyan - main accent (replaces purple)
          secondary: '#0096c7',    // Sky Blue - secondary accent
          success: '#10b981',      // Keep green for success
          error: '#ef4444',        // Keep red for error
          warning: '#f59e0b'       // Keep amber for warning
        },
        text: {
          primary: '#f5f5f5',
          secondary: '#a3a3a3',
          tertiary: '#737373'
        },
        border: {
          primary: '#262626',
          secondary: '#404040'
        },
        // Custom navy-to-cyan gradient palette
        ocean: {
          50: '#caf0f8',    // Very Light Blue - lightest
          100: '#ade8f4',   // Baby Blue
          200: '#90e0ef',   // Pale Blue
          300: '#48cae4',   // Light Aqua - hover states
          400: '#00b4d8',   // Cyan - main accent
          500: '#0096c7',   // Sky Blue - primary
          600: '#0077b6',   // Ocean Blue - deeper
          700: '#023e8a',   // Royal Blue - deep accent
          800: '#03045e',   // Deep Navy - darkest
          900: '#020338'    // Extra dark navy
        }
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0, 180, 216, 0.3)',
        'glow-ocean': '0 0 20px rgba(0, 150, 199, 0.3)',
        'glow-aqua': '0 0 20px rgba(72, 202, 228, 0.3)',
        'glow-blue': '0 0 40px 8px rgba(0, 150, 199, 0.3), 0 0 80px 16px rgba(0, 150, 199, 0.15)',
        'glow-green': '0 0 40px 8px rgba(16, 185, 129, 0.3), 0 0 80px 16px rgba(16, 185, 129, 0.15)',
        'glow-red': '0 0 40px 8px rgba(239, 68, 68, 0.3), 0 0 80px 16px rgba(239, 68, 68, 0.15)'
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