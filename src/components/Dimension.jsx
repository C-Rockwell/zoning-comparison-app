import { useState, useCallback } from 'react'
import { Text, Line, Billboard } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Compute perpendicular vector for offset based on dimension plane.
 * @param {number} ux - Normalized direction X
 * @param {number} uy - Normalized direction Y
 * @param {number} uz - Normalized direction Z
 * @param {string} plane - 'XY' | 'XZ' | 'YZ' | 'auto'
 * @param {number} dx - Raw direction delta X
 * @param {number} dy - Raw direction delta Y
 * @param {number} dz - Raw direction delta Z
 */
const computePerpendicular = (ux, uy, uz, plane, dx, dy, dz) => {
    if (plane === 'XZ') {
        // Elevation/front view — perpendicular in XZ plane
        return { px: -uz, py: 0, pz: ux }
    }
    if (plane === 'YZ') {
        // Side elevation — perpendicular in YZ plane
        return { px: 0, py: -uz, pz: uy }
    }
    if (plane === 'auto') {
        // Auto-detect: if Z changes significantly, use XZ or YZ
        const absDx = Math.abs(dx), absDy = Math.abs(dy), absDz = Math.abs(dz)
        if (absDz > 0.1 && absDz > absDy && absDx > absDy) {
            return { px: -uz, py: 0, pz: ux } // XZ
        }
        if (absDz > 0.1 && absDz > absDx && absDy > absDx) {
            return { px: 0, py: -uz, pz: uy } // YZ
        }
    }
    // Default: XY plane (plan view) — current behavior
    return { px: -uy, py: ux, pz: 0 }
}

