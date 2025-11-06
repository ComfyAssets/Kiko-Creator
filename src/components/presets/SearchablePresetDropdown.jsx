import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { usePresetStore } from '../../stores/presetStore'

export default function SearchablePresetDropdown({ onApply, getCurrentSettings }) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [buttonRect, setButtonRect] = useState(null)
  const buttonRef = useRef(null)
  const dropdownRef = useRef(null)

  const { presets, toggleFavorite, updatePreset, deletePreset } = usePresetStore()

  // Update button position when dropdown opens
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setButtonRect(rect)
    }
  }, [isOpen])

  // Filter presets based on search term
  const filteredPresets = searchTerm.trim()
    ? presets.filter(preset => {
        const lowerSearch = searchTerm.toLowerCase()
        return (
          preset.name.toLowerCase().includes(lowerSearch) ||
          preset.description?.toLowerCase().includes(lowerSearch) ||
          preset.settings.checkpoint?.toLowerCase().includes(lowerSearch)
        )
      })
    : presets

  // Separate favorites and regular presets
  const favoritePresets = filteredPresets.filter(p => p.isFavorite)
  const regularPresets = filteredPresets.filter(p => !p.isFavorite)

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

  const handleApplyPreset = (preset) => {
    onApply(preset)
    setIsOpen(false)
    setSearchTerm('')
  }

  const handleToggleFavorite = (e, presetId) => {
    e.stopPropagation()
    toggleFavorite(presetId)
  }

  const handleUpdateFromCurrent = (e, presetId) => {
    e.stopPropagation()
    if (!getCurrentSettings) return

    const currentSettings = getCurrentSettings()
    const result = updatePreset(presetId, { settings: currentSettings })

    if (result.success && window.showToast) {
      window.showToast(result.message, 'success')
    }
  }

  const handleDelete = (e, presetId) => {
    e.stopPropagation()
    const result = deletePreset(presetId)
    if (result.success && window.showToast) {
      window.showToast(result.message, 'success')
    }
  }

  return (
    <>
      {/* Trigger Button */}
      <motion.button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="
          px-4 py-2.5 rounded-lg
          bg-gradient-to-r from-ocean-600/20 to-ocean-500/20
          hover:from-ocean-600/30 hover:to-ocean-500/30
          border border-ocean-500/30 hover:border-ocean-400/50
          text-text-primary font-medium
          transition-all duration-200
          flex items-center gap-2
          shadow-lg shadow-ocean-500/10
        "
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <span>📋</span>
        <span>Apply Preset</span>
        <motion.svg
          className="w-4 h-4 text-text-secondary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </motion.button>

      {/* Dropdown Menu - Rendered via Portal */}
      {isOpen && buttonRect && createPortal(
        <AnimatePresence>
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              top: buttonRect.bottom + 8,
              right: window.innerWidth - buttonRect.right,
              zIndex: 9999
            }}
            className="
              w-80
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
                placeholder="Search presets..."
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
              {filteredPresets.length === 0 ? (
                <div className="px-4 py-8 text-center text-text-tertiary text-sm">
                  {searchTerm ? 'No presets found' : 'No presets yet. Create your first preset!'}
                </div>
              ) : (
                <>
                  {/* Favorites Section */}
                  {favoritePresets.length > 0 && (
                    <div className="border-b border-border-primary/50">
                      <div className="px-4 py-2 bg-bg-tertiary text-xs font-semibold text-text-secondary flex items-center gap-2 sticky top-0 z-10">
                        <span>⭐</span>
                        <span>Favorites</span>
                        <span className="text-text-tertiary">({favoritePresets.length})</span>
                      </div>
                      {favoritePresets.map(preset => (
                        <PresetDropdownItem
                          key={preset.id}
                          preset={preset}
                          onApply={() => handleApplyPreset(preset)}
                          onToggleFavorite={(e) => handleToggleFavorite(e, preset.id)}
                          onUpdateFromCurrent={(e) => handleUpdateFromCurrent(e, preset.id)}
                          onDelete={(e) => handleDelete(e, preset.id)}
                          hasGetCurrentSettings={!!getCurrentSettings}
                        />
                      ))}
                    </div>
                  )}

                  {/* All Presets Section */}
                  {regularPresets.length > 0 && (
                    <div>
                      <div className="px-4 py-2 bg-bg-tertiary text-xs font-semibold text-text-secondary flex items-center gap-2 sticky top-0 z-10">
                        <span>📋</span>
                        <span>All Presets</span>
                        <span className="text-text-tertiary">({regularPresets.length})</span>
                      </div>
                      {regularPresets.map(preset => (
                        <PresetDropdownItem
                          key={preset.id}
                          preset={preset}
                          onApply={() => handleApplyPreset(preset)}
                          onToggleFavorite={(e) => handleToggleFavorite(e, preset.id)}
                          onUpdateFromCurrent={(e) => handleUpdateFromCurrent(e, preset.id)}
                          onDelete={(e) => handleDelete(e, preset.id)}
                          hasGetCurrentSettings={!!getCurrentSettings}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}

// Preset Dropdown Item Component
function PresetDropdownItem({ preset, onApply, onToggleFavorite, onUpdateFromCurrent, onDelete, hasGetCurrentSettings }) {
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 })
  const itemRef = useRef(null)

  const handleContextMenu = (e) => {
    e.preventDefault()
    setContextMenuPos({ x: e.clientX, y: e.clientY })
    setShowContextMenu(true)
  }

  useEffect(() => {
    const handleClick = () => setShowContextMenu(false)
    if (showContextMenu) {
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [showContextMenu])

  return (
    <>
      <motion.div
        ref={itemRef}
        onContextMenu={handleContextMenu}
        className="
          px-4 py-3 cursor-pointer
          hover:bg-bg-hover transition-colors duration-150
          border-b border-border-primary/30 last:border-b-0
          relative
        "
        whileHover={{ x: 2 }}
      >
      <div className="flex items-center gap-3">
        {/* Star Button */}
        <button
          onClick={onToggleFavorite}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-bg-tertiary transition-colors"
          title={preset.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <span className={`text-lg transition-all ${preset.isFavorite ? 'text-yellow-400 scale-110' : 'text-text-tertiary hover:text-yellow-400'}`}>
            {preset.isFavorite ? '⭐' : '☆'}
          </span>
        </button>

        {/* Preset Info */}
        <div className="flex-1 min-w-0" onClick={onApply}>
          <div className="font-medium text-text-primary truncate text-sm">
            {preset.name}
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-text-tertiary">
            <span className="truncate">
              📦 {preset.settings.checkpoint || 'No model'}
            </span>
            {preset.settings.loras && preset.settings.loras.length > 0 && (
              <span className="flex-shrink-0">
                • 🎛️ {preset.settings.loras.length}
              </span>
            )}
          </div>
          {preset.description && (
            <div className="text-xs text-text-tertiary truncate mt-0.5">
              {preset.description}
            </div>
          )}
        </div>

        {/* Usage Count Badge */}
        {preset.usageCount > 0 && (
          <div className="flex-shrink-0 px-2 py-0.5 rounded-full bg-accent-primary/20 text-accent-primary text-xs font-medium">
            {preset.usageCount}×
          </div>
        )}
      </div>
    </motion.div>

      {/* Context Menu */}
      {showContextMenu && createPortal(
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          style={{
            position: 'fixed',
            left: contextMenuPos.x,
            top: contextMenuPos.y,
            zIndex: 99999
          }}
          className="bg-bg-secondary border border-border-primary rounded-lg shadow-2xl py-1 min-w-[180px]"
        >
          {hasGetCurrentSettings && (
            <button
              onClick={(e) => {
                onUpdateFromCurrent(e)
                setShowContextMenu(false)
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-bg-hover transition-colors flex items-center gap-2 text-text-primary"
            >
              <span>🔄</span>
              <span>Update from Current</span>
            </button>
          )}
          <button
            onClick={(e) => {
              onDelete(e)
              setShowContextMenu(false)
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-bg-hover transition-colors flex items-center gap-2 text-accent-error"
          >
            <span>🗑️</span>
            <span>Delete</span>
          </button>
        </motion.div>,
        document.body
      )}
    </>
  )
}
