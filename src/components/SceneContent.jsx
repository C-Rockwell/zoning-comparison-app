import { useStore } from '../store/useStore'
import { useMemo, useState } from 'react'
import { Line, Edges } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { Select } from '@react-three/postprocessing'
import * as THREE from 'three'
import Dimension from './Dimension'

const Building = ({ width, depth, height, x, y, styles, renderSettings, scaleFactor = 1, onPositionChange, offsetGroupX = 0, showHeightDimensions = false, dimensionSettings = {} }) => {
    const { faces, edges } = styles
    const [hovered, setHovered] = useState(false)
    const [dragging, setDragging] = useState(false)
    const { camera, gl, controls } = useThree()
    const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), [])
    const planeIntersectPoint = new THREE.Vector3()

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

    // Dimension Points
    const dimStart = [x + width / 2, y + depth / 2, 0]
    const dimEnd = [x + width / 2, y + depth / 2, height]

    return (
        <group>
            <Select enabled={hovered}>
                <mesh
                    position={[x, y, height / 2]}
                    castShadow
                    receiveShadow
                    onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
                    onPointerOut={() => setHovered(false)}
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    onPointerMove={handlePointerMove}
                >
                    <boxGeometry args={[width, depth, height]} />
                    <meshStandardMaterial
                        color={dragging ? '#ffff00' : faces.color} // Highlight when dragging
                        transparent={true}
                        opacity={dragging ? 0.8 : faces.opacity}
                        side={THREE.DoubleSide}
                        depthWrite={faces.opacity >= 0.95}
                        roughness={0.7}
                        metalness={0.1}
                    />
                    {edges.visible && (
                        <Edges
                            linewidth={edges.width * scaleFactor}
                            threshold={15}
                            color={edges.color}
                            transparent
                            opacity={edges.opacity}
                        />
                    )}
                </mesh>
            </Select>

            {/* Height Dimension */}
            <Dimension
                start={dimStart}
                end={dimEnd}
                label={`${height}'`}
                offset={10}
                color="black"
                visible={showHeightDimensions}
                settings={dimensionSettings}
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

const SingleLine = ({ start, end, style, side }) => {
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
            lineWidth={width}
            dashed={dashed}
            dashScale={dashed ? dashScale : 1}
            dashSize={dashSize}
            gapSize={gapSize}
            transparent
            opacity={style.opacity}
        />
    )
}

const Lot = ({ width, depth, x, y, style, fillStyle, scaleFactor = 1, showWidthDimensions = false, showDepthDimensions = false, dimensionSettings = {}, dimensionSide = 'right' }) => {
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

            <SingleLine start={p1} end={p2} style={style} side="front" />
            <SingleLine start={p2} end={p3} style={style} side="right" />
            <SingleLine start={p3} end={p4} style={style} side="rear" />
            <SingleLine start={p4} end={p1} style={style} side="left" />

            {/* Dimensions */}
            {/* Front (Bottom) - Offset Negative Y */}
            <Dimension
                start={p1} end={p2}
                label={`${width}'`}
                offset={-15}
                color="black"
                visible={showWidthDimensions}
                settings={dimensionSettings}
            />
            {/* Depth Check - Left vs Right */}
            {/* Depth Check - Left vs Right */}
            {dimensionSide === 'right' ? (
                // Right Side Depth (Positive X) -> Draw Top-to-Bottom so "Bottom" anchor pushes text Right (Outside)
                // Offset Logic: Down vector (0,-1) -> Perp (1,0) Right. Positive offset moves Right (Outside).
                <Dimension
                    start={p3} end={p2}
                    label={`${depth}'`}
                    offset={15}
                    color="black"
                    visible={showDepthDimensions}
                    settings={dimensionSettings}
                    flipText={true}
                />
            ) : (
                // Left Side Depth (Negative X) -> Draw Bottom-to-Top so "Bottom" anchor pushes text Left (Outside)
                // Offset Logic: Up vector (0,1) -> Perp (-1,0) Left. Positive offset moves Left (Outside).
                <Dimension
                    start={p1} end={p4}
                    label={`${depth}'`}
                    offset={15}
                    color="black"
                    visible={showDepthDimensions}
                    settings={dimensionSettings}
                />
            )}
        </group>
    )
}

const SetbackLayer = ({ lotWidth, lotDepth, setbacks, x, y, style, scaleFactor = 1, showDimensions = false, dimensionSettings = {} }) => {
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
            <SingleLine start={p1} end={p2} style={style} side="front" />
            <SingleLine start={p2} end={p3} style={style} side="right" />
            <SingleLine start={p3} end={p4} style={style} side="rear" />
            <SingleLine start={p4} end={p1} style={style} side="left" />

            {/* Setback Dimensions - Measuring the gap from Lot Line to Setback Line */}
            {/* Front Setback */}
            <Dimension
                start={[0, -lotDepth / 2, 0.1]}
                end={[0, y1, 0.1]}
                label={`${setbackFront}'`}
                offset={5} // Offset to the right
                color={style.color || "red"}
                visible={showDimensions}
                settings={dimensionSettings}
            />
            {/* Rear Setback */}
            <Dimension
                start={[0, y2, 0.1]}
                end={[0, lotDepth / 2, 0.1]}
                label={`${setbackRear}'`}
                offset={5}
                color={style.color || "red"}
                visible={showDimensions}
                settings={dimensionSettings}
            />
            {/* Left Setback */}
            <Dimension
                start={[-lotWidth / 2, 0, 0.1]}
                end={[x1, 0, 0.1]}
                label={`${setbackSideLeft}'`}
                offset={5} // Offset "up" in Y
                color={style.color || "red"}
                visible={showDimensions}
                settings={dimensionSettings}
            />
            {/* Right Setback */}
            <Dimension
                start={[x2, 0, 0.1]}
                end={[lotWidth / 2, 0, 0.1]}
                label={`${setbackSideRight}'`}
                offset={5}
                color={style.color || "red"}
                visible={showDimensions}
                settings={dimensionSettings}
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
                    />
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
                    />
                )}
                {layers.buildings && (
                    <Building
                        width={existing.buildingWidth}
                        depth={existing.buildingDepth}
                        height={existing.buildingHeight}
                        x={existing.buildingX}
                        y={existing.buildingY}
                        styles={{ faces: existingStyles.buildingFaces, edges: existingStyles.buildingEdges }}
                        renderSettings={renderSettings}
                        scaleFactor={scaleFactor}
                        onPositionChange={(x, y) => setBuildingPosition('existing', x, y)}
                        offsetGroupX={-offset}
                    />
                )}
            </group>

            {/* PROPOSED SCENE (Right - positive X) */}
            <group position={[offset, 0, 0]}>
                {layers.lotLines && (
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
                    />
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
                    />
                )}
                {layers.buildings && (
                    <Building
                        width={proposed.buildingWidth}
                        depth={proposed.buildingDepth}
                        height={proposed.buildingHeight}
                        x={proposed.buildingX}
                        y={proposed.buildingY}
                        styles={{ faces: proposedStyles.buildingFaces, edges: proposedStyles.buildingEdges }}
                        renderSettings={renderSettings}
                        scaleFactor={scaleFactor}
                        onPositionChange={(x, y) => setBuildingPosition('proposed', x, y)}
                        offsetGroupX={offset}
                    />
                )}
            </group>
        </group>
    )
}

export default SceneContent
