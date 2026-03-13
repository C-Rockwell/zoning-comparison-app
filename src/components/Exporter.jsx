import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { useStore } from '../store/useStore'
import { OBJExporter, GLTFExporter, ColladaExporter } from 'three-stdlib'
import * as THREE from 'three'
import { generateIFC, generateDistrictIFC } from '../utils/ifcGenerator'
import {
    generateStarPoints,
    generateRegularPolygonPoints,
    generateRoundedRectPoints,
} from '../utils/drawingGeometry'
import * as api from '../services/api'
import JSZip from 'jszip'

const Exporter = ({ target }) => {
    const exportRequested = useStore(state => state.viewSettings.exportRequested)
    const exportFormat = useStore(state => state.viewSettings.exportFormat)
    const exportSettings = useStore(state => state.viewSettings.exportSettings)
    const exportView = useStore(state => state.viewSettings.exportView)
    const resetExport = useStore(state => state.resetExport)
    const setExportLineScale = useStore(state => state.setExportLineScale)
    const currentProject = useStore(state => state.currentProject)
    const showToast = useStore(state => state.showToast)
    const isBatchExporting = useStore(state => state.viewSettings.isBatchExporting)
    const exportQueue = useStore(state => state.viewSettings.exportQueue)
    const shiftExportQueue = useStore(state => state.shiftExportQueue)
    const clearExportQueue = useStore(state => state.clearExportQueue)
    const { scene, gl, camera } = useThree()

    // Batch export refs
    const zipRef = useRef(null)
    const savedLayersRef = useRef(null)
    const batchProcessingRef = useRef(false)

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
                gl.setSize(width, height, false)

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
                            // Whitelist: standard geometry types for 3D export
                            if (child.isMesh) {
                                const type = child.geometry?.type
                                if (type === 'BoxGeometry' || type === 'PlaneGeometry' || type === 'BufferGeometry' || type === 'ShapeGeometry' || type === 'ExtrudeGeometry') {
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
                            // DXF operates on the Three.js scene graph + drawing objects
                            const { drawingObjects: dxfDrawObjs, drawingLayers: dxfDrawLayers } = useStore.getState()
                            const dxfString = generateDXF(tempGroup, dxfDrawObjs, dxfDrawLayers)
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

                            if (isBatchExporting && zipRef.current) {
                                // Batch mode: capture to ZIP
                                const queueItem = exportQueue[0]
                                const base64Data = url.split(',')[1]
                                const filename = `${queueItem?.label || 'export'}.png`
                                zipRef.current.file(filename, base64Data, { base64: true })
                            } else {
                                saveOrDownload(url, 'zoning-model.png', 'image/png', true, projectId, showToast)
                            }

                            // Restore background after PNG capture
                            if (originalBackground !== null) {
                                scene.background = originalBackground
                            }
                            gl.setClearColor(originalClearColor, originalClearAlpha)

                        } else if (exportFormat === 'jpg') {
                            const url = gl.domElement.toDataURL('image/jpeg', 0.9)

                            if (isBatchExporting && zipRef.current) {
                                // Batch mode: capture to ZIP
                                const queueItem = exportQueue[0]
                                const base64Data = url.split(',')[1]
                                const filename = `${queueItem?.label || 'export'}.jpg`
                                zipRef.current.file(filename, base64Data, { base64: true })
                            } else {
                                saveOrDownload(url, 'zoning-model.jpg', 'image/jpeg', true, projectId, showToast)
                            }

                        } else if (exportFormat === 'svg') {
                            // Use the configured width/height + include drawing objects
                            const { drawingObjects: svgDrawObjs, drawingLayers: svgDrawLayers } = useStore.getState()
                            const svgString = generateSVG(tempGroup, camera, width, height, svgDrawObjs, svgDrawLayers)
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

                    // If batch exporting, advance the queue
                    if (isBatchExporting) {
                        shiftExportQueue()
                        batchProcessingRef.current = false
                    }
                })
            }
        }
    }, [exportRequested, exportFormat, scene, gl, camera, resetExport, setExportLineScale, target, exportSettings, exportView, currentProject, showToast, isBatchExporting, exportQueue, shiftExportQueue])

    // Batch export orchestrator
    useEffect(() => {
        if (!isBatchExporting) return
        if (exportRequested) return // Wait for current export to finish
        if (batchProcessingRef.current) return // Already processing

        if (exportQueue.length === 0) {
            // Queue exhausted — generate ZIP and download
            if (zipRef.current) {
                const zip = zipRef.current
                zipRef.current = null

                zip.generateAsync({ type: 'blob' }).then((blob) => {
                    const link = document.createElement('a')
                    link.download = `batch-export-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.zip`
                    link.href = URL.createObjectURL(blob)
                    link.click()
                    setTimeout(() => URL.revokeObjectURL(link.href), 1000)
                    showToast?.('Batch export complete', 'success')
                }).catch((err) => {
                    console.error('ZIP generation failed:', err)
                    showToast?.(`Batch export failed: ${err.message}`, 'error')
                })
            }

            // Restore saved layer state
            if (savedLayersRef.current) {
                const store = useStore.getState()
                const savedLayers = savedLayersRef.current
                savedLayersRef.current = null
                for (const [key, value] of Object.entries(savedLayers)) {
                    if (store.viewSettings.layers[key] !== value) {
                        store.setLayer(key, value)
                    }
                }
            }

            clearExportQueue()
            return
        }

        // Process next queue item
        batchProcessingRef.current = true
        const item = exportQueue[0]
        const store = useStore.getState()

        // Initialize ZIP on first item
        if (!zipRef.current) {
            zipRef.current = new JSZip()
            // Save current layer state for restoration
            savedLayersRef.current = { ...store.viewSettings.layers }
        }

        // Apply layer state from the queue item
        if (item.layers) {
            for (const [key, value] of Object.entries(item.layers)) {
                store.setLayer(key, value)
            }
        }

        // Set export format and view
        store.setExportFormat(item.format || 'png')
        store.setExportView(item.cameraView || 'current')

        // Double-RAF to let React process layer/view changes, then trigger export
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                store.triggerExport()
            })
        })
    }, [isBatchExporting, exportQueue, exportRequested, clearExportQueue, showToast])

    return null
}

