import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import {
    generateCirclePoints,
    generateEllipsePoints,
    generateRegularPolygonPoints,
    generateStarPoints,
    generateRoundedRectPoints,
    createRoundedRectShape,
} from '../../utils/drawingGeometry'
import AnnotationText from '../AnnotationText'
import LeaderCallout from '../LeaderCallout'
import { DIMENSION_FONT_OPTIONS } from '../../store/useStore'

const SELECTED_COLOR = '#3B82F6'

// --- Sub-renderers (module scope) ---

const FreehandRenderer = ({ points, strokeColor, strokeWidth, lineType, opacity }) => {
    const pts3d = useMemo(
        () => points.map(([x, y]) => [x, y, 0]),
        [points]
    )
    if (pts3d.length < 2) return null
    return (
        <Line
            points={pts3d}
            color={strokeColor}
            lineWidth={strokeWidth}
            dashed={lineType === 'dashed'}
            dashScale={lineType === 'dashed' ? 5 : 1}
            dashSize={1}
            gapSize={0.5}
            transparent={opacity < 1}
            opacity={opacity}
        />
    )
}

const LineRenderer = ({ start, end, strokeColor, strokeWidth, lineType, opacity }) => {
    const pts = useMemo(
        () => [[start[0], start[1], 0], [end[0], end[1], 0]],
        [start, end]
    )
    return (
        <Line
            points={pts}
            color={strokeColor}
            lineWidth={strokeWidth}
            dashed={lineType === 'dashed'}
            dashScale={lineType === 'dashed' ? 5 : 1}
            dashSize={1}
            gapSize={0.5}
            transparent={opacity < 1}
            opacity={opacity}
        />
    )
}

const RectangleRenderer = ({ origin, width, height, strokeColor, strokeWidth, lineType, fillColor, fillOpacity, opacity }) => {
    const [ox, oy] = origin
    const w = width
    const h = height

    const outlinePoints = useMemo(
        () => [
            [ox, oy, 0],
            [ox + w, oy, 0],
            [ox + w, oy + h, 0],
            [ox, oy + h, 0],
            [ox, oy, 0],
        ],
        [ox, oy, w, h]
    )

    const fillShape = useMemo(() => {
        if (fillOpacity <= 0) return null
        const shape = new THREE.Shape()
        shape.moveTo(ox, oy)
        shape.lineTo(ox + w, oy)
        shape.lineTo(ox + w, oy + h)
        shape.lineTo(ox, oy + h)
        shape.closePath()
        return shape
    }, [ox, oy, w, h, fillOpacity])

    return (
        <group>
            {/* Fill */}
            {fillShape && (
                <mesh>
                    <shapeGeometry args={[fillShape]} />
                    <meshBasicMaterial
                        color={fillColor}
                        transparent={fillOpacity < 1}
                        opacity={fillOpacity}
                        depthWrite={fillOpacity >= 0.95}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            )}
            {/* Stroke */}
            <Line
                points={outlinePoints}
                color={strokeColor}
                lineWidth={strokeWidth}
                dashed={lineType === 'dashed'}
                dashScale={lineType === 'dashed' ? 5 : 1}
                dashSize={1}
                gapSize={0.5}
                transparent={opacity < 1}
                opacity={opacity}
            />
        </group>
    )
}

const PolygonRenderer = ({ points, strokeColor, strokeWidth, lineType, fillColor, fillOpacity, opacity }) => {
    const outlinePoints = useMemo(
        () => [...points.map(([x, y]) => [x, y, 0]), [points[0][0], points[0][1], 0]],
        [points]
    )

    const fillShape = useMemo(() => {
        if (fillOpacity <= 0 || points.length < 3) return null
        const shape = new THREE.Shape()
        shape.moveTo(points[0][0], points[0][1])
        for (let i = 1; i < points.length; i++) {
            shape.lineTo(points[i][0], points[i][1])
        }
        shape.closePath()
        return shape
    }, [points, fillOpacity])

    return (
        <group>
            {fillShape && (
                <mesh>
                    <shapeGeometry args={[fillShape]} />
                    <meshBasicMaterial
                        color={fillColor}
                        transparent={fillOpacity < 1}
                        opacity={fillOpacity}
                        depthWrite={fillOpacity >= 0.95}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            )}
            <Line
                points={outlinePoints}
                color={strokeColor}
                lineWidth={strokeWidth}
                dashed={lineType === 'dashed'}
                dashScale={lineType === 'dashed' ? 5 : 1}
                dashSize={1}
                gapSize={0.5}
                transparent={opacity < 1}
                opacity={opacity}
            />
        </group>
    )
}

