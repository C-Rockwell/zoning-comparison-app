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
 * Corner layout (top-down, lot block in center):
 *   rear-left  ---- rear road ---- rear-right
 *       |                              |
 *   left road      LOT BLOCK      right road
 *       |                              |
 *  front-left ---- front road --- front-right
 *
 * Arc angles (standard math convention, CCW from +X):
 *   front-left:  π   to 3π/2   (-X to -Y quadrant)
 *   front-right: 3π/2 to 2π    (-Y to +X quadrant)
 *   rear-left:   π/2 to π      (+Y to -X quadrant)
 *   rear-right:  0   to π/2    (+X to +Y quadrant)
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
            return { startAngle: 0, endAngle: Math.PI * 0.5 }
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
 * Determines which side of each road faces the corner.
 *
 * At each corner, the fillet connects zones from the "away from lot" side
 * of both roads — the side that faces outward into the corner area.
 *
 *   front-left:  front road left side  + left road left side
 *   front-right: front road left side  + right road right side
 *   rear-left:   rear road right side  + left road right side
 *   rear-right:  rear road left side   + right road left side
 *
 * Why these sides?
 * - Front road: left = -Y (away from lot). The front-left and front-right
 *   corners are both on the away-from-lot side of the front road.
 * - Left road (runs along Y, lot on +X side): at front-left corner the
 *   road's left side (away from lot, -X direction) faces the corner.
 * - Right road (runs along Y, lot on -X side): at front-right corner the
 *   road's right side (away from lot, +X direction) faces the corner.
 * - Rear road: right = +Y (away from lot when rear is flipped).
 *
 * @param {string} corner
 * @returns {{ sideA: 'left' | 'right', sideB: 'left' | 'right' }}
 */
function getCornerSides(corner) {
    switch (corner) {
        case 'front-left':
            return { sideA: 'left', sideB: 'left' }
        case 'front-right':
            return { sideA: 'left', sideB: 'right' }
        case 'rear-left':
            return { sideA: 'right', sideB: 'right' }
        case 'rear-right':
            return { sideA: 'left', sideB: 'left' }
        default:
            return { sideA: 'left', sideB: 'left' }
    }
}

/**
 * Computes the base radius for the innermost fillet zone at a corner.
 *
 * This is the distance from the corner point to the road surface edge
 * on the side that faces the corner. Both roads contribute a base radius;
 * we use the larger of the two so the fillet clears both road surfaces.
 *
 * For a road in canonical front orientation:
 *   - Left side base = |roadBottomY| = rightOfWay/2 + roadWidth/2
 *   - Right side base = |roadTopY distance from lot edge| ... but actually
 *     the right side base = rightOfWay/2 - roadWidth/2 (from Y=0 down to roadTopY)
 *
 * Wait — the base radius is measured from the CORNER POINT. The corner point
 * is where two property lines meet. From the corner, the road surface edge
 * distance depends on the side:
 *   - Left side (away from lot): distance = rightOfWay/2 + roadWidth/2
 *     (from Y=0, the road surface bottom edge is at -(ROW/2 + rw/2))
 *   - Right side (toward lot): distance = rightOfWay/2 - roadWidth/2
 *     (from Y=0, the road surface top edge is at -(ROW/2 - rw/2))
 *
 * @param {object} road - Road module data
 * @param {'left' | 'right'} side - Which side of the road
 * @returns {number} Base radius from corner to road surface edge
 */
