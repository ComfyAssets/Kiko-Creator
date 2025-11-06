import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Generate unique ID (simple implementation)
const generateId = () => {
  return `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export const usePresetStore = create(
  persist(
    (set, get) => ({
      presets: [],

      // Create new preset
      createPreset: (name, description, settings) => {
        const existingPreset = get().presets.find(p => p.name === name)
        if (existingPreset) {
          return { success: false, message: 'A preset with this name already exists' }
        }

        const newPreset = {
          id: generateId(),
          name: name.trim(),
          description: description?.trim() || '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isFavorite: false,
          usageCount: 0,
          settings: JSON.parse(JSON.stringify(settings)) // Deep clone
        }

        set(state => ({
          presets: [...state.presets, newPreset]
        }))

        return { success: true, message: `Created preset: ${name}`, preset: newPreset }
      },

      // Update existing preset
      updatePreset: (id, updates) => {
        const preset = get().presets.find(p => p.id === id)
        if (!preset) {
          return { success: false, message: 'Preset not found' }
        }

        // If name is being updated, check for duplicates
        if (updates.name && updates.name !== preset.name) {
          const existingPreset = get().presets.find(p => p.name === updates.name && p.id !== id)
          if (existingPreset) {
            return { success: false, message: 'A preset with this name already exists' }
          }
        }

        set(state => ({
          presets: state.presets.map(p =>
            p.id === id
              ? { ...p, ...updates, updatedAt: Date.now() }
              : p
          )
        }))

        return { success: true, message: 'Preset updated' }
      },

      // Delete preset
      deletePreset: (id) => {
        const preset = get().presets.find(p => p.id === id)
        if (!preset) {
          return { success: false, message: 'Preset not found' }
        }

        set(state => ({
          presets: state.presets.filter(p => p.id !== id)
        }))

        return { success: true, message: `Deleted preset: ${preset.name}` }
      },

      // Duplicate preset
      duplicatePreset: (id) => {
        const preset = get().presets.find(p => p.id === id)
        if (!preset) {
          return { success: false, message: 'Preset not found' }
        }

        // Generate unique name
        let newName = `${preset.name} (Copy)`
        let counter = 1
        while (get().presets.find(p => p.name === newName)) {
          counter++
          newName = `${preset.name} (Copy ${counter})`
        }

        const duplicate = {
          ...JSON.parse(JSON.stringify(preset)), // Deep clone
          id: generateId(),
          name: newName,
          isFavorite: false,
          usageCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }

        set(state => ({
          presets: [...state.presets, duplicate]
        }))

        return { success: true, message: `Duplicated preset as: ${newName}`, preset: duplicate }
      },

      // Apply preset (increment usage count)
      applyPreset: (id) => {
        set(state => ({
          presets: state.presets.map(p =>
            p.id === id
              ? { ...p, usageCount: p.usageCount + 1 }
              : p
          )
        }))
      },

      // Toggle favorite
      toggleFavorite: (id) => {
        const preset = get().presets.find(p => p.id === id)
        if (!preset) return { success: false }

        set(state => ({
          presets: state.presets.map(p =>
            p.id === id
              ? { ...p, isFavorite: !p.isFavorite }
              : p
          )
        }))

        return {
          success: true,
          isFavorite: !preset.isFavorite,
          message: preset.isFavorite ? 'Removed from favorites' : 'Added to favorites'
        }
      },

      // Get preset by ID
      getPreset: (id) => {
        return get().presets.find(p => p.id === id)
      },

      // Search presets
      searchPresets: (query) => {
        if (!query || !query.trim()) {
          return get().presets
        }

        const lowerQuery = query.toLowerCase().trim()
        return get().presets.filter(p =>
          p.name.toLowerCase().includes(lowerQuery) ||
          p.description?.toLowerCase().includes(lowerQuery) ||
          p.settings.checkpoint?.toLowerCase().includes(lowerQuery)
        )
      },

      // Get presets by checkpoint model
      getPresetsByModel: (checkpointName) => {
        return get().presets.filter(p =>
          p.settings.checkpoint === checkpointName
        )
      },

      // Get favorite presets
      getFavoritePresets: () => {
        return get().presets.filter(p => p.isFavorite)
      },

      // Get presets sorted by usage
      getPresetsByUsage: () => {
        return [...get().presets].sort((a, b) => b.usageCount - a.usageCount)
      },

      // Get presets sorted by date
      getPresetsByDate: (ascending = false) => {
        return [...get().presets].sort((a, b) =>
          ascending ? a.createdAt - b.createdAt : b.createdAt - a.createdAt
        )
      },

      // Export preset as JSON
      exportPreset: (id) => {
        const preset = get().presets.find(p => p.id === id)
        if (!preset) {
          return { success: false, message: 'Preset not found' }
        }

        const exportData = {
          version: '1.0',
          exportedAt: Date.now(),
          preset: {
            name: preset.name,
            description: preset.description,
            settings: preset.settings
          }
        }

        return { success: true, data: JSON.stringify(exportData, null, 2) }
      },

      // Import preset from JSON
      importPreset: (jsonString) => {
        try {
          const importData = JSON.parse(jsonString)

          if (!importData.preset || !importData.preset.name || !importData.preset.settings) {
            return { success: false, message: 'Invalid preset format' }
          }

          // Check if preset with same name exists
          let name = importData.preset.name
          let counter = 1
          while (get().presets.find(p => p.name === name)) {
            counter++
            name = `${importData.preset.name} (Imported ${counter})`
          }

          const newPreset = {
            id: generateId(),
            name,
            description: importData.preset.description || '',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            isFavorite: false,
            usageCount: 0,
            settings: importData.preset.settings
          }

          set(state => ({
            presets: [...state.presets, newPreset]
          }))

          return { success: true, message: `Imported preset: ${name}`, preset: newPreset }
        } catch (error) {
          return { success: false, message: 'Failed to parse preset file' }
        }
      }
    }),
    {
      name: 'kiko-creator-presets',
      version: 1
    }
  )
)
