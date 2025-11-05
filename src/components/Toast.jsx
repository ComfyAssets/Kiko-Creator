import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Toast({ message, type = 'success', onClose, duration = 3000 }) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const types = {
    success: {
      bg: 'bg-accent-success/90',
      icon: '✅',
      border: 'border-accent-success'
    },
    error: {
      bg: 'bg-accent-error/90',
      icon: '❌',
      border: 'border-accent-error'
    },
    info: {
      bg: 'bg-accent-primary/90',
      icon: 'ℹ️',
      border: 'border-accent-primary'
    },
    warning: {
      bg: 'bg-amber-500/90',
      icon: '⚠️',
      border: 'border-amber-500'
    }
  }

  const config = types[type] || types.success

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      className={`${config.bg} backdrop-blur-sm ${config.border} border px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] max-w-[500px]`}
    >
      <span className="text-2xl">{config.icon}</span>
      <p className="text-white text-sm font-medium flex-1">{message}</p>
      <button
        onClick={onClose}
        className="text-white hover:text-white/80 transition-colors text-xl leading-none"
      >
        ×
      </button>
    </motion.div>
  )
}

export function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
