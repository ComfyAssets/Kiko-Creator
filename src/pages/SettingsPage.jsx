import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useSettingsStore } from '../stores/settingsStore'
import EditableSettingRow from '../components/settings/EditableSettingRow'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function SettingsPage() {
  const navigate = useNavigate()
  const {
    resetSetup,
    comfyui,
    civitai,
    defaults,
    setComfyUIConnection,
    setCivitAI,
    setDefaults
  } = useSettingsStore()

  const [dbStats, setDbStats] = useState(null)
  const [maintenanceStatus, setMaintenanceStatus] = useState({})

  // Fetch database stats on mount
  useEffect(() => {
    fetchDatabaseStats()
  }, [])

  const fetchDatabaseStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/maintenance/stats`)
      const data = await response.json()
      setDbStats(data)
    } catch (error) {
      console.error('Failed to fetch database stats:', error)
    }
  }

  const handleMaintenance = async (operation, label) => {
    setMaintenanceStatus({ [operation]: 'loading' })

    try {
      const response = await fetch(`${API_URL}/api/maintenance/${operation}`, {
        method: 'POST'
      })
      const data = await response.json()

      setMaintenanceStatus({ [operation]: 'success' })

      // Refresh stats after operation
      await fetchDatabaseStats()

      // Show success message
      alert(`${label} completed successfully!\n\n${data.message}${data.spaceReclaimed ? `\nSpace reclaimed: ${data.spaceReclaimed}` : ''}${data.backupPath ? `\nBackup location: ${data.backupPath}` : ''}`)
    } catch (error) {
      setMaintenanceStatus({ [operation]: 'error' })
      alert(`Failed to ${label.toLowerCase()}: ${error.message}`)
    } finally {
      setTimeout(() => setMaintenanceStatus({}), 2000)
    }
  }

  const handleSwapDimensions = () => {
    setDefaults({
      width: defaults.height,
      height: defaults.width
    })
  }

  const handleRerunSetup = async () => {
    if (confirm('This will reset your setup and restart the wizard. Continue?')) {
      try {
        // Reset on server
        const response = await fetch(`${API_URL}/api/setup/reset`, {
          method: 'POST'
        })

        if (response.ok) {
          console.log('✅ Setup reset on server')
          // Reset local state
          resetSetup()
          navigate('/setup')
        } else {
          alert('Failed to reset setup. Please try again.')
        }
      } catch (error) {
        console.error('Failed to reset setup:', error)
        alert('Failed to reset setup. Please try again.')
      }
    }
  }

  const samplers = [
    'euler',
    'euler_ancestral',
    'heun',
    'dpm_2',
    'dpm_2_ancestral',
    'lms',
    'dpm_fast',
    'dpm_adaptive',
    'dpmpp_2s_ancestral',
    'dpmpp_sde',
    'dpmpp_2m',
    'ddim',
    'uni_pc'
  ]

  const schedulers = ['normal', 'karras', 'exponential', 'simple']

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-4 md:mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-2">
          Settings
        </h1>
        <p className="text-sm md:text-base text-text-secondary">
          Configure application preferences and integrations
        </p>
      </div>

      <div className="space-y-4 md:space-y-6">
        {/* ComfyUI Settings */}
        <div className="bg-bg-secondary rounded-lg border border-border-primary p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold text-text-primary mb-3 md:mb-4 flex items-center gap-2">
            <span>🔌</span>
            ComfyUI Integration
          </h2>
          <div className="space-y-1">
            <div className="flex items-center justify-between py-2 px-3">
              <span className="text-text-secondary text-sm">Connection Status</span>
              <span className={comfyui.connected ? "text-accent-success" : "text-text-tertiary"}>
                ● {comfyui.connected ? 'Connected' : 'Not Connected'}
              </span>
            </div>

            <EditableSettingRow
              label="API Endpoint"
              value={comfyui.apiUrl}
              onSave={(value) => setComfyUIConnection({ apiUrl: value })}
              placeholder="http://127.0.0.1:8188"
            />

            {comfyui.version && (
              <div className="flex items-center justify-between py-2 px-3">
                <span className="text-text-secondary text-sm">Version</span>
                <span className="text-text-primary text-xs">{comfyui.version}</span>
              </div>
            )}

            {comfyui.hasMira && (
              <div className="flex items-center justify-between py-2 px-3">
                <span className="text-text-secondary text-sm">ComfyUI_Mira</span>
                <span className="text-accent-success">✓ Installed</span>
              </div>
            )}
          </div>
        </div>

        {/* API Keys */}
        <div className="bg-bg-secondary rounded-lg border border-border-primary p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold text-text-primary mb-3 md:mb-4 flex items-center gap-2">
            <span>🔑</span>
            API Keys
          </h2>
          <div className="space-y-1">
            <EditableSettingRow
              label="CivitAI API Key"
              value={civitai.apiKey}
              onSave={(value) => setCivitAI({ apiKey: value })}
              masked={true}
              placeholder="Enter CivitAI API key"
            />

            <EditableSettingRow
              label="HuggingFace Token"
              value={civitai.huggingfaceToken}
              onSave={(value) => setCivitAI({ huggingfaceToken: value })}
              masked={true}
              placeholder="Enter HuggingFace token"
            />
          </div>
        </div>

        {/* Default Settings */}
        <div className="bg-bg-secondary rounded-lg border border-border-primary p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold text-text-primary mb-3 md:mb-4 flex items-center gap-2">
            <span>⚙️</span>
            Default Generation Settings
          </h2>
          <div className="space-y-1">
            <EditableSettingRow
              label="Steps"
              value={defaults.steps}
              onSave={(value) => setDefaults({ steps: parseInt(value) })}
              type="number"
            />

            <EditableSettingRow
              label="CFG Scale"
              value={defaults.cfg}
              onSave={(value) => setDefaults({ cfg: parseFloat(value) })}
              type="number"
            />

            <EditableSettingRow
              label="Sampler"
              value={defaults.sampler}
              onSave={(value) => setDefaults({ sampler: value })}
              type="select"
              options={samplers}
            />

            <EditableSettingRow
              label="Scheduler"
              value={defaults.scheduler}
              onSave={(value) => setDefaults({ scheduler: value })}
              type="select"
              options={schedulers}
            />

            <div className="relative">
              <EditableSettingRow
                label="Width"
                value={defaults.width}
                onSave={(value) => setDefaults({ width: parseInt(value) })}
                type="number"
              />

              {/* Swap Button */}
              <div className="flex justify-center my-2">
                <motion.button
                  onClick={handleSwapDimensions}
                  className="px-3 py-1.5 bg-bg-tertiary hover:bg-bg-hover border border-border-primary hover:border-accent-primary rounded-lg transition-all duration-200 flex items-center gap-2 group"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Swap width and height"
                >
                  <svg
                    className="w-4 h-4 text-text-secondary group-hover:text-accent-primary transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                    />
                  </svg>
                  <span className="text-xs text-text-secondary group-hover:text-accent-primary transition-colors">
                    Swap
                  </span>
                </motion.button>
              </div>

              <EditableSettingRow
                label="Height"
                value={defaults.height}
                onSave={(value) => setDefaults({ height: parseInt(value) })}
                type="number"
              />
            </div>
          </div>
        </div>

        {/* Database Maintenance */}
        <div className="bg-bg-secondary rounded-lg border border-border-primary p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold text-text-primary mb-3 md:mb-4 flex items-center gap-2">
            <span>🔧</span>
            Database Maintenance
          </h2>
          <p className="text-text-secondary text-sm mb-4">
            Housekeeping operations for database optimization and backup
          </p>

          {/* Database Stats */}
          {dbStats && (
            <div className="bg-bg-tertiary rounded-lg p-4 mb-6">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Database Statistics</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-text-tertiary">Database Size:</span>
                  <span className="text-text-primary ml-2 font-mono">{dbStats.databaseSize}</span>
                </div>
                <div>
                  <span className="text-text-tertiary">Total Models:</span>
                  <span className="text-text-primary ml-2">{dbStats.totalModels}</span>
                </div>
                <div>
                  <span className="text-text-tertiary">With Metadata:</span>
                  <span className="text-text-primary ml-2">{dbStats.modelsWithMetadata}</span>
                </div>
                <div>
                  <span className="text-text-tertiary">Total Scans:</span>
                  <span className="text-text-primary ml-2">{dbStats.totalScans}</span>
                </div>
              </div>
            </div>
          )}

          {/* Maintenance Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Vacuum */}
            <motion.button
              onClick={() => handleMaintenance('vacuum', 'Database Vacuum')}
              disabled={maintenanceStatus.vacuum === 'loading'}
              className="flex flex-col items-center gap-2 p-5 md:p-4 bg-bg-tertiary rounded-lg border border-border-primary active:border-accent-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[120px]"
              whileHover={{ scale: maintenanceStatus.vacuum === 'loading' ? 1 : 1.02 }}
              whileTap={{ scale: maintenanceStatus.vacuum === 'loading' ? 1 : 0.98 }}
            >
              <span className="text-3xl">🧹</span>
              <div className="text-center">
                <div className="font-medium text-text-primary">Vacuum Database</div>
                <div className="text-xs text-text-tertiary mt-1">
                  Reclaim space & defragment
                </div>
              </div>
              {maintenanceStatus.vacuum === 'loading' && (
                <div className="w-5 h-5 border-2 border-accent-primary border-t-transparent rounded-full animate-spin mt-2" />
              )}
            </motion.button>

            {/* Optimize */}
            <motion.button
              onClick={() => handleMaintenance('optimize', 'Database Optimization')}
              disabled={maintenanceStatus.optimize === 'loading'}
              className="flex flex-col items-center gap-2 p-5 md:p-4 bg-bg-tertiary rounded-lg border border-border-primary active:border-accent-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[120px]"
              whileHover={{ scale: maintenanceStatus.optimize === 'loading' ? 1 : 1.02 }}
              whileTap={{ scale: maintenanceStatus.optimize === 'loading' ? 1 : 0.98 }}
            >
              <span className="text-3xl">⚡</span>
              <div className="text-center">
                <div className="font-medium text-text-primary">Optimize Database</div>
                <div className="text-xs text-text-tertiary mt-1">
                  Analyze & rebuild indexes
                </div>
              </div>
              {maintenanceStatus.optimize === 'loading' && (
                <div className="w-5 h-5 border-2 border-accent-primary border-t-transparent rounded-full animate-spin mt-2" />
              )}
            </motion.button>

            {/* Backup */}
            <motion.button
              onClick={() => handleMaintenance('backup', 'Database Backup')}
              disabled={maintenanceStatus.backup === 'loading'}
              className="flex flex-col items-center gap-2 p-5 md:p-4 bg-bg-tertiary rounded-lg border border-border-primary active:border-accent-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[120px]"
              whileHover={{ scale: maintenanceStatus.backup === 'loading' ? 1 : 1.02 }}
              whileTap={{ scale: maintenanceStatus.backup === 'loading' ? 1 : 0.98 }}
            >
              <span className="text-3xl">💾</span>
              <div className="text-center">
                <div className="font-medium text-text-primary">Backup Database</div>
                <div className="text-xs text-text-tertiary mt-1">
                  Create timestamped backup
                </div>
              </div>
              {maintenanceStatus.backup === 'loading' && (
                <div className="w-5 h-5 border-2 border-accent-primary border-t-transparent rounded-full animate-spin mt-2" />
              )}
            </motion.button>
          </div>
        </div>

        {/* Setup Wizard */}
        <div className="bg-bg-secondary rounded-lg border border-border-primary p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold text-text-primary mb-3 md:mb-4 flex items-center gap-2">
            <span>🔄</span>
            Setup Wizard
          </h2>
          <p className="text-text-secondary text-sm mb-4">
            Re-run the initial setup wizard to reconfigure paths and scan for models
          </p>
          <motion.button
            onClick={handleRerunSetup}
            className="px-4 py-3 md:py-2 bg-bg-hover text-text-primary rounded-lg border border-border-primary active:border-accent-primary transition-all duration-200 touch-manipulation w-full md:w-auto"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Re-run Setup Wizard
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
