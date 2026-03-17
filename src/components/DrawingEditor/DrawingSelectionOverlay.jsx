import { useMemo, useRef, useCallback } from 'react'
import { Line } from '@react-three/drei'
import { useStore } from '../../store/useStore'
import { useShallow } from 'zustand/react/shallow'
import { computeObjectBounds } from '../../utils/drawingHitTest'
import { DrawingVertexHandle, DrawingResizeHandle } from './DrawingHandles'

const BBOX_COLOR = '#3B82F6'
const BBOX_PADDING = 2 // ft padding around bounding box

// --- Bounding box line ---

const BoundingBox = ({ bounds }) => {
    const { minX, minY, maxX, maxY } = bounds
    const pts = useMemo(() => [
        [minX, minY, 0],
        [maxX, minY, 0],
        [maxX, maxY, 0],
        [minX, maxY, 0],
        [minX, minY, 0],
    ], [minX, minY, maxX, maxY])

    return (
        <Line
            points={pts}
            color={BBOX_COLOR}
            lineWidth={1}
            dashed
            dashScale={1}
            dashSize={3}
            gapSize={2}
            depthTest={false}
        />
    )
}

// --- Per-type handle renderers ---

const PolygonVertexHandles = ({ obj, objId }) => {
    const updateDrawingObject = useStore(state => state.updateDrawingObject)

    const handleDrag = useCallback((vertexIndex, x, y) => {
        const objects = useStore.getState().drawingObjects
        const current = objects[objId]
        if (!current) return
        const newPoints = [...current.points]
        newPoints[vertexIndex] = [x, y]
        updateDrawingObject(objId, { points: newPoints })
    }, [objId, updateDrawingObject])

    // Skip vertex handles for freehand with too many points
    if (obj.points.length > 50) return null

    return (
        <>
            {obj.points.map((pt, i) => (
                <DrawingVertexHandle
                    key={i}
                    position={pt}
                    index={i}
                    onDrag={handleDrag}
                />
            ))}
        </>
    )
}

const LineEndpointHandles = ({ obj, objId }) => {
    const updateDrawingObject = useStore(state => state.updateDrawingObject)

    const handleDrag = useCallback((index, x, y) => {
        if (index === 0) {
            updateDrawingObject(objId, { start: [x, y] })
        } else {
            updateDrawingObject(objId, { end: [x, y] })
        }
    }, [objId, updateDrawingObject])

    return (
        <>
            <DrawingVertexHandle position={obj.start} index={0} onDrag={handleDrag} />
            <DrawingVertexHandle position={obj.end} index={1} onDrag={handleDrag} />
        </>
    )
}

const LeaderEndpointHandles = ({ obj, objId }) => {
    const updateDrawingObject = useStore(state => state.updateDrawingObject)

    const handleDrag = useCallback((index, x, y) => {
        if (index === 0) {
            updateDrawingObject(objId, { targetPoint: [x, y] })
        } else {
            updateDrawingObject(objId, { textPosition: [x, y] })
        }
    }, [objId, updateDrawingObject])

    return (
        <>
            <DrawingVertexHandle position={obj.targetPoint} index={0} onDrag={handleDrag} />
            <DrawingVertexHandle position={obj.textPosition} index={1} onDrag={handleDrag} />
        </>
    )
}