// Minimal DXF Generator for 3DFACEs (Mesh Geometry) + Drawing Objects
const generateDXF = (group, drawingObjects, drawingLayers) => {
    let s = `0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n`

    group.traverse((child) => {
        if (child.isMesh && child.geometry) {
            const geom = child.geometry
            const positions = geom.attributes.position
            if (!positions) return

            const localMatrix = child.matrix

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
                    s += `0\n3DFACE\n8\n0\n`
                    const formatVert = (code, v) => `${code}\n${v.x}\n${code + 10}\n${v.y}\n${code + 20}\n${v.z}`
                    s += formatVert(10, v1) + '\n'
                    s += formatVert(11, v2) + '\n'
                    s += formatVert(12, v3) + '\n'
                    s += formatVert(13, v3) + '\n'
                }
            } else {
                for (let i = 0; i < positions.count; i += 3) {
                    const v1 = getVert(i)
                    const v2 = getVert(i + 1)
                    const v3 = getVert(i + 2)
                    s += `0\n3DFACE\n8\n0\n`
                    const formatVert = (code, v) => `${code}\n${v.x}\n${code + 10}\n${v.y}\n${code + 20}\n${v.z}`
                    s += formatVert(10, v1) + '\n'
                    s += formatVert(11, v2) + '\n'
                    s += formatVert(12, v3) + '\n'
                    s += formatVert(13, v3) + '\n'
                }
            }
        }
    })

    // Drawing objects → DXF entities
    if (drawingObjects && drawingLayers) {
        s += generateDrawingDXF(drawingObjects, drawingLayers)
    }

    s += `0\nENDSEC\n0\nEOF\n`
    return s
}

