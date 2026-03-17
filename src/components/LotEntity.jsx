import React, { useMemo } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '../store/useStore'
import { useLot, useLotStyle, useLotVisibility, useDistrictParameters } from '../hooks/useEntityStore'
import Dimension from './Dimension'
import LotEditor from './LotEditor'
import BuildingEditor from './BuildingEditor'
import LotAnnotations from './LotAnnotations'
import LotAccessArrow from './LotAccessArrow'
import ImportedModelMesh from './ImportedModelMesh'
import MoveHandle from './BuildingEditor/MoveHandle'
import { formatDimension } from '../utils/formatUnits'

// Helper: compute total building height from story data
export const computeTotalHeight = (building) => {
    if (!building) return 0
    const stories = building.stories ?? 1
    const firstFloor = building.firstFloorHeight ?? 12
    const upperFloor = building.upperFloorHeight ?? 10
    if (stories <= 0) return 0
    if (stories === 1) return firstFloor
    return firstFloor + (stories - 1) * upperFloor
}

// ============================================
// Helper: resolve dimension label with custom labels
// ============================================
const resolveDimensionLabel = (value, dimensionKey, dimensionSettings) => {
    const customLabels = dimensionSettings?.customLabels || {}
    const labelConfig = customLabels[dimensionKey]
    if (labelConfig?.mode === 'custom') {
        return labelConfig.text || ''
    }
    return formatDimension(value, dimensionSettings?.unitFormat || 'feet')
}

// ============================================
// SingleLine — single lot/setback line segment
// ============================================
const SingleLine = ({ start, end, style, side, lineScale = 1 }) => {
    const override = style.overrides?.[side]
    const useOverride = override?.enabled

    const color = useOverride ? override.color : style.color
    const width = useOverride ? override.width : style.width
    const dashed = useOverride ? override.dashed : style.dashed
    const dashScale = (useOverride ? override.dashScale : style.dashScale) ?? 1
    const dashSize = (useOverride ? override.dashSize : style.dashSize) ?? 3
    const gapSize = (useOverride ? override.gapSize : style.gapSize) ?? 2

    return (
        <Line
            points={[start, end]}
            color={color}
            lineWidth={width * lineScale}
            dashed={dashed}
            dashScale={dashed ? dashScale : 1}
            dashSize={dashSize}
            gapSize={gapSize}
            transparent
            opacity={style.opacity}
            renderOrder={3}
        />
    )
}

// ============================================
// computeSetbackInner — inner rectangle bounds from setbacks
// ============================================
const computeSetbackInner = (lotWidth, lotDepth, setbacks, streetSides) => {
    if (!setbacks) return null
    const { front, rear, sideInterior, minSideStreet } = setbacks
    const leftValue = streetSides?.left ? (minSideStreet ?? 0) : (sideInterior ?? 0)
    const rightValue = streetSides?.right ? (minSideStreet ?? 0) : (sideInterior ?? 0)
    const frontValue = front ?? 0
    const rearValue = rear ?? 0
    const w2 = lotWidth / 2, d2 = lotDepth / 2
    const x1 = -w2 + leftValue
    const y1 = -d2 + frontValue
    const x2 = w2 - rightValue
    const y2 = d2 - rearValue
    if (x2 <= x1 || y2 <= y1) return null
    return { x1, y1, x2, y2 }
}

// ============================================
// LotFillFrame — lot fill with inner hole cut out
// ============================================
const LotFillFrame = ({ width, depth, innerX1, innerY1, innerX2, innerY2, style, z = 0.001 }) => {
    const geometry = useMemo(() => {
        const w2 = width / 2, d2 = depth / 2
        const outer = new THREE.Shape()
        outer.moveTo(-w2, -d2)
        outer.lineTo(w2, -d2)
        outer.lineTo(w2, d2)
        outer.lineTo(-w2, d2)
        outer.closePath()
        const hole = new THREE.Path()
        hole.moveTo(innerX1, innerY1)
        hole.lineTo(innerX2, innerY1)
        hole.lineTo(innerX2, innerY2)
        hole.lineTo(innerX1, innerY2)
        hole.closePath()
        outer.holes.push(hole)
        return new THREE.ShapeGeometry(outer)
    }, [width, depth, innerX1, innerY1, innerX2, innerY2])

    return (
        <mesh position={[0, 0, z]} geometry={geometry} receiveShadow>
            <meshStandardMaterial
                color={style.color}
                opacity={style.opacity}
                transparent={style.opacity < 1}
                side={THREE.FrontSide}
                depthWrite={style.opacity >= 0.95}
                roughness={1} metalness={0}
            />
        </mesh>
    )
}

// ============================================
// RectLot — rectangular lot lines + fill + dimensions
// ============================================
const RectLot = ({ width, depth, style, fillStyle, setbackFillActive = false, setbackInner = null, setbackFillStyle = null, showWidthDimensions = false, showDepthDimensions = false, dimensionSettings = {}, lineScale = 1, lotIndex = 1 }) => {
    const w2 = width / 2
    const d2 = depth / 2

    const p1 = [-w2, -d2, 0.03]
    const p2 = [w2, -d2, 0.03]
    const p3 = [w2, d2, 0.03]
    const p4 = [-w2, d2, 0.03]

    return (
        <group>
            {fillStyle.visible && setbackFillActive && setbackInner && setbackFillStyle ? (
                <>
                    <LotFillFrame
                        width={width} depth={depth}
                        innerX1={setbackInner.x1} innerY1={setbackInner.y1}
                        innerX2={setbackInner.x2} innerY2={setbackInner.y2}
                        style={fillStyle}
                    />
                    <mesh position={[(setbackInner.x1 + setbackInner.x2) / 2, (setbackInner.y1 + setbackInner.y2) / 2, 0.001]} receiveShadow>
                        <planeGeometry args={[setbackInner.x2 - setbackInner.x1, setbackInner.y2 - setbackInner.y1]} />
                        <meshStandardMaterial
                            color={setbackFillStyle.color ?? '#90EE90'}
                            opacity={setbackFillStyle.opacity ?? 0.3}
                            transparent={(setbackFillStyle.opacity ?? 0.3) < 1}
                            side={THREE.FrontSide}
                            depthWrite={(setbackFillStyle.opacity ?? 0.3) >= 0.95}
                            roughness={1} metalness={0}
                        />
                    </mesh>
                </>
            ) : fillStyle.visible ? (
                <mesh position={[0, 0, 0.001]} receiveShadow>
                    <planeGeometry args={[width, depth]} />
                    <meshStandardMaterial
                        color={fillStyle.color}
                        opacity={fillStyle.opacity}
                        transparent={fillStyle.opacity < 1}
                        side={THREE.FrontSide}
                        depthWrite={fillStyle.opacity >= 0.95}
                        roughness={1}
                        metalness={0}
                    />
                </mesh>
            ) : null}

            <SingleLine start={p1} end={p2} style={style} side="front" lineScale={lineScale} />
            <SingleLine start={p2} end={p3} style={style} side="right" lineScale={lineScale} />
            <SingleLine start={p3} end={p4} style={style} side="rear" lineScale={lineScale} />
            <SingleLine start={p4} end={p1} style={style} side="left" lineScale={lineScale} />

            {/* Width dimension (front edge) */}
            <Dimension
                start={p1} end={p2}
                label={resolveDimensionLabel(width, 'lotWidth', dimensionSettings)}
                offset={dimensionSettings?.verticalMode ? +(dimensionSettings?.verticalOffset ?? 20) : -(dimensionSettings?.lotDimOffset ?? 15)}
                color="black"
                visible={showWidthDimensions}
                settings={dimensionSettings}
                lineScale={lineScale}
            />

            {/* Depth dimension (left or right side) — independent offset + text settings */}
            {(() => {
                const vMode = dimensionSettings?.verticalMode
                const vOffset = dimensionSettings?.verticalOffset ?? 20
                const depthOffset = dimensionSettings?.lotDepthDimOffset ?? dimensionSettings?.lotDimOffset ?? 15
                const effectiveDepthDimSide = lotIndex === 1
                    ? (dimensionSettings?.lotDepthDimSide ?? 'right')
                    : 'left'
                const depthSettings = dimensionSettings ? {
                    ...dimensionSettings,
                    textPerpOffset: dimensionSettings.textPerpOffsetDepth ?? 0,
                    textAnchorY: dimensionSettings.textAnchorYDepth ?? 'center',
                    textMode: dimensionSettings.textModeDepth ?? 'billboard',
                } : dimensionSettings
                return effectiveDepthDimSide === 'left' ? (
                    <Dimension
                        start={p4} end={p1}
                        label={resolveDimensionLabel(depth, 'lotDepth', dimensionSettings)}
                        offset={vMode ? +vOffset : -depthOffset}
                        color="black"
                        visible={showDepthDimensions}
                        settings={depthSettings}
                        flipText={false}
                        lineScale={lineScale}
                    />
                ) : (
                    <Dimension
                        start={p3} end={p2}
                        label={resolveDimensionLabel(depth, 'lotDepth', dimensionSettings)}
                        offset={vMode ? +vOffset : +depthOffset}
                        color="black"
                        visible={showDepthDimensions}
                        settings={depthSettings}
                        flipText={false}
                        lineScale={lineScale}
                    />
                )
            })()}
        </group>
    )
}

