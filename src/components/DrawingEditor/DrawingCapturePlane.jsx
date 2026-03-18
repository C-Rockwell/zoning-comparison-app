import { useRef, useState, useMemo, useCallback, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { useStore, getEffectiveDrawingDefaults } from '../../store/useStore'
import {
    generateCirclePoints,
    generateEllipsePoints,
    generateRegularPolygonPoints,
    generateStarPoints,
    generateRoundedRectPoints,
} from '../../utils/drawingGeometry'
import { hitTestObject, computeMoveUpdate } from '../../utils/drawingHitTest'

// --- Preview component (module scope) ---

const DrawingPreview = ({ tool, drawingState, defaults }) => {
    if (!drawingState.isDrawing) return null

    const { startPoint, currentPoint, points } = drawingState
    const color = defaults.strokeColor
    const width = defaults.strokeWidth

    if (tool === 'freehand' && points.length >= 2) {
        const pts3d = points.map(([x, y]) => [x, y, 0])
        return <Line points={pts3d} color={color} lineWidth={width} />
    }

    if (tool === 'line' && startPoint && currentPoint) {
        return (
            <Line
                points={[[startPoint[0], startPoint[1], 0], [currentPoint[0], currentPoint[1], 0]]}
                color={color}
                lineWidth={width}
            />
        )
    }

    if ((tool === 'arrow' || tool === 'doubleArrow') && startPoint && currentPoint) {
        const dx = currentPoint[0] - startPoint[0]
        const dy = currentPoint[1] - startPoint[1]
        const len = Math.sqrt(dx * dx + dy * dy)
        const arrowHead = tool === 'doubleArrow' ? 'both' : (defaults.arrowHead ?? 'end')
        return (
            <group>
                <Line
                    points={[[startPoint[0], startPoint[1], 0], [currentPoint[0], currentPoint[1], 0]]}
                    color={color}
                    lineWidth={width}
                />
                {(arrowHead === 'end' || arrowHead === 'both') && len > 1 && (
                    <group position={[currentPoint[0], currentPoint[1], 0]}
                           rotation={[0, 0, Math.atan2(dy, dx)]}>
                        <mesh position={[0.5, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                            <coneGeometry args={[0.4, 1, 8]} />
                            <meshBasicMaterial color={color} />
                        </mesh>
                    </group>
                )}
                {(arrowHead === 'start' || arrowHead === 'both') && len > 1 && (
                    <group position={[startPoint[0], startPoint[1], 0]}
                           rotation={[0, 0, Math.atan2(dy, dx) + Math.PI]}>
                        <mesh position={[0.5, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                            <coneGeometry args={[0.4, 1, 8]} />
                            <meshBasicMaterial color={color} />
                        </mesh>
                    </group>
                )}
            </group>
        )
    }

    // Dimension: same as double arrow preview
    if (tool === 'dimension' && startPoint && currentPoint) {
        const dx = currentPoint[0] - startPoint[0]
        const dy = currentPoint[1] - startPoint[1]
        const len = Math.sqrt(dx * dx + dy * dy)
        return (
            <group>
                <Line
                    points={[[startPoint[0], startPoint[1], 0], [currentPoint[0], currentPoint[1], 0]]}
                    color={color}
                    lineWidth={width}
                />
                {len > 1 && (
                    <>
                        <group position={[currentPoint[0], currentPoint[1], 0]}
                               rotation={[0, 0, Math.atan2(dy, dx)]}>
                            <mesh position={[0.5, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                                <coneGeometry args={[0.4, 1, 8]} />
                                <meshBasicMaterial color={color} />
                            </mesh>
                        </group>
                        <group position={[startPoint[0], startPoint[1], 0]}
                               rotation={[0, 0, Math.atan2(dy, dx) + Math.PI]}>
                            <mesh position={[0.5, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                                <coneGeometry args={[0.4, 1, 8]} />
                                <meshBasicMaterial color={color} />
                            </mesh>
                        </group>
                    </>
                )}
            </group>
        )
    }

    // Elbow Leader: show line from target to cursor with elbow bend
    if (tool === 'elbowLeader' && points.length === 1 && currentPoint) {
        const target = points[0]
        const elbowDir = currentPoint[0] >= target[0] ? 1 : -1
        const elbowPt = [currentPoint[0] - elbowDir * 5, currentPoint[1], 0]
        return (
            <group>
                <Line
                    points={[[target[0], target[1], 0], elbowPt, [currentPoint[0], currentPoint[1], 0]]}
                    color={color}
                    lineWidth={width}
                />
                {(() => {
                    const dx = elbowPt[0] - target[0]
                    const dy = elbowPt[1] - target[1]
                    const len = Math.sqrt(dx * dx + dy * dy)
                    if (len <= 1) return null
                    return (
                        <group position={[target[0], target[1], 0]}
                               rotation={[0, 0, Math.atan2(-dy, -dx)]}>
                            <mesh position={[-0.5, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                                <coneGeometry args={[0.4, 1, 8]} />
                                <meshBasicMaterial color={color} />
                            </mesh>
                        </group>
                    )
                })()}
            </group>
        )
    }

    // Leader: show line + arrow from target to cursor while placing second point
    if (tool === 'leader' && points.length === 1 && currentPoint) {
        const target = points[0]
        const dx = currentPoint[0] - target[0]
        const dy = currentPoint[1] - target[1]
        const len = Math.sqrt(dx * dx + dy * dy)
        return (
            <group>
                <Line
                    points={[[target[0], target[1], 0], [currentPoint[0], currentPoint[1], 0]]}
                    color={color}
                    lineWidth={width}
                />
                {len > 1 && (
                    <group position={[target[0], target[1], 0]}
                           rotation={[0, 0, Math.atan2(-dy, -dx)]}>
                        <mesh position={[-0.5, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                            <coneGeometry args={[0.4, 1, 8]} />
                            <meshBasicMaterial color={color} />
                        </mesh>
                    </group>
                )}
            </group>
        )
    }

    if (tool === 'rectangle' && startPoint && currentPoint) {
        const [ox, oy] = startPoint
        const [cx, cy] = currentPoint
        const corners = [
            [ox, oy, 0], [cx, oy, 0], [cx, cy, 0], [ox, cy, 0], [ox, oy, 0]
        ]
        return (
            <group>
                <Line points={corners} color={color} lineWidth={width} />
                {(defaults.fillOpacity ?? 0) > 0 && (() => {
                    const shape = new THREE.Shape()
                    shape.moveTo(ox, oy)
                    shape.lineTo(cx, oy)
                    shape.lineTo(cx, cy)
                    shape.lineTo(ox, cy)
                    shape.closePath()
                    return (
                        <mesh>
                            <shapeGeometry args={[shape]} />
                            <meshBasicMaterial
                                color={defaults.fillColor}
                                transparent
                                opacity={defaults.fillOpacity * 0.5}
                                depthWrite={false}
                                side={THREE.DoubleSide}
                            />
                        </mesh>
                    )
                })()}
            </group>
        )
    }

    // Polygon: placed vertices + rubber-band line to cursor + dashed close line
    if (tool === 'polygon' && points.length >= 1 && currentPoint) {
        const allPts = [...points.map(([x, y]) => [x, y, 0]), [currentPoint[0], currentPoint[1], 0]]
        return (
            <group>
                <Line points={allPts} color={color} lineWidth={width} />
                {points.length >= 2 && (
                    <Line
                        points={[[currentPoint[0], currentPoint[1], 0], [points[0][0], points[0][1], 0]]}
                        color={color}
                        lineWidth={width}
                        dashed
                        dashScale={1}
                        dashSize={3}
                        gapSize={2}
                    />
                )}
            </group>
        )
    }

    // Circle: center + drag = radius
    if (tool === 'circle' && startPoint && currentPoint) {
        const dx = currentPoint[0] - startPoint[0]
        const dy = currentPoint[1] - startPoint[1]
        const r = Math.sqrt(dx * dx + dy * dy)
        if (r > 0.1) {
            const pts = generateCirclePoints(startPoint[0], startPoint[1], r, 64)
            return <Line points={pts} color={color} lineWidth={width} />
        }
    }

    // Ellipse: center + drag = radiusX/radiusY
    if (tool === 'ellipse' && startPoint && currentPoint) {
        const rx = Math.abs(currentPoint[0] - startPoint[0])
        const ry = Math.abs(currentPoint[1] - startPoint[1])
        if (rx > 0.1 && ry > 0.1) {
            const pts = generateEllipsePoints(startPoint[0], startPoint[1], rx, ry, 64)
            return <Line points={pts} color={color} lineWidth={width} />
        }
    }

    // Star: center + drag = outer radius
    if (tool === 'star' && startPoint && currentPoint) {
        const dx = currentPoint[0] - startPoint[0]
        const dy = currentPoint[1] - startPoint[1]
        const outerR = Math.sqrt(dx * dx + dy * dy)
        if (outerR > 0.1) {
            const numPts = defaults.starPoints ?? 5
            const pts = generateStarPoints(startPoint[0], startPoint[1], outerR, outerR * 0.4, numPts)
            return <Line points={pts} color={color} lineWidth={width} />
        }
    }

    // Octagon: center + drag = radius
    if (tool === 'octagon' && startPoint && currentPoint) {
        const dx = currentPoint[0] - startPoint[0]
        const dy = currentPoint[1] - startPoint[1]
        const r = Math.sqrt(dx * dx + dy * dy)
        if (r > 0.1) {
            const pts = generateRegularPolygonPoints(startPoint[0], startPoint[1], r, 8)
            return <Line points={pts} color={color} lineWidth={width} />
        }
    }

    // RoundedRect: same as rectangle but with rounded corners
    if (tool === 'roundedRect' && startPoint && currentPoint) {
        const [ox, oy] = startPoint
        const w = currentPoint[0] - ox
        const h = currentPoint[1] - oy
        if (Math.abs(w) > 0.1 && Math.abs(h) > 0.1) {
            const cr = defaults.cornerRadius ?? 0
            const pts = generateRoundedRectPoints(ox, oy, w, h, cr)
            return <Line points={pts} color={color} lineWidth={width} />
        }
    }

    return null
}

// --- Set of drag-based tools (not polygon) ---
const DRAG_TOOLS = new Set(['freehand', 'line', 'arrow', 'doubleArrow', 'rectangle', 'circle', 'ellipse', 'star', 'octagon', 'roundedRect', 'dimension'])

// --- Main component ---

const DrawingCapturePlane = () => {
    const meshRef = useRef()
    const { camera, raycaster, controls, gl } = useThree()
    const drawingMode = useStore(state => state.drawingMode)
    const activeDrawingLayerId = useStore(state => state.activeDrawingLayerId)
    const globalDrawingDefaults = useStore(state => state.drawingDefaults)
    const drawingLayers = useStore(state => state.drawingLayers)
    const drawingDefaults = useMemo(() => {
        return getEffectiveDrawingDefaults({ drawingDefaults: globalDrawingDefaults, drawingLayers }, activeDrawingLayerId)
    }, [globalDrawingDefaults, drawingLayers, activeDrawingLayerId])
    const addDrawingObject = useStore(state => state.addDrawingObject)
    const setSelectedDrawingIds = useStore(state => state.setSelectedDrawingIds)
    const updateDrawingObject = useStore(state => state.updateDrawingObject)
    const updateDrawingObjects = useStore(state => state.updateDrawingObjects)

    // Transient drawing state (not in store — avoids churn on every pointer-move)
    const drawingState = useRef({
        isDrawing: false,
        startPoint: null,
        currentPoint: null,
        points: [],
        polygonPlacing: false,
        leaderPlacing: false,
    })
    const [previewVersion, setPreviewVersion] = useState(0)
    const lastClickTime = useRef(0)

    // Move-drag state for select tool (drag selected objects to reposition)
    const moveState = useRef({
        mode: null, // null | 'potential' | 'active'
        startPoint: null,
        originalObjects: {},
        pointerId: null,
        target: null,
    })

    // Ground plane at Z=0 for raycasting
    const groundPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), [])

    // Get world-space [x, y] from pointer event
    const getWorldPoint = useCallback((e) => {
        const intersection = new THREE.Vector3()
        raycaster.setFromCamera(e.pointer, camera)
        raycaster.ray.intersectPlane(groundPlane, intersection)
        return [intersection.x, intersection.y]
    }, [camera, raycaster, groundPlane])

    // Safety: resume undo on unmount if move was interrupted
    useEffect(() => {
        return () => {
            if (moveState.current.mode === 'active') {
                useStore.temporal.getState().resume()
            }
        }
    }, [])

    // Escape key handler for polygon/leader cancel and move cancel
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                // Cancel active move drag
                if (moveState.current.mode === 'active') {
                    // Revert objects to original positions
                    const originals = moveState.current.originalObjects
                    const selectedIds = useStore.getState().selectedDrawingIds
                    for (const id of selectedIds) {
                        if (originals[id]) {
                            useStore.getState().updateDrawingObject(id, computeMoveUpdate(originals[id], 0, 0))
                        }
                    }
                    useStore.temporal.getState().resume()
                    if (controls) controls.enabled = true
                    if (moveState.current.target) moveState.current.target.releasePointerCapture(moveState.current.pointerId)
                    moveState.current = { mode: null, startPoint: null, originalObjects: {}, pointerId: null, target: null }
                    return
                }
                if (moveState.current.mode === 'potential') {
                    if (moveState.current.target) moveState.current.target.releasePointerCapture(moveState.current.pointerId)
                    moveState.current = { mode: null, startPoint: null, originalObjects: {}, pointerId: null, target: null }
                    return
                }
                if (drawingState.current.polygonPlacing || drawingState.current.leaderPlacing) {
                    drawingState.current = { isDrawing: false, startPoint: null, currentPoint: null, points: [], polygonPlacing: false, leaderPlacing: false }
                    setPreviewVersion(v => v + 1)
                    useStore.temporal.getState().resume()
                    if (controls) controls.enabled = true
                }
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [controls])

    // Helper: commit polygon and clean up
    const commitPolygon = useCallback(() => {
        const { points } = drawingState.current
        const state = useStore.getState()
        const layerId = state.activeDrawingLayerId
        const defaults = getEffectiveDrawingDefaults(state, layerId)

        if (points.length >= 3) {
            addDrawingObject({
                layerId,
                type: 'polygon',
                points: [...points],
                strokeColor: defaults.strokeColor,
                strokeWidth: defaults.strokeWidth,
                lineType: defaults.lineType,
                fillColor: defaults.fillColor,
                fillOpacity: defaults.fillOpacity,
                opacity: 1,
            })
        }

        drawingState.current = { isDrawing: false, startPoint: null, currentPoint: null, points: [], polygonPlacing: false, leaderPlacing: false }
        setPreviewVersion(v => v + 1)
        useStore.temporal.getState().resume()
        if (controls) controls.enabled = true
    }, [controls, addDrawingObject])

    // --- Selection handler ---
    const handleSelectClick = useCallback((e) => {
        const clickPoint = getWorldPoint(e)
        const allObjects = useStore.getState().drawingObjects
        const layers = useStore.getState().drawingLayers
        const tolerance = 3

        let hitId = null
        const objectIds = Object.keys(allObjects).reverse()
        for (const id of objectIds) {
            const obj = allObjects[id]
            const layer = layers[obj.layerId]
            if (!layer || !layer.visible || layer.locked) continue
            if (hitTestObject(obj, clickPoint, tolerance)) {
                hitId = id
                break
            }
        }

        if (hitId) {
            if (e.shiftKey) {
                const current = useStore.getState().selectedDrawingIds
                if (current.includes(hitId)) {
                    setSelectedDrawingIds(current.filter(id => id !== hitId))
                } else {
                    setSelectedDrawingIds([...current, hitId])
                }
            } else {
                setSelectedDrawingIds([hitId])
            }
        } else {
            setSelectedDrawingIds([])
        }
    }, [getWorldPoint, setSelectedDrawingIds])

    // --- Pointer handlers ---

    const handlePointerDown = useCallback((e) => {
        if (!drawingMode) return
        e.stopPropagation()

        const tool = drawingMode.tool

        // Select tool (with drag-to-move support)
        if (tool === 'select') {
            const clickPoint = getWorldPoint(e)
            const allObjects = useStore.getState().drawingObjects
            const layers = useStore.getState().drawingLayers
            const selectedIds = useStore.getState().selectedDrawingIds
            const tolerance = 3

            // Hit-test to find which object was clicked
            let hitId = null
            const objectIds = Object.keys(allObjects).reverse()
            for (const id of objectIds) {
                const obj = allObjects[id]
                const layer = layers[obj.layerId]
                if (!layer || !layer.visible || layer.locked) continue
                if (hitTestObject(obj, clickPoint, tolerance)) {
                    hitId = id
                    break
                }
            }

            if (hitId && selectedIds.includes(hitId)) {
                // Clicked on an already-selected object → potential move
                e.target.setPointerCapture(e.pointerId)
                const snapshot = {}
                for (const id of selectedIds) {
                    if (allObjects[id]) snapshot[id] = allObjects[id]
                }
                moveState.current = {
                    mode: 'potential',
                    startPoint: clickPoint,
                    originalObjects: snapshot,
                    pointerId: e.pointerId,
                    target: e.target,
                }
            } else {
                // Clicked on non-selected object or empty space → handle selection
                handleSelectClick(e)
            }
            return
        }

        // Eraser tool: click to delete object under cursor
        if (tool === 'eraser') {
            const clickPoint = getWorldPoint(e)
            const allObjects = useStore.getState().drawingObjects
            const layers = useStore.getState().drawingLayers
            const tolerance = 3

            const objectIds = Object.keys(allObjects).reverse()
            for (const id of objectIds) {
                const obj = allObjects[id]
                const layer = layers[obj.layerId]
                if (!layer || !layer.visible || layer.locked) continue
                if (hitTestObject(obj, clickPoint, tolerance)) {
                    useStore.getState().deleteDrawingObject(id)
                    break
                }
            }
            return
        }

        // Check layer exists and is not locked
        const layer = drawingLayers[activeDrawingLayerId]
        if (!layer || layer.locked) return

        const point = getWorldPoint(e)

        // --- Text: single click to place ---
        if (tool === 'text') {
            const vec = new THREE.Vector3(point[0], point[1], 0)
            vec.project(camera)
            const rect = gl.domElement.getBoundingClientRect()
            const screenX = (vec.x * 0.5 + 0.5) * rect.width + rect.left
            const screenY = (-vec.y * 0.5 + 0.5) * rect.height + rect.top
            useStore.getState().setTextEditState({
                worldPosition: point,
                screenPosition: [screenX, screenY],
                objectId: null,
                tool: 'text',
            })
            return
        }

        // --- Leader / Elbow Leader: two-click placement ---
        if (tool === 'leader' || tool === 'elbowLeader') {
            if (!drawingState.current.leaderPlacing) {
                // First click: target point (arrow tip)
                if (controls) controls.enabled = false
                useStore.temporal.getState().pause()
                drawingState.current = {
                    isDrawing: true,
                    startPoint: point,
                    currentPoint: point,
                    points: [point],
                    polygonPlacing: false,
                    leaderPlacing: true,
                }
                setPreviewVersion(v => v + 1)
            } else {
                // Second click: text position — open text input
                const targetPt = drawingState.current.points[0]
                const vec = new THREE.Vector3(point[0], point[1], 0)
                vec.project(camera)
                const rect = gl.domElement.getBoundingClientRect()
                const screenX = (vec.x * 0.5 + 0.5) * rect.width + rect.left
                const screenY = (-vec.y * 0.5 + 0.5) * rect.height + rect.top
                useStore.getState().setTextEditState({
                    worldPosition: point,
                    screenPosition: [screenX, screenY],
                    targetPoint: targetPt,
                    objectId: null,
                    tool: tool,
                })
                drawingState.current = { isDrawing: false, startPoint: null, currentPoint: null, points: [], polygonPlacing: false, leaderPlacing: false }
                setPreviewVersion(v => v + 1)
                useStore.temporal.getState().resume()
                if (controls) controls.enabled = true
            }
            return
        }

        // --- Polygon: click-to-place vertices ---
        if (tool === 'polygon') {
            const now = Date.now()
            const isDoubleClick = (now - lastClickTime.current) < 350
            lastClickTime.current = now

            if (isDoubleClick && drawingState.current.polygonPlacing) {
                // Double-click: close polygon
                commitPolygon()
                return
            }

            if (!drawingState.current.polygonPlacing) {
                // First vertex: disable camera, pause undo
                if (controls) controls.enabled = false
                useStore.temporal.getState().pause()
                drawingState.current = {
                    isDrawing: true,
                    startPoint: point,
                    currentPoint: point,
                    points: [point],
                    polygonPlacing: true,
                    leaderPlacing: false,
                }
            } else {
                // Subsequent vertex
                drawingState.current.points.push(point)
                drawingState.current.currentPoint = point
            }
            setPreviewVersion(v => v + 1)
            return
        }

        // --- Drag-based tools: start drawing ---
        if (controls) controls.enabled = false
        useStore.temporal.getState().pause()
        e.target.setPointerCapture(e.pointerId)

        drawingState.current = {
            isDrawing: true,
            startPoint: point,
            currentPoint: point,
            points: [point],
            polygonPlacing: false,
            leaderPlacing: false,
        }
        setPreviewVersion(v => v + 1)
    }, [drawingMode, activeDrawingLayerId, drawingLayers, controls, camera, gl, getWorldPoint, handleSelectClick, commitPolygon])

    const handlePointerMove = useCallback((e) => {
        if (!drawingMode) return
        e.stopPropagation()

        const tool = drawingMode.tool

        // Select tool: handle move-drag
        if (tool === 'select') {
            const ms = moveState.current
            if (!ms.mode) return

            const point = getWorldPoint(e)
            const dx = point[0] - ms.startPoint[0]
            const dy = point[1] - ms.startPoint[1]

            if (ms.mode === 'potential') {
                // Check if we've moved enough to start a real drag (2 world units)
                if (dx * dx + dy * dy < 4) return
                // Transition to active move
                ms.mode = 'active'
                if (controls) controls.enabled = false
                useStore.temporal.getState().pause()
            }

            if (ms.mode === 'active') {
                const selectedIds = useStore.getState().selectedDrawingIds
                if (selectedIds.length === 1) {
                    const id = selectedIds[0]
                    const origObj = ms.originalObjects[id]
                    if (origObj) {
                        updateDrawingObject(id, computeMoveUpdate(origObj, dx, dy))
                    }
                } else {
                    const updates = {}
                    for (const id of selectedIds) {
                        const origObj = ms.originalObjects[id]
                        if (origObj) {
                            updates[id] = computeMoveUpdate(origObj, dx, dy)
                        }
                    }
                    updateDrawingObjects(updates)
                }
            }
            return
        }

        if (!drawingState.current.isDrawing) return

        const point = getWorldPoint(e)
        drawingState.current.currentPoint = point

        if (tool === 'freehand') {
            const pts = drawingState.current.points
            const last = pts[pts.length - 1]
            const fdx = point[0] - last[0]
            const fdy = point[1] - last[1]
            if (fdx * fdx + fdy * fdy >= 0.25) { // 0.5^2 min distance
                pts.push(point)
            }
        }

        setPreviewVersion(v => v + 1)
    }, [drawingMode, getWorldPoint, controls, updateDrawingObject, updateDrawingObjects])

    const handlePointerUp = useCallback((e) => {
        if (!drawingMode) return
        e.stopPropagation()

        const tool = drawingMode.tool

        // Select tool: finish move-drag or click
        if (tool === 'select') {
            const ms = moveState.current
            if (ms.mode === 'potential') {
                // Never exceeded threshold — was just a click on already-selected object
                if (ms.target) ms.target.releasePointerCapture(ms.pointerId)
            } else if (ms.mode === 'active') {
                // Finish active move
                useStore.temporal.getState().resume()
                if (controls) controls.enabled = true
                if (ms.target) ms.target.releasePointerCapture(ms.pointerId)
            }
            moveState.current = { mode: null, startPoint: null, originalObjects: {}, pointerId: null, target: null }
            return
        }

        // These tools don't commit on pointer-up
        if (tool === 'polygon' || tool === 'text' || tool === 'leader' || tool === 'elbowLeader') return

        if (!drawingState.current.isDrawing) return

        const { startPoint, currentPoint, points } = drawingState.current
        const state = useStore.getState()
        const layerId = state.activeDrawingLayerId
        const defaults = getEffectiveDrawingDefaults(state, layerId)

        // Create drawing object based on tool
        if (tool === 'freehand' && points.length >= 2) {
            addDrawingObject({
                layerId,
                type: 'freehand',
                points: [...points],
                strokeColor: defaults.strokeColor,
                strokeWidth: defaults.strokeWidth,
                lineType: defaults.lineType,
                opacity: 1,
            })
        } else if (tool === 'line') {
            const dx = currentPoint[0] - startPoint[0]
            const dy = currentPoint[1] - startPoint[1]
            if (dx * dx + dy * dy > 0.25) {
                addDrawingObject({
                    layerId,
                    type: 'line',
                    start: [...startPoint],
                    end: [...currentPoint],
                    strokeColor: defaults.strokeColor,
                    strokeWidth: defaults.strokeWidth,
                    lineType: defaults.lineType,
                    opacity: 1,
                })
            }
        } else if (tool === 'arrow' || tool === 'doubleArrow') {
            const dx = currentPoint[0] - startPoint[0]
            const dy = currentPoint[1] - startPoint[1]
            if (dx * dx + dy * dy > 0.25) {
                addDrawingObject({
                    layerId,
                    type: 'arrow',
                    start: [...startPoint],
                    end: [...currentPoint],
                    strokeColor: defaults.strokeColor,
                    strokeWidth: defaults.strokeWidth,
                    lineType: defaults.lineType,
                    arrowHead: tool === 'doubleArrow' ? 'both' : (defaults.arrowHead ?? 'end'),
                    opacity: 1,
                })
            }
        } else if (tool === 'rectangle') {
            const w = currentPoint[0] - startPoint[0]
            const h = currentPoint[1] - startPoint[1]
            if (Math.abs(w) > 0.5 && Math.abs(h) > 0.5) {
                addDrawingObject({
                    layerId,
                    type: 'rectangle',
                    origin: [...startPoint],
                    width: w,
                    height: h,
                    strokeColor: defaults.strokeColor,
                    strokeWidth: defaults.strokeWidth,
                    lineType: defaults.lineType,
                    fillColor: defaults.fillColor,
                    fillOpacity: defaults.fillOpacity,
                    opacity: 1,
                })
            }
        } else if (tool === 'circle') {
            const dx = currentPoint[0] - startPoint[0]
            const dy = currentPoint[1] - startPoint[1]
            const radius = Math.sqrt(dx * dx + dy * dy)
            if (radius > 0.5) {
                addDrawingObject({
                    layerId,
                    type: 'circle',
                    center: [...startPoint],
                    radius,
                    strokeColor: defaults.strokeColor,
                    strokeWidth: defaults.strokeWidth,
                    lineType: defaults.lineType,
                    fillColor: defaults.fillColor,
                    fillOpacity: defaults.fillOpacity,
                    opacity: 1,
                })
            }
        } else if (tool === 'ellipse') {
            const rx = Math.abs(currentPoint[0] - startPoint[0])
            const ry = Math.abs(currentPoint[1] - startPoint[1])
            if (rx > 0.5 && ry > 0.5) {
                addDrawingObject({
                    layerId,
                    type: 'ellipse',
                    center: [...startPoint],
                    radiusX: rx,
                    radiusY: ry,
                    strokeColor: defaults.strokeColor,
                    strokeWidth: defaults.strokeWidth,
                    lineType: defaults.lineType,
                    fillColor: defaults.fillColor,
                    fillOpacity: defaults.fillOpacity,
                    opacity: 1,
                })
            }
        } else if (tool === 'star') {
            const dx = currentPoint[0] - startPoint[0]
            const dy = currentPoint[1] - startPoint[1]
            const outerRadius = Math.sqrt(dx * dx + dy * dy)
            if (outerRadius > 0.5) {
                const numPoints = defaults.starPoints ?? 5
                addDrawingObject({
                    layerId,
                    type: 'star',
                    center: [...startPoint],
                    outerRadius,
                    innerRadius: outerRadius * 0.4,
                    numPoints,
                    strokeColor: defaults.strokeColor,
                    strokeWidth: defaults.strokeWidth,
                    lineType: defaults.lineType,
                    fillColor: defaults.fillColor,
                    fillOpacity: defaults.fillOpacity,
                    opacity: 1,
                })
            }
        } else if (tool === 'octagon') {
            const dx = currentPoint[0] - startPoint[0]
            const dy = currentPoint[1] - startPoint[1]
            const radius = Math.sqrt(dx * dx + dy * dy)
            if (radius > 0.5) {
                addDrawingObject({
                    layerId,
                    type: 'octagon',
                    center: [...startPoint],
                    radius,
                    strokeColor: defaults.strokeColor,
                    strokeWidth: defaults.strokeWidth,
                    lineType: defaults.lineType,
                    fillColor: defaults.fillColor,
                    fillOpacity: defaults.fillOpacity,
                    opacity: 1,
                })
            }
        } else if (tool === 'roundedRect') {
            const w = currentPoint[0] - startPoint[0]
            const h = currentPoint[1] - startPoint[1]
            if (Math.abs(w) > 0.5 && Math.abs(h) > 0.5) {
                const cr = Math.min(defaults.cornerRadius ?? 0, Math.abs(w) / 2, Math.abs(h) / 2)
                addDrawingObject({
                    layerId,
                    type: 'roundedRect',
                    origin: [...startPoint],
                    width: w,
                    height: h,
                    cornerRadius: cr,
                    strokeColor: defaults.strokeColor,
                    strokeWidth: defaults.strokeWidth,
                    lineType: defaults.lineType,
                    fillColor: defaults.fillColor,
                    fillOpacity: defaults.fillOpacity,
                    opacity: 1,
                })
            }
        } else if (tool === 'dimension') {
            const dx = currentPoint[0] - startPoint[0]
            const dy = currentPoint[1] - startPoint[1]
            const len = Math.sqrt(dx * dx + dy * dy)
            if (len > 0.5) {
                addDrawingObject({
                    layerId,
                    type: 'dimension',
                    start: [...startPoint],
                    end: [...currentPoint],
                    label: `${len.toFixed(1)}'`,
                    strokeColor: defaults.strokeColor,
                    strokeWidth: defaults.strokeWidth,
                    lineType: defaults.lineType,
                    fontSize: defaults.fontSize,
                    fontFamily: defaults.fontFamily,
                    textColor: defaults.textColor,
                    opacity: 1,
                })
            }
        }

        // Reset transient state
        drawingState.current = { isDrawing: false, startPoint: null, currentPoint: null, points: [], polygonPlacing: false, leaderPlacing: false }
        setPreviewVersion(v => v + 1)

        // Resume undo, release pointer
        useStore.temporal.getState().resume()
        e.target.releasePointerCapture(e.pointerId)
    }, [drawingMode, controls, addDrawingObject])

    if (!drawingMode) return null

    const activeLayerZ = drawingLayers[activeDrawingLayerId]?.zHeight ?? 0.20

    return (
        <>
            <mesh
                ref={meshRef}
                position={[0, 0, 0]}
                rotation={[0, 0, 0]}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
            >
                <planeGeometry args={[10000, 10000]} />
                <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} />
            </mesh>

            {/* Live preview during drawing */}
            {drawingState.current.isDrawing && previewVersion >= 0 && (
                <group position={[0, 0, activeLayerZ]}>
                    <DrawingPreview
                        tool={drawingMode?.tool}
                        drawingState={drawingState.current}
                        defaults={drawingDefaults}
                    />
                </group>
            )}
        </>
    )
}

export default DrawingCapturePlane
