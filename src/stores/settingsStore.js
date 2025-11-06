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
        hasMira: false,
        modelsPath: '',      // Path to ComfyUI/models directory
        comfyuiDir: ''       // Path to ComfyUI installation root
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
        loras: [], // Now includes { name, path, triggerWords: [], description, baseModel }
        embeddings: [], // { name, fileName, description }
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

      // Toggle favorite upscaler
      toggleFavoriteUpscaler: (upscalerName) =>
        set((state) => {
          const favorites = state.favoriteUpscalers
          const isFavorite = favorites.includes(upscalerName)

          return {
            favoriteUpscalers: isFavorite
              ? favorites.filter(name => name !== upscalerName)
              : [...favorites, upscalerName]
          }
        }),

      // Toggle favorite embedding
      toggleFavoriteEmbedding: (embeddingName) =>
        set((state) => {
          const favorites = state.favoriteEmbeddings
          const isFavorite = favorites.includes(embeddingName)

          return {
            favoriteEmbeddings: isFavorite
              ? favorites.filter(name => name !== embeddingName)
              : [...favorites, embeddingName]
          }
        }),

      // Toggle hidden model
      toggleHiddenModel: (modelPath) =>
        set((state) => {
          const hidden = state.hiddenModels
          const isHidden = hidden.includes(modelPath)

          return {
            hiddenModels: isHidden
              ? hidden.filter(path => path !== modelPath)
              : [...hidden, modelPath]
          }
        })
    }),
    {
      name: 'kiko-creator-settings',
    }
  )
)
