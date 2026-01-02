import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'

/**
 * RoadModule Component
 *
 * Renders a road cross-section module in front of a lot.
 * The module extends in the negative Y direction from the lot's front edge (x-axis).
 *
 * Geometry Layout (from positive Y to negative Y):
 * - Lot front line is at Y=0
 * - Right side elements (parking, verge, sidewalk, transition) stack from road edge toward Y=0
 * - Road width polygon is centered on the centerline (rightOfWay/2)
 * - Left side elements stack from road edge toward the outer right-of-way line
 * - Right-of-way outer line is at Y = -rightOfWay
 *
 * @param {number} lotWidth - Width of the lot (determines road module width)
 * @param {object} roadModule - Road module parameters
 * @param {object} styles - Style settings for each layer type
 * @param {string} model - 'existing' or 'proposed' (for positioning)
 */
const RoadModule = ({ lotWidth, roadModule, styles, model }) => {
    // Early return if missing required data
    if (!roadModule || !styles || !lotWidth) {
        return null
    }

    const {
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
    const RoadPolygon = ({ xMin, xMax, yMin, yMax, style, zOffset = 0.01 }) => {
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

                {/* Border lines */}
                <Line
                    points={[p1, p2]}
                    color={style.lineColor}
                    lineWidth={style.lineWidth}
                    dashed={style.lineDashed}
                    dashSize={style.lineDashed ? 1 : undefined}
                    gapSize={style.lineDashed ? 0.5 : undefined}
                    transparent
                    opacity={style.lineOpacity}
                />
                <Line
                    points={[p2, p3]}
                    color={style.lineColor}
                    lineWidth={style.lineWidth}
                    dashed={style.lineDashed}
                    dashSize={style.lineDashed ? 1 : undefined}
                    gapSize={style.lineDashed ? 0.5 : undefined}
                    transparent
                    opacity={style.lineOpacity}
                />
                <Line
                    points={[p3, p4]}
                    color={style.lineColor}
                    lineWidth={style.lineWidth}
                    dashed={style.lineDashed}
                    dashSize={style.lineDashed ? 1 : undefined}
                    gapSize={style.lineDashed ? 0.5 : undefined}
                    transparent
                    opacity={style.lineOpacity}
                />
                <Line
                    points={[p4, p1]}
                    color={style.lineColor}
                    lineWidth={style.lineWidth}
                    dashed={style.lineDashed}
                    dashSize={style.lineDashed ? 1 : undefined}
                    gapSize={style.lineDashed ? 0.5 : undefined}
                    transparent
                    opacity={style.lineOpacity}
                />
            </group>
        )
    }

    // Default styles if not provided
    const rowStyle = styles.rightOfWay || { color: '#000000', width: 1, dashed: true, dashSize: 2, gapSize: 1, opacity: 1 }
    const roadStyle = styles.roadWidth || { lineColor: '#000000', lineWidth: 1, lineDashed: false, lineOpacity: 1, fillColor: '#666666', fillOpacity: 0.8 }

    return (
        <group>
            {/* Right-of-Way Lines (2 polylines) */}
            {/* Line 1: At Y=0 (lot front line / property line) - matches lot width */}
            <Line
                points={[[xMin, 0, 0.03], [xMax, 0, 0.03]]}
                color={rowStyle.color}
                lineWidth={rowStyle.width}
                dashed={rowStyle.dashed}
                dashScale={rowStyle.dashed ? 5 : 1}
                dashSize={rowStyle.dashSize}
                gapSize={rowStyle.gapSize}
                transparent
                opacity={rowStyle.opacity}
            />
            {/* Line 2: At Y=-rightOfWay (outer edge of right-of-way) */}
            <Line
                points={[[xMin, -rightOfWay, 0.03], [xMax, -rightOfWay, 0.03]]}
                color={rowStyle.color}
                lineWidth={rowStyle.width}
                dashed={rowStyle.dashed}
                dashScale={rowStyle.dashed ? 5 : 1}
                dashSize={rowStyle.dashSize}
                gapSize={rowStyle.gapSize}
                transparent
                opacity={rowStyle.opacity}
            />

            {/* Road Width Polygon (centered on centerline) */}
            <RoadPolygon
                xMin={xMin}
                xMax={xMax}
                yMin={roadBottomY}
                yMax={roadTopY}
                style={roadStyle}
                zOffset={0.01}
            />

            {/* Left Side Layers (toward outer right-of-way) */}
            {leftLayers.map((layer, index) => {
                // Use side-specific style key (e.g., 'leftParking' instead of 'parking')
                const styleKey = `left${layer.type.charAt(0).toUpperCase()}${layer.type.slice(1)}`
                const layerStyle = styles[styleKey] || styles[layer.type] || { lineColor: '#000000', lineWidth: 1, lineDashed: false, lineOpacity: 1, fillColor: '#888888', fillOpacity: 0.6 }
                return (
                    <RoadPolygon
                        key={`left-${layer.type}-${index}`}
                        xMin={xMin}
                        xMax={xMax}
                        yMin={layer.bottomY}
                        yMax={layer.topY}
                        style={layerStyle}
                        zOffset={0.01 + (index + 1) * 0.001}
                    />
                )
            })}

            {/* Right Side Layers (toward lot front) */}
            {rightLayers.map((layer, index) => {
                // Use side-specific style key (e.g., 'rightParking' instead of 'parking')
                const styleKey = `right${layer.type.charAt(0).toUpperCase()}${layer.type.slice(1)}`
                const layerStyle = styles[styleKey] || styles[layer.type] || { lineColor: '#000000', lineWidth: 1, lineDashed: false, lineOpacity: 1, fillColor: '#888888', fillOpacity: 0.6 }
                return (
                    <RoadPolygon
                        key={`right-${layer.type}-${index}`}
                        xMin={xMin}
                        xMax={xMax}
                        yMin={layer.bottomY}
                        yMax={layer.topY}
                        style={layerStyle}
                        zOffset={0.01 + (index + 1) * 0.001}
                    />
                )
            })}
        </group>
    )
}

export default RoadModule
