import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

export default function CreateCharacterModal({ onClose, onSave, editCharacter = null }) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState(
    editCharacter
      ? {
          chineseName: editCharacter.chineseName || '',
          englishTag: editCharacter.englishTag || '',
          series: editCharacter.series || 'custom',
          customPrompt: editCharacter.customPrompt || ''
        }
      : {
          chineseName: '',
          englishTag: '',
          series: 'custom',
          customPrompt: ''
        }
  )
  const [errors, setErrors] = useState({})
  const isEditMode = !!editCharacter

  const validateForm = () => {
    const newErrors = {}

    if (!formData.chineseName.trim()) {
      newErrors.chineseName = 'Chinese name is required'
    }

    if (!formData.englishTag.trim()) {
      newErrors.englishTag = 'English tag is required'
    } else if (!/^[a-z0-9\s_()-]+$/i.test(formData.englishTag)) {
      newErrors.englishTag = 'Only letters, numbers, spaces, and - _ ( ) allowed'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    // Save the custom character
    onSave(formData)
  }

  const handleGenerateAndSave = () => {
    if (!validateForm()) {
      return
    }

    // Save character and go to generate page with the tag pre-filled
    onSave(formData, true) // true = navigate to generate
  }

  return (
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
          className="bg-bg-secondary border border-border-primary rounded-lg shadow-2xl max-w-lg w-full overflow-hidden"
        >
          {/* Header */}
          <div className="bg-bg-tertiary border-b border-border-primary p-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
              <span>{isEditMode ? '✏️' : '➕'}</span>
              {isEditMode ? 'Edit Custom Character' : 'Create Custom Character'}
            </h2>
            <button
              onClick={onClose}
              className="text-text-tertiary hover:text-text-primary transition-colors text-2xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Chinese Name */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Chinese Name *
              </label>
              <input
                type="text"
                value={formData.chineseName}
                onChange={(e) => setFormData({ ...formData, chineseName: e.target.value })}
                placeholder="e.g., 自定义角色"
                className={`w-full px-3 py-2 bg-bg-tertiary text-text-primary border ${
                  errors.chineseName ? 'border-accent-error' : 'border-border-primary'
                } rounded-lg focus:border-accent-primary focus:outline-none`}
              />
              {errors.chineseName && (
                <p className="text-accent-error text-xs mt-1">{errors.chineseName}</p>
              )}
            </div>

            {/* English Tag */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                English Tag *
              </label>
              <input
                type="text"
                value={formData.englishTag}
                onChange={(e) => setFormData({ ...formData, englishTag: e.target.value.toLowerCase() })}
                placeholder="e.g., custom character"
                className={`w-full px-3 py-2 bg-bg-tertiary text-text-primary border ${
                  errors.englishTag ? 'border-accent-error' : 'border-border-primary'
                } rounded-lg focus:border-accent-primary focus:outline-none`}
              />
              {errors.englishTag && (
                <p className="text-accent-error text-xs mt-1">{errors.englishTag}</p>
              )}
              <p className="text-text-tertiary text-xs mt-1">
                This will be used as the prompt tag
              </p>
            </div>

            {/* Series */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Series / Source
              </label>
              <input
                type="text"
                value={formData.series}
                onChange={(e) => setFormData({ ...formData, series: e.target.value })}
                placeholder="e.g., original, custom"
                className="w-full px-3 py-2 bg-bg-tertiary text-text-primary border border-border-primary rounded-lg focus:border-accent-primary focus:outline-none"
              />
              <p className="text-text-tertiary text-xs mt-1">
                Optional - for organizing your custom characters
              </p>
            </div>

            {/* Custom Prompt */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Character Prompt
              </label>
              <textarea
                value={formData.customPrompt}
                onChange={(e) => setFormData({ ...formData, customPrompt: e.target.value })}
                placeholder="e.g., long brown hair, blue eyes, school uniform, cheerful expression"
                rows={3}
                className="w-full px-3 py-2 bg-bg-tertiary text-text-primary border border-border-primary rounded-lg focus:border-accent-primary focus:outline-none resize-none"
              />
              <p className="text-text-tertiary text-xs mt-1">
                Optional - detailed description that will be added to the prompt when this character is selected
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-bg-tertiary border border-border-primary rounded-lg p-3">
              <p className="text-text-secondary text-sm">
                <span className="font-medium">💡 Tip:</span> The English tag and character prompt will both be added to your generation prompt when you select this character.
              </p>
            </div>
          </form>

          {/* Actions */}
          <div className="p-4 bg-bg-tertiary border-t border-border-primary flex gap-3">
            <motion.button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-bg-secondary hover:bg-bg-hover border border-border-primary rounded-lg text-text-primary font-medium transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Cancel
            </motion.button>

            <motion.button
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 bg-bg-secondary hover:bg-bg-hover border border-accent-primary rounded-lg text-text-primary font-medium transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isEditMode ? 'Update Character' : 'Save Character'}
            </motion.button>

            {!isEditMode && (
              <motion.button
                onClick={handleGenerateAndSave}
                className="flex-1 px-4 py-2 bg-accent-primary hover:bg-accent-primary/90 rounded-lg text-white font-medium transition-all shadow-lg"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-center gap-2">
                  <span>✨</span>
                  <span>Save & Generate</span>
                </div>
              </motion.button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