const RectResizeHandles = ({ obj, objId }) => {
    const updateDrawingObject = useStore(state => state.updateDrawingObject)
    const anchorRef = useRef(null)

    const [ox, oy] = obj.origin
    const w = obj.width
    const h = obj.height

    // 4 corners: [originCorner, rightCorner, oppositeCorner, topCorner]
    const corners = useMemo(() => [
        [ox, oy],
        [ox + w, oy],
        [ox + w, oy + h],
        [ox, oy + h],
    ], [ox, oy, w, h])

    // 4 edge midpoints
    const edges = useMemo(() => [
        [(ox + ox + w) / 2, oy],           // bottom
        [ox + w, (oy + oy + h) / 2],       // right
        [(ox + ox + w) / 2, oy + h],        // top
        [ox, (oy + oy + h) / 2],            // left
    ], [ox, oy, w, h])

    // Corner drag: anchor is the opposite corner
    const handleCornerDragStart = useCallback((cornerIndex) => {
        const oppositeIndex = (cornerIndex + 2) % 4
        anchorRef.current = corners[oppositeIndex]
    }, [corners])

    const handleCornerDrag = useCallback((x, y) => {
        if (!anchorRef.current) return
        const [ax, ay] = anchorRef.current
        const newOriginX = Math.min(ax, x)
        const newOriginY = Math.min(ay, y)
        const newW = Math.abs(x - ax)
        const newH = Math.abs(y - ay)
        if (newW < 0.5 || newH < 0.5) return
        const updates = { origin: [newOriginX, newOriginY], width: newW, height: newH }
        if (obj.type === 'roundedRect') {
            updates.cornerRadius = Math.min(obj.cornerRadius ?? 0, newW / 2, newH / 2)
        }
        updateDrawingObject(objId, updates)
    }, [objId, obj.type, obj.cornerRadius, updateDrawingObject])

    // Edge drag: only one dimension changes
    const handleEdgeDrag = useCallback((edgeIndex, x, y) => {
        const currentObj = useStore.getState().drawingObjects[objId]
        if (!currentObj) return
        const [cox, coy] = currentObj.origin
        const cw = currentObj.width
        const ch = currentObj.height

        let updates
        if (edgeIndex === 0) {
            // Bottom edge: change origin Y and height
            const topY = coy + ch
            const newH = topY - y
            if (Math.abs(newH) < 0.5) return
            updates = { origin: [cox, y], height: newH }
        } else if (edgeIndex === 1) {
            // Right edge: change width
            const newW = x - cox
            if (Math.abs(newW) < 0.5) return
            updates = { width: newW }
        } else if (edgeIndex === 2) {
            // Top edge: change height
            const newH = y - coy
            if (Math.abs(newH) < 0.5) return
            updates = { height: newH }
        } else {
            // Left edge: change origin X and width
            const rightX = cox + cw
            const newW = rightX - x
            if (Math.abs(newW) < 0.5) return
            updates = { origin: [x, coy], width: newW }
        }

        if (obj.type === 'roundedRect' && updates) {
            const finalW = updates.width ?? cw
            const finalH = updates.height ?? ch
            updates.cornerRadius = Math.min(currentObj.cornerRadius ?? 0, Math.abs(finalW) / 2, Math.abs(finalH) / 2)
        }
        updateDrawingObject(objId, updates)
    }, [objId, obj.type, updateDrawingObject])

    return (
        <>
            {/* Corner handles */}
            {corners.map((pos, i) => (
                <DrawingResizeHandle
                    key={`corner-${i}`}
                    position={pos}
                    size={3.0}
                    onDragStart={() => handleCornerDragStart(i)}
                    onDrag={(x, y) => handleCornerDrag(x, y)}
                />
            ))}
            {/* Edge midpoint handles */}
            {edges.map((pos, i) => (
                <DrawingResizeHandle
                    key={`edge-${i}`}
                    position={pos}
                    size={2.4}
                    onDrag={(x, y) => handleEdgeDrag(i, x, y)}
                />
            ))}
        </>
    )
}

const CircleResizeHandle = ({ obj, objId, radiusKey = 'radius' }) => {
    const updateDrawingObject = useStore(state => state.updateDrawingObject)

    const handlePos = useMemo(() => [
        obj.center[0] + obj[radiusKey],
        obj.center[1],
    ], [obj.center, obj[radiusKey]])

    const handleDrag = useCallback((x, y) => {
        const dx = x - obj.center[0]
        const dy = y - obj.center[1]
        const newRadius = Math.max(0.5, Math.sqrt(dx * dx + dy * dy))
        updateDrawingObject(objId, { [radiusKey]: newRadius })
    }, [objId, obj.center, radiusKey, updateDrawingObject])

    return (
        <DrawingResizeHandle
            position={handlePos}
            size={3.0}
            onDrag={handleDrag}
        />
    )
}

const EllipseResizeHandles = ({ obj, objId }) => {
    const updateDrawingObject = useStore(state => state.updateDrawingObject)

    const handlePosX = useMemo(() => [obj.center[0] + obj.radiusX, obj.center[1]], [obj.center, obj.radiusX])
    const handlePosY = useMemo(() => [obj.center[0], obj.center[1] + obj.radiusY], [obj.center, obj.radiusY])

    const handleDragX = useCallback((x, _y) => {
        const newRX = Math.max(0.5, Math.abs(x - obj.center[0]))
        updateDrawingObject(objId, { radiusX: newRX })
    }, [objId, obj.center, updateDrawingObject])

    const handleDragY = useCallback((_x, y) => {
        const newRY = Math.max(0.5, Math.abs(y - obj.center[1]))
        updateDrawingObject(objId, { radiusY: newRY })
    }, [objId, obj.center, updateDrawingObject])

    return (
        <>
            <DrawingResizeHandle position={handlePosX} size={3.0} onDrag={handleDragX} />
            <DrawingResizeHandle position={handlePosY} size={3.0} onDrag={handleDragY} />
        </>
    )
}

