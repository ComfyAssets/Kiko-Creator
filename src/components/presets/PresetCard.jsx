import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'

export default function PresetCard({
  preset,
  onEdit,
  onDelete,
  onDuplicate,
  onApply,
  onToggleFavorite,
  onUpdateFromCurrent
}) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  // Format date
  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false)
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="
        bg-gradient-to-br from-bg-tertiary/80 to-bg-secondary/80
        backdrop-blur-xl rounded-lg border border-border-primary
        p-4 space-y-3
        hover:border-accent-primary/50 hover:shadow-lg hover:shadow-accent-primary/10
        transition-all duration-200
      "
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {/* Star Button */}
          <button
            onClick={() => onToggleFavorite(preset.id)}
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded hover:bg-bg-hover transition-colors mt-0.5"
            title={preset.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <span className={`text-xl transition-all ${preset.isFavorite ? 'text-yellow-400 scale-110' : 'text-text-tertiary hover:text-yellow-400'}`}>
              {preset.isFavorite ? '⭐' : '☆'}
            </span>
          </button>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-text-primary truncate">
              {preset.name}
            </h3>
            {preset.description && (
              <p className="text-sm text-text-tertiary mt-0.5 line-clamp-2">
                {preset.description}
              </p>
            )}
          </div>
        </div>

        {/* Context Menu */}
        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-bg-hover transition-colors text-text-secondary"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>

          {showMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="
                absolute right-0 top-full mt-1 z-50
                bg-bg-secondary border border-border-primary rounded-lg
                shadow-xl overflow-hidden
                min-w-[140px]
              "
            >
              {onUpdateFromCurrent && (
                <button
                  onClick={() => {
                    onUpdateFromCurrent(preset.id)
                    setShowMenu(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-bg-hover transition-colors flex items-center gap-2 text-text-primary"
                >
                  <span>🔄</span>
                  <span>Update from Current</span>
                </button>
              )}
              <button
                onClick={() => {
                  onEdit(preset)
                  setShowMenu(false)
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-bg-hover transition-colors flex items-center gap-2 text-text-primary"
              >
                <span>✏️</span>
                <span>Edit</span>
              </button>
              <button
                onClick={() => {
                  onDuplicate(preset.id)
                  setShowMenu(false)
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-bg-hover transition-colors flex items-center gap-2 text-text-primary"
              >
                <span>📋</span>
                <span>Duplicate</span>
              </button>
              <button
                onClick={() => {
                  onDelete(preset.id)
                  setShowMenu(false)
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-bg-hover transition-colors flex items-center gap-2 text-accent-error"
              >
                <span>🗑️</span>
                <span>Delete</span>
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Settings Summary */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-text-secondary">
          <span className="text-text-tertiary">📦</span>
          <span className="truncate flex-1">{preset.settings.checkpoint || 'No model'}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {preset.settings.loras && preset.settings.loras.length > 0 && (
            <div className="flex items-center gap-1 text-text-tertiary">
              <span>🎛️</span>
              <span>{preset.settings.loras.length} LoRA{preset.settings.loras.length > 1 ? 's' : ''}</span>
            </div>
          )}
          {preset.settings.steps && (
            <div className="flex items-center gap-1 text-text-tertiary">
              <span>⚙️</span>
              <span>{preset.settings.steps} steps</span>
            </div>
          )}
          {preset.settings.width && preset.settings.height && (
            <div className="flex items-center gap-1 text-text-tertiary">
              <span>📐</span>
              <span>{preset.settings.width}×{preset.settings.height}</span>
            </div>
          )}
          {preset.settings.sampler && (
            <div className="flex items-center gap-1 text-text-tertiary truncate">
              <span>🔧</span>
              <span className="truncate">{preset.settings.sampler}</span>
            </div>
          )}
        </div>

        {/* Advanced Features Badges */}
        <div className="flex flex-wrap gap-1.5">
          {preset.settings.hiresFix?.enabled && (
            <span className="px-2 py-0.5 rounded-full bg-accent-secondary/20 text-accent-secondary text-xs font-medium">
              🔍 Hires Fix
            </span>
          )}
          {preset.settings.refiner?.enabled && (
            <span className="px-2 py-0.5 rounded-full bg-accent-primary/20 text-accent-primary text-xs font-medium">
              ✨ Refiner
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-border-primary/50">
        <motion.button
          onClick={() => onApply(preset)}
          className="flex-1 px-3 py-2 bg-gradient-to-r from-accent-primary to-accent-primary/90 text-white rounded-lg font-medium text-sm shadow-lg shadow-accent-primary/20 hover:shadow-accent-primary/30 transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          ✨ Apply
        </motion.button>
        <motion.button
          onClick={() => onEdit(preset)}
          className="px-3 py-2 bg-bg-secondary hover:bg-bg-hover border border-border-primary hover:border-accent-primary rounded-lg text-text-primary text-sm transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          ✏️
        </motion.button>
      </div>

      {/* Metadata Footer */}
      <div className="flex items-center justify-between text-xs text-text-tertiary pt-2 border-t border-border-primary/30">
        <span>Used {preset.usageCount} time{preset.usageCount !== 1 ? 's' : ''}</span>
        <span>{formatDate(preset.updatedAt)}</span>
      </div>
    </motion.div>
  )
}
