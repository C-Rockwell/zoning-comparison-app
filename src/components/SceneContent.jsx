import { useStore } from '../store/useStore'
import { useMemo } from 'react'
import { Line, Edges } from '@react-three/drei'
import * as THREE from 'three'

const Building = ({ width, depth, height, x, y, styles, renderSettings, scaleFactor = 1 }) => {
    const { faces, edges } = styles

    return (
        <mesh position={[x, y, height / 2]} castShadow receiveShadow>
            <boxGeometry args={[width, depth, height]} />
            <meshBasicMaterial
                color={faces.color}
                transparent={true}
                opacity={faces.opacity}
                side={THREE.DoubleSide}
                depthWrite={faces.opacity >= 0.95}
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
    )
}

const Lot = ({ width, depth, x, y, style, fillStyle, scaleFactor = 1 }) => {
    const points = useMemo(() => {
        const w2 = width / 2
        const d2 = depth / 2
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
            {fillStyle.visible && (
                <mesh position={[0, 0, 0.02]} receiveShadow>
                    <planeGeometry args={[width, depth]} />
                    <meshLambertMaterial
                        color={fillStyle.color}
                        opacity={fillStyle.opacity}
                        transparent={fillStyle.opacity < 1}
                        side={THREE.DoubleSide}
                        depthWrite={fillStyle.opacity >= 0.95}
                    />
                </mesh>
            )}
            <Line
                points={points}
                color={style.color}
                lineWidth={style.width * scaleFactor}
                dashed={style.dashed}
                dashScale={style.dashed ? 10 * scaleFactor : 1}
                dashSize={style.dashSize || 1}
                gapSize={style.gapSize || 0.5}
                transparent
                opacity={style.opacity}
            />
        </group>
    )
}

const SetbackLayer = ({ lotWidth, lotDepth, setbacks, x, y, style, scaleFactor = 1 }) => {
    const { setbackFront, setbackRear, setbackSideLeft, setbackSideRight } = setbacks

    const y1 = -lotDepth / 2 + setbackFront
    const y2 = lotDepth / 2 - setbackRear
    const x1 = -lotWidth / 2 + setbackSideLeft
    const x2 = lotWidth / 2 - setbackSideRight

    const points = [
        [x1, y1, 0.1],
        [x2, y1, 0.1],
        [x2, y2, 0.1],
        [x1, y2, 0.1],
        [x1, y1, 0.1]
    ]

    return (
        <group position={[x, y, 0]}>
            <Line
                points={points}
                color={style.color}
                lineWidth={style.width * scaleFactor}
                dashed={style.dashed}
                dashScale={(style.dashScale || 5) * scaleFactor}
                dashSize={style.dashSize || 1}
                gapSize={style.gapSize || 1}
                transparent
                opacity={style.opacity}
            />
        </group>
    )
}

// Ground plane that receives shadows
const GroundPlane = ({ style }) => {
    if (!style.visible) return null

    return (
        <mesh position={[0, 50, -0.1]} receiveShadow>
            <planeGeometry args={[300, 300]} />
            <meshLambertMaterial
                color={style.color}
                opacity={style.opacity}
                transparent={style.opacity < 1}
                side={THREE.DoubleSide}
                depthWrite={style.opacity >= 0.95}
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

    const scaleFactor = 1

    if (!styleSettings || !styleSettings.existing || !styleSettings.proposed) return null

    // Split styles for each model
    const existingStyles = styleSettings.existing
    const proposedStyles = styleSettings.proposed

    return (
        <group>
            <GroundPlane style={styleSettings.ground} />

            {layers.origin && (
                <mesh position={[0, 0, 0.5]}>
                    <sphereGeometry args={[0.5]} />
                    <meshBasicMaterial color="red" />
                </mesh>
            )}

            {/* EXISTING SCENE (Left - negative X) */}
            <group>
                {layers.lotLines && (
                    <Lot
                        width={existing.lotWidth}
                        depth={existing.lotDepth}
                        x={-existing.lotWidth / 2}
                        y={existing.lotDepth / 2}
                        style={existingStyles.lotLines}
                        fillStyle={existingStyles.lotFill}
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
                        style={existingStyles.setbacks}
                        scaleFactor={scaleFactor}
                    />
                )}
                {layers.buildings && (
                    <Building
                        width={existing.buildingWidth}
                        depth={existing.buildingDepth}
                        height={existing.buildingHeight}
                        x={((-existing.lotWidth + existing.setbackSideLeft) - existing.setbackSideRight) / 2}
                        y={(existing.setbackFront + (existing.lotDepth - existing.setbackRear)) / 2}
                        styles={{ faces: existingStyles.buildingFaces, edges: existingStyles.buildingEdges }}
                        renderSettings={renderSettings}
                        scaleFactor={scaleFactor}
                    />
                )}
            </group>

            {/* PROPOSED SCENE (Right - positive X) */}
            <group>
                {layers.lotLines && (
                    <Lot
                        width={proposed.lotWidth}
                        depth={proposed.lotDepth}
                        x={proposed.lotWidth / 2}
                        y={proposed.lotDepth / 2}
                        style={proposedStyles.lotLines}
                        fillStyle={proposedStyles.lotFill}
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
                        style={proposedStyles.setbacks}
                        scaleFactor={scaleFactor}
                    />
                )}
                {layers.buildings && (
                    <Building
                        width={proposed.buildingWidth}
                        depth={proposed.buildingDepth}
                        height={proposed.buildingHeight}
                        x={(proposed.setbackSideLeft + (proposed.lotWidth - proposed.setbackSideRight)) / 2}
                        y={(proposed.setbackFront + (proposed.lotDepth - proposed.setbackRear)) / 2}
                        styles={{ faces: proposedStyles.buildingFaces, edges: proposedStyles.buildingEdges }}
                        renderSettings={renderSettings}
                        scaleFactor={scaleFactor}
                    />
                )}
            </group>
        </group>
    )
}

export default SceneContent
