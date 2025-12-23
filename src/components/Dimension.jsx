import { Text, Line } from '@react-three/drei'
import * as THREE from 'three'

const Dimension = ({ start, end, label, offset = 0, color = "black", visible = true, flipText = false, settings = {} }) => {
    if (!visible) return null

    // Defaults from settings or fallback
    const lineColor = settings.lineColor || color
    const textColor = settings.textColor || lineColor
    const lineWidth = settings.lineWidth || 1
    const fontSize = settings.fontSize || 2
    const endMarker = settings.endMarker || 'tick' // 'tick', 'arrow', 'dot'

    // Calculate direction vector
    const dx = end[0] - start[0]
    const dy = end[1] - start[1]
    const dz = end[2] - start[2]

    // Normalize direction
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz)
    if (length === 0) return null // Avoid div by zero

    const ux = dx / length
    const uy = dy / length
    const uz = dz / length

    // Calculate perpendicular vector for offset (assuming Z is up, work in XY plane mostly)
    // Rotate 90 degrees in XY: (-y, x)
    let px = -uy
    let py = ux
    let pz = 0

    // Apply offset magnitude
    const ox = px * offset
    const oy = py * offset
    const oz = pz * offset

    // New start/end points with offset
    const s = [start[0] + ox, start[1] + oy, start[2] + oz]
    const e = [end[0] + ox, end[1] + oy, end[2] + oz]

    // Midpoint for text
    const mx = (s[0] + e[0]) / 2
    const my = (s[1] + e[1]) / 2
    const mz = (s[2] + e[2]) / 2

    // Tick mark size (perpendicular local to line)
    // Scale tick size with lineWidth for meaningful visibility
    const scale = Math.max(1.5, lineWidth * 0.8)
    const tickSize = 1 * scale
    const tx = px * tickSize
    const ty = py * tickSize

    // Extension lines (from object to dimension line)
    const extGap = 0.5 // small gap from object

    // Helper to format points for Line component
    const linePoints = [s, e]

    // Extension Lines (only if offset is significant)
    const showExtensions = Math.abs(offset) > 0.1

    // Calculate rotation for text to align with line
    const angle = Math.atan2(dy, dx)
    // Ensure text is always readable (not upside down)
    const textAngle = (angle > Math.PI / 2 || angle <= -Math.PI / 2) ? angle + Math.PI : angle

    // Marker styling constants
    const arrowLength = 1 * scale
    const arrowWidth = 0.4 * scale
    const dotSize = 0.3 * scale

    return (
        <group>
            {/* Main Dimension Line */}
            <Line points={linePoints} color={lineColor} lineWidth={lineWidth} />

            {/* End Markers */}
            {endMarker === 'tick' && (
                <>
                    <Line points={[[s[0] - tx / 2, s[1] - ty / 2, s[2]], [s[0] + tx / 2, s[1] + ty / 2, s[2]]]} color={lineColor} lineWidth={lineWidth} />
                    <Line points={[[e[0] - tx / 2, e[1] - ty / 2, e[2]], [e[0] + tx / 2, e[1] + ty / 2, e[2]]]} color={lineColor} lineWidth={lineWidth} />
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
                    {/* Start Arrow - pointing towards start */}
                    <group position={s} rotation={[0, 0, angle + Math.PI]}>
                        <mesh position={[-arrowLength / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                            <coneGeometry args={[arrowWidth, arrowLength, 8]} />
                            <meshBasicMaterial color={lineColor} />
                        </mesh>
                    </group>
                    {/* End Arrow - pointing towards end */}
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

            <Text
                position={[mx, my, mz]}
                color={textColor}
                fontSize={fontSize}
                anchorX="center"
                anchorY={flipText ? "top" : "bottom"} // Toggle "top" | "bottom"
                rotation={[0, 0, textAngle]} // Align with line
                outlineWidth={fontSize * (settings.outlineWidth ?? 0.1)} // Scale outline with font. Default 0.1
                outlineColor={settings.outlineColor || "white"}
            // font={settings.font || 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff'}
            >
                {label}
            </Text>
        </group>
    )
}

export default Dimension
