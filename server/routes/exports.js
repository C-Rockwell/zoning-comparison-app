import express from 'express'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import { join, extname } from 'path'
import multer from 'multer'

const router = express.Router()

// Configure multer for file uploads
const storage = multer.memoryStorage()
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }) // 50MB limit

// Helper to get projects directory
async function getProjectsDir(req) {
  const config = await req.app.locals.loadConfig()
  if (!config.projectsDirectory) {
    throw new Error('Projects directory not configured')
  }
  return config.projectsDirectory
}

// Map file extensions to folders
const FOLDER_MAP = {
  '.png': 'images',
  '.jpg': 'images',
  '.jpeg': 'images',
  '.svg': 'images',
  '.obj': 'models',
  '.glb': 'models',
  '.gltf': 'models',
  '.dae': 'models',
  '.dxf': 'models',
  '.ifc': 'models'
}

// GET /api/projects/:id/exports - List all exports
router.get('/:id/exports', async (req, res) => {
  try {
    const projectsDir = await getProjectsDir(req)
    const projectPath = join(projectsDir, req.params.id)

    if (!existsSync(projectPath)) {
      return res.status(404).json({ error: 'Project not found' })
    }

    const exports = {
      images: [],
      models: []
    }

    // Read images folder
    const imagesPath = join(projectPath, 'images')
    if (existsSync(imagesPath)) {
      const imageFiles = await fs.readdir(imagesPath)
      for (const file of imageFiles) {
        const stat = await fs.stat(join(imagesPath, file))
        exports.images.push({
          name: file,
          size: stat.size,
          createdAt: stat.birthtime.toISOString(),
          type: 'image'
        })
      }
    }

    // Read models folder
    const modelsPath = join(projectPath, 'models')
    if (existsSync(modelsPath)) {
      const modelFiles = await fs.readdir(modelsPath)
      for (const file of modelFiles) {
        const stat = await fs.stat(join(modelsPath, file))
        exports.models.push({
          name: file,
          size: stat.size,
          createdAt: stat.birthtime.toISOString(),
          type: 'model'
        })
      }
    }

    res.json(exports)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/projects/:id/exports - Save export file
router.post('/:id/exports', upload.single('file'), async (req, res) => {
  try {
    const projectsDir = await getProjectsDir(req)
    const projectPath = join(projectsDir, req.params.id)

    if (!existsSync(projectPath)) {
      return res.status(404).json({ error: 'Project not found' })
    }

    let filename, data, folder

    if (req.file) {
      // Binary file upload (GLB, images, etc.)
      filename = req.file.originalname
      data = req.file.buffer
    } else if (req.body.filename && req.body.data) {
      // JSON body with base64 or text data
      filename = req.body.filename
      const isBase64 = req.body.encoding === 'base64'
      data = isBase64 ? Buffer.from(req.body.data, 'base64') : req.body.data
    } else {
      return res.status(400).json({ error: 'No file or data provided' })
    }

    const ext = extname(filename).toLowerCase()
    folder = FOLDER_MAP[ext] || 'models'

    const folderPath = join(projectPath, folder)
    const filePath = join(folderPath, filename)

    await fs.writeFile(filePath, data)

    const stat = await fs.stat(filePath)

    res.status(201).json({
      success: true,
      file: {
        name: filename,
        folder,
        path: filePath,
        size: stat.size,
        createdAt: stat.birthtime.toISOString()
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/projects/:id/exports/:filename - Delete export file
router.delete('/:id/exports/:filename', async (req, res) => {
  try {
    const projectsDir = await getProjectsDir(req)
    const projectPath = join(projectsDir, req.params.id)
    const filename = req.params.filename

    // Try to find file in images or models
    const ext = extname(filename).toLowerCase()
    const folder = FOLDER_MAP[ext] || 'models'
    const filePath = join(projectPath, folder, filename)

    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' })
    }

    await fs.unlink(filePath)

    res.json({ success: true, message: 'File deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
