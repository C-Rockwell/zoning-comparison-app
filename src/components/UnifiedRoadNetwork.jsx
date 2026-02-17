import { useMemo } from 'react'
import * as THREE from 'three'

const MAIN_STREET = {
    rightOfWay: 50,
    pavement: 24,
    verge: 7,
    sidewalk: 6,
}

const REAR_ALLEY = {
    rightOfWay: 30,
    pavement: 20,
    verge: 5,
    sidewalk: 0,
}

const getProfileForDirection = (direction) => (direction === 'rear' ? REAR_ALLEY : MAIN_STREET)

const getBandBoundaries = (profile) => {
    const sidewalk = profile.sidewalk || 0
    const verge = profile.verge || 0
    const pavement = profile.pavement || 0
    const row = profile.rightOfWay || 0

    const b1 = sidewalk
    const b2 = b1 + verge
    const b3 = b2 + pavement
    const b4 = Math.max(b3, row - sidewalk)
    const b5 = row
    return [0, b1, b2, b3, b4, b5]
}

const clampRadius = (radius, width, height) => Math.max(0, Math.min(radius, width / 2, height / 2))

const buildRoundedRectPath = (path, bounds, radii) => {
    const { left, right, bottom, top } = bounds
    const width = right - left
    const height = top - bottom
    if (width <= 0 || height <= 0) return

    const rBL = clampRadius(radii.bl || 0, width, height)
    const rBR = clampRadius(radii.br || 0, width, height)
    const rTR = clampRadius(radii.tr || 0, width, height)
    const rTL = clampRadius(radii.tl || 0, width, height)

    path.moveTo(left + rBL, bottom)
    path.lineTo(right - rBR, bottom)
    if (rBR > 0) path.quadraticCurveTo(right, bottom, right, bottom + rBR)
    else path.lineTo(right, bottom)

    path.lineTo(right, top - rTR)
    if (rTR > 0) path.quadraticCurveTo(right, top, right - rTR, top)
    else path.lineTo(right, top)

    path.lineTo(left + rTL, top)
    if (rTL > 0) path.quadraticCurveTo(left, top, left, top - rTL)
    else path.lineTo(left, top)

    path.lineTo(left, bottom + rBL)
    if (rBL > 0) path.quadraticCurveTo(left, bottom, left + rBL, bottom)
    else path.lineTo(left, bottom)
}

const radiusFromOffsets = (offsetA, offsetB, cornerLimit) => {
    const offset = Math.min(offsetA, offsetB)
    if (cornerLimit <= 0) return 0
    return offset <= cornerLimit ? offset : 0
}

const createBandShape = (lotBounds, inner, outer, cornerLimits) => {
    const outerBounds = {
        left: lotBounds.xMin - outer.left,
        right: lotBounds.xMax + outer.right,
        bottom: lotBounds.yMin - outer.front,
        top: lotBounds.yMax + outer.rear,
    }
    const innerBounds = {
        left: lotBounds.xMin - inner.left,
        right: lotBounds.xMax + inner.right,
        bottom: lotBounds.yMin - inner.front,
        top: lotBounds.yMax + inner.rear,
    }

    const hasThickness = (
        outer.left > inner.left ||
        outer.right > inner.right ||
        outer.front > inner.front ||
        outer.rear > inner.rear
    )
    if (!hasThickness) return null

    const outerRadii = {
        bl: radiusFromOffsets(outer.front, outer.left, cornerLimits.bl),
        br: radiusFromOffsets(outer.front, outer.right, cornerLimits.br),
        tr: radiusFromOffsets(outer.rear, outer.right, cornerLimits.tr),
        tl: radiusFromOffsets(outer.rear, outer.left, cornerLimits.tl),
    }
    const innerRadii = {
        bl: radiusFromOffsets(inner.front, inner.left, cornerLimits.bl),
        br: radiusFromOffsets(inner.front, inner.right, cornerLimits.br),
        tr: radiusFromOffsets(inner.rear, inner.right, cornerLimits.tr),
        tl: radiusFromOffsets(inner.rear, inner.left, cornerLimits.tl),
    }

    const shape = new THREE.Shape()
    buildRoundedRectPath(shape, outerBounds, outerRadii)

    const hole = new THREE.Path()
    buildRoundedRectPath(hole, innerBounds, innerRadii)
    shape.holes.push(hole)

    return shape
}

