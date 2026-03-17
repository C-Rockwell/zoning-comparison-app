import { useState, useMemo, useRef, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../store/useStore'

// --- DrawingVertexHandle ---
// Sphere handle for dragging individual vertices (polygon points, line endpoints, etc.)
// Follows the same pointer-capture pattern as LotEditor/VertexHandle.jsx.

const DrawingVertexHandle = ({ position, index, onDrag, onDragEnd }) => {
    const [hovered, setHovered] = useState(false)
    const [dragging, setDragging] = useState(false)
    const { controls } = useThree()
    const draggingRef = useRef(false)

    const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), [])
    const planeIntersectPoint = useRef(new THREE.Vector3())

    useEffect(() => {
        return () => {
            if (draggingRef.current) {
                useStore.temporal.getState().resume()
            }
            if (controls) controls.enabled = true
        }
    }, [controls])

    const handlePointerDown = (e) => {
        e.stopPropagation()
        if (controls) controls.enabled = false
        setDragging(true)
        draggingRef.current = true
        useStore.temporal.getState().pause()
        e.target.setPointerCapture(e.pointerId)
    }

    const handlePointerUp = (e) => {
        e.stopPropagation()
        setDragging(false)
        draggingRef.current = false
        useStore.temporal.getState().resume()
        if (controls) controls.enabled = true
        e.target.releasePointerCapture(e.pointerId)
        if (onDragEnd) onDragEnd(index)
    }

    const handlePointerMove = (e) => {
        if (!dragging) return
        e.stopPropagation()
        if (!e.ray.intersectPlane(plane, planeIntersectPoint.current)) return
        const x = planeIntersectPoint.current.x
        const y = planeIntersectPoint.current.y
        if (onDrag) onDrag(index, x, y)
    }

    const size = dragging ? 6.0 : (hovered ? 5.4 : 4.5)
    const color = dragging ? '#ffff00' : (hovered ? '#00ff00' : '#ffffff')

    return (
        <group>
            <mesh
                position={[position[0], position[1], 0]}
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
            <mesh position={[position[0], position[1], 0]}>
                <ringGeometry args={[size * 0.8, size, 16]} />
                <meshBasicMaterial
                    color="#000000"
                    transparent
                    opacity={0.5}
                    side={THREE.DoubleSide}
                    depthTest={false}
                />
            </mesh>

            {/* Invisible capture plane during drag */}
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

// --- DrawingResizeHandle ---
// Box handle for resizing (corner/edge drags on rectangles, radius on circles, etc.)

const DrawingResizeHandle = ({ position, size: handleSize = 1.0, onDrag, onDragStart, onDragEnd }) => {
    const [hovered, setHovered] = useState(false)
    const [dragging, setDragging] = useState(false)
    const { controls } = useThree()
    const draggingRef = useRef(false)

    const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), [])
    const planeIntersectPoint = useRef(new THREE.Vector3())

    useEffect(() => {
        return () => {
            if (draggingRef.current) {
                useStore.temporal.getState().resume()
            }
            if (controls) controls.enabled = true
        }
    }, [controls])

    const handlePointerDown = (e) => {
        e.stopPropagation()
        if (controls) controls.enabled = false
        setDragging(true)
        draggingRef.current = true
        useStore.temporal.getState().pause()
        e.target.setPointerCapture(e.pointerId)
        if (onDragStart) onDragStart()
    }

    const handlePointerUp = (e) => {
        e.stopPropagation()
        setDragging(false)
        draggingRef.current = false
        useStore.temporal.getState().resume()
        if (controls) controls.enabled = true
        e.target.releasePointerCapture(e.pointerId)
        if (onDragEnd) onDragEnd()
    }

    const handlePointerMove = (e) => {
        if (!dragging) return
        e.stopPropagation()
        if (!e.ray.intersectPlane(plane, planeIntersectPoint.current)) return
        const x = planeIntersectPoint.current.x
        const y = planeIntersectPoint.current.y
        if (onDrag) onDrag(x, y)
    }

    const s = dragging ? handleSize * 1.3 : (hovered ? handleSize * 1.15 : handleSize)
    const color = dragging ? '#ffff00' : (hovered ? '#3B82F6' : '#ffffff')

    return (
        <group>
            <mesh
                position={[position[0], position[1], 0]}
                onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
                onPointerOut={() => setHovered(false)}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerMove={handlePointerMove}
            >
                <boxGeometry args={[s, s, 0.1]} />
                <meshBasicMaterial
                    color={color}
                    transparent
                    opacity={0.9}
                    depthTest={false}
                />
            </mesh>

            {/* Border outline */}
            <mesh position={[position[0], position[1], 0]}>
                <boxGeometry args={[s + 0.3, s + 0.3, 0.05]} />
                <meshBasicMaterial
                    color="#000000"
                    transparent
                    opacity={0.4}
                    depthTest={false}
                />
            </mesh>

            {/* Invisible capture plane during drag */}
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

export { DrawingVertexHandle, DrawingResizeHandle }
