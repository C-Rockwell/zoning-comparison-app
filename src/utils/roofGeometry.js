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
 * Build a BufferGeometry from position array and index array.
 * All generators must emit correctly-wound triangles (CCW from outside).
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

    // Top face vertices (0 to n-1) — sloped from baseZ to baseZ+rise
    for (let i = 0; i < n; i++) {
        const t = getT(vertices[i])
        positions.push(vertices[i].x, vertices[i].y, baseZ + t * rise)
    }

    // Bottom edge vertices at baseZ (n to 2n-1) — same XY, flat at building top
    for (let i = 0; i < n; i++) {
        positions.push(vertices[i].x, vertices[i].y, baseZ)
    }

    // Top face triangles (no bottom face — building box provides the floor)
    const topTriangles = triangulatePolygon(vertices)
    for (const [a, b, c] of topTriangles) {
        indices.push(a, b, c)
    }

    // Side wall quads: connect each top edge to its bottom edge
    for (let i = 0; i < n; i++) {
        const next = (i + 1) % n
        indices.push(i, n + i, n + next)
        indices.push(i, n + next, next)
    }

    return buildGeometry(positions, indices)
}

/**
 * Generate GABLED roof geometry
 * Proper gable roof: ridge LINE along ridgeDirection at full building length.
 * For 4-vertex rectangular footprints: 2 slope quads + 2 gable triangles (8 triangles).
 * For non-rectangular polygons: pyramid fallback (fan to centroid).
 * Uses identical triangle indices as hip roof — only ridge positions differ.
 */
export const generateGabledRoof = (vertices, baseZ, ridgeZ, ridgeDirection) => {
    if (ridgeZ <= baseZ || !vertices || vertices.length < 3) return null

    const bounds = getVertexBounds(vertices)
    const n = vertices.length

    // Non-rectangular polygons: pyramid fallback (fan to centroid at ridgeZ)
    if (n !== 4) {
        const positions = []
        const indices = []
        for (let i = 0; i < n; i++) {
            positions.push(vertices[i].x, vertices[i].y, baseZ)
        }
        positions.push(bounds.centerX, bounds.centerY, ridgeZ)
        for (let i = 0; i < n; i++) {
            indices.push(i, (i + 1) % n, n)
        }
        return buildGeometry(positions, indices)
    }

    // Rectangular (4 vertices): explicit gable roof with ridge line
    const { centerX, centerY, minX, maxX, minY, maxY } = bounds
    const positions = []
    const indices = []

    // Footprint vertices at baseZ (indices 0-3)
    for (let i = 0; i < 4; i++) {
        positions.push(vertices[i].x, vertices[i].y, baseZ)
    }

    // Ridge direction: respect user's setting directly
    const ridgeAlongX = ridgeDirection === 'x'

    if (ridgeAlongX) {
        // Ridge endpoints at FULL building length (indices 4, 5)
        positions.push(minX, centerY, ridgeZ)   // ridgeStart (left end)
        positions.push(maxX, centerY, ridgeZ)    // ridgeEnd (right end)

        // Front slope (-Y side): v0, v1 eave to ridge
        indices.push(0, 1, 5)
        indices.push(0, 5, 4)
        // Right gable (+X side): vertical triangle
        indices.push(1, 2, 5)
        // Back slope (+Y side): v2, v3 eave to ridge
        indices.push(2, 3, 4)
        indices.push(2, 4, 5)
        // Left gable (-X side): vertical triangle
        indices.push(3, 0, 4)
    } else {
        // Ridge endpoints at FULL building depth (indices 4, 5)
        positions.push(centerX, minY, ridgeZ)    // ridgeStart (front end)
        positions.push(centerX, maxY, ridgeZ)     // ridgeEnd (back end)

        // Left slope (-X side): v3, v0 eave to ridge
        indices.push(3, 0, 4)
        indices.push(3, 4, 5)
        // Front gable (-Y side): vertical triangle
        indices.push(0, 1, 4)
        // Right slope (+X side): v1, v2 eave to ridge
        indices.push(1, 2, 5)
        indices.push(1, 5, 4)
        // Back gable (+Y side): vertical triangle
        indices.push(2, 3, 5)
    }

    // No bottom face or side walls — building box provides the floor

    return buildGeometry(positions, indices)
}

/**
 * Generate HIPPED roof geometry
 * Proper hip roof: ridge LINE along longer dimension, length = L - W (45° rule).
 * For 4-vertex rectangular footprints: 2 trapezoidal slopes + 2 triangular hips.
 * For non-rectangular polygons: pyramid fallback (fan to centroid).
 * Square buildings (L = W) produce a pyramid (ridge degenerates to a point).
 */
export const generateHippedRoof = (vertices, baseZ, ridgeZ, ridgeDirection) => {
    if (ridgeZ <= baseZ || !vertices || vertices.length < 3) return null

    const bounds = getVertexBounds(vertices)
    const n = vertices.length

    // Non-rectangular polygons: pyramid fallback (fan to centroid at ridgeZ)
    if (n !== 4) {
        const positions = []
        const indices = []
        for (let i = 0; i < n; i++) {
            positions.push(vertices[i].x, vertices[i].y, baseZ)
        }
        positions.push(bounds.centerX, bounds.centerY, ridgeZ)
        for (let i = 0; i < n; i++) {
            indices.push(i, (i + 1) % n, n)
        }
        return buildGeometry(positions, indices)
    }

    // Rectangular (4 vertices): proper hip roof with ridge line
    const { width, depth, centerX, centerY, minX, maxX, minY, maxY } = bounds
    const positions = []
    const indices = []

    // Footprint vertices at baseZ (indices 0-3)
    for (let i = 0; i < 4; i++) {
        positions.push(vertices[i].x, vertices[i].y, baseZ)
    }

    // Ridge runs along the LONGER dimension (ridgeDirection as tiebreaker when square)
    const ridgeAlongX = width > depth || (width === depth && ridgeDirection === 'x')

    if (ridgeAlongX) {
        const halfShort = depth / 2
        // Ridge endpoints (indices 4, 5)
        positions.push(minX + halfShort, centerY, ridgeZ)  // ridgeStart (left end)
        positions.push(maxX - halfShort, centerY, ridgeZ)   // ridgeEnd (right end)

        // Front trapezoid (-Y side): v0, v1, ridgeEnd, ridgeStart
        indices.push(0, 1, 5)
        indices.push(0, 5, 4)
        // Right hip triangle (+X side): v1, v2, ridgeEnd
        indices.push(1, 2, 5)
        // Back trapezoid (+Y side): v2, v3, ridgeStart, ridgeEnd
        indices.push(2, 3, 4)
        indices.push(2, 4, 5)
        // Left hip triangle (-X side): v3, v0, ridgeStart
        indices.push(3, 0, 4)
    } else {
        const halfShort = width / 2
        // Ridge endpoints (indices 4, 5)
        positions.push(centerX, minY + halfShort, ridgeZ)   // ridgeStart (front end)
        positions.push(centerX, maxY - halfShort, ridgeZ)    // ridgeEnd (back end)

        // Left trapezoid (-X side): v3, v0, ridgeStart, ridgeEnd
        indices.push(3, 0, 4)
        indices.push(3, 4, 5)
        // Front hip triangle (-Y side): v0, v1, ridgeStart
        indices.push(0, 1, 4)
        // Right trapezoid (+X side): v1, v2, ridgeEnd, ridgeStart
        indices.push(1, 2, 5)
        indices.push(1, 5, 4)
        // Back hip triangle (+Y side): v2, v3, ridgeEnd
        indices.push(2, 3, 5)
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