const getUnifiedStyle = (zoneType, styles) => {
    if (zoneType === 'pavement') {
        return styles?.roadWidth || {
            fillColor: '#666666',
            fillOpacity: 1.0,
        }
    }
    if (zoneType === 'verge') {
        return styles?.rightVerge || styles?.leftVerge || {
            fillColor: '#c4a77d',
            fillOpacity: 1.0,
        }
    }
    return styles?.rightSidewalk || styles?.leftSidewalk || {
        fillColor: '#90EE90',
        fillOpacity: 1.0,
    }
}

const createQuarterDisk = (cx, cy, radius, startAngle, endAngle) => {
    const shape = new THREE.Shape()
    shape.moveTo(cx, cy)
    shape.absarc(cx, cy, radius, startAngle, endAngle, false)
    shape.closePath()
    return shape
}

const createQuarterAnnulus = (cx, cy, innerRadius, outerRadius, startAngle, endAngle) => {
    const shape = new THREE.Shape()
    shape.moveTo(cx + Math.cos(startAngle) * outerRadius, cy + Math.sin(startAngle) * outerRadius)
    shape.absarc(cx, cy, outerRadius, startAngle, endAngle, false)
    shape.lineTo(cx + Math.cos(endAngle) * innerRadius, cy + Math.sin(endAngle) * innerRadius)
    shape.absarc(cx, cy, innerRadius, endAngle, startAngle, true)
    shape.closePath()
    return shape
}

