import * as THREE from 'three'

/**
 * Road Intersection Fillet Geometry
 *
 * Computes curved fillet arcs that fill the corner where two perpendicular
 * roads meet. Each zone layer (parking, verge, sidewalk, transition) gets
 * an annular arc sector that smoothly connects the two roads' zone edges.
 *
 * Coordinate system (canonical front orientation):
 * - Road runs along X axis, zones stack in -Y from lot edge at Y=0
 * - centerlineY = -rightOfWay / 2
 * - roadTopY = centerlineY + roadWidth / 2 (toward lot)
 * - roadBottomY = centerlineY - roadWidth / 2 (away from lot)
 * - Left-side zones stack from roadBottomY toward -rightOfWay
 * - Right-side zones stack from roadTopY toward 0
 */

/**
 * Returns the start and end angles for a quarter-circle arc at a given corner.
 *
 * The fillet is centered at the lot property corner. Arcs sweep through the
 * quadrant between the two roads (toward the intersection), curving the
 * toward-lot zones (verge, sidewalk, etc.) around the corner.
 *
 * Corner layout (top-down, lot block in center):
 *   rear-left  ---- rear road ---- rear-right
 *       |                              |
 *   left road      LOT BLOCK      right road
 *       |                              |
 *  front-left ---- front road --- front-right
 *
 * Arc angles (standard math convention, CCW from +X):
 *   front-left:  π     to 3π/2   (-X to -Y quadrant, between front & left roads)
 *   front-right: 3π/2  to 2π     (-Y to +X quadrant, between front & right roads)
 *   rear-left:   π/2   to π      (+Y to -X quadrant, between rear & left roads)
 *   rear-right:  0     to π/2    (+X to +Y quadrant, between rear & right roads)
 */
export function getCornerAngles(corner) {
    switch (corner) {
        case 'front-left':
            return { startAngle: Math.PI, endAngle: Math.PI * 1.5 }
        case 'front-right':
            return { startAngle: Math.PI * 1.5, endAngle: Math.PI * 2 }
        case 'rear-left':
            return { startAngle: Math.PI * 0.5, endAngle: Math.PI }
        case 'rear-right':
            return { startAngle: 0, endAngle: Math.PI * 0.5 }
        default:
            return { startAngle: Math.PI, endAngle: Math.PI * 1.5 }
    }
}

/**
 * Generates an array of [x, y, z] points along a circular arc.
 *
 * @param {number} radius - Arc radius from origin
 * @param {number} startAngle - Start angle in radians
 * @param {number} endAngle - End angle in radians
 * @param {number} segments - Number of line segments (more = smoother)
 * @param {number} z - Z coordinate for all points
 * @returns {Array<[number, number, number]>} Array of 3D points
 */
export function getArcPoints(radius, startAngle, endAngle, segments = 24, z = 0) {
    const points = []
    for (let i = 0; i <= segments; i++) {
        const t = i / segments
        const angle = startAngle + (endAngle - startAngle) * t
        points.push([
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
            z,
        ])
    }
    return points
}

/**
 * Creates a THREE.Shape for an annular arc sector (donut wedge).
 *
 * The shape traces:
 *   1. Arc along outer radius from startAngle to endAngle
 *   2. Arc back along inner radius from endAngle to startAngle
 *   3. Close path
 *
 * @param {number} innerRadius - Inner arc radius
 * @param {number} outerRadius - Outer arc radius
 * @param {number} startAngle - Start angle in radians
 * @param {number} endAngle - End angle in radians
 * @param {number} segments - Number of arc segments (more = smoother)
 * @returns {THREE.Shape} The arc sector shape
 */
export function computeZoneArc(innerRadius, outerRadius, startAngle, endAngle, segments = 24) {
    const shape = new THREE.Shape()

    // Start at inner radius, start angle
    shape.moveTo(
        Math.cos(startAngle) * innerRadius,
        Math.sin(startAngle) * innerRadius
    )

    // Line to outer radius at start angle
    shape.lineTo(
        Math.cos(startAngle) * outerRadius,
        Math.sin(startAngle) * outerRadius
    )

    // Arc along outer radius from startAngle to endAngle
    shape.absarc(0, 0, outerRadius, startAngle, endAngle, false)

    // Line to inner radius at end angle
    shape.lineTo(
        Math.cos(endAngle) * innerRadius,
        Math.sin(endAngle) * innerRadius
    )

    // Arc back along inner radius from endAngle to startAngle
    shape.absarc(0, 0, innerRadius, endAngle, startAngle, true)

    shape.closePath()
    return shape
}

/**
 * Computes the zone stack for one side of a road, returning zones ordered
 * from the road surface edge outward.
 *
 * In canonical front orientation:
 *   - Left side (away from lot): zones stack from roadBottomY toward -rightOfWay
 *   - Right side (toward lot): zones stack from roadTopY toward 0
 *
 * @param {object} road - Road module data
 * @param {'left' | 'right'} side - Which side of the road
 * @returns {Array<{ zoneType: string, styleKey: string, depth: number }>}
 */
