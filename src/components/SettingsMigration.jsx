import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

/**
 * Settings Migration Component
 * Handles one-time migration from localStorage to database
 */
export default function SettingsMigration({ onComplete }) {
  const [status, setStatus] = useState('checking') // checking, migrating, success, error, skipped
  const [message, setMessage] = useState('Checking for settings migration...')
  const [migratedCount, setMigratedCount] = useState(0)

  useEffect(() => {
    checkAndMigrate()
  }, [])

  const checkAndMigrate = async () => {
    try {
      // Check if localStorage has settings
      const localStorageData = localStorage.getItem('kiko-creator-settings')

      if (!localStorageData) {
        console.log('No localStorage settings found, skipping migration')
        setStatus('skipped')
        setMessage('No migration needed')
        onComplete?.(false)
        return
      }

      const parsed = JSON.parse(localStorageData)
      if (!parsed.state) {
        console.log('Invalid localStorage data, skipping migration')
        setStatus('skipped')
        setMessage('No migration needed')
        onComplete?.(false)
        return
      }

      // Check if database already has settings (check if setup_complete exists)
      const checkResponse = await fetch(`${API_URL}/api/settings/setup_complete`)
      const hasExistingSettings = checkResponse.ok

      if (hasExistingSettings) {
        console.log('Database already has settings, skipping migration')
        setStatus('skipped')
        setMessage('Settings already migrated')
        onComplete?.(false)
        return
      }

      // Perform migration
      console.log('Starting settings migration from localStorage to database...')
      setStatus('migrating')
      setMessage('Migrating your settings...')

      const response = await fetch(`${API_URL}/api/settings/migrate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ localStorage: parsed })
      })

      if (!response.ok) {
        throw new Error(`Migration failed: ${response.statusText}`)
      }

      const result = await response.json()

      console.log('✅ Settings migration successful:', result)
      setStatus('success')
      setMessage(`Successfully migrated ${result.migrated} settings`)
      setMigratedCount(result.migrated)

      // Clear localStorage after successful migration (keep as backup for now)
      // localStorage.removeItem('kiko-creator-settings')
      console.log('localStorage settings retained as backup')

      // Wait a bit before completing to show success message
      setTimeout(() => {
        onComplete?.(true)
      }, 2000)

    } catch (error) {
      console.error('Settings migration error:', error)
      setStatus('error')
      setMessage('Migration failed, continuing with localStorage fallback')

      // Don't block the app, continue with localStorage
      setTimeout(() => {
        onComplete?.(false)
      }, 3000)
    }
  }

  // Don't show anything if skipped
  if (status === 'skipped') {
    return null
  }

  return (
    <AnimatePresence>
      {(status === 'checking' || status === 'migrating' || status === 'success' || status === 'error') && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-bg-secondary border border-border-primary rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              {/* Icon */}
              <div className="w-16 h-16 rounded-full bg-accent-primary/10 flex items-center justify-center">
                {status === 'checking' || status === 'migrating' ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-8 h-8 border-3 border-accent-primary border-t-transparent rounded-full"
                  />
                ) : status === 'success' ? (
                  <svg className="w-10 h-10 text-accent-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-10 h-10 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
              </div>

              {/* Title */}
              <h2 className="text-xl font-bold text-text-primary">
                {status === 'checking' && 'Checking Settings'}
                {status === 'migrating' && 'Migrating Settings'}
                {status === 'success' && 'Migration Complete'}
                {status === 'error' && 'Migration Issue'}
              </h2>

              {/* Message */}
              <p className="text-text-secondary">
                {message}
              </p>

              {/* Success details */}
              {status === 'success' && migratedCount > 0 && (
                <div className="mt-4 p-4 bg-accent-secondary/10 border border-accent-secondary/20 rounded-lg">
                  <p className="text-sm text-text-secondary">
                    Your settings have been successfully migrated to the database and will now sync across all your devices!
                  </p>
                </div>
              )}

              {/* Error details */}
              {status === 'error' && (
                <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-sm text-text-secondary">
                    Don't worry! Your settings are still available and the app will continue to work normally.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
