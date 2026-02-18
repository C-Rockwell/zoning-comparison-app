import { useState } from 'react'
import * as THREE from 'three'

// Handle at edge midpoints - click to add a new vertex
const MidpointHandle = ({ v1, v2, edgeIndex, onSplit }) => {
    const [hovered, setHovered] = useState(false)

    // Calculate midpoint
    const midpoint = {
        x: (v1.x + v2.x) / 2,
        y: (v1.y + v2.y) / 2,
    }

    // Calculate edge length to hide handle on short edges
    const edgeLength = Math.sqrt(
        Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2)
    )

    // Hide if edge is too short
    if (edgeLength < 10) return null

    const handleClick = (e) => {
        e.stopPropagation()
        if (onSplit) {
            onSplit(edgeIndex)
        }
    }

    const size = hovered ? 1.6 : 1.35
    const color = hovered ? '#00ff00' : '#6699cc'

    return (
        <mesh
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
