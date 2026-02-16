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

const createBandShape = (lotBounds, inner, outer) => {
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

    const shape = new THREE.Shape()
    buildRoundedRectPath(shape, outerBounds, {
        bl: Math.min(outer.front, outer.left),
        br: Math.min(outer.front, outer.right),
        tr: Math.min(outer.rear, outer.right),
        tl: Math.min(outer.rear, outer.left),
    })

    const hole = new THREE.Path()
    buildRoundedRectPath(hole, innerBounds, {
        bl: Math.min(inner.front, inner.left),
        br: Math.min(inner.front, inner.right),
        tr: Math.min(inner.rear, inner.right),
        tl: Math.min(inner.rear, inner.left),
    })
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

const UnifiedRoadNetwork = ({
    lotBounds,
    enabledDirections,
    roadModuleStyles,
}) => {
    const bandShapes = useMemo(() => {
        const edges = ['front', 'right', 'rear', 'left']
        const boundariesByEdge = {}

        for (const edge of edges) {
            if (!enabledDirections?.[edge]) {
                boundariesByEdge[edge] = [0, 0, 0, 0, 0, 0]
                continue
            }
            boundariesByEdge[edge] = getBandBoundaries(getProfileForDirection(edge))
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

            const shape = createBandShape(lotBounds, inner, outer)
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

    if (!bandShapes.length) return null

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
        </group>
    )
}

export default UnifiedRoadNetwork
