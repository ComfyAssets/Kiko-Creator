import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSettingsStore } from '../../stores/settingsStore'

export default function CivitAIStep({ onNext, onBack }) {
  const { civitai, setCivitAI } = useSettingsStore()
  const [civitaiKey, setCivitaiKey] = useState(civitai.apiKey || '')
  const [huggingfaceToken, setHuggingfaceToken] = useState(civitai.huggingfaceToken || '')
  const [enableMetadata, setEnableMetadata] = useState(true)

  const handleNext = () => {
    // Save API keys (even if empty - user can skip)
    setCivitAI({
      apiKey: civitaiKey.trim(),
      huggingfaceToken: huggingfaceToken.trim(),
      enabled: enableMetadata && (civitaiKey.trim().length > 0 || huggingfaceToken.trim().length > 0)
    })
    onNext()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">
          API Keys (Optional)
        </h2>
        <p className="text-text-secondary">
          Connect to CivitAI and HuggingFace to enrich model metadata with thumbnails, tags, and descriptions
        </p>
      </div>

      <div className="space-y-6">
        {/* CivitAI API Key */}
        <div className="p-4 rounded-lg bg-bg-secondary border border-border-primary">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-accent-primary/20 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-6 h-6 text-accent-primary"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L11 4.323V3a1 1 0 011-1h-2zM5.5 8A1.5 1.5 0 004 9.5v.5a1 1 0 01-1 1H2a1 1 0 00-1 1v3a1 1 0 001 1h1a1 1 0 011-1v.5A1.5 1.5 0 005.5 17h3A1.5 1.5 0 0010 15.5V14a1 1 0 011-1h1a1 1 0 001-1v-3a1 1 0 00-1-1h-1a1 1 0 01-1-1v-.5A1.5 1.5 0 008.5 5h-3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-text-primary mb-1">
                CivitAI API Key
              </h3>
              <p className="text-sm text-text-secondary mb-3">
                Get model thumbnails, trigger words, and ratings from CivitAI
              </p>
              <input
                type="text"
                value={civitaiKey}
                onChange={(e) => setCivitaiKey(e.target.value)}
                placeholder="Enter your CivitAI API key (optional)"
                className="
                  w-full px-4 py-3 rounded-lg font-mono text-sm
                  bg-bg-tertiary text-text-primary
                  border border-border-primary
                  focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20
                  transition-all duration-200
                  outline-none
                "
              />
              <div className="mt-2 flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-text-tertiary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <a
                  href="https://civitai.com/user/account"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-accent-secondary hover:text-accent-secondary/80 transition-colors"
                >
                  Get your API key from CivitAI →
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* HuggingFace Token */}
        <div className="p-4 rounded-lg bg-bg-secondary border border-border-primary">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-accent-secondary/20 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-6 h-6 text-accent-secondary"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-text-primary mb-1">
                HuggingFace Token
              </h3>
              <p className="text-sm text-text-secondary mb-3">
                Access models and metadata from HuggingFace Hub
              </p>
              <input
                type="text"
                value={huggingfaceToken}
                onChange={(e) => setHuggingfaceToken(e.target.value)}
                placeholder="Enter your HuggingFace token (optional)"
                className="
                  w-full px-4 py-3 rounded-lg font-mono text-sm
                  bg-bg-tertiary text-text-primary
                  border border-border-primary
                  focus:border-accent-secondary focus:ring-2 focus:ring-accent-secondary/20
                  transition-all duration-200
                  outline-none
                "
              />
              <div className="mt-2 flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-text-tertiary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <a
                  href="https://huggingface.co/settings/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-accent-secondary hover:text-accent-secondary/80 transition-colors"
                >
                  Get your token from HuggingFace →
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Enable Metadata Toggle */}
        <div className="p-4 rounded-lg bg-bg-tertiary border border-border-primary">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enableMetadata}
              onChange={(e) => setEnableMetadata(e.target.checked)}
              className="w-5 h-5 rounded border-border-primary bg-bg-secondary text-accent-primary focus:ring-2 focus:ring-accent-primary/20"
            />
            <div className="flex-1">
              <div className="text-sm font-medium text-text-primary">
                Enable Metadata Enrichment
              </div>
              <div className="text-xs text-text-secondary mt-1">
                Automatically fetch model information during discovery (requires API keys)
              </div>
            </div>
          </label>
        </div>

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-accent-primary/10 border border-accent-primary/30"
        >
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-accent-primary flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div className="text-sm text-text-secondary">
              <p className="font-medium text-text-primary mb-1">Optional but Recommended</p>
              <p>
                API keys enable rich model metadata like thumbnails, descriptions, and trigger words.
                You can skip this step and add keys later in settings.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4">
        <motion.button
          onClick={onBack}
          className="px-8 py-3 rounded-lg font-medium bg-bg-tertiary text-text-primary hover:bg-bg-hover transition-all duration-300"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          ← Back
        </motion.button>

        <motion.button
          onClick={handleNext}
          className="px-8 py-3 rounded-lg font-medium bg-accent-primary text-white hover:bg-accent-primary/90 glow-hover-purple transition-all duration-300"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Continue to Discovery →
        </motion.button>
      </div>
    </div>
  )
}
