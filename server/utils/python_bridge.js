import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Execute a Python script and return parsed JSON output
 * @param {string} scriptName - Name of Python script in utils directory
 * @param {string[]} args - Arguments to pass to the script
 * @param {Object} options - Execution options
 * @returns {Promise<Object>} Parsed JSON output from Python script
 */
export async function executePythonScript(scriptName, args = [], options = {}) {
  const {
    timeout = 10000,
    pythonExecutable = 'python3'
  } = options

  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, scriptName)

    // Spawn Python process
    const pythonProcess = spawn(pythonExecutable, [scriptPath, ...args], {
      stdio: ['pipe', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''
    let timeoutId

    // Set timeout
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        pythonProcess.kill('SIGTERM')
        reject(new Error(`Python script timeout after ${timeout}ms`))
      }, timeout)
    }

    // Collect stdout
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    // Collect stderr
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    // Handle process completion
    pythonProcess.on('close', (code) => {
      if (timeoutId) clearTimeout(timeoutId)

      if (code !== 0) {
        reject(new Error(`Python script exited with code ${code}: ${stderr}`))
        return
      }

      try {
        // Parse JSON output
        const result = JSON.parse(stdout)

        // Check for error in result
        if (result.error) {
          reject(new Error(`Python script error: ${result.error}`))
          return
        }

        resolve(result)
      } catch (error) {
        reject(new Error(`Failed to parse Python output: ${error.message}\nOutput: ${stdout}`))
      }
    })

    // Handle process errors
    pythonProcess.on('error', (error) => {
      if (timeoutId) clearTimeout(timeoutId)
      reject(new Error(`Failed to spawn Python process: ${error.message}`))
    })
  })
}

/**
 * Check if Python is available
 * @param {string} pythonExecutable - Python executable to check
 * @returns {Promise<boolean>}
 */
export async function checkPythonAvailable(pythonExecutable = 'python3') {
  return new Promise((resolve) => {
    const pythonProcess = spawn(pythonExecutable, ['--version'], {
      stdio: ['pipe', 'pipe', 'pipe']
    })

    pythonProcess.on('close', (code) => {
      resolve(code === 0)
    })

    pythonProcess.on('error', () => {
      resolve(false)
    })

    // Kill after 2 seconds if still running
    setTimeout(() => {
      try {
        pythonProcess.kill('SIGTERM')
        resolve(false)
      } catch (e) {
        // Process already dead
      }
    }, 2000)
  })
}

/**
 * Find available Python executable
 * Checks python3, python, and common venv locations
 * @returns {Promise<string|null>} Python executable path or null
 */
export async function findPythonExecutable() {
  // Check standard executables
  const candidates = [
    'python3',
    'python',
  ]

  // Add common venv locations
  const projectRoot = path.join(__dirname, '../..')
  const venvPaths = [
    path.join(projectRoot, 'venv/bin/python'),
    path.join(projectRoot, '.venv/bin/python'),
    path.join(projectRoot, 'env/bin/python'),
  ]

  for (const venvPath of venvPaths) {
    candidates.unshift(venvPath) // Check venv first
  }

  // Test each candidate
  for (const candidate of candidates) {
    if (await checkPythonAvailable(candidate)) {
      return candidate
    }
  }

  return null
}

/**
 * Check if Python can run safetensors script
 * (No external dependencies needed - uses only stdlib)
 * @param {string} pythonExecutable - Python executable to check
 * @returns {Promise<boolean>}
 */
export async function checkSafetensorsAvailable(pythonExecutable = 'python3') {
  // Check if Python has required stdlib modules (json, struct)
  // These are always available in Python 3.x
  return new Promise((resolve) => {
    const pythonProcess = spawn(pythonExecutable, ['-c', 'import json, struct'], {
      stdio: ['pipe', 'pipe', 'pipe']
    })

    pythonProcess.on('close', (code) => {
      resolve(code === 0)
    })

    pythonProcess.on('error', () => {
      resolve(false)
    })

    // Kill after 2 seconds
    setTimeout(() => {
      try {
        pythonProcess.kill('SIGTERM')
        resolve(false)
      } catch (e) {
        // Process already dead
      }
    }, 2000)
  })
}
