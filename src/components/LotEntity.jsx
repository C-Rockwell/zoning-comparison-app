import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '../store/useStore'
import { useLot, useLotStyle, useLotVisibility } from '../hooks/useEntityStore'
import Dimension from './Dimension'
import LotEditor from './LotEditor'
import BuildingEditor from './BuildingEditor'
import LotAnnotations from './LotAnnotations'
import { formatDimension } from '../utils/formatUnits'

// Helper: compute total building height from story data
const computeTotalHeight = (building) => {
    if (!building) return 0
    const stories = building.stories ?? 1
    const firstFloor = building.firstFloorHeight ?? 12
    const upperFloor = building.upperFloorHeight ?? 10
    if (stories <= 0) return 0
    if (stories === 1) return firstFloor
    return firstFloor + (stories - 1) * upperFloor
}

// ============================================
// Helper: resolve dimension label with custom labels
// ============================================
const resolveDimensionLabel = (value, dimensionKey, dimensionSettings) => {
    const customLabels = dimensionSettings?.customLabels || {}
    const labelConfig = customLabels[dimensionKey]
    if (labelConfig?.mode === 'custom') {
        return labelConfig.text || ''
    }
    return formatDimension(value, dimensionSettings?.unitFormat || 'feet')
}

// ============================================
// SingleLine — single lot/setback line segment
// ============================================
const SingleLine = ({ start, end, style, side, lineScale = 1 }) => {
    const override = style.overrides?.[side]
    const useOverride = override?.enabled

    const color = useOverride ? override.color : style.color
    const width = useOverride ? override.width : style.width
    const dashed = useOverride ? override.dashed : style.dashed
    const dashScale = style.dashScale || 5
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

// ============================================
// RectLot — rectangular lot lines + fill + dimensions
// ============================================
const RectLot = ({ width, depth, style, fillStyle, showWidthDimensions = false, showDepthDimensions = false, dimensionSettings = {}, lineScale = 1 }) => {
    const w2 = width / 2
    const d2 = depth / 2

    const p1 = [-w2, -d2, 0]
    const p2 = [w2, -d2, 0]
    const p3 = [w2, d2, 0]
    const p4 = [-w2, d2, 0]

    return (
        <group>
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

            {/* Width dimension (front edge) */}
            <Dimension
                start={p1} end={p2}
                label={resolveDimensionLabel(width, 'lotWidth', dimensionSettings)}
                offset={-15}
                color="black"
                visible={showWidthDimensions}
                settings={dimensionSettings}
                lineScale={lineScale}
            />

            {/* Depth dimension (right side) */}
            <Dimension
                start={p3} end={p2}
                label={resolveDimensionLabel(depth, 'lotDepth', dimensionSettings)}
                offset={15}
                color="black"
                visible={showDepthDimensions}
                settings={dimensionSettings}
                flipText={true}
                lineScale={lineScale}
            />
        </group>
    )
}

// ============================================
// SetbackLines — setback rectangle inside lot
// ============================================
const SetbackLines = ({ lotWidth, lotDepth, setbacks, style, streetSides = {}, showDimensions = false, dimensionSettings = {}, lineScale = 1 }) => {
    const { front, rear, sideInterior, minSideStreet } = setbacks

    // Street-facing sides use minSideStreet; interior sides use sideInterior
    const leftValue = streetSides.left ? minSideStreet : sideInterior
    const rightValue = streetSides.right ? minSideStreet : sideInterior

    // Only render lines for sides with actual positive values
    const hasFront = front != null && front > 0
    const hasRear = rear != null && rear > 0
    const hasSideLeft = leftValue != null && leftValue > 0
    const hasSideRight = rightValue != null && rightValue > 0

    if (!hasFront && !hasRear && !hasSideLeft && !hasSideRight) return null

    // Positions: qualifying sides use their setback offset, others fall to lot edge
    const y1 = hasFront ? -lotDepth / 2 + front : -lotDepth / 2
    const y2 = hasRear ? lotDepth / 2 - rear : lotDepth / 2
    const x1 = hasSideLeft ? -lotWidth / 2 + leftValue : -lotWidth / 2
    const x2 = hasSideRight ? lotWidth / 2 - rightValue : lotWidth / 2

    const p1 = [x1, y1, 0.1]
    const p2 = [x2, y1, 0.1]
    const p3 = [x2, y2, 0.1]
    const p4 = [x1, y2, 0.1]

    return (
        <group>
            {hasFront && <SingleLine start={p1} end={p2} style={style} side="front" lineScale={lineScale} />}
            {hasSideRight && <SingleLine start={p2} end={p3} style={style} side="right" lineScale={lineScale} />}
            {hasRear && <SingleLine start={p3} end={p4} style={style} side="rear" lineScale={lineScale} />}
            {hasSideLeft && <SingleLine start={p4} end={p1} style={style} side="left" lineScale={lineScale} />}

            {/* Front Setback dimension */}
            {hasFront && (
                <Dimension
                    start={[0, -lotDepth / 2, 0.1]}
                    end={[0, y1, 0.1]}
                    label={resolveDimensionLabel(front, 'setbackFront', dimensionSettings)}
                    offset={5}
                    color={style.color || 'red'}
                    visible={showDimensions}
                    settings={dimensionSettings}
                    lineScale={lineScale}
                />
            )}
            {/* Rear Setback dimension */}
            {hasRear && (
                <Dimension
                    start={[0, y2, 0.1]}
                    end={[0, lotDepth / 2, 0.1]}
                    label={resolveDimensionLabel(rear, 'setbackRear', dimensionSettings)}
                    offset={5}
                    color={style.color || 'red'}
                    visible={showDimensions}
                    settings={dimensionSettings}
                    lineScale={lineScale}
                />
            )}
            {/* Left Setback dimension */}
            {hasSideLeft && (
                <Dimension
                    start={[-lotWidth / 2, 0, 0.1]}
                    end={[x1, 0, 0.1]}
                    label={resolveDimensionLabel(leftValue, 'setbackLeft', dimensionSettings)}
                    offset={5}
                    color={style.color || 'red'}
                    visible={showDimensions}
                    settings={dimensionSettings}
                    lineScale={lineScale}
                />
            )}
            {/* Right Setback dimension */}
            {hasSideRight && (
                <Dimension
                    start={[x2, 0, 0.1]}
                    end={[lotWidth / 2, 0, 0.1]}
                    label={resolveDimensionLabel(rightValue, 'setbackRight', dimensionSettings)}
                    offset={5}
                    color={style.color || 'red'}
                    visible={showDimensions}
                    settings={dimensionSettings}
                    lineScale={lineScale}
                />
            )}
        </group>
    )
}

// ============================================
// MaxSetbackLines — individual max setback lines
// Only renders lines for sides where a max value is set.
// Front uses maxFront; street-facing sides use maxSideStreet.
// ============================================
const MaxSetbackLines = ({ lotWidth, lotDepth, setbacks, style, streetSides = {}, lineScale = 1 }) => {
    const { maxFront, maxSideStreet } = setbacks
    const z = 0.12 // Above min setback lines at z=0.1

    const lines = []

    // Max front setback line (horizontal, spans full lot width)
    if (maxFront != null && maxFront > 0) {
        const y = -lotDepth / 2 + maxFront
        lines.push({ start: [-lotWidth / 2, y, z], end: [lotWidth / 2, y, z], side: 'front' })
    }

    // Max side street setback lines (vertical, on street-facing side(s))
    if (maxSideStreet != null && maxSideStreet > 0) {
        if (streetSides.left) {
            const x = -lotWidth / 2 + maxSideStreet
            lines.push({ start: [x, -lotDepth / 2, z], end: [x, lotDepth / 2, z], side: 'left' })
        }
        if (streetSides.right) {
            const x = lotWidth / 2 - maxSideStreet
            lines.push({ start: [x, -lotDepth / 2, z], end: [x, lotDepth / 2, z], side: 'right' })
        }
    }

    if (lines.length === 0) return null

    return (
        <group>
            {lines.map((line, i) => (
                <SingleLine key={i} start={line.start} end={line.end} style={style} side={line.side} lineScale={lineScale} />
            ))}
        </group>
    )
}

// ============================================
// LotEntity — renders a single lot's 3D content
// from the entity system.
// Props: lotId, offset (x position)
// ============================================
const LotEntity = ({ lotId, offset = 0, lotIndex = 1, streetSides = {} }) => {
    const lot = useLot(lotId)
    const style = useLotStyle(lotId)
    const visibility = useLotVisibility(lotId)

    // Global dimension + line scale settings
    const dimensionSettings = useStore(state => state.viewSettings.styleSettings?.dimensionSettings)
    const exportLineScale = useStore(state => state.viewSettings.exportLineScale) || 1
    const layers = useStore(state => state.viewSettings.layers)

    // Entity building actions from store
    const selectEntityBuilding = useStore(state => state.selectEntityBuilding)
    const setEntityBuildingPosition = useStore(state => state.setEntityBuildingPosition)
    const enableEntityBuildingPolygonMode = useStore(state => state.enableEntityBuildingPolygonMode)
    const updateEntityBuildingVertex = useStore(state => state.updateEntityBuildingVertex)
    const splitEntityBuildingEdge = useStore(state => state.splitEntityBuildingEdge)
    const extrudeEntityBuildingEdge = useStore(state => state.extrudeEntityBuildingEdge)
    const setEntityBuildingTotalHeight = useStore(state => state.setEntityBuildingTotalHeight)

    // Entity lot editing actions
    const updateEntityVertex = useStore(state => state.updateEntityVertex)
    const splitEntityEdge = useStore(state => state.splitEntityEdge)
    const extrudeEntityEdge = useStore(state => state.extrudeEntityEdge)

    if (!lot || !style) return null

    const { lotWidth, lotDepth, lotGeometry, setbacks, buildings } = lot
    const principal = buildings?.principal
    const accessory = buildings?.accessory

    const isPolygon = lotGeometry?.mode === 'polygon' && lotGeometry?.vertices?.length >= 3
    const isEditing = isPolygon && lotGeometry?.editing

    // Show dimension layers from global settings
    const showWidthDim = layers.dimensionsLotWidth
    const showDepthDim = layers.dimensionsLotDepth
    const showSetbackDim = layers.dimensionsSetbacks
    const showHeightDim = layers.dimensionsHeight

    // Position the lot group centered on its own width, front edge at y=0
    // Each lot's internal coordinate system: center-x at 0, front at -lotDepth/2, rear at +lotDepth/2
    return (
        <group position={[offset + lotWidth / 2, lotDepth / 2, 0]}>
            {/* ============================================ */}
            {/* Lot Lines (rectangle or polygon) */}
            {/* ============================================ */}
            {layers.lotLines && visibility.lotLines && (
                isPolygon ? (
                    <LotEditor
                        model={lotId}
                        vertices={lotGeometry.vertices}
                        editing={isEditing}
                        style={style.lotLines}
                        fillStyle={style.lotFill}
                        showDimensions={showWidthDim || showDepthDim}
                        dimensionSettings={dimensionSettings}
                        offsetGroupX={offset + lotWidth / 2}
                        updateVertex={updateEntityVertex}
                        splitEdge={splitEntityEdge}
                        extrudeEdge={extrudeEntityEdge}
                        lineScale={exportLineScale}
                    />
                ) : (
                    <RectLot
                        width={lotWidth}
                        depth={lotDepth}
                        style={style.lotLines}
                        fillStyle={style.lotFill}
                        showWidthDimensions={showWidthDim}
                        showDepthDimensions={showDepthDim}
                        dimensionSettings={dimensionSettings}
                        lineScale={exportLineScale}
                    />
                )
            )}

            {/* ============================================ */}
            {/* Setback Lines (principal setbacks) */}
            {/* ============================================ */}
            {layers.setbacks && visibility.setbacks && setbacks?.principal && (
                <SetbackLines
                    lotWidth={lotWidth}
                    lotDepth={lotDepth}
                    setbacks={setbacks.principal}
                    style={style.setbacks}
                    streetSides={streetSides}
                    showDimensions={showSetbackDim}
                    dimensionSettings={dimensionSettings}
                    lineScale={exportLineScale}
                />
            )}

            {/* ============================================ */}
            {/* Max Setback Lines (maxFront, maxSideStreet) */}
            {/* ============================================ */}
            {layers.maxSetbacks && visibility.maxSetbacks && setbacks?.principal && style?.maxSetbacks && (
                <MaxSetbackLines
                    lotWidth={lotWidth}
                    lotDepth={lotDepth}
                    setbacks={setbacks.principal}
                    style={style.maxSetbacks}
                    streetSides={streetSides}
                    lineScale={exportLineScale}
                />
            )}

            {/* ============================================ */}
            {/* Principal Building */}
            {/* ============================================ */}
            {layers.buildings && visibility.buildings && principal && (
                <BuildingEditor
                    model={lotId}
                    width={principal.width}
                    depth={principal.depth}
                    x={principal.x}
                    y={principal.y}
                    buildingGeometry={principal.geometry}
                    selected={principal.selected}
                    styles={{ faces: style.buildingFaces, edges: style.buildingEdges }}
                    scaleFactor={1}
                    onSelect={() => selectEntityBuilding(lotId, 'principal')}
                    onPositionChange={(x, y) => setEntityBuildingPosition(lotId, 'principal', x, y)}
                    offsetGroupX={offset + lotWidth / 2}
                    stories={principal.stories ?? 1}
                    firstFloorHeight={principal.firstFloorHeight ?? 12}
                    upperFloorHeight={principal.upperFloorHeight ?? 10}
                    maxHeight={principal.maxHeight ?? 30}
                    showMaxHeightPlane={layers.maxHeightPlane && visibility.maxHeightPlane}
                    maxHeightPlaneStyle={style.maxHeightPlane}
                    roof={principal.roof}
                    roofStyles={{ roofFaces: style.roofFaces, roofEdges: style.roofEdges }}
                    showRoof={layers.roof && visibility.roof}
                    showHeightDimensions={showHeightDim}
                    dimensionSettings={dimensionSettings}
                    lineScale={exportLineScale}
                    enableBuildingPolygonMode={() => enableEntityBuildingPolygonMode(lotId, 'principal')}
                    updateBuildingVertex={(_model, vertexIndex, newX, newY) => updateEntityBuildingVertex(lotId, 'principal', vertexIndex, newX, newY)}
                    splitBuildingEdge={(_model, edgeIndex) => splitEntityBuildingEdge(lotId, 'principal', edgeIndex)}
                    extrudeBuildingEdge={(_model, edgeIndex, distance) => extrudeEntityBuildingEdge(lotId, 'principal', edgeIndex, distance)}
                    setBuildingTotalHeight={(_model, newHeight) => setEntityBuildingTotalHeight(lotId, 'principal', newHeight)}
                />
            )}

            {/* ============================================ */}
            {/* Accessory Building */}
            {/* ============================================ */}
            {layers.buildings && visibility.accessoryBuilding && accessory && accessory.width > 0 && (
                <BuildingEditor
                    model={lotId}
                    width={accessory.width}
                    depth={accessory.depth}
                    x={accessory.x}
                    y={accessory.y}
                    buildingGeometry={accessory.geometry}
                    selected={accessory.selected}
                    styles={{ faces: style.buildingFaces, edges: style.buildingEdges }}
                    scaleFactor={1}
                    onSelect={() => selectEntityBuilding(lotId, 'accessory')}
                    onPositionChange={(x, y) => setEntityBuildingPosition(lotId, 'accessory', x, y)}
                    offsetGroupX={offset + lotWidth / 2}
                    stories={accessory.stories ?? 1}
                    firstFloorHeight={accessory.firstFloorHeight ?? 10}
                    upperFloorHeight={accessory.upperFloorHeight ?? 10}
                    maxHeight={accessory.maxHeight ?? 15}
                    showMaxHeightPlane={layers.maxHeightPlane && visibility.maxHeightPlane}
                    maxHeightPlaneStyle={style.maxHeightPlane}
                    roof={accessory.roof}
                    roofStyles={{ roofFaces: style.roofFaces, roofEdges: style.roofEdges }}
                    showRoof={layers.roof && visibility.roof}
                    showHeightDimensions={showHeightDim}
                    dimensionSettings={dimensionSettings}
                    lineScale={exportLineScale}
                    enableBuildingPolygonMode={() => enableEntityBuildingPolygonMode(lotId, 'accessory')}
                    updateBuildingVertex={(_model, vertexIndex, newX, newY) => updateEntityBuildingVertex(lotId, 'accessory', vertexIndex, newX, newY)}
                    splitBuildingEdge={(_model, edgeIndex) => splitEntityBuildingEdge(lotId, 'accessory', edgeIndex)}
                    extrudeBuildingEdge={(_model, edgeIndex, distance) => extrudeEntityBuildingEdge(lotId, 'accessory', edgeIndex, distance)}
                    setBuildingTotalHeight={(_model, newHeight) => setEntityBuildingTotalHeight(lotId, 'accessory', newHeight)}
                />
            )}

            {/* ============================================ */}
            {/* Annotation Labels */}
            {/* ============================================ */}
            <group position={[-lotWidth / 2, -lotDepth / 2, 0]}>
                <LotAnnotations
                    lotId={lotId}
                    lotWidth={lotWidth}
                    lotDepth={lotDepth}
                    setbacks={{
                        front: setbacks?.principal?.front || 0,
                        rear: setbacks?.principal?.rear || 0,
                        left: (streetSides.left ? setbacks?.principal?.minSideStreet : setbacks?.principal?.sideInterior) || 0,
                        right: (streetSides.right ? setbacks?.principal?.minSideStreet : setbacks?.principal?.sideInterior) || 0,
                    }}
                    buildings={{
                        principal: principal ? {
                            x: (principal.x || 0) + lotWidth / 2 - principal.width / 2,
                            y: (principal.y || 0) + lotDepth / 2 - principal.depth / 2,
                            width: principal.width,
                            depth: principal.depth,
                            totalHeight: computeTotalHeight(principal),
                        } : undefined,
                        accessory: accessory && accessory.width > 0 ? {
                            x: (accessory.x || 0) + lotWidth / 2 - accessory.width / 2,
                            y: (accessory.y || 0) + lotDepth / 2 - accessory.depth / 2,
                            width: accessory.width,
                            depth: accessory.depth,
                            totalHeight: computeTotalHeight(accessory),
                        } : undefined,
                    }}
                    maxSetbacks={{
                        front: setbacks?.principal?.maxFront || 0,
                        sideStreet: setbacks?.principal?.maxSideStreet || 0,
                        streetSides,
                    }}
                    lotIndex={lotIndex}
                    lineScale={exportLineScale}
                />
            </group>
        </group>
    )
}

export default LotEntity
