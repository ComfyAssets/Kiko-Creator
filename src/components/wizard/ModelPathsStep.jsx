import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSettingsStore } from '../../stores/settingsStore'

export default function ModelPathsStep({ onNext, onBack }) {
  const { comfyui, setComfyUIConnection } = useSettingsStore()
  const [modelsPath, setModelsPath] = useState(comfyui.modelsPath || '')
  const [comfyuiDir, setComfyuiDir] = useState(comfyui.comfyuiDir || '')

  const handleNext = () => {
    // Save paths to comfyui object (even if empty - user can skip)
    setComfyUIConnection({
      modelsPath: modelsPath.trim(),
      comfyuiDir: comfyuiDir.trim()
    })
    onNext()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">
          Model Paths (Optional)
        </h2>
        <p className="text-text-secondary">
          Configure paths to enable enhanced metadata and CivitAI integration
        </p>
      </div>

      <div className="space-y-6">
        {/* ComfyUI Models Path */}
        <div className="p-4 rounded-lg bg-bg-secondary border border-border-primary">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-accent-primary/20 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-6 h-6 text-accent-primary"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-text-primary mb-1">
                ComfyUI Models Directory
              </h3>
              <p className="text-sm text-text-secondary mb-3">
                Path to your ComfyUI models folder (e.g., <span className="font-mono text-text-tertiary">/path/to/ComfyUI/models</span>)
              </p>
              <input
                type="text"
                value={modelsPath}
                onChange={(e) => setModelsPath(e.target.value)}
                placeholder="/home/user/ComfyUI/models"
                className="
                  w-full px-4 py-3 rounded-lg font-mono text-sm
                  bg-bg-tertiary text-text-primary
                  border border-border-primary
                  focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20
                  transition-all duration-200
                  outline-none
                "
              />
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-text-secondary">
                  This enables:
                </p>
                <ul className="text-xs text-text-tertiary space-y-1 pl-4">
                  <li className="flex items-start gap-2">
                    <span className="text-accent-primary mt-0.5">🌐</span>
                    <span>CivitAI globe links via LoRA Manager metadata</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent-secondary mt-0.5">✨</span>
                    <span>Trigger words and descriptions from safetensors</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent-success mt-0.5">📋</span>
                    <span>Base model info and version details</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* ComfyUI Directory */}
        <div className="p-4 rounded-lg bg-bg-secondary border border-border-primary">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-accent-secondary/20 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-6 h-6 text-accent-secondary"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1H8a3 3 0 00-3 3v1.5a1.5 1.5 0 01-3 0V6z" clipRule="evenodd" />
                <path d="M6 12a2 2 0 012-2h8a2 2 0 012 2v2a2 2 0 01-2 2H2h2a2 2 0 002-2v-2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-text-primary mb-1">
                ComfyUI Installation Directory
              </h3>
              <p className="text-sm text-text-secondary mb-3">
                Path to your ComfyUI installation root (e.g., <span className="font-mono text-text-tertiary">/path/to/ComfyUI</span>)
              </p>
              <input
                type="text"
                value={comfyuiDir}
                onChange={(e) => setComfyuiDir(e.target.value)}
                placeholder="/home/user/ComfyUI"
                className="
                  w-full px-4 py-3 rounded-lg font-mono text-sm
                  bg-bg-tertiary text-text-primary
                  border border-border-primary
                  focus:border-accent-secondary focus:ring-2 focus:ring-accent-secondary/20
                  transition-all duration-200
                  outline-none
                "
              />
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-text-secondary">
                  This enables:
                </p>
                <ul className="text-xs text-text-tertiary space-y-1 pl-4">
                  <li className="flex items-start gap-2">
                    <span className="text-accent-primary mt-0.5">📂</span>
                    <span>Parse <span className="font-mono">extra_model_paths.yaml</span> for additional model directories</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent-secondary mt-0.5">🔍</span>
                    <span>Discover models across all configured paths</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent-success mt-0.5">📊</span>
                    <span>Complete embeddings list with recursive scanning</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* LoRA Manager Info Box */}
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
              <p className="font-medium text-text-primary mb-1">💡 Tip: Install ComfyUI-LoRA-Manager</p>
              <p className="mb-2">
                For CivitAI metadata (model IDs, version info), install{' '}
                <a
                  href="https://github.com/civitai/comfyui-lora-manager"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-secondary hover:text-accent-secondary/80 transition-colors underline"
                >
                  ComfyUI-LoRA-Manager
                </a>
                . When you download models via LoRA Manager, it creates <span className="font-mono">.metadata.json</span> files that Kiko Creator reads for 🌐 globe links.
              </p>
              <p className="text-xs text-text-tertiary">
                You can skip this step and add paths later in Settings.
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
          Continue to API Keys →
        </motion.button>
      </div>
    </div>
  )
}
