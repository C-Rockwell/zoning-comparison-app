import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import os from 'os'

import configRoutes from './routes/config.js'
import projectsRoutes from './routes/projects.js'
import exportsRoutes from './routes/exports.js'
import snapshotsRoutes from './routes/snapshots.js'
import layerStatesRoutes from './routes/layer-states.js'
import stylePresetsRoutes from './routes/style-presets.js'
import scenariosRoutes from './routes/scenarios.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// Config file location
const CONFIG_PATH = join(os.homedir(), '.zoning-app-config.json')

// Middleware
app.use(cors())
app.use(express.json({ limit: '50mb' }))

// Load or initialize config
async function loadConfig() {
  try {
    if (existsSync(CONFIG_PATH)) {
      const data = await fs.readFile(CONFIG_PATH, 'utf-8')
      return JSON.parse(data)
    }
  } catch (err) {
    console.error('Error loading config:', err)
  }
  return { projectsDirectory: null }
}

async function saveConfig(config) {
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2))
}

// Make config functions available to routes
app.locals.loadConfig = loadConfig
app.locals.saveConfig = saveConfig
app.locals.CONFIG_PATH = CONFIG_PATH

// Routes
app.use('/api/config', configRoutes)
app.use('/api/projects', projectsRoutes)
app.use('/api/projects', exportsRoutes)
app.use('/api/projects', snapshotsRoutes)
app.use('/api/projects', layerStatesRoutes)
app.use('/api/style-presets', stylePresetsRoutes)
app.use('/api/projects', scenariosRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`Zoning App Server running on http://localhost:${PORT}`)
  console.log(`Config file: ${CONFIG_PATH}`)
})
