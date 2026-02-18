import { useMemo } from 'react'
import { Edges } from '@react-three/drei'
import * as THREE from 'three'

// Renders a polygon-shaped building using ExtrudeGeometry per floor
const PolygonBuilding = ({
    vertices,
    floors,
    styles,
    lineScale = 1,
    scaleFactor = 1,
    isMoveModeTarget = false,
    moveMode = null,
    onPointerDown,
    onPointerUp,
    onPointerMove,
    onPointerOver,
    onPointerOut,
}) => {
    const { faces, edges } = styles

    // Move mode highlight: green if target, blue if selectObject phase, else normal
    const effectiveColor = isMoveModeTarget ? '#00ff88' : (moveMode?.active && moveMode.phase === 'selectObject') ? '#88ccff' : faces.color
    const effectiveOpacity = isMoveModeTarget ? 0.7 : (moveMode?.active && moveMode.phase === 'selectObject') ? 0.8 : faces.opacity

    // Create THREE.Shape from building footprint vertices
    const shape = useMemo(() => {
        if (!vertices || vertices.length < 3) return null
        const s = new THREE.Shape()
        s.moveTo(vertices[0].x, vertices[0].y)
        vertices.slice(1).forEach(v => s.lineTo(v.x, v.y))
        s.closePath()
        return s
    }, [vertices])

    if (!shape || !floors || floors.length === 0) return null

    return (
        <group>
            {floors.map((floor, index) => {
                const extrudeSettings = {
                    depth: floor.height,
                    bevelEnabled: false,
                }

                return (
                    <mesh
                        key={floor.index}
                        position={[0, 0, floor.zBottom]}
                        castShadow
                        receiveShadow
                        renderOrder={4}
                        onPointerOver={index === 0 ? onPointerOver : undefined}
                        onPointerOut={index === 0 ? onPointerOut : undefined}
                        onPointerDown={index === 0 ? onPointerDown : undefined}
                        onPointerUp={index === 0 ? onPointerUp : undefined}
                        onPointerMove={index === 0 ? onPointerMove : undefined}
                    >
                        <extrudeGeometry args={[shape, extrudeSettings]} />
                        <meshStandardMaterial
                            color={effectiveColor}
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
                )
            })}
        </group>
    )
}

export default PolygonBuilding