// ============================================
// SetbackFillOutline — outline lines for buildable area (fill handled by RectLot)
// ============================================
const SetbackFillOutline = ({ lotWidth, lotDepth, setbacks, style, streetSides = {}, lineScale = 1 }) => {
    const { front, rear, sideInterior, minSideStreet } = setbacks
    const leftValue = streetSides.left ? (minSideStreet ?? 0) : (sideInterior ?? 0)
    const rightValue = streetSides.right ? (minSideStreet ?? 0) : (sideInterior ?? 0)
    const frontValue = front ?? 0
    const rearValue = rear ?? 0

    const fillWidth = lotWidth - leftValue - rightValue
    const fillDepth = lotDepth - frontValue - rearValue
    if (fillWidth <= 0 || fillDepth <= 0) return null

    const x1 = -lotWidth / 2 + leftValue, x2 = lotWidth / 2 - rightValue
    const y1 = -lotDepth / 2 + frontValue, y2 = lotDepth / 2 - rearValue
    const z = 0.07
    const p1 = [x1, y1, z]
    const p2 = [x2, y1, z]
    const p3 = [x2, y2, z]
    const p4 = [x1, y2, z]

    const lineStyle = {
        color: style.lineColor ?? '#228B22',
        width: style.lineWidth ?? 1,
        dashed: style.lineDashed ?? false,
        opacity: 1,
    }

    return (
        <group>
            <SingleLine start={p1} end={p2} style={lineStyle} side="front" lineScale={lineScale} />
            <SingleLine start={p2} end={p3} style={lineStyle} side="right" lineScale={lineScale} />
            <SingleLine start={p3} end={p4} style={lineStyle} side="rear" lineScale={lineScale} />
            <SingleLine start={p4} end={p1} style={lineStyle} side="left" lineScale={lineScale} />
        </group>
    )
}

// ============================================
// SetbackLines — setback rectangle inside lot
// ============================================
const SetbackLines = ({ lotWidth, lotDepth, setbacks, style, streetSides = {}, showDimensions = false, dimensionSettings = {}, lineScale = 1 }) => {
    const { front, rear, sideInterior, minSideStreet } = setbacks

    // Street-facing sides use minSideStreet; interior sides use sideInterior
    const leftValue = streetSides.left ? minSideStreet : sideInterior
    const rightValue = streetSides.right ? minSideStreet : sideInterior

    // Only render lines for sides with actual positive values
    const hasFront = front != null && front > 0
    const hasRear = rear != null && rear > 0
    const hasSideLeft = leftValue != null && leftValue > 0
    const hasSideRight = rightValue != null && rightValue > 0

    if (!hasFront && !hasRear && !hasSideLeft && !hasSideRight) return null

    // Positions: qualifying sides use their setback offset, others fall to lot edge
    const y1 = hasFront ? -lotDepth / 2 + front : -lotDepth / 2
    const y2 = hasRear ? lotDepth / 2 - rear : lotDepth / 2
    const x1 = hasSideLeft ? -lotWidth / 2 + leftValue : -lotWidth / 2
    const x2 = hasSideRight ? lotWidth / 2 - rightValue : lotWidth / 2

    const p1 = [x1, y1, 0.1]
    const p2 = [x2, y1, 0.1]
    const p3 = [x2, y2, 0.1]
    const p4 = [x1, y2, 0.1]

    return (
        <group>
            {hasFront && <SingleLine start={p1} end={p2} style={style} side="front" lineScale={lineScale} />}
            {hasSideRight && <SingleLine start={p2} end={p3} style={style} side="right" lineScale={lineScale} />}
            {hasRear && <SingleLine start={p3} end={p4} style={style} side="rear" lineScale={lineScale} />}
            {hasSideLeft && <SingleLine start={p4} end={p1} style={style} side="left" lineScale={lineScale} />}

            {/* Front Setback dimension */}
            {hasFront && (
                <Dimension
                    start={[0, -lotDepth / 2, 0.1]}
                    end={[0, y1, 0.1]}
                    label={resolveDimensionLabel(front, 'setbackFront', dimensionSettings)}
                    offset={dimensionSettings.setbackDimOffset ?? 5}
                    color={style.color || 'red'}
                    visible={showDimensions}
                    settings={dimensionSettings}
                    lineScale={lineScale}
                />
            )}
            {/* Rear Setback dimension */}
            {hasRear && (
                <Dimension
                    start={[0, y2, 0.1]}
                    end={[0, lotDepth / 2, 0.1]}
                    label={resolveDimensionLabel(rear, 'setbackRear', dimensionSettings)}
                    offset={dimensionSettings.setbackDimOffset ?? 5}
                    color={style.color || 'red'}
                    visible={showDimensions}
                    settings={dimensionSettings}
                    lineScale={lineScale}
                />
            )}
            {/* Left Setback dimension */}
            {hasSideLeft && (() => {
                const sideY = -lotDepth / 2 + (dimensionSettings.sideSetbackDimYPosition ?? 0.5) * lotDepth
                return (
                <Dimension
                    start={[-lotWidth / 2, sideY, 0.1]}
                    end={[x1, sideY, 0.1]}
                    label={resolveDimensionLabel(leftValue, streetSides.left ? 'setbackSideStreet' : 'setbackSideInterior', dimensionSettings)}
                    offset={dimensionSettings.setbackDimOffset ?? 5}
                    color={style.color || 'red'}
                    visible={showDimensions}
                    settings={dimensionSettings}
                    lineScale={lineScale}
                />
                )
            })()}
            {/* Right Setback dimension */}
            {hasSideRight && (() => {
                const sideY = -lotDepth / 2 + (dimensionSettings.sideSetbackDimYPosition ?? 0.5) * lotDepth
                return (
                <Dimension
                    start={[x2, sideY, 0.1]}
                    end={[lotWidth / 2, sideY, 0.1]}
                    label={resolveDimensionLabel(rightValue, streetSides.right ? 'setbackSideStreet' : 'setbackSideInterior', dimensionSettings)}
                    offset={dimensionSettings.setbackDimOffset ?? 5}
                    color={style.color || 'red'}
                    visible={showDimensions}
                    settings={dimensionSettings}
                    lineScale={lineScale}
                />
                )
            })()}
        </group>
    )
}

