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

// Helper to get (and lazily create) the drawing layer presets directory
async function getPresetsDir(req) {
  const projectsDir = await getProjectsDir(req)
  const presetsDir = join(projectsDir, '_drawing-layer-presets')
  if (!existsSync(presetsDir)) {
    await fs.mkdir(presetsDir, { recursive: true })
  }
  return presetsDir
}

// Helper to sanitize preset name for filename
function sanitizeName(name) {
  return name.replace(/[<>:"/\\|?*]/g, '-').trim()
}

// GET / - List all drawing layer presets
router.get('/', async (req, res) => {
  try {
    const presetsDir = await getPresetsDir(req)

    const files = await fs.readdir(presetsDir)
    const presets = []

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const data = await fs.readFile(join(presetsDir, file), 'utf-8')
          const preset = JSON.parse(data)
          presets.push({
            filename: file,
            name: preset.name,
            layerName: preset.layerName,
            timestamp: preset.timestamp,
          })
        } catch (e) {
          // Skip invalid files
        }
      }
    }

    // Sort by timestamp, newest first
    presets.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    res.json(presets)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST / - Save a drawing layer preset
router.post('/', async (req, res) => {
  try {
    const presetsDir = await getPresetsDir(req)

    const { name, layerName, defaults, renderMode, zHeight } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Preset name is required' })
    }

    const filename = sanitizeName(name) + '.json'
    const filePath = join(presetsDir, filename)

    const preset = {
      type: 'drawing-layer-preset',
      name,
      layerName: layerName || name,
      timestamp: new Date().toISOString(),
      defaults: defaults || {},
      renderMode: renderMode || '3d',
      zHeight: zHeight ?? 0.20,
    }

    await fs.writeFile(filePath, JSON.stringify(preset, null, 2))

    res.status(201).json({
      success: true,
      filename,
      name,
      timestamp: preset.timestamp,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /:name - Load a specific drawing layer preset
router.get('/:name', async (req, res) => {
  try {
    const presetsDir = await getPresetsDir(req)

    let filename = req.params.name
    if (!filename.endsWith('.json')) {
      filename += '.json'
    }

    const filePath = join(presetsDir, filename)

    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'Drawing layer preset not found' })
    }

    const data = await fs.readFile(filePath, 'utf-8')
    const preset = JSON.parse(data)

    res.json(preset)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /:name - Delete a drawing layer preset
router.delete('/:name', async (req, res) => {
  try {
    const presetsDir = await getPresetsDir(req)

    let filename = req.params.name
    if (!filename.endsWith('.json')) {
      filename += '.json'
    }

    const filePath = join(presetsDir, filename)

    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'Drawing layer preset not found' })
    }

    await fs.unlink(filePath)

    res.json({ success: true, message: 'Drawing layer preset deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
