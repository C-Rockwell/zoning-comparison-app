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
 * Creates a T-junction symbol for shared drive access:
 * - Thick rectangle stem from bottom (front street) up to junction point
 * - Double-ended horizontal arrow (left arrowhead + shaft + right arrowhead) crossing at junction
 * Single continuous path so ShapeGeometry produces one draggable mesh.
 */
const createSharedDriveShape = (
    stemLength = 12,
    stemWidth = 2,
    crossbarLength = 14,
    headWidth = 4,
    headLength = 2.5,
    crossbarShaftWidth = 1.5
) => {
    const shape = new THREE.Shape()
    const halfStem = stemWidth / 2
    const halfCrossShaft = crossbarShaftWidth / 2
    const halfCrossbar = crossbarLength / 2
    const halfHead = headWidth / 2
    const junctionY = stemLength // Where crossbar meets top of stem

    // Start at bottom-left of stem, trace clockwise
    shape.moveTo(-halfStem, 0)

    // Up left side of stem to junction
    shape.lineTo(-halfStem, junctionY - halfCrossShaft)

    // Left crossbar shaft outward
    shape.lineTo(-(halfCrossbar - headLength), junctionY - halfCrossShaft)

    // Left arrowhead (pointing left)
    shape.lineTo(-(halfCrossbar - headLength), junctionY - halfHead)
    shape.lineTo(-halfCrossbar, junctionY)
    shape.lineTo(-(halfCrossbar - headLength), junctionY + halfHead)
    shape.lineTo(-(halfCrossbar - headLength), junctionY + halfCrossShaft)

    // Across top of crossbar to left side of stem
    shape.lineTo(-halfStem, junctionY + halfCrossShaft)

    // Across top of stem to right side
    shape.lineTo(halfStem, junctionY + halfCrossShaft)

    // Right crossbar shaft outward
    shape.lineTo(halfCrossbar - headLength, junctionY + halfCrossShaft)

    // Right arrowhead (pointing right)
    shape.lineTo(halfCrossbar - headLength, junctionY + halfHead)
    shape.lineTo(halfCrossbar, junctionY)
    shape.lineTo(halfCrossbar - headLength, junctionY - halfHead)
    shape.lineTo(halfCrossbar - headLength, junctionY - halfCrossShaft)

    // Back across bottom of crossbar to right side of stem
    shape.lineTo(halfStem, junctionY - halfCrossShaft)

    // Down right side of stem
    shape.lineTo(halfStem, 0)

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

    // Create the shared drive T-junction geometry (dynamic stem length based on lotDepth)
    const sharedDriveGeometry = useMemo(() => {
        const stemLen = (lotDepth || 100) / 2
        const shape = createSharedDriveShape(stemLen, 2, 14, 4, 2.5, 1.5)
        const geo = new THREE.ShapeGeometry(shape)
        geo.computeBoundingBox()
        const center = new THREE.Vector3()
        geo.boundingBox.getCenter(center)
        // Only center X — keep Y origin at bottom of stem so position Y = front edge
        geo.translate(-center.x, 0, 0)
        return geo
    }, [lotDepth])

    const isSharedDrive = direction === 'sharedDrive'
    const activeGeometry = isSharedDrive ? sharedDriveGeometry : arrowGeometry

    // Compute rotation based on direction
    const rotation = useMemo(() => {
        switch (direction) {
            case 'front':
                return 0
            case 'rear':
                return Math.PI
            case 'sideStreet':
                return streetSides.left ? -Math.PI / 2 : Math.PI / 2
            case 'sharedDrive':
                // T-junction: stem points from front street into lot (+Y = toward rear)
                // Rotation 0 means stem goes in +Y direction (front toward rear)
                return 0
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
            {/* Primary shape */}
            <mesh
                geometry={activeGeometry}
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

            {/* Second arrow for bidirectional (only for non-sharedDrive directions) */}
            {bidirectional && !isSharedDrive && (
                <mesh
                    geometry={activeGeometry}
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