const CircleRenderer = ({ center, radius, strokeColor, strokeWidth, lineType, fillColor, fillOpacity, opacity }) => {
    const outlinePoints = useMemo(
        () => generateCirclePoints(center[0], center[1], radius, 64),
        [center, radius]
    )

    const fillShape = useMemo(() => {
        if (fillOpacity <= 0) return null
        const shape = new THREE.Shape()
        shape.absarc(center[0], center[1], radius, 0, Math.PI * 2, false)
        return shape
    }, [center, radius, fillOpacity])

    return (
        <group>
            {fillShape && (
                <mesh>
                    <shapeGeometry args={[fillShape]} />
                    <meshBasicMaterial
                        color={fillColor}
                        transparent={fillOpacity < 1}
                        opacity={fillOpacity}
                        depthWrite={fillOpacity >= 0.95}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            )}
            <Line
                points={outlinePoints}
                color={strokeColor}
                lineWidth={strokeWidth}
                dashed={lineType === 'dashed'}
                dashScale={lineType === 'dashed' ? 5 : 1}
                dashSize={1}
                gapSize={0.5}
                transparent={opacity < 1}
                opacity={opacity}
            />
        </group>
    )
}

const EllipseRenderer = ({ center, radiusX, radiusY, strokeColor, strokeWidth, lineType, fillColor, fillOpacity, opacity }) => {
    const outlinePoints = useMemo(
        () => generateEllipsePoints(center[0], center[1], radiusX, radiusY, 64),
        [center, radiusX, radiusY]
    )

    const fillShape = useMemo(() => {
        if (fillOpacity <= 0) return null
        const shape = new THREE.Shape()
        shape.absellipse(center[0], center[1], radiusX, radiusY, 0, Math.PI * 2, false, 0)
        return shape
    }, [center, radiusX, radiusY, fillOpacity])

    return (
        <group>
            {fillShape && (
                <mesh>
                    <shapeGeometry args={[fillShape]} />
                    <meshBasicMaterial
                        color={fillColor}
                        transparent={fillOpacity < 1}
                        opacity={fillOpacity}
                        depthWrite={fillOpacity >= 0.95}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            )}
            <Line
                points={outlinePoints}
                color={strokeColor}
                lineWidth={strokeWidth}
                dashed={lineType === 'dashed'}
                dashScale={lineType === 'dashed' ? 5 : 1}
                dashSize={1}
                gapSize={0.5}
                transparent={opacity < 1}
                opacity={opacity}
            />
        </group>
    )
}

const StarRenderer = ({ center, outerRadius, innerRadius, numPoints, strokeColor, strokeWidth, lineType, fillColor, fillOpacity, opacity }) => {
    const outlinePoints = useMemo(
        () => generateStarPoints(center[0], center[1], outerRadius, innerRadius, numPoints),
        [center, outerRadius, innerRadius, numPoints]
    )

    const fillShape = useMemo(() => {
        if (fillOpacity <= 0) return null
        const shape = new THREE.Shape()
        const pts = outlinePoints
        shape.moveTo(pts[0][0], pts[0][1])
        for (let i = 1; i < pts.length - 1; i++) {
            shape.lineTo(pts[i][0], pts[i][1])
        }
        shape.closePath()
        return shape
    }, [outlinePoints, fillOpacity])

    return (
        <group>
            {fillShape && (
                <mesh>
                    <shapeGeometry args={[fillShape]} />
                    <meshBasicMaterial
                        color={fillColor}
                        transparent={fillOpacity < 1}
                        opacity={fillOpacity}
                        depthWrite={fillOpacity >= 0.95}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            )}
            <Line
                points={outlinePoints}
                color={strokeColor}
                lineWidth={strokeWidth}
                dashed={lineType === 'dashed'}
                dashScale={lineType === 'dashed' ? 5 : 1}
                dashSize={1}
                gapSize={0.5}
                transparent={opacity < 1}
                opacity={opacity}
            />
        </group>
    )
}

