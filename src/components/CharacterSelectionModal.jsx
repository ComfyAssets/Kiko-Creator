import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

export default function CharacterSelectionModal({ character, onClose, onAddMore }) {
  const navigate = useNavigate()

  const handleGoToGenerate = () => {
    navigate('/generate')
    onClose()
  }

  const handleAddMore = () => {
    onAddMore()
    onClose()
  }

  if (!character) return null

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
          className="bg-bg-secondary border border-border-primary rounded-lg shadow-2xl max-w-md w-full overflow-hidden"
        >
          {/* Header */}
          <div className="bg-bg-tertiary border-b border-border-primary p-4">
            <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
              <span>✅</span>
              Character Added
            </h2>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <div className="text-center">
              <p className="text-text-secondary mb-2">Added to prompt:</p>
              <div className="bg-bg-tertiary border border-border-primary rounded-lg p-3">
                <p className="text-lg font-medium text-text-primary">{character.chineseName}</p>
                <p className="text-sm text-text-tertiary mt-1">{character.englishTag}</p>
                {character.isCustom && character.customPrompt && (
                  <div className="mt-3 pt-3 border-t border-border-primary text-left">
                    <p className="text-text-tertiary text-xs mb-1">Character Prompt:</p>
                    <p className="text-text-secondary text-xs">{character.customPrompt}</p>
                  </div>
                )}
              </div>
            </div>

            <p className="text-center text-text-secondary text-sm">
              What would you like to do next?
            </p>
          </div>

          {/* Actions */}
          <div className="p-4 bg-bg-tertiary border-t border-border-primary flex gap-3">
            <motion.button
              onClick={handleAddMore}
              className="flex-1 px-4 py-3 bg-bg-secondary hover:bg-bg-hover border border-border-primary hover:border-accent-primary rounded-lg text-text-primary font-medium transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center justify-center gap-2">
                <span>➕</span>
                <span>Add More</span>
              </div>
            </motion.button>

            <motion.button
              onClick={handleGoToGenerate}
              className="flex-1 px-4 py-3 bg-accent-primary hover:bg-accent-primary/90 rounded-lg text-white font-medium transition-all shadow-lg"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center justify-center gap-2">
                <span>✨</span>
                <span>Go to Generate</span>
              </div>
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
