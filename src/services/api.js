const API_BASE = '/api'

// Helper for fetch with error handling
async function fetchJSON(url, options = {}) {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

// ============ Config ============

export async function getConfig() {
  return fetchJSON('/config')
}

export async function setConfig(projectsDirectory) {
  return fetchJSON('/config', {
    method: 'PUT',
    body: JSON.stringify({ projectsDirectory })
  })
}

// ============ Projects ============

export async function listProjects() {
  return fetchJSON('/projects')
}

export async function createProject(name) {
  return fetchJSON('/projects', {
    method: 'POST',
    body: JSON.stringify({ name })
  })
}

export async function getProject(id) {
  return fetchJSON(`/projects/${encodeURIComponent(id)}`)
}

export async function updateProject(id, data) {
  return fetchJSON(`/projects/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

export async function deleteProject(id) {
  return fetchJSON(`/projects/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  })
}

// ============ Exports ============

export async function listExports(projectId) {
  return fetchJSON(`/projects/${encodeURIComponent(projectId)}/exports`)
}

export async function saveExport(projectId, filename, data, encoding = 'text') {
  return fetchJSON(`/projects/${encodeURIComponent(projectId)}/exports`, {
    method: 'POST',
    body: JSON.stringify({ filename, data, encoding })
  })
}

export async function saveExportBinary(projectId, filename, blob) {
  const formData = new FormData()
  formData.append('file', blob, filename)

  const response = await fetch(`${API_BASE}/projects/${encodeURIComponent(projectId)}/exports`, {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

export async function deleteExport(projectId, filename) {
  return fetchJSON(`/projects/${encodeURIComponent(projectId)}/exports/${encodeURIComponent(filename)}`, {
    method: 'DELETE'
  })
}

// ============ Snapshots ============

export async function listSnapshots(projectId) {
  return fetchJSON(`/projects/${encodeURIComponent(projectId)}/snapshots`)
}

export async function saveSnapshot(projectId, name, snapshotData) {
  return fetchJSON(`/projects/${encodeURIComponent(projectId)}/snapshots`, {
    method: 'POST',
    body: JSON.stringify({ name, ...snapshotData })
  })
}

export async function loadSnapshot(projectId, name) {
  return fetchJSON(`/projects/${encodeURIComponent(projectId)}/snapshots/${encodeURIComponent(name)}`)
}

export async function deleteSnapshot(projectId, name) {
  return fetchJSON(`/projects/${encodeURIComponent(projectId)}/snapshots/${encodeURIComponent(name)}`, {
    method: 'DELETE'
  })
}

// ============ Layer States ============

export async function listLayerStates(projectId) {
  return fetchJSON(`/projects/${encodeURIComponent(projectId)}/layer-states`)
}

export async function saveLayerState(projectId, name, layerStateData) {
  return fetchJSON(`/projects/${encodeURIComponent(projectId)}/layer-states`, {
    method: 'POST',
    body: JSON.stringify({ name, ...layerStateData })
  })
}

export async function loadLayerState(projectId, name) {
  return fetchJSON(`/projects/${encodeURIComponent(projectId)}/layer-states/${encodeURIComponent(name)}`)
}

export async function deleteLayerState(projectId, name) {
  return fetchJSON(`/projects/${encodeURIComponent(projectId)}/layer-states/${encodeURIComponent(name)}`, {
    method: 'DELETE'
  })
}

// ============ Style Presets ============

export async function listStylePresets() {
  return fetchJSON('/style-presets')
}

export async function saveStylePreset(name, presetData) {
  return fetchJSON('/style-presets', {
    method: 'POST',
    body: JSON.stringify({ name, ...presetData })
  })
}

export async function loadStylePreset(name) {
  return fetchJSON(`/style-presets/${encodeURIComponent(name)}`)
}

export async function deleteStylePreset(name) {
  return fetchJSON(`/style-presets/${encodeURIComponent(name)}`, {
    method: 'DELETE'
  })
}

// ============ Scenarios ============

export async function listScenarios(projectId) {
  return fetchJSON(`/projects/${encodeURIComponent(projectId)}/scenarios`)
}

export async function saveScenario(projectId, name, scenarioData) {
  return fetchJSON(`/projects/${encodeURIComponent(projectId)}/scenarios`, {
    method: 'POST',
    body: JSON.stringify({ name, ...scenarioData })
  })
}

export async function loadScenario(projectId, name) {
  return fetchJSON(`/projects/${encodeURIComponent(projectId)}/scenarios/${encodeURIComponent(name)}`)
}

export async function deleteScenario(projectId, name) {
  return fetchJSON(`/projects/${encodeURIComponent(projectId)}/scenarios/${encodeURIComponent(name)}`, {
    method: 'DELETE'
  })
}

// ============ Health Check ============

export async function healthCheck() {
  return fetchJSON('/health')
}
