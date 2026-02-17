import { useState, useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Creates a 2D arrow silhouette (shaft + triangular arrowhead) pointing in +Y.
 */
const createArrowShape = (length = 8, headWidth = 4, headLength = 3, shaftWidth = 1.5) => {
    const shape = new THREE.Shape()
    const halfShaft = shaftWidth / 2
    const halfHead = headWidth / 2
    const shaftLength = length - headLength
    // Arrow pointing in +Y direction
    shape.moveTo(-halfShaft, 0)
    shape.lineTo(-halfShaft, shaftLength)
    shape.lineTo(-halfHead, shaftLength)
    shape.lineTo(0, length)
    shape.lineTo(halfHead, shaftLength)
    shape.lineTo(halfShaft, shaftLength)
    shape.lineTo(halfShaft, 0)
    shape.closePath()
    return shape
}

/**
 * LotAccessArrow — large flat 2D arrow on the ground plane, draggable.
 *
 * Props:
 *   direction: 'front' | 'rear' | 'sideStreet' | 'sharedDrive'
 *   lotWidth, lotDepth: lot dimensions for default positioning
 *   streetSides: { left: bool, right: bool }
 *   bidirectional: boolean — render two arrows back-to-back
 *   position: [x, y, z] — current position
 *   onPositionChange: callback(newPos)
 *   color: arrow color (default magenta)
 */
const LotAccessArrow = ({
    direction = 'front',
    // eslint-disable-next-line no-unused-vars
    lotWidth, lotDepth, // accepted for API consistency — parent uses for default positions
    streetSides = {},
    bidirectional = false,
    position = [0, 0, 0],
    onPositionChange,
    color: colorProp,
    style: styleProp,
}) => {
    // Style prop takes precedence over color prop for backwards compat
    const color = styleProp?.color ?? colorProp ?? '#FF00FF'
    const opacity = styleProp?.opacity ?? 1.0
    const isTransparent = opacity < 1
    const [dragging, setDragging] = useState(false)
    const { controls } = useThree()

    // Drag on Z=0 ground plane
    const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), [])
    const planeIntersectPoint = useRef(new THREE.Vector3())
    const dragOffset = useRef(new THREE.Vector3())

    // Create the arrow shape geometry (memoized)
    const arrowGeometry = useMemo(() => {
        const shape = createArrowShape(8, 4, 3, 1.5)
        const geo = new THREE.ShapeGeometry(shape)
        // Center the geometry on its own center for easier rotation
        geo.computeBoundingBox()
        const center = new THREE.Vector3()
        geo.boundingBox.getCenter(center)
        geo.translate(-center.x, -center.y, 0)
        return geo
    }, [])

    // Compute rotation based on direction
    const rotation = useMemo(() => {
        switch (direction) {
            case 'front':
                return 0
            case 'rear':
                return Math.PI
            case 'sideStreet':
                return streetSides.left ? Math.PI / 2 : -Math.PI / 2
            case 'sharedDrive':
                // Interior side is the one that is NOT a street side
                // If right is street, interior is left → arrow points left (Math.PI / 2)
                // If left is street, interior is right → arrow points right (-Math.PI / 2)
                // If neither, default to right side
                if (streetSides.right) return Math.PI / 2
                if (streetSides.left) return -Math.PI / 2
                return -Math.PI / 2
            default:
                return 0
        }
    }, [direction, streetSides])

    // Drag handlers (following DraggableLabel pattern)
    const handlePointerDown = (e) => {
        e.stopPropagation()
        if (controls) controls.enabled = false // eslint-disable-line react-hooks/immutability
        setDragging(true)
        e.target.setPointerCapture(e.pointerId)

        // Calculate offset from arrow position to click point
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
        if (controls) controls.enabled = true // eslint-disable-line react-hooks/immutability
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

    const arrowZ = 0.15

    return (
        <group position={[position[0], position[1], arrowZ]}>
            {/* Primary arrow */}
            <mesh
                geometry={arrowGeometry}
                rotation={[0, 0, rotation]}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerMove={handlePointerMove}
            >
                <meshBasicMaterial
                    color={color}
                    side={THREE.DoubleSide}
                    opacity={opacity}
                    transparent={isTransparent}
                    depthWrite={!isTransparent}
                />
            </mesh>

            {/* Second arrow for bidirectional (rotated 180 degrees) */}
            {bidirectional && (
                <mesh
                    geometry={arrowGeometry}
                    rotation={[0, 0, rotation + Math.PI]}
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    onPointerMove={handlePointerMove}
                >
                    <meshBasicMaterial
                        color={color}
                        side={THREE.DoubleSide}
                        opacity={opacity}
                        transparent={isTransparent}
                        depthWrite={!isTransparent}
                    />
                </mesh>
            )}

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

export default LotAccessArrow
