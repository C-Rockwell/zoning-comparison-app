import express from 'express'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import os from 'os'

const router = express.Router()

// Expand ~ to home directory
function expandPath(inputPath) {
  if (inputPath.startsWith('~/')) {
    return inputPath.replace('~', os.homedir())
  }
  if (inputPath === '~') {
    return os.homedir()
  }
  return inputPath
}

// GET /api/config - Get current configuration
router.get('/', async (req, res) => {
  try {
    const config = await req.app.locals.loadConfig()
    res.json(config)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/config - Update configuration
router.put('/', async (req, res) => {
  try {
    const { projectsDirectory } = req.body

    if (!projectsDirectory) {
      return res.status(400).json({ error: 'projectsDirectory is required' })
    }

    // Expand ~ to home directory
    const expandedPath = expandPath(projectsDirectory)

    // Verify the directory exists or can be created
    if (!existsSync(expandedPath)) {
      await fs.mkdir(expandedPath, { recursive: true })
    }

    const config = { projectsDirectory: expandedPath }
    await req.app.locals.saveConfig(config)

    res.json(config)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
