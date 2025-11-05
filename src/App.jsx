import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useSettingsStore } from './stores/settingsStore'
import SetupWizard from './components/wizard/SetupWizard'
import MainLayout from './components/layout/MainLayout'
import CharactersPage from './pages/CharactersPage'
import GeneratePage from './pages/GeneratePage'
import GalleryPage from './pages/GalleryPage'
import ModelsPage from './pages/ModelsPage'
import SettingsPage from './pages/SettingsPage'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function App() {
  const { setupComplete, setSetupComplete } = useSettingsStore()
  const [isChecking, setIsChecking] = useState(true)

  // Check setup status and load models from server on mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check setup status
        const setupResponse = await fetch(`${API_URL}/api/setup/status`)
        if (setupResponse.ok) {
          const { setupComplete: serverSetupComplete } = await setupResponse.json()
          setSetupComplete(serverSetupComplete)
          console.log('📋 Setup status from server:', serverSetupComplete)

          // If setup is complete, load models from server
          if (serverSetupComplete) {
            try {
              const modelsResponse = await fetch(`${API_URL}/api/models/grouped`)
              if (modelsResponse.ok) {
                const { models } = await modelsResponse.json()
                useSettingsStore.getState().setModels(models)
                console.log('📦 Models loaded from server:', {
                  checkpoints: models.checkpoints.length,
                  loras: models.loras.length,
                  embeddings: models.embeddings.length
                })
              } else {
                console.warn('Failed to fetch models from server')
              }
            } catch (error) {
              console.error('Error loading models:', error)
            }
          }
        } else {
          console.warn('Failed to fetch setup status, assuming not complete')
          setSetupComplete(false)
        }
      } catch (error) {
        console.error('Error initializing app:', error)
        setSetupComplete(false)
      } finally {
        setIsChecking(false)
      }
    }

    initializeApp()
  }, [setSetupComplete])

  // Show loading state while checking setup status
  if (isChecking || setupComplete === null) {
    return (
      <div className="h-full w-full bg-bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <div className="h-full w-full bg-bg-primary">
        <Routes>
          {/* Setup wizard route - only accessible manually via /setup */}
          <Route path="/setup" element={<SetupWizard />} />

          {/* Main app routes with layout - always available */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<Navigate to="/generate" replace />} />
            <Route path="/characters" element={<CharactersPage />} />
            <Route path="/generate" element={<GeneratePage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/models" element={<ModelsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Redirect all other routes to generate */}
          <Route path="*" element={<Navigate to="/generate" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
