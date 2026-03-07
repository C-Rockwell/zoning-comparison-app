import {
    computeStarVertices,
    computeRegularPolygonVertices,
    pointInPolygon,
} from './drawingGeometry'

// --- Hit-test utilities ---

export const pointToSegmentDistSq = (px, py, ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay
    const lenSq = dx * dx + dy * dy
    if (lenSq === 0) return (px - ax) ** 2 + (py - ay) ** 2
    let t = ((px - ax) * dx + (py - ay) * dy) / lenSq
    t = Math.max(0, Math.min(1, t))
    const projX = ax + t * dx, projY = ay + t * dy
    return (px - projX) ** 2 + (py - projY) ** 2
}

export const hitTestPolygonVertices = (cx, cy, verts, fillOpacity, tolSq) => {
    for (let i = 0; i < verts.length; i++) {
        const [ax, ay] = verts[i]
        const [bx, by] = verts[(i + 1) % verts.length]
        if (pointToSegmentDistSq(cx, cy, ax, ay, bx, by) <= tolSq) return true
    }
    if ((fillOpacity ?? 0) > 0 && pointInPolygon(cx, cy, verts)) return true
    return false
}

export const hitTestObject = (obj, clickPoint, tolerance) => {
    const [cx, cy] = clickPoint
    const tolSq = tolerance * tolerance

    if (obj.type === 'freehand') {
        for (let i = 0; i < obj.points.length - 1; i++) {
            const [ax, ay] = obj.points[i]
            const [bx, by] = obj.points[i + 1]
            if (pointToSegmentDistSq(cx, cy, ax, ay, bx, by) <= tolSq) return true
        }
        return false
    }

    if (obj.type === 'line' || obj.type === 'arrow') {
        return pointToSegmentDistSq(cx, cy, obj.start[0], obj.start[1], obj.end[0], obj.end[1]) <= tolSq
    }

    if (obj.type === 'rectangle' || obj.type === 'roundedRect') {
        const [ox, oy] = obj.origin
        const w = obj.width, h = obj.height
        const minX = Math.min(ox, ox + w), maxX = Math.max(ox, ox + w)
        const minY = Math.min(oy, oy + h), maxY = Math.max(oy, oy + h)
        if ((obj.fillOpacity ?? 0) > 0 && cx >= minX && cx <= maxX && cy >= minY && cy <= maxY) return true
        const corners = [[ox, oy], [ox + w, oy], [ox + w, oy + h], [ox, oy + h]]
        for (let i = 0; i < 4; i++) {
            const [ax, ay] = corners[i]
            const [bx, by] = corners[(i + 1) % 4]
            if (pointToSegmentDistSq(cx, cy, ax, ay, bx, by) <= tolSq) return true
        }
        return false
    }

    if (obj.type === 'polygon') {
        for (let i = 0; i < obj.points.length; i++) {
            const [ax, ay] = obj.points[i]
            const [bx, by] = obj.points[(i + 1) % obj.points.length]
            if (pointToSegmentDistSq(cx, cy, ax, ay, bx, by) <= tolSq) return true
        }
        if ((obj.fillOpacity ?? 0) > 0 && pointInPolygon(cx, cy, obj.points)) return true
        return false
    }

    if (obj.type === 'circle') {
        const dx = cx - obj.center[0], dy = cy - obj.center[1]
        const dist = Math.sqrt(dx * dx + dy * dy)
        if ((obj.fillOpacity ?? 0) > 0 && dist <= obj.radius) return true
        if (Math.abs(dist - obj.radius) <= tolerance) return true
        return false
    }

    if (obj.type === 'ellipse') {
        const dx = cx - obj.center[0], dy = cy - obj.center[1]
        const rx = obj.radiusX, ry = obj.radiusY
        const normalized = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry)
        if ((obj.fillOpacity ?? 0) > 0 && normalized <= 1) return true
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > 0) {
            const angle = Math.atan2(dy, dx)
            const ellipseR = (rx * ry) / Math.sqrt((ry * Math.cos(angle)) ** 2 + (rx * Math.sin(angle)) ** 2)
            if (Math.abs(dist - ellipseR) <= tolerance) return true
        }
        return false
    }

    if (obj.type === 'star') {
        const verts = computeStarVertices(obj.center[0], obj.center[1], obj.outerRadius, obj.innerRadius, obj.numPoints ?? 5)
        return hitTestPolygonVertices(cx, cy, verts, obj.fillOpacity, tolSq)
    }

    if (obj.type === 'octagon') {
        const verts = computeRegularPolygonVertices(obj.center[0], obj.center[1], obj.radius, 8)
        return hitTestPolygonVertices(cx, cy, verts, obj.fillOpacity, tolSq)
    }

    if (obj.type === 'text') {
        const [px, py] = obj.position
        const approxWidth = (obj.text?.length ?? 1) * (obj.fontSize ?? 3) * 0.6
        const approxHeight = (obj.fontSize ?? 3) * 1.2
        const halfW = approxWidth / 2, halfH = approxHeight / 2
        return cx >= px - halfW && cx <= px + halfW && cy >= py - halfH && cy <= py + halfH
    }

    if (obj.type === 'leader') {
        if (pointToSegmentDistSq(cx, cy, obj.targetPoint[0], obj.targetPoint[1], obj.textPosition[0], obj.textPosition[1]) <= tolSq) {
            return true
        }
        const [px, py] = obj.textPosition
        const approxWidth = (obj.text?.length ?? 1) * (obj.fontSize ?? 3) * 0.6
        const approxHeight = (obj.fontSize ?? 3) * 1.2
        const halfW = approxWidth / 2, halfH = approxHeight / 2
        return cx >= px - halfW && cx <= px + halfW && cy >= py - halfH && cy <= py + halfH
    }

    return false
}

