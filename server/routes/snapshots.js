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

// Helper to sanitize snapshot name for filename
function sanitizeName(name) {
  return name.replace(/[<>:"/\\|?*]/g, '-').trim()
}

// GET /api/projects/:id/snapshots - List all snapshots
router.get('/:id/snapshots', async (req, res) => {
  try {
    const projectsDir = await getProjectsDir(req)
    const snapshotsPath = join(projectsDir, req.params.id, 'snapshots')

    if (!existsSync(snapshotsPath)) {
      return res.json([])
    }

    const files = await fs.readdir(snapshotsPath)
    const snapshots = []

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const data = await fs.readFile(join(snapshotsPath, file), 'utf-8')
          const snapshot = JSON.parse(data)
          snapshots.push({
            filename: file,
            name: snapshot.name,
            timestamp: snapshot.timestamp,
            type: 'snapshot'
          })
        } catch (e) {
          // Skip invalid files
        }
      }
    }

    // Sort by timestamp, newest first
    snapshots.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    res.json(snapshots)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/projects/:id/snapshots - Save snapshot
router.post('/:id/snapshots', async (req, res) => {
  try {
    const projectsDir = await getProjectsDir(req)
    const snapshotsPath = join(projectsDir, req.params.id, 'snapshots')

    if (!existsSync(snapshotsPath)) {
      return res.status(404).json({ error: 'Project not found' })
    }

    const { name, ...snapshotData } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Snapshot name is required' })
    }

    const filename = sanitizeName(name) + '.json'
    const filePath = join(snapshotsPath, filename)

    const snapshot = {
      type: 'snapshot',
      name,
      timestamp: new Date().toISOString(),
      ...snapshotData
    }

    await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2))

    res.status(201).json({
      success: true,
      filename,
      name,
      timestamp: snapshot.timestamp
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/projects/:id/snapshots/:name - Load snapshot
router.get('/:id/snapshots/:name', async (req, res) => {
  try {
    const projectsDir = await getProjectsDir(req)
    const snapshotsPath = join(projectsDir, req.params.id, 'snapshots')

    // Try with .json extension
    let filename = req.params.name
    if (!filename.endsWith('.json')) {
      filename += '.json'
    }

    const filePath = join(snapshotsPath, filename)

    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'Snapshot not found' })
    }

    const data = await fs.readFile(filePath, 'utf-8')
    const snapshot = JSON.parse(data)

    res.json(snapshot)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/projects/:id/snapshots/:name - Delete snapshot
router.delete('/:id/snapshots/:name', async (req, res) => {
  try {
    const projectsDir = await getProjectsDir(req)
    const snapshotsPath = join(projectsDir, req.params.id, 'snapshots')

    let filename = req.params.name
    if (!filename.endsWith('.json')) {
      filename += '.json'
    }

    const filePath = join(snapshotsPath, filename)

    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'Snapshot not found' })
    }

    await fs.unlink(filePath)

    res.json({ success: true, message: 'Snapshot deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
