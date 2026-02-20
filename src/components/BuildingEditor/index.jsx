import { useCallback, useMemo, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { Line, Edges } from '@react-three/drei'
import { Select } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useStore } from '../../store/useStore'
import VertexHandle from '../LotEditor/VertexHandle'
import MidpointHandle from '../LotEditor/MidpointHandle'
import EdgeHandle from '../LotEditor/EdgeHandle'
import HeightHandle from './HeightHandle'
import MoveHandle from './MoveHandle'
import PolygonBuilding from './PolygonBuilding'
import RoofMesh from './RoofMesh'
import Dimension from '../Dimension'
import { formatDimension } from '../../utils/formatUnits'

// Helper function to resolve dimension label based on custom label settings
const resolveDimensionLabel = (value, dimensionKey, dimensionSettings) => {
    const customLabels = dimensionSettings?.customLabels || {}
    const labelConfig = customLabels[dimensionKey]
    if (labelConfig?.mode === 'custom') {
        return labelConfig.text || ''
    }
    return formatDimension(value, dimensionSettings?.unitFormat || 'feet')
}

const BuildingEditor = ({
    model,
    // Building dimensions (rectangle mode)
    width,
    depth,
    x,
    y,
    // Building polygon state
    buildingGeometry,
    selected = false,
    buildingType = 'principal',
    // Story system
    stories = 1,
    firstFloorHeight = 12,
    upperFloorHeight = 10,
    // Max height / roof
    maxHeight = 30,
    showMaxHeightPlane = false,
    maxHeightPlaneStyle = {},
    roof = { type: 'flat' },
    roofStyles = {},
    showRoof = true,
    // Styles
    styles,
    scaleFactor = 1,
    lineScale = 1,
    // Dimensions
    showHeightDimensions = false,
    dimensionSettings = {},
    heightDimensionKey = 'buildingHeight',
    // Layout
    offsetGroupX = 0,
    offsetGroupY = 0,
    // Callbacks
    onSelect,
    enableBuildingPolygonMode,
    updateBuildingVertex,
    splitBuildingEdge,
    extrudeBuildingEdge,
    setBuildingTotalHeight,
    onBuildingMove,
}) => {
    const { faces, edges } = styles
    const maxHeightDimKey = buildingType === 'principal' ? 'principalMaxHeight' : 'accessoryMaxHeight'
    const [hovered, setHovered] = useState(false)
    const { controls } = useThree()
    const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), [])
    const planeIntersectPoint = new THREE.Vector3()

    // Move mode state
    const moveMode = useStore((s) => s.moveMode)
    const setMoveTarget = useStore((s) => s.setMoveTarget)
    const setMoveBasePoint = useStore((s) => s.setMoveBasePoint)
    // Is this building the current move target?
    const isMoveModeTarget = moveMode?.active && moveMode.targetType === 'building' && moveMode.targetLotId === model && moveMode.targetBuildingType === buildingType

    const isPolygon = buildingGeometry?.mode === 'polygon' && buildingGeometry?.vertices?.length >= 3
    const vertices = buildingGeometry?.vertices

    // Calculate total building height from stories
    const totalBuildingHeight = useMemo(() => {
        if (stories <= 0) return 0
        if (stories === 1) return firstFloorHeight
        return firstFloorHeight + (stories - 1) * upperFloorHeight
    }, [stories, firstFloorHeight, upperFloorHeight])

    // Generate floor data for rendering
    const floors = useMemo(() => {
        const floorData = []
        let currentZ = 0
        for (let i = 0; i < stories; i++) {
            const floorHeight = i === 0 ? firstFloorHeight : upperFloorHeight
            floorData.push({
                index: i,
                height: floorHeight,
                zBottom: currentZ,
                zCenter: currentZ + floorHeight / 2,
            })
            currentZ += floorHeight
        }
        return floorData
    }, [stories, firstFloorHeight, upperFloorHeight])

    // Generate vertices for rectangle mode (for handles/dimensions when selected)
    const rectVertices = useMemo(() => {
        if (isPolygon) return null
        return [
            { id: 'r0', x: x - width / 2, y: y - depth / 2 },
            { id: 'r1', x: x + width / 2, y: y - depth / 2 },
            { id: 'r2', x: x + width / 2, y: y + depth / 2 },
            { id: 'r3', x: x - width / 2, y: y + depth / 2 },
        ]
    }, [isPolygon, x, y, width, depth])

    // Active vertices (polygon or generated from rect)
    const activeVertices = isPolygon ? vertices : rectVertices

    // Compute actual bounds from polygon vertices (or fall back to rect params)
    const bounds = useMemo(() => {
        if (isPolygon && vertices && vertices.length >= 3) {
            const xs = vertices.map(v => v.x)
            const ys = vertices.map(v => v.y)
            const minX = Math.min(...xs)
            const maxX = Math.max(...xs)
            const minY = Math.min(...ys)
            const maxY = Math.max(...ys)
            return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, w: maxX - minX, d: maxY - minY }
        }
        return { cx: x, cy: y, w: width, d: depth }
    }, [isPolygon, vertices, x, y, width, depth])

    // Compute edges for dimension display
    const footprintEdges = useMemo(() => {
        if (!activeVertices || activeVertices.length < 3) return []
        return activeVertices.map((v, i) => {
            const nextV = activeVertices[(i + 1) % activeVertices.length]
            const dx = nextV.x - v.x
            const dy = nextV.y - v.y
            const length = Math.sqrt(dx * dx + dy * dy)
            return { start: v, end: nextV, length: Math.round(length), index: i }
        })
    }, [activeVertices])

    // ============================================
    // Pointer handlers for building drag (position)
    // ============================================

    const handlePointerDown = (e) => {
        // Move mode: select object phase
        if (moveMode?.active && moveMode.phase === 'selectObject') {
            e.stopPropagation()
            if (onSelect) onSelect()
            setMoveTarget('building', model, buildingType, null)
            return
        }

        // Move mode: select base point phase
        if (moveMode?.active && moveMode.phase === 'selectBase' && isMoveModeTarget) {
            e.stopPropagation()
            if (e.ray.intersectPlane(plane, planeIntersectPoint)) {
                const localX = planeIntersectPoint.x - offsetGroupX
                const localY = planeIntersectPoint.y - offsetGroupY
                setMoveBasePoint([localX, localY], [x, y])
            }
            useStore.temporal.getState().pause()
            if (controls) controls.enabled = false
            return
        }

        // During moving phase, DON'T stopPropagation — let capture plane handle finalize
        if (moveMode?.active) return

        // Normal click: select building
        e.stopPropagation()
        if (onSelect) onSelect()
    }

    const handlePointerUp = () => {}
    const handlePointerMove = () => {}

    // ============================================
    // Handle callbacks for polygon editing
    // ============================================

    const ensurePolygonMode = useCallback(() => {
        if (!isPolygon && enableBuildingPolygonMode) {
            enableBuildingPolygonMode(model)
        }
    }, [isPolygon, model, enableBuildingPolygonMode])

    const handleVertexDrag = useCallback((vertexIndex, newX, newY) => {
        ensurePolygonMode()
        if (updateBuildingVertex) {
            updateBuildingVertex(model, vertexIndex, newX, newY)
        }
    }, [model, updateBuildingVertex, ensurePolygonMode])

    const handleVertexDragEnd = useCallback(() => {}, [])

    const handleSplit = useCallback((edgeIndex) => {
        ensurePolygonMode()
        if (splitBuildingEdge) {
            splitBuildingEdge(model, edgeIndex)
        }
    }, [model, splitBuildingEdge, ensurePolygonMode])

    const handleExtrude = useCallback((edgeIndex, distance) => {
        ensurePolygonMode()
        if (extrudeBuildingEdge) {
            extrudeBuildingEdge(model, edgeIndex, distance)
        }
    }, [model, extrudeBuildingEdge, ensurePolygonMode])

    const handleHeightChange = useCallback((newHeight) => {
        if (setBuildingTotalHeight) {
            setBuildingTotalHeight(model, newHeight)
        }
    }, [model, setBuildingTotalHeight])

    // Dimension start/end for height (use polygon-aware bounds)
    const dimStart = [bounds.cx + bounds.w / 2, bounds.cy + bounds.d / 2, 0]
    const dimEnd = [bounds.cx + bounds.w / 2, bounds.cy + bounds.d / 2, totalBuildingHeight]

    // Center position for height handle (use polygon-aware bounds)
    const heightHandlePos = [bounds.cx, bounds.cy, totalBuildingHeight + 1.5]

    // Vertices to use for roof (generate from rect if needed)
    const roofVertices = useMemo(() => {
        if (isPolygon) return vertices
        return [
            { x: x - width / 2, y: y - depth / 2 },
            { x: x + width / 2, y: y - depth / 2 },
            { x: x + width / 2, y: y + depth / 2 },
            { x: x - width / 2, y: y + depth / 2 },
        ]
    }, [isPolygon, vertices, x, y, width, depth])

    return (
        <group>
            {/* ============================================ */}
            {/* Building Floors */}
            {/* ============================================ */}

            {isPolygon ? (
                // Polygon mode: use ExtrudeGeometry
                <PolygonBuilding
                    vertices={vertices}
                    floors={floors}
                    styles={styles}
                    lineScale={lineScale}
                    scaleFactor={scaleFactor}
                    isMoveModeTarget={isMoveModeTarget}
                    moveMode={moveMode}
                    onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
                    onPointerOut={() => setHovered(false)}
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    onPointerMove={handlePointerMove}
                />
            ) : (
                // Rectangle mode: use boxGeometry (existing behavior)
                floors.map((floor, index) => {
                    const effectiveOpacity = isMoveModeTarget ? 0.7 : (moveMode?.active && moveMode.phase === 'selectObject') ? 0.8 : faces.opacity
                    return (
                    <Select key={floor.index} enabled={hovered && index === 0}>
                        <mesh
                            position={[x, y, floor.zCenter]}
                            castShadow
                            receiveShadow
                            renderOrder={4}
                            onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
                            onPointerOut={() => setHovered(false)}
                            onPointerDown={index === 0 ? handlePointerDown : undefined}
                            onPointerUp={index === 0 ? handlePointerUp : undefined}
                            onPointerMove={index === 0 ? handlePointerMove : undefined}
                        >
                            <boxGeometry args={[width, depth, floor.height]} />
                            <meshStandardMaterial
                                color={isMoveModeTarget ? '#00ff88' : (moveMode?.active && moveMode.phase === 'selectObject') ? '#88ccff' : faces.color}
                                transparent={effectiveOpacity < 1}
                                opacity={effectiveOpacity}
                                side={THREE.DoubleSide}
                                depthWrite={effectiveOpacity >= 0.95}
                                roughness={0.7}
                                metalness={0.1}
                            />
                            {edges.visible && (
                                <Edges
                                    linewidth={edges.width * scaleFactor * lineScale}
                                    threshold={15}
                                    color={edges.color}
                                    transparent
                                    opacity={edges.opacity}
                                />
                            )}
                        </mesh>
                    </Select>
                    )
                })
            )}

            {/* ============================================ */}
            {/* Roof */}
            {/* ============================================ */}

            {showRoof && roof.type !== 'flat' && (
                <RoofMesh
                    vertices={roofVertices}
                    roofSettings={roof}
                    baseZ={totalBuildingHeight}
                    maxHeight={maxHeight}
                    styles={roofStyles}
                    lineScale={lineScale}
                    scaleFactor={scaleFactor}
                />
            )}

            {/* ============================================ */}
            {/* Max Height Plane */}
            {/* ============================================ */}

            {showMaxHeightPlane && maxHeight > 0 && (
                <group position={[bounds.cx, bounds.cy, maxHeight + 0.05]}>
                    <mesh renderOrder={6}>
                        <planeGeometry args={[bounds.w, bounds.d]} />
                        <meshStandardMaterial
                            color={maxHeightPlaneStyle.color ?? '#FF6B6B'}
                            transparent={true}
                            opacity={maxHeightPlaneStyle.opacity ?? 0.3}
                            side={THREE.DoubleSide}
                            depthWrite={false}
                        />
                    </mesh>
                    <Line
                        points={[
                            [-bounds.w / 2, -bounds.d / 2, 0],
                            [bounds.w / 2, -bounds.d / 2, 0],
                            [bounds.w / 2, bounds.d / 2, 0],
                            [-bounds.w / 2, bounds.d / 2, 0],
                            [-bounds.w / 2, -bounds.d / 2, 0],
                        ]}
                        color={maxHeightPlaneStyle.lineColor || '#FF0000'}
                        lineWidth={(maxHeightPlaneStyle.lineWidth || 2) * lineScale}
                        dashed={maxHeightPlaneStyle.lineDashed || false}
                        dashSize={1}
                        gapSize={0.5}
                    />
                </group>
            )}

            {/* ============================================ */}
            {/* Height Dimension */}
            {/* ============================================ */}

            <Dimension
                start={dimStart}
                end={dimEnd}
                label={resolveDimensionLabel(totalBuildingHeight, heightDimensionKey, dimensionSettings)}
                offset={10}
                color="black"
                visible={showHeightDimensions}
                settings={dimensionSettings}
                lineScale={lineScale}
                plane="XZ"
                textMode="billboard"
            />

            {/* Max height dimension — offset further out, only when maxHeight is set */}
            {showHeightDimensions && maxHeight > 0 && (
                <Dimension
                    start={dimStart}
                    end={[dimStart[0], dimStart[1], maxHeight]}
                    label={resolveDimensionLabel(maxHeight, maxHeightDimKey, dimensionSettings)}
                    offset={20}
                    color="black"
                    visible={true}
                    settings={dimensionSettings}
                    lineScale={lineScale}
                    plane="XZ"
                    textMode="billboard"
                />
            )}

            {/* ============================================ */}
            {/* Selection Handles (shown when selected) */}
            {/* ============================================ */}

            {selected && activeVertices && activeVertices.length >= 3 && (
                <>
                    {/* Vertex handles at each footprint corner */}
                    {activeVertices.map((vertex, index) => (
                        <VertexHandle
                            key={vertex.id || `bv-${index}`}
                            position={vertex}
                            vertexIndex={index}
                            onDrag={handleVertexDrag}
                            onDragEnd={handleVertexDragEnd}
                            offsetGroupX={offsetGroupX}
                        />
                    ))}

                    {/* Midpoint handles on each edge */}
                    {activeVertices.map((vertex, index) => {
                        const nextVertex = activeVertices[(index + 1) % activeVertices.length]
                        return (
                            <MidpointHandle
                                key={`bmid-${vertex.id || index}`}
                                v1={vertex}
                                v2={nextVertex}
                                edgeIndex={index}
                                onSplit={handleSplit}
                            />
                        )
                    })}

                    {/* Edge extrusion handles */}
                    {activeVertices.map((vertex, index) => {
                        const nextVertex = activeVertices[(index + 1) % activeVertices.length]
                        return (
                            <EdgeHandle
                                key={`bedge-${vertex.id || index}`}
                                v1={vertex}
                                v2={nextVertex}
                                edgeIndex={index}
                                onExtrude={handleExtrude}
                                offsetGroupX={offsetGroupX}
                            />
                        )
                    })}

                    {/* Height handle at top of building */}
                    <HeightHandle
                        position={heightHandlePos}
                        totalHeight={totalBuildingHeight}
                        onHeightChange={handleHeightChange}
                        offsetGroupX={offsetGroupX}
                    />

                    {/* Move handle at footprint center, raised above building + offset from HeightHandle */}
                    <MoveHandle
                        position={[bounds.cx, bounds.cy]}
                        zPosition={totalBuildingHeight + 0.5}
                        displayOffset={[-bounds.w * 0.25, -bounds.d * 0.25]}
                        offsetGroupX={offsetGroupX}
                        offsetGroupY={offsetGroupY}
                        onDrag={(newX, newY) => { if (onBuildingMove) onBuildingMove(newX, newY) }}
                        onDragEnd={() => {}}
                    />

                    {/* Footprint edge dimensions */}
                    {footprintEdges.map((edge) => (
                        <Dimension
                            key={`bdim-${edge.index}`}
                            start={[edge.start.x, edge.start.y, 0.1]}
                            end={[edge.end.x, edge.end.y, 0.1]}
                            label={`${edge.length}'`}
                            offset={-3}
                            color="black"
                            visible={true}
                            settings={dimensionSettings}
                            lineScale={lineScale}
                        />
                    ))}
                </>
            )}

        </group>
    )
}

export default BuildingEditor
