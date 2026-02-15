import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useStore } from '../store/useStore'
import { OBJExporter, GLTFExporter, ColladaExporter } from 'three-stdlib'
import * as THREE from 'three'
import { generateIFC, generateDistrictIFC } from '../utils/ifcGenerator'
import * as api from '../services/api'

const Exporter = ({ target }) => {
    const exportRequested = useStore(state => state.viewSettings.exportRequested)
    const exportFormat = useStore(state => state.viewSettings.exportFormat)
    const exportSettings = useStore(state => state.viewSettings.exportSettings)
    const exportView = useStore(state => state.viewSettings.exportView)
    const resetExport = useStore(state => state.resetExport)
    const setExportLineScale = useStore(state => state.setExportLineScale)
    const currentProject = useStore(state => state.currentProject)
    const showToast = useStore(state => state.showToast)
    const { scene, gl, camera } = useThree()

    useEffect(() => {
        if (exportRequested) {
            // Use target ref if provided, otherwise default to scene
            const objectToExport = target?.current || scene

            if (objectToExport) {
                // 1. SAVE STATE
                const originalSize = new THREE.Vector2()
                gl.getSize(originalSize)

                const originalPosition = camera.position.clone()
                const originalQuaternion = camera.quaternion.clone()
                const originalUp = camera.up.clone()
                const originalZoom = camera.zoom

                // Save orthographic or perspective specific properties
                const originalOrtho = camera.isOrthographicCamera ? {
                    left: camera.left,
                    right: camera.right,
                    top: camera.top,
                    bottom: camera.bottom
                } : null
                const originalAspect = camera.aspect

                // 2. CONFIGURE FOR EXPORT
                const { width, height } = exportSettings
                const exportAspect = width / height

                // Save original pixel ratio
                const originalPixelRatio = gl.getPixelRatio()

                // Calculate line scale factor for WYSIWYG export
                // Scale line widths proportionally to the export resolution
                const viewportWidth = originalSize.x
                const lineScaleFactor = width / viewportWidth

                // Set line scale for WYSIWYG rendering (lines scale with resolution)
                setExportLineScale(lineScaleFactor)

                // Set pixel ratio to 1 for consistent export sizing
                gl.setPixelRatio(1)

                // Resize the renderer - use true to update CSS size as well
                gl.setSize(width, height, true)

                if (camera.isOrthographicCamera) {
                    // For orthographic: scale the frustum to match export aspect ratio
                    // while keeping the same visible area (vertically)
                    const currentFrustumHeight = (camera.top - camera.bottom)

                    // Calculate new frustum maintaining vertical extent
                    const halfHeight = currentFrustumHeight / 2
                    const halfWidth = halfHeight * exportAspect

                    camera.left = -halfWidth
                    camera.right = halfWidth
                    camera.top = halfHeight
                    camera.bottom = -halfHeight
                } else {
                    // Perspective
                    camera.aspect = exportAspect
                }

                camera.updateProjectionMatrix()

                // B. Viewpoint Override
                if (exportView !== 'current') {
                    // Standard Views (Centered at Y=50, Z-Up)
                    if (exportView === 'iso') {
                        camera.position.set(200, -150, 200)
                        camera.up.set(0, 0, 1)
                        camera.lookAt(0, 50, 0)
                        if (camera.isOrthographicCamera) camera.zoom = 6
                    } else if (exportView === 'front') {
                        // Looking from South to North, center Y=50
                        camera.position.set(0, -50, 20)
                        camera.up.set(0, 0, 1)
                        camera.lookAt(0, 50, 20)
                        if (camera.isOrthographicCamera) camera.zoom = 6
                    } else if (exportView === 'side' || exportView === 'right') {
                        // From East
                        camera.position.set(150, 50, 20)
                        camera.up.set(0, 0, 1)
                        camera.lookAt(0, 50, 20)
                        if (camera.isOrthographicCamera) camera.zoom = 6
                    } else if (exportView === 'left') {
                        // From West
                        camera.position.set(-150, 50, 20)
                        camera.up.set(0, 0, 1)
                        camera.lookAt(0, 50, 20)
                        if (camera.isOrthographicCamera) camera.zoom = 6
                    } else if (exportView === 'top') {
                        // Top view offset logic for Z-Up
                        camera.position.set(0, 49.99, 150)
                        camera.up.set(0, 0, 1)
                        camera.lookAt(0, 50, 0)
                        if (camera.isOrthographicCamera) camera.zoom = 6
                    }
                }

                camera.updateProjectionMatrix()

                // For PNG export, use transparent background
                const isImageExport = exportFormat === 'png' || exportFormat === 'jpg'
                let originalBackground = null
                let originalClearColor = new THREE.Color()
                let originalClearAlpha = gl.getClearAlpha()

                if (isImageExport && exportFormat === 'png') {
                    // Save original background
                    originalBackground = scene.background
                    gl.getClearColor(originalClearColor)

                    // Set transparent background for PNG
                    scene.background = null
                    gl.setClearColor(0x000000, 0)
                }

                // Use requestAnimationFrame to wait for React to process line scale update
                // This ensures line widths are updated before capturing
                requestAnimationFrame(() => {
                    try {
                        // Force a render frame to update buffers with new camera/size and line scales
                        gl.render(scene, camera)

                        // 3. EXPORT LOGIC
                        const tempGroup = new THREE.Group()
                        objectToExport.updateMatrixWorld(true)

                        objectToExport.traverse((child) => {
                            // Whitelist: Only BoxGeometry and PlaneGeometry Meshes
                            if (child.isMesh) {
                                const type = child.geometry?.type
                                if (type === 'BoxGeometry' || type === 'PlaneGeometry') {
                                    const clone = child.clone(false)
                                    clone.matrix.copy(child.matrixWorld)
                                    clone.matrix.decompose(clone.position, clone.quaternion, clone.scale)
                                    tempGroup.add(clone)
                                }
                            }
                        })

                        const projectId = currentProject?.id

                        if (exportFormat === 'obj') {
                            const exporter = new OBJExporter()
                            const result = exporter.parse(tempGroup)
                            saveOrDownload(result, 'zoning-model.obj', 'text/plain', false, projectId, showToast)

                        } else if (exportFormat === 'glb') {
                            const exporter = new GLTFExporter()
                            exporter.parse(
                                tempGroup,
                                (result) => {
                                    saveOrDownload(result, 'zoning-model.glb', 'application/octet-stream', false, projectId, showToast)
                                },
                                (error) => console.error(error),
                                { binary: true }
                            )

                        } else if (exportFormat === 'dae') {
                            const exporter = new ColladaExporter()
                            const result = exporter.parse(tempGroup)
                            saveOrDownload(result.data, 'zoning-model.dae', 'application/xml', false, projectId, showToast)

                        } else if (exportFormat === 'dxf') {
                            // DXF operates on the Three.js scene graph, so it handles whatever
                            // geometry is rendered (works for both comparison and district modules)
                            const dxfString = generateDXF(tempGroup)
                            saveOrDownload(dxfString, 'zoning-model.dxf', 'application/dxf', false, projectId, showToast)

                        } else if (exportFormat === 'ifc') {
                            // IFC export reads directly from store, not from Three.js scene
                            const state = useStore.getState()
                            let ifcString
                            if (state.activeModule === 'district') {
                                // District module: multi-lot IFC from entity system
                                ifcString = generateDistrictIFC(state.entities.lots, state.entityOrder, {
                                    filename: 'zoning-district.ifc',
                                    lotSpacing: state.layoutSettings?.lotSpacing || 10
                                })
                                saveOrDownload(ifcString, 'zoning-district.ifc', 'application/x-step', false, projectId, showToast)
                            } else {
                                // Comparison module: existing vs proposed IFC
                                ifcString = generateIFC(state.existing, state.proposed, {
                                    filename: 'zoning-model.ifc',
                                    lotSpacing: state.layoutSettings?.lotSpacing || 10
                                })
                                saveOrDownload(ifcString, 'zoning-model.ifc', 'application/x-step', false, projectId, showToast)
                            }

                        } else if (exportFormat === 'png') {
                            const url = gl.domElement.toDataURL('image/png')
                            saveOrDownload(url, 'zoning-model.png', 'image/png', true, projectId, showToast)

                            // Restore background after PNG capture
                            if (originalBackground !== null) {
                                scene.background = originalBackground
                            }
                            gl.setClearColor(originalClearColor, originalClearAlpha)

                        } else if (exportFormat === 'jpg') {
                            const url = gl.domElement.toDataURL('image/jpeg', 0.9)
                            saveOrDownload(url, 'zoning-model.jpg', 'image/jpeg', true, projectId, showToast)

                        } else if (exportFormat === 'svg') {
                            // Use the configured width/height
                            const svgString = generateSVG(tempGroup, camera, width, height)
                            saveOrDownload(svgString, 'zoning-model.svg', 'image/svg+xml', false, projectId, showToast)
                        }

                        tempGroup.clear()

                        // 4. RESTORE STATE (Immediately after capture)
                        // Restore background if it was changed (safety restore)
                        if (originalBackground !== null && scene.background === null) {
                            scene.background = originalBackground
                            gl.setClearColor(originalClearColor, originalClearAlpha)
                        }

                        // Restore pixel ratio first
                        gl.setPixelRatio(originalPixelRatio)
                        gl.setSize(originalSize.x, originalSize.y, true)

                        // Restore camera properties
                        if (originalOrtho) {
                            camera.left = originalOrtho.left
                            camera.right = originalOrtho.right
                            camera.top = originalOrtho.top
                            camera.bottom = originalOrtho.bottom
                        } else {
                            camera.aspect = originalAspect
                        }
                        camera.zoom = originalZoom

                        // Restore Camera Pose
                        camera.position.copy(originalPosition)
                        camera.quaternion.copy(originalQuaternion)
                        camera.up.copy(originalUp)

                        camera.updateProjectionMatrix()

                        // Render one frame to restore view immediately
                        gl.render(scene, camera)

                    } catch (error) {
                        console.error("Export failed:", error)
                        alert("Export failed: " + error.message)
                    }

                    // Reset export state after completion (inside requestAnimationFrame callback)
                    resetExport()
                })
            }
        }
    }, [exportRequested, exportFormat, scene, gl, camera, resetExport, setExportLineScale, target, exportSettings, exportView, currentProject, showToast])

    return null
}