// ============================================
// MaxSetbackLines — individual max setback lines
// Only renders lines for sides where a max value is set.
// Front uses maxFront; street-facing sides use maxSideStreet.
// ============================================
const MaxSetbackLines = ({ lotWidth, lotDepth, setbacks, style, streetSides = {}, lineScale = 1, showMaxFrontDim, showMaxSideStreetDim, dimensionSettings }) => {
    const { maxFront, maxSideStreet, front, rear, sideInterior, minSideStreet } = setbacks
    const z = 0.12 // Above min setback lines at z=0.1

    // Resolve per-side min setback values (same logic as SetbackLines)
    const leftMinValue = streetSides.left ? minSideStreet : sideInterior
    const rightMinValue = streetSides.right ? minSideStreet : sideInterior

    // Compute clipped boundaries from min setbacks (fall back to lot edge if no min setback)
    const hasMinLeft = leftMinValue != null && leftMinValue > 0
    const hasMinRight = rightMinValue != null && rightMinValue > 0
    const hasMinFront = front != null && front > 0
    const hasRear = rear != null && rear > 0

    const x1 = hasMinLeft ? -lotWidth / 2 + leftMinValue : -lotWidth / 2
    const x2 = hasMinRight ? lotWidth / 2 - rightMinValue : lotWidth / 2
    const y1 = hasMinFront ? -lotDepth / 2 + front : -lotDepth / 2
    const y2 = hasRear ? lotDepth / 2 - rear : lotDepth / 2

    // Max side street lines start at the max front line (L corner), not the min front line
    const yMaxFront = (maxFront != null && maxFront > 0)
        ? -lotDepth / 2 + maxFront
        : y1

    const lines = []

    // Max front setback line (horizontal, clipped at max side street position on street side)
    if (maxFront != null && maxFront > 0) {
        const y = -lotDepth / 2 + maxFront
        // On the street side, clip at max side street position (L corner) instead of min side setback
        const hasMaxLeft = streetSides.left && maxSideStreet != null && maxSideStreet > 0
        const hasMaxRight = streetSides.right && maxSideStreet != null && maxSideStreet > 0
        const fx1 = hasMaxLeft ? -lotWidth / 2 + maxSideStreet : x1
        const fx2 = hasMaxRight ? lotWidth / 2 - maxSideStreet : x2
        lines.push({ start: [fx1, y, z], end: [fx2, y, z], side: 'front' })
    }

    // Max side street setback lines (vertical, from L-corner to rear setback)
    if (maxSideStreet != null && maxSideStreet > 0) {
        if (streetSides.left) {
            const x = -lotWidth / 2 + maxSideStreet
            lines.push({ start: [x, yMaxFront, z], end: [x, y2, z], side: 'left' })
        }
        if (streetSides.right) {
            const x = lotWidth / 2 - maxSideStreet
            lines.push({ start: [x, yMaxFront, z], end: [x, y2, z], side: 'right' })
        }
    }

    if (lines.length === 0) return null

    return (
        <group>
            {lines.map((line, i) => (
                <SingleLine key={i} start={line.start} end={line.end} style={style} side={line.side} lineScale={lineScale} />
            ))}
            {/* Max front setback dimension */}
            {showMaxFrontDim && maxFront != null && maxFront > 0 && dimensionSettings && (
                <Dimension
                    start={[0, -lotDepth / 2, z]}
                    end={[0, -lotDepth / 2 + maxFront, z]}
                    label={resolveDimensionLabel(maxFront, 'setbackMaxFront', dimensionSettings)}
                    offset={dimensionSettings.maxFrontSetbackDimOffset ?? 5}
                    color={style.color || '#FF9800'}
                    visible={true}
                    settings={dimensionSettings}
                    lineScale={lineScale}
                />
            )}
            {/* Max side street setback dimension (first street side found) */}
            {showMaxSideStreetDim && maxSideStreet != null && maxSideStreet > 0 && dimensionSettings && (() => {
                const sideY = -lotDepth / 2 + (dimensionSettings.sideSetbackDimYPosition ?? 0.5) * lotDepth
                if (streetSides.left) {
                    return (
                        <Dimension
                            start={[-lotWidth / 2, sideY, z]}
                            end={[-lotWidth / 2 + maxSideStreet, sideY, z]}
                            label={resolveDimensionLabel(maxSideStreet, 'setbackMaxSideStreet', dimensionSettings)}
                            offset={dimensionSettings.maxSideStreetSetbackDimOffset ?? 5}
                            color={style.color || '#FF9800'}
                            visible={true}
                            settings={dimensionSettings}
                            lineScale={lineScale}
                        />
                    )
                }
                if (streetSides.right) {
                    return (
                        <Dimension
                            start={[lotWidth / 2 - maxSideStreet, sideY, z]}
                            end={[lotWidth / 2, sideY, z]}
                            label={resolveDimensionLabel(maxSideStreet, 'setbackMaxSideStreet', dimensionSettings)}
                            offset={dimensionSettings.maxSideStreetSetbackDimOffset ?? 5}
                            color={style.color || '#FF9800'}
                            visible={true}
                            settings={dimensionSettings}
                            lineScale={lineScale}
                        />
                    )
                }
                return null
            })()}
        </group>
    )
}

// ============================================
// AccessorySetbackLines — accessory setback lines
// Renders sides where accessory setback has a positive value.
// ============================================
const AccessorySetbackLines = ({ lotWidth, lotDepth, accessorySetbacks, style, streetSides = {}, lineScale = 1 }) => {
    const { front: aFront, rear: aRear, sideInterior: aSideInt, sideStreet: aSideStr } = accessorySetbacks

    // Street-facing sides use sideStreet; interior sides use sideInterior
    const aLeftValue = streetSides.left ? aSideStr : aSideInt
    const aRightValue = streetSides.right ? aSideStr : aSideInt

    // Only render lines for sides with actual positive values
    const hasFront = aFront != null && aFront > 0
    const hasRear = aRear != null && aRear > 0
    const hasSideLeft = aLeftValue != null && aLeftValue > 0
    const hasSideRight = aRightValue != null && aRightValue > 0

    if (!hasFront && !hasRear && !hasSideLeft && !hasSideRight) return null

    const z = 0.11 // Between min setbacks (0.1) and max setbacks (0.12)

    // Positions: qualifying sides use their setback offset, others fall to lot edge
    const y1 = hasFront ? -lotDepth / 2 + aFront : -lotDepth / 2
    const y2 = hasRear ? lotDepth / 2 - aRear : lotDepth / 2
    const x1 = hasSideLeft ? -lotWidth / 2 + aLeftValue : -lotWidth / 2
    const x2 = hasSideRight ? lotWidth / 2 - aRightValue : lotWidth / 2

    const p1 = [x1, y1, z]
    const p2 = [x2, y1, z]
    const p3 = [x2, y2, z]
    const p4 = [x1, y2, z]

    return (
        <group>
            {hasFront && <SingleLine start={p1} end={p2} style={style} side="front" lineScale={lineScale} />}
            {hasSideRight && <SingleLine start={p2} end={p3} style={style} side="right" lineScale={lineScale} />}
            {hasRear && <SingleLine start={p3} end={p4} style={style} side="rear" lineScale={lineScale} />}
            {hasSideLeft && <SingleLine start={p4} end={p1} style={style} side="left" lineScale={lineScale} />}
        </group>
    )
}