// Generate DXF entities for drawing objects
const generateDrawingDXF = (drawingObjects, drawingLayers) => {
    let s = ''

    const dxfLine = (layerName, x1, y1, z1, x2, y2, z2) =>
        `0\nLINE\n8\n${layerName}\n10\n${x1}\n20\n${y1}\n30\n${z1}\n11\n${x2}\n21\n${y2}\n31\n${z2}\n`

    const dxfLwPolyline = (layerName, points, closed, z) => {
        let e = `0\nLWPOLYLINE\n8\n${layerName}\n90\n${points.length}\n70\n${closed ? 1 : 0}\n38\n${z}\n`
        for (const [x, y] of points) {
            e += `10\n${x}\n20\n${y}\n`
        }
        return e
    }

    const dxfCircle = (layerName, cx, cy, cz, r) =>
        `0\nCIRCLE\n8\n${layerName}\n10\n${cx}\n20\n${cy}\n30\n${cz}\n40\n${r}\n`

    const dxfEllipse = (layerName, cx, cy, cz, rx, ry) => {
        // DXF ELLIPSE: center, major axis endpoint (relative), ratio of minor/major
        const major = rx >= ry
        const majorLen = major ? rx : ry
        const minorLen = major ? ry : rx
        const ratio = minorLen / majorLen
        const mx = major ? majorLen : 0
        const my = major ? 0 : majorLen
        return `0\nELLIPSE\n8\n${layerName}\n10\n${cx}\n20\n${cy}\n30\n${cz}\n11\n${mx}\n21\n${my}\n31\n0\n40\n${ratio}\n41\n0\n42\n${Math.PI * 2}\n`
    }

    const dxfText = (layerName, x, y, z, height, text) =>
        `0\nTEXT\n8\n${layerName}\n10\n${x}\n20\n${y}\n30\n${z}\n40\n${height}\n1\n${text}\n`

    for (const obj of Object.values(drawingObjects)) {
        const layer = drawingLayers[obj.layerId]
        if (!layer || !layer.visible) continue
        const layerName = layer.name.replace(/[^a-zA-Z0-9_-]/g, '_')
        const z = layer.zHeight ?? 0.2

        switch (obj.type) {
            case 'freehand': {
                const pts = obj.points.map(([x, y]) => [x, y])
                s += dxfLwPolyline(layerName, pts, false, z)
                break
            }
            case 'line':
            case 'arrow': {
                s += dxfLine(layerName, obj.start[0], obj.start[1], z, obj.end[0], obj.end[1], z)
                break
            }
            case 'rectangle': {
                const [ox, oy] = obj.origin
                const pts = [[ox, oy], [ox + obj.width, oy], [ox + obj.width, oy + obj.height], [ox, oy + obj.height]]
                s += dxfLwPolyline(layerName, pts, true, z)
                break
            }
            case 'roundedRect': {
                const verts = generateRoundedRectPoints(obj.origin[0], obj.origin[1], obj.width, obj.height, obj.cornerRadius ?? 0)
                const pts = verts.slice(0, -1).map(([x, y]) => [x, y]) // remove closing duplicate
                s += dxfLwPolyline(layerName, pts, true, z)
                break
            }
            case 'polygon': {
                const pts = obj.points.map(([x, y]) => [x, y])
                s += dxfLwPolyline(layerName, pts, true, z)
                break
            }
            case 'circle': {
                s += dxfCircle(layerName, obj.center[0], obj.center[1], z, obj.radius)
                break
            }
            case 'ellipse': {
                s += dxfEllipse(layerName, obj.center[0], obj.center[1], z, obj.radiusX, obj.radiusY)
                break
            }
            case 'star': {
                const verts = generateStarPoints(obj.center[0], obj.center[1], obj.outerRadius, obj.innerRadius, obj.numPoints ?? 5)
                const pts = verts.slice(0, -1).map(([x, y]) => [x, y])
                s += dxfLwPolyline(layerName, pts, true, z)
                break
            }
            case 'octagon': {
                const verts = generateRegularPolygonPoints(obj.center[0], obj.center[1], obj.radius, 8)
                const pts = verts.slice(0, -1).map(([x, y]) => [x, y])
                s += dxfLwPolyline(layerName, pts, true, z)
                break
            }
            case 'text': {
                s += dxfText(layerName, obj.position[0], obj.position[1], z, obj.fontSize ?? 3, obj.text ?? '')
                break
            }
            case 'leader': {
                s += dxfLine(layerName, obj.targetPoint[0], obj.targetPoint[1], z, obj.textPosition[0], obj.textPosition[1], z)
                s += dxfText(layerName, obj.textPosition[0], obj.textPosition[1], z, obj.fontSize ?? 3, obj.text ?? '')
                break
            }
        }
    }
    return s
}