// Minimal DXF Generator for 3DFACEs (Mesh Geometry)
const generateDXF = (group) => {
    let s = `0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n`

    group.traverse((child) => {
        if (child.isMesh && child.geometry) {
            const geom = child.geometry
            // Ensure we have position attribute
            const positions = geom.attributes.position
            if (!positions) return

            // We need to handle indices if they exist, or just iterate faces
            // For BoxGeometry and PlaneGeometry, we usually have indices.

            const localMatrix = child.matrix // Already has world transform applied during clone

            // Helper to transform vertex
            const getVert = (idx) => {
                const arr = positions.array
                const v = new THREE.Vector3(arr[idx * 3], arr[idx * 3 + 1], arr[idx * 3 + 2])
                v.applyMatrix4(localMatrix)
                return v
            }

            if (geom.index) {
                const indices = geom.index.array
                for (let i = 0; i < indices.length; i += 3) {
                    const v1 = getVert(indices[i])
                    const v2 = getVert(indices[i + 1])
                    const v3 = getVert(indices[i + 2])
                    // DXF 3DFACE requires 4 points. For a triangle, repeat the last one.
                    s += `0\n3DFACE\n8\n0\n` // Layer 0
                    // Z-UP UPDATE: We are now natively Z-up. 
                    // DXF expects Z-up. So we map X->X, Y->Y, Z->Z.

                    const formatVert = (code, v) => `${code}\n${v.x}\n${code + 10}\n${v.y}\n${code + 20}\n${v.z}` // Direct mapping

                    s += formatVert(10, v1) + '\n'
                    s += formatVert(11, v2) + '\n'
                    s += formatVert(12, v3) + '\n'
                    s += formatVert(13, v3) + '\n' // Repeat last for triangle
                }
            } else {
                // Non-indexed (triangle list)
                for (let i = 0; i < positions.count; i += 3) {
                    const v1 = getVert(i)
                    const v2 = getVert(i + 1)
                    const v3 = getVert(i + 2)

                    s += `0\n3DFACE\n8\n0\n`
                    const formatVert = (code, v) => `${code}\n${v.x}\n${code + 10}\n${v.y}\n${code + 20}\n${v.z}` // Direct mapping
                    s += formatVert(10, v1) + '\n'
                    s += formatVert(11, v2) + '\n'
                    s += formatVert(12, v3) + '\n'
                    s += formatVert(13, v3) + '\n'
                }
            }
        }
    })

    s += `0\nENDSEC\n0\nEOF\n`
    return s
}