const UnifiedRoadNetwork = ({
    lotBounds,
    enabledDirections,
    roadModuleStyles,
}) => {
    const bandShapes = useMemo(() => {
        const edges = ['front', 'right', 'rear', 'left']
        const boundariesByEdge = {}
        const profilesByEdge = {}

        const getCurbDepth = (profile) => (profile?.sidewalk || 0) + (profile?.verge || 0)

        for (const edge of edges) {
            if (!enabledDirections?.[edge]) {
                boundariesByEdge[edge] = [0, 0, 0, 0, 0, 0]
                profilesByEdge[edge] = null
                continue
            }
            const profile = getProfileForDirection(edge)
            profilesByEdge[edge] = profile
            boundariesByEdge[edge] = getBandBoundaries(profile)
        }

        const cornerLimits = {
            bl: (profilesByEdge.front && profilesByEdge.left)
                ? Math.min(getCurbDepth(profilesByEdge.front), getCurbDepth(profilesByEdge.left))
                : 0,
            // br is handled by explicit front-right coordinate geometry below.
            // Keep auto-rounding disabled here to prevent double curvature artifacts.
            br: 0,
            tr: (profilesByEdge.rear && profilesByEdge.right)
                ? Math.min(getCurbDepth(profilesByEdge.rear), getCurbDepth(profilesByEdge.right))
                : 0,
            tl: (profilesByEdge.rear && profilesByEdge.left)
                ? Math.min(getCurbDepth(profilesByEdge.rear), getCurbDepth(profilesByEdge.left))
                : 0,
        }

        const bandToZone = ['sidewalk', 'verge', 'pavement', 'verge', 'sidewalk']
        const shapes = []

        for (let bandIndex = 0; bandIndex < bandToZone.length; bandIndex++) {
            const inner = {
                front: boundariesByEdge.front[bandIndex],
                right: boundariesByEdge.right[bandIndex],
                rear: boundariesByEdge.rear[bandIndex],
                left: boundariesByEdge.left[bandIndex],
            }
            const outer = {
                front: boundariesByEdge.front[bandIndex + 1],
                right: boundariesByEdge.right[bandIndex + 1],
                rear: boundariesByEdge.rear[bandIndex + 1],
                left: boundariesByEdge.left[bandIndex + 1],
            }

            const shape = createBandShape(lotBounds, inner, outer, {
                bl: cornerLimits.bl,
                br: cornerLimits.br,
                tr: cornerLimits.tr,
                tl: cornerLimits.tl,
            })
            if (!shape) continue

            shapes.push({
                id: `band-${bandIndex}`,
                zoneType: bandToZone[bandIndex],
                shape,
                zOffset: 0.04 + bandIndex * 0.001,
            })
        }

        return shapes
    }, [lotBounds, enabledDirections])

    const frontRightFix = useMemo(() => {
        if (!enabledDirections?.front || !enabledDirections?.right) return null

        const front = getProfileForDirection('front')
        const right = getProfileForDirection('right')
        const frontCurb = (front.sidewalk || 0) + (front.verge || 0) // 13
        const frontWalk = front.sidewalk || 0 // 6
        const rightROW = right.rightOfWay || 50

        const x0 = lotBounds.xMax
        const y0 = lotBounds.yMin
        const nearCx = x0
        const farCx = x0 + rightROW
        const cy = y0

        // Continue front near-side strips across the right-road intersection width.
        const sidewalkRect = { cx: x0 + rightROW / 2, cy: y0 - frontWalk / 2, w: rightROW, h: frontWalk }
        const vergeRect = { cx: x0 + rightROW / 2, cy: y0 - ((frontWalk + frontCurb) / 2), w: rightROW, h: frontCurb - frontWalk }
        const throatRect = {
            cx: x0 + rightROW / 2,
            cy: y0 - frontCurb / 2,
            w: rightROW - (2 * frontCurb), // 24 for S1/S1
            h: frontCurb,
        }
        const clearRect = {
            cx: x0 + rightROW / 2,
            cy: y0 - frontCurb / 2,
            w: rightROW,
            h: frontCurb,
        }

        return {
            clearRect,
            sidewalkRect,
            vergeRect,
            throatRect,
            nearSidewalkArc: createQuarterDisk(nearCx, cy, frontWalk, -Math.PI / 2, 0),
            nearVergeArc: createQuarterAnnulus(nearCx, cy, frontWalk, frontCurb, -Math.PI / 2, 0),
            farSidewalkArc: createQuarterDisk(farCx, cy, frontWalk, -Math.PI, -Math.PI / 2),
            farVergeArc: createQuarterAnnulus(farCx, cy, frontWalk, frontCurb, -Math.PI, -Math.PI / 2),
        }
    }, [enabledDirections, lotBounds])

    if (!bandShapes.length) return null

    const pavementStyle = getUnifiedStyle('pavement', roadModuleStyles)
    const vergeStyle = getUnifiedStyle('verge', roadModuleStyles)
    const sidewalkStyle = getUnifiedStyle('sidewalk', roadModuleStyles)

    return (
        <group>
            {bandShapes.map((band) => {
                const style = getUnifiedStyle(band.zoneType, roadModuleStyles)
                const fillOpacity = style?.fillOpacity ?? 1.0
                return (
                    <mesh key={band.id} position={[0, 0, band.zOffset]} receiveShadow renderOrder={2}>
                        <shapeGeometry args={[band.shape]} />
                        <meshStandardMaterial
                            color={style?.fillColor || '#888888'}
                            opacity={fillOpacity}
                            transparent={fillOpacity < 1}
                            side={THREE.DoubleSide}
                            depthWrite={fillOpacity >= 0.95}
                            roughness={1}
                            metalness={0}
                        />
                    </mesh>
                )
            })}

            {/* Targeted front-right T-intersection correction (phase 1) */}
            {frontRightFix && (
                <group>
                    <mesh position={[frontRightFix.clearRect.cx, frontRightFix.clearRect.cy, 0.059]} renderOrder={3}>
                        <planeGeometry args={[frontRightFix.clearRect.w, frontRightFix.clearRect.h]} />
                        <meshStandardMaterial
                            color={pavementStyle?.fillColor || '#666666'}
                            opacity={pavementStyle?.fillOpacity ?? 1.0}
                            transparent={(pavementStyle?.fillOpacity ?? 1.0) < 1}
                            side={THREE.DoubleSide}
                            depthWrite={(pavementStyle?.fillOpacity ?? 1.0) >= 0.95}
                            roughness={1}
                            metalness={0}
                        />
                    </mesh>
                    <mesh position={[frontRightFix.sidewalkRect.cx, frontRightFix.sidewalkRect.cy, 0.060]} renderOrder={3}>
                        <planeGeometry args={[frontRightFix.sidewalkRect.w, frontRightFix.sidewalkRect.h]} />
                        <meshStandardMaterial
                            color={sidewalkStyle?.fillColor || '#90EE90'}
                            opacity={sidewalkStyle?.fillOpacity ?? 1.0}
                            transparent={(sidewalkStyle?.fillOpacity ?? 1.0) < 1}
                            side={THREE.DoubleSide}
                            depthWrite={(sidewalkStyle?.fillOpacity ?? 1.0) >= 0.95}
                            roughness={1}
                            metalness={0}
                        />
                    </mesh>
                    <mesh position={[frontRightFix.vergeRect.cx, frontRightFix.vergeRect.cy, 0.061]} renderOrder={3}>
                        <planeGeometry args={[frontRightFix.vergeRect.w, frontRightFix.vergeRect.h]} />
                        <meshStandardMaterial
                            color={vergeStyle?.fillColor || '#c4a77d'}
                            opacity={vergeStyle?.fillOpacity ?? 1.0}
                            transparent={(vergeStyle?.fillOpacity ?? 1.0) < 1}
                            side={THREE.DoubleSide}
                            depthWrite={(vergeStyle?.fillOpacity ?? 1.0) >= 0.95}
                            roughness={1}
                            metalness={0}
                        />
                    </mesh>
                    <mesh position={[frontRightFix.throatRect.cx, frontRightFix.throatRect.cy, 0.062]} renderOrder={3}>
                        <planeGeometry args={[Math.max(frontRightFix.throatRect.w, 0), frontRightFix.throatRect.h]} />
                        <meshStandardMaterial
                            color={pavementStyle?.fillColor || '#666666'}
                            opacity={pavementStyle?.fillOpacity ?? 1.0}
                            transparent={(pavementStyle?.fillOpacity ?? 1.0) < 1}
                            side={THREE.DoubleSide}
                            depthWrite={(pavementStyle?.fillOpacity ?? 1.0) >= 0.95}
                            roughness={1}
                            metalness={0}
                        />
                    </mesh>

                    <mesh position={[0, 0, 0.063]} renderOrder={3}>
                        <shapeGeometry args={[frontRightFix.nearSidewalkArc]} />
                        <meshStandardMaterial color={sidewalkStyle?.fillColor || '#90EE90'} opacity={sidewalkStyle?.fillOpacity ?? 1.0} transparent={(sidewalkStyle?.fillOpacity ?? 1.0) < 1} side={THREE.DoubleSide} depthWrite={(sidewalkStyle?.fillOpacity ?? 1.0) >= 0.95} roughness={1} metalness={0} />
                    </mesh>
                    <mesh position={[0, 0, 0.064]} renderOrder={3}>
                        <shapeGeometry args={[frontRightFix.nearVergeArc]} />
                        <meshStandardMaterial color={vergeStyle?.fillColor || '#c4a77d'} opacity={vergeStyle?.fillOpacity ?? 1.0} transparent={(vergeStyle?.fillOpacity ?? 1.0) < 1} side={THREE.DoubleSide} depthWrite={(vergeStyle?.fillOpacity ?? 1.0) >= 0.95} roughness={1} metalness={0} />
                    </mesh>
                    <mesh position={[0, 0, 0.063]} renderOrder={3}>
                        <shapeGeometry args={[frontRightFix.farSidewalkArc]} />
                        <meshStandardMaterial color={sidewalkStyle?.fillColor || '#90EE90'} opacity={sidewalkStyle?.fillOpacity ?? 1.0} transparent={(sidewalkStyle?.fillOpacity ?? 1.0) < 1} side={THREE.DoubleSide} depthWrite={(sidewalkStyle?.fillOpacity ?? 1.0) >= 0.95} roughness={1} metalness={0} />
                    </mesh>
                    <mesh position={[0, 0, 0.064]} renderOrder={3}>
                        <shapeGeometry args={[frontRightFix.farVergeArc]} />
                        <meshStandardMaterial color={vergeStyle?.fillColor || '#c4a77d'} opacity={vergeStyle?.fillOpacity ?? 1.0} transparent={(vergeStyle?.fillOpacity ?? 1.0) < 1} side={THREE.DoubleSide} depthWrite={(vergeStyle?.fillOpacity ?? 1.0) >= 0.95} roughness={1} metalness={0} />
                    </mesh>
                </group>
            )}
        </group>
    )
}

export default UnifiedRoadNetwork