function getBaseRadius(road, side) {
    const halfROW = road.rightOfWay / 2
    const halfRoad = road.roadWidth / 2
    if (side === 'left') {
        // Away from lot: road bottom edge distance from property line (Y=0)
        return halfROW + halfRoad
    } else {
        // Toward lot: road top edge distance from property line (Y=0)
        return halfROW - halfRoad
    }
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
export function computeCornerZoneStack(roadA, roadB, corner, styles) {
    const { startAngle, endAngle } = getCornerAngles(corner)
    const { sideA, sideB } = getCornerSides(corner)

    // Get zone stacks from each road's corner-facing side
    const zonesA = computeZoneStack(roadA, sideA)
    const zonesB = computeZoneStack(roadB, sideB)

    // Base radius: the road surface edge distance from the corner point.
    // Use the larger of the two roads so the fillet clears both road surfaces.
    const baseRadiusA = getBaseRadius(roadA, sideA)
    const baseRadiusB = getBaseRadius(roadB, sideB)
    const baseRadius = Math.max(baseRadiusA, baseRadiusB)

    // Merge zone stacks: iterate through zone layers, using roadA's zone depths
    // as the primary source. If roadA doesn't have a zone but roadB does, use
    // roadB's depth. If both have it, average the depths for a smooth transition.
    const allZoneTypes = [
        { type: 'Parking', leftKey: 'leftParking', rightKey: 'rightParking' },
        { type: 'Verge', leftKey: 'leftVerge', rightKey: 'rightVerge' },
        { type: 'Sidewalk', leftKey: 'leftSidewalk', rightKey: 'rightSidewalk' },
        { type: 'TransitionZone', leftKey: 'leftTransitionZone', rightKey: 'rightTransitionZone' },
    ]

    const result = []
    let currentRadius = baseRadius
    const segments = 24
    const baseZOffset = 0.015

    // Also add a road surface arc to fill the corner between the two overlapping
    // road surface rectangles. This covers the curved gap.
    const roadSurfaceRadius = baseRadius
    if (roadSurfaceRadius > 0) {
        const roadSurfaceShape = computeZoneArc(0, roadSurfaceRadius, startAngle, endAngle, segments)
        const roadStyle = styles.roadWidth || {
            lineColor: '#000000', lineWidth: 1, lineDashed: false, lineOpacity: 1,
            fillColor: '#666666', fillOpacity: 0.8,
        }
        result.push({
            zoneType: 'roadSurface',
            shape: roadSurfaceShape,
            fill: {
                color: roadStyle.fillColor,
                opacity: roadStyle.fillOpacity,
            },
            stroke: {
                color: roadStyle.lineColor,
                width: roadStyle.lineWidth,
                dashed: roadStyle.lineDashed,
                opacity: roadStyle.lineOpacity,
            },
            outerArcPoints: getArcPoints(roadSurfaceRadius, startAngle, endAngle, segments, baseZOffset),
            innerArcPoints: [],
            zOffset: baseZOffset,
        })
    }

    for (let i = 0; i < allZoneTypes.length; i++) {
        const { type, leftKey, rightKey } = allZoneTypes[i]

        // Find this zone type in each road's stack
        const zoneA = zonesA.find(z => z.zoneType === leftKey || z.zoneType === rightKey)
        const zoneB = zonesB.find(z => z.zoneType === leftKey || z.zoneType === rightKey)

        if (!zoneA && !zoneB) continue

        // Determine the depth for this zone layer
        let depth
        if (zoneA && zoneB) {
            depth = (zoneA.depth + zoneB.depth) / 2
        } else if (zoneA) {
            depth = zoneA.depth
        } else {
            depth = zoneB.depth
        }

        if (depth <= 0) continue

        const innerRadius = currentRadius
        const outerRadius = currentRadius + depth

        // Create the arc shape
        const shape = computeZoneArc(innerRadius, outerRadius, startAngle, endAngle, segments)

        // Resolve style — prefer the zone found in roadA's side, fall back to roadB
        const styleKey = zoneA ? zoneA.styleKey : zoneB.styleKey
        const zoneStyle = styles[styleKey] || {
            lineColor: '#000000', lineWidth: 1, lineDashed: false, lineOpacity: 1,
            fillColor: '#888888', fillOpacity: 0.6,
        }

        const zOffset = baseZOffset + (result.length) * 0.001

        result.push({
            zoneType: `${sideA}${type}`,
            shape,
            fill: {
                color: zoneStyle.fillColor,
                opacity: zoneStyle.fillOpacity,
            },
            stroke: {
                color: zoneStyle.lineColor,
                width: zoneStyle.lineWidth,
                dashed: zoneStyle.lineDashed,
                opacity: zoneStyle.lineOpacity,
            },
            outerArcPoints: getArcPoints(outerRadius, startAngle, endAngle, segments, zOffset),
            innerArcPoints: getArcPoints(innerRadius, startAngle, endAngle, segments, zOffset),
            zOffset,
        })

        currentRadius = outerRadius
    }

    return result
}
