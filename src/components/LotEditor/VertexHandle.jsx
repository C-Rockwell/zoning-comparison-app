import { useState, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../store/useStore'

// Draggable vertex handle at polygon corners
const VertexHandle = ({ position, vertexIndex, onDrag, onDragEnd, offsetGroupX = 0, offsetGroupY = 0 }) => {
    const [hovered, setHovered] = useState(false)
    const [dragging, setDragging] = useState(false)
    const { controls, camera } = useThree()
    const groupRef = useRef()

    // Plane for raycasting at Z=0
    const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), [])
    const planeIntersectPoint = useRef(new THREE.Vector3())

    // Camera-distance scaling — handles stay ~same screen size regardless of zoom
    useFrame(() => {
        if (!groupRef.current) return
        const worldPos = new THREE.Vector3(position.x, position.y, 0)
        const dist = camera.position.distanceTo(worldPos)
        const newScale = Math.max(0.3, Math.min(2.0, dist / 100))
        groupRef.current.scale.setScalar(newScale)
    })

    const handlePointerDown = (e) => {
        e.stopPropagation()
        if (controls) controls.enabled = false
        setDragging(true)
        useStore.temporal.getState().pause()
        e.target.setPointerCapture(e.pointerId)
    }

    const handlePointerUp = (e) => {
        e.stopPropagation()
        setDragging(false)
        useStore.temporal.getState().resume()
        if (controls) controls.enabled = true
        e.target.releasePointerCapture(e.pointerId)
        if (onDragEnd) onDragEnd(vertexIndex)
    }

    const handlePointerMove = (e) => {
        if (!dragging) return
        e.stopPropagation()

        // Raycast to Z=0 plane
        if (!e.ray.intersectPlane(plane, planeIntersectPoint.current)) return

        // Convert world to local (subtract group offset)
        const localX = planeIntersectPoint.current.x - offsetGroupX
        const localY = planeIntersectPoint.current.y - offsetGroupY

        if (onDrag) {
            onDrag(vertexIndex, localX, localY)
        }
    }

    // Handle size and colors
    const size = dragging ? 2.0 : (hovered ? 1.8 : 1.5)
    const color = dragging ? '#ffff00' : (hovered ? '#00ff00' : '#ffffff')

    return (
        <group>
            <group ref={groupRef} position={[position.x, position.y, 0.5]}>
                <mesh
                    onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
                    onPointerOut={() => setHovered(false)}
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    onPointerMove={handlePointerMove}
                >
                    <sphereGeometry args={[size, 16, 16]} />
                    <meshBasicMaterial
                        color={color}
                        transparent
                        opacity={0.9}
                        depthTest={false}
                    />
                </mesh>

                {/* Outline ring for visibility */}
                <mesh>
                    <ringGeometry args={[size * 0.8, size, 16]} />
                    <meshBasicMaterial
                        color="#000000"
                        transparent
                        opacity={0.5}
                        side={THREE.DoubleSide}
                        depthTest={false}
                    />
                </mesh>
            </group>

            {/* Large invisible capture plane during drag — outside scaling group */}
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

export default VertexHandle
