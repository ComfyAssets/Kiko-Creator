import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function ImageLightbox({ image, onClose, onNext, onPrevious, currentIndex, totalImages }) {
  const imgRef = useRef()

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && onPrevious) onPrevious()
      if (e.key === 'ArrowRight' && onNext) onNext()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, onNext, onPrevious])

  if (!image) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center"
        onClick={onClose}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent z-10">
          <div className="text-white text-sm">
            {currentIndex !== undefined && totalImages !== undefined && (
              <span>{currentIndex + 1} / {totalImages}</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300 transition-colors text-3xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Navigation Arrows */}
        {onPrevious && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onPrevious()
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white text-2xl transition-all z-10"
          >
            ←
          </button>
        )}

        {onNext && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onNext()
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white text-2xl transition-all z-10"
          >
            →
          </button>
        )}

        {/* Image */}
        <motion.img
          ref={imgRef}
          src={image.url}
          alt={image.filename}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="max-w-[90vw] max-h-[90vh] object-contain"
          onClick={(e) => e.stopPropagation()}
        />

        {/* Metadata Footer */}
        {image.metadata && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white text-sm max-h-[30vh] overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-2">
              <div><strong>Filename:</strong> {image.filename}</div>
              {image.metadata.prompt && <div><strong>Prompt:</strong> {image.metadata.prompt}</div>}
              {image.metadata.negativePrompt && <div><strong>Negative:</strong> {image.metadata.negativePrompt}</div>}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                {image.metadata.model && <div><strong>Model:</strong> {image.metadata.model}</div>}
                {image.metadata.seed !== undefined && <div><strong>Seed:</strong> {image.metadata.seed}</div>}
                {image.metadata.steps && <div><strong>Steps:</strong> {image.metadata.steps}</div>}
                {image.metadata.cfg && <div><strong>CFG:</strong> {image.metadata.cfg}</div>}
                {image.metadata.sampler && <div><strong>Sampler:</strong> {image.metadata.sampler}</div>}
                {image.metadata.width && image.metadata.height && (
                  <div><strong>Size:</strong> {image.metadata.width}×{image.metadata.height}</div>
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
