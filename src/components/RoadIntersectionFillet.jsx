import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { computeCornerZoneStack } from '../utils/intersectionGeometry'

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
 * @param {object} roadA - Road module data for one road
 *   Shape: { rightOfWay, roadWidth, leftParking, rightParking, leftVerge, rightVerge,
 *            leftSidewalk, rightSidewalk, leftTransitionZone, rightTransitionZone }
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
}) => {
    // Compute all zone arc geometries when inputs change
    const zones = useMemo(() => {
        if (!roadA || !roadB || !styles) return []
        return computeCornerZoneStack(roadA, roadB, corner, styles)
    }, [roadA, roadB, corner, styles])

    if (!visible || zones.length === 0) return null

    // Dampened line scale for border widths (matches RoadModule WYSIWYG convention)
    const dampenedLineScale = Math.pow(lineScale, 0.15)

    return (
        <group position={[cornerPosition[0], cornerPosition[1], 0]}>
            {zones.map((zone, index) => (
                <group key={`${zone.zoneType}-${index}`}>
                    {/* Filled arc shape */}
                    <mesh position={[0, 0, zone.zOffset]} receiveShadow>
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

                    {/* Outer arc border line */}
                    {zone.outerArcPoints.length >= 2 && (
                        <Line
                            points={zone.outerArcPoints}
                            color={zone.stroke.color}
                            lineWidth={zone.stroke.width * dampenedLineScale}
                            dashed={zone.stroke.dashed}
                            dashSize={zone.stroke.dashed ? 1 : undefined}
                            gapSize={zone.stroke.dashed ? 0.5 : undefined}
                            transparent
                            opacity={zone.stroke.opacity}
                        />
                    )}

                    {/* Inner arc border line (skip for innermost zone / road surface) */}
                    {zone.innerArcPoints.length >= 2 && (
                        <Line
                            points={zone.innerArcPoints}
                            color={zone.stroke.color}
                            lineWidth={zone.stroke.width * dampenedLineScale}
                            dashed={zone.stroke.dashed}
                            dashSize={zone.stroke.dashed ? 1 : undefined}
                            gapSize={zone.stroke.dashed ? 0.5 : undefined}
                            transparent
                            opacity={zone.stroke.opacity}
                        />
                    )}
                </group>
            ))}
        </group>
    )
}

export default RoadIntersectionFillet
