import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function WildcardMenu({ onInsert }) {
  const [isOpen, setIsOpen] = useState(false)
  const [wildcards, setWildcards] = useState([])
  const menuRef = useRef(null)

  // Load wildcards
  useEffect(() => {
    fetchWildcards()
  }, [])

  const fetchWildcards = async () => {
    try {
      const response = await fetch(`${API_URL}/api/wildcards`)
      const data = await response.json()
      if (data.success) {
        setWildcards(data.wildcards)
      }
    } catch (error) {
      console.error('Error loading wildcards:', error)
    }
  }

  // Handle wildcard selection
  const handleSelect = (wildcardName) => {
    onInsert(`__${wildcardName}__`)
    setIsOpen(false)
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  if (wildcards.length === 0) {
    return null
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 bg-bg-tertiary hover:bg-bg-hover border border-border-primary hover:border-accent-primary rounded-lg transition-all duration-200 flex items-center gap-2 text-text-secondary hover:text-text-primary"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        title="Insert wildcard"
      >
        <span className="text-lg">🎲</span>
        <span className="text-sm font-medium">Wildcards</span>
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 z-50 mt-2 bg-bg-secondary border border-border-primary rounded-lg shadow-lg overflow-hidden min-w-[200px]"
          >
            <div className="px-3 py-2 bg-bg-tertiary border-b border-border-primary">
              <div className="text-xs font-semibold text-text-secondary">Available Wildcards</div>
            </div>

            <div className="max-h-64 overflow-auto">
              {wildcards.map((wildcardName) => (
                <motion.div
                  key={wildcardName}
                  onClick={() => handleSelect(wildcardName)}
                  className="px-4 py-2 cursor-pointer hover:bg-bg-hover text-text-primary transition-colors duration-150 flex items-center gap-2"
                  whileHover={{ x: 2 }}
                >
                  <span className="text-accent-primary">📁</span>
                  <span className="font-mono text-sm">__{wildcardName}__</span>
                </motion.div>
              ))}
            </div>

            <div className="px-3 py-2 border-t border-border-primary bg-bg-tertiary text-xs text-text-tertiary">
              Click to insert random value
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}