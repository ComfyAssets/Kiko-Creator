import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useGenerationStore = create(
  persist(
    (set, get) => ({
      // Generation settings that should be shared across pages
      prompt: '',
      negativePrompt: 'nsfw, nude, nudity, explicit, bad quality, worst quality, low quality, blurry',

      // Recently selected characters
      recentCharacters: [],
      maxRecentCharacters: 10,

      // Custom characters created by user
      customCharacters: [],

      // Actions
      setPrompt: (prompt) => set({ prompt }),

      setNegativePrompt: (negativePrompt) => set({ negativePrompt }),

      appendToPrompt: (text) => {
        const currentPrompt = get().prompt
        const separator = currentPrompt.trim() ? ', ' : ''
        set({ prompt: currentPrompt + separator + text })
      },

      addCharacterToPrompt: (character) => {
        const { englishTag, chineseName, hash, customPrompt, isCustom } = character
        const currentPrompt = get().prompt

        // Check if character tag is already in the prompt
        if (currentPrompt.includes(englishTag)) {
          return { success: false, message: 'Character already in prompt' }
        }

        // Build the prompt text to add
        let promptToAdd = englishTag

        // For custom characters, append their custom prompt if it exists
        if (isCustom && customPrompt && customPrompt.trim()) {
          promptToAdd = `${englishTag}, ${customPrompt.trim()}`
        }

        // Append to prompt
        const separator = currentPrompt.trim() ? ', ' : ''
        set({ prompt: currentPrompt + separator + promptToAdd })

        // Add to recent characters list
        const recentCharacters = get().recentCharacters
        const updatedRecent = [
          { englishTag, chineseName, hash, timestamp: Date.now() },
          ...recentCharacters.filter(c => c.hash !== hash)
        ].slice(0, get().maxRecentCharacters)

        set({ recentCharacters: updatedRecent })

        return { success: true, message: `Added ${chineseName} to prompt` }
      },

      removeFromPrompt: (text) => {
        const currentPrompt = get().prompt
        // Remove the text and clean up extra commas/spaces
        const updatedPrompt = currentPrompt
          .split(',')
          .map(part => part.trim())
          .filter(part => part !== text.trim())
          .join(', ')
        set({ prompt: updatedPrompt })
      },

      clearPrompt: () => set({ prompt: '' }),

      clearRecentCharacters: () => set({ recentCharacters: [] }),

      // Custom character management
      addCustomCharacter: (characterData) => {
        const { chineseName, englishTag, series, customPrompt } = characterData
        const customCharacters = get().customCharacters

        // Check if already exists
        if (customCharacters.some(c => c.englishTag === englishTag)) {
          return { success: false, message: 'Character already exists' }
        }

        // Generate a simple hash for the custom character (using timestamp + tag)
        const hash = `custom_${Date.now()}_${englishTag.replace(/\s+/g, '_')}`

        const newCharacter = {
          id: `custom_${Date.now()}`,
          chineseName,
          englishTag,
          series: series || 'custom',
          customPrompt: customPrompt || '',
          hash,
          isCustom: true,
          createdAt: Date.now()
        }

        set({ customCharacters: [...customCharacters, newCharacter] })
        return { success: true, message: `Created ${chineseName}`, character: newCharacter }
      },

      updateCustomCharacter: (characterId, updates) => {
        const customCharacters = get().customCharacters
        const updatedCharacters = customCharacters.map(char =>
          char.id === characterId ? { ...char, ...updates } : char
        )
        set({ customCharacters: updatedCharacters })
        return { success: true, message: 'Character updated' }
      },

      deleteCustomCharacter: (characterId) => {
        const customCharacters = get().customCharacters
        set({ customCharacters: customCharacters.filter(c => c.id !== characterId) })
      },

      setCustomCharacterImage: (characterId, imageDataUrl) => {
        const customCharacters = get().customCharacters
        const updatedCharacters = customCharacters.map(char =>
          char.id === characterId ? { ...char, customImage: imageDataUrl } : char
        )
        set({ customCharacters: updatedCharacters })
      },

      getCustomCharacters: () => get().customCharacters
    }),
    {
      name: 'kiko-creator-generation',
    }
  )
)
