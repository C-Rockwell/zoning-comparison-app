import { useState, useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../store/useStore'

// Direct-drag move handle — rendered at building footprint center.
// Click-and-drag to reposition the building. Follows the same pointer
// capture pattern as EdgeHandle/VertexHandle (stopPropagation + controls.enabled
// + setPointerCapture + invisible capture plane).
const MoveHandle = ({ position, zPosition = 1.0, displayOffset = [0, 0], offsetGroupX = 0, offsetGroupY = 0, onDrag, onDragEnd }) => {
    const [hovered, setHovered] = useState(false)
    const [dragging, setDragging] = useState(false)
    const { controls } = useThree()

    // Plane for raycasting at Z=0
    const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), [])
    const planeIntersectPoint = useRef(new THREE.Vector3())

    // Offset from the building center where the user initially clicked
    const clickOffsetRef = useRef({ x: 0, y: 0 })

    const handlePointerDown = (e) => {
        e.stopPropagation()
        if (controls) controls.enabled = false
        setDragging(true)
        useStore.temporal.getState().pause()
        e.target.setPointerCapture(e.pointerId)

        // Record click offset from building center so dragging feels anchored
        if (e.ray.intersectPlane(plane, planeIntersectPoint.current)) {
            const worldX = planeIntersectPoint.current.x - offsetGroupX
            const worldY = planeIntersectPoint.current.y - offsetGroupY
            clickOffsetRef.current = {
                x: worldX - position[0],
                y: worldY - position[1],
            }
        }
    }

    const handlePointerUp = (e) => {
        e.stopPropagation()
        setDragging(false)
        useStore.temporal.getState().resume()
        if (controls) controls.enabled = true
        e.target.releasePointerCapture(e.pointerId)
        if (onDragEnd) onDragEnd()
    }

    const handlePointerMove = (e) => {
        if (!dragging) return
        e.stopPropagation()

        if (!e.ray.intersectPlane(plane, planeIntersectPoint.current)) return

        const localX = planeIntersectPoint.current.x - offsetGroupX - clickOffsetRef.current.x
        const localY = planeIntersectPoint.current.y - offsetGroupY - clickOffsetRef.current.y

        if (onDrag) onDrag(localX, localY)
    }

    const color = dragging ? '#ffff00' : (hovered ? '#ffaa00' : '#ff8800')
    const sphereSize = dragging ? 1.6 : (hovered ? 1.4 : 1.2)
    const arrowLength = 3.0
    const arrowRadius = 0.5

    return (
        <group>
            {/* Crosshair handle group at building center */}
            <group position={[position[0] + displayOffset[0], position[1] + displayOffset[1], zPosition]}>
                {/* Center sphere */}
                <mesh
                    renderOrder={8}
                    onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
                    onPointerOut={() => setHovered(false)}
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    onPointerMove={handlePointerMove}
                >
                    <sphereGeometry args={[sphereSize, 16, 16]} />
                    <meshBasicMaterial
                        color={color}
                        transparent
                        opacity={0.9}
                        depthTest={false}
                    />
                </mesh>

                {/* Arrow +X */}
                <group position={[arrowLength + sphereSize, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                    <mesh
                        renderOrder={8}
                        onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
                        onPointerOut={() => setHovered(false)}
                        onPointerDown={handlePointerDown}
                        onPointerUp={handlePointerUp}
                        onPointerMove={handlePointerMove}
                    >
                        <coneGeometry args={[arrowRadius, arrowLength, 8]} />
                        <meshBasicMaterial color={color} transparent opacity={0.9} depthTest={false} />
                    </mesh>
                </group>

                {/* Arrow -X */}
                <group position={[-(arrowLength + sphereSize), 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <mesh
                        renderOrder={8}
                        onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
                        onPointerOut={() => setHovered(false)}
                        onPointerDown={handlePointerDown}
                        onPointerUp={handlePointerUp}
                        onPointerMove={handlePointerMove}
                    >
                        <coneGeometry args={[arrowRadius, arrowLength, 8]} />
                        <meshBasicMaterial color={color} transparent opacity={0.9} depthTest={false} />
                    </mesh>
                </group>

                {/* Arrow +Y */}
                <group position={[0, arrowLength + sphereSize, 0]} rotation={[0, 0, Math.PI]}>
                    <mesh
                        renderOrder={8}
                        onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
                        onPointerOut={() => setHovered(false)}
                        onPointerDown={handlePointerDown}
                        onPointerUp={handlePointerUp}
                        onPointerMove={handlePointerMove}
                    >
                        <coneGeometry args={[arrowRadius, arrowLength, 8]} />
                        <meshBasicMaterial color={color} transparent opacity={0.9} depthTest={false} />
                    </mesh>
                </group>

                {/* Arrow -Y */}
                <group position={[0, -(arrowLength + sphereSize), 0]}>
                    <mesh
                        renderOrder={8}
                        onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
                        onPointerOut={() => setHovered(false)}
                        onPointerDown={handlePointerDown}
                        onPointerUp={handlePointerUp}
                        onPointerMove={handlePointerMove}
                    >
                        <coneGeometry args={[arrowRadius, arrowLength, 8]} />
                        <meshBasicMaterial color={color} transparent opacity={0.9} depthTest={false} />
                    </mesh>
                </group>
            </group>

            {/* Large invisible capture plane during drag */}
            {dragging && (
                <mesh
                    visible={false}
                    position={[0, 0, 0]}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                >
                    <planeGeometry args={[1000, 1000]} />
                </mesh>
            )}
        </group>
    )
}

export default MoveHandle