// ============================================
// PlacementZone — ground-plane polygon showing where building must be placed
// Appears between min and max front/side street setbacks.
// ============================================
const PlacementZone = ({ lotWidth, lotDepth, setbacks, style, streetSides = {}, lineScale = 1 }) => {
    const { front, rear, sideInterior, minSideStreet, maxFront, maxSideStreet } = setbacks

    const hasMaxFront = maxFront != null && maxFront > 0
    const hasMaxSideLeft = streetSides.left && maxSideStreet != null && maxSideStreet > 0
    const hasMaxSideRight = streetSides.right && maxSideStreet != null && maxSideStreet > 0

    if (!hasMaxFront && !hasMaxSideLeft && !hasMaxSideRight) return null

    const shape = useMemo(() => {
        const w2 = lotWidth / 2
        const d2 = lotDepth / 2

        // Outer boundary = min setback positions
        const minFrontY = (front != null && front > 0) ? -d2 + front : -d2
        const rearY = (rear != null && rear > 0) ? d2 - rear : d2
        const leftMinX = streetSides.left
            ? (minSideStreet != null && minSideStreet > 0 ? -w2 + minSideStreet : -w2)
            : (sideInterior != null && sideInterior > 0 ? -w2 + sideInterior : -w2)
        const rightMinX = streetSides.right
            ? (minSideStreet != null && minSideStreet > 0 ? w2 - minSideStreet : w2)
            : (sideInterior != null && sideInterior > 0 ? w2 - sideInterior : w2)

        // Inner boundary = max setback positions
        const maxFrontY = hasMaxFront ? -d2 + maxFront : minFrontY
        const maxSideLeftX = hasMaxSideLeft ? -w2 + maxSideStreet : leftMinX
        const maxSideRightX = hasMaxSideRight ? w2 - maxSideStreet : rightMinX

        // Build shape as a polygon ring (outer minus inner buildable area)
        const s = new THREE.Shape()
        const pts = []

        if (hasMaxFront && !hasMaxSideLeft && !hasMaxSideRight) {
            // Front strip only: rectangle from minFront to maxFront
            pts.push([leftMinX, minFrontY])
            pts.push([rightMinX, minFrontY])
            pts.push([rightMinX, maxFrontY])
            pts.push([leftMinX, maxFrontY])
        } else if (!hasMaxFront && (hasMaxSideLeft || hasMaxSideRight)) {
            // Side strip(s) only: from front setback to rear setback
            if (hasMaxSideLeft) {
                pts.push([leftMinX, minFrontY])
                pts.push([maxSideLeftX, minFrontY])
                pts.push([maxSideLeftX, rearY])
                pts.push([leftMinX, rearY])
            }
            if (hasMaxSideRight && !hasMaxSideLeft) {
                pts.push([maxSideRightX, minFrontY])
                pts.push([rightMinX, minFrontY])
                pts.push([rightMinX, rearY])
                pts.push([maxSideRightX, rearY])
            }
            if (hasMaxSideRight && hasMaxSideLeft) {
                // Two separate strips — use hole approach instead; for simplicity, make U-shape
                // Reset and build full outer with inner cutout
                pts.length = 0
                pts.push([leftMinX, minFrontY])
                pts.push([rightMinX, minFrontY])
                pts.push([rightMinX, rearY])
                pts.push([leftMinX, rearY])
                // Will add hole below
            }
        } else if (hasMaxFront && (hasMaxSideLeft || hasMaxSideRight)) {
            // L-shape or U-shape: front strip + side strip(s)
            if (hasMaxSideLeft && hasMaxSideRight) {
                // U-shape: outer rectangle with inner cutout
                pts.push([leftMinX, minFrontY])
                pts.push([rightMinX, minFrontY])
                pts.push([rightMinX, rearY])
                pts.push([leftMinX, rearY])
            } else if (hasMaxSideLeft) {
                // L-shape: front strip + left side strip
                pts.push([leftMinX, minFrontY])
                pts.push([rightMinX, minFrontY])
                pts.push([rightMinX, maxFrontY])
                pts.push([maxSideLeftX, maxFrontY])
                pts.push([maxSideLeftX, rearY])
                pts.push([leftMinX, rearY])
            } else {
                // L-shape: front strip + right side strip
                pts.push([leftMinX, minFrontY])
                pts.push([rightMinX, minFrontY])
                pts.push([rightMinX, rearY])
                pts.push([maxSideRightX, rearY])
                pts.push([maxSideRightX, maxFrontY])
                pts.push([leftMinX, maxFrontY])
            }
        }

        if (pts.length < 3) return null

        s.moveTo(pts[0][0], pts[0][1])
        for (let i = 1; i < pts.length; i++) {
            s.lineTo(pts[i][0], pts[i][1])
        }
        s.closePath()

        // For U-shape or both-sides-only, cut out the inner buildable area
        const needsHole = (hasMaxFront && hasMaxSideLeft && hasMaxSideRight) ||
            (!hasMaxFront && hasMaxSideLeft && hasMaxSideRight)
        if (needsHole) {
            const hole = new THREE.Path()
            hole.moveTo(maxSideLeftX, maxFrontY)
            hole.lineTo(maxSideRightX, maxFrontY)
            hole.lineTo(maxSideRightX, rearY)
            hole.lineTo(maxSideLeftX, rearY)
            hole.closePath()
            s.holes.push(hole)
        }

        return { shape: s, outlinePts: pts }
    }, [lotWidth, lotDepth, front, rear, sideInterior, minSideStreet, maxFront, maxSideStreet, streetSides.left, streetSides.right, hasMaxFront, hasMaxSideLeft, hasMaxSideRight])

    if (!shape) return null

    const { opacity = 0.25 } = style
    const zFill = 0.06
    const zLine = 0.065

    // Build outline segments from polygon points
    const outlineSegments = useMemo(() => {
        const { outlinePts } = shape
        const segs = []
        for (let i = 0; i < outlinePts.length; i++) {
            const a = outlinePts[i]
            const b = outlinePts[(i + 1) % outlinePts.length]
            segs.push([[a[0], a[1], zLine], [b[0], b[1], zLine]])
        }
        return segs
    }, [shape, zLine])

    return (
        <group>
            {/* Fill */}
            <mesh position={[0, 0, zFill]} rotation={[0, 0, 0]}>
                <shapeGeometry args={[shape.shape]} />
                <meshStandardMaterial
                    color={style.color ?? '#FFD700'}
                    opacity={opacity}
                    transparent={opacity < 1}
                    depthWrite={opacity >= 0.95}
                    side={THREE.FrontSide}
                    roughness={1}
                    metalness={0}
                />
            </mesh>
            {/* Outline */}
            {outlineSegments.map((seg, i) => (
                <Line
                    key={i}
                    points={seg}
                    color={style.lineColor ?? '#DAA520'}
                    lineWidth={(style.lineWidth ?? 1) * lineScale}
                    dashed={style.lineDashed ?? false}
                    dashSize={style.lineDashSize ?? 3}
                    gapSize={style.lineGapSize ?? 2}
                    dashScale={1}
                />
            ))}
        </group>
    )
}

// ============================================
// ParkingSetbackLines — parking setback lines + dimensions
// Renders sides where parking setback has a positive value.
// ============================================
const ParkingSetbackLines = ({ lotWidth, lotDepth, parkingSetbacks, style, streetSides = {}, showDimensions = false, dimensionSettings = {}, lineScale = 1 }) => {
    const { front: pFront, rear: pRear, sideInterior: pSideInt, sideStreet: pSideStr } = parkingSetbacks

    // Street-facing sides use sideStreet; interior sides use sideInterior
    const pLeftValue = streetSides.left ? pSideStr : pSideInt
    const pRightValue = streetSides.right ? pSideStr : pSideInt

    // Only render lines for sides with actual positive values
    const hasFront = pFront != null && pFront > 0
    const hasRear = pRear != null && pRear > 0
    const hasSideLeft = pLeftValue != null && pLeftValue > 0
    const hasSideRight = pRightValue != null && pRightValue > 0

    if (!hasFront && !hasRear && !hasSideLeft && !hasSideRight) return null

    const z = 0.13 // Above max setbacks (0.12), below lot access arrows (0.15)

    // Positions: qualifying sides use their setback offset, others fall to lot edge
    const y1 = hasFront ? -lotDepth / 2 + pFront : -lotDepth / 2
    const y2 = hasRear ? lotDepth / 2 - pRear : lotDepth / 2
    const x1 = hasSideLeft ? -lotWidth / 2 + pLeftValue : -lotWidth / 2
    const x2 = hasSideRight ? lotWidth / 2 - pRightValue : lotWidth / 2

    const p1 = [x1, y1, z]
    const p2 = [x2, y1, z]
    const p3 = [x2, y2, z]
    const p4 = [x1, y2, z]

    return (
        <group>
            {hasFront && <SingleLine start={p1} end={p2} style={style} side="front" lineScale={lineScale} />}
            {hasSideRight && <SingleLine start={p2} end={p3} style={style} side="right" lineScale={lineScale} />}
            {hasRear && <SingleLine start={p3} end={p4} style={style} side="rear" lineScale={lineScale} />}
            {hasSideLeft && <SingleLine start={p4} end={p1} style={style} side="left" lineScale={lineScale} />}

            {/* Front Parking Setback dimension */}
            {hasFront && (
                <Dimension
                    start={[0, -lotDepth / 2, z]}
                    end={[0, y1, z]}
                    label={resolveDimensionLabel(pFront, 'parkingSetbackFront', dimensionSettings)}
                    offset={dimensionSettings.setbackDimOffset ?? 5}
                    color={style.color || '#FF9800'}
                    visible={showDimensions}
                    settings={dimensionSettings}
                    lineScale={lineScale}
                />
            )}
            {/* Rear Parking Setback dimension */}
            {hasRear && (
                <Dimension
                    start={[0, y2, z]}
                    end={[0, lotDepth / 2, z]}
                    label={resolveDimensionLabel(pRear, 'parkingSetbackRear', dimensionSettings)}
                    offset={dimensionSettings.setbackDimOffset ?? 5}
                    color={style.color || '#FF9800'}
                    visible={showDimensions}
                    settings={dimensionSettings}
                    lineScale={lineScale}
                />
            )}
            {/* Left Parking Setback dimension */}
            {hasSideLeft && (() => {
                const sideY = -lotDepth / 2 + (dimensionSettings.sideSetbackDimYPosition ?? 0.5) * lotDepth
                return (
                <Dimension
                    start={[-lotWidth / 2, sideY, z]}
                    end={[x1, sideY, z]}
                    label={resolveDimensionLabel(pLeftValue, streetSides.left ? 'parkingSetbackSideStreet' : 'parkingSetbackSideInterior', dimensionSettings)}
                    offset={dimensionSettings.setbackDimOffset ?? 5}
                    color={style.color || '#FF9800'}
                    visible={showDimensions}
                    settings={dimensionSettings}
                    lineScale={lineScale}
                />
                )
            })()}
            {/* Right Parking Setback dimension */}
            {hasSideRight && (() => {
                const sideY = -lotDepth / 2 + (dimensionSettings.sideSetbackDimYPosition ?? 0.5) * lotDepth
                return (
                <Dimension
                    start={[x2, sideY, z]}
                    end={[lotWidth / 2, sideY, z]}
                    label={resolveDimensionLabel(pRightValue, streetSides.right ? 'parkingSetbackSideStreet' : 'parkingSetbackSideInterior', dimensionSettings)}
                    offset={dimensionSettings.setbackDimOffset ?? 5}
                    color={style.color || '#FF9800'}
                    visible={showDimensions}
                    settings={dimensionSettings}
                    lineScale={lineScale}
                />
                )
            })()}
        </group>
    )
}

