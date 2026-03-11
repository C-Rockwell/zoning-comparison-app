import { useState, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// Handle at edge midpoints - click to add a new vertex
const MidpointHandle = ({ v1, v2, edgeIndex, onSplit }) => {
    const [hovered, setHovered] = useState(false)
    const { camera } = useThree()
    const meshRef = useRef()

    // Calculate midpoint
    const midpoint = {
        x: (v1.x + v2.x) / 2,
        y: (v1.y + v2.y) / 2,
    }

    // Calculate edge length to hide handle on short edges
    const edgeLength = Math.sqrt(
        Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2)
    )

    // Camera-distance scaling — handles stay ~same screen size regardless of zoom
    useFrame(() => {
        if (!meshRef.current) return
        const worldPos = new THREE.Vector3(midpoint.x, midpoint.y, 0)
        const dist = camera.position.distanceTo(worldPos)
        const newScale = Math.max(0.3, Math.min(2.0, dist / 100))
        meshRef.current.scale.setScalar(newScale)
    })

    // Hide if edge is too short
    if (edgeLength < 3) return null

    const handleClick = (e) => {
        e.stopPropagation()
        if (onSplit) {
            onSplit(edgeIndex)
        }
    }

    const size = hovered ? 1.6 : 1.35
    const color = hovered ? '#CC0000' : '#8B0000'

    return (
        <mesh
            ref={meshRef}
            position={[midpoint.x, midpoint.y, 0.6]}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
            onPointerOut={() => setHovered(false)}
            onClick={handleClick}
        >
            {/* Diamond/plus shape for midpoint */}
            <boxGeometry args={[size * 1.5, size * 1.5, 0.2]} />
            <meshBasicMaterial
                color={color}
                transparent
                opacity={hovered ? 0.9 : 0.75}
                depthTest={false}
            />
        </mesh>
    )
}

export default MidpointHandle
