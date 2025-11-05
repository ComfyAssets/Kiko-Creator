import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useSettingsStore } from '../../stores/settingsStore'
import { saveSettings } from '../../services/api'
import SearchableModelDropdown from './SearchableModelDropdown'

export default function ConfigurationStep({ onBack }) {
  const navigate = useNavigate()
  const { models, setDefaults, completeSetup } = useSettingsStore()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [config, setConfig] = useState({
    checkpoint: models.checkpoints?.[0]?.name || '',
    steps: 20,
    cfg: 7,
    sampler: 'euler_ancestral',
    scheduler: 'normal',
    width: 512,
    height: 512
  })

  const handleComplete = async () => {
    setSaving(true)
    setError(null)

    try {
      await saveSettings(config)
      setDefaults(config)
      completeSetup()

      // Navigate to main app
      setTimeout(() => {
        navigate('/')
      }, 500)
    } catch (err) {
      setError(err.message || 'Failed to save settings')
      setSaving(false)
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

  const resolutions = [
    { label: '512x512', width: 512, height: 512 },
    { label: '768x768', width: 768, height: 768 },
    { label: '1024x1024', width: 1024, height: 1024 },
    { label: '512x768 (Portrait)', width: 512, height: 768 },
    { label: '768x512 (Landscape)', width: 768, height: 512 }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">
          Configure Defaults
        </h2>
        <p className="text-text-secondary">
          Set your default generation parameters
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Checkpoint */}
        <div className="col-span-2">
          <label
            htmlFor="checkpoint"
            className="block text-sm font-medium text-text-secondary mb-2"
          >
            Default Checkpoint
          </label>
          <SearchableModelDropdown
            models={models.checkpoints}
            value={config.checkpoint}
            onChange={(checkpointName) => setConfig({ ...config, checkpoint: checkpointName })}
            placeholder="Search checkpoints..."
            modelType="checkpoint"
          />
        </div>

        {/* Steps */}
        <div>
          <label
            htmlFor="steps"
            className="block text-sm font-medium text-text-secondary mb-2"
          >
            Steps
          </label>
          <input
            id="steps"
            type="number"
            min="1"
            max="150"
            value={config.steps}
            onChange={(e) =>
              setConfig({ ...config, steps: parseInt(e.target.value) })
            }
            className="
              w-full px-4 py-3 rounded-lg
              bg-bg-tertiary text-text-primary
              border border-border-primary
              focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20
              transition-all duration-200
              outline-none
            "
          />
        </div>

        {/* CFG Scale */}
        <div>
          <label
            htmlFor="cfg"
            className="block text-sm font-medium text-text-secondary mb-2"
          >
            CFG Scale
          </label>
          <input
            id="cfg"
            type="number"
            min="1"
            max="30"
            step="0.5"
            value={config.cfg}
            onChange={(e) =>
              setConfig({ ...config, cfg: parseFloat(e.target.value) })
            }
            className="
              w-full px-4 py-3 rounded-lg
              bg-bg-tertiary text-text-primary
              border border-border-primary
              focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20
              transition-all duration-200
              outline-none
            "
          />
        </div>

        {/* Sampler */}
        <div>
          <label
            htmlFor="sampler"
            className="block text-sm font-medium text-text-secondary mb-2"
          >
            Sampler
          </label>
          <select
            id="sampler"
            value={config.sampler}
            onChange={(e) => setConfig({ ...config, sampler: e.target.value })}
            className="
              w-full px-4 py-3 rounded-lg
              bg-bg-tertiary text-text-primary
              border border-border-primary
              focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20
              transition-all duration-200
              outline-none
            "
          >
            {samplers.map((sampler) => (
              <option key={sampler} value={sampler}>
                {sampler}
              </option>
            ))}
          </select>
        </div>

        {/* Scheduler */}
        <div>
          <label
            htmlFor="scheduler"
            className="block text-sm font-medium text-text-secondary mb-2"
          >
            Scheduler
          </label>
          <select
            id="scheduler"
            value={config.scheduler}
            onChange={(e) => setConfig({ ...config, scheduler: e.target.value })}
            className="
              w-full px-4 py-3 rounded-lg
              bg-bg-tertiary text-text-primary
              border border-border-primary
              focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20
              transition-all duration-200
              outline-none
            "
          >
            {schedulers.map((scheduler) => (
              <option key={scheduler} value={scheduler}>
                {scheduler}
              </option>
            ))}
          </select>
        </div>

        {/* Resolution */}
        <div className="col-span-2">
          <label
            htmlFor="resolution"
            className="block text-sm font-medium text-text-secondary mb-2"
          >
            Resolution
          </label>
          <div className="grid grid-cols-5 gap-2">
            {resolutions.map((res) => (
              <motion.button
                key={res.label}
                onClick={() =>
                  setConfig({ ...config, width: res.width, height: res.height })
                }
                className={`
                  px-3 py-2 rounded-lg text-sm font-medium
                  transition-all duration-200
                  ${
                    config.width === res.width && config.height === res.height
                      ? 'bg-accent-primary text-white shadow-glow-purple'
                      : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover'
                  }
                `}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {res.label}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-accent-error/10 border border-accent-error/30"
        >
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-accent-error flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-accent-error">
                Failed to Save Settings
              </p>
              <p className="text-sm text-text-secondary mt-1">{error}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Preview */}
      <div className="p-4 rounded-lg bg-bg-secondary border border-border-primary">
        <p className="text-sm font-medium text-text-secondary mb-2">
          Configuration Summary
        </p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-text-tertiary">Checkpoint:</div>
          <div className="text-text-primary font-mono truncate">
            {config.checkpoint || 'None'}
          </div>
          <div className="text-text-tertiary">Steps:</div>
          <div className="text-text-primary">{config.steps}</div>
          <div className="text-text-tertiary">CFG Scale:</div>
          <div className="text-text-primary">{config.cfg}</div>
          <div className="text-text-tertiary">Sampler:</div>
          <div className="text-text-primary">{config.sampler}</div>
          <div className="text-text-tertiary">Scheduler:</div>
          <div className="text-text-primary">{config.scheduler}</div>
          <div className="text-text-tertiary">Resolution:</div>
          <div className="text-text-primary">
            {config.width}x{config.height}
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4">
        <motion.button
          onClick={onBack}
          disabled={saving}
          className="px-8 py-3 rounded-lg font-medium bg-bg-tertiary text-text-primary hover:bg-bg-hover transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          whileHover={{ scale: saving ? 1 : 1.05 }}
          whileTap={{ scale: saving ? 1 : 0.95 }}
        >
          ← Back
        </motion.button>

        <motion.button
          onClick={handleComplete}
          disabled={saving || !config.checkpoint}
          className={`
            px-8 py-3 rounded-lg font-medium
            transition-all duration-300
            ${
              saving || !config.checkpoint
                ? 'bg-bg-tertiary text-text-tertiary cursor-not-allowed'
                : 'bg-accent-success text-white hover:bg-accent-success/90 shadow-glow-purple'
            }
          `}
          whileHover={{ scale: saving || !config.checkpoint ? 1 : 1.05 }}
          whileTap={{ scale: saving || !config.checkpoint ? 1 : 0.95 }}
        >
          {saving ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Saving...</span>
            </div>
          ) : (
            'Complete Setup ✓'
          )}
        </motion.button>
      </div>
    </div>
  )
}
