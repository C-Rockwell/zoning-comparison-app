import { useMemo } from 'react'
import * as THREE from 'three'
import { Line } from '@react-three/drei'
import { computeCornerZoneStack } from '../utils/intersectionGeometry'

/**
 * Converts a polyline (array of points) into segment pairs for <Line segments>.
 * LineSegments2 renders each pair as an independent segment with no miter joins,
 * ensuring arc lines render at the same visual weight as straight road edges.
 *
 * Input:  [p0, p1, p2, p3, ...]  (N points)
 * Output: [p0, p1, p1, p2, p2, p3, ...]  (2*(N-1) points, N-1 segment pairs)
 */
function toSegmentPairs(points) {
    const pairs = []
    for (let i = 0; i < points.length - 1; i++) {
        pairs.push(points[i], points[i + 1])
    }
    return pairs
}

/**
 * RoadIntersectionFillet Component
 *
 * Renders curved fillet geometry at the corner where two perpendicular roads
 * meet. Each zone layer (parking, verge, sidewalk, transition) is rendered as
 * an annular arc sector that smoothly connects the two roads' zone edges.
 *
 * The fillet is positioned at the world-space corner point and rendered in the
 * XY plane (Z-up). Zone arcs are stacked with slight Z offsets to prevent
 * z-fighting, matching the RoadModule z-offset convention.
 *
 * Arc border lines use <Line segments> (LineSegments2) to render each arc segment
 * independently without miter joins, matching the visual weight of 2-point
 * straight edge lines in RoadModule.jsx.
 *
 * @param {object} roadA - Road module data for one road
 * @param {object} roadB - Road module data for the perpendicular road
 * @param {string} corner - 'front-left' | 'front-right' | 'rear-left' | 'rear-right'
 * @param {[number, number]} cornerPosition - [x, y] world position of the corner point
 * @param {object} styles - roadModuleStyles object with zone fill/stroke colors
 * @param {number} lineScale - Line width multiplier for WYSIWYG export scaling
 * @param {boolean} visible - Whether to render the fillet (default true)
 */
const RoadIntersectionFillet = ({
    roadA,
    roadB,
    corner,
    cornerPosition,
    styles,
    lineScale = 1,
    visible = true,
    sideA = 'right',
    sideB = 'right',
    roadWidthStyle,
}) => {
    // Compute all zone arc geometries when inputs change
    const zones = useMemo(() => {
        if (!roadA || !roadB || !styles) return []
        return computeCornerZoneStack(roadA, roadB, corner, styles, sideA, sideB)
    }, [roadA, roadB, corner, styles, sideA, sideB])

    if (!visible || zones.length === 0) return null

    return (
        <group position={[cornerPosition[0], cornerPosition[1], 0]}>
            {zones.map((zone, index) => {
                const isOutermost = index === zones.length - 1
                const strokeColor = (isOutermost && roadWidthStyle?.lineColor) || zone.stroke.color
                const strokeDashed = isOutermost ? (roadWidthStyle?.lineDashed ?? zone.stroke.dashed) : zone.stroke.dashed
                const strokeOpacity = (isOutermost && roadWidthStyle?.lineOpacity != null) ? roadWidthStyle.lineOpacity : zone.stroke.opacity
                const strokeWidth = ((isOutermost && roadWidthStyle?.lineWidth) || zone.stroke.width || 1) * lineScale

                return (
                    <group key={`${zone.zoneType}-${index}`}>
                        {/* Filled arc shape */}
                        <mesh position={[0, 0, zone.zOffset]} receiveShadow renderOrder={2}>
                            <shapeGeometry args={[zone.shape]} />
                            <meshStandardMaterial
                                color={zone.fill.color}
                                opacity={zone.fill.opacity}
                                transparent={zone.fill.opacity < 1}
                                side={THREE.DoubleSide}
                                depthWrite={zone.fill.opacity >= 0.95}
                                roughness={1}
                                metalness={0}
                            />
                        </mesh>

                        {/* Outer arc border line — segments mode for consistent weight */}
                        {zone.outerArcPoints.length >= 2 && (
                            <Line
                                points={toSegmentPairs(zone.outerArcPoints)}
                                segments
                                color={strokeColor}
                                lineWidth={strokeWidth}
                                opacity={strokeOpacity}
                                transparent={strokeOpacity < 1}
                                renderOrder={3}
                            />
                        )}

                        {/* Inner arc border line */}
                        {zone.innerArcPoints.length >= 2 && (
                            <Line
                                points={toSegmentPairs(zone.innerArcPoints)}
                                segments
                                color={zone.stroke.color}
                                lineWidth={(zone.stroke.width || 1) * lineScale}
                                opacity={zone.stroke.opacity}
                                transparent={zone.stroke.opacity < 1}
                                renderOrder={3}
                            />
                        )}
                    </group>
                )
            })}
        </group>
    )
}

export default RoadIntersectionFillet
