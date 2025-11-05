import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function SearchableModelDropdown({
  models,
  value,
  onChange,
  placeholder = 'Search models...',
  modelType = 'checkpoint',
  favoriteCheckpoints = [],
  onToggleFavorite
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [hoveredModel, setHoveredModel] = useState(null)
  const [hoveredPosition, setHoveredPosition] = useState({ x: 0, y: 0 })
  const dropdownRef = useRef(null)
  const hoverTimerRef = useRef(null)

  // Filter models by type first (safety check)
  const typeFilteredModels = models?.filter(m => m.type === modelType) || []

  // Get selected model object
  const selectedModel = typeFilteredModels.find(m => m.name === value)

  // Filter models based on search term
  const filteredModels = typeFilteredModels.filter(model => {
    const searchLower = searchTerm.toLowerCase()
    const nameMatch = model.name.toLowerCase().includes(searchLower)
    const folderMatch = model.folder?.toLowerCase().includes(searchLower)
    const metadataMatch = model.metadata?.modelName?.toLowerCase().includes(searchLower)
    return nameMatch || folderMatch || metadataMatch
  }) || []

  // Sort models: favorites first, then alphabetically
  const sortedModels = [...filteredModels].sort((a, b) => {
    const aIsFav = favoriteCheckpoints.includes(a.name)
    const bIsFav = favoriteCheckpoints.includes(b.name)

    // Favorites come first
    if (aIsFav && !bIsFav) return -1
    if (!aIsFav && bIsFav) return 1

    // Within same favorite status, sort alphabetically
    return a.name.localeCompare(b.name)
  })

  // Group models by folder
  const groupedModels = sortedModels.reduce((acc, model) => {
    const folder = model.folder || '(root)'
    if (!acc[folder]) acc[folder] = []
    acc[folder].push(model)
    return acc
  }, {})

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle model selection
  const handleSelect = (model) => {
    onChange(model.name)
    setIsOpen(false)
    setSearchTerm('')
  }

  // Handle mouse enter with delay for thumbnail
  const handleMouseEnter = (model, event) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)

    hoverTimerRef.current = setTimeout(() => {
      if (model.metadata?.thumbnailPath) {
        const rect = event.currentTarget.getBoundingClientRect()
        setHoveredPosition({
          x: rect.right + 10,
          y: rect.top
        })
        setHoveredModel(model)
      }
    }, 500) // 500ms delay before showing thumbnail
  }

  // Handle mouse leave
  const handleMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    setHoveredModel(null)
  }

  // Get thumbnail URL
  const getThumbnailUrl = (thumbnailPath) => {
    if (!thumbnailPath) return null
    // thumbnailPath is like "thumbnails/abc123.jpg"
    const filename = thumbnailPath.split('/').pop()
    return `${API_URL}/api/thumbnails/${filename}`
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Display/Input */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="
          w-full px-4 py-3 rounded-lg cursor-pointer
          bg-bg-tertiary text-text-primary
          border border-border-primary
          hover:border-accent-primary
          focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20
          transition-all duration-200
          flex items-center justify-between
        "
      >
        <div className="flex-1 min-w-0">
          {selectedModel ? (
            <div>
              <div className="font-medium truncate">{selectedModel.name}</div>
              {selectedModel.folder && (
                <div className="text-xs text-text-tertiary truncate">
                  📁 {selectedModel.folder}
                </div>
              )}
            </div>
          ) : (
            <span className="text-text-tertiary">{placeholder}</span>
          )}
        </div>
        <motion.svg
          className="w-5 h-5 text-text-secondary ml-2 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </div>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="
              absolute z-50 w-full mt-2
              bg-bg-secondary border border-border-primary
              rounded-lg shadow-xl
              max-h-96 overflow-hidden
              flex flex-col
            "
          >
            {/* Search Input */}
            <div className="p-3 border-b border-border-primary sticky top-0 bg-bg-secondary z-20">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Type to search..."
                className="
                  w-full px-3 py-2 rounded-lg text-sm
                  bg-bg-tertiary text-text-primary
                  border border-border-primary
                  focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20
                  transition-all duration-200
                  outline-none
                "
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Results */}
            <div className="overflow-y-auto">
              {Object.keys(groupedModels).length === 0 ? (
                <div className="px-4 py-8 text-center text-text-tertiary text-sm">
                  No models found
                </div>
              ) : (
                Object.entries(groupedModels).map(([folder, folderModels]) => (
                  <div key={folder} className="border-b border-border-primary/50 last:border-b-0">
                    {/* Folder Header */}
                    <div className="px-4 py-2 bg-bg-tertiary text-xs font-semibold text-text-secondary flex items-center gap-2 sticky top-0 z-10">
                      <span>📁</span>
                      <span>{folder}</span>
                      <span className="text-text-tertiary">({folderModels.length})</span>
                    </div>

                    {/* Models in Folder */}
                    {folderModels.map((model) => {
                      const isFavorite = favoriteCheckpoints.includes(model.name)

                      return (
                        <motion.div
                          key={model.path}
                          onMouseEnter={(e) => handleMouseEnter(model, e)}
                          onMouseLeave={handleMouseLeave}
                          className={`
                            px-4 py-3 cursor-pointer
                            hover:bg-bg-hover transition-colors duration-150
                            ${model.name === value ? 'bg-accent-primary/10 border-l-2 border-accent-primary' : ''}
                          `}
                          whileHover={{ x: 2 }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            {/* Star Button */}
                            {onToggleFavorite && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onToggleFavorite(model.name)
                                }}
                                className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-bg-tertiary transition-colors"
                                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                              >
                                <span className={`text-lg transition-all ${isFavorite ? 'text-yellow-400 scale-110' : 'text-text-tertiary hover:text-yellow-400'}`}>
                                  {isFavorite ? '⭐' : '☆'}
                                </span>
                              </button>
                            )}

                            {/* Model Info */}
                            <div
                              className="flex-1 min-w-0"
                              onClick={() => handleSelect(model)}
                            >
                              <div className="font-medium text-text-primary truncate text-sm">
                                {model.name}
                              </div>
                              {model.metadata?.modelName && (
                                <div className="text-xs text-text-secondary truncate mt-0.5">
                                  {model.metadata.modelName}
                                </div>
                              )}
                              {model.metadata?.baseModel && (
                                <div className="text-xs text-text-tertiary mt-0.5">
                                  {model.metadata.baseModel}
                                </div>
                              )}
                            </div>

                            {/* CivitAI Indicator */}
                            {model.metadata?.thumbnailPath && (
                              <div className="flex-shrink-0">
                                <div className="w-6 h-6 rounded bg-accent-secondary/20 flex items-center justify-center">
                                  <span className="text-xs">🖼️</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Thumbnail Preview */}
      <AnimatePresence>
        {hoveredModel && hoveredModel.metadata?.thumbnailPath && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="fixed z-[100] pointer-events-none"
            style={{
              left: `${hoveredPosition.x}px`,
              top: `${hoveredPosition.y}px`,
              maxWidth: '300px'
            }}
          >
            <div className="
              bg-bg-primary border-2 border-accent-primary
              rounded-lg shadow-2xl overflow-hidden
              shadow-glow-purple
            ">
              <img
                src={getThumbnailUrl(hoveredModel.metadata.thumbnailPath)}
                alt={hoveredModel.metadata.modelName || hoveredModel.name}
                className="w-full h-auto max-h-[400px] object-contain"
                onError={(e) => {
                  e.target.style.display = 'none'
                }}
              />
              {hoveredModel.metadata.modelName && (
                <div className="px-3 py-2 bg-bg-secondary border-t border-border-primary">
                  <div className="text-sm font-medium text-text-primary truncate">
                    {hoveredModel.metadata.modelName}
                  </div>
                  {hoveredModel.metadata.stats && (
                    <div className="flex items-center gap-3 mt-1 text-xs text-text-tertiary">
                      {hoveredModel.metadata.stats.rating && (
                        <span>⭐ {hoveredModel.metadata.stats.rating.toFixed(1)}</span>
                      )}
                      {hoveredModel.metadata.stats.downloadCount && (
                        <span>⬇️ {(hoveredModel.metadata.stats.downloadCount / 1000).toFixed(1)}k</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}