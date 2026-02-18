import { useMemo } from 'react'
import * as THREE from 'three'
import { Line } from '@react-three/drei'

/**
 * Direction-to-rotation mapping for multi-direction road rendering.
 * Roads are rendered in their canonical "front" orientation (along X, stacking in -Y),
 * then rotated around Z so the lot-facing edge normal points toward the lots.
 *
 * Canonical lot-facing normal = +Y (toward the lot from the road).
 * After rotation, the normal should point:
 * - front: +Y (no rotation) — road in front of lots (negative Y side)
 * - left:  +X (90 CW)       — road to the left, lot-facing edge faces +X toward lots
 * - right: -X (90 CCW)      — road to the right, lot-facing edge faces -X toward lots
 * - rear:  -Y (180)         — road behind lots, lot-facing edge faces -Y toward lots
 */
const DIRECTION_ROTATION = {
    front: 0,
    left: -Math.PI / 2,
    right: Math.PI / 2,
    rear: Math.PI,
}

/**
 * RoadModule Component
 *
 * Renders a road cross-section module adjacent to a lot edge.
 * The module is rendered in a canonical "front" orientation (zones stacking in -Y from
 * a front edge along the X-axis), then rotated via the `direction` prop to face any edge.
 *
 * Geometry Layout (canonical / front direction, from positive Y to negative Y):
 * - Lot front line is at Y=0
 * - Right side elements (parking, verge, sidewalk, transition) stack from road edge toward Y=0
 * - Road width polygon is centered on the centerline (rightOfWay/2)
 * - Left side elements stack from road edge toward the outer right-of-way line
 * - Right-of-way outer line is at Y = -rightOfWay
 *
 * @param {number} lotWidth - Width of the lot (determines road module width along its primary axis)
 * @param {object} roadModule - Road module parameters
 * @param {object} styles - Style settings for each layer type
 * @param {string} model - 'existing' or 'proposed' (for positioning in comparison view)
 * @param {string} direction - 'front' | 'right' | 'rear' | 'left' (default: 'front')
 * @param {number} lineScale - Line width multiplier for export scaling
 */
