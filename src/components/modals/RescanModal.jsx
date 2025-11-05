import { motion, AnimatePresence } from 'framer-motion'

export default function RescanModal({ isOpen, onClose, status, results, error }) {
  if (!isOpen) return null

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
          transition={{ type: 'spring', duration: 0.3 }}
          className="bg-bg-secondary rounded-lg border border-border-primary p-6 max-w-md w-full shadow-glow-blue"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Loading State */}
          {status === 'loading' && (
            <div className="text-center">
              <div className="mb-4">
                <div className="w-16 h-16 mx-auto border-4 border-accent-primary border-t-transparent rounded-full animate-spin" />
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                Scanning Models...
              </h3>
              <p className="text-text-secondary text-sm">
                This may take several minutes. Please wait while we scan all model directories and extract metadata.
              </p>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && results && (
            <div>
              <div className="mb-4 text-center">
                <div className="w-16 h-16 mx-auto bg-accent-success/20 rounded-full flex items-center justify-center mb-3">
                  <span className="text-3xl">✓</span>
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-2">
                  Scan Complete!
                </h3>
                <p className="text-text-secondary text-sm mb-4">
                  Model re-scan completed successfully
                </p>
              </div>

              {/* Stats Grid */}
              <div className="bg-bg-tertiary rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-text-tertiary">Checkpoints:</span>
                    <span className="text-text-primary ml-2 font-semibold">{results.checkpoints}</span>
                  </div>
                  <div>
                    <span className="text-text-tertiary">LoRAs:</span>
                    <span className="text-text-primary ml-2 font-semibold">{results.loras}</span>
                  </div>
                  <div>
                    <span className="text-text-tertiary">Embeddings:</span>
                    <span className="text-text-primary ml-2 font-semibold">{results.embeddings}</span>
                  </div>
                  <div>
                    <span className="text-text-tertiary">Total:</span>
                    <span className="text-text-primary ml-2 font-semibold">{results.total}</span>
                  </div>
                  <div>
                    <span className="text-text-tertiary">Cached:</span>
                    <span className="text-text-primary ml-2 font-semibold">{results.cached}</span>
                  </div>
                  <div>
                    <span className="text-text-tertiary">Duration:</span>
                    <span className="text-text-primary ml-2 font-semibold">{results.duration}s</span>
                  </div>
                </div>
              </div>

              <motion.button
                onClick={onClose}
                className="w-full px-4 py-2 bg-accent-primary hover:bg-accent-secondary text-white rounded-lg transition-all duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Close
              </motion.button>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div>
              <div className="mb-4 text-center">
                <div className="w-16 h-16 mx-auto bg-accent-error/20 rounded-full flex items-center justify-center mb-3">
                  <span className="text-3xl">✕</span>
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-2">
                  Scan Failed
                </h3>
                <p className="text-text-secondary text-sm mb-4">
                  Failed to complete model re-scan
                </p>
              </div>

              {error && (
                <div className="bg-accent-error/10 border border-accent-error/30 rounded-lg p-3 mb-4">
                  <p className="text-accent-error text-sm font-mono">{error}</p>
                </div>
              )}

              <motion.button
                onClick={onClose}
                className="w-full px-4 py-2 bg-bg-hover hover:bg-bg-tertiary text-text-primary rounded-lg border border-border-primary transition-all duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Close
              </motion.button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
