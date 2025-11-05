import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import axios from 'axios'
import { useGenerationStore } from '../stores/generationStore'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from '../components/Toast'
import CharacterSelectionModal from '../components/CharacterSelectionModal'
import CreateCharacterModal from '../components/CreateCharacterModal'
import ContextMenu from '../components/ContextMenu'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function CharactersPage() {
  const { addCharacterToPrompt, addCustomCharacter, updateCustomCharacter, deleteCustomCharacter, setCustomCharacterImage, getCustomCharacters } = useGenerationStore()
  const toast = useToast()
  const [characters, setCharacters] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [selectedCharacter, setSelectedCharacter] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editCharacter, setEditCharacter] = useState(null)
  const [contextMenu, setContextMenu] = useState(null)
  const [sortBy, setSortBy] = useState('id')
  const [seriesFilter, setSeriesFilter] = useState('all')
  const [popularSeries, setPopularSeries] = useState([])
  const [gridColumns, setGridColumns] = useState(5) // Default 5 columns
  const limit = 50

  // Intersection Observer for infinite scroll
  const observerRef = useRef()
  const loadMoreRef = useRef()

  // Load initial stats and popular series
  useEffect(() => {
    axios.get(`${API_URL}/api/characters/stats`)
      .then(res => setStats(res.data))
      .catch(err => console.error('Failed to load stats:', err))

    axios.get(`${API_URL}/api/characters/series/popular?count=30`)
      .then(res => setPopularSeries(res.data.series || []))
      .catch(err => console.error('Failed to load popular series:', err))
  }, [])

  // Load characters
  const loadCharacters = useCallback(async (isLoadMore = false) => {
    if (loading) return // Prevent duplicate requests

    try {
      setLoading(true)
      setError(null)

      const currentOffset = isLoadMore ? offset : 0
      const response = await axios.get(`${API_URL}/api/characters`, {
        params: {
          q: searchQuery,
          limit,
          offset: currentOffset,
          sortBy,
          series: seriesFilter !== 'all' ? seriesFilter : null
        }
      })

      const newCharacters = response.data.characters

      // Get custom characters and prepend them (only on first load)
      const customChars = getCustomCharacters()
      const filteredCustomChars = customChars.filter(char => {
        // Apply search filter
        if (searchQuery && searchQuery.trim()) {
          const lowerQuery = searchQuery.toLowerCase()
          return (
            char.chineseName.toLowerCase().includes(lowerQuery) ||
            char.englishTag.toLowerCase().includes(lowerQuery) ||
            char.series.toLowerCase().includes(lowerQuery)
          )
        }
        // Apply series filter
        if (seriesFilter && seriesFilter !== 'all') {
          return char.series === seriesFilter
        }
        return true
      })

      if (isLoadMore) {
        setCharacters(prev => [...prev, ...newCharacters])
      } else {
        // Prepend custom characters on initial load
        setCharacters([...filteredCustomChars, ...newCharacters])
      }

      setOffset(currentOffset + newCharacters.length)
      setHasMore(newCharacters.length === limit)
    } catch (err) {
      setError(err.message)
      console.error('Failed to load characters:', err)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, offset, loading, sortBy, seriesFilter])

  // Initial load and search with debounce (reset on any filter change)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setOffset(0)
      setCharacters([])
      loadCharacters(false)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, sortBy, seriesFilter])

  // Infinite scroll with Intersection Observer
  useEffect(() => {
    if (loading || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadCharacters(true)
        }
      },
      {
        root: null,
        rootMargin: '200px', // Start loading 200px before reaching the bottom
        threshold: 0.1
      }
    )

    observerRef.current = observer

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [loading, hasMore, loadCharacters])

  const handleCharacterSelect = useCallback((character) => {
    const result = addCharacterToPrompt(character)
    if (result.success) {
      setSelectedCharacter(character)
      setShowModal(true)
    } else {
      toast.warning(result.message)
    }
  }, [addCharacterToPrompt, toast])

  const handleCloseModal = useCallback(() => {
    setShowModal(false)
    setSelectedCharacter(null)
  }, [])

  const handleAddMore = useCallback(() => {
    toast.success(`Added ${selectedCharacter?.chineseName}. Select more characters or go to Generate.`)
  }, [selectedCharacter, toast])

  const handleSaveCustomCharacter = useCallback((formData, shouldNavigate = false) => {
    let result

    if (editCharacter) {
      // Update existing character
      result = updateCustomCharacter(editCharacter.id, formData)
    } else {
      // Create new character
      result = addCustomCharacter(formData)
    }

    if (result.success) {
      toast.success(result.message)
      setShowCreateModal(false)
      setEditCharacter(null)

      // Add the character to prompt (only for new characters)
      if (!editCharacter && result.character) {
        addCharacterToPrompt(result.character)
      }

      // Navigate to generate if requested
      if (shouldNavigate) {
        window.location.href = '/generate'
      } else {
        // Reload characters to show changes
        setOffset(0)
        setCharacters([])
        loadCharacters(false)
      }
    } else {
      toast.error(result.message)
    }
  }, [editCharacter, addCustomCharacter, updateCustomCharacter, addCharacterToPrompt, toast, loadCharacters])

  const handleContextMenu = useCallback((e, character) => {
    e.preventDefault()

    // Only show context menu for custom characters
    if (!character.isCustom) return

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      character
    })
  }, [])

  const handleEditCharacter = useCallback((character) => {
    setEditCharacter(character)
    setShowCreateModal(true)
    setContextMenu(null)
  }, [])

  const handleDeleteCharacter = useCallback((character) => {
    if (window.confirm(`Delete "${character.chineseName}"?`)) {
      deleteCustomCharacter(character.id)
      toast.success(`Deleted ${character.chineseName}`)

      // Reload characters
      setOffset(0)
      setCharacters([])
      loadCharacters(false)
    }
    setContextMenu(null)
  }, [deleteCustomCharacter, toast, loadCharacters])

  const handleAddImage = useCallback((character) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'

    input.onchange = (e) => {
      const file = e.target.files[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (event) => {
        setCustomCharacterImage(character.id, event.target.result)
        toast.success('Image added')

        // Reload characters
        setOffset(0)
        setCharacters([])
        loadCharacters(false)
      }
      reader.readAsDataURL(file)
    }

    input.click()
    setContextMenu(null)
  }, [setCustomCharacterImage, toast, loadCharacters])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />

      {/* Character Selection Modal */}
      {showModal && (
        <CharacterSelectionModal
          character={selectedCharacter}
          onClose={handleCloseModal}
          onAddMore={handleAddMore}
        />
      )}

      {/* Create Character Modal */}
      {showCreateModal && (
        <CreateCharacterModal
          onClose={() => {
            setShowCreateModal(false)
            setEditCharacter(null)
          }}
          onSave={handleSaveCustomCharacter}
          editCharacter={editCharacter}
        />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          options={[
            {
              icon: '✏️',
              label: 'Edit',
              onClick: () => handleEditCharacter(contextMenu.character)
            },
            {
              icon: '🖼️',
              label: 'Add Image',
              onClick: () => handleAddImage(contextMenu.character)
            },
            {
              icon: '🗑️',
              label: 'Delete',
              danger: true,
              onClick: () => handleDeleteCharacter(contextMenu.character)
            }
          ]}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Character Selection
          </h1>
          <p className="text-text-secondary">
            {stats ? `Browse and select from ${stats.characterCount.toLocaleString()}+ characters` : 'Loading character database...'}
          </p>
        </div>

        {/* Create Custom Character Button */}
        <motion.button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-accent-primary hover:bg-accent-primary/90 rounded-lg text-white font-medium transition-all shadow-lg flex items-center gap-2"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="text-xl">➕</span>
          <span>Create Custom</span>
        </motion.button>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search characters (English or Chinese)..."
          className="w-full px-4 py-3 bg-bg-secondary border border-border-primary rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-primary"
        />
      </div>

      {/* Filters and Controls */}
      <div className="mb-6 bg-bg-secondary border border-border-primary rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Series Filter */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Series / Franchise
            </label>
            <select
              value={seriesFilter}
              onChange={(e) => setSeriesFilter(e.target.value)}
              className="w-full px-3 py-2 bg-bg-tertiary text-text-primary border border-border-primary rounded-lg focus:border-accent-primary focus:outline-none text-sm"
            >
              <option value="all">All Series</option>
              <option value="custom">✨ Custom Characters</option>
              <optgroup label="Popular Series">
                {popularSeries.map((item) => (
                  <option key={item.series} value={item.series}>
                    {item.series} ({item.count})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 bg-bg-tertiary text-text-primary border border-border-primary rounded-lg focus:border-accent-primary focus:outline-none text-sm"
            >
              <option value="id">Default Order</option>
              <option value="name-zh">Chinese Name (A-Z)</option>
              <option value="name-en">English Name (A-Z)</option>
              <option value="popular">Popular First</option>
              <option value="recent">Recently Added</option>
            </select>
          </div>

          {/* Grid Size */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Grid Size: {gridColumns} columns
            </label>
            <input
              type="range"
              min="2"
              max="6"
              value={gridColumns}
              onChange={(e) => setGridColumns(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          Error: {error}
        </div>
      )}

      {/* Character Grid */}
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`
        }}
      >
        {characters.map((character) => (
          <CharacterCard
            key={character.id}
            character={character}
            onSelect={handleCharacterSelect}
            onContextMenu={handleContextMenu}
          />
        ))}
      </div>

      {/* Infinite Scroll Trigger */}
      {hasMore && characters.length > 0 && (
        <div
          ref={loadMoreRef}
          className="text-center py-8 text-text-secondary"
        >
          {loading && (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-primary"></div>
              <span>Loading more characters...</span>
            </div>
          )}
        </div>
      )}

      {/* Initial Loading Indicator */}
      {loading && characters.length === 0 && (
        <div className="text-center py-12 text-text-secondary">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary mx-auto mb-4"></div>
          <p>Loading characters...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && characters.length === 0 && (
        <div className="text-center py-12 text-text-secondary">
          <div className="text-6xl mb-4">🔍</div>
          <p>No characters found{searchQuery ? ` for "${searchQuery}"` : ''}</p>
        </div>
      )}

      {/* End of List Indicator */}
      {!hasMore && characters.length > 0 && (
        <div className="text-center py-8 text-text-tertiary text-sm">
          ✨ You've reached the end! ({characters.length} characters loaded)
        </div>
      )}
    </motion.div>
  )
}

function CharacterCard({ character, onSelect, onContextMenu }) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const thumbnailUrl = character.isCustom
    ? (character.customImage || null)
    : `${API_URL}/api/characters/thumbnail/${character.hash}`

  const handleClick = () => {
    onSelect(character)
  }

  const handleRightClick = (e) => {
    if (character.isCustom && onContextMenu) {
      onContextMenu(e, character)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      onContextMenu={handleRightClick}
      className="bg-bg-secondary border border-border-primary rounded-lg overflow-hidden cursor-pointer hover:border-accent-primary hover:shadow-lg transition-all"
    >
      {/* Thumbnail */}
      <div className="aspect-[3/4] bg-bg-tertiary relative">
        {character.isCustom && !character.customImage ? (
          <div className="absolute inset-0 flex items-center justify-center text-text-tertiary text-5xl">
            ✨
          </div>
        ) : thumbnailUrl && !imageError ? (
          <>
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center text-text-tertiary">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary"></div>
              </div>
            )}
            <img
              src={thumbnailUrl}
              alt={character.chineseName}
              className={`w-full h-full object-cover transition-opacity ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-text-tertiary text-4xl">
            👤
          </div>
        )}

        {/* Custom Character Badge */}
        {character.isCustom && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-accent-primary/90 backdrop-blur-sm rounded text-xs text-white font-medium">
            Custom
          </div>
        )}
      </div>

      {/* Character Info */}
      <div className="p-2">
        <div className="text-sm font-medium text-text-primary truncate" title={character.chineseName}>
          {character.chineseName}
        </div>
        <div className="text-xs text-text-tertiary truncate" title={character.englishTag}>
          {character.englishTag}
        </div>
      </div>
    </motion.div>
  )
}
