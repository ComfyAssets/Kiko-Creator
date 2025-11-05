import { EventEmitter } from 'events'

// Progress event emitter for long-running operations
class ProgressTracker extends EventEmitter {
  constructor() {
    super()
    this.currentScan = null
  }

  startScan(scanId) {
    this.currentScan = {
      scanId,
      phase: 'initializing',
      progress: 0,
      total: 0,
      current: 0,
      message: 'Starting scan...',
      startTime: Date.now()
    }
    this.emit('progress', this.currentScan)
  }

  updatePhase(phase, message) {
    if (!this.currentScan) return

    this.currentScan.phase = phase
    this.currentScan.message = message
    this.emit('progress', this.currentScan)
  }

  updateProgress(current, total, message) {
    if (!this.currentScan) return

    this.currentScan.current = current
    this.currentScan.total = total
    this.currentScan.progress = total > 0 ? Math.round((current / total) * 100) : 0
    if (message) this.currentScan.message = message
    this.emit('progress', this.currentScan)
  }

  modelProcessing(modelName, action, cached = false) {
    if (!this.currentScan) return

    this.currentScan.current++
    this.currentScan.progress = this.currentScan.total > 0
      ? Math.round((this.currentScan.current / this.currentScan.total) * 100)
      : 0

    const cacheStatus = cached ? ' (cached)' : ''
    this.currentScan.message = `${action}: ${modelName}${cacheStatus}`
    this.emit('progress', this.currentScan)
  }

  completeScan(stats) {
    if (!this.currentScan) return

    const duration = Math.round((Date.now() - this.currentScan.startTime) / 1000)

    this.currentScan.phase = 'completed'
    this.currentScan.progress = 100
    this.currentScan.message = `Scan complete in ${duration}s!`
    this.currentScan.stats = stats
    this.emit('progress', this.currentScan)

    // Clear after a delay
    setTimeout(() => {
      this.currentScan = null
    }, 5000)
  }

  errorScan(error) {
    if (!this.currentScan) return

    this.currentScan.phase = 'error'
    this.currentScan.message = error.message || 'Scan failed'
    this.currentScan.error = error.message
    this.emit('progress', this.currentScan)

    // Clear after a delay
    setTimeout(() => {
      this.currentScan = null
    }, 10000)
  }

  getCurrentProgress() {
    return this.currentScan
  }
}

// Singleton instance
const progressTracker = new ProgressTracker()

export default progressTracker
