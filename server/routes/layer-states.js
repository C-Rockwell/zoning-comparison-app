import express from 'express'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

const router = express.Router()

// Helper to get projects directory
async function getProjectsDir(req) {
  const config = await req.app.locals.loadConfig()
  if (!config.projectsDirectory) {
    throw new Error('Projects directory not configured')
  }
  return config.projectsDirectory
}

// Helper to sanitize layer state name for filename
function sanitizeName(name) {
  return name.replace(/[<>:"/\\|?*]/g, '-').trim()
}

// GET /api/projects/:id/layer-states - List all layer states
router.get('/:id/layer-states', async (req, res) => {
  try {
    const projectsDir = await getProjectsDir(req)
    const layerStatesPath = join(projectsDir, req.params.id, 'layer-states')

    if (!existsSync(layerStatesPath)) {
      return res.json([])
    }

    const files = await fs.readdir(layerStatesPath)
    const layerStates = []

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const data = await fs.readFile(join(layerStatesPath, file), 'utf-8')
          const layerState = JSON.parse(data)
          layerStates.push({
            filename: file,
            name: layerState.name,
            timestamp: layerState.timestamp,
            type: 'layer-state'
          })
        } catch (e) {
          // Skip invalid files
        }
      }
    }

    // Sort by timestamp, newest first
    layerStates.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    res.json(layerStates)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/projects/:id/layer-states - Save layer state
router.post('/:id/layer-states', async (req, res) => {
  try {
    const projectsDir = await getProjectsDir(req)
    const layerStatesPath = join(projectsDir, req.params.id, 'layer-states')

    if (!existsSync(layerStatesPath)) {
      return res.status(404).json({ error: 'Project not found' })
    }

    const { name, ...stateData } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Layer state name is required' })
    }

    const filename = sanitizeName(name) + '.json'
    const filePath = join(layerStatesPath, filename)

    const layerState = {
      type: 'layer-state',
      name,
      timestamp: new Date().toISOString(),
      ...stateData
    }

    await fs.writeFile(filePath, JSON.stringify(layerState, null, 2))

    res.status(201).json({
      success: true,
      filename,
      name,
      timestamp: layerState.timestamp
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/projects/:id/layer-states/:name - Load layer state
router.get('/:id/layer-states/:name', async (req, res) => {
  try {
    const projectsDir = await getProjectsDir(req)
    const layerStatesPath = join(projectsDir, req.params.id, 'layer-states')

    // Try with .json extension
    let filename = req.params.name
    if (!filename.endsWith('.json')) {
      filename += '.json'
    }

    const filePath = join(layerStatesPath, filename)

    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'Layer state not found' })
    }

    const data = await fs.readFile(filePath, 'utf-8')
    const layerState = JSON.parse(data)

    res.json(layerState)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/projects/:id/layer-states/:name - Delete layer state
router.delete('/:id/layer-states/:name', async (req, res) => {
  try {
    const projectsDir = await getProjectsDir(req)
    const layerStatesPath = join(projectsDir, req.params.id, 'layer-states')

    let filename = req.params.name
    if (!filename.endsWith('.json')) {
      filename += '.json'
    }

    const filePath = join(layerStatesPath, filename)

    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'Layer state not found' })
    }

    await fs.unlink(filePath)

    res.json({ success: true, message: 'Layer state deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