const OctagonRenderer = ({ center, radius, strokeColor, strokeWidth, lineType, fillColor, fillOpacity, opacity }) => {
    const outlinePoints = useMemo(
        () => generateRegularPolygonPoints(center[0], center[1], radius, 8),
        [center, radius]
    )

    const fillShape = useMemo(() => {
        if (fillOpacity <= 0) return null
        const shape = new THREE.Shape()
        const pts = outlinePoints
        shape.moveTo(pts[0][0], pts[0][1])
        for (let i = 1; i < pts.length - 1; i++) {
            shape.lineTo(pts[i][0], pts[i][1])
        }
        shape.closePath()
        return shape
    }, [outlinePoints, fillOpacity])

    return (
        <group>
            {fillShape && (
                <mesh>
                    <shapeGeometry args={[fillShape]} />
                    <meshBasicMaterial
                        color={fillColor}
                        transparent={fillOpacity < 1}
                        opacity={fillOpacity}
                        depthWrite={fillOpacity >= 0.95}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            )}
            <Line
                points={outlinePoints}
                color={strokeColor}
                lineWidth={strokeWidth}
                dashed={lineType === 'dashed'}
                dashScale={lineType === 'dashed' ? 5 : 1}
                dashSize={1}
                gapSize={0.5}
                transparent={opacity < 1}
                opacity={opacity}
            />
        </group>
    )
}

const RoundedRectRenderer = ({ origin, width, height, cornerRadius, strokeColor, strokeWidth, lineType, fillColor, fillOpacity, opacity }) => {
    const [ox, oy] = origin

    const outlinePoints = useMemo(
        () => generateRoundedRectPoints(ox, oy, width, height, cornerRadius),
        [ox, oy, width, height, cornerRadius]
    )

    const fillShape = useMemo(() => {
        if (fillOpacity <= 0) return null
        return createRoundedRectShape(ox, oy, width, height, cornerRadius)
    }, [ox, oy, width, height, cornerRadius, fillOpacity])

    return (
        <group>
            {fillShape && (
                <mesh>
                    <shapeGeometry args={[fillShape]} />
                    <meshBasicMaterial
                        color={fillColor}
                        transparent={fillOpacity < 1}
                        opacity={fillOpacity}
                        depthWrite={fillOpacity >= 0.95}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            )}
            <Line
                points={outlinePoints}
                color={strokeColor}
                lineWidth={strokeWidth}
                dashed={lineType === 'dashed'}
                dashScale={lineType === 'dashed' ? 5 : 1}
                dashSize={1}
                gapSize={0.5}
                transparent={opacity < 1}
                opacity={opacity}
            />
        </group>
    )
}

