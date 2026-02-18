import { useState, useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import AnnotationText from './AnnotationText'
import { useStore } from '../store/useStore'

/**
 * Wraps AnnotationText with drag-to-reposition functionality.
 * Shows a leader line back to the anchor point when dragged away.
 */
const DraggableLabel = ({
    defaultPosition = [0, 0, 0],
    customPosition = null,
    anchorPoint = null,
    showLeaderLine = true,
    onPositionChange,
    leaderLineSettings = {},
    // AnnotationText pass-through props
    text = '',
    fontSize = 2,
    color = '#000000',
    rotation = 'billboard',
    lineAngle = 0,
    fixedRotation = [0, 0, 0],
    background = null,
    anchorX = 'center',
    anchorY = 'bottom',
    outlineWidth = 0.1,
    outlineColor = '#ffffff',
    lineScale = 1,
    visible = true,
    depthTest = true,
}) => {
    if (!visible || !text) return null

    const [hovered, setHovered] = useState(false)
    const [dragging, setDragging] = useState(false)
    const { controls } = useThree()

    // Drag on Z=0 ground plane
    const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), [])
    const planeIntersectPoint = useRef(new THREE.Vector3())
    const dragOffset = useRef(new THREE.Vector3())

    // Current position: custom if set, otherwise default
    const position = customPosition || defaultPosition

    // Determine if label has been moved from its default
    const isDisplaced = customPosition != null && (
        Math.abs(customPosition[0] - defaultPosition[0]) > 0.5 ||
        Math.abs(customPosition[1] - defaultPosition[1]) > 0.5 ||
        Math.abs(customPosition[2] - defaultPosition[2]) > 0.5
    )

    const handlePointerDown = (e) => {
        e.stopPropagation()
        if (controls) controls.enabled = false
        setDragging(true)
        useStore.temporal.getState().pause()
        e.target.setPointerCapture(e.pointerId)

        // Calculate offset from label position to click point
        if (e.ray.intersectPlane(plane, planeIntersectPoint.current)) {
            dragOffset.current.set(
                position[0] - planeIntersectPoint.current.x,
                position[1] - planeIntersectPoint.current.y,
                0
            )
        }
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

        if (!e.ray.intersectPlane(plane, planeIntersectPoint.current)) return

        const newPos = [
            planeIntersectPoint.current.x + dragOffset.current.x,
            planeIntersectPoint.current.y + dragOffset.current.y,
            position[2],
        ]

        if (onPositionChange) {
            onPositionChange(newPos)
        }
    }

    const dampenedScale = Math.pow(lineScale, 0.15)
    const leaderColor = leaderLineSettings.color || '#666666'
    const leaderWidth = (leaderLineSettings.width || 1) * dampenedScale
    const leaderDashed = leaderLineSettings.dashed || false

    // Hitbox size scales with font
    const hitboxSize = Math.max(fontSize * 3, 6)

    return (
        <group>
            {/* Leader line from label to anchor when displaced */}
            {showLeaderLine && isDisplaced && anchorPoint && (
                <Line
                    points={[position, anchorPoint]}
                    color={leaderColor}
                    lineWidth={leaderWidth}
                    dashed={leaderDashed}
                    dashScale={3}
                />
            )}

            {/* Invisible hitbox for drag interaction */}
            <mesh
                position={position}
                onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
                onPointerOut={() => setHovered(false)}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerMove={handlePointerMove}
            >
                <planeGeometry args={[hitboxSize, hitboxSize / 2]} />
                <meshBasicMaterial
                    visible={false}
                    transparent
                    opacity={0}
                    depthTest={false}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* The actual text */}
            <AnnotationText
                position={position}
                text={text}
                fontSize={fontSize}
                color={dragging ? '#ff6600' : (hovered ? '#0066ff' : color)}
                rotation={rotation}
                lineAngle={lineAngle}
                fixedRotation={fixedRotation}
                background={background}
                anchorX={anchorX}
                anchorY={anchorY}
                outlineWidth={outlineWidth}
                outlineColor={outlineColor}
                lineScale={lineScale}
                depthTest={depthTest}
            />

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

export default DraggableLabel