// --- Bounding box computation ---

export const computeObjectBounds = (obj) => {
    switch (obj.type) {
        case 'freehand':
        case 'polygon': {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
            for (const [x, y] of obj.points) {
                if (x < minX) minX = x
                if (y < minY) minY = y
                if (x > maxX) maxX = x
                if (y > maxY) maxY = y
            }
            return { minX, minY, maxX, maxY }
        }
        case 'line':
        case 'arrow':
            return {
                minX: Math.min(obj.start[0], obj.end[0]),
                minY: Math.min(obj.start[1], obj.end[1]),
                maxX: Math.max(obj.start[0], obj.end[0]),
                maxY: Math.max(obj.start[1], obj.end[1]),
            }
        case 'rectangle':
        case 'roundedRect': {
            const [ox, oy] = obj.origin
            return {
                minX: Math.min(ox, ox + obj.width),
                minY: Math.min(oy, oy + obj.height),
                maxX: Math.max(ox, ox + obj.width),
                maxY: Math.max(oy, oy + obj.height),
            }
        }
        case 'circle':
        case 'octagon':
            return {
                minX: obj.center[0] - obj.radius,
                minY: obj.center[1] - obj.radius,
                maxX: obj.center[0] + obj.radius,
                maxY: obj.center[1] + obj.radius,
            }
        case 'ellipse':
            return {
                minX: obj.center[0] - obj.radiusX,
                minY: obj.center[1] - obj.radiusY,
                maxX: obj.center[0] + obj.radiusX,
                maxY: obj.center[1] + obj.radiusY,
            }
        case 'star':
            return {
                minX: obj.center[0] - obj.outerRadius,
                minY: obj.center[1] - obj.outerRadius,
                maxX: obj.center[0] + obj.outerRadius,
                maxY: obj.center[1] + obj.outerRadius,
            }
        case 'text': {
            const [px, py] = obj.position
            const approxWidth = (obj.text?.length ?? 1) * (obj.fontSize ?? 3) * 0.6
            const approxHeight = (obj.fontSize ?? 3) * 1.2
            return {
                minX: px - approxWidth / 2,
                minY: py - approxHeight / 2,
                maxX: px + approxWidth / 2,
                maxY: py + approxHeight / 2,
            }
        }
        case 'leader': {
            const [tx, ty] = obj.targetPoint
            const [px, py] = obj.textPosition
            const approxWidth = (obj.text?.length ?? 1) * (obj.fontSize ?? 3) * 0.6
            const approxHeight = (obj.fontSize ?? 3) * 1.2
            return {
                minX: Math.min(tx, px - approxWidth / 2),
                minY: Math.min(ty, py - approxHeight / 2),
                maxX: Math.max(tx, px + approxWidth / 2),
                maxY: Math.max(ty, py + approxHeight / 2),
            }
        }
        default:
            return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
    }
}

// --- Move update computation ---

export const computeMoveUpdate = (obj, dx, dy) => {
    switch (obj.type) {
        case 'freehand':
        case 'polygon':
            return { points: obj.points.map(([x, y]) => [x + dx, y + dy]) }
        case 'line':
        case 'arrow':
            return {
                start: [obj.start[0] + dx, obj.start[1] + dy],
                end: [obj.end[0] + dx, obj.end[1] + dy],
            }
        case 'rectangle':
        case 'roundedRect':
            return { origin: [obj.origin[0] + dx, obj.origin[1] + dy] }
        case 'circle':
        case 'ellipse':
        case 'star':
        case 'octagon':
            return { center: [obj.center[0] + dx, obj.center[1] + dy] }
        case 'text':
            return { position: [obj.position[0] + dx, obj.position[1] + dy] }
        case 'leader':
            return {
                targetPoint: [obj.targetPoint[0] + dx, obj.targetPoint[1] + dy],
                textPosition: [obj.textPosition[0] + dx, obj.textPosition[1] + dy],
            }
        default:
            return {}
    }
}
