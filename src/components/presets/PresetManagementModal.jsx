import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePresetStore } from '../../stores/presetStore'
import { useSettingsStore } from '../../stores/settingsStore'
import PresetCard from './PresetCard'
import PresetEditorModal from './PresetEditorModal'

export default function PresetManagementModal({ isOpen, onClose, onApply, getCurrentSettings }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterModel, setFilterModel] = useState('')
  const [showEditor, setShowEditor] = useState(false)
  const [editingPreset, setEditingPreset] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingPresetId, setDeletingPresetId] = useState(null)

  const { presets, deletePreset, duplicatePreset, toggleFavorite, updatePreset } = usePresetStore()
  const { models } = useSettingsStore()

  // Filter and search presets
  const filteredPresets = presets.filter(preset => {
    const matchesSearch = searchTerm.trim()
      ? preset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        preset.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        preset.settings.checkpoint?.toLowerCase().includes(searchTerm.toLowerCase())
      : true

    const matchesModel = filterModel
      ? preset.settings.checkpoint === filterModel
      : true

    return matchesSearch && matchesModel
  })

  // Get unique checkpoint models from presets
  const uniqueModels = [...new Set(presets.map(p => p.settings.checkpoint).filter(Boolean))]

  const handleCreateNew = () => {
    setEditingPreset(null)
    setShowEditor(true)
  }

  const handleEdit = (preset) => {
    setEditingPreset(preset)
    setShowEditor(true)
  }

  const handleDelete = (presetId) => {
    setDeletingPresetId(presetId)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = () => {
    if (deletingPresetId) {
      const result = deletePreset(deletingPresetId)
      if (result.success && window.showToast) {
        window.showToast(result.message, 'success')
      }
    }
    setShowDeleteConfirm(false)
    setDeletingPresetId(null)
  }

  const handleDuplicate = (presetId) => {
    const result = duplicatePreset(presetId)
    if (result.success && window.showToast) {
      window.showToast(result.message, 'success')
    }
  }

  const handleUpdateFromCurrent = (presetId) => {
    if (!getCurrentSettings) return

    const currentSettings = getCurrentSettings()
    const result = updatePreset(presetId, { settings: currentSettings })

    if (result.success && window.showToast) {
      window.showToast(result.message, 'success')
    }
  }

  const handleApply = (preset) => {
    onApply(preset)
    if (window.showToast) {
      window.showToast(`Applied preset: ${preset.name}`, 'success')
    }
  }

  const handleEditorClose = () => {
    setShowEditor(false)
    setEditingPreset(null)
  }

  if (!isOpen) return null

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-bg-secondary border border-border-primary rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-ocean-600/20 to-ocean-500/20 border-b border-border-primary p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                    <span>⚙️</span> Manage Presets
                  </h2>
                  <p className="text-sm text-text-tertiary mt-1">
                    {presets.length} preset{presets.length !== 1 ? 's' : ''} saved
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <motion.button
                    onClick={handleCreateNew}
                    className="px-4 py-2 bg-accent-primary hover:bg-accent-primary/90 text-white rounded-lg font-medium transition-all shadow-lg shadow-accent-primary/20"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    + Create New
                  </motion.button>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex gap-3 mt-4">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search presets..."
                  className="
                    flex-1 px-4 py-2 rounded-lg
                    bg-bg-tertiary text-text-primary
                    border border-border-primary
                    focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20
                    transition-all duration-200
                    outline-none
                  "
                />
                <select
                  value={filterModel}
                  onChange={(e) => setFilterModel(e.target.value)}
                  className="
                    px-4 py-2 rounded-lg
                    bg-bg-tertiary text-text-primary
                    border border-border-primary
                    focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20
                    transition-all duration-200
                    outline-none
                  "
                >
                  <option value="">All Models</option>
                  {uniqueModels.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {filteredPresets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="text-6xl mb-4">📋</div>
                  <h3 className="text-xl font-semibold text-text-primary mb-2">
                    {searchTerm || filterModel ? 'No presets found' : 'No presets yet'}
                  </h3>
                  <p className="text-text-tertiary mb-6 max-w-md">
                    {searchTerm || filterModel
                      ? 'Try adjusting your search or filter criteria'
                      : 'Create your first preset to save and reuse your favorite generation settings'
                    }
                  </p>
                  {!searchTerm && !filterModel && (
                    <motion.button
                      onClick={handleCreateNew}
                      className="px-6 py-3 bg-accent-primary hover:bg-accent-primary/90 text-white rounded-lg font-medium shadow-lg shadow-accent-primary/20"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      + Create Your First Preset
                    </motion.button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPresets.map(preset => (
                    <PresetCard
                      key={preset.id}
                      preset={preset}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onDuplicate={handleDuplicate}
                      onApply={handleApply}
                      onToggleFavorite={toggleFavorite}
                      onUpdateFromCurrent={getCurrentSettings ? handleUpdateFromCurrent : null}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-bg-secondary border border-border-primary rounded-lg shadow-2xl max-w-md w-full p-6"
            >
              <h3 className="text-lg font-bold text-text-primary mb-2">
                Delete Preset?
              </h3>
              <p className="text-text-secondary mb-6">
                Are you sure you want to delete this preset? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 bg-bg-tertiary hover:bg-bg-hover border border-border-primary rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-accent-error hover:bg-accent-error/90 text-white rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editor Modal */}
      <PresetEditorModal
        isOpen={showEditor}
        onClose={handleEditorClose}
        preset={editingPreset}
        getCurrentSettings={getCurrentSettings}
      />
    </>
  )
}
