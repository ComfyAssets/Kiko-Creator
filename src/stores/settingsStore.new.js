import { create } from 'zustand'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Debounce helper
function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

export const useSettingsStore = create((set, get) => ({
  // Loading and error states
  loading: false,
  error: null,
  initialized: false,

  // Setup completion flag
  setupComplete: null, // null = not checked yet, true/false after loaded

  // ComfyUI connection settings
  comfyui: {
    apiUrl: 'http://127.0.0.1:8188',
    connected: false,
    version: null,
    hasMira: false,
    modelsPath: '',
    comfyuiDir: ''
  },

  // CivitAI settings
  civitai: {
    apiKey: '',
    huggingfaceToken: '',
    enabled: false
  },

  // Model paths discovered from YAML
  modelPaths: {
    checkpoints: [],
    loras: [],
    embeddings: []
  },

  // Discovered models
  models: {
    checkpoints: [],
    loras: [],
    embeddings: [],
    upscalers: []
  },

  // User preferences
  defaults: {
    checkpoint: null,
    loras: [],
    steps: 20,
    cfg: 7,
    sampler: 'euler_ancestral',
    scheduler: 'normal',
    width: 512,
    height: 512
  },

  // Favorite checkpoints (by model name/path)
  favoriteCheckpoints: [],

  // Favorite upscalers (by model name)
  favoriteUpscalers: [],

  // Favorite embeddings (by name)
  favoriteEmbeddings: [],

  // Hidden models (by model path)
  hiddenModels: [],

  // ==================== API Methods ====================

  /**
   * Load settings from database
   */
  loadSettings: async () => {
    set({ loading: true, error: null })

    try {
      const response = await fetch(`${API_URL}/api/settings`)

      if (!response.ok) {
        throw new Error(`Failed to load settings: ${response.statusText}`)
      }

      const settings = await response.json()

      // Map database keys to store structure
      const mapped = {
        setupComplete: settings.setup_complete ?? false,
        comfyui: {
          apiUrl: settings.comfyui_api_url ?? 'http://127.0.0.1:8188',
          modelsPath: settings.comfyui_models_path ?? '',
          comfyuiDir: settings.comfyui_dir ?? '',
          version: settings.comfyui_version ?? null,
          hasMira: settings.comfyui_has_mira ?? false,
          connected: false // Always start disconnected, will test connection separately
        },
        civitai: {
          apiKey: settings.civitai_api_key ?? '',
          huggingfaceToken: settings.civitai_huggingface_token ?? '',
          enabled: settings.civitai_enabled ?? false
        },
        defaults: {
          checkpoint: settings.defaults_checkpoint ?? null,
          loras: settings.defaults_loras ?? [],
          steps: settings.defaults_steps ?? 20,
          cfg: settings.defaults_cfg ?? 7,
          sampler: settings.defaults_sampler ?? 'euler_ancestral',
          scheduler: settings.defaults_scheduler ?? 'normal',
          width: settings.defaults_width ?? 512,
          height: settings.defaults_height ?? 512
        },
        favoriteCheckpoints: settings.favorite_checkpoints ?? [],
        favoriteUpscalers: settings.favorite_upscalers ?? [],
        favoriteEmbeddings: settings.favorite_embeddings ?? [],
        hiddenModels: settings.hidden_models ?? []
      }

      set({ ...mapped, loading: false, initialized: true })
      console.log('✅ Settings loaded from database')

      return mapped
    } catch (error) {
      console.error('Failed to load settings from database:', error)
      set({ loading: false, error: error.message })

      // Try to load from localStorage as fallback
      try {
        const localStorageData = localStorage.getItem('kiko-creator-settings')
        if (localStorageData) {
          const parsed = JSON.parse(localStorageData)
          if (parsed.state) {
            console.log('⚠️ Loaded settings from localStorage fallback')
            set({ ...parsed.state, loading: false, initialized: true })
            return parsed.state
          }
        }
      } catch (fallbackError) {
        console.error('localStorage fallback also failed:', fallbackError)
      }

      throw error
    }
  },

  /**
   * Save settings to database (debounced)
   */
  saveSettings: debounce(async (updates) => {
    const state = get()

    // Build database-compatible updates object
    const dbUpdates = {}

    // Map store structure to database keys
    if (updates.setupComplete !== undefined) {
      dbUpdates.setup_complete = updates.setupComplete
    }

    if (updates.comfyui) {
      if (updates.comfyui.apiUrl !== undefined) dbUpdates.comfyui_api_url = updates.comfyui.apiUrl
      if (updates.comfyui.modelsPath !== undefined) dbUpdates.comfyui_models_path = updates.comfyui.modelsPath
      if (updates.comfyui.comfyuiDir !== undefined) dbUpdates.comfyui_dir = updates.comfyui.comfyuiDir
      if (updates.comfyui.version !== undefined) dbUpdates.comfyui_version = updates.comfyui.version
      if (updates.comfyui.hasMira !== undefined) dbUpdates.comfyui_has_mira = updates.comfyui.hasMira
    }

    if (updates.civitai) {
      if (updates.civitai.apiKey !== undefined) dbUpdates.civitai_api_key = updates.civitai.apiKey
      if (updates.civitai.huggingfaceToken !== undefined) dbUpdates.civitai_huggingface_token = updates.civitai.huggingfaceToken
      if (updates.civitai.enabled !== undefined) dbUpdates.civitai_enabled = updates.civitai.enabled
    }

    if (updates.defaults) {
      if (updates.defaults.checkpoint !== undefined) dbUpdates.defaults_checkpoint = updates.defaults.checkpoint
      if (updates.defaults.loras !== undefined) dbUpdates.defaults_loras = updates.defaults.loras
      if (updates.defaults.steps !== undefined) dbUpdates.defaults_steps = updates.defaults.steps
      if (updates.defaults.cfg !== undefined) dbUpdates.defaults_cfg = updates.defaults.cfg
      if (updates.defaults.sampler !== undefined) dbUpdates.defaults_sampler = updates.defaults.sampler
      if (updates.defaults.scheduler !== undefined) dbUpdates.defaults_scheduler = updates.defaults.scheduler
      if (updates.defaults.width !== undefined) dbUpdates.defaults_width = updates.defaults.width
      if (updates.defaults.height !== undefined) dbUpdates.defaults_height = updates.defaults.height
    }

    if (updates.favoriteCheckpoints !== undefined) dbUpdates.favorite_checkpoints = updates.favoriteCheckpoints
    if (updates.favoriteUpscalers !== undefined) dbUpdates.favorite_upscalers = updates.favoriteUpscalers
    if (updates.favoriteEmbeddings !== undefined) dbUpdates.favorite_embeddings = updates.favoriteEmbeddings
    if (updates.hiddenModels !== undefined) dbUpdates.hidden_models = updates.hiddenModels

    // Skip save if no updates
    if (Object.keys(dbUpdates).length === 0) {
      return
    }

    try {
      const response = await fetch(`${API_URL}/api/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dbUpdates)
      })

      if (!response.ok) {
        throw new Error(`Failed to save settings: ${response.statusText}`)
      }

      console.log('✅ Settings saved to database:', Object.keys(dbUpdates))
    } catch (error) {
      console.error('Failed to save settings to database:', error)
      set({ error: error.message })
    }
  }, 500), // Debounce for 500ms

  // ==================== Actions with Optimistic Updates ====================

  setComfyUIConnection: (connectionData) => {
    set((state) => ({
      comfyui: { ...state.comfyui, ...connectionData }
    }))
    get().saveSettings({ comfyui: connectionData })
  },

  setCivitAI: (civitaiData) => {
    set((state) => ({
      civitai: { ...state.civitai, ...civitaiData }
    }))
    get().saveSettings({ civitai: civitaiData })
  },

  setModelPaths: (paths) => {
    set({ modelPaths: paths })
    // Model paths are derived from YAML, not saved to settings
  },

  setModels: (models) => {
    set({ models })
    // Models list is derived from scans, not saved to settings
  },

  setCheckpoints: (checkpoints) => {
    set((state) => ({
      models: { ...state.models, checkpoints }
    }))
  },

  setLoras: (loras) => {
    set((state) => ({
      models: { ...state.models, loras }
    }))
  },

  setDefaults: (defaults) => {
    set((state) => ({
      defaults: { ...state.defaults, ...defaults }
    }))
    get().saveSettings({ defaults })
  },

  setSetupComplete: (status) => {
    set({ setupComplete: status })
    get().saveSettings({ setupComplete: status })
  },

  completeSetup: () => {
    set({ setupComplete: true })
    get().saveSettings({ setupComplete: true })
  },

  reopenSetup: () => {
    set({ setupComplete: false })
    get().saveSettings({ setupComplete: false })
  },

  resetSetup: () => {
    const resetData = {
      setupComplete: false,
      comfyui: {
        apiUrl: 'http://127.0.0.1:8188',
        connected: false,
        version: null,
        hasMira: false
      }
    }
    set(resetData)
    get().saveSettings(resetData)
  },

  toggleFavoriteCheckpoint: (checkpointName) => {
    set((state) => {
      const favorites = state.favoriteCheckpoints
      const isFavorite = favorites.includes(checkpointName)

      const newFavorites = isFavorite
        ? favorites.filter(name => name !== checkpointName)
        : [...favorites, checkpointName]

      get().saveSettings({ favoriteCheckpoints: newFavorites })

      return { favoriteCheckpoints: newFavorites }
    })
  },

  toggleFavoriteUpscaler: (upscalerName) => {
    set((state) => {
      const favorites = state.favoriteUpscalers
      const isFavorite = favorites.includes(upscalerName)

      const newFavorites = isFavorite
        ? favorites.filter(name => name !== upscalerName)
        : [...favorites, upscalerName]

      get().saveSettings({ favoriteUpscalers: newFavorites })

      return { favoriteUpscalers: newFavorites }
    })
  },

  toggleFavoriteEmbedding: (embeddingName) => {
    set((state) => {
      const favorites = state.favoriteEmbeddings
      const isFavorite = favorites.includes(embeddingName)

      const newFavorites = isFavorite
        ? favorites.filter(name => name !== embeddingName)
        : [...favorites, embeddingName]

      get().saveSettings({ favoriteEmbeddings: newFavorites })

      return { favoriteEmbeddings: newFavorites }
    })
  },

  toggleHiddenModel: (modelPath) => {
    set((state) => {
      const hidden = state.hiddenModels
      const isHidden = hidden.includes(modelPath)

      const newHidden = isHidden
        ? hidden.filter(path => path !== modelPath)
        : [...hidden, modelPath]

      get().saveSettings({ hiddenModels: newHidden })

      return { hiddenModels: newHidden }
    })
  }
}))
