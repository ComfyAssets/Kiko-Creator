import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Setup Wizard API Calls

export async function testComfyUIConnection(apiUrl) {
  try {
    const response = await api.post('/api/setup/test-connection', { apiUrl })
    return response.data
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message)
  }
}

export async function parseYAML(yamlPath) {
  try {
    const response = await api.post('/api/setup/parse-yaml', { yamlPath })
    return response.data
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message)
  }
}

export async function discoverModels(apiUrl, yamlPath, options = {}) {
  try {
    const { civitaiKey = null, calculateHashes = true, fetchMetadata = true } = options

    const response = await api.get('/api/setup/discover-models', {
      params: {
        apiUrl,
        yamlPath,
        civitaiKey,
        calculateHashes: calculateHashes.toString(),
        fetchMetadata: fetchMetadata.toString()
      },
      timeout: 0 // No timeout - use SSE for progress tracking
    })
    return response.data
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message)
  }
}

export async function saveSettings(settings) {
  try {
    const response = await api.post('/api/setup/save-settings', settings)
    return response.data
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message)
  }
}

// Character API Calls

export async function getCharacters(search = '', limit = 50, offset = 0) {
  try {
    const response = await api.get('/api/characters', {
      params: { search, limit, offset }
    })
    return response.data
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message)
  }
}

export async function getCharacter(id) {
  try {
    const response = await api.get(`/api/characters/${id}`)
    return response.data
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message)
  }
}

// Tag Autocomplete API Calls

export async function getTagAutocomplete(query, mode = 'prefix') {
  try {
    const response = await api.get('/api/tags/autocomplete', {
      params: { query, mode }
    })
    return response.data
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message)
  }
}

// ComfyUI Generation API Calls

export async function submitPrompt(workflow) {
  try {
    const response = await api.post('/api/comfyui/prompt', { workflow })
    return response.data
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message)
  }
}

export async function getHistory(promptId) {
  try {
    const response = await api.get(`/api/comfyui/history/${promptId}`)
    return response.data
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message)
  }
}

export default api
