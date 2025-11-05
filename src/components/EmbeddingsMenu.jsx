import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSettingsStore } from '../stores/settingsStore'

export default function EmbeddingsMenu({ onInsert }) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const menuRef = useRef(null)
  const searchInputRef = useRef(null)
  const { models, favoriteEmbeddings, toggleFavoriteEmbedding } = useSettingsStore()

  // Filter and sort embeddings
  const filteredEmbeddings = models.embeddings?.filter(embedding => {
    const searchLower = searchTerm.toLowerCase()
    const nameMatch = embedding.name.toLowerCase().includes(searchLower)
    const descMatch = embedding.description?.toLowerCase().includes(searchLower)
    return nameMatch || descMatch
  }).sort((a, b) => {
    // Favorites first
    const aIsFav = favoriteEmbeddings.includes(a.name)
    const bIsFav = favoriteEmbeddings.includes(b.name)

    if (aIsFav && !bIsFav) return -1
    if (!aIsFav && bIsFav) return 1

    // Then alphabetically
    return a.name.localeCompare(b.name)
  }) || []

  // Handle embedding selection
  const handleSelect = (embeddingName) => {
    onInsert(`embedding:${embeddingName}`)
    setSearchTerm('')
    setIsOpen(false)
  }

  // Focus search input when menu opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Don't render if no embeddings
  if (!models.embeddings || models.embeddings.length === 0) {
    return null
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 bg-bg-tertiary hover:bg-bg-hover border border-border-primary hover:border-accent-primary rounded-lg transition-all duration-200 flex items-center gap-2 text-text-secondary hover:text-text-primary"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        title="Insert embedding"
      >
        <span className="text-lg">🎨</span>
        <span className="text-sm font-medium">Embeddings</span>
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 bg-bg-secondary border border-border-primary rounded-lg shadow-lg overflow-hidden min-w-[250px]"
          >
            {/* Search Input */}
            <div className="p-3 border-b border-border-primary bg-bg-tertiary sticky top-0 z-10">
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search embeddings..."
                className="w-full px-3 py-2 rounded-lg text-sm bg-bg-primary text-text-primary border border-border-primary focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all duration-200 outline-none"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-auto">
              {filteredEmbeddings.length === 0 ? (
                <div className="px-4 py-8 text-center text-text-tertiary text-sm">
                  {searchTerm ? 'No embeddings found' : 'No embeddings available'}
                </div>
              ) : (
                filteredEmbeddings.map((embedding) => {
                  const isFavorite = favoriteEmbeddings.includes(embedding.name)

                  return (
                    <motion.div
                      key={embedding.name}
                      className="px-4 py-2 hover:bg-bg-hover transition-colors duration-150"
                      whileHover={{ x: 2 }}
                    >
                      <div className="flex items-center gap-2">
                        {/* Star Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFavoriteEmbedding(embedding.name)
                          }}
                          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-bg-tertiary transition-colors"
                          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <span className={`text-lg transition-all ${isFavorite ? 'text-yellow-400 scale-110' : 'text-text-tertiary hover:text-yellow-400'}`}>
                            {isFavorite ? '⭐' : '☆'}
                          </span>
                        </button>

                        {/* Embedding Info - Click to insert */}
                        <div
                          className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                          onClick={() => handleSelect(embedding.name)}
                        >
                          <span className="text-accent-primary">🎨</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-text-primary text-sm">
                              {embedding.name}
                            </div>
                            {embedding.description && (
                              <div className="text-xs text-text-tertiary truncate mt-0.5">
                                {embedding.description}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* CivitAI Globe Icon */}
                        {embedding.civitai?.modelId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              const modelId = embedding.civitai.modelId
                              const versionId = embedding.civitai.id
                              let url = `https://civitai.com/models/${modelId}`
                              if (versionId) {
                                url += `?modelVersionId=${versionId}`
                              }
                              window.open(url, '_blank', 'noopener,noreferrer')
                            }}
                            className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-bg-tertiary transition-colors text-text-secondary hover:text-accent-primary"
                            title="View on CivitAI"
                          >
                            🌐
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )
                })
              )}
            </div>

            <div className="px-3 py-2 border-t border-border-primary bg-bg-tertiary text-xs text-text-tertiary">
              {filteredEmbeddings.length} embedding{filteredEmbeddings.length !== 1 ? 's' : ''} • Click to add to prompt
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}