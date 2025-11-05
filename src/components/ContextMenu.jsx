import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function ContextMenu({ x, y, options, onClose }) {
  const menuRef = useRef()

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose()
      }
    }

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.1 }}
        className="fixed bg-bg-secondary border border-border-primary rounded-lg shadow-2xl py-1 z-[100] min-w-[160px]"
        style={{
          left: `${x}px`,
          top: `${y}px`,
        }}
      >
        {options.map((option, index) => (
          <button
            key={index}
            onClick={() => {
              option.onClick()
              onClose()
            }}
            disabled={option.disabled}
            className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 ${
              option.disabled
                ? 'text-text-tertiary cursor-not-allowed'
                : option.danger
                ? 'text-accent-error hover:bg-accent-error/10'
                : 'text-text-primary hover:bg-bg-hover'
            }`}
          >
            <span className="text-base">{option.icon}</span>
            <span>{option.label}</span>
          </button>
        ))}
      </motion.div>
    </AnimatePresence>
  )
}
