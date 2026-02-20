import { useState, useCallback } from 'react'
import { Text, Billboard, Line } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Shared text rendering component with billboard, follow-line, and fixed rotation modes.
 * Supports optional background box and WYSIWYG export scaling.
 */
const AnnotationText = ({
    position = [0, 0, 0],
    text = '',
    fontSize = 2,
    color = '#000000',
    rotation = 'billboard',    // 'billboard' | 'follow-line' | 'fixed'
    lineAngle = 0,             // radians, used when rotation === 'follow-line'
    fixedRotation = [0, 0, 0], // euler, used when rotation === 'fixed'
    background = null,         // { enabled, color, opacity, padding }
    anchorX = 'center',
    anchorY = 'bottom',
    outlineWidth = 0.1,
    outlineColor = '#ffffff',
    lineScale = 1,
    font = undefined,
    depthTest = true,
    visible = true,
}) => {
    // All hooks must come before any conditional return (Rules of Hooks)
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

    if (!visible || !text) return null

    const dampenedScale = Math.pow(lineScale, 0.15)
    const scaledFontSize = fontSize * dampenedScale

    // For follow-line mode, ensure text is never upside-down
    let textAngle = lineAngle
    if (rotation === 'follow-line') {
        if (textAngle > Math.PI / 2 || textAngle <= -Math.PI / 2) {
            textAngle += Math.PI
        }
    }

    const textRotation = rotation === 'follow-line'
        ? [0, 0, textAngle]
        : rotation === 'fixed'
            ? fixedRotation
            : [0, 0, 0]

    const bg = background?.enabled ? background : null
    const padding = bg?.padding ?? 0.3

    const textElement = (
        <group position={position} rotation={rotation !== 'billboard' ? textRotation : undefined}>
            {/* Background box */}
            {bg && textBounds && (
                <mesh position={[textBounds.centerX, textBounds.centerY, -0.05]}>
                    <planeGeometry args={[
                        textBounds.width + padding * 2 * scaledFontSize,
                        textBounds.height + padding * 2 * scaledFontSize,
                    ]} />
                    <meshBasicMaterial
                        color={bg.color || '#ffffff'}
                        opacity={bg.opacity ?? 0.85}
                        transparent
                        depthTest={depthTest}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            )}

            {/* Text */}
            <Text
                fontSize={scaledFontSize}
                color={color}
                anchorX={anchorX}
                anchorY={anchorY}
                outlineWidth={scaledFontSize * outlineWidth}
                outlineColor={outlineColor}
                font={font}
                depthTest={depthTest}
                onSync={bg ? handleSync : undefined}
            >
                {text}
            </Text>
        </group>
    )

    // Billboard wraps the text group so it always faces the camera
    if (rotation === 'billboard') {
        return (
            <Billboard position={position}>
                <group>
                    {bg && textBounds && (
                        <mesh position={[textBounds.centerX, textBounds.centerY, -0.05]}>
                            <planeGeometry args={[
                                textBounds.width + padding * 2 * scaledFontSize,
                                textBounds.height + padding * 2 * scaledFontSize,
                            ]} />
                            <meshBasicMaterial
                                color={bg.color || '#ffffff'}
                                opacity={bg.opacity ?? 0.85}
                                transparent
                                depthTest={depthTest}
                                side={THREE.DoubleSide}
                            />
                        </mesh>
                    )}
                    <Text
                        fontSize={scaledFontSize}
                        color={color}
                        anchorX={anchorX}
                        anchorY={anchorY}
                        outlineWidth={scaledFontSize * outlineWidth}
                        outlineColor={outlineColor}
                        font={font}
                        depthTest={depthTest}
                        onSync={bg ? handleSync : undefined}
                    >
                        {text}
                    </Text>
                </group>
            </Billboard>
        )
    }

    return textElement
}

export default AnnotationText