const generateSVG = (group, camera, width, height) => {
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`
    svg += `<rect width="100%" height="100%" fill="white"/>` // White background
    svg += `<g stroke="black" stroke-width="1" fill="none" stroke-linejoin="round" stroke-linecap="round">`

    // Helper to project point to SVG coords
    const project = (v) => {
        const p = v.clone()
        p.project(camera)
        const x = (p.x * 0.5 + 0.5) * width
        const y = (-(p.y * 0.5) + 0.5) * height
        return { x, y }
    }

    group.traverse((child) => {
        if (child.isMesh && child.geometry) {
            // Create EdgesGeometry for clean wireframes
            const edges = new THREE.EdgesGeometry(child.geometry, 15) // 15 deg threshold
            const positions = edges.attributes.position

            if (positions) {
                const localMatrix = child.matrix // Already has world transform from clone
                for (let i = 0; i < positions.count; i += 2) {
                    const v1 = new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(localMatrix)
                    const v2 = new THREE.Vector3().fromBufferAttribute(positions, i + 1).applyMatrix4(localMatrix)

                    // Simple check if behind camera (optional, crude clipping)
                    // A proper clipper is complex, but for simple "Export Current View" of a centralized model, this usually works ok.

                    const p1 = project(v1)
                    const p2 = project(v2)

                    svg += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" />`
                }
            }
        }
    })

    svg += `</g></svg>`
    return svg
}