const generateSVG = (group, camera, width, height, drawingObjects, drawingLayers) => {
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`
    svg += `<rect width="100%" height="100%" fill="white"/>`
    svg += `<g stroke="black" stroke-width="1" fill="none" stroke-linejoin="round" stroke-linecap="round">`

    // Helper to project 3D point to SVG coords
    const project = (v) => {
        const p = v.clone()
        p.project(camera)
        const x = (p.x * 0.5 + 0.5) * width
        const y = (-(p.y * 0.5) + 0.5) * height
        return { x, y }
    }

    // Project a 2D world point [x,y] at given z to SVG coords
    const projectXY = (wx, wy, wz) => project(new THREE.Vector3(wx, wy, wz))

    // Estimate screen-space distance for a world-space radius at a given point
    const projectRadius = (cx, cy, cz, r) => {
        const pc = projectXY(cx, cy, cz)
        const pe = projectXY(cx + r, cy, cz)
        return Math.abs(pe.x - pc.x)
    }

    group.traverse((child) => {
        if (child.isMesh && child.geometry) {
            const edges = new THREE.EdgesGeometry(child.geometry, 15)
            const positions = edges.attributes.position
            if (positions) {
                const localMatrix = child.matrix
                for (let i = 0; i < positions.count; i += 2) {
                    const v1 = new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(localMatrix)
                    const v2 = new THREE.Vector3().fromBufferAttribute(positions, i + 1).applyMatrix4(localMatrix)
                    const p1 = project(v1)
                    const p2 = project(v2)
                    svg += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" />`
                }
            }
        }
    })

    svg += `</g>`

    // Drawing objects → SVG elements
    if (drawingObjects && drawingLayers) {
        svg += generateDrawingSVG(drawingObjects, drawingLayers, projectXY, projectRadius)
    }

    svg += `</svg>`
    return svg
}