const ArrowRenderer = ({ start, end, strokeColor, strokeWidth, lineType, opacity, arrowHead }) => {
    const pts = useMemo(
        () => [[start[0], start[1], 0], [end[0], end[1], 0]],
        [start, end]
    )
    const dx = end[0] - start[0], dy = end[1] - start[1]
    const angle = Math.atan2(dy, dx)
    const len = Math.sqrt(dx * dx + dy * dy)
    const markerScale = Math.max(1.5, strokeWidth * 0.8)
    const arrowLength = 1 * markerScale
    const arrowWidth = 0.4 * markerScale

    return (
        <group>
            <Line
                points={pts}
                color={strokeColor}
                lineWidth={strokeWidth}
                dashed={lineType === 'dashed'}
                dashScale={lineType === 'dashed' ? 5 : 1}
                dashSize={1}
                gapSize={0.5}
                transparent={opacity < 1}
                opacity={opacity}
            />
            {(arrowHead === 'end' || arrowHead === 'both') && len > 0.5 && (
                <group position={[end[0], end[1], 0]} rotation={[0, 0, angle + Math.PI]}>
                    <mesh position={[-arrowLength / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                        <coneGeometry args={[arrowWidth, arrowLength, 8]} />
                        <meshBasicMaterial color={strokeColor} />
                    </mesh>
                </group>
            )}
            {(arrowHead === 'start' || arrowHead === 'both') && len > 0.5 && (
                <group position={[start[0], start[1], 0]} rotation={[0, 0, angle]}>
                    <mesh position={[-arrowLength / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                        <coneGeometry args={[arrowWidth, arrowLength, 8]} />
                        <meshBasicMaterial color={strokeColor} />
                    </mesh>
                </group>
            )}
        </group>
    )
}

const TextRenderer = ({ position, text, fontSize, fontFamily, textColor, outlineWidth, outlineColor, opacity }) => {
    const fontUrl = useMemo(() => {
        if (!fontFamily) return undefined
        return DIMENSION_FONT_OPTIONS.find(f => f.label === fontFamily)?.url
    }, [fontFamily])

    return (
        <AnnotationText
            position={[position[0], position[1], 0]}
            text={text}
            fontSize={fontSize ?? 3}
            color={textColor ?? '#000000'}
            rotation="billboard"
            anchorX="center"
            anchorY="middle"
            outlineWidth={outlineWidth ?? 0.1}
            outlineColor={outlineColor ?? '#ffffff'}
            font={fontUrl}
            depthTest={true}
            visible={true}
        />
    )
}

const LeaderRenderer = ({ targetPoint, textPosition, text, fontSize, fontFamily, textColor, strokeColor, strokeWidth, lineType, opacity }) => {
    return (
        <LeaderCallout
            targetPoint={[targetPoint[0], targetPoint[1], 0]}
            textPosition={[textPosition[0], textPosition[1], 0]}
            text={text}
            settings={{
                lineColor: strokeColor,
                lineWidth: strokeWidth,
                textColor: textColor ?? strokeColor,
                fontSize: fontSize ?? 3,
                outlineWidth: 0.1,
                outlineColor: '#ffffff',
                endMarker: 'arrow',
            }}
            textRotation="billboard"
            visible={true}
        />
    )
}

// --- Main component ---

const DrawingObjectRenderer = ({ obj, isSelected }) => {
    if (!obj) return null

    const strokeColor = isSelected ? SELECTED_COLOR : obj.strokeColor
    const strokeWidth = isSelected ? (obj.strokeWidth + 1) : obj.strokeWidth
    const fillColor = isSelected ? SELECTED_COLOR : (obj.fillColor ?? '#cccccc')
    const fillOpacity = isSelected ? Math.max(obj.fillOpacity ?? 0, 0.15) : (obj.fillOpacity ?? 0)

    switch (obj.type) {
        case 'freehand':
            return (
                <FreehandRenderer
                    points={obj.points}
                    strokeColor={strokeColor}
                    strokeWidth={strokeWidth}
                    lineType={obj.lineType ?? 'solid'}
                    opacity={obj.opacity ?? 1}
                />
            )
        case 'line':
            return (
                <LineRenderer
                    start={obj.start}
                    end={obj.end}
                    strokeColor={strokeColor}
                    strokeWidth={strokeWidth}
                    lineType={obj.lineType ?? 'solid'}
                    opacity={obj.opacity ?? 1}
                />
            )
        case 'rectangle':
            return (
                <RectangleRenderer
                    origin={obj.origin}
                    width={obj.width}
                    height={obj.height}
                    strokeColor={strokeColor}
                    strokeWidth={strokeWidth}
                    lineType={obj.lineType ?? 'solid'}
                    fillColor={fillColor}
                    fillOpacity={fillOpacity}
                    opacity={obj.opacity ?? 1}
                />
            )
        case 'polygon':
            return (
                <PolygonRenderer
                    points={obj.points}
                    strokeColor={strokeColor}
                    strokeWidth={strokeWidth}
                    lineType={obj.lineType ?? 'solid'}
                    fillColor={fillColor}
                    fillOpacity={fillOpacity}
                    opacity={obj.opacity ?? 1}
                />
            )
        case 'circle':
            return (
                <CircleRenderer
                    center={obj.center}
                    radius={obj.radius}
                    strokeColor={strokeColor}
                    strokeWidth={strokeWidth}
                    lineType={obj.lineType ?? 'solid'}
                    fillColor={fillColor}
                    fillOpacity={fillOpacity}
                    opacity={obj.opacity ?? 1}
                />
            )
        case 'ellipse':
            return (
                <EllipseRenderer
                    center={obj.center}
                    radiusX={obj.radiusX}
                    radiusY={obj.radiusY}
                    strokeColor={strokeColor}
                    strokeWidth={strokeWidth}
                    lineType={obj.lineType ?? 'solid'}
                    fillColor={fillColor}
                    fillOpacity={fillOpacity}
                    opacity={obj.opacity ?? 1}
                />
            )
        case 'star':
            return (
                <StarRenderer
                    center={obj.center}
                    outerRadius={obj.outerRadius}
                    innerRadius={obj.innerRadius}
                    numPoints={obj.numPoints ?? 5}
                    strokeColor={strokeColor}
                    strokeWidth={strokeWidth}
                    lineType={obj.lineType ?? 'solid'}
                    fillColor={fillColor}
                    fillOpacity={fillOpacity}
                    opacity={obj.opacity ?? 1}
                />
            )
        case 'octagon':
            return (
                <OctagonRenderer
                    center={obj.center}
                    radius={obj.radius}
                    strokeColor={strokeColor}
                    strokeWidth={strokeWidth}
                    lineType={obj.lineType ?? 'solid'}
                    fillColor={fillColor}
                    fillOpacity={fillOpacity}
                    opacity={obj.opacity ?? 1}
                />
            )
        case 'roundedRect':
            return (
                <RoundedRectRenderer
                    origin={obj.origin}
                    width={obj.width}
                    height={obj.height}
                    cornerRadius={obj.cornerRadius ?? 0}
                    strokeColor={strokeColor}
                    strokeWidth={strokeWidth}
                    lineType={obj.lineType ?? 'solid'}
                    fillColor={fillColor}
                    fillOpacity={fillOpacity}
                    opacity={obj.opacity ?? 1}
                />
            )
        case 'arrow':
            return (
                <ArrowRenderer
                    start={obj.start}
                    end={obj.end}
                    strokeColor={strokeColor}
                    strokeWidth={strokeWidth}
                    lineType={obj.lineType ?? 'solid'}
                    opacity={obj.opacity ?? 1}
                    arrowHead={obj.arrowHead ?? 'end'}
                />
            )
        case 'text':
            return (
                <TextRenderer
                    position={obj.position}
                    text={obj.text}
                    fontSize={obj.fontSize}
                    fontFamily={obj.fontFamily}
                    textColor={isSelected ? SELECTED_COLOR : (obj.textColor ?? '#000000')}
                    outlineWidth={obj.outlineWidth}
                    outlineColor={obj.outlineColor}
                    opacity={obj.opacity ?? 1}
                />
            )
        case 'leader':
            return (
                <LeaderRenderer
                    targetPoint={obj.targetPoint}
                    textPosition={obj.textPosition}
                    text={obj.text}
                    fontSize={obj.fontSize}
                    fontFamily={obj.fontFamily}
                    textColor={isSelected ? SELECTED_COLOR : (obj.textColor ?? '#000000')}
                    strokeColor={strokeColor}
                    strokeWidth={strokeWidth}
                    lineType={obj.lineType ?? 'solid'}
                    opacity={obj.opacity ?? 1}
                />
            )
        default:
            return null
    }
}

export default DrawingObjectRenderer
