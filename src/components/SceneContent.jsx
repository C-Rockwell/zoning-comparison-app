import { useStore } from '../store/useStore'
import { Line, Edges } from '@react-three/drei'
import { Select } from '@react-three/postprocessing'
import * as THREE from 'three'
import Dimension from './Dimension'
import LotEditor from './LotEditor'
import RoadModule from './RoadModule'
import BuildingEditor from './BuildingEditor'
import LotAnnotations from './LotAnnotations'
import RoadAnnotations from './RoadAnnotations'
import RoadIntersectionFillet from './RoadIntersectionFillet'
import { formatDimension } from '../utils/formatUnits'

// Helper: compute total building height from story data
const computeTotalHeight = (stories, firstFloorHeight, upperFloorHeight) => {
    const s = stories || 1
    const ff = firstFloorHeight || 12
    const uf = upperFloorHeight || 10
    if (s <= 0) return 0
    if (s === 1) return ff
    return ff + (s - 1) * uf
}

// Direction rotation for annotation labels (matches RoadModule.jsx)
const DIRECTION_ROTATION = {
    front: [0, 0, 0],
    left: [0, 0, -Math.PI / 2],
    right: [0, 0, Math.PI / 2],
    rear: [0, 0, Math.PI],
}

// Generate all 4 fillet sub-corners for a pair of perpendicular roads at an intersection
function generateFilletCorners(roadA, dirA, roadB, dirB, lotPos) {
    if (!roadA?.enabled || !roadB?.enabled) return []
    const flipA = d => d === 'front' ? 'rear' : d === 'rear' ? 'front' : d
    const flipB = d => d === 'left' ? 'right' : d === 'right' ? 'left' : d
    const getOffset = (dir, road) => {
        const row = road.rightOfWay || 0
        if (dir === 'front') return { dx: 0, dy: -row }
        if (dir === 'rear') return { dx: 0, dy: row }
        if (dir === 'left') return { dx: -row, dy: 0 }
        if (dir === 'right') return { dx: row, dy: 0 }
        return { dx: 0, dy: 0 }
    }
    const pairName = `${dirA}-${dirB}`
    const oA = getOffset(dirA, roadA)
    const oB = getOffset(dirB, roadB)
    return [
        { roadA, roadB, corner: pairName, pos: lotPos, sideA: 'right', sideB: 'right' },
        { roadA, roadB, corner: `${dirA}-${flipB(dirB)}`, pos: [lotPos[0] + oB.dx, lotPos[1] + oB.dy], sideA: 'right', sideB: 'left' },
        { roadA, roadB, corner: `${flipA(dirA)}-${dirB}`, pos: [lotPos[0] + oA.dx, lotPos[1] + oA.dy], sideA: 'left', sideB: 'right' },
        { roadA, roadB, corner: `${flipA(dirA)}-${flipB(dirB)}`, pos: [lotPos[0] + oA.dx + oB.dx, lotPos[1] + oA.dy + oB.dy], sideA: 'left', sideB: 'left' },
    ]
}

