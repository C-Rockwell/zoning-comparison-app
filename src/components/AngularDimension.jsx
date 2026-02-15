import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import AnnotationText from './AnnotationText'
import { formatAngle } from '../utils/formatUnits'

/**
 * Angular dimension: renders an arc between two rays from a common vertex,
 * with tick marks at the endpoints and an angle label.
 */
const AngularDimension = ({
    vertex,                         // [x, y, z] — the angle vertex
    rayA,                           // [x, y, z] — point on first ray
    rayB,                           // [x, y, z] — point on second ray
    radius = 10,                    // arc radius from vertex
    label = null,                   // string | null (auto-calculates angle if null)
    plane = 'XY',                   // 'XY' | 'XZ' | 'YZ'
    settings = {},
    lineScale = 1,
    visible = true,
    textMode = 'follow-line',
    segments = 24,
}) => {
    if (!visible) return null

    const dampenedScale = Math.pow(lineScale, 0.15)
    const lineColor = settings.lineColor || '#000000'
    const lineWidth = (settings.lineWidth || 1) * dampenedScale
    const textColor = settings.textColor || lineColor
    const fontSize = settings.fontSize || 2

    const { arcPoints, midPoint, angleDeg, startAngle, endAngle } = useMemo(() => {
        // Get 2D coordinates based on plane
        let aX, aY, bX, bY
        if (plane === 'XZ') {
            aX = rayA[0] - vertex[0]; aY = rayA[2] - vertex[2]
            bX = rayB[0] - vertex[0]; bY = rayB[2] - vertex[2]
        } else if (plane === 'YZ') {
            aX = rayA[1] - vertex[1]; aY = rayA[2] - vertex[2]
            bX = rayB[1] - vertex[1]; bY = rayB[2] - vertex[2]
        } else {
            aX = rayA[0] - vertex[0]; aY = rayA[1] - vertex[1]
            bX = rayB[0] - vertex[0]; bY = rayB[1] - vertex[1]
        }

        let sAngle = Math.atan2(aY, aX)
        let eAngle = Math.atan2(bY, bX)

        // Ensure we sweep the smaller angle
        let sweep = eAngle - sAngle
        if (sweep < -Math.PI) sweep += Math.PI * 2
        if (sweep > Math.PI) sweep -= Math.PI * 2

        if (sweep < 0) {
            // Swap so we always go counterclockwise
            const tmp = sAngle
            sAngle = eAngle
            eAngle = tmp
            sweep = -sweep
        }

        const deg = (sweep * 180) / Math.PI

        // Generate arc points
        const pts = []
        for (let i = 0; i <= segments; i++) {
            const t = sAngle + (sweep * i) / segments
            const cx = Math.cos(t) * radius
            const cy = Math.sin(t) * radius

            let pt
            if (plane === 'XZ') pt = [vertex[0] + cx, vertex[1], vertex[2] + cy]
            else if (plane === 'YZ') pt = [vertex[0], vertex[1] + cx, vertex[2] + cy]
            else pt = [vertex[0] + cx, vertex[1] + cy, vertex[2]]
            pts.push(pt)
        }

        // Midpoint of arc for label
        const midT = sAngle + sweep / 2
        const midCx = Math.cos(midT) * (radius + 2)
        const midCy = Math.sin(midT) * (radius + 2)
        let mid
        if (plane === 'XZ') mid = [vertex[0] + midCx, vertex[1], vertex[2] + midCy]
        else if (plane === 'YZ') mid = [vertex[0], vertex[1] + midCx, vertex[2] + midCy]
        else mid = [vertex[0] + midCx, vertex[1] + midCy, vertex[2]]

        return { arcPoints: pts, midPoint: mid, angleDeg: deg, startAngle: sAngle, endAngle: eAngle }
    }, [vertex, rayA, rayB, radius, plane, segments])

    if (arcPoints.length < 2) return null

    // Tick marks at arc endpoints
    const markerScale = Math.max(1.5, (settings.lineWidth || 1) * 0.8) * dampenedScale
    const tickSize = 0.8 * markerScale

    const resolvedLabel = label != null ? label : formatAngle(angleDeg)

    return (
        <group>
            {/* Arc line */}
            <Line
                points={arcPoints}
                color={lineColor}
                lineWidth={lineWidth}
            />

            {/* Tick at start */}
            {arcPoints.length > 0 && (
                <Line
                    points={[
                        arcPoints[0],
                        [
                            arcPoints[0][0] + Math.cos(startAngle) * tickSize * 0.5,
                            arcPoints[0][1] + Math.sin(startAngle) * tickSize * 0.5,
                            arcPoints[0][2],
                        ]
                    ]}
                    color={lineColor}
                    lineWidth={lineWidth}
                />
            )}
            {/* Tick at end */}
            {arcPoints.length > 1 && (
                <Line
                    points={[
                        arcPoints[arcPoints.length - 1],
                        [
                            arcPoints[arcPoints.length - 1][0] + Math.cos(endAngle) * tickSize * 0.5,
                            arcPoints[arcPoints.length - 1][1] + Math.sin(endAngle) * tickSize * 0.5,
                            arcPoints[arcPoints.length - 1][2],
                        ]
                    ]}
                    color={lineColor}
                    lineWidth={lineWidth}
                />
            )}

            {/* Angle label */}
            {resolvedLabel && (
                <AnnotationText
                    position={midPoint}
                    text={resolvedLabel}
                    fontSize={fontSize * 0.9}
                    color={textColor}
                    rotation={textMode}
                    outlineWidth={settings.outlineWidth ?? 0.1}
                    outlineColor={settings.outlineColor || '#ffffff'}
                    lineScale={lineScale}
                />
            )}
        </group>
    )
}

export default AngularDimension
