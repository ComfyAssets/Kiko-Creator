import { NavLink, Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useSettingsStore } from '../../stores/settingsStore'

export default function MainLayout() {
  const { comfyui } = useSettingsStore()

  const navItems = [
    {
      path: '/characters',
      label: 'Characters',
      icon: '👤',
      description: 'Browse and select characters'
    },
    {
      path: '/generate',
      label: 'Generate',
      icon: '✨',
      description: 'Create AI images'
    },
    {
      path: '/gallery',
      label: 'Gallery',
      icon: '🖼️',
      description: 'View generated images'
    },
    {
      path: '/models',
      label: 'Models',
      icon: '🎨',
      description: 'Manage checkpoints & LoRAs'
    },
    {
      path: '/settings',
      label: 'Settings',
      icon: '⚙️',
      description: 'Configure application'
    }
  ]

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col md:flex-row">
      {/* Desktop Sidebar - hidden on mobile */}
      <aside className="hidden md:flex w-64 bg-bg-secondary border-r border-border-primary flex-col">
        {/* Logo/Header */}
        <div className="p-6 border-b border-border-primary">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
            Kiko Creator
          </h1>
          <p className="text-sm text-text-tertiary mt-1">
            AI Image Generation
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-lg
                transition-all duration-200
                ${
                  isActive
                    ? 'bg-accent-primary text-white shadow-glow-purple'
                    : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                }
              `}
            >
              {({ isActive }) => (
                <motion.div
                  className="flex items-center gap-3 w-full"
                  whileHover={{ x: isActive ? 0 : 4 }}
                  transition={{ duration: 0.2 }}
                >
                  <span className="text-2xl">{item.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium">{item.label}</div>
                    {!isActive && (
                      <div className="text-xs text-text-tertiary mt-0.5">
                        {item.description}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border-primary">
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                comfyui.connected ? 'bg-accent-success animate-pulse' : 'bg-text-tertiary'
              }`}
            />
            <span className="text-text-secondary">
              {comfyui.connected ? 'ComfyUI Connected' : 'Not Connected'}
            </span>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-bg-secondary border-b border-border-primary p-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎨</span>
          <h1 className="text-lg font-bold text-text-primary">Kiko Creator</h1>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              comfyui.connected ? 'bg-accent-success animate-pulse' : 'bg-text-tertiary'
            }`}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        <div className="container mx-auto p-4 md:p-6 max-w-7xl">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-bg-secondary border-t border-border-primary z-50 safe-area-inset-bottom">
        <div className="grid grid-cols-5 gap-1 p-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-3 px-2 rounded-lg transition-all duration-200 min-h-[60px] ${
                  isActive
                    ? 'bg-accent-primary text-white'
                    : 'text-text-secondary active:bg-bg-hover'
                }`
              }
            >
              <span className="text-2xl mb-1">{item.icon}</span>
              <span className="text-[10px] font-medium truncate w-full text-center leading-tight">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