// Generate SVG elements for drawing objects
const generateDrawingSVG = (drawingObjects, drawingLayers, projectXY, projectRadius) => {
    let svg = ''

    const esc = (str) => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

    const styleAttrs = (obj, hasFill) => {
        let s = ''
        if (obj.strokeColor) s += ` stroke="${obj.strokeColor}"`
        if (obj.strokeWidth != null) s += ` stroke-width="${obj.strokeWidth}"`
        if (obj.lineType === 'dashed') s += ` stroke-dasharray="4 4"`
        if (hasFill && obj.fillColor) {
            s += ` fill="${obj.fillColor}"`
            s += ` fill-opacity="${obj.fillOpacity ?? 0.3}"`
        } else if (!hasFill) {
            s += ` fill="none"`
        }
        if (obj.opacity != null && obj.opacity < 1) s += ` opacity="${obj.opacity}"`
        return s
    }

    // Project a points array [[x,y],...] to SVG point string
    const projectPoints = (points, z) =>
        points.map(([x, y]) => {
            const p = projectXY(x, y, z)
            return `${p.x},${p.y}`
        }).join(' ')

    for (const obj of Object.values(drawingObjects)) {
        const layer = drawingLayers[obj.layerId]
        if (!layer || !layer.visible) continue
        const z = layer.zHeight ?? 0.2

        switch (obj.type) {
            case 'freehand': {
                svg += `<polyline points="${projectPoints(obj.points, z)}"${styleAttrs(obj, false)} />`
                break
            }
            case 'line': {
                const p1 = projectXY(obj.start[0], obj.start[1], z)
                const p2 = projectXY(obj.end[0], obj.end[1], z)
                svg += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}"${styleAttrs(obj, false)} />`
                break
            }
            case 'arrow': {
                const p1 = projectXY(obj.start[0], obj.start[1], z)
                const p2 = projectXY(obj.end[0], obj.end[1], z)
                svg += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}"${styleAttrs(obj, false)} />`
                // Arrowhead triangle
                const arrowHead = obj.arrowHead ?? 'end'
                const headSize = 6 // screen pixels
                if (arrowHead === 'end' || arrowHead === 'both') {
                    const dx = p2.x - p1.x, dy = p2.y - p1.y
                    const len = Math.sqrt(dx * dx + dy * dy)
                    if (len > 0) {
                        const ux = dx / len, uy = dy / len
                        const ax = p2.x - ux * headSize + uy * headSize * 0.4
                        const ay = p2.y - uy * headSize - ux * headSize * 0.4
                        const bx = p2.x - ux * headSize - uy * headSize * 0.4
                        const by = p2.y - uy * headSize + ux * headSize * 0.4
                        svg += `<polygon points="${p2.x},${p2.y} ${ax},${ay} ${bx},${by}" fill="${obj.strokeColor ?? 'black'}" stroke="none" />`
                    }
                }
                if (arrowHead === 'start' || arrowHead === 'both') {
                    const dx = p1.x - p2.x, dy = p1.y - p2.y
                    const len = Math.sqrt(dx * dx + dy * dy)
                    if (len > 0) {
                        const ux = dx / len, uy = dy / len
                        const ax = p1.x - ux * headSize + uy * headSize * 0.4
                        const ay = p1.y - uy * headSize - ux * headSize * 0.4
                        const bx = p1.x - ux * headSize - uy * headSize * 0.4
                        const by = p1.y - uy * headSize + ux * headSize * 0.4
                        svg += `<polygon points="${p1.x},${p1.y} ${ax},${ay} ${bx},${by}" fill="${obj.strokeColor ?? 'black'}" stroke="none" />`
                    }
                }
                break
            }
            case 'rectangle': {
                const [ox, oy] = obj.origin
                const corners = [[ox, oy], [ox + obj.width, oy], [ox + obj.width, oy + obj.height], [ox, oy + obj.height]]
                svg += `<polygon points="${projectPoints(corners, z)}"${styleAttrs(obj, true)} />`
                break
            }
            case 'roundedRect': {
                const verts = generateRoundedRectPoints(obj.origin[0], obj.origin[1], obj.width, obj.height, obj.cornerRadius ?? 0)
                const pts = verts.slice(0, -1) // remove closing duplicate
                svg += `<polygon points="${projectPoints(pts, z)}"${styleAttrs(obj, true)} />`
                break
            }
            case 'polygon': {
                svg += `<polygon points="${projectPoints(obj.points, z)}"${styleAttrs(obj, true)} />`
                break
            }
            case 'circle': {
                const pc = projectXY(obj.center[0], obj.center[1], z)
                const sr = projectRadius(obj.center[0], obj.center[1], z, obj.radius)
                svg += `<circle cx="${pc.x}" cy="${pc.y}" r="${sr}"${styleAttrs(obj, true)} />`
                break
            }
            case 'ellipse': {
                const pc = projectXY(obj.center[0], obj.center[1], z)
                const srx = projectRadius(obj.center[0], obj.center[1], z, obj.radiusX)
                const sry = projectRadius(obj.center[0], obj.center[1], z, obj.radiusY)
                svg += `<ellipse cx="${pc.x}" cy="${pc.y}" rx="${srx}" ry="${sry}"${styleAttrs(obj, true)} />`
                break
            }
            case 'star': {
                const verts = generateStarPoints(obj.center[0], obj.center[1], obj.outerRadius, obj.innerRadius, obj.numPoints ?? 5)
                const pts = verts.slice(0, -1)
                svg += `<polygon points="${projectPoints(pts, z)}"${styleAttrs(obj, true)} />`
                break
            }
            case 'octagon': {
                const verts = generateRegularPolygonPoints(obj.center[0], obj.center[1], obj.radius, 8)
                const pts = verts.slice(0, -1)
                svg += `<polygon points="${projectPoints(pts, z)}"${styleAttrs(obj, true)} />`
                break
            }
            case 'text': {
                const pt = projectXY(obj.position[0], obj.position[1], z)
                const screenSize = projectRadius(obj.position[0], obj.position[1], z, obj.fontSize ?? 3)
                svg += `<text x="${pt.x}" y="${pt.y}" fill="${obj.textColor ?? '#000000'}" font-size="${screenSize}" opacity="${obj.opacity ?? 1}">${esc(obj.text ?? '')}</text>`
                break
            }
            case 'leader': {
                const pt = projectXY(obj.targetPoint[0], obj.targetPoint[1], z)
                const tp = projectXY(obj.textPosition[0], obj.textPosition[1], z)
                svg += `<line x1="${pt.x}" y1="${pt.y}" x2="${tp.x}" y2="${tp.y}"${styleAttrs(obj, false)} />`
                // Arrowhead at target point
                const dx = pt.x - tp.x, dy = pt.y - tp.y
                const len = Math.sqrt(dx * dx + dy * dy)
                if (len > 0) {
                    const ux = dx / len, uy = dy / len
                    const ax = pt.x - ux * 6 + uy * 2.4
                    const ay = pt.y - uy * 6 - ux * 2.4
                    const bx = pt.x - ux * 6 - uy * 2.4
                    const by = pt.y - uy * 6 + ux * 2.4
                    svg += `<polygon points="${pt.x},${pt.y} ${ax},${ay} ${bx},${by}" fill="${obj.strokeColor ?? 'black'}" stroke="none" />`
                }
                const screenSize = projectRadius(obj.textPosition[0], obj.textPosition[1], z, obj.fontSize ?? 3)
                svg += `<text x="${tp.x}" y="${tp.y}" fill="${obj.textColor ?? '#000000'}" font-size="${screenSize}" opacity="${obj.opacity ?? 1}">${esc(obj.text ?? '')}</text>`
                break
            }
        }
    }
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
