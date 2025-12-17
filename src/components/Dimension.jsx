import { Text, Line } from '@react-three/drei'
import * as THREE from 'three'

const Dimension = ({ start, end, label, color = "black" }) => {
    // Simple line with text at midpoint
    const midX = (start[0] + end[0]) / 2
    const midY = (start[1] + end[1]) / 2
    const midZ = (start[2] + end[2]) / 2

    return (
        <group>
            <Line points={[start, end]} color={color} lineWidth={1} />
            <Text
                position={[midX, midY, midZ + 1]} // Offset Z for height
                color={color}
                fontSize={3}
                anchorX="center"
                anchorY="bottom"
                billboard
                renderOrder={1} // Top
            >
                {label}
            </Text>
        </group>
    )
}

export default Dimension