// ============================================
// BTZPlanes — vertical Build-To Zone planes on
// building facades (front and street-facing side)
// ============================================
const BTZPlanes = ({ principal, setbacks, streetSides = {}, style }) => {
    const btzFront = setbacks?.btzFront
    const btzSideStreet = setbacks?.btzSideStreet

    const buildingWidth = principal.width ?? 0
    const buildingDepth = principal.depth ?? 0
    const firstFloorHeight = principal.firstFloorHeight ?? 12
    const px = principal.x ?? 0
    const py = principal.y ?? 0

    const planes = []

    // --- BTZ Front Plane ---
    if (btzFront != null && btzFront > 0 && buildingWidth > 0) {
        const planeWidth = (btzFront / 100) * buildingWidth
        const planeHeight = firstFloorHeight

        // Building front face y position
        const buildingFrontY = py - buildingDepth / 2
        // Offset 0.1 ft (~1.2 in) toward front of lot (negative Y) for depth buffer margin
        const planeY = buildingFrontY - 0.1

        // Left-aligned: starts at left edge of building
        const buildingLeftX = px - buildingWidth / 2
        const planeCenterX = buildingLeftX + planeWidth / 2

        planes.push(
            <mesh
                key="btz-front"
                position={[planeCenterX, planeY, planeHeight / 2]}
                rotation={[Math.PI / 2, 0, 0]}
                renderOrder={5}
            >
                <planeGeometry args={[planeWidth, planeHeight]} />
                <meshStandardMaterial
                    color={style.color}
                    opacity={style.opacity}
                    transparent={style.opacity < 1}
                    side={THREE.FrontSide}
                    depthWrite={style.opacity >= 0.95}
                    polygonOffset
                    polygonOffsetFactor={-1}
                    polygonOffsetUnits={-1}
                    roughness={1}
                    metalness={0}
                />
            </mesh>
        )
    }

    // --- BTZ Side Street Plane (corner lots only) ---
    if (btzSideStreet != null && btzSideStreet > 0 && buildingDepth > 0) {
        const planeWidth = (btzSideStreet / 100) * buildingDepth
        const planeHeight = firstFloorHeight

        // Building front face y for left-alignment (front corner of side face)
        const buildingFrontY = py - buildingDepth / 2

        // Helper: create a BufferGeometry quad in the YZ plane (no rotation needed)
        const createSideQuad = (w, h) => {
            const positions = new Float32Array([
                0, 0, 0,
                0, w, 0,
                0, w, h,
                0, 0, h,
            ])
            const indices = new Uint16Array([0, 1, 2, 0, 2, 3])
            const geo = new THREE.BufferGeometry()
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
            geo.setIndex(new THREE.BufferAttribute(indices, 1))
            geo.computeVertexNormals()
            return geo
        }

        // Left street side
        if (streetSides.left) {
            const buildingLeftX = px - buildingWidth / 2
            const planeX = buildingLeftX - 0.1

            planes.push(
                <mesh
                    key="btz-side-left"
                    position={[planeX, buildingFrontY, 0]}
                    geometry={createSideQuad(planeWidth, planeHeight)}
                    renderOrder={5}
                >
                    <meshStandardMaterial
                        color={style.color}
                        opacity={style.opacity}
                        transparent={style.opacity < 1}
                        side={THREE.FrontSide}
                        depthWrite={style.opacity >= 0.95}
                        polygonOffset
                        polygonOffsetFactor={-1}
                        polygonOffsetUnits={-1}
                        roughness={1}
                        metalness={0}
                    />
                </mesh>
            )
        }

        // Right street side
        if (streetSides.right) {
            const buildingRightX = px + buildingWidth / 2
            const planeX = buildingRightX + 0.1

            planes.push(
                <mesh
                    key="btz-side-right"
                    position={[planeX, buildingFrontY, 0]}
                    geometry={createSideQuad(planeWidth, planeHeight)}
                    renderOrder={5}
                >
                    <meshStandardMaterial
                        color={style.color}
                        opacity={style.opacity}
                        transparent={style.opacity < 1}
                        side={THREE.FrontSide}
                        depthWrite={style.opacity >= 0.95}
                        polygonOffset
                        polygonOffsetFactor={-1}
                        polygonOffsetUnits={-1}
                        roughness={1}
                        metalness={0}
                    />
                </mesh>
            )
        }
    }

    if (planes.length === 0) return null

    return <group>{planes}</group>
}

// ============================================
// MaxHeightPlaneStandalone — renders height plane
// when building layer is off but height plane layer is on
// ============================================
const MaxHeightPlaneStandalone = ({ building, maxHeight, style: planeStyle, lineScale }) => {
    const vertices = useMemo(() => {
        const geo = building.geometry
        if (geo?.mode === 'polygon' && geo?.vertices?.length >= 3) return geo.vertices
        const { x = 0, y = 0, width, depth } = building
        return [
            { x: x - width / 2, y: y - depth / 2 },
            { x: x + width / 2, y: y - depth / 2 },
            { x: x + width / 2, y: y + depth / 2 },
            { x: x - width / 2, y: y + depth / 2 },
        ]
    }, [building])

    const shape = useMemo(() => {
        if (!vertices || vertices.length < 3) return null
        const s = new THREE.Shape()
        s.moveTo(vertices[0].x, vertices[0].y)
        for (let i = 1; i < vertices.length; i++) s.lineTo(vertices[i].x, vertices[i].y)
        s.closePath()
        return s
    }, [vertices])

    const borderPoints = useMemo(() => {
        if (!vertices || vertices.length < 3) return null
        const pts = vertices.map(v => [v.x, v.y, 0])
        pts.push([vertices[0].x, vertices[0].y, 0])
        return pts
    }, [vertices])

    if (!shape || !borderPoints) return null

    return (
        <group position={[0, 0, maxHeight + 0.05]}>
            <mesh renderOrder={6}>
                <shapeGeometry args={[shape]} />
                <meshStandardMaterial
                    color={planeStyle.color ?? '#FF6B6B'}
                    transparent={(planeStyle.opacity ?? 0.3) < 1}
                    opacity={planeStyle.opacity ?? 0.3}
                    side={THREE.DoubleSide}
                    depthWrite={(planeStyle.opacity ?? 0.3) >= 0.95}
                />
            </mesh>
            <Line
                points={borderPoints}
                color={planeStyle.lineColor || '#FF0000'}
                lineWidth={(planeStyle.lineWidth || 2) * lineScale}
                dashed={planeStyle.lineDashed || false}
                dashSize={planeStyle.lineDashSize ?? 1}
                gapSize={planeStyle.lineGapSize ?? 0.5}
            />
        </group>
    )
}

