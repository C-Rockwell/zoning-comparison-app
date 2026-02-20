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

// Helper to sanitize scenario name for filename
function sanitizeName(name) {
  return name.replace(/[<>:"/\\|?*]/g, '-').trim()
}

// GET /api/projects/:id/scenarios - List all scenarios
router.get('/:id/scenarios', async (req, res) => {
  try {
    const projectsDir = await getProjectsDir(req)
    const scenariosPath = join(projectsDir, req.params.id, 'scenarios')

    if (!existsSync(scenariosPath)) {
      return res.json([])
    }

    const files = await fs.readdir(scenariosPath)
    const scenarios = []

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const data = await fs.readFile(join(scenariosPath, file), 'utf-8')
          const scenario = JSON.parse(data)
          scenarios.push({
            filename: file,
            name: scenario.name,
            code: scenario.code || '',
            timestamp: scenario.timestamp,
            type: 'scenario'
          })
        } catch (e) {
          // Skip invalid files
        }
      }
    }

    // Sort by name alphabetically
    scenarios.sort((a, b) => a.name.localeCompare(b.name))

    res.json(scenarios)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/projects/:id/scenarios - Save scenario
router.post('/:id/scenarios', async (req, res) => {
  try {
    const projectsDir = await getProjectsDir(req)
    const projectPath = join(projectsDir, req.params.id)
    const scenariosPath = join(projectPath, 'scenarios')

    // Auto-create scenarios folder if it doesn't exist (for older projects)
    if (!existsSync(scenariosPath)) {
      if (!existsSync(projectPath)) {
        return res.status(404).json({ error: 'Project not found' })
      }
      await fs.mkdir(scenariosPath)
    }

    const { name, code, ...scenarioData } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Scenario name is required' })
    }

    const filename = sanitizeName(name) + '.json'
    const filePath = join(scenariosPath, filename)

    const scenario = {
      type: 'scenario',
      name,
      code: code || '',
      timestamp: new Date().toISOString(),
      ...scenarioData
    }

    await fs.writeFile(filePath, JSON.stringify(scenario, null, 2))

    res.status(201).json({
      success: true,
      filename,
      name,
      code: scenario.code,
      timestamp: scenario.timestamp
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/projects/:id/scenarios/:name - Load scenario
router.get('/:id/scenarios/:name', async (req, res) => {
  try {
    const projectsDir = await getProjectsDir(req)
    const scenariosPath = join(projectsDir, req.params.id, 'scenarios')

    let filename = req.params.name
    if (!filename.endsWith('.json')) {
      filename += '.json'
    }

    const filePath = join(scenariosPath, filename)

    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'Scenario not found' })
    }

    const data = await fs.readFile(filePath, 'utf-8')
    const scenario = JSON.parse(data)

    res.json(scenario)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/projects/:id/scenarios/:name - Delete scenario
router.delete('/:id/scenarios/:name', async (req, res) => {
  try {
    const projectsDir = await getProjectsDir(req)
    const scenariosPath = join(projectsDir, req.params.id, 'scenarios')

    let filename = req.params.name
    if (!filename.endsWith('.json')) {
      filename += '.json'
    }

    const filePath = join(scenariosPath, filename)

    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'Scenario not found' })
    }

    await fs.unlink(filePath)

    res.json({ success: true, message: 'Scenario deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
