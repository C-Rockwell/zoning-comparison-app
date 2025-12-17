import { useStore } from '../store/useStore'
import { useMemo } from 'react'
import { Line, Edges } from '@react-three/drei'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import Dimension from './Dimension'

const Building = ({ width, depth, height, x, y, styles, scaleFactor = 1 }) => {
    const { faces, edges } = styles
    return (
        // Z-UP: Position center is [x, y, z=height/2]
        // Three JS BoxGeometry args are [width, height, depth].
        // We want width along X, depth along Y, height along Z.
        // If we use BoxGeometry(width, depth, height) -> X=w, Y=d, Z=h.
        <mesh position={[x, y, height / 2]} castShadow receiveShadow>
            <boxGeometry args={[width, depth, height]} />
            <meshStandardMaterial
                color={faces.color}
                transparent
                opacity={faces.opacity}
            />
            {edges.visible && (
                <Edges
                    linewidth={edges.width * scaleFactor}
                    threshold={15} // Angle threshold to show edges
                    color={edges.color}
                />
            )}
        </mesh>
    )
}

// Helper to construct geometry props
const Lot = ({ width, depth, x, y, style, scaleFactor = 1 }) => {
    // Convert box to line points for Line component (supports width)
    const points = useMemo(() => {
        const w2 = width / 2
        const d2 = depth / 2
        // Closed loop rectangle
        return [
            [-w2, -d2, 0],
            [w2, -d2, 0],
            [w2, d2, 0],
            [-w2, d2, 0],
            [-w2, -d2, 0]
        ]
    }, [width, depth])

    return (
        <group position={[x, y, 0]}>
            {/* Fill */}
            <mesh position={[0, 0, -0.05]} receiveShadow>
                <planeGeometry args={[width, depth]} />
                <meshBasicMaterial color={style.color} opacity={0.1} transparent side={2} />
            </mesh>
            {/* Stroke */}
            <Line
                points={points}
                color={style.color}
                lineWidth={style.width * scaleFactor}
                dashed={style.dashed}
                dashScale={style.dashed ? 10 * scaleFactor : 1}
                dashSize={1}
                gapSize={0.5}
            />
        </group>
    )
}

// Helper to draw setback lines
const SetbackLayer = ({ lotWidth, lotDepth, setbacks, x, y, style, scaleFactor = 1 }) => {
    // Calculate local corners of the buildable area
    // Lot is centered at [x,y]. Local extents are +/- width/2, +/- depth/2.
    // Front is at Y=0 (World). Back at Y=Depth.
    // Lot Center Y = Depth/2.
    // So Front (Y=0) corresponds to Local Y = -Depth/2.
    // Rear (Y=Depth) corresponds to Local Y = +Depth/2.

    // Left Edge (World) -> Local X = -Width/2.
    // Right Edge (World) -> Local X = +Width/2.

    const { setbackFront, setbackRear, setbackSideLeft, setbackSideRight } = setbacks

    // Calculate LOCAL coordinates for the setback rectangle
    // Front line Y: -lotDepth/2 + setbackFront
    const y1 = -lotDepth / 2 + setbackFront
    // Rear line Y: lotDepth/2 - setbackRear
    const y2 = lotDepth / 2 - setbackRear
    // Left line X: -lotWidth/2 + setbackSideLeft
    const x1 = -lotWidth / 2 + setbackSideLeft
    // Right line X: lotWidth/2 - setbackSideRight
    const x2 = lotWidth / 2 - setbackSideRight

    const points = [
        [x1, y1, 0.1], // Bottom Left (raised slightly to avoid z-fight)
        [x2, y1, 0.1], // Bottom Right
        [x2, y2, 0.1], // Top Right
        [x1, y2, 0.1], // Top Left
        [x1, y1, 0.1]  // Close loop
    ]

    return (
        <group position={[x, y, 0]}>
            <Line
                points={points}
                color={style.color}
                lineWidth={style.width * scaleFactor}
                dashed={style.dashed}
                dashScale={(style.dashScale || 5) * scaleFactor}
                dashSize={1}
                gapSize={1}
            />
        </group>
    )
}

const SceneContent = () => {
    const existing = useStore((state) => state.existing)
    const proposed = useStore((state) => state.proposed)
    const layers = useStore((state) => state.viewSettings.layers)
    const styleSettings = useStore((state) => state.viewSettings.styleSettings)
    // const { size } = useThree() // Comment out useThree

    // Dynamic Scale Factor for High-Res Exports
    const scaleFactor = 1 // Math.max(1, size.width / 1920)

    // Fallback if styles not loaded yet
    if (!styleSettings) return null

    return (
        <group>
            {/* Origin Marker */}
            {layers.origin && (
                <mesh position={[0, 0, 0.5]}>
                    <sphereGeometry args={[0.5]} />
                    <meshBasicMaterial color="red" />
                </mesh>
            )}

            {/* EXISTING SCENE */}
            <group>
                {layers.lotLines && (
                    <Lot
                        width={existing.lotWidth}
                        depth={existing.lotDepth}
                        x={-existing.lotWidth / 2}
                        y={existing.lotDepth / 2}
                        style={styleSettings.lotLines}
                        scaleFactor={scaleFactor}
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
                        style={styleSettings.setbacks}
                        scaleFactor={scaleFactor}
                    />
                )}
                {/* Building Mass (Existing) */}
                {layers.buildings && (
                    <Building
                        width={existing.buildingWidth}
                        depth={existing.buildingDepth}
                        height={existing.buildingHeight}
                        x={((-existing.lotWidth + existing.setbackSideLeft) - existing.setbackSideRight) / 2}
                        y={(existing.setbackFront + (existing.lotDepth - existing.setbackRear)) / 2}
                        styles={{ faces: styleSettings.buildingFaces, edges: styleSettings.buildingEdges }}
                        scaleFactor={scaleFactor}
                    />
                )}
            </group>

            {/* PROPOSED SCENE */}
            <group>
                {layers.lotLines && (
                    <Lot
                        width={proposed.lotWidth}
                        depth={proposed.lotDepth}
                        x={proposed.lotWidth / 2}
                        y={proposed.lotDepth / 2}
                        style={styleSettings.lotLines}
                        scaleFactor={scaleFactor}
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
                        style={styleSettings.setbacks}
                        scaleFactor={scaleFactor}
                    />
                )}
                {/* Building Mass (Proposed) */}
                {layers.buildings && (
                    <Building
                        width={proposed.buildingWidth}
                        depth={proposed.buildingDepth}
                        height={proposed.buildingHeight}
                        x={(proposed.setbackSideLeft + (proposed.lotWidth - proposed.setbackSideRight)) / 2}
                        y={(proposed.setbackFront + (proposed.lotDepth - proposed.setbackRear)) / 2}
                        styles={{ faces: styleSettings.buildingFaces, edges: styleSettings.buildingEdges }}
                        scaleFactor={scaleFactor}
                    />
                )}
            </group>
        </group>
    )
}

export default SceneContent