// Helper function to resolve dimension label based on custom label settings
const resolveDimensionLabel = (value, dimensionKey, dimensionSettings) => {
    const customLabels = dimensionSettings?.customLabels || {}
    const labelConfig = customLabels[dimensionKey]
    if (labelConfig?.mode === 'custom') {
        // Return custom text, or empty string if blank (hides label but keeps dimension lines)
        return labelConfig.text || ''
    }
    return formatDimension(value, dimensionSettings?.unitFormat || 'feet')
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
    const comparisonRoads = useStore((state) => state.comparisonRoads)
    const exportLineScale = useStore((state) => state.viewSettings.exportLineScale) || 1

    // Polygon editing actions (lots)
    const updateVertex = useStore((state) => state.updateVertex)
    const splitEdge = useStore((state) => state.splitEdge)
    const extrudeEdge = useStore((state) => state.extrudeEdge)

    // Building editing actions (principal)
    const selectBuilding = useStore((state) => state.selectBuilding)
    const enableBuildingPolygonMode = useStore((state) => state.enableBuildingPolygonMode)
    const updateBuildingVertex = useStore((state) => state.updateBuildingVertex)
    const splitBuildingEdge = useStore((state) => state.splitBuildingEdge)
    const extrudeBuildingEdge = useStore((state) => state.extrudeBuildingEdge)
    const setBuildingTotalHeight = useStore((state) => state.setBuildingTotalHeight)

    // Accessory building editing actions
    const selectAccessoryBuilding = useStore((state) => state.selectAccessoryBuilding)
    const setAccessoryBuildingPosition = useStore((state) => state.setAccessoryBuildingPosition)
    const enableAccessoryBuildingPolygonMode = useStore((state) => state.enableAccessoryBuildingPolygonMode)
    const updateAccessoryBuildingVertex = useStore((state) => state.updateAccessoryBuildingVertex)
    const splitAccessoryBuildingEdge = useStore((state) => state.splitAccessoryBuildingEdge)
    const extrudeAccessoryBuildingEdge = useStore((state) => state.extrudeAccessoryBuildingEdge)
    const setAccessoryBuildingTotalHeight = useStore((state) => state.setAccessoryBuildingTotalHeight)

    // Check if lots are in polygon mode
    const existingIsPolygon = existing.lotGeometry?.mode === 'polygon' && existing.lotGeometry?.vertices
    const proposedIsPolygon = proposed.lotGeometry?.mode === 'polygon' && proposed.lotGeometry?.vertices

    // Check if polygon editing is active (show handles)
    const existingIsEditing = existingIsPolygon && existing.lotGeometry?.editing
    const proposedIsEditing = proposedIsPolygon && proposed.lotGeometry?.editing

    // Check if accessory buildings are enabled (width > 0)
    const existingHasAccessory = existing.accessoryWidth > 0
    const proposedHasAccessory = proposed.accessoryWidth > 0

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
                {/* Principal Building for Existing */}
                {layers.buildings && (
                    <BuildingEditor
                        model="existing"
                        width={existing.buildingWidth}
                        depth={existing.buildingDepth}
                        x={existing.buildingX}
                        y={existing.buildingY}
                        buildingGeometry={existing.buildingGeometry}
                        selected={existing.selectedBuilding}
                        styles={{ faces: existingStyles.buildingFaces, edges: existingStyles.buildingEdges }}
                        scaleFactor={scaleFactor}
                        onSelect={() => selectBuilding('existing', true)}
                        onPositionChange={(x, y) => setBuildingPosition('existing', x, y)}
                        offsetGroupX={-offset}
                        stories={existing.buildingStories || 1}
                        firstFloorHeight={existing.firstFloorHeight || 12}
                        upperFloorHeight={existing.upperFloorHeight || 10}
                        maxHeight={existing.maxHeight || 30}
                        showMaxHeightPlane={layers.maxHeightPlane}
                        maxHeightPlaneStyle={existingStyles.maxHeightPlane}
                        roof={existing.roof}
                        roofStyles={{ roofFaces: existingStyles.roofFaces, roofEdges: existingStyles.roofEdges }}
                        showRoof={layers.roof}
                        showHeightDimensions={layers.dimensionsHeight}
                        dimensionSettings={styleSettings.dimensionSettings}
                        lineScale={exportLineScale}
                        enableBuildingPolygonMode={enableBuildingPolygonMode}
                        updateBuildingVertex={updateBuildingVertex}
                        splitBuildingEdge={splitBuildingEdge}
                        extrudeBuildingEdge={extrudeBuildingEdge}
                        setBuildingTotalHeight={setBuildingTotalHeight}
                    />
                )}
                {/* Accessory Building for Existing */}
                {layers.buildings && existingHasAccessory && (
                    <BuildingEditor
                        model="existing"
                        width={existing.accessoryWidth}
                        depth={existing.accessoryDepth}
                        x={existing.accessoryX}
                        y={existing.accessoryY}
                        buildingGeometry={existing.accessoryBuildingGeometry}
                        selected={existing.accessorySelectedBuilding}
                        styles={{ faces: existingStyles.accessoryBuildingFaces, edges: existingStyles.accessoryBuildingEdges }}
                        scaleFactor={scaleFactor}
                        onSelect={() => selectAccessoryBuilding('existing', true)}
                        onPositionChange={(x, y) => setAccessoryBuildingPosition('existing', x, y)}
                        offsetGroupX={-offset}
                        stories={existing.accessoryStories || 1}
                        firstFloorHeight={existing.accessoryFirstFloorHeight || 10}
                        upperFloorHeight={existing.accessoryUpperFloorHeight || 10}
                        maxHeight={existing.accessoryMaxHeight || 15}
                        showMaxHeightPlane={false}
                        maxHeightPlaneStyle={{}}
                        roof={existing.accessoryRoof}
                        roofStyles={{ roofFaces: existingStyles.accessoryRoofFaces, roofEdges: existingStyles.accessoryRoofEdges }}
                        showRoof={layers.roof}
                        showHeightDimensions={false}
                        dimensionSettings={styleSettings.dimensionSettings}
                        lineScale={exportLineScale}
                        enableBuildingPolygonMode={enableAccessoryBuildingPolygonMode}
                        updateBuildingVertex={updateAccessoryBuildingVertex}
                        splitBuildingEdge={splitAccessoryBuildingEdge}
                        extrudeBuildingEdge={extrudeAccessoryBuildingEdge}
                        setBuildingTotalHeight={setAccessoryBuildingTotalHeight}
                    />
                )}
                {/* Front Road Module for Existing */}
                {layers.roadModule && roadModule?.enabled && roadModuleStyles && (
                    <RoadModule
                        lotWidth={existing.lotWidth}
                        roadModule={roadModule}
                        styles={roadModuleStyles}
                        model="existing"
                        lineScale={exportLineScale}
                    />
                )}
                {/* Multi-Direction Comparison Roads for Existing */}
                {layers.roadModule && roadModuleStyles && comparisonRoads && (
                    <>
                        {comparisonRoads.left?.enabled && (
                            <RoadModule
                                lotWidth={existing.lotWidth}
                                roadModule={comparisonRoads.left}
                                styles={roadModuleStyles}
                                model="existing"
                                direction="left"
                                lineScale={exportLineScale}
                            />
                        )}
                        {comparisonRoads.right?.enabled && (
                            <RoadModule
                                lotWidth={existing.lotWidth}
                                roadModule={comparisonRoads.right}
                                styles={roadModuleStyles}
                                model="existing"
                                direction="right"
                                lineScale={exportLineScale}
                            />
                        )}
                        {comparisonRoads.rear?.enabled && (
                            <RoadModule
                                lotWidth={existing.lotWidth}
                                roadModule={comparisonRoads.rear}
                                styles={roadModuleStyles}
                                model="existing"
                                direction="rear"
                                lineScale={exportLineScale}
                            />
                        )}
                    </>
                )}
                {/* Annotation Labels for Existing */}
                <group position={[-existing.lotWidth, 0, 0]}>
                    <LotAnnotations
                        lotId="existing"
                        lotWidth={existing.lotWidth}
                        lotDepth={existing.lotDepth}
                        setbacks={{
                            front: existing.setbackFront || 0,
                            rear: existing.setbackRear || 0,
                            left: existing.setbackSideLeft || 0,
                            right: existing.setbackSideRight || 0,
                        }}
                        buildings={{
                            principal: {
                                x: existing.buildingX + existing.lotWidth / 2 - existing.buildingWidth / 2,
                                y: existing.buildingY + existing.lotDepth / 2 - existing.buildingDepth / 2,
                                width: existing.buildingWidth,
                                depth: existing.buildingDepth,
                                totalHeight: computeTotalHeight(existing.buildingStories, existing.firstFloorHeight, existing.upperFloorHeight),
                            },
                            accessory: existingHasAccessory ? {
                                x: existing.accessoryX + existing.lotWidth / 2 - existing.accessoryWidth / 2,
                                y: existing.accessoryY + existing.lotDepth / 2 - existing.accessoryDepth / 2,
                                width: existing.accessoryWidth,
                                depth: existing.accessoryDepth,
                                totalHeight: computeTotalHeight(existing.accessoryStories, existing.accessoryFirstFloorHeight, existing.accessoryUpperFloorHeight),
                            } : undefined,
                        }}
                        lotIndex={1}
                        lineScale={exportLineScale}
                    />
                </group>
                {/* Road Annotations for Existing */}
                {layers.roadModule && roadModule?.enabled && roadModuleStyles && (
                    <group rotation={DIRECTION_ROTATION.front}>
                        <RoadAnnotations
                            roadId="existing-front"
                            road={roadModule}
                            spanWidth={existing.lotWidth}
                            lineScale={exportLineScale}
                        />
                    </group>
                )}
                {layers.roadModule && roadModuleStyles && comparisonRoads && (
                    <>
                        {comparisonRoads.left?.enabled && (
                            <group rotation={DIRECTION_ROTATION.left}>
                                <RoadAnnotations roadId="existing-left" road={comparisonRoads.left} spanWidth={existing.lotWidth} lineScale={exportLineScale} />
                            </group>
                        )}
                        {comparisonRoads.right?.enabled && (
                            <group rotation={DIRECTION_ROTATION.right}>
                                <RoadAnnotations roadId="existing-right" road={comparisonRoads.right} spanWidth={existing.lotWidth} lineScale={exportLineScale} />
                            </group>
                        )}
                        {comparisonRoads.rear?.enabled && (
                            <group rotation={DIRECTION_ROTATION.rear}>
                                <RoadAnnotations roadId="existing-rear" road={comparisonRoads.rear} spanWidth={existing.lotWidth} lineScale={exportLineScale} />
                            </group>
                        )}
                    </>
                )}
                {/* Road Intersection Fillets for Existing — all 4 sub-corners per intersection */}
                {(layers.roadIntersections !== false) && roadModuleStyles && (() => {
                    const W = existing.lotWidth, D = existing.lotDepth
                    const allCorners = [
                        ...generateFilletCorners(roadModule, 'front', comparisonRoads?.left, 'left', [-W, 0]),
                        ...generateFilletCorners(roadModule, 'front', comparisonRoads?.right, 'right', [0, 0]),
                        ...generateFilletCorners(comparisonRoads?.rear, 'rear', comparisonRoads?.left, 'left', [-W, D]),
                        ...generateFilletCorners(comparisonRoads?.rear, 'rear', comparisonRoads?.right, 'right', [0, D]),
                    ]
                    return allCorners.map((c, i) => (
                        <RoadIntersectionFillet key={`ex-fillet-${i}`} roadA={c.roadA} roadB={c.roadB} corner={c.corner} cornerPosition={c.pos} styles={roadModuleStyles} lineScale={exportLineScale} sideA={c.sideA} sideB={c.sideB} />
                    ))
                })()}
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
                {/* Principal Building for Proposed */}
                {layers.buildings && (
                    <BuildingEditor
                        model="proposed"
                        width={proposed.buildingWidth}
                        depth={proposed.buildingDepth}
                        x={proposed.buildingX}
                        y={proposed.buildingY}
                        buildingGeometry={proposed.buildingGeometry}
                        selected={proposed.selectedBuilding}
                        styles={{ faces: proposedStyles.buildingFaces, edges: proposedStyles.buildingEdges }}
                        scaleFactor={scaleFactor}
                        onSelect={() => selectBuilding('proposed', true)}
                        onPositionChange={(x, y) => setBuildingPosition('proposed', x, y)}
                        offsetGroupX={offset}
                        stories={proposed.buildingStories || 1}
                        firstFloorHeight={proposed.firstFloorHeight || 12}
                        upperFloorHeight={proposed.upperFloorHeight || 10}
                        maxHeight={proposed.maxHeight || 30}
                        showMaxHeightPlane={layers.maxHeightPlane}
                        maxHeightPlaneStyle={proposedStyles.maxHeightPlane}
                        roof={proposed.roof}
                        roofStyles={{ roofFaces: proposedStyles.roofFaces, roofEdges: proposedStyles.roofEdges }}
                        showRoof={layers.roof}
                        showHeightDimensions={layers.dimensionsHeight}
                        dimensionSettings={styleSettings.dimensionSettings}
                        lineScale={exportLineScale}
                        enableBuildingPolygonMode={enableBuildingPolygonMode}
                        updateBuildingVertex={updateBuildingVertex}
                        splitBuildingEdge={splitBuildingEdge}
                        extrudeBuildingEdge={extrudeBuildingEdge}
                        setBuildingTotalHeight={setBuildingTotalHeight}
                    />
                )}
                {/* Accessory Building for Proposed */}
                {layers.buildings && proposedHasAccessory && (
                    <BuildingEditor
                        model="proposed"
                        width={proposed.accessoryWidth}
                        depth={proposed.accessoryDepth}
                        x={proposed.accessoryX}
                        y={proposed.accessoryY}
                        buildingGeometry={proposed.accessoryBuildingGeometry}
                        selected={proposed.accessorySelectedBuilding}
                        styles={{ faces: proposedStyles.accessoryBuildingFaces, edges: proposedStyles.accessoryBuildingEdges }}
                        scaleFactor={scaleFactor}
                        onSelect={() => selectAccessoryBuilding('proposed', true)}
                        onPositionChange={(x, y) => setAccessoryBuildingPosition('proposed', x, y)}
                        offsetGroupX={offset}
                        stories={proposed.accessoryStories || 1}
                        firstFloorHeight={proposed.accessoryFirstFloorHeight || 10}
                        upperFloorHeight={proposed.accessoryUpperFloorHeight || 10}
                        maxHeight={proposed.accessoryMaxHeight || 15}
                        showMaxHeightPlane={false}
                        maxHeightPlaneStyle={{}}
                        roof={proposed.accessoryRoof}
                        roofStyles={{ roofFaces: proposedStyles.accessoryRoofFaces, roofEdges: proposedStyles.accessoryRoofEdges }}
                        showRoof={layers.roof}
                        showHeightDimensions={false}
                        dimensionSettings={styleSettings.dimensionSettings}
                        lineScale={exportLineScale}
                        enableBuildingPolygonMode={enableAccessoryBuildingPolygonMode}
                        updateBuildingVertex={updateAccessoryBuildingVertex}
                        splitBuildingEdge={splitAccessoryBuildingEdge}
                        extrudeBuildingEdge={extrudeAccessoryBuildingEdge}
                        setBuildingTotalHeight={setAccessoryBuildingTotalHeight}
                    />
                )}
                {/* Front Road Module for Proposed */}
                {layers.roadModule && roadModule?.enabled && roadModuleStyles && (
                    <RoadModule
                        lotWidth={proposed.lotWidth}
                        roadModule={roadModule}
                        styles={roadModuleStyles}
                        model="proposed"
                        lineScale={exportLineScale}
                    />
                )}
                {/* Multi-Direction Comparison Roads for Proposed */}
                {layers.roadModule && roadModuleStyles && comparisonRoads && (
                    <>
                        {comparisonRoads.left?.enabled && (
                            <RoadModule
                                lotWidth={proposed.lotWidth}
                                roadModule={comparisonRoads.left}
                                styles={roadModuleStyles}
                                model="proposed"
                                direction="left"
                                lineScale={exportLineScale}
                            />
                        )}
                        {comparisonRoads.right?.enabled && (
                            <RoadModule
                                lotWidth={proposed.lotWidth}
                                roadModule={comparisonRoads.right}
                                styles={roadModuleStyles}
                                model="proposed"
                                direction="right"
                                lineScale={exportLineScale}
                            />
                        )}
                        {comparisonRoads.rear?.enabled && (
                            <RoadModule
                                lotWidth={proposed.lotWidth}
                                roadModule={comparisonRoads.rear}
                                styles={roadModuleStyles}
                                model="proposed"
                                direction="rear"
                                lineScale={exportLineScale}
                            />
                        )}
                    </>
                )}
                {/* Annotation Labels for Proposed */}
                <group position={[0, 0, 0]}>
                    <LotAnnotations
                        lotId="proposed"
                        lotWidth={proposed.lotWidth}
                        lotDepth={proposed.lotDepth}
                        setbacks={{
                            front: proposed.setbackFront || 0,
                            rear: proposed.setbackRear || 0,
                            left: proposed.setbackSideLeft || 0,
                            right: proposed.setbackSideRight || 0,
                        }}
                        buildings={{
                            principal: {
                                x: proposed.buildingX + proposed.lotWidth / 2 - proposed.buildingWidth / 2,
                                y: proposed.buildingY + proposed.lotDepth / 2 - proposed.buildingDepth / 2,
                                width: proposed.buildingWidth,
                                depth: proposed.buildingDepth,
                                totalHeight: computeTotalHeight(proposed.buildingStories, proposed.firstFloorHeight, proposed.upperFloorHeight),
                            },
                            accessory: proposedHasAccessory ? {
                                x: proposed.accessoryX + proposed.lotWidth / 2 - proposed.accessoryWidth / 2,
                                y: proposed.accessoryY + proposed.lotDepth / 2 - proposed.accessoryDepth / 2,
                                width: proposed.accessoryWidth,
                                depth: proposed.accessoryDepth,
                                totalHeight: computeTotalHeight(proposed.accessoryStories, proposed.accessoryFirstFloorHeight, proposed.accessoryUpperFloorHeight),
                            } : undefined,
                        }}
                        lotIndex={2}
                        lineScale={exportLineScale}
                    />
                </group>
                {/* Road Annotations for Proposed */}
                {layers.roadModule && roadModule?.enabled && roadModuleStyles && (
                    <group rotation={DIRECTION_ROTATION.front}>
                        <RoadAnnotations
                            roadId="proposed-front"
                            road={roadModule}
                            spanWidth={proposed.lotWidth}
                            lineScale={exportLineScale}
                        />
                    </group>
                )}
                {layers.roadModule && roadModuleStyles && comparisonRoads && (
                    <>
                        {comparisonRoads.left?.enabled && (
                            <group rotation={DIRECTION_ROTATION.left}>
                                <RoadAnnotations roadId="proposed-left" road={comparisonRoads.left} spanWidth={proposed.lotWidth} lineScale={exportLineScale} />
                            </group>
                        )}
                        {comparisonRoads.right?.enabled && (
                            <group rotation={DIRECTION_ROTATION.right}>
                                <RoadAnnotations roadId="proposed-right" road={comparisonRoads.right} spanWidth={proposed.lotWidth} lineScale={exportLineScale} />
                            </group>
                        )}
                        {comparisonRoads.rear?.enabled && (
                            <group rotation={DIRECTION_ROTATION.rear}>
                                <RoadAnnotations roadId="proposed-rear" road={comparisonRoads.rear} spanWidth={proposed.lotWidth} lineScale={exportLineScale} />
                            </group>
                        )}
                    </>
                )}
                {/* Road Intersection Fillets for Proposed — all 4 sub-corners per intersection */}
                {(layers.roadIntersections !== false) && roadModuleStyles && (() => {
                    const W = proposed.lotWidth, D = proposed.lotDepth
                    const allCorners = [
                        ...generateFilletCorners(roadModule, 'front', comparisonRoads?.left, 'left', [0, 0]),
                        ...generateFilletCorners(roadModule, 'front', comparisonRoads?.right, 'right', [W, 0]),
                        ...generateFilletCorners(comparisonRoads?.rear, 'rear', comparisonRoads?.left, 'left', [0, D]),
                        ...generateFilletCorners(comparisonRoads?.rear, 'rear', comparisonRoads?.right, 'right', [W, D]),
                    ]
                    return allCorners.map((c, i) => (
                        <RoadIntersectionFillet key={`pr-fillet-${i}`} roadA={c.roadA} roadB={c.roadB} corner={c.corner} cornerPosition={c.pos} styles={roadModuleStyles} lineScale={exportLineScale} sideA={c.sideA} sideB={c.sideB} />
                    ))
                })()}
            </group>
        </group>
    )
}

export default SceneContent
