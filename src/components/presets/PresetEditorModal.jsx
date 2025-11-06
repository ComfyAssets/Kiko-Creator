import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePresetStore } from '../../stores/presetStore'
import SettingsSummary from './SettingsSummary'

export default function PresetEditorModal({ isOpen, onClose, preset, getCurrentSettings }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [source, setSource] = useState('current') // 'current' or 'preset'
  const [settings, setSettings] = useState(null)
  const [error, setError] = useState('')

  const { createPreset, updatePreset } = usePresetStore()

  const isEditing = !!preset

  // Initialize form when preset or modal opens
  useEffect(() => {
    if (isOpen) {
      if (preset) {
        // Editing existing preset
        setName(preset.name)
        setDescription(preset.description || '')
        setSource('preset')
        setSettings(preset.settings)
      } else {
        // Creating new preset
        setName('')
        setDescription('')
        setSource('current')
        setSettings(getCurrentSettings ? getCurrentSettings() : null)
      }
      setError('')
    }
  }, [isOpen, preset, getCurrentSettings])

  // Update settings when source changes
  useEffect(() => {
    if (isOpen && source === 'current' && getCurrentSettings) {
      setSettings(getCurrentSettings())
    }
  }, [source, isOpen, getCurrentSettings])

  const validateForm = () => {
    if (!name.trim()) {
      setError('Preset name is required')
      return false
    }
    if (name.trim().length < 3) {
      setError('Preset name must be at least 3 characters')
      return false
    }
    if (name.trim().length > 50) {
      setError('Preset name must be less than 50 characters')
      return false
    }
    if (!settings || !settings.checkpoint) {
      setError('Checkpoint model is required')
      return false
    }
    return true
  }

  const handleSave = () => {
    if (!validateForm()) return

    const presetData = {
      name: name.trim(),
      description: description.trim(),
      settings
    }

    let result
    if (isEditing) {
      result = updatePreset(preset.id, presetData)
    } else {
      result = createPreset(presetData.name, presetData.description, presetData.settings)
    }

    if (result.success) {
      if (window.showToast) {
        window.showToast(result.message, 'success')
      }
      onClose()
    } else {
      setError(result.message || 'Failed to save preset')
    }
  }

  const handleCancel = () => {
    onClose()
  }

  if (!isOpen) return null

  const isValid = name.trim().length >= 3 && name.trim().length <= 50 && settings?.checkpoint

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
        onClick={handleCancel}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-bg-secondary border border-border-primary rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-accent-primary/20 to-accent-secondary/20 border-b border-border-primary p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                <span>{isEditing ? '✏️' : '➕'}</span>
                {isEditing ? 'Edit' : 'Create'} Preset
              </h2>
              <button
                onClick={handleCancel}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Preset Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., SDXL Quality Portrait"
                  maxLength={50}
                  className="
                    w-full px-4 py-2 rounded-lg
                    bg-bg-tertiary text-text-primary
                    border border-border-primary
                    focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20
                    transition-all duration-200
                    outline-none
                  "
                />
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-text-tertiary">
                    {name.length}/50 characters
                  </span>
                  {name.length > 0 && name.length < 3 && (
                    <span className="text-xs text-accent-error">
                      Minimum 3 characters
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this preset is for..."
                  rows={2}
                  maxLength={200}
                  className="
                    w-full px-4 py-2 rounded-lg
                    bg-bg-tertiary text-text-primary
                    border border-border-primary
                    focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20
                    transition-all duration-200
                    outline-none
                    resize-none
                  "
                />
                <div className="text-xs text-text-tertiary mt-1">
                  {description.length}/200 characters
                </div>
              </div>
            </div>

            {/* Settings Source */}
            {!isEditing && (
              <div className="bg-bg-tertiary/30 rounded-lg p-4 border border-border-primary">
                <label className="block text-sm font-medium text-text-secondary mb-3">
                  Settings Source
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-border-primary hover:border-accent-primary cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="source"
                      value="current"
                      checked={source === 'current'}
                      onChange={() => setSource('current')}
                      className="w-4 h-4 text-accent-primary"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-text-primary">Use Current Page Settings</div>
                      <div className="text-xs text-text-tertiary mt-0.5">
                        Capture all settings from the generation page
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-accent-error/10 border border-accent-error/30 rounded-lg p-3">
                <p className="text-accent-error text-sm flex items-center gap-2">
                  <span>⚠️</span>
                  {error}
                </p>
              </div>
            )}

            {/* Settings Preview */}
            {settings && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-text-secondary flex items-center gap-2">
                    <span>👁️</span> Settings Preview
                  </h3>
                  {source === 'current' && !isEditing && (
                    <button
                      onClick={() => setSettings(getCurrentSettings())}
                      className="text-xs px-2 py-1 rounded bg-accent-secondary hover:bg-accent-secondary/80 text-white transition-colors"
                    >
                      🔄 Refresh
                    </button>
                  )}
                </div>
                <div className="bg-bg-tertiary/30 rounded-lg p-4 border border-border-primary max-h-[400px] overflow-y-auto">
                  <SettingsSummary settings={settings} />
                </div>
                {source === 'current' && !isEditing && (
                  <p className="text-xs text-text-tertiary mt-2 flex items-center gap-1">
                    <span>ℹ️</span>
                    These settings will be captured when you save
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="border-t border-border-primary p-6 bg-bg-tertiary/30">
            <div className="flex gap-3 justify-end">
              <motion.button
                onClick={handleCancel}
                className="px-6 py-2.5 bg-bg-secondary hover:bg-bg-hover border border-border-primary rounded-lg transition-colors font-medium"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
              <motion.button
                onClick={handleSave}
                disabled={!isValid}
                className={`
                  px-6 py-2.5 rounded-lg font-medium transition-all
                  ${isValid
                    ? 'bg-accent-primary hover:bg-accent-primary/90 text-white shadow-lg shadow-accent-primary/20'
                    : 'bg-bg-tertiary text-text-tertiary cursor-not-allowed'
                  }
                `}
                whileHover={isValid ? { scale: 1.02 } : {}}
                whileTap={isValid ? { scale: 0.98 } : {}}
              >
                {isEditing ? 'Update' : 'Create'} Preset
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