// Helper to generate timestamp filename
const generateFilename = (baseName, extension) => {
    const now = new Date()
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
    return `${baseName}-${timestamp}.${extension}`
}

// Save to project if active, otherwise download
const saveOrDownload = async (data, filename, mimeType, isBase64, projectId, showToast) => {
    if (projectId) {
        try {
            // Generate timestamped filename
            const ext = filename.split('.').pop()
            const baseName = filename.replace(`.${ext}`, '')
            const timestampedFilename = generateFilename(baseName, ext)

            if (isBase64) {
                // Convert base64 data URL to base64 string
                const base64Data = data.split(',')[1]
                await api.saveExport(projectId, timestampedFilename, base64Data, 'base64')
            } else if (data instanceof ArrayBuffer) {
                // Binary data (GLB)
                const blob = new Blob([data], { type: mimeType })
                await api.saveExportBinary(projectId, timestampedFilename, blob)
            } else {
                // Text data (OBJ, DAE, DXF, IFC, SVG)
                await api.saveExport(projectId, timestampedFilename, data, 'text')
            }
            console.log(`Saved to project: ${timestampedFilename}`)
            // Show toast notification
            const folder = ext.match(/^(png|jpg|jpeg|svg)$/i) ? 'images' : 'models'
            showToast?.(`Saved to ${folder}/${timestampedFilename}`, 'success')
        } catch (err) {
            console.error('Failed to save to project:', err)
            showToast?.(`Export failed: ${err.message}`, 'error')
            // Fallback to download
            downloadFile(data, filename, mimeType, isBase64, showToast)
        }
    } else {
        downloadFile(data, filename, mimeType, isBase64, showToast)
    }
}

const downloadFile = (data, filename, mimeType, isBase64 = false, showToast) => {
    const link = document.createElement('a')
    link.download = filename

    if (isBase64) {
        link.href = data
    } else {
        const blob = new Blob([data], { type: mimeType })
        const url = URL.createObjectURL(blob)
        link.href = url
        setTimeout(() => URL.revokeObjectURL(url), 1000) // Delay revoke slightly
    }

    link.click()
    showToast?.(`Downloaded ${filename}`, 'success')
}

export default Exporter
