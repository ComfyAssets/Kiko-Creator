import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useGalleryStore = create(
  persist(
    (set, get) => ({
      // Gallery images with metadata
      images: [],
      favorites: [],

      // Add image to gallery
      addImage: (image) => {
        const images = get().images
        const newImage = {
          ...image,
          id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now()
        }
        set({ images: [newImage, ...images] })
        return newImage
      },

      // Add multiple images
      addImages: (newImages) => {
        const images = get().images
        const timestampedImages = newImages.map((img, index) => ({
          ...img,
          id: img.id || `img_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: img.timestamp || Date.now()
        }))
        set({ images: [...timestampedImages, ...images] })
      },

      // Remove image
      removeImage: (imageId) => {
        const images = get().images.filter(img => img.id !== imageId)
        const favorites = get().favorites.filter(id => id !== imageId)
        set({ images, favorites })
      },

      // Remove multiple images
      removeImages: (imageIds) => {
        const images = get().images.filter(img => !imageIds.includes(img.id))
        const favorites = get().favorites.filter(id => !imageIds.includes(id))
        set({ images, favorites })
      },

      // Clear all images
      clearImages: () => {
        set({ images: [], favorites: [] })
      },

      // Toggle favorite
      toggleFavorite: (imageId) => {
        const favorites = get().favorites
        if (favorites.includes(imageId)) {
          set({ favorites: favorites.filter(id => id !== imageId) })
        } else {
          set({ favorites: [...favorites, imageId] })
        }
      },

      // Check if image is favorite
      isFavorite: (imageId) => {
        return get().favorites.includes(imageId)
      },

      // Get favorites
      getFavorites: () => {
        const images = get().images
        const favorites = get().favorites
        return images.filter(img => favorites.includes(img.id))
      },

      // Get image by ID
      getImage: (imageId) => {
        return get().images.find(img => img.id === imageId)
      }
    }),
    {
      name: 'kiko-creator-gallery',
    }
  )
)