const Dimension = ({
    start, end, label, offset = 0, color = "black",
    visible = true, flipText = false, settings = {}, lineScale = 1,
    // New enhanced props (all optional, backward-compatible)
    plane = 'XY',                   // 'XY' | 'XZ' | 'YZ' | 'auto'
    textMode,                       // 'follow-line' | 'billboard' — overrides settings.textMode
    textBackground,                 // { enabled, color, opacity, padding } — overrides settings.textBackground
}) => {
    if (!visible) return null

    // WYSIWYG dampened scale
    const dampenedScale = Math.pow(lineScale, 0.15)

    // Defaults from settings or fallback
    const lineColor = settings.lineColor || color
    const textColor = settings.textColor || lineColor
    const baseLineWidth = settings.lineWidth || 1
    const lineWidth = baseLineWidth * dampenedScale
    const fontSize = settings.fontSize || 2
    const endMarker = settings.endMarker || 'tick'
    const resolvedTextMode = textMode || settings.textMode || 'follow-line'
    const resolvedBackground = textBackground || settings.textBackground || null

    // Direction vector
    const dx = end[0] - start[0]
    const dy = end[1] - start[1]
    const dz = end[2] - start[2]

    const length = Math.sqrt(dx * dx + dy * dy + dz * dz)
    if (length === 0) return null

    const ux = dx / length
    const uy = dy / length
    const uz = dz / length

    // Perpendicular vector based on plane
    const { px, py, pz } = computePerpendicular(ux, uy, uz, plane, dx, dy, dz)

    // Apply offset
    const ox = px * offset
    const oy = py * offset
    const oz = pz * offset

    const s = [start[0] + ox, start[1] + oy, start[2] + oz]
    const e = [end[0] + ox, end[1] + oy, end[2] + oz]

    // Midpoint for text
    const mx = (s[0] + e[0]) / 2
    const my = (s[1] + e[1]) / 2
    const mz = (s[2] + e[2]) / 2

    // Marker sizing
    const markerScale = Math.max(1.5, baseLineWidth * 0.8) * dampenedScale
    const tickSize = 1 * markerScale
    const tx = px * tickSize
    const ty = py * tickSize
    const tz = pz * tickSize

    const linePoints = [s, e]
    const showExtensions = Math.abs(offset) > 0.1

    // Text rotation (follow-line mode)
    const angle = Math.atan2(dy, dx)
    const textAngle = (angle > Math.PI / 2 || angle <= -Math.PI / 2) ? angle + Math.PI : angle

    const arrowLength = 1 * markerScale
    const arrowWidth = 0.4 * markerScale
    const dotSize = 0.3 * markerScale

    // Background box state (for measuring text bounds)
    const [textBounds, setTextBounds] = useState(null)
    const handleSync = useCallback((troika) => {
        if (troika?.geometry) {
            troika.geometry.computeBoundingBox()
            const box = troika.geometry.boundingBox
            if (box) {
                setTextBounds({
                    width: box.max.x - box.min.x,
                    height: box.max.y - box.min.y,
                    centerX: (box.max.x + box.min.x) / 2,
                    centerY: (box.max.y + box.min.y) / 2,
                })
            }
        }
    }, [])

    const bg = resolvedBackground?.enabled ? resolvedBackground : null
    const bgPadding = bg?.padding ?? 0.3

    // Render the label text (either billboard or follow-line)
    const renderLabel = () => {
        if (!label) return null

        const textProps = {
            fontSize,
            color: textColor,
            anchorX: "center",
            anchorY: flipText ? "top" : "bottom",
            outlineWidth: fontSize * (settings.outlineWidth ?? 0.1),
            outlineColor: settings.outlineColor || "white",
            onSync: bg ? handleSync : undefined,
        }

        const bgMesh = bg && textBounds ? (
            <mesh position={[textBounds.centerX, textBounds.centerY, -0.05]}>
                <planeGeometry args={[
                    textBounds.width + bgPadding * 2 * fontSize,
                    textBounds.height + bgPadding * 2 * fontSize,
                ]} />
                <meshBasicMaterial
                    color={bg.color || '#ffffff'}
                    opacity={bg.opacity ?? 0.85}
                    transparent
                    side={THREE.DoubleSide}
                />
            </mesh>
        ) : null

        if (resolvedTextMode === 'billboard') {
            return (
                <Billboard position={[mx, my, mz]}>
                    <group>
                        {bgMesh}
                        <Text {...textProps}>{label}</Text>
                    </group>
                </Billboard>
            )
        }

        // follow-line mode (default, original behavior)
        return (
            <group position={[mx, my, mz]} rotation={[0, 0, textAngle]}>
                {bgMesh}
                <Text {...textProps}>{label}</Text>
            </group>
        )
    }

    return (
        <group>
            {/* Main Dimension Line */}
            <Line points={linePoints} color={lineColor} lineWidth={lineWidth} />

            {/* End Markers */}
            {endMarker === 'tick' && (
                <>
                    <Line points={[[s[0] - tx / 2, s[1] - ty / 2, s[2] - tz / 2], [s[0] + tx / 2, s[1] + ty / 2, s[2] + tz / 2]]} color={lineColor} lineWidth={lineWidth} />
                    <Line points={[[e[0] - tx / 2, e[1] - ty / 2, e[2] - tz / 2], [e[0] + tx / 2, e[1] + ty / 2, e[2] + tz / 2]]} color={lineColor} lineWidth={lineWidth} />
                </>
            )}
            {endMarker === 'dot' && (
                <>
                    <mesh position={s}>
                        <sphereGeometry args={[dotSize]} />
                        <meshBasicMaterial color={lineColor} />
                    </mesh>
                    <mesh position={e}>
                        <sphereGeometry args={[dotSize]} />
                        <meshBasicMaterial color={lineColor} />
                    </mesh>
                </>
            )}
            {endMarker === 'arrow' && (
                <>
                    <group position={s} rotation={[0, 0, angle + Math.PI]}>
                        <mesh position={[-arrowLength / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                            <coneGeometry args={[arrowWidth, arrowLength, 8]} />
                            <meshBasicMaterial color={lineColor} />
                        </mesh>
                    </group>
                    <group position={e} rotation={[0, 0, angle]}>
                        <mesh position={[-arrowLength / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                            <coneGeometry args={[arrowWidth, arrowLength, 8]} />
                            <meshBasicMaterial color={lineColor} />
                        </mesh>
                    </group>
                </>
            )}

            {/* Extension Lines */}
            {showExtensions && (
                <>
                    <Line points={[[start[0], start[1], start[2]], [s[0], s[1], s[2]]]} color={lineColor} lineWidth={lineWidth * (settings.extensionWidth ?? 0.5)} dashed dashScale={2} />
                    <Line points={[[end[0], end[1], end[2]], [e[0], e[1], e[2]]]} color={lineColor} lineWidth={lineWidth * (settings.extensionWidth ?? 0.5)} dashed dashScale={2} />
                </>
            )}

            {/* Label */}
            {renderLabel()}
        </group>
    )
}

export default Dimension