const StarResizeHandles = ({ obj, objId }) => {
    const updateDrawingObject = useStore(state => state.updateDrawingObject)

    // Outer radius handle at top
    const outerPos = useMemo(() => [obj.center[0], obj.center[1] + obj.outerRadius], [obj.center, obj.outerRadius])
    // Inner radius handle at right, at inner radius distance
    const innerPos = useMemo(() => [obj.center[0] + obj.innerRadius, obj.center[1]], [obj.center, obj.innerRadius])

    const handleOuterDrag = useCallback((x, y) => {
        const dx = x - obj.center[0]
        const dy = y - obj.center[1]
        const newOuter = Math.max(0.5, Math.sqrt(dx * dx + dy * dy))
        // Keep inner proportional if it would exceed outer
        const currentInner = obj.innerRadius
        const updates = { outerRadius: newOuter }
        if (currentInner >= newOuter) {
            updates.innerRadius = newOuter * 0.4
        }
        updateDrawingObject(objId, updates)
    }, [objId, obj.center, obj.innerRadius, updateDrawingObject])

    const handleInnerDrag = useCallback((x, y) => {
        const dx = x - obj.center[0]
        const dy = y - obj.center[1]
        const newInner = Math.max(0.3, Math.min(Math.sqrt(dx * dx + dy * dy), obj.outerRadius - 0.1))
        updateDrawingObject(objId, { innerRadius: newInner })
    }, [objId, obj.center, obj.outerRadius, updateDrawingObject])

    return (
        <>
            <DrawingResizeHandle position={outerPos} size={3.0} onDrag={handleOuterDrag} />
            <DrawingResizeHandle position={innerPos} size={2.4} onDrag={handleInnerDrag} />
        </>
    )
}

// --- Handles for a single object based on its type ---

const ObjectHandles = ({ obj, objId, interactive }) => {
    if (!interactive) return null

    switch (obj.type) {
        case 'polygon':
        case 'freehand':
            return <PolygonVertexHandles obj={obj} objId={objId} />
        case 'line':
        case 'arrow':
        case 'dimension':
            return <LineEndpointHandles obj={obj} objId={objId} />
        case 'leader':
            return <LeaderEndpointHandles obj={obj} objId={objId} />
        case 'rectangle':
        case 'roundedRect':
            return <RectResizeHandles obj={obj} objId={objId} />
        case 'circle':
        case 'octagon':
            return <CircleResizeHandle obj={obj} objId={objId} />
        case 'ellipse':
            return <EllipseResizeHandles obj={obj} objId={objId} />
        case 'star':
            return <StarResizeHandles obj={obj} objId={objId} />
        case 'text':
            return null // Move only, no type-specific handles
        default:
            return null
    }
}

// --- Main overlay ---

const DrawingSelectionOverlay = () => {
    const { selectedDrawingIds, drawingObjects, drawingLayers, drawingMode } = useStore(useShallow(state => ({
        selectedDrawingIds: state.selectedDrawingIds,
        drawingObjects: state.drawingObjects,
        drawingLayers: state.drawingLayers,
        drawingMode: state.drawingMode,
    })))

    // Determine if handles should be interactive
    // Interactive when: no drawing tool active, or select tool active
    const interactive = !drawingMode || drawingMode.tool === 'select'

    // Get selected objects
    const selectedObjects = useMemo(() => {
        const result = []
        for (const id of selectedDrawingIds) {
            const obj = drawingObjects[id]
            if (obj) result.push({ id, obj })
        }
        return result
    }, [selectedDrawingIds, drawingObjects])

    // Compute union bounding box
    const unionBounds = useMemo(() => {
        if (selectedObjects.length === 0) return null
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        for (const { obj } of selectedObjects) {
            const b = computeObjectBounds(obj)
            if (b.minX < minX) minX = b.minX
            if (b.minY < minY) minY = b.minY
            if (b.maxX > maxX) maxX = b.maxX
            if (b.maxY > maxY) maxY = b.maxY
        }
        return {
            minX: minX - BBOX_PADDING,
            minY: minY - BBOX_PADDING,
            maxX: maxX + BBOX_PADDING,
            maxY: maxY + BBOX_PADDING,
        }
    }, [selectedObjects])

    // Determine z-height from first selected object's layer
    const zHeight = useMemo(() => {
        if (selectedObjects.length === 0) return 0.20
        const firstObj = selectedObjects[0].obj
        const layer = drawingLayers[firstObj.layerId]
        return (layer?.zHeight ?? 0.20) + 0.02
    }, [selectedObjects, drawingLayers])

    if (selectedObjects.length === 0 || !unionBounds) return null

    // Only show type-specific handles for single selection
    const singleSelected = selectedObjects.length === 1

    return (
        <group position={[0, 0, zHeight]}>
            {/* Bounding box */}
            <BoundingBox bounds={unionBounds} />

            {/* Type-specific handles (only for single selection) */}
            {singleSelected && (
                <ObjectHandles
                    obj={selectedObjects[0].obj}
                    objId={selectedObjects[0].id}
                    interactive={interactive}
                />
            )}
        </group>
    )
}

export default DrawingSelectionOverlay
