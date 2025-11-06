export default function SettingsSummary({ settings }) {
  if (!settings) {
    return (
      <div className="text-text-tertiary text-sm text-center py-4">
        No settings to display
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Quality Tags */}
      {settings.qualityTags && (
        <div className="bg-bg-tertiary/50 rounded-lg p-3 border border-border-primary">
          <h4 className="text-xs font-semibold text-text-secondary mb-2 flex items-center gap-2">
            <span>⭐</span> Quality Tags
          </h4>
          <p className="text-sm text-text-primary line-clamp-3">
            {settings.qualityTags}
          </p>
        </div>
      )}

      {/* Model Configuration */}
      <div className="bg-bg-tertiary/50 rounded-lg p-3 border border-border-primary">
        <h4 className="text-xs font-semibold text-text-secondary mb-2 flex items-center gap-2">
          <span>📦</span> Model Configuration
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-tertiary">Checkpoint:</span>
            <span className="text-text-primary font-medium truncate ml-2">
              {settings.checkpoint || 'None'}
            </span>
          </div>
        </div>
      </div>

      {/* LoRAs */}
      {settings.loras && settings.loras.length > 0 && (
        <div className="bg-bg-tertiary/50 rounded-lg p-3 border border-border-primary">
          <h4 className="text-xs font-semibold text-text-secondary mb-2 flex items-center gap-2">
            <span>🎛️</span> LoRAs ({settings.loras.length})
          </h4>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {settings.loras.map((lora, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs">
                <span className="text-text-primary truncate flex-1">
                  {lora.lora}
                </span>
                <span className="text-text-tertiary ml-2 flex-shrink-0">
                  {lora.strength.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generation Parameters */}
      <div className="bg-bg-tertiary/50 rounded-lg p-3 border border-border-primary">
        <h4 className="text-xs font-semibold text-text-secondary mb-2 flex items-center gap-2">
          <span>⚙️</span> Generation Parameters
        </h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-text-tertiary">Steps:</span>
            <span className="text-text-primary font-medium">{settings.steps || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-tertiary">CFG:</span>
            <span className="text-text-primary font-medium">{settings.cfg || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-tertiary">Sampler:</span>
            <span className="text-text-primary font-medium truncate ml-1">
              {settings.sampler || 'N/A'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-tertiary">Scheduler:</span>
            <span className="text-text-primary font-medium truncate ml-1">
              {settings.scheduler || 'N/A'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-tertiary">Resolution:</span>
            <span className="text-text-primary font-medium">
              {settings.width}×{settings.height}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-tertiary">Batch:</span>
            <span className="text-text-primary font-medium">{settings.batchSize || 1}</span>
          </div>
          <div className="flex justify-between col-span-2">
            <span className="text-text-tertiary">Seed:</span>
            <span className="text-text-primary font-medium">
              {settings.randomSeed ? 'Random' : settings.seed}
            </span>
          </div>
        </div>
      </div>

      {/* Advanced Features */}
      {(settings.hiresFix?.enabled || settings.refiner?.enabled) && (
        <div className="bg-bg-tertiary/50 rounded-lg p-3 border border-border-primary">
          <h4 className="text-xs font-semibold text-text-secondary mb-2 flex items-center gap-2">
            <span>✨</span> Advanced Features
          </h4>
          <div className="space-y-2">
            {settings.hiresFix?.enabled && (
              <div className="text-xs">
                <div className="flex items-center gap-2 text-text-primary font-medium mb-1">
                  <span>🔍</span> Hires Fix
                </div>
                <div className="grid grid-cols-2 gap-1 text-text-tertiary ml-5">
                  <span>Model: {settings.hiresFix.model}</span>
                  <span>Scale: {settings.hiresFix.scale}×</span>
                  <span>Denoise: {settings.hiresFix.denoise}</span>
                  <span>Steps: {settings.hiresFix.steps}</span>
                </div>
              </div>
            )}
            {settings.refiner?.enabled && (
              <div className="text-xs">
                <div className="flex items-center gap-2 text-text-primary font-medium mb-1">
                  <span>✨</span> Refiner
                </div>
                <div className="grid grid-cols-2 gap-1 text-text-tertiary ml-5">
                  <span className="col-span-2 truncate">Model: {settings.refiner.model}</span>
                  <span>Ratio: {settings.refiner.ratio}</span>
                  <span>Add Noise: {settings.refiner.addNoise ? 'Yes' : 'No'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
