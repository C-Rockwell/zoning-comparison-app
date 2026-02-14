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
 * Ridge line runs through centroid along ridgeDirection.
 * Adds explicit ridge vertices at ridgeZ and builds slope/gable faces.
 */
export const generateGabledRoof = (vertices, baseZ, ridgeZ, ridgeDirection) => {
    if (ridgeZ <= baseZ || !vertices || vertices.length < 3) return null

    const bounds = getVertexBounds(vertices)
    const n = vertices.length

    // Ridge endpoints at the extremes of the ridge axis, through the centroid
    let ridgeStart, ridgeEnd, getSide
    if (ridgeDirection === 'x') {
        ridgeStart = { x: bounds.minX, y: bounds.centerY }
        ridgeEnd   = { x: bounds.maxX, y: bounds.centerY }
        getSide = (v) => v.y < bounds.centerY ? -1 : v.y > bounds.centerY ? 1 : 0
    } else {
        ridgeStart = { x: bounds.centerX, y: bounds.minY }
        ridgeEnd   = { x: bounds.centerX, y: bounds.maxY }
        getSide = (v) => v.x < bounds.centerX ? -1 : v.x > bounds.centerX ? 1 : 0
    }

    const positions = []
    const indices = []

    // Footprint vertices at baseZ (indices 0 to n-1)
    for (let i = 0; i < n; i++) {
        positions.push(vertices[i].x, vertices[i].y, baseZ)
    }

    // Ridge vertices at ridgeZ
    const rsi = n      // ridge start index
    const rei = n + 1  // ridge end index
    positions.push(ridgeStart.x, ridgeStart.y, ridgeZ)
    positions.push(ridgeEnd.x, ridgeEnd.y, ridgeZ)

    // Build roof faces: each footprint edge connects to the ridge line
    for (let i = 0; i < n; i++) {
        const next = (i + 1) % n
        const s1 = getSide(vertices[i])
        const s2 = getSide(vertices[next])

        if (s1 === s2 || s1 === 0 || s2 === 0) {
            // Both on same side of ridge → slope face (quad to both ridge points)
            indices.push(i, next, rei)
            indices.push(i, rei, rsi)
        } else {
            // Different sides → gable end (triangle to nearest ridge endpoint)
            const midCoord = ridgeDirection === 'x'
                ? (vertices[i].x + vertices[next].x) / 2
                : (vertices[i].y + vertices[next].y) / 2
            const ridgeMid = ridgeDirection === 'x'
                ? bounds.centerX
                : bounds.centerY
            indices.push(i, next, midCoord < ridgeMid ? rsi : rei)
        }
    }

    // Bottom face
    const bi = n + 2
    for (let i = 0; i < n; i++) {
        positions.push(vertices[i].x, vertices[i].y, baseZ)
    }
    const bottomTriangles = triangulatePolygon(vertices)
    for (const [a, b, c] of bottomTriangles) {
        indices.push(bi + a, bi + c, bi + b)
    }

    // Side walls connecting top edge to bottom edge
    for (let i = 0; i < n; i++) {
        const next = (i + 1) % n
        indices.push(i, next, bi + next)
        indices.push(i, bi + next, bi + i)
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
