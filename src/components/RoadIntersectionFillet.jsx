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
            {zones.map((zone, index) => (
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

                    {/* Outer arc border line — outermost zone uses roadWidth style */}
                    {zone.outerArcPoints.length >= 2 && (() => {
                        const isOutermost = index === zones.length - 1
                        const strokeColor = (isOutermost && roadWidthStyle?.lineColor) || zone.stroke.color
                        const strokeWidth = (isOutermost && roadWidthStyle?.lineWidth) || zone.stroke.width
                        const strokeDashed = isOutermost ? (roadWidthStyle?.lineDashed ?? zone.stroke.dashed) : zone.stroke.dashed
                        const strokeOpacity = (isOutermost && roadWidthStyle?.lineOpacity != null) ? roadWidthStyle.lineOpacity : zone.stroke.opacity
                        // Sub-sample arc points for outermost line to reduce Line2 miter thickening
                        const arcPoints = isOutermost
                            ? zone.outerArcPoints.filter((_, i) => i % 2 === 0 || i === zone.outerArcPoints.length - 1)
                            : zone.outerArcPoints
                        return (
                            <Line
                                points={arcPoints}
                                color={strokeColor}
                                lineWidth={strokeWidth * lineScale}
                                dashed={strokeDashed}
                                dashSize={strokeDashed ? 1 : undefined}
                                gapSize={strokeDashed ? 0.5 : undefined}
                                transparent
                                opacity={strokeOpacity}
                                renderOrder={3}
                            />
                        )
                    })()}

                    {/* Inner arc border line (skip for innermost zone / road surface) */}
                    {zone.innerArcPoints.length >= 2 && (
                        <Line
                            points={zone.innerArcPoints}
                            color={zone.stroke.color}
                            lineWidth={zone.stroke.width * lineScale}
                            dashed={zone.stroke.dashed}
                            dashSize={zone.stroke.dashed ? 1 : undefined}
                            gapSize={zone.stroke.dashed ? 0.5 : undefined}
                            transparent
                            opacity={zone.stroke.opacity}
                            renderOrder={3}
                        />
                    )}
                </group>
            ))}
        </group>
    )
}

export default RoadIntersectionFillet
