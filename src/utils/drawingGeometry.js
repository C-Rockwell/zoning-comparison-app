import * as THREE from 'three'

// --- Outline vertex generators (return [[x,y,0], ...] closed loops for drei <Line>) ---

/**
 * Generate closed circle outline points.
 * Returns segments+1 entries (last === first for closed loop).
 */
export function generateCirclePoints(cx, cy, radius, segments = 64) {
    const pts = []
    for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * Math.PI * 2
        pts.push([cx + radius * Math.cos(t), cy + radius * Math.sin(t), 0])
    }
    return pts
}

/**
 * Generate closed ellipse outline points.
 */
export function generateEllipsePoints(cx, cy, rx, ry, segments = 64) {
    const pts = []
    for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * Math.PI * 2
        pts.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t), 0])
    }
    return pts
}

/**
 * Generate closed regular polygon outline points.
 * First vertex at top (angle offset -PI/2).
 */
export function generateRegularPolygonPoints(cx, cy, radius, sides) {
    const pts = []
    for (let i = 0; i <= sides; i++) {
        const angle = (i / sides) * Math.PI * 2 - Math.PI / 2
        pts.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle), 0])
    }
    return pts
}

/**
 * Generate closed star outline points.
 * Alternates between outerRadius and innerRadius.
 * First point at top (angle offset -PI/2).
 */
export function generateStarPoints(cx, cy, outerRadius, innerRadius, numPoints) {
    const totalVerts = numPoints * 2
    const pts = []
    for (let i = 0; i <= totalVerts; i++) {
        const angle = (i / totalVerts) * Math.PI * 2 - Math.PI / 2
        const r = (i % 2 === 0) ? outerRadius : innerRadius
        pts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle), 0])
    }
    return pts
}

/**
 * Generate closed rounded rectangle outline points.
 * cornerRadius is clamped to half the smaller dimension.
 * Handles negative w/h by normalizing to min/max.
 */
export function generateRoundedRectPoints(ox, oy, w, h, cornerRadius, segments = 8) {
    const absW = Math.abs(w), absH = Math.abs(h)
    const cr = Math.min(cornerRadius, absW / 2, absH / 2)
    const minX = Math.min(ox, ox + w), maxX = Math.max(ox, ox + w)
    const minY = Math.min(oy, oy + h), maxY = Math.max(oy, oy + h)

    if (cr <= 0) {
        return [
            [minX, minY, 0], [maxX, minY, 0], [maxX, maxY, 0], [minX, maxY, 0], [minX, minY, 0]
        ]
    }

    const pts = []
    // Bottom-right corner arc (center at maxX-cr, minY+cr)
    for (let i = 0; i <= segments; i++) {
        const t = -Math.PI / 2 + (Math.PI / 2) * (i / segments)
        pts.push([maxX - cr + cr * Math.cos(t), minY + cr + cr * Math.sin(t), 0])
    }
    // Top-right corner arc (center at maxX-cr, maxY-cr)
    for (let i = 0; i <= segments; i++) {
        const t = 0 + (Math.PI / 2) * (i / segments)
        pts.push([maxX - cr + cr * Math.cos(t), maxY - cr + cr * Math.sin(t), 0])
    }
    // Top-left corner arc (center at minX+cr, maxY-cr)
    for (let i = 0; i <= segments; i++) {
        const t = Math.PI / 2 + (Math.PI / 2) * (i / segments)
        pts.push([minX + cr + cr * Math.cos(t), maxY - cr + cr * Math.sin(t), 0])
    }
    // Bottom-left corner arc (center at minX+cr, minY+cr)
    for (let i = 0; i <= segments; i++) {
        const t = Math.PI + (Math.PI / 2) * (i / segments)
        pts.push([minX + cr + cr * Math.cos(t), minY + cr + cr * Math.sin(t), 0])
    }
    // Close
    pts.push([...pts[0]])
    return pts
}

// --- THREE.Shape builders (for fill rendering) ---

/**
 * Build a THREE.Shape for a rounded rectangle.
 */
export function createRoundedRectShape(ox, oy, w, h, cornerRadius) {
    const absW = Math.abs(w), absH = Math.abs(h)
    const cr = Math.min(cornerRadius, absW / 2, absH / 2)
    const minX = Math.min(ox, ox + w), maxX = Math.max(ox, ox + w)
    const minY = Math.min(oy, oy + h), maxY = Math.max(oy, oy + h)

    const shape = new THREE.Shape()
    if (cr <= 0) {
        shape.moveTo(minX, minY)
        shape.lineTo(maxX, minY)
        shape.lineTo(maxX, maxY)
        shape.lineTo(minX, maxY)
        shape.closePath()
        return shape
    }

    shape.moveTo(minX + cr, minY)
    shape.lineTo(maxX - cr, minY)
    shape.absarc(maxX - cr, minY + cr, cr, -Math.PI / 2, 0, false)
    shape.lineTo(maxX, maxY - cr)
    shape.absarc(maxX - cr, maxY - cr, cr, 0, Math.PI / 2, false)
    shape.lineTo(minX + cr, maxY)
    shape.absarc(minX + cr, maxY - cr, cr, Math.PI / 2, Math.PI, false)
    shape.lineTo(minX, minY + cr)
    shape.absarc(minX + cr, minY + cr, cr, Math.PI, Math.PI * 1.5, false)
    shape.closePath()
    return shape
}

// --- Flat vertex generators (for hit-testing, no z coord) ---

/**
 * Compute star vertices as flat [x,y] pairs.
 */
export function computeStarVertices(cx, cy, outerR, innerR, numPoints) {
    const totalVerts = numPoints * 2
    const verts = []
    for (let i = 0; i < totalVerts; i++) {
        const angle = (i / totalVerts) * Math.PI * 2 - Math.PI / 2
        const r = (i % 2 === 0) ? outerR : innerR
        verts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)])
    }
    return verts
}

/**
 * Compute regular polygon vertices as flat [x,y] pairs.
 */
export function computeRegularPolygonVertices(cx, cy, radius, sides) {
    const verts = []
    for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2 - Math.PI / 2
        verts.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)])
    }
    return verts
}

/**
 * Point-in-polygon test using ray-casting algorithm.
 */
export function pointInPolygon(px, py, vertices) {
    let inside = false
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        const [xi, yi] = vertices[i]
        const [xj, yj] = vertices[j]
        if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) {
            inside = !inside
        }
    }
    return inside
}