function computeZoneStack(road, side) {
    const zones = []

    const zoneKeys = side === 'left'
        ? [
            { param: 'leftParking', styleKey: 'leftParking', zoneType: 'leftParking' },
            { param: 'leftVerge', styleKey: 'leftVerge', zoneType: 'leftVerge' },
            { param: 'leftSidewalk', styleKey: 'leftSidewalk', zoneType: 'leftSidewalk' },
            { param: 'leftTransitionZone', styleKey: 'leftTransitionZone', zoneType: 'leftTransitionZone' },
        ]
        : [
            { param: 'rightParking', styleKey: 'rightParking', zoneType: 'rightParking' },
            { param: 'rightVerge', styleKey: 'rightVerge', zoneType: 'rightVerge' },
            { param: 'rightSidewalk', styleKey: 'rightSidewalk', zoneType: 'rightSidewalk' },
            { param: 'rightTransitionZone', styleKey: 'rightTransitionZone', zoneType: 'rightTransitionZone' },
        ]

    for (const { param, styleKey, zoneType } of zoneKeys) {
        const depth = road[param]
        if (depth != null && depth > 0) {
            zones.push({ zoneType, styleKey, depth })
        }
    }

    return zones
}

/**
 * Computes the full fillet zone stack for a corner intersection.
 *
 * Given two perpendicular roads meeting at a corner, computes the arc
 * geometry for each zone layer that needs to curve around the corner.
 * Returns an array of zone objects ready for rendering.
 *
 * @param {object} roadA - First road module data (e.g., front road)
 *   Shape: { rightOfWay, roadWidth, leftParking, rightParking, leftVerge, rightVerge,
 *            leftSidewalk, rightSidewalk, leftTransitionZone, rightTransitionZone }
 * @param {object} roadB - Second road module data (e.g., left road)
 * @param {string} corner - 'front-left' | 'front-right' | 'rear-left' | 'rear-right'
 * @param {object} styles - roadModuleStyles object with zone fill/stroke colors
 *   Shape: { leftParking: { fillColor, fillOpacity, lineColor, lineWidth, lineDashed, lineOpacity }, ... }
 * @param {'left' | 'right'} sideA - Which side of roadA to use ('right' = toward lot, 'left' = away from lot)
 * @param {'left' | 'right'} sideB - Which side of roadB to use
 * @returns {Array<{
 *   zoneType: string,
 *   shape: THREE.Shape,
 *   fill: { color: string, opacity: number },
 *   stroke: { color: string, width: number, dashed: boolean, opacity: number },
 *   outerArcPoints: Array<[number, number, number]>,
 *   innerArcPoints: Array<[number, number, number]>,
 *   zOffset: number,
 * }>}
 */
export function computeCornerZoneStack(roadA, roadB, corner, styles, sideA = 'right', sideB = 'right') {
    const { startAngle, endAngle } = getCornerAngles(corner)

    // Use the specified side for each road. Fall back to the opposite side
    // if the requested side has no zones configured.
    let innerZonesA = computeZoneStack(roadA, sideA)
    if (innerZonesA.length === 0) innerZonesA = computeZoneStack(roadA, sideA === 'right' ? 'left' : 'right')

    let innerZonesB = computeZoneStack(roadB, sideB)
    if (innerZonesB.length === 0) innerZonesB = computeZoneStack(roadB, sideB === 'right' ? 'left' : 'right')

    const segments = 24
    const baseZOffset = 0.05
    const result = []

    // Zone type definitions for merging — ordered from lot corner outward
    // (transition closest to lot, parking closest to road surface)
    const allZoneTypes = [
        { type: 'TransitionZone', leftKey: 'leftTransitionZone', rightKey: 'rightTransitionZone' },
        { type: 'Sidewalk', leftKey: 'leftSidewalk', rightKey: 'rightSidewalk' },
        { type: 'Verge', leftKey: 'leftVerge', rightKey: 'rightVerge' },
        { type: 'Parking', leftKey: 'leftParking', rightKey: 'rightParking' },
    ]

    // Merge toward-lot zones from both roads, averaging depths when both have the same zone
    const merged = []
    for (const { type, leftKey, rightKey } of allZoneTypes) {
        const zA = innerZonesA.find(z => z.zoneType === leftKey || z.zoneType === rightKey)
        const zB = innerZonesB.find(z => z.zoneType === leftKey || z.zoneType === rightKey)
        if (!zA && !zB) continue
        let depth, styleKey
        if (zA && zB) {
            depth = (zA.depth + zB.depth) / 2
            styleKey = zA.styleKey
        } else if (zA) {
            depth = zA.depth
            styleKey = zA.styleKey
        } else {
            depth = zB.depth
            styleKey = zB.styleKey
        }
        if (depth <= 0) continue
        merged.push({ type, depth, styleKey })
    }

    // Stack toward-lot zones from radius 0 outward, from lot corner toward
    // road surface (transition → sidewalk → verge → parking).
    let currentRadius = 0
    for (const zone of merged) {
        const innerRadius = currentRadius
        const outerRadius = currentRadius + zone.depth
        const shape = computeZoneArc(innerRadius, outerRadius, startAngle, endAngle, segments)
        const zoneStyle = styles[zone.styleKey] || {
            lineColor: '#000000', lineWidth: 1, lineDashed: false, lineOpacity: 1,
            fillColor: '#888888', fillOpacity: 0.6,
        }
        const zOffset = baseZOffset + result.length * 0.001
        result.push({
            zoneType: zone.type,
            shape,
            fill: { color: zoneStyle.fillColor, opacity: zoneStyle.fillOpacity },
            stroke: {
                color: zoneStyle.lineColor,
                width: zoneStyle.lineWidth,
                dashed: zoneStyle.lineDashed,
                opacity: zoneStyle.lineOpacity,
            },
            outerArcPoints: getArcPoints(outerRadius, startAngle, endAngle, segments, zOffset + 0.005),
            innerArcPoints: innerRadius > 0
                ? getArcPoints(innerRadius, startAngle, endAngle, segments, zOffset + 0.005)
                : [],
            zOffset,
        })
        currentRadius = outerRadius
    }

    return result
}
