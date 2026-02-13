import * as THREE from 'three'

// ============================================
// Roof Geometry Utilities
// ============================================

/**
 * Calculate roof pitch from rise and half-span
 */
export const calculateRoofPitch = (baseZ, ridgeZ, halfSpan) => {
    const rise = ridgeZ - baseZ
    if (halfSpan <= 0) return { angleDeg: 90, pitchRatio: '∞:12', rise }
    const angleRad = Math.atan2(rise, halfSpan)
    const angleDeg = angleRad * (180 / Math.PI)
    const pitchRatio = `${(rise / halfSpan * 12).toFixed(1)}:12`
    return { angleDeg, angleRad, pitchRatio, rise }
}

/**
 * Get bounding box and centroid from 2D vertices
 */
const getVertexBounds = (vertices) => {
    const xs = vertices.map(v => v.x)
    const ys = vertices.map(v => v.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    return {
        minX, maxX, minY, maxY,
        width: maxX - minX,
        depth: maxY - minY,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
    }
}

/**
 * Triangulate a simple polygon (ear-clipping for convex/mildly-concave polygons)
 * Returns array of triangle index triples
 */
const triangulatePolygon = (vertices) => {
    if (vertices.length < 3) return []
    if (vertices.length === 3) return [[0, 1, 2]]

    // Simple fan triangulation (works well for convex polygons)
    const triangles = []
    for (let i = 1; i < vertices.length - 1; i++) {
        triangles.push([0, i, i + 1])
    }
    return triangles
}

/**
 * Build a BufferGeometry from position array and index array
 */
const buildGeometry = (positions, indices, computeNormals = true) => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setIndex(indices)
    if (computeNormals) geometry.computeVertexNormals()
    return geometry
}

/**
 * Generate SHED roof geometry
 * Linear slope from low side to high side
 */
export const generateShedRoof = (vertices, baseZ, ridgeZ, shedDirection) => {
    if (ridgeZ <= baseZ || !vertices || vertices.length < 3) return null

    const bounds = getVertexBounds(vertices)
    const rise = ridgeZ - baseZ
    const n = vertices.length

    // Determine slope axis and direction
    let getT // function to get normalized position along slope (0 = low, 1 = high)
    switch (shedDirection) {
        case '+x': getT = (v) => (v.x - bounds.minX) / bounds.width; break
        case '-x': getT = (v) => (bounds.maxX - v.x) / bounds.width; break
        case '+y': getT = (v) => (v.y - bounds.minY) / bounds.depth; break
        case '-y':
        default:   getT = (v) => (bounds.maxY - v.y) / bounds.depth; break
    }

    // Top vertices (sloped) and bottom vertices (at baseZ)
    const positions = []
    const indices = []

    // Top face vertices (0 to n-1)
    for (let i = 0; i < n; i++) {
        const t = getT(vertices[i])
        positions.push(vertices[i].x, vertices[i].y, baseZ + t * rise)
    }

    // Bottom face vertices (n to 2n-1)
    for (let i = 0; i < n; i++) {
        positions.push(vertices[i].x, vertices[i].y, baseZ)
    }

    // Top face triangles
    const topTriangles = triangulatePolygon(vertices)
    for (const [a, b, c] of topTriangles) {
        indices.push(a, b, c)
    }

    // Bottom face triangles (reversed winding)
    for (const [a, b, c] of topTriangles) {
        indices.push(n + a, n + c, n + b)
    }

    // Side walls connecting top and bottom
    for (let i = 0; i < n; i++) {
        const next = (i + 1) % n
        // Two triangles per side quad
        indices.push(i, next, n + next)
        indices.push(i, n + next, n + i)
    }

    return buildGeometry(positions, indices)
}

/**
 * Generate GABLED roof geometry
 * Ridge line runs through centroid along ridgeDirection
 */
