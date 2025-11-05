import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function EditableSettingRow({
  label,
  value,
  onSave,
  type = 'text',
  options = [],
  masked = false,
  placeholder = ''
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [isHovered, setIsHovered] = useState(false)

  const handleSave = () => {
    onSave(editValue)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
  }

  const displayValue = masked && value
    ? '•'.repeat(Math.min(value.length, 20))
    : value || placeholder || 'Not set'

  return (
    <div
      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-bg-hover transition-colors duration-200 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className="text-text-secondary text-sm">{label}</span>

      {!isEditing ? (
        <div className="flex items-center gap-2">
          <span className={`text-text-primary text-sm ${type === 'text' ? 'font-mono text-xs' : ''} ${!value ? 'text-text-tertiary' : ''}`}>
            {displayValue}
          </span>
          <AnimatePresence>
            {isHovered && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setIsEditing(true)}
                className="text-accent-primary hover:text-accent-secondary transition-colors p-1"
                title="Edit"
              >
                ✏️
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {type === 'select' ? (
            <select
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-bg-tertiary text-text-primary border border-border-primary focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all duration-200 outline-none text-sm"
              autoFocus
            >
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={masked ? 'password' : type}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className={`px-3 py-1.5 rounded-lg bg-bg-tertiary text-text-primary border border-border-primary focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all duration-200 outline-none text-sm ${type === 'text' ? 'font-mono' : ''} w-64`}
              placeholder={placeholder}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') handleCancel()
              }}
            />
          )}

          <motion.button
            onClick={handleSave}
            className="px-3 py-1.5 bg-accent-success text-white rounded-lg hover:bg-accent-success/90 transition-colors text-sm font-medium"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            ✓
          </motion.button>

          <motion.button
            onClick={handleCancel}
            className="px-3 py-1.5 bg-bg-tertiary text-text-secondary rounded-lg hover:bg-bg-hover transition-colors text-sm"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            ✕
          </motion.button>
        </div>
      )}
    </div>
  )
}
