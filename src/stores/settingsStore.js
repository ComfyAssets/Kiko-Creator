import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useSettingsStore = create(
  persist(
    (set) => ({
      // Setup completion flag (will be loaded from server)
      setupComplete: null, // null = not checked yet, true/false after server check

      // ComfyUI connection settings
      comfyui: {
        apiUrl: 'http://127.0.0.1:8188',
        connected: false,
        version: null,
        hasMira: false
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
        embeddings: []
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

      // Actions
      setComfyUIConnection: (connectionData) =>
        set((state) => ({
          comfyui: { ...state.comfyui, ...connectionData }
        })),

      setCivitAI: (civitaiData) =>
        set((state) => ({
          civitai: { ...state.civitai, ...civitaiData }
        })),

      setModelPaths: (paths) =>
        set({ modelPaths: paths }),

      setModels: (models) =>
        set({ models }),

      setCheckpoints: (checkpoints) =>
        set((state) => ({
          models: { ...state.models, checkpoints }
        })),

      setLoras: (loras) =>
        set((state) => ({
          models: { ...state.models, loras }
        })),

      setDefaults: (defaults) =>
        set((state) => ({
          defaults: { ...state.defaults, ...defaults }
        })),

      setSetupComplete: (status) =>
        set({ setupComplete: status }),

      completeSetup: () =>
        set({ setupComplete: true }),

      resetSetup: () =>
        set({
          setupComplete: false,
          comfyui: {
            apiUrl: 'http://127.0.0.1:8188',
            connected: false,
            version: null,
            hasMira: false
          }
        }),

      // Toggle favorite checkpoint
      toggleFavoriteCheckpoint: (checkpointName) =>
        set((state) => {
          const favorites = state.favoriteCheckpoints
          const isFavorite = favorites.includes(checkpointName)

          return {
            favoriteCheckpoints: isFavorite
              ? favorites.filter(name => name !== checkpointName)
              : [...favorites, checkpointName]
          }
        }),

      // Check if a checkpoint is favorited
      isFavoriteCheckpoint: (checkpointName) =>
        (get) => get().favoriteCheckpoints.includes(checkpointName)
    }),
    {
      name: 'kiko-creator-settings',
    }
  )
)
