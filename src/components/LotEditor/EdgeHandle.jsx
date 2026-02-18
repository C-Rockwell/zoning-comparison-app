import { useState, useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../store/useStore'

// Push/pull handle on edges - drag perpendicular to extrude
const EdgeHandle = ({ v1, v2, edgeIndex, onExtrude, offsetGroupX = 0 }) => {
    const [hovered, setHovered] = useState(false)
    const [dragging, setDragging] = useState(false)
    const { controls } = useThree()

    // Store the start position when drag begins
    const dragStartRef = useRef(null)
    const initialDistanceRef = useRef(0)

    // Plane for raycasting at Z=0
    const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), [])
    const planeIntersectPoint = useRef(new THREE.Vector3())

    // Calculate edge midpoint
    const midpoint = useMemo(() => ({
        x: (v1.x + v2.x) / 2,
        y: (v1.y + v2.y) / 2,
    }), [v1, v2])

    // Calculate perpendicular direction (outward normal)
    const perpDir = useMemo(() => {
        const dx = v2.x - v1.x
        const dy = v2.y - v1.y
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len === 0) return { x: 0, y: 1 }
        // Rotate 90 degrees counter-clockwise for outward normal
        return { x: -dy / len, y: dx / len }
    }, [v1, v2])

    // Calculate edge length
    const edgeLength = Math.sqrt(
        Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2)
    )

    // Hide if edge is too short
    if (edgeLength < 10) return null

    // Arrow position (offset from edge center along perpendicular)
    const arrowOffset = 4
    const arrowPosition = {
        x: midpoint.x + perpDir.x * arrowOffset,
        y: midpoint.y + perpDir.y * arrowOffset,
    }

    // Calculate rotation for the arrow to point along perpendicular
    const arrowRotation = Math.atan2(perpDir.y, perpDir.x) - Math.PI / 2

    const handlePointerDown = (e) => {
        e.stopPropagation()
        if (controls) controls.enabled = false
        setDragging(true)
        useStore.temporal.getState().pause()
        e.target.setPointerCapture(e.pointerId)

        // Store initial position
        if (e.ray.intersectPlane(plane, planeIntersectPoint.current)) {
            dragStartRef.current = {
                x: planeIntersectPoint.current.x - offsetGroupX,
                y: planeIntersectPoint.current.y,
            }
            initialDistanceRef.current = 0
        }
    }

    const handlePointerUp = (e) => {
        e.stopPropagation()
        setDragging(false)
        useStore.temporal.getState().resume()
        if (controls) controls.enabled = true
        e.target.releasePointerCapture(e.pointerId)
        dragStartRef.current = null
    }

    const handlePointerMove = (e) => {
        if (!dragging || !dragStartRef.current) return
        e.stopPropagation()

        if (!e.ray.intersectPlane(plane, planeIntersectPoint.current)) return

        const currentX = planeIntersectPoint.current.x - offsetGroupX
        const currentY = planeIntersectPoint.current.y

        // Calculate movement from drag start
        const dx = currentX - dragStartRef.current.x
        const dy = currentY - dragStartRef.current.y

        // Project movement onto perpendicular direction
        const distance = dx * perpDir.x + dy * perpDir.y

        // Only update if distance changed significantly
        if (Math.abs(distance - initialDistanceRef.current) > 0.5) {
            initialDistanceRef.current = distance
            if (onExtrude) {
                onExtrude(edgeIndex, distance)
            }
        }
    }

    const size = dragging ? 1.5 : (hovered ? 1.3 : 1.0)
    const color = dragging ? '#ffff00' : (hovered ? '#00aaff' : '#4488ff')

    return (
        <group>
            {/* Arrow indicator */}
            <group
                position={[arrowPosition.x, arrowPosition.y, 0.7]}
                rotation={[0, 0, arrowRotation]}
            >
                <mesh
                    onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
                    onPointerOut={() => setHovered(false)}
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    onPointerMove={handlePointerMove}
                >
                    <coneGeometry args={[size * 0.8, size * 2, 8]} />
                    <meshBasicMaterial
                        color={color}
                        transparent
                        opacity={0.9}
                        depthTest={false}
                    />
                </mesh>
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

export default EdgeHandle