const RoadModule = ({ lotWidth, roadModule, styles, model, direction = 'front', lineScale = 1, suppressLeftEnd = false, suppressRightEnd = false }) => {
    // Early return if missing required data
    if (!roadModule || !styles || !lotWidth) {
        return null
    }

    const {
        type: roadType,
        rightOfWay = 50,
        roadWidth = 24,
        leftParking,
        rightParking,
        leftVerge,
        rightVerge,
        leftSidewalk,
        rightSidewalk,
        leftTransitionZone,
        rightTransitionZone,
    } = roadModule

    // Calculate centerline Y position (negative, measured from lot front)
    const centerlineY = -rightOfWay / 2

    // Calculate road width edges
    const roadHalfWidth = roadWidth / 2
    const roadTopY = centerlineY + roadHalfWidth    // Closer to lot (toward Y=0)
    const roadBottomY = centerlineY - roadHalfWidth // Farther from lot (toward Y=-rightOfWay)

    // Calculate X positions based on model type
    // Existing: lot extends to negative X from origin (0,0 is bottom-right of lot)
    // Proposed: lot extends to positive X from origin (0,0 is bottom-left of lot)
    const xMin = model === 'existing' ? -lotWidth : 0
    const xMax = model === 'existing' ? 0 : lotWidth

    // Build the layer stack for left and right sides
    // Left side: stacks from road edge toward negative Y (outer right-of-way)
    // Right side: stacks from road edge toward positive Y (lot front)
    const leftLayers = useMemo(() => {
        const layers = []
        let currentY = roadBottomY // Start at left edge of road

        if (leftParking) {
            layers.push({
                type: 'parking',
                topY: currentY,
                bottomY: currentY - leftParking,
                depth: leftParking,
            })
            currentY -= leftParking
        }

        if (leftVerge) {
            layers.push({
                type: 'verge',
                topY: currentY,
                bottomY: currentY - leftVerge,
                depth: leftVerge,
            })
            currentY -= leftVerge
        }

        if (leftSidewalk) {
            layers.push({
                type: 'sidewalk',
                topY: currentY,
                bottomY: currentY - leftSidewalk,
                depth: leftSidewalk,
            })
            currentY -= leftSidewalk
        }

        if (leftTransitionZone) {
            layers.push({
                type: 'transitionZone',
                topY: currentY,
                bottomY: currentY - leftTransitionZone,
                depth: leftTransitionZone,
            })
            currentY -= leftTransitionZone
        }

        return layers
    }, [roadBottomY, leftParking, leftVerge, leftSidewalk, leftTransitionZone])

    const rightLayers = useMemo(() => {
        const layers = []
        let currentY = roadTopY // Start at right edge of road

        if (rightParking) {
            layers.push({
                type: 'parking',
                bottomY: currentY,
                topY: currentY + rightParking,
                depth: rightParking,
            })
            currentY += rightParking
        }

        if (rightVerge) {
            layers.push({
                type: 'verge',
                bottomY: currentY,
                topY: currentY + rightVerge,
                depth: rightVerge,
            })
            currentY += rightVerge
        }

        if (rightSidewalk) {
            layers.push({
                type: 'sidewalk',
                bottomY: currentY,
                topY: currentY + rightSidewalk,
                depth: rightSidewalk,
            })
            currentY += rightSidewalk
        }

        if (rightTransitionZone) {
            layers.push({
                type: 'transitionZone',
                bottomY: currentY,
                topY: currentY + rightTransitionZone,
                depth: rightTransitionZone,
            })
            currentY += rightTransitionZone
        }

        return layers
    }, [roadTopY, rightParking, rightVerge, rightSidewalk, rightTransitionZone])

    // Render a polygon (filled rectangle with optional border)
    const RoadPolygon = ({ xMin, xMax, yMin, yMax, style, zOffset = 0.01, suppressLeftEnd: polyLeftEnd = false, suppressRightEnd: polyRightEnd = false }) => {
        const width = xMax - xMin
        const depth = yMax - yMin
        const centerX = (xMin + xMax) / 2
        const centerY = (yMin + yMax) / 2

        // Corner points for the outline
        const p1 = [xMin, yMin, zOffset]
        const p2 = [xMax, yMin, zOffset]
        const p3 = [xMax, yMax, zOffset]
        const p4 = [xMin, yMax, zOffset]

        return (
            <group>
                {/* Fill */}
                <mesh position={[centerX, centerY, zOffset]} receiveShadow>
                    <planeGeometry args={[width, depth]} />
                    <meshStandardMaterial
                        color={style.fillColor}
                        opacity={style.fillOpacity}
                        transparent={style.fillOpacity < 1}
                        side={THREE.DoubleSide}
                        depthWrite={style.fillOpacity >= 0.95}
                        roughness={1}
                        metalness={0}
                    />
                </mesh>

                {/* Border lines — drei Line2 with adjustable lineWidth */}
                <Line
                    points={[p1, p2]}
                    color={style.lineColor}
                    lineWidth={(style.lineWidth || 1) * lineScale}
                    opacity={style.lineOpacity}
                    transparent={style.lineOpacity < 1}
                    dashed={style.lineDashed}
                    dashSize={style.lineDashed ? 1 : undefined}
                    gapSize={style.lineDashed ? 0.5 : undefined}
                />
                {!polyRightEnd && (
                    <Line
                        points={[p2, p3]}
                        color={style.lineColor}
                        lineWidth={(style.lineWidth || 1) * lineScale}
                        opacity={style.lineOpacity}
                        transparent={style.lineOpacity < 1}
                        dashed={style.lineDashed}
                        dashSize={style.lineDashed ? 1 : undefined}
                        gapSize={style.lineDashed ? 0.5 : undefined}
                    />
                )}
                <Line
                    points={[p3, p4]}
                    color={style.lineColor}
                    lineWidth={(style.lineWidth || 1) * lineScale}
                    opacity={style.lineOpacity}
                    transparent={style.lineOpacity < 1}
                    dashed={style.lineDashed}
                    dashSize={style.lineDashed ? 1 : undefined}
                    gapSize={style.lineDashed ? 0.5 : undefined}
                />
                {!polyLeftEnd && (
                    <Line
                        points={[p4, p1]}
                        color={style.lineColor}
                        lineWidth={(style.lineWidth || 1) * lineScale}
                        opacity={style.lineOpacity}
                        transparent={style.lineOpacity < 1}
                        dashed={style.lineDashed}
                        dashSize={style.lineDashed ? 1 : undefined}
                        gapSize={style.lineDashed ? 0.5 : undefined}
                    />
                )}
            </group>
        )
    }

    // Default styles if not provided — S3 alleys merge alley-specific overrides onto regular styles
    const isS3 = roadType === 'S3'
    const baseRowStyle = styles.rightOfWay ?? { color: '#000000', width: 1, dashed: true, dashSize: 2, gapSize: 1, opacity: 1 }
    const rowStyle = (isS3 && styles.alleyRightOfWay) ? { ...baseRowStyle, ...styles.alleyRightOfWay } : baseRowStyle
    const baseRoadStyle = styles.roadWidth ?? { lineColor: '#000000', lineWidth: 1, lineDashed: false, lineOpacity: 1, fillColor: '#666666', fillOpacity: 1.0 }
    const roadStyle = (isS3 && styles.alleyRoadWidth) ? { ...baseRoadStyle, ...styles.alleyRoadWidth } : baseRoadStyle

    // Resolve rotation angle from direction prop
    const rotationZ = DIRECTION_ROTATION[direction] || 0

    return (
        <group rotation={[0, 0, rotationZ]}>
            {/* Right-of-Way Lines (2 polylines) */}
            {/* Line 1: At Y=0 (lot front line / property line) - matches lot width */}
            <Line
                points={[[xMin, 0, 0.03], [xMax, 0, 0.03]]}
                color={rowStyle.color}
                lineWidth={(rowStyle.width || 1) * lineScale}
                opacity={rowStyle.opacity}
                transparent={rowStyle.opacity < 1}
                dashed={rowStyle.dashed}
                dashSize={rowStyle.dashSize}
                gapSize={rowStyle.gapSize}
                dashScale={rowStyle.dashed ? 5 : 1}
            />
            {/* Line 2: At Y=-rightOfWay (outer edge of right-of-way) */}
            <Line
                points={[[xMin, -rightOfWay, 0.03], [xMax, -rightOfWay, 0.03]]}
                color={rowStyle.color}
                lineWidth={(rowStyle.width || 1) * lineScale}
                opacity={rowStyle.opacity}
                transparent={rowStyle.opacity < 1}
                dashed={rowStyle.dashed}
                dashSize={rowStyle.dashSize}
                gapSize={rowStyle.gapSize}
                dashScale={rowStyle.dashed ? 5 : 1}
            />

            {/* Road Width Polygon (centered on centerline) */}
            <RoadPolygon
                xMin={xMin}
                xMax={xMax}
                yMin={roadBottomY}
                yMax={roadTopY}
                style={roadStyle}
                zOffset={0.01}
                suppressLeftEnd={suppressLeftEnd}
                suppressRightEnd={suppressRightEnd}
            />

            {/* Left Side Layers (toward outer right-of-way) */}
            {leftLayers.map((layer, index) => {
                // Use side-specific style key (e.g., 'leftParking' instead of 'parking')
                const styleKey = `left${layer.type.charAt(0).toUpperCase()}${layer.type.slice(1)}`
                // S3 alleys merge symmetric alley-specific overrides (e.g., alleyParking for both sides)
                const alleyKey = `alley${layer.type.charAt(0).toUpperCase()}${layer.type.slice(1)}`
                const baseStyle = styles[styleKey] ?? styles[layer.type] ?? { lineColor: '#000000', lineWidth: 1, lineDashed: false, lineOpacity: 1, fillColor: '#888888', fillOpacity: 1.0 }
                const layerStyle = (isS3 && styles[alleyKey]) ? { ...baseStyle, ...styles[alleyKey] } : baseStyle
                return (
                    <RoadPolygon
                        key={`left-${layer.type}-${index}`}
                        xMin={xMin}
                        xMax={xMax}
                        yMin={layer.bottomY}
                        yMax={layer.topY}
                        style={layerStyle}
                        zOffset={0.01 + (index + 1) * 0.001}
                        suppressLeftEnd={suppressLeftEnd}
                        suppressRightEnd={suppressRightEnd}
                    />
                )
            })}

            {/* Right Side Layers (toward lot front) */}
            {rightLayers.map((layer, index) => {
                // Use side-specific style key (e.g., 'rightParking' instead of 'parking')
                const styleKey = `right${layer.type.charAt(0).toUpperCase()}${layer.type.slice(1)}`
                // S3 alleys merge symmetric alley-specific overrides (e.g., alleyParking for both sides)
                const alleyKey = `alley${layer.type.charAt(0).toUpperCase()}${layer.type.slice(1)}`
                const baseStyle = styles[styleKey] ?? styles[layer.type] ?? { lineColor: '#000000', lineWidth: 1, lineDashed: false, lineOpacity: 1, fillColor: '#888888', fillOpacity: 1.0 }
                const layerStyle = (isS3 && styles[alleyKey]) ? { ...baseStyle, ...styles[alleyKey] } : baseStyle
                return (
                    <RoadPolygon
                        key={`right-${layer.type}-${index}`}
                        xMin={xMin}
                        xMax={xMax}
                        yMin={layer.bottomY}
                        yMax={layer.topY}
                        style={layerStyle}
                        zOffset={0.01 + (index + 1) * 0.001}
                        suppressLeftEnd={suppressLeftEnd}
                        suppressRightEnd={suppressRightEnd}
                    />
                )
            })}
        </group>
    )
}

export default RoadModule
