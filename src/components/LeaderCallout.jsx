import { Line } from '@react-three/drei'
import * as THREE from 'three'
import AnnotationText from './AnnotationText'

/**
 * Leader call-out: an arrow pointing at a feature with text at the other end.
 * Supports straight and bent (elbow) leader lines.
 */
const LeaderCallout = ({
    targetPoint,                    // [x, y, z] — the feature being called out
    textPosition,                   // [x, y, z] — where the text label sits
    text = '',
    settings = {},                  // { lineColor, lineWidth, textColor, fontSize, outlineWidth, outlineColor, endMarker }
    lineScale = 1,
    visible = true,
    textRotation = 'billboard',     // 'billboard' | 'follow-line' | 'fixed'
    background = null,              // { enabled, color, opacity, padding }
    elbow = false,                  // use bent leader with horizontal landing
    elbowLength = 5,                // length of horizontal landing line
}) => {
    if (!visible || !text) return null

    const dampenedScale = Math.pow(lineScale, 0.15)
    const lineColor = settings.lineColor || '#000000'
    const lineWidth = (settings.lineWidth || 1) * dampenedScale
    const textColor = settings.textColor || lineColor
    const fontSize = settings.fontSize || 2

    // Arrow at the target point
    const dx = textPosition[0] - targetPoint[0]
    const dy = textPosition[1] - targetPoint[1]
    const angle = Math.atan2(dy, dx)
    const markerScale = Math.max(1.5, (settings.lineWidth || 1) * 0.8) * dampenedScale
    const arrowLength = 1 * markerScale
    const arrowWidth = 0.4 * markerScale

    // Build leader line points
    let linePoints
    if (elbow) {
        // Bent leader: target → elbow → text
        const elbowDir = textPosition[0] >= targetPoint[0] ? 1 : -1
        const elbowPoint = [
            textPosition[0] - elbowDir * elbowLength,
            textPosition[1],
            textPosition[2],
        ]
        linePoints = [targetPoint, elbowPoint, textPosition]
    } else {
        linePoints = [targetPoint, textPosition]
    }

    const endMarker = settings.endMarker || 'arrow'

    return (
        <group>
            {/* Leader line */}
            <Line
                points={linePoints}
                color={lineColor}
                lineWidth={lineWidth}
            />

            {/* Arrow at target */}
            {endMarker === 'arrow' && (
                <group position={targetPoint} rotation={[0, 0, angle + Math.PI]}>
                    <mesh position={[-arrowLength / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                        <coneGeometry args={[arrowWidth, arrowLength, 8]} />
                        <meshBasicMaterial color={lineColor} />
                    </mesh>
                </group>
            )}
            {endMarker === 'dot' && (
                <mesh position={targetPoint}>
                    <sphereGeometry args={[0.3 * markerScale]} />
                    <meshBasicMaterial color={lineColor} />
                </mesh>
            )}

            {/* Text label */}
            <AnnotationText
                position={textPosition}
                text={text}
                fontSize={fontSize}
                color={textColor}
                rotation={textRotation}
                lineAngle={angle}
                background={background}
                anchorX={textPosition[0] >= targetPoint[0] ? 'left' : 'right'}
                anchorY="middle"
                outlineWidth={settings.outlineWidth ?? 0.1}
                outlineColor={settings.outlineColor || '#ffffff'}
                lineScale={lineScale}
            />
        </group>
    )
}

export default LeaderCallout
