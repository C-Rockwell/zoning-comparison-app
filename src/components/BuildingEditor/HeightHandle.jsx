import { useState, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../store/useStore'

// Draggable handle at the top of the building for adjusting total height
const HeightHandle = ({ position, totalHeight, onHeightChange, offsetGroupX = 0 }) => {
    const [hovered, setHovered] = useState(false)
    const [dragging, setDragging] = useState(false)
    const { camera, controls } = useThree()
    const planeRef = useRef(new THREE.Plane())
    const intersectPoint = useRef(new THREE.Vector3())

    const size = dragging ? 2.0 : (hovered ? 1.8 : 1.5)
    const color = dragging ? '#ffff00' : (hovered ? '#ff8800' : '#ff6600')

    const handlePointerDown = (e) => {
        e.stopPropagation()
        if (controls) controls.enabled = false
        setDragging(true)
        useStore.temporal.getState().pause()
        e.target.setPointerCapture(e.pointerId)

        // Create a vertical plane facing the camera, passing through the building center
        const cameraDir = camera.position.clone()
            .sub(new THREE.Vector3(position[0], position[1], 0))
        cameraDir.z = 0 // Project to XY plane
        cameraDir.normalize()
        if (cameraDir.lengthSq() < 0.001) {
            cameraDir.set(1, 0, 0) // Fallback
        }
        planeRef.current.setFromNormalAndCoplanarPoint(
            cameraDir,
            new THREE.Vector3(position[0] + offsetGroupX, position[1], position[2])
        )
    }

    const handlePointerUp = (e) => {
        e.stopPropagation()
        setDragging(false)
        useStore.temporal.getState().resume()
        if (controls) controls.enabled = true
        e.target.releasePointerCapture(e.pointerId)
    }

    const handlePointerMove = (e) => {
        if (!dragging) return
        e.stopPropagation()

        if (!e.ray.intersectPlane(planeRef.current, intersectPoint.current)) return

        // Read Z component as the new total height
        const newHeight = Math.round(Math.max(1, intersectPoint.current.z))
        if (newHeight !== totalHeight && onHeightChange) {
            onHeightChange(newHeight)
        }
    }

    return (
        <group>
            {/* Height handle sphere */}
            <mesh
                position={position}
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

            {/* Outline ring */}
            <mesh position={position}>
                <ringGeometry args={[size * 0.8, size, 16]} />
                <meshBasicMaterial
                    color="#000000"
                    transparent
                    opacity={0.5}
                    side={THREE.DoubleSide}
                    depthTest={false}
                />
            </mesh>

            {/* Large capture plane during drag */}
            {dragging && (
                <mesh
                    visible={false}
                    position={[position[0], position[1], position[2]]}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                >
                    <planeGeometry args={[1000, 1000]} />
                </mesh>
            )}
        </group>
    )
}

export default HeightHandle