// ============================================
// LotEntity — renders a single lot's 3D content
// from the entity system.
// Props: lotId, offset (x position)
// ============================================
const LotEntity = ({ lotId, offset = 0, lotIndex = 1, streetSides = {} }) => {
    const lot = useLot(lotId)
    const style = useLotStyle(lotId)
    const visibility = useLotVisibility(lotId)

    // Global dimension + line scale settings
    const dimensionSettings = useStore(state => state.viewSettings.styleSettings?.dimensionSettings)
    const exportLineScale = useStore(state => state.viewSettings.exportLineScale) || 1
    const layers = useStore(state => state.viewSettings.layers)

    // District parameters (max height source of truth)
    const districtParameters = useDistrictParameters()
    const principalMaxHeight = districtParameters?.structures?.principal?.height?.max ?? 0
    const accessoryMaxHeight = districtParameters?.structures?.accessory?.height?.max ?? 0

    // Entity building actions from store
    const selectEntityBuilding = useStore(state => state.selectEntityBuilding)
    const setEntityBuildingPosition = useStore(state => state.setEntityBuildingPosition)
    const enableEntityBuildingPolygonMode = useStore(state => state.enableEntityBuildingPolygonMode)
    const updateEntityBuildingVertex = useStore(state => state.updateEntityBuildingVertex)
    const splitEntityBuildingEdge = useStore(state => state.splitEntityBuildingEdge)
    const extrudeEntityBuildingEdge = useStore(state => state.extrudeEntityBuildingEdge)
    const setEntityBuildingTotalHeight = useStore(state => state.setEntityBuildingTotalHeight)

    // Entity lot editing actions
    const updateEntityVertex = useStore(state => state.updateEntityVertex)
    const splitEntityEdge = useStore(state => state.splitEntityEdge)
    const extrudeEntityEdge = useStore(state => state.extrudeEntityEdge)

    // Imported model actions
    const setImportedModelPosition = useStore(state => state.setImportedModelPosition)
    const selectImportedModel = useStore(state => state.selectImportedModel)
    const selectedImportedModel = useStore(state => state.selectedImportedModel)

    // Annotation positions for draggable elements (lot access arrows, etc.)
    const annotationPositions = useStore(state => state.annotationPositions)
    const setAnnotationPosition = useStore(state => state.setAnnotationPosition)

    if (!lot || !style) return null

    const { lotWidth, lotDepth, lotGeometry, setbacks, buildings } = lot
    const principal = buildings?.principal
    const accessory = buildings?.accessory

    const isPolygon = lotGeometry?.mode === 'polygon' && lotGeometry?.vertices?.length >= 3
    const isEditing = isPolygon && lotGeometry?.editing

    // Show dimension layers from global settings
    const showWidthDim = layers.dimensionsLotWidth
    const showDepthDim = layers.dimensionsLotDepth && (visibility.depthDimVisible ?? true)
    const showSetbackDim = layers.dimensionsSetbacks
    const showParkingSetbackDim = layers.dimensionsParkingSetbacks
    const showMaxFrontSetbackDim = layers.dimensionsMaxFrontSetback
    const showMaxSideStreetSetbackDim = layers.dimensionsMaxSideStreetSetback
    const showPrincipalHeightDim = layers.dimensionsHeightPrincipal ?? layers.dimensionsHeight
    const showAccessoryHeightDim = layers.dimensionsHeightAccessory ?? layers.dimensionsHeight

    // Position the lot group centered on its own width, front edge at y=0
    // Each lot's internal coordinate system: center-x at 0, front at -lotDepth/2, rear at +lotDepth/2
    return (
        <group position={[offset + lotWidth / 2, lotDepth / 2, 0]}>
            {/* ============================================ */}
            {/* Lot Lines (rectangle or polygon) */}
            {/* ============================================ */}
            {layers.lotLines && visibility.lotLines && (
                isPolygon ? (
                    <LotEditor
                        model={lotId}
                        vertices={lotGeometry.vertices}
                        editing={isEditing}
                        style={style.lotLines}
                        fillStyle={style.lotFill}
                        showDimensions={showWidthDim || showDepthDim}
                        dimensionSettings={dimensionSettings}
                        offsetGroupX={offset + lotWidth / 2}
                        offsetGroupY={lotDepth / 2}
                        updateVertex={updateEntityVertex}
                        splitEdge={splitEntityEdge}
                        extrudeEdge={extrudeEntityEdge}
                        lineScale={exportLineScale}
                    />
                ) : (
                    <RectLot
                        width={lotWidth}
                        depth={lotDepth}
                        style={style.lotLines}
                        fillStyle={style.lotFill}
                        setbackFillActive={!!(layers.setbackFill && visibility.setbackFill && setbacks?.principal)}
                        setbackInner={computeSetbackInner(lotWidth, lotDepth, setbacks?.principal, streetSides)}
                        setbackFillStyle={style?.setbackFill}
                        showWidthDimensions={showWidthDim}
                        showDepthDimensions={showDepthDim}
                        dimensionSettings={dimensionSettings}
                        lineScale={exportLineScale}
                        lotIndex={lotIndex}
                    />
                )
            )}

            {/* ============================================ */}
            {/* Setback Fill (buildable area inside principal setbacks) */}
            {/* ============================================ */}
            {layers.setbackFill && visibility.setbackFill && setbacks?.principal && style?.setbackFill && (
                <SetbackFillOutline
                    lotWidth={lotWidth}
                    lotDepth={lotDepth}
                    setbacks={setbacks.principal}
                    style={style.setbackFill}
                    streetSides={streetSides}
                    lineScale={exportLineScale}
                />
            )}

            {/* ============================================ */}
            {/* Setback Lines (principal setbacks) */}
            {/* ============================================ */}
            {layers.setbacks && visibility.setbacks && setbacks?.principal && (
                <SetbackLines
                    lotWidth={lotWidth}
                    lotDepth={lotDepth}
                    setbacks={setbacks.principal}
                    style={style.setbacks}
                    streetSides={streetSides}
                    showDimensions={showSetbackDim}
                    dimensionSettings={dimensionSettings}
                    lineScale={exportLineScale}
                />
            )}

            {/* ============================================ */}
            {/* Max Setback Lines (maxFront, maxSideStreet) */}
            {/* ============================================ */}
            {layers.maxSetbacks && visibility.maxSetbacks && setbacks?.principal && style?.maxSetbacks && (
                <MaxSetbackLines
                    lotWidth={lotWidth}
                    lotDepth={lotDepth}
                    setbacks={setbacks.principal}
                    style={style.maxSetbacks}
                    streetSides={streetSides}
                    lineScale={exportLineScale}
                    showMaxFrontDim={showMaxFrontSetbackDim}
                    showMaxSideStreetDim={showMaxSideStreetSetbackDim}
                    dimensionSettings={dimensionSettings}
                />
            )}

            {/* ============================================ */}
            {/* Placement Zone (between min and max setbacks) */}
            {/* ============================================ */}
            {layers.placementZone && visibility.placementZone && setbacks?.principal && style?.placementZone && (
                <PlacementZone
                    lotWidth={lotWidth}
                    lotDepth={lotDepth}
                    setbacks={setbacks.principal}
                    style={style.placementZone}
                    streetSides={streetSides}
                    lineScale={exportLineScale}
                />
            )}

            {/* ============================================ */}
            {/* Accessory Setback Lines */}
            {/* ============================================ */}
            {layers.accessorySetbacks && visibility.accessorySetbacks && setbacks?.accessory && style?.accessorySetbacks && (
                <AccessorySetbackLines
                    lotWidth={lotWidth}
                    lotDepth={lotDepth}
                    accessorySetbacks={setbacks.accessory}
                    style={style.accessorySetbacks}
                    streetSides={streetSides}
                    lineScale={exportLineScale}
                />
            )}

            {/* ============================================ */}
            {/* Parking Setback Lines */}
            {/* ============================================ */}
            {layers.parkingSetbacks && visibility.parkingSetbacks && lot.parkingSetbacks && style?.parkingSetbacks && (
                <ParkingSetbackLines
                    lotWidth={lotWidth}
                    lotDepth={lotDepth}
                    parkingSetbacks={lot.parkingSetbacks}
                    style={style.parkingSetbacks}
                    streetSides={streetSides}
                    showDimensions={showParkingSetbackDim}
                    dimensionSettings={dimensionSettings}
                    lineScale={exportLineScale}
                />
            )}

            {/* ============================================ */}
            {/* BTZ Planes (Build-To Zone) */}
            {/* ============================================ */}
            {layers.btzPlanes && visibility.btzPlanes && principal && setbacks?.principal && style?.btzPlanes && (
                <BTZPlanes
                    principal={principal}
                    setbacks={setbacks.principal}
                    streetSides={streetSides}
                    style={style.btzPlanes}
                />
            )}
            {layers.btzPlanes && visibility.btzPlanes && accessory && setbacks?.accessory && style?.btzPlanes &&
             (setbacks.accessory.btzFront != null || setbacks.accessory.btzSideStreet != null) && (
                <BTZPlanes
                    principal={accessory}
                    setbacks={setbacks.accessory}
                    streetSides={streetSides}
                    style={style.btzPlanes}
                />
            )}

            {/* ============================================ */}
            {/* Principal Building */}
            {/* ============================================ */}
            {(layers.principalBuildings ?? layers.buildings) && visibility.buildings && principal && (
                <BuildingEditor
                    model={lotId}
                    width={principal.width}
                    depth={principal.depth}
                    x={principal.x}
                    y={principal.y}
                    buildingGeometry={principal.geometry}
                    selected={principal.selected}
                    buildingType="principal"
                    styles={{ faces: style.principalBuildingFaces ?? style.buildingFaces, edges: style.principalBuildingEdges ?? style.buildingEdges }}
                    scaleFactor={1}
                    onSelect={() => selectEntityBuilding(lotId, 'principal')}
                    offsetGroupX={offset + lotWidth / 2}
                    offsetGroupY={lotDepth / 2}
                    stories={principal.stories ?? 1}
                    firstFloorHeight={principal.firstFloorHeight ?? 12}
                    upperFloorHeight={principal.upperFloorHeight ?? 10}
                    maxHeight={principalMaxHeight}
                    showMaxHeightPlane={(layers.maxHeightPlanePrincipal ?? layers.maxHeightPlane) && (visibility.maxHeightPlanePrincipal ?? visibility.maxHeightPlane)}
                    maxHeightPlaneStyle={style.maxHeightPlane}
                    roof={principal.roof}
                    roofStyles={{ roofFaces: style.roofFaces, roofEdges: style.roofEdges }}
                    showRoof={layers.roof && visibility.roof}
                    showHeightDimensions={showPrincipalHeightDim}
                    showFirstFloorHeightDim={layers.dimensionsFirstFloorHeight ?? true}
                    dimensionSettings={dimensionSettings}
                    lineScale={exportLineScale}
                    enableBuildingPolygonMode={() => enableEntityBuildingPolygonMode(lotId, 'principal')}
                    updateBuildingVertex={(_model, vertexIndex, newX, newY) => updateEntityBuildingVertex(lotId, 'principal', vertexIndex, newX, newY)}
                    splitBuildingEdge={(_model, edgeIndex) => splitEntityBuildingEdge(lotId, 'principal', edgeIndex)}
                    extrudeBuildingEdge={(_model, edgeIndex, distance) => extrudeEntityBuildingEdge(lotId, 'principal', edgeIndex, distance)}
                    setBuildingTotalHeight={(_model, newHeight) => setEntityBuildingTotalHeight(lotId, 'principal', newHeight)}
                    onBuildingMove={(newX, newY) => setEntityBuildingPosition(lotId, 'principal', newX, newY)}
                />
            )}

            {/* Standalone principal max height plane — shown when building layer is off but height plane layer is on */}
            {!((layers.principalBuildings ?? layers.buildings) && visibility.buildings) && principal &&
             (layers.maxHeightPlanePrincipal ?? layers.maxHeightPlane) && (visibility.maxHeightPlanePrincipal ?? visibility.maxHeightPlane) &&
             principalMaxHeight > 0 && (
                <MaxHeightPlaneStandalone
                    building={principal}
                    maxHeight={principalMaxHeight}
                    style={style.maxHeightPlane}
                    lineScale={exportLineScale}
                />
            )}

            {/* ============================================ */}
            {/* Accessory Building */}
            {/* ============================================ */}
            {(layers.accessoryBuildings ?? layers.buildings) && visibility.accessoryBuilding && accessory && accessory.width > 0 && (
                <BuildingEditor
                    model={lotId}
                    width={accessory.width}
                    depth={accessory.depth}
                    x={accessory.x}
                    y={accessory.y}
                    buildingGeometry={accessory.geometry}
                    selected={accessory.selected}
                    buildingType="accessory"
                    styles={{ faces: style.accessoryBuildingFaces ?? style.buildingFaces, edges: style.accessoryBuildingEdges ?? style.buildingEdges }}
                    scaleFactor={1}
                    onSelect={() => selectEntityBuilding(lotId, 'accessory')}
                    offsetGroupX={offset + lotWidth / 2}
                    offsetGroupY={lotDepth / 2}
                    stories={accessory.stories ?? 1}
                    firstFloorHeight={accessory.firstFloorHeight ?? 10}
                    upperFloorHeight={accessory.upperFloorHeight ?? 10}
                    maxHeight={accessoryMaxHeight}
                    showMaxHeightPlane={(layers.maxHeightPlaneAccessory ?? layers.maxHeightPlane) && (visibility.maxHeightPlaneAccessory ?? visibility.maxHeightPlane)}
                    maxHeightPlaneStyle={style.maxHeightPlane}
                    roof={accessory.roof}
                    roofStyles={{ roofFaces: style.roofFaces, roofEdges: style.roofEdges }}
                    showRoof={layers.roof && visibility.roof}
                    showHeightDimensions={showAccessoryHeightDim}
                    showFirstFloorHeightDim={layers.dimensionsFirstFloorHeight ?? true}
                    dimensionSettings={dimensionSettings}
                    lineScale={exportLineScale}
                    enableBuildingPolygonMode={() => enableEntityBuildingPolygonMode(lotId, 'accessory')}
                    updateBuildingVertex={(_model, vertexIndex, newX, newY) => updateEntityBuildingVertex(lotId, 'accessory', vertexIndex, newX, newY)}
                    splitBuildingEdge={(_model, edgeIndex) => splitEntityBuildingEdge(lotId, 'accessory', edgeIndex)}
                    extrudeBuildingEdge={(_model, edgeIndex, distance) => extrudeEntityBuildingEdge(lotId, 'accessory', edgeIndex, distance)}
                    setBuildingTotalHeight={(_model, newHeight) => setEntityBuildingTotalHeight(lotId, 'accessory', newHeight)}
                    onBuildingMove={(newX, newY) => setEntityBuildingPosition(lotId, 'accessory', newX, newY)}
                />
            )}

            {/* Standalone accessory max height plane — shown when building layer is off but height plane layer is on */}
            {!((layers.accessoryBuildings ?? layers.buildings) && visibility.accessoryBuilding) && accessory && accessory.width > 0 &&
             (layers.maxHeightPlaneAccessory ?? layers.maxHeightPlane) && (visibility.maxHeightPlaneAccessory ?? visibility.maxHeightPlane) &&
             accessoryMaxHeight > 0 && (
                <MaxHeightPlaneStandalone
                    building={accessory}
                    maxHeight={accessoryMaxHeight}
                    style={style.maxHeightPlane}
                    lineScale={exportLineScale}
                />
            )}

            {/* ============================================ */}
            {/* Imported Models (multi-model) */}
            {/* ============================================ */}
            {layers.importedModels && visibility.importedModel && lot.importedModelOrder?.length > 0 && (
                lot.importedModelOrder.map((modelId) => {
                    const model = lot.importedModels?.[modelId]
                    if (!model) return null
                    if (model.visible === false) return null
                    const isSelected = selectedImportedModel?.lotId === lotId && selectedImportedModel?.modelId === modelId
                    return (
                        <React.Fragment key={modelId}>
                            <ImportedModelMesh
                                lotId={lotId}
                                modelId={modelId}
                                filename={model.filename}
                                x={model.x}
                                y={model.y}
                                rotation={model.rotation ?? 0}
                                scale={model.scale ?? 1}
                                units={model.units ?? 'auto'}
                                selected={isSelected}
                                locked={model.locked ?? false}
                                onSelect={() => { if (!(model.locked ?? false)) selectImportedModel(lotId, modelId) }}
                                style={{
                                    faces: {
                                        color: model.style?.faces?.color ?? style.importedModelFaces?.color ?? '#D5D5D5',
                                        opacity: model.style?.faces?.opacity ?? style.importedModelFaces?.opacity ?? 1.0,
                                    },
                                    edges: {
                                        color: model.style?.edges?.color ?? style.importedModelEdges?.color ?? '#000000',
                                        width: model.style?.edges?.width ?? style.importedModelEdges?.width ?? 1.5,
                                        opacity: model.style?.edges?.opacity ?? style.importedModelEdges?.opacity ?? 1.0,
                                        visible: model.style?.edges?.visible ?? style.importedModelEdges?.visible ?? true,
                                    },
                                }}
                                lineScale={exportLineScale}
                            />
                            {isSelected && !(model.locked ?? false) && (
                                <MoveHandle
                                    position={[model.x ?? 0, model.y ?? 0]}
                                    zPosition={1}
                                    displayOffset={[0, -30]}
                                    offsetGroupX={offset + lotWidth / 2}
                                    offsetGroupY={lotDepth / 2}
                                    onDrag={(newX, newY) => {
                                        useStore.getState().setImportedModelPosition(lotId, modelId, newX, newY)
                                    }}
                                    parentHovered={true}
                                />
                            )}
                        </React.Fragment>
                    )
                })
            )}

            {/* ============================================ */}
            {/* Annotation Labels */}
            {/* ============================================ */}
            <group position={[-lotWidth / 2, -lotDepth / 2, 0]}>
                <LotAnnotations
                    lotId={lotId}
                    lotWidth={lotWidth}
                    lotDepth={lotDepth}
                    setbacks={{
                        front: setbacks?.principal?.front || 0,
                        rear: setbacks?.principal?.rear || 0,
                        left: (streetSides.left ? setbacks?.principal?.minSideStreet : setbacks?.principal?.sideInterior) || 0,
                        right: (streetSides.right ? setbacks?.principal?.minSideStreet : setbacks?.principal?.sideInterior) || 0,
                    }}
                    buildings={{
                        principal: principal ? {
                            x: (principal.x || 0) + lotWidth / 2 - principal.width / 2,
                            y: (principal.y || 0) + lotDepth / 2 - principal.depth / 2,
                            width: principal.width,
                            depth: principal.depth,
                            totalHeight: computeTotalHeight(principal),
                        } : undefined,
                        accessory: accessory && accessory.width > 0 ? {
                            x: (accessory.x || 0) + lotWidth / 2 - accessory.width / 2,
                            y: (accessory.y || 0) + lotDepth / 2 - accessory.depth / 2,
                            width: accessory.width,
                            depth: accessory.depth,
                            totalHeight: computeTotalHeight(accessory),
                        } : undefined,
                    }}
                    maxSetbacks={{
                        front: setbacks?.principal?.maxFront || 0,
                        sideStreet: setbacks?.principal?.maxSideStreet || 0,
                        streetSides,
                    }}
                    lotIndex={lotIndex}
                    lineScale={exportLineScale}
                />
            </group>

            {/* ============================================ */}
            {/* Lot Access Arrows */}
            {/* ============================================ */}
            {lot.lotAccess && (() => {
                // Validate stored positions — ignore if outside lot bounds (stale from old dimensions)
                const validPos = (key, fallback) => {
                    const stored = annotationPositions[key]
                    if (!stored) return fallback
                    const margin = 20
                    if (Math.abs(stored[0]) > lotWidth / 2 + margin || Math.abs(stored[1]) > lotDepth / 2 + margin) return fallback
                    return stored
                }
                // Apply position offsets from style
                const applyOffset = (pos, styleObj) => {
                    const ox = styleObj?.positionOffsetX ?? 0
                    const oy = styleObj?.positionOffsetY ?? 0
                    if (ox === 0 && oy === 0) return pos
                    return [pos[0] + ox, pos[1] + oy, pos[2] ?? 0]
                }
                return (
                <group>
                    {layers.lotAccessFront && visibility.lotAccessFront && lot.lotAccess.front && (
                        <LotAccessArrow
                            direction="front"
                            lotId={lotId}
                            lotWidth={lotWidth}
                            lotDepth={lotDepth}
                            streetSides={streetSides}
                            style={style?.lotAccessArrows}
                            position={applyOffset(validPos(`lot-${lotId}-access-front`, [0, -lotDepth / 2 + 5, 0]), style?.lotAccessArrows)}
                            onPositionChange={(pos) => setAnnotationPosition(`lot-${lotId}-access-front`, pos)}
                        />
                    )}
                    {layers.lotAccessRear && visibility.lotAccessRear && lot.lotAccess.rear && (
                        <LotAccessArrow
                            direction="rear"
                            lotId={lotId}
                            lotWidth={lotWidth}
                            lotDepth={lotDepth}
                            streetSides={streetSides}
                            style={style?.lotAccessArrows}
                            position={applyOffset(validPos(`lot-${lotId}-access-rear`, [0, lotDepth / 2 - 5, 0]), style?.lotAccessArrows)}
                            onPositionChange={(pos) => setAnnotationPosition(`lot-${lotId}-access-rear`, pos)}
                        />
                    )}
                    {layers.lotAccessSideStreet && visibility.lotAccessSideStreet && lot.lotAccess.sideStreet && (streetSides.left || streetSides.right) && (
                        <LotAccessArrow
                            direction="sideStreet"
                            lotId={lotId}
                            lotWidth={lotWidth}
                            lotDepth={lotDepth}
                            streetSides={streetSides}
                            style={style?.lotAccessArrows}
                            position={applyOffset(validPos(`lot-${lotId}-access-sidestreet`, [
                                streetSides.left ? -lotWidth / 2 + 5 : lotWidth / 2 - 5,
                                0, 0
                            ]), style?.lotAccessArrows)}
                            onPositionChange={(pos) => setAnnotationPosition(`lot-${lotId}-access-sidestreet`, pos)}
                        />
                    )}
                    {layers.lotAccessSharedDrive && visibility.lotAccessSharedDrive && lot.lotAccess.sideInterior && (() => {
                        const sdLoc = lot.lotAccess.sharedDriveLocation ?? 'front'
                        const showFront = sdLoc === 'front' || sdLoc === 'both'
                        const showRear = sdLoc === 'rear' || sdLoc === 'both'
                        const sdStyle = style?.sharedDriveArrow ?? style?.lotAccessArrows
                        return (
                            <>
                                {showFront && (
                                    <LotAccessArrow
                                        direction="sharedDrive"
                                        lotId={lotId}
                                        lotWidth={lotWidth}
                                        lotDepth={lotDepth}
                                        streetSides={streetSides}
                                        style={sdStyle}
                                        bidirectional={true}
                                        position={applyOffset(validPos(`lot-${lotId}-access-shareddrive`, [
                                            streetSides.right ? -lotWidth / 2 : lotWidth / 2,
                                            -lotDepth / 2, 0
                                        ]), sdStyle)}
                                        onPositionChange={(pos) => setAnnotationPosition(`lot-${lotId}-access-shareddrive`, pos)}
                                    />
                                )}
                                {showRear && (
                                    <LotAccessArrow
                                        direction="sharedDrive"
                                        rearMode={true}
                                        lotId={lotId}
                                        lotWidth={lotWidth}
                                        lotDepth={lotDepth}
                                        streetSides={streetSides}
                                        style={sdStyle}
                                        bidirectional={true}
                                        position={applyOffset(validPos(`lot-${lotId}-access-shareddrive-rear`, [
                                            streetSides.right ? -lotWidth / 2 : lotWidth / 2,
                                            lotDepth / 2, 0
                                        ]), sdStyle)}
                                        onPositionChange={(pos) => setAnnotationPosition(`lot-${lotId}-access-shareddrive-rear`, pos)}
                                    />
                                )}
                            </>
                        )
                    })()}
                </group>
                )
            })()}
        </group>
    )
}

export default LotEntity
