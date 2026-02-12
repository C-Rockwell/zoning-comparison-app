import { useStore } from '../store/useStore'
import { useMemo, useState } from 'react'
import { Line, Edges } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { Select } from '@react-three/postprocessing'
import * as THREE from 'three'
import Dimension from './Dimension'
import LotEditor from './LotEditor'
import RoadModule from './RoadModule'

// Helper function to resolve dimension label based on custom label settings
const resolveDimensionLabel = (value, dimensionKey, dimensionSettings) => {
    const customLabels = dimensionSettings?.customLabels || {}
    const labelConfig = customLabels[dimensionKey]
    if (labelConfig?.mode === 'custom') {
        // Return custom text, or empty string if blank (hides label but keeps dimension lines)
        return labelConfig.text || ''
    }
    return `${value}'`
}

const Building = ({
    width,
    depth,
    x,
    y,
    styles,
    renderSettings,
    scaleFactor = 1,
    onPositionChange,
    offsetGroupX = 0,
    showHeightDimensions = false,
    dimensionSettings = {},
    heightDimensionKey = 'buildingHeight',
    // New props for stories
    stories = 1,
    firstFloorHeight = 12,
    upperFloorHeight = 10,
    // Max height plane props
    maxHeight = 30,
    showMaxHeightPlane = false,
    maxHeightPlaneStyle = {},
    // Line scale for export WYSIWYG
    lineScale = 1,
}) => {
    const { faces, edges } = styles
    const [hovered, setHovered] = useState(false)
    const [dragging, setDragging] = useState(false)
    const { camera, gl, controls } = useThree()
    const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), [])
    const planeIntersectPoint = new THREE.Vector3()

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

    const handlePointerDown = (e) => {
        e.stopPropagation()
        // Disable orbit controls while dragging
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

        // Raycast to Z=0 plane. intersectPlane returns null if no intersection.
        // We pass the target/result vector as second argument.
        if (!e.ray.intersectPlane(plane, planeIntersectPoint)) return

        // Convert world to local (subtract group offset)
        const localX = planeIntersectPoint.x - offsetGroupX
        const localY = planeIntersectPoint.y

        // Snap to 1x1 grid
        const snappedX = Math.round(localX)
        const snappedY = Math.round(localY)

        // Only update if value changed to prevent infinite re-render loops
        if (onPositionChange && (snappedX !== x || snappedY !== y)) {
            onPositionChange(snappedX, snappedY)
        }
    }

    // Dimension Points (use total building height)
    const dimStart = [x + width / 2, y + depth / 2, 0]
    const dimEnd = [x + width / 2, y + depth / 2, totalBuildingHeight]

    return (
        <group>
            {/* Render each floor as a separate box */}
            {floors.map((floor, index) => (
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
            ))}

            {/* Max Height Plane */}
            {showMaxHeightPlane && maxHeight > 0 && (
                <group position={[x, y, maxHeight]}>
                    {/* Semi-transparent plane */}
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
                    {/* Border lines */}
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

            {/* Height Dimension (shows total building height) */}
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

            {/* Capture Plane for smooth dragging outside the box */}
            {dragging && (
                <mesh
                    visible={false}
                    position={[0, 0, 0]}
                    rotation={[0, 0, 0]}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                >
                    <planeGeometry args={[1000, 1000]} />
                </mesh>
            )}
        </group>
    )
}

const SingleLine = ({ start, end, style, side, lineScale = 1 }) => {
    // Determine effective style
    const override = style.overrides?.[side]
    const useOverride = override?.enabled

    const color = useOverride ? override.color : style.color
    const width = useOverride ? override.width : style.width
    const dashed = useOverride ? override.dashed : style.dashed
    const dashScale = style.dashScale || 5 // Inherit global scale
    const dashSize = style.dashSize || 1
    const gapSize = style.gapSize || 0.5

    return (
        <Line
            points={[start, end]}
            color={color}
            lineWidth={width * lineScale}
            dashed={dashed}
            dashScale={dashed ? dashScale : 1}
            dashSize={dashSize}
            gapSize={gapSize}
            transparent
            opacity={style.opacity}
        />
    )
}

const Lot = ({ width, depth, x, y, style, fillStyle, scaleFactor = 1, showWidthDimensions = false, showDepthDimensions = false, dimensionSettings = {}, dimensionSide = 'right', widthDimensionKey = 'lotWidth', depthDimensionKey = 'lotDepth', lineScale = 1 }) => {
    const w2 = width / 2
    const d2 = depth / 2

    // Points
    const p1 = [-w2, -d2, 0] // Bottom Left
    const p2 = [w2, -d2, 0]  // Bottom Right
    const p3 = [w2, d2, 0]   // Top Right
    const p4 = [-w2, d2, 0]  // Top Left

    return (
        <group position={[x, y, 0]}>
            {fillStyle.visible && (
                <mesh position={[0, 0, 0.02]} receiveShadow>
                    <planeGeometry args={[width, depth]} />
                    <meshStandardMaterial
                        color={fillStyle.color}
                        opacity={fillStyle.opacity}
                        transparent={fillStyle.opacity < 1}
                        side={THREE.DoubleSide}
                        depthWrite={fillStyle.opacity >= 0.95}
                        roughness={1}
                        metalness={0}
                    />
                </mesh>
            )}

            <SingleLine start={p1} end={p2} style={style} side="front" lineScale={lineScale} />
            <SingleLine start={p2} end={p3} style={style} side="right" lineScale={lineScale} />
            <SingleLine start={p3} end={p4} style={style} side="rear" lineScale={lineScale} />
            <SingleLine start={p4} end={p1} style={style} side="left" lineScale={lineScale} />

            {/* Dimensions */}
            {/* Front (Bottom) - Offset Negative Y */}
            <Dimension
                start={p1} end={p2}
                label={resolveDimensionLabel(width, widthDimensionKey, dimensionSettings)}
                offset={-15}
                color="black"
                visible={showWidthDimensions}
                settings={dimensionSettings}
                lineScale={lineScale}
            />
            {/* Depth Check - Left vs Right */}
            {/* Depth Check - Left vs Right */}
            {dimensionSide === 'right' ? (
                // Right Side Depth (Positive X) -> Draw Top-to-Bottom so "Bottom" anchor pushes text Right (Outside)
                // Offset Logic: Down vector (0,-1) -> Perp (1,0) Right. Positive offset moves Right (Outside).
                <Dimension
                    start={p3} end={p2}
                    label={resolveDimensionLabel(depth, depthDimensionKey, dimensionSettings)}
                    offset={15}
                    color="black"
                    visible={showDepthDimensions}
                    settings={dimensionSettings}
                    flipText={true}
                    lineScale={lineScale}
                />
            ) : (
                // Left Side Depth (Negative X) -> Draw Bottom-to-Top so "Bottom" anchor pushes text Left (Outside)
                // Offset Logic: Up vector (0,1) -> Perp (-1,0) Left. Positive offset moves Left (Outside).
                <Dimension
                    start={p1} end={p4}
                    label={resolveDimensionLabel(depth, depthDimensionKey, dimensionSettings)}
                    offset={15}
                    color="black"
                    visible={showDepthDimensions}
                    settings={dimensionSettings}
                    lineScale={lineScale}
                />
            )}
        </group>
    )
}

const SetbackLayer = ({ lotWidth, lotDepth, setbacks, x, y, style, scaleFactor = 1, showDimensions = false, dimensionSettings = {}, setbackDimensionKeys = {}, lineScale = 1 }) => {
    const { setbackFront, setbackRear, setbackSideLeft, setbackSideRight } = setbacks

    const y1 = -lotDepth / 2 + setbackFront
    const y2 = lotDepth / 2 - setbackRear
    const x1 = -lotWidth / 2 + setbackSideLeft
    const x2 = lotWidth / 2 - setbackSideRight

    const p1 = [x1, y1, 0.1] // Bottom Left
    const p2 = [x2, y1, 0.1] // Bottom Right
    const p3 = [x2, y2, 0.1] // Top Right
    const p4 = [x1, y2, 0.1] // Top Left

    return (
        <group position={[x, y, 0]}>
            <SingleLine start={p1} end={p2} style={style} side="front" lineScale={lineScale} />
            <SingleLine start={p2} end={p3} style={style} side="right" lineScale={lineScale} />
            <SingleLine start={p3} end={p4} style={style} side="rear" lineScale={lineScale} />
            <SingleLine start={p4} end={p1} style={style} side="left" lineScale={lineScale} />

            {/* Setback Dimensions - Measuring the gap from Lot Line to Setback Line */}
            {/* Front Setback */}
            <Dimension
                start={[0, -lotDepth / 2, 0.1]}
                end={[0, y1, 0.1]}
                label={resolveDimensionLabel(setbackFront, setbackDimensionKeys.front || 'setbackFront', dimensionSettings)}
                offset={5} // Offset to the right
                color={style.color || "red"}
                visible={showDimensions}
                settings={dimensionSettings}
                lineScale={lineScale}
            />
            {/* Rear Setback */}
            <Dimension
                start={[0, y2, 0.1]}
                end={[0, lotDepth / 2, 0.1]}
                label={resolveDimensionLabel(setbackRear, setbackDimensionKeys.rear || 'setbackRear', dimensionSettings)}
                offset={5}
                color={style.color || "red"}
                visible={showDimensions}
                settings={dimensionSettings}
                lineScale={lineScale}
            />
            {/* Left Setback */}
            <Dimension
                start={[-lotWidth / 2, 0, 0.1]}
                end={[x1, 0, 0.1]}
                label={resolveDimensionLabel(setbackSideLeft, setbackDimensionKeys.left || 'setbackLeft', dimensionSettings)}
                offset={5} // Offset "up" in Y
                color={style.color || "red"}
                visible={showDimensions}
                settings={dimensionSettings}
                lineScale={lineScale}
            />
            {/* Right Setback */}
            <Dimension
                start={[x2, 0, 0.1]}
                end={[lotWidth / 2, 0, 0.1]}
                label={resolveDimensionLabel(setbackSideRight, setbackDimensionKeys.right || 'setbackRight', dimensionSettings)}
                offset={5}
                color={style.color || "red"}
                visible={showDimensions}
                settings={dimensionSettings}
                lineScale={lineScale}
            />
        </group>
    )
}

// Ground plane that receives shadows
const GroundPlane = ({ style, visible }) => {
    if (!visible || !style.visible) return null

    return (
        <mesh position={[0, 50, -0.1]} receiveShadow>
            <planeGeometry args={[300, 300]} />
            <meshStandardMaterial
                color={style.color}
                opacity={style.opacity}
                transparent={style.opacity < 1}
                side={THREE.DoubleSide}
                depthWrite={style.opacity >= 0.95}
                roughness={1}
                metalness={0}
            />
        </mesh>
    )
}

const SceneContent = () => {
    const existing = useStore((state) => state.existing)
    const proposed = useStore((state) => state.proposed)
    const layers = useStore((state) => state.viewSettings.layers)
    const styleSettings = useStore((state) => state.viewSettings.styleSettings)
    const renderSettings = useStore((state) => state.renderSettings)
    const layoutSettings = useStore((state) => state.layoutSettings)
    const setBuildingPosition = useStore((state) => state.setBuildingPosition)
    const roadModule = useStore((state) => state.roadModule)
    const roadModuleStyles = useStore((state) => state.roadModuleStyles)
    const exportLineScale = useStore((state) => state.viewSettings.exportLineScale) || 1

    // Polygon editing actions
    const updateVertex = useStore((state) => state.updateVertex)
    const splitEdge = useStore((state) => state.splitEdge)
    const extrudeEdge = useStore((state) => state.extrudeEdge)

    // Check if lots are in polygon mode
    const existingIsPolygon = existing.lotGeometry?.mode === 'polygon' && existing.lotGeometry?.vertices
    const proposedIsPolygon = proposed.lotGeometry?.mode === 'polygon' && proposed.lotGeometry?.vertices

    // Check if polygon editing is active (show handles)
    const existingIsEditing = existingIsPolygon && existing.lotGeometry?.editing
    const proposedIsEditing = proposedIsPolygon && proposed.lotGeometry?.editing

    const scaleFactor = 1
    const spacing = layoutSettings?.lotSpacing ?? 0
    const offset = spacing / 2

    if (!styleSettings || !styleSettings.existing || !styleSettings.proposed) return null

    // Split styles for each model
    const existingStyles = styleSettings.existing
    const proposedStyles = styleSettings.proposed

    return (
        <group>
            <GroundPlane style={styleSettings.ground} visible={layers.ground} />

            {layers.origin && (
                <mesh position={[0, 0, 0.5]}>
                    <sphereGeometry args={[0.5]} />
                    <meshBasicMaterial color="red" />
                </mesh>
            )}

            {/* EXISTING SCENE (Left - negative X) */}
            <group position={[-offset, 0, 0]}>
                {layers.lotLines && (
                    existingIsPolygon ? (
                        <LotEditor
                            model="existing"
                            vertices={existing.lotGeometry.vertices}
                            editing={existingIsEditing}
                            style={existingStyles.lotLines}
                            fillStyle={existingStyles.lotFill}
                            showDimensions={layers.dimensionsLotWidth || layers.dimensionsLotDepth}
                            dimensionSettings={styleSettings.dimensionSettings}
                            offsetGroupX={-offset}
                            updateVertex={updateVertex}
                            splitEdge={splitEdge}
                            extrudeEdge={extrudeEdge}
                            lineScale={exportLineScale}
                        />
                    ) : (
                        <Lot
                            width={existing.lotWidth}
                            depth={existing.lotDepth}
                            x={-existing.lotWidth / 2}
                            y={existing.lotDepth / 2}
                            style={existingStyles.lotLines}
                            fillStyle={existingStyles.lotFill}
                            scaleFactor={scaleFactor}
                            showWidthDimensions={layers.dimensionsLotWidth}
                            showDepthDimensions={layers.dimensionsLotDepth}
                            dimensionSettings={styleSettings.dimensionSettings}
                            dimensionSide="left"
                            lineScale={exportLineScale}
                        />
                    )
                )}
                {layers.setbackLines && (
                    <SetbackLayer
                        lotWidth={existing.lotWidth}
                        lotDepth={existing.lotDepth}
                        setbacks={{
                            setbackFront: existing.setbackFront,
                            setbackRear: existing.setbackRear,
                            setbackSideLeft: existing.setbackSideLeft,
                            setbackSideRight: existing.setbackSideRight
                        }}
                        x={-existing.lotWidth / 2}
                        y={existing.lotDepth / 2}
                        style={existingStyles.setbacks}
                        scaleFactor={scaleFactor}
                        showDimensions={layers.dimensionsSetbacks}
                        dimensionSettings={styleSettings.dimensionSettings}
                        lineScale={exportLineScale}
                    />
                )}
                {layers.buildings && (
                    <Building
                        width={existing.buildingWidth}
                        depth={existing.buildingDepth}
                        x={existing.buildingX}
                        y={existing.buildingY}
                        styles={{ faces: existingStyles.buildingFaces, edges: existingStyles.buildingEdges }}
                        renderSettings={renderSettings}
                        scaleFactor={scaleFactor}
                        onPositionChange={(x, y) => setBuildingPosition('existing', x, y)}
                        offsetGroupX={-offset}
                        stories={existing.buildingStories || 1}
                        firstFloorHeight={existing.firstFloorHeight || 12}
                        upperFloorHeight={existing.upperFloorHeight || 10}
                        maxHeight={existing.maxHeight || 30}
                        showMaxHeightPlane={layers.maxHeightPlane}
                        maxHeightPlaneStyle={existingStyles.maxHeightPlane}
                        showHeightDimensions={layers.dimensionsHeight}
                        dimensionSettings={styleSettings.dimensionSettings}
                        lineScale={exportLineScale}
                    />
                )}
                {/* Road Module for Existing */}
                {layers.roadModule && roadModule?.enabled && roadModuleStyles && (
                    <RoadModule
                        lotWidth={existing.lotWidth}
                        roadModule={roadModule}
                        styles={roadModuleStyles}
                        model="existing"
                        lineScale={exportLineScale}
                    />
                )}
            </group>

            {/* PROPOSED SCENE (Right - positive X) */}
            <group position={[offset, 0, 0]}>
                {layers.lotLines && (
                    proposedIsPolygon ? (
                        <LotEditor
                            model="proposed"
                            vertices={proposed.lotGeometry.vertices}
                            editing={proposedIsEditing}
                            style={proposedStyles.lotLines}
                            fillStyle={proposedStyles.lotFill}
                            showDimensions={layers.dimensionsLotWidth || layers.dimensionsLotDepth}
                            dimensionSettings={styleSettings.dimensionSettings}
                            offsetGroupX={offset}
                            updateVertex={updateVertex}
                            splitEdge={splitEdge}
                            extrudeEdge={extrudeEdge}
                            lineScale={exportLineScale}
                        />
                    ) : (
                        <Lot
                            width={proposed.lotWidth}
                            depth={proposed.lotDepth}
                            x={proposed.lotWidth / 2}
                            y={proposed.lotDepth / 2}
                            style={proposedStyles.lotLines}
                            fillStyle={proposedStyles.lotFill}
                            scaleFactor={scaleFactor}
                            showWidthDimensions={layers.dimensionsLotWidth}
                            showDepthDimensions={layers.dimensionsLotDepth}
                            dimensionSettings={styleSettings.dimensionSettings}
                            lineScale={exportLineScale}
                        />
                    )
                )}
                {layers.setbackLines && (
                    <SetbackLayer
                        lotWidth={proposed.lotWidth}
                        lotDepth={proposed.lotDepth}
                        setbacks={{
                            setbackFront: proposed.setbackFront,
                            setbackRear: proposed.setbackRear,
                            setbackSideLeft: proposed.setbackSideLeft,
                            setbackSideRight: proposed.setbackSideRight
                        }}
                        x={proposed.lotWidth / 2}
                        y={proposed.lotDepth / 2}
                        style={proposedStyles.setbacks}
                        scaleFactor={scaleFactor}
                        showDimensions={layers.dimensionsSetbacks}
                        dimensionSettings={styleSettings.dimensionSettings}
                        lineScale={exportLineScale}
                    />
                )}
                {layers.buildings && (
                    <Building
                        width={proposed.buildingWidth}
                        depth={proposed.buildingDepth}
                        x={proposed.buildingX}
                        y={proposed.buildingY}
                        styles={{ faces: proposedStyles.buildingFaces, edges: proposedStyles.buildingEdges }}
                        renderSettings={renderSettings}
                        scaleFactor={scaleFactor}
                        onPositionChange={(x, y) => setBuildingPosition('proposed', x, y)}
                        offsetGroupX={offset}
                        stories={proposed.buildingStories || 1}
                        firstFloorHeight={proposed.firstFloorHeight || 12}
                        upperFloorHeight={proposed.upperFloorHeight || 10}
                        maxHeight={proposed.maxHeight || 30}
                        showMaxHeightPlane={layers.maxHeightPlane}
                        maxHeightPlaneStyle={proposedStyles.maxHeightPlane}
                        showHeightDimensions={layers.dimensionsHeight}
                        dimensionSettings={styleSettings.dimensionSettings}
                        lineScale={exportLineScale}
                    />
                )}
                {/* Road Module for Proposed */}
                {layers.roadModule && roadModule?.enabled && roadModuleStyles && (
                    <RoadModule
                        lotWidth={proposed.lotWidth}
                        roadModule={roadModule}
                        styles={roadModuleStyles}
                        model="proposed"
                        lineScale={exportLineScale}
                    />
                )}
            </group>
        </group>
    )
}

export default SceneContent
