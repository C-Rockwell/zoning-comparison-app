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

// Helper to sanitize project name for folder
function sanitizeName(name) {
  return name.replace(/[<>:"/\\|?*]/g, '-').trim()
}

// GET /api/projects - List all projects
router.get('/', async (req, res) => {
  try {
    const projectsDir = await getProjectsDir(req)

    if (!existsSync(projectsDir)) {
      return res.json([])
    }

    const entries = await fs.readdir(projectsDir, { withFileTypes: true })
    const projects = []

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const projectPath = join(projectsDir, entry.name)
        const projectJsonPath = join(projectPath, 'project.json')

        if (existsSync(projectJsonPath)) {
          try {
            const data = await fs.readFile(projectJsonPath, 'utf-8')
            const project = JSON.parse(data)
            projects.push({
              id: entry.name,
              ...project,
              path: projectPath
            })
          } catch (e) {
            // Skip invalid project.json files
          }
        }
      }
    }

    // Sort by modified date, newest first
    projects.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt))

    res.json(projects)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/projects - Create new project
router.post('/', async (req, res) => {
  try {
    const { name } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' })
    }

    const projectsDir = await getProjectsDir(req)
    const projectId = sanitizeName(name)
    const projectPath = join(projectsDir, projectId)

    if (existsSync(projectPath)) {
      return res.status(409).json({ error: 'Project with this name already exists' })
    }

    // Create project folder structure
    await fs.mkdir(projectPath, { recursive: true })
    await fs.mkdir(join(projectPath, 'images'))
    await fs.mkdir(join(projectPath, 'models'))
    await fs.mkdir(join(projectPath, 'snapshots'))
    await fs.mkdir(join(projectPath, 'layer-states'))
    await fs.mkdir(join(projectPath, 'scenarios'))

    const now = new Date().toISOString()
    const project = {
      name,
      createdAt: now,
      modifiedAt: now,
      state: null  // Will hold the saved state when user saves
    }

    await fs.writeFile(
      join(projectPath, 'project.json'),
      JSON.stringify(project, null, 2)
    )

    res.status(201).json({
      id: projectId,
      ...project,
      path: projectPath
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/projects/:id - Get project details
router.get('/:id', async (req, res) => {
  try {
    const projectsDir = await getProjectsDir(req)
    const projectPath = join(projectsDir, req.params.id)
    const projectJsonPath = join(projectPath, 'project.json')

    if (!existsSync(projectJsonPath)) {
      return res.status(404).json({ error: 'Project not found' })
    }

    const data = await fs.readFile(projectJsonPath, 'utf-8')
    const project = JSON.parse(data)

    res.json({
      id: req.params.id,
      ...project,
      path: projectPath
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/projects/:id - Update project (save state)
router.put('/:id', async (req, res) => {
  try {
    const projectsDir = await getProjectsDir(req)
    const projectPath = join(projectsDir, req.params.id)
    const projectJsonPath = join(projectPath, 'project.json')

    if (!existsSync(projectJsonPath)) {
      return res.status(404).json({ error: 'Project not found' })
    }

    const existingData = await fs.readFile(projectJsonPath, 'utf-8')
    const existingProject = JSON.parse(existingData)

    const { name, state } = req.body

    const updatedProject = {
      ...existingProject,
      name: name || existingProject.name,
      state: state !== undefined ? state : existingProject.state,
      modifiedAt: new Date().toISOString()
    }

    await fs.writeFile(projectJsonPath, JSON.stringify(updatedProject, null, 2))

    res.json({
      id: req.params.id,
      ...updatedProject,
      path: projectPath
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/projects/:id - Delete project
router.delete('/:id', async (req, res) => {
  try {
    const projectsDir = await getProjectsDir(req)
    const projectPath = join(projectsDir, req.params.id)

    if (!existsSync(projectPath)) {
      return res.status(404).json({ error: 'Project not found' })
    }

    await fs.rm(projectPath, { recursive: true, force: true })

    res.json({ success: true, message: 'Project deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
