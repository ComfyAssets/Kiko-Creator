import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useSettingsStore } from '../stores/settingsStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function ModelsPage() {
  const navigate = useNavigate()
  const { models, comfyui, setCheckpoints, setLoras, setDefaults } = useSettingsStore()
  const [activeTab, setActiveTab] = useState('checkpoints') // 'checkpoints' or 'loras'
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [modelDetails, setModelDetails] = useState({}) // Cache for CivitAI metadata

  // Sync models from ComfyUI on mount
  useEffect(() => {
    const syncModels = async () => {
      try {
        const comfyURL = comfyui.apiUrl || 'http://127.0.0.1:8188'

        // Sync checkpoints
        const checkpointsRes = await fetch(`${API_URL}/api/comfyui/checkpoints?comfyUIUrl=${encodeURIComponent(comfyURL)}`)
        if (checkpointsRes.ok) {
          const { checkpoints } = await checkpointsRes.json()
          if (checkpoints && checkpoints.length > 0) {
            const checkpointModels = checkpoints.map(ckpt => {
              // ckpt is now an object with { name, path, description, baseModel, civitai }
              const parts = (ckpt.path || ckpt.name).split('/')
              const name = parts[parts.length - 1]
              const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : ''
              return {
                type: 'checkpoint',
                name: ckpt.name || ckpt.path,
                folder: folder,
                path: ckpt.path || ckpt.name,
                description: ckpt.description,
                baseModel: ckpt.baseModel,
                civitai: ckpt.civitai || {},
                metadata: null
              }
            })
            setCheckpoints(checkpointModels)
            console.log('✅ Synced checkpoints:', checkpointModels.length)
          }
        }

        // Sync LoRAs
        const lorasRes = await fetch(`${API_URL}/api/comfyui/loras?comfyUIUrl=${encodeURIComponent(comfyURL)}`)
        if (lorasRes.ok) {
          const { loras } = await lorasRes.json()
          if (loras && loras.length > 0) {
            const loraModels = loras.map(lora => {
              // lora is now an object with { name, path, triggerWords, description, baseModel, civitai }
              const parts = (lora.path || lora.name).split('/')
              const name = parts[parts.length - 1]
              const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : ''
              return {
                type: 'lora',
                name: lora.name || lora.path,
                folder: folder,
                path: lora.path || lora.name,
                triggerWords: lora.triggerWords || [],
                description: lora.description,
                baseModel: lora.baseModel,
                civitai: lora.civitai || {},
                metadata: null
              }
            })
            setLoras(loraModels)
            console.log('✅ Synced LoRAs:', loraModels.length)
          }
        }
      } catch (error) {
        console.error('❌ Error syncing models:', error)
      }
    }

    syncModels()
  }, [setCheckpoints, setLoras, comfyui.apiUrl])

  // Get active model list
  const activeModels = activeTab === 'checkpoints' ? models.checkpoints : models.loras

  // Filter models based on search
  const filteredModels = activeModels.filter(model => {
    const searchLower = searchTerm.toLowerCase()
    return model.name.toLowerCase().includes(searchLower) ||
           model.folder?.toLowerCase().includes(searchLower)
  })

  // Group models by folder
  const groupedModels = filteredModels.reduce((acc, model) => {
    const folder = model.folder || '(root)'
    if (!acc[folder]) acc[folder] = []
    acc[folder].push(model)
    return acc
  }, {})

  // Fetch CivitAI metadata for a model
  const fetchModelMetadata = async (model) => {
    if (modelDetails[model.path]) return // Already cached

    try {
      // Try to get metadata from our backend if it was scanned
      if (model.metadata?.civitaiId) {
        const response = await fetch(`${API_URL}/api/civitai/model/${model.metadata.civitaiId}`)
        if (response.ok) {
          const data = await response.json()
          setModelDetails(prev => ({
            ...prev,
            [model.path]: data
          }))
        }
      }
    } catch (error) {
      console.error('Failed to fetch model metadata:', error)
    }
  }

  // Send model to generation page
  const sendToGeneration = (model) => {
    if (activeTab === 'checkpoints') {
      setDefaults({ checkpoint: model.name })
      navigate('/generate')
    }
    // LoRA handling will be different - we'll add it to defaults.loras array
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full flex flex-col"
    >
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-3 flex items-center gap-2">
          <span>🎨</span>
          Models Library
        </h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('checkpoints')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'checkpoints'
                ? 'bg-accent-primary text-white'
                : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover'
            }`}
          >
            🎯 Checkpoints ({models.checkpoints.length})
          </button>
          <button
            onClick={() => setActiveTab('loras')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'loras'
                ? 'bg-accent-primary text-white'
                : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover'
            }`}
          >
            🎛️ LoRAs ({models.loras.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Search ${activeTab}...`}
            className="w-full px-4 py-2 pl-10 rounded-lg bg-bg-tertiary text-text-primary border border-border-primary focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all duration-200 outline-none"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">
            🔍
          </span>
        </div>
      </div>

      {/* Models Grid */}
      <div className="flex-1 bg-bg-secondary rounded-lg border border-border-primary overflow-auto">
        {Object.keys(groupedModels).length === 0 ? (
          <div className="h-full flex items-center justify-center text-center p-8">
            <div>
              <div className="text-6xl mb-4">
                {searchTerm ? '🔍' : activeTab === 'checkpoints' ? '🎯' : '🎛️'}
              </div>
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                {searchTerm ? 'No Results Found' : `No ${activeTab} Available`}
              </h2>
              <p className="text-text-secondary">
                {searchTerm
                  ? 'Try a different search term'
                  : `No ${activeTab} detected in ComfyUI`
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {Object.entries(groupedModels).map(([folder, folderModels]) => (
              <div key={folder}>
                {/* Folder Header */}
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border-primary">
                  <span className="text-xl">📁</span>
                  <h3 className="text-lg font-semibold text-text-primary">{folder}</h3>
                  <span className="text-sm text-text-tertiary">({folderModels.length})</span>
                </div>

                {/* Models in Folder */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {folderModels.map((model) => (
                    <ModelCard
                      key={model.path}
                      model={model}
                      modelType={activeTab}
                      onSendToGeneration={sendToGeneration}
                      onFetchMetadata={fetchModelMetadata}
                      metadata={modelDetails[model.path]}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// Model Card Component
function ModelCard({ model, modelType, onSendToGeneration, onFetchMetadata, metadata }) {
  const [showDetails, setShowDetails] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Get thumbnail URL
  const getThumbnailUrl = () => {
    // First, try to get preview image from CivitAI metadata
    if (model.civitai?.previewImage && !imageError) {
      return model.civitai.previewImage
    }
    // Fallback to metadata API call (for future use)
    if (metadata?.images?.[0]?.url && !imageError) {
      return metadata.images[0].url
    }
    return null
  }

  const thumbnailUrl = getThumbnailUrl()

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-bg-tertiary rounded-lg border border-border-primary overflow-hidden hover:border-accent-primary transition-all duration-200 flex flex-col"
    >
      {/* Thumbnail */}
      <div className="relative aspect-square bg-bg-primary">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={model.name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl text-text-tertiary">
            {modelType === 'checkpoints' ? '🎯' : '🎛️'}
          </div>
        )}

        {/* Quick Actions Overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
          <motion.button
            onClick={() => onSendToGeneration(model)}
            className="px-3 py-2 bg-accent-primary text-white rounded-lg text-sm font-medium hover:bg-accent-primary/90"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Send to Generation"
          >
            ➤ Generate
          </motion.button>
          <motion.button
            onClick={() => {
              setShowDetails(!showDetails)
              if (!metadata && !showDetails) {
                onFetchMetadata(model)
              }
            }}
            className="px-3 py-2 bg-bg-secondary text-text-primary rounded-lg text-sm font-medium hover:bg-bg-hover"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="View Details"
          >
            ℹ️ Info
          </motion.button>
          {model.civitai?.modelId && (
            <motion.button
              onClick={(e) => {
                e.stopPropagation()
                const modelId = model.civitai.modelId
                const versionId = model.civitai.id
                let url = `https://civitai.com/models/${modelId}`
                if (versionId) {
                  url += `?modelVersionId=${versionId}`
                }
                window.open(url, '_blank', 'noopener,noreferrer')
              }}
              className="px-3 py-2 bg-bg-secondary text-text-primary rounded-lg text-sm font-medium hover:bg-bg-hover"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="View on CivitAI"
            >
              🌐 CivitAI
            </motion.button>
          )}
        </div>
      </div>

      {/* Model Info */}
      <div className="p-3 flex-1 flex flex-col">
        <h4 className="font-medium text-text-primary text-sm mb-1 line-clamp-2">
          {model.name.split('/').pop().replace(/\.(safetensors|ckpt|pt)$/, '')}
        </h4>

        {model.baseModel && (
          <p className="text-xs text-text-tertiary mb-2">
            {model.baseModel}
          </p>
        )}

        {model.description && (
          <p className="text-xs text-text-secondary line-clamp-2 mb-2">
            {model.description}
          </p>
        )}

        {/* Metadata Stats */}
        {model.metadata?.stats && (
          <div className="flex items-center gap-3 text-xs text-text-secondary mt-auto">
            {model.metadata.stats.rating && (
              <span>⭐ {model.metadata.stats.rating.toFixed(1)}</span>
            )}
            {model.metadata.stats.downloadCount && (
              <span>⬇️ {(model.metadata.stats.downloadCount / 1000).toFixed(1)}k</span>
            )}
          </div>
        )}

        {/* CivitAI metadata if available */}
        {metadata && showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 pt-3 border-t border-border-primary text-xs"
          >
            {metadata.name && (
              <p className="text-text-primary font-medium mb-1">{metadata.name}</p>
            )}
            {metadata.description && (
              <p className="text-text-secondary line-clamp-3">{metadata.description}</p>
            )}
            {metadata.tags && metadata.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {metadata.tags.slice(0, 5).map(tag => (
                  <span key={tag} className="px-2 py-0.5 bg-accent-primary/20 text-accent-primary rounded text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}