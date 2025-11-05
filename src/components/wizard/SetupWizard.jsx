import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ConnectionStep from './ConnectionStep'
import CivitAIStep from './CivitAIStep'
import ModelDiscoveryStep from './ModelDiscoveryStep'
import ConfigurationStep from './ConfigurationStep'

const steps = [
  { id: 1, name: 'Connection', description: 'Connect to ComfyUI API' },
  { id: 2, name: 'CivitAI', description: 'Configure CivitAI API' },
  { id: 3, name: 'Discovery', description: 'Discover models and LoRAs' },
  { id: 4, name: 'Configuration', description: 'Configure defaults' }
]

export default function SetupWizard() {
  const [currentStep, setCurrentStep] = useState(1)

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  return (
    <div className="min-h-screen w-full bg-bg-primary flex items-center justify-center p-8">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-bold text-accent-primary mb-4 glow-hover-purple"
          >
            Kiko Creator
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-text-secondary text-lg"
          >
            Let's get you set up with ComfyUI
          </motion.p>
        </div>

        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-between relative">
            {/* Progress Line */}
            <div className="absolute top-5 left-0 w-full h-1 bg-bg-tertiary -z-10">
              <motion.div
                className="h-full bg-accent-primary"
                initial={{ width: '0%' }}
                animate={{ width: `${((currentStep - 1) / 3) * 100}%` }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
              />
            </div>

            {steps.map((step) => (
              <div key={step.id} className="flex flex-col items-center w-1/4">
                <motion.div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-bold mb-2
                    transition-all duration-300
                    ${
                      currentStep >= step.id
                        ? 'bg-accent-primary text-white shadow-glow-purple'
                        : 'bg-bg-tertiary text-text-tertiary'
                    }
                  `}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {step.id}
                </motion.div>
                <div className="text-center">
                  <div
                    className={`
                      text-sm font-medium mb-1
                      ${currentStep >= step.id ? 'text-text-primary' : 'text-text-tertiary'}
                    `}
                  >
                    {step.name}
                  </div>
                  <div className="text-xs text-text-secondary hidden sm:block">
                    {step.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="glass rounded-2xl p-8 shadow-2xl min-h-[400px]"
          >
            {currentStep === 1 && <ConnectionStep onNext={nextStep} />}
            {currentStep === 2 && <CivitAIStep onNext={nextStep} onBack={prevStep} />}
            {currentStep === 3 && (
              <ModelDiscoveryStep onNext={nextStep} onBack={prevStep} />
            )}
            {currentStep === 4 && <ConfigurationStep onBack={prevStep} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
