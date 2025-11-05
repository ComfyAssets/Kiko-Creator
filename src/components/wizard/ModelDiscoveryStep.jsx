import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSettingsStore } from '../../stores/settingsStore'
import { discoverModels, parseYAML } from '../../services/api'

// Helper component to display models grouped by folder
function ModelTypeSection({ title, models, icon, color }) {
  const [expanded, setExpanded] = useState(false)

  // Group models by folder
  const modelsByFolder = models.reduce((acc, model) => {
    const folder = model.folder || '(root)'
    if (!acc[folder]) acc[folder] = []
    acc[folder].push(model)
    return acc
  }, {})

  const folders = Object.keys(modelsByFolder).sort()
  const previewModels = models.slice(0, 3)

  return (
    <div className="rounded-lg bg-bg-secondary border border-border-primary overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-bg-tertiary transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className={`text-sm font-semibold text-${color}`}>
            {title}
          </span>
          <span className="text-xs text-text-tertiary">
            ({models.length} models, {folders.length} folders)
          </span>
        </div>
        <svg
          className={`w-5 h-5 text-text-secondary transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
          {folders.map((folder) => (
            <div key={folder} className="space-y-1">
              {/* Folder Header */}
              <div className="flex items-center gap-2 text-xs font-medium text-text-secondary px-2 py-1 bg-bg-tertiary rounded">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
                <span>{folder}</span>
                <span className="text-text-tertiary">({modelsByFolder[folder].length})</span>
              </div>

              {/* Models in Folder */}
              <div className="space-y-1 pl-4">
                {modelsByFolder[folder].map((model, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded bg-bg-tertiary hover:bg-bg-hover transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {/* Thumbnail if available */}
                      {model.metadata?.images?.[0]?.url && (
                        <img
                          src={model.metadata.images[0].url}
                          alt={model.metadata.modelName || model.name}
                          className="w-16 h-16 object-cover rounded border border-border-primary"
                        />
                      )}

                      {/* Model Info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-text-primary truncate">
                          {model.metadata?.modelName || model.name}
                        </div>
                        <div className="text-xs text-text-secondary truncate font-mono">
                          {model.name}
                        </div>

                        {/* CivitAI Metadata */}
                        {model.metadata && (
                          <div className="mt-1 space-y-1">
                            {model.metadata.trainedWords?.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {model.metadata.trainedWords.slice(0, 3).map((word, i) => (
                                  <span
                                    key={i}
                                    className="text-xs px-2 py-0.5 rounded-full bg-accent-primary/20 text-accent-primary"
                                  >
                                    {word}
                                  </span>
                                ))}
                                {model.metadata.trainedWords.length > 3 && (
                                  <span className="text-xs text-text-tertiary">
                                    +{model.metadata.trainedWords.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}
                            {model.metadata.stats && (
                              <div className="flex items-center gap-2 text-xs text-text-tertiary">
                                <span>⭐ {model.metadata.stats.rating?.toFixed(1) || 'N/A'}</span>
                                <span>•</span>
                                <span>⬇️ {model.metadata.stats.downloadCount?.toLocaleString() || 0}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* File Size */}
                        <div className="text-xs text-text-tertiary mt-1">
                          {model.sizeFormatted}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Collapsed Preview */}
      {!expanded && previewModels.length > 0 && (
        <div className="p-2 space-y-1">
          {previewModels.map((model, idx) => (
            <div key={idx} className="text-xs text-text-tertiary font-mono truncate px-2">
              {model.folder && <span className="text-text-secondary">{model.folder}/</span>}
              {model.name}
            </div>
          ))}
          {models.length > 3 && (
            <div className="text-xs text-text-tertiary px-2">
              ... and {models.length - 3} more
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ModelDiscoveryStep({ onNext, onBack }) {
  const { comfyui, civitai, setModels, setModelPaths } = useSettingsStore()
  const [yamlPath, setYamlPath] = useState('/home/vito/ai-apps/ComfyUI/extra_model_paths.yaml')
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState(null)
  const [discoveredModels, setDiscoveredModels] = useState(null)
  const [scanProgress, setScanProgress] = useState({
    phase: 'idle',
    message: '',
    progress: 0,
    current: 0,
    total: 0
  })

  const handleScan = async () => {
    setScanning(true)
    setError(null)
    setScanProgress({ phase: 'connecting', message: 'Connecting to server...', progress: 0, current: 0, total: 0 })

    // Connect to SSE for live progress updates
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    const eventSource = new EventSource(`${apiUrl}/api/progress/scan-progress`)

    eventSource.onmessage = (event) => {
      try {
        const progress = JSON.parse(event.data)
        setScanProgress(progress)

        // If scan completed, close connection
        if (progress.phase === 'completed' || progress.phase === 'error') {
          eventSource.close()
        }
      } catch (err) {
        console.error('Failed to parse progress:', err)
      }
    }

    eventSource.onerror = (err) => {
      console.error('SSE error:', err)
      eventSource.close()
    }

    try {
      // Parse YAML first
      const paths = await parseYAML(yamlPath)
      setModelPaths(paths)

      // Discover models with enhanced metadata (no timeout - rely on SSE for progress)
      const models = await discoverModels(comfyui.apiUrl, yamlPath, {
        civitaiKey: civitai.apiKey || null,
        calculateHashes: true,
        fetchMetadata: civitai.enabled && civitai.apiKey
      })

      setDiscoveredModels(models)
      setModels(models)
    } catch (err) {
      setError(err.message || 'Failed to discover models')
      eventSource.close()
    } finally {
      setScanning(false)
    }
  }

  const handleNext = () => {
    if (discoveredModels) {
      onNext()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">
          Discover Models
        </h2>
        <p className="text-text-secondary">
          Scan your ComfyUI installation for available models and LoRAs
        </p>
      </div>

      <div className="space-y-4">
        {/* YAML Path Input */}
        <div>
          <label
            htmlFor="yamlPath"
            className="block text-sm font-medium text-text-secondary mb-2"
          >
            extra_model_paths.yaml Location
          </label>
          <input
            id="yamlPath"
            type="text"
            value={yamlPath}
            onChange={(e) => setYamlPath(e.target.value)}
            placeholder="/path/to/ComfyUI/extra_model_paths.yaml"
            className="
              w-full px-4 py-3 rounded-lg font-mono text-sm
              bg-bg-tertiary text-text-primary
              border border-border-primary
              focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20
              transition-all duration-200
              outline-none
            "
            disabled={scanning}
          />
        </div>

        {/* Scan Button */}
        <motion.button
          onClick={handleScan}
          disabled={scanning || !yamlPath}
          className={`
            w-full px-6 py-3 rounded-lg font-medium
            transition-all duration-300
            ${
              scanning || !yamlPath
                ? 'bg-bg-tertiary text-text-tertiary cursor-not-allowed'
                : 'bg-accent-secondary text-white hover:bg-accent-secondary/90 glow-hover-cyan'
            }
          `}
          whileHover={{ scale: scanning ? 1 : 1.02 }}
          whileTap={{ scale: scanning ? 1 : 0.98 }}
        >
          {!scanning ? (
            'Scan for Models'
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 w-full">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Scanning...</span>
              </div>
            </div>
          )}
        </motion.button>

        {/* Live Progress Display */}
        {scanning && scanProgress.phase !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-lg bg-bg-secondary border border-border-primary"
          >
            {/* Progress Bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-text-secondary font-medium">
                  {scanProgress.phase === 'scanning_checkpoints' && '📦 Checkpoints'}
                  {scanProgress.phase === 'scanning_loras' && '🎨 LoRAs'}
                  {scanProgress.phase === 'scanning_embeddings' && '📝 Embeddings'}
                  {scanProgress.phase === 'parsing' && '⚙️ Initializing'}
                  {!['scanning_checkpoints', 'scanning_loras', 'scanning_embeddings', 'parsing'].includes(scanProgress.phase) && '🔍 Scanning'}
                </span>
                {scanProgress.total > 0 && (
                  <span className="text-text-tertiary text-xs">
                    {scanProgress.current} / {scanProgress.total}
                  </span>
                )}
              </div>
              <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-accent-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${scanProgress.progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Current Operation */}
            <div className="text-xs text-text-secondary font-mono truncate">
              {scanProgress.message}
            </div>
          </motion.div>
        )}

        {/* Error Message */}
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
                <p className="text-sm font-medium text-accent-error">Scan Failed</p>
                <p className="text-sm text-text-secondary mt-1">{error}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Discovery Results */}
        {discoveredModels && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-semibold text-text-primary">
              Discovery Results
            </h3>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              {/* Checkpoints */}
              <div className="p-4 rounded-lg bg-bg-tertiary border border-border-primary">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-accent-primary" />
                  <span className="text-sm font-medium text-text-secondary">
                    Checkpoints
                  </span>
                </div>
                <div className="text-3xl font-bold text-accent-primary">
                  {discoveredModels.checkpoints?.length || 0}
                </div>
              </div>

              {/* LoRAs */}
              <div className="p-4 rounded-lg bg-bg-tertiary border border-border-primary">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-accent-secondary" />
                  <span className="text-sm font-medium text-text-secondary">
                    LoRAs
                  </span>
                </div>
                <div className="text-3xl font-bold text-accent-secondary">
                  {discoveredModels.loras?.length || 0}
                </div>
              </div>

              {/* Embeddings */}
              <div className="p-4 rounded-lg bg-bg-tertiary border border-border-primary">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-accent-success" />
                  <span className="text-sm font-medium text-text-secondary">
                    Embeddings
                  </span>
                </div>
                <div className="text-3xl font-bold text-accent-success">
                  {discoveredModels.embeddings?.length || 0}
                </div>
              </div>
            </div>

            {/* Enhanced Model List with Folders and Metadata */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-text-secondary">
                Model Details (organized by folder)
              </p>

              {/* Checkpoints Section */}
              {discoveredModels.checkpoints?.length > 0 && (
                <ModelTypeSection
                  title="Checkpoints"
                  models={discoveredModels.checkpoints}
                  icon="📦"
                  color="accent-primary"
                />
              )}

              {/* LoRAs Section */}
              {discoveredModels.loras?.length > 0 && (
                <ModelTypeSection
                  title="LoRAs"
                  models={discoveredModels.loras}
                  icon="🎨"
                  color="accent-secondary"
                />
              )}

              {/* Embeddings Section */}
              {discoveredModels.embeddings?.length > 0 && (
                <ModelTypeSection
                  title="Embeddings"
                  models={discoveredModels.embeddings}
                  icon="📝"
                  color="accent-success"
                />
              )}
            </div>
          </motion.div>
        )}
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
          disabled={!discoveredModels}
          className={`
            px-8 py-3 rounded-lg font-medium
            transition-all duration-300
            ${
              !discoveredModels
                ? 'bg-bg-tertiary text-text-tertiary cursor-not-allowed'
                : 'bg-accent-primary text-white hover:bg-accent-primary/90 glow-hover-purple'
            }
          `}
          whileHover={{ scale: discoveredModels ? 1.05 : 1 }}
          whileTap={{ scale: discoveredModels ? 0.95 : 1 }}
        >
          Continue to Configuration →
        </motion.button>
      </div>
    </div>
  )
}
