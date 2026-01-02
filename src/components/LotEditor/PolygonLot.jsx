import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'

// Renders a polygon lot using vertices from the store
const PolygonLot = ({ vertices, style, fillStyle, showDimensions = false, dimensionSettings = {} }) => {
    // Create THREE.Shape from vertices for filled polygon
    const shape = useMemo(() => {
        if (!vertices || vertices.length < 3) return null
        const s = new THREE.Shape()
        s.moveTo(vertices[0].x, vertices[0].y)
        vertices.slice(1).forEach(v => s.lineTo(v.x, v.y))
        s.closePath()
        return s
    }, [vertices])

    // Calculate edges from vertices
    const edges = useMemo(() => {
        if (!vertices || vertices.length < 3) return []
        return vertices.map((v, i) => {
            const nextV = vertices[(i + 1) % vertices.length]
            return {
                start: [v.x, v.y, 0],
                end: [nextV.x, nextV.y, 0],
                index: i,
                side: getEdgeSide(v, nextV),
            }
        })
    }, [vertices])

    if (!shape || !vertices) return null

    return (
        <group>
            {/* Filled polygon using ShapeGeometry */}
            {fillStyle.visible && (
                <mesh position={[0, 0, 0.02]} receiveShadow>
                    <shapeGeometry args={[shape]} />
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

            {/* Edge lines */}
            {edges.map((edge, i) => (
                <SingleLine
                    key={i}
                    start={edge.start}
                    end={edge.end}
                    style={style}
                    side={edge.side}
                />
            ))}
        </group>
    )
}

// Determine which side of the lot an edge is on based on its direction
const getEdgeSide = (v1, v2) => {
    const dx = v2.x - v1.x
    const dy = v2.y - v1.y

    // Primarily horizontal edges
    if (Math.abs(dx) > Math.abs(dy)) {
        return dy >= 0 ? 'front' : 'rear'
    }
    // Primarily vertical edges
    return dx >= 0 ? 'right' : 'left'
}

// Single line component (same as in SceneContent)
const SingleLine = ({ start, end, style, side }) => {
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

export default PolygonLot