export const generateGabledRoof = (vertices, baseZ, ridgeZ, ridgeDirection) => {
    if (ridgeZ <= baseZ || !vertices || vertices.length < 3) return null

    const bounds = getVertexBounds(vertices)
    const rise = ridgeZ - baseZ
    const n = vertices.length

    // Perpendicular distance from ridge determines height
    let getPerpDistance, maxPerpDistance
    if (ridgeDirection === 'x') {
        // Ridge runs along X axis through center
        getPerpDistance = (v) => Math.abs(v.y - bounds.centerY)
        maxPerpDistance = bounds.depth / 2
    } else {
        // Ridge runs along Y axis through center
        getPerpDistance = (v) => Math.abs(v.x - bounds.centerX)
        maxPerpDistance = bounds.width / 2
    }

    if (maxPerpDistance <= 0) return null

    const positions = []
    const indices = []

    // Top face vertices with gable Z (0 to n-1)
    for (let i = 0; i < n; i++) {
        const d = getPerpDistance(vertices[i])
        const z = baseZ + (1 - d / maxPerpDistance) * rise
        positions.push(vertices[i].x, vertices[i].y, z)
    }

    // Bottom face vertices (n to 2n-1)
    for (let i = 0; i < n; i++) {
        positions.push(vertices[i].x, vertices[i].y, baseZ)
    }

    // Top face triangles
    const topTriangles = triangulatePolygon(vertices)
    for (const [a, b, c] of topTriangles) {
        indices.push(a, b, c)
    }

    // Bottom face triangles (reversed winding)
    for (const [a, b, c] of topTriangles) {
        indices.push(n + a, n + c, n + b)
    }

    // Side walls
    for (let i = 0; i < n; i++) {
        const next = (i + 1) % n
        indices.push(i, next, n + next)
        indices.push(i, n + next, n + i)
    }

    return buildGeometry(positions, indices)
}

/**
 * Generate HIPPED roof geometry
 * All sides slope inward — simplified using min-distance-to-edge approach
 */
export const generateHippedRoof = (vertices, baseZ, ridgeZ) => {
    if (ridgeZ <= baseZ || !vertices || vertices.length < 3) return null

    const bounds = getVertexBounds(vertices)
    const rise = ridgeZ - baseZ
    const n = vertices.length

    // For each vertex, calculate the minimum distance to any edge of the polygon
    // This creates a hip-like roof where all sides slope inward
    const getMinEdgeDistance = (px, py) => {
        let minDist = Infinity
        for (let i = 0; i < n; i++) {
            const v1 = vertices[i]
            const v2 = vertices[(i + 1) % n]
            // Distance from point to line segment
            const dx = v2.x - v1.x
            const dy = v2.y - v1.y
            const lenSq = dx * dx + dy * dy
            if (lenSq === 0) continue
            let t = ((px - v1.x) * dx + (py - v1.y) * dy) / lenSq
            t = Math.max(0, Math.min(1, t))
            const closestX = v1.x + t * dx
            const closestY = v1.y + t * dy
            const dist = Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2)
            minDist = Math.min(minDist, dist)
        }
        return minDist
    }

    // Find maximum interior distance (for the ridge)
    // Sample the centroid and a grid to find the true max
    const maxDist = getMinEdgeDistance(bounds.centerX, bounds.centerY)
    if (maxDist <= 0) return null

    const positions = []
    const indices = []

    // Top face vertices with hipped Z (0 to n-1)
    for (let i = 0; i < n; i++) {
        // Edge vertices have distance 0, so they stay at baseZ
        // Interior points rise proportionally
        const d = getMinEdgeDistance(vertices[i].x, vertices[i].y)
        const z = baseZ + (d / maxDist) * rise
        positions.push(vertices[i].x, vertices[i].y, z)
    }

    // Add ridge point at centroid (vertex n)
    positions.push(bounds.centerX, bounds.centerY, ridgeZ)

    // Bottom face vertices (n+1 to n+1+n-1)
    const bottomStart = n + 1
    for (let i = 0; i < n; i++) {
        positions.push(vertices[i].x, vertices[i].y, baseZ)
    }

    // Top face: triangles from each edge to the ridge point
    for (let i = 0; i < n; i++) {
        const next = (i + 1) % n
        indices.push(i, next, n) // n is the ridge point
    }

    // Bottom face triangles (reversed winding)
    const bottomTriangles = triangulatePolygon(vertices)
    for (const [a, b, c] of bottomTriangles) {
        indices.push(bottomStart + a, bottomStart + c, bottomStart + b)
    }

    // Side walls from bottom edge to top edge
    for (let i = 0; i < n; i++) {
        const next = (i + 1) % n
        indices.push(i, next, bottomStart + next)
        indices.push(i, bottomStart + next, bottomStart + i)
    }

    return buildGeometry(positions, indices)
}

/**
 * Generate roof geometry based on type
 * Returns null for flat roofs
 */
export const generateRoofGeometry = (vertices, roofType, baseZ, ridgeZ, options = {}) => {
    const { ridgeDirection = 'x', shedDirection = '+y' } = options

    switch (roofType) {
        case 'shed':
            return generateShedRoof(vertices, baseZ, ridgeZ, shedDirection)
        case 'gabled':
            return generateGabledRoof(vertices, baseZ, ridgeZ, ridgeDirection)
        case 'hipped':
            return generateHippedRoof(vertices, baseZ, ridgeZ, ridgeDirection)
        case 'flat':
        default:
            return null
    }
}
