import { useCallback, useMemo, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { Line, Edges } from '@react-three/drei'
import { Select } from '@react-three/postprocessing'
import * as THREE from 'three'
import VertexHandle from '../LotEditor/VertexHandle'
import MidpointHandle from '../LotEditor/MidpointHandle'
import EdgeHandle from '../LotEditor/EdgeHandle'
import HeightHandle from './HeightHandle'
import PolygonBuilding from './PolygonBuilding'
import RoofMesh from './RoofMesh'
import Dimension from '../Dimension'

// Helper function to resolve dimension label based on custom label settings
const resolveDimensionLabel = (value, dimensionKey, dimensionSettings) => {
    const customLabels = dimensionSettings?.customLabels || {}
    const labelConfig = customLabels[dimensionKey]
    if (labelConfig?.mode === 'custom') {
        return labelConfig.text || ''
    }
    return `${value}'`
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
    // Callbacks
    onSelect,
    onPositionChange,
    enableBuildingPolygonMode,
    updateBuildingVertex,
    splitBuildingEdge,
    extrudeBuildingEdge,
    setBuildingTotalHeight,
}) => {
    const { faces, edges } = styles
    const [hovered, setHovered] = useState(false)
    const [dragging, setDragging] = useState(false)
    const { controls } = useThree()
    const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), [])
    const planeIntersectPoint = new THREE.Vector3()

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
        e.stopPropagation()
        // Select building on click
        if (onSelect) onSelect()
        if (controls) controls.enabled = false
        setDragging(true)
        e.target.setPointerCapture(e.pointerId)
    }

    const handlePointerUp = (e) => {
        e.stopPropagation()
        setDragging(false)
        if (controls) controls.enabled = true
        e.target.releasePointerCapture(e.pointerId)
    }

    const handlePointerMove = (e) => {
        if (!dragging) return
        e.stopPropagation()

        if (!e.ray.intersectPlane(plane, planeIntersectPoint)) return

        const localX = planeIntersectPoint.x - offsetGroupX
        const localY = planeIntersectPoint.y
        const snappedX = Math.round(localX)
        const snappedY = Math.round(localY)

        if (onPositionChange && (snappedX !== x || snappedY !== y)) {
            onPositionChange(snappedX, snappedY)
        }
    }

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

    // Dimension start/end for height
    const dimStart = [x + width / 2, y + depth / 2, 0]
    const dimEnd = [x + width / 2, y + depth / 2, totalBuildingHeight]

    // Center position for height handle
    const heightHandlePos = [x, y, totalBuildingHeight + 1.5]

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
                    dragging={dragging}
                    onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
                    onPointerOut={() => setHovered(false)}
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    onPointerMove={handlePointerMove}
                />
            ) : (
                // Rectangle mode: use boxGeometry (existing behavior)
                floors.map((floor, index) => (
                    <Select key={floor.index} enabled={hovered && index === 0}>
                        <mesh
                            position={[x, y, floor.zCenter]}
                            castShadow
                            receiveShadow
                            onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
                            onPointerOut={() => setHovered(false)}
                            onPointerDown={index === 0 ? handlePointerDown : undefined}
                            onPointerUp={index === 0 ? handlePointerUp : undefined}
                            onPointerMove={index === 0 ? handlePointerMove : undefined}
                        >
                            <boxGeometry args={[width, depth, floor.height]} />
                            <meshStandardMaterial
                                color={dragging ? '#ffff00' : faces.color}
                                transparent={true}
                                opacity={dragging ? 0.8 : faces.opacity}
                                side={THREE.DoubleSide}
                                depthWrite={faces.opacity >= 0.95}
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
                ))
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
                <group position={[x, y, maxHeight]}>
                    <mesh>
                        <planeGeometry args={[width, depth]} />
                        <meshStandardMaterial
                            color={maxHeightPlaneStyle.color || '#FF6B6B'}
                            transparent={true}
                            opacity={maxHeightPlaneStyle.opacity || 0.3}
                            side={THREE.DoubleSide}
                            depthWrite={false}
                        />
                    </mesh>
                    <Line
                        points={[
                            [-width / 2, -depth / 2, 0],
                            [width / 2, -depth / 2, 0],
                            [width / 2, depth / 2, 0],
                            [-width / 2, depth / 2, 0],
                            [-width / 2, -depth / 2, 0],
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
            />

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

            {/* Capture Plane for smooth dragging outside the box */}
            {dragging && (
                <mesh
                    visible={false}
                    position={[0, 0, 0]}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                >
                    <planeGeometry args={[1000, 1000]} />
                </mesh>
            )}
        </group>
    )
}

export default BuildingEditor
