import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSettingsStore } from '../../stores/settingsStore'
import { testComfyUIConnection } from '../../services/api'

export default function ConnectionStep({ onNext }) {
  const { comfyui, setComfyUIConnection } = useSettingsStore()
  const [apiUrl, setApiUrl] = useState(comfyui.apiUrl)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleTest = async () => {
    setTesting(true)
    setError(null)
    setSuccess(false)

    try {
      const result = await testComfyUIConnection(apiUrl)

      if (result.success) {
        setSuccess(true)
        setComfyUIConnection({
          apiUrl,
          connected: true,
          version: result.version,
          hasMira: result.hasMira
        })
      } else {
        setError(result.error || 'Connection failed')
      }
    } catch (err) {
      setError(err.message || 'Failed to connect to ComfyUI')
    } finally {
      setTesting(false)
    }
  }

  const handleNext = () => {
    if (success && comfyui.connected) {
      onNext()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">
          Connect to ComfyUI
        </h2>
        <p className="text-text-secondary">
          Enter your ComfyUI API endpoint to get started
        </p>
      </div>

      <div className="space-y-4">
        {/* API URL Input */}
        <div>
          <label
            htmlFor="apiUrl"
            className="block text-sm font-medium text-text-secondary mb-2"
          >
            ComfyUI API URL
          </label>
          <input
            id="apiUrl"
            type="text"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="http://127.0.0.1:8188"
            className="
              w-full px-4 py-3 rounded-lg
              bg-bg-tertiary text-text-primary
              border border-border-primary
              focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20
              transition-all duration-200
              outline-none
            "
            disabled={testing}
          />
        </div>

        {/* Test Button */}
        <motion.button
          onClick={handleTest}
          disabled={testing || !apiUrl}
          className={`
            w-full px-6 py-3 rounded-lg font-medium
            transition-all duration-300
            ${
              testing || !apiUrl
                ? 'bg-bg-tertiary text-text-tertiary cursor-not-allowed'
                : 'bg-accent-primary text-white hover:bg-accent-primary/90 glow-hover-purple'
            }
          `}
          whileHover={{ scale: testing ? 1 : 1.02 }}
          whileTap={{ scale: testing ? 1 : 0.98 }}
        >
          {testing ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Testing Connection...</span>
            </div>
          ) : (
            'Test Connection'
          )}
        </motion.button>

        {/* Status Messages */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-lg bg-accent-error/10 border border-accent-error/30"
          >
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-accent-error flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-accent-error">
                  Connection Failed
                </p>
                <p className="text-sm text-text-secondary mt-1">{error}</p>
              </div>
            </div>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-lg bg-accent-success/10 border border-accent-success/30"
          >
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-accent-success flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-accent-success">
                  Connection Successful
                </p>
                <p className="text-sm text-text-secondary mt-1">
                  ComfyUI version: {comfyui.version}
                </p>
                {comfyui.hasMira && (
                  <p className="text-sm text-text-secondary">
                    ✓ ComfyUI_Mira extension detected
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Next Button */}
      <div className="flex justify-end pt-4">
        <motion.button
          onClick={handleNext}
          disabled={!success}
          className={`
            px-8 py-3 rounded-lg font-medium
            transition-all duration-300
            ${
              !success
                ? 'bg-bg-tertiary text-text-tertiary cursor-not-allowed'
                : 'bg-accent-primary text-white hover:bg-accent-primary/90 glow-hover-purple'
            }
          `}
          whileHover={{ scale: success ? 1.05 : 1 }}
          whileTap={{ scale: success ? 0.95 : 1 }}
        >
          Continue to Model Paths →
        </motion.button>
      </div>
    </div>
  )
}
