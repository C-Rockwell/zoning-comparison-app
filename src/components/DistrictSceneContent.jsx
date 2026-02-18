import { useMemo, useCallback } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { useStore } from '../store/useStore'
import { useLotIds, useRoadModules, getLotData } from '../hooks/useEntityStore'
import { useShallow } from 'zustand/react/shallow'
import LotEntity from './LotEntity'
import RoadModule from './RoadModule'
import RoadAnnotations from './RoadAnnotations'
import RoadIntersectionFillet from './RoadIntersectionFillet'
import { computeFilletOuterRadius, createNotchedRectShape } from '../utils/intersectionGeometry'
import { isExperimentalMoveModeEnabled } from '../utils/featureFlags'

// Direction rotation for annotation labels (matches RoadModule.jsx DIRECTION_ROTATION)
const DIRECTION_ROTATION = {
    front: [0, 0, 0],
    left: [0, 0, -Math.PI / 2],
    right: [0, 0, Math.PI / 2],
    rear: [0, 0, Math.PI],
}

// ============================================
// OriginMarker — small red sphere at world origin
// ============================================
const OriginMarker = () => (
    <mesh position={[0, 0, 0.5]}>
        <sphereGeometry args={[0.5]} />
        <meshBasicMaterial color="red" />
    </mesh>
)

// ============================================
// GroundPlane — receives shadows, centered
// ============================================
const GroundPlane = ({ style }) => {
    if (!style?.visible) return null

    return (
        <mesh position={[0, 50, -0.1]} receiveShadow>
            <planeGeometry args={[500, 500]} />
            <meshStandardMaterial
                color={style.color}
                opacity={style.opacity}
                transparent={style.opacity < 1}
                side={THREE.DoubleSide}
                depthWrite={style.opacity >= 0.95}
                roughness={1}
                metalness={0}
            />
        </mesh>
    )
}

// ============================================
// EntityRoadModules — renders road modules from
// the entity system for each enabled direction.
//
// Lots extend in negative X from origin (Lot 1 right edge at x=0).
// Roads are rendered in canonical "front" orientation then rotated via direction prop.
// Each road's span is extended to cover adjacent direction ROW areas so corners connect.
// ============================================
const EntityRoadModules = ({ lotPositions }) => {
    const roadModules = useRoadModules()
    const roadModuleStyles = useStore(state => state.roadModuleStyles)
    const exportLineScale = useStore(state => state.viewSettings.exportLineScale) || 1
    const layers = useStore(state => state.viewSettings.layers)

    // Calculate lot row extents and per-direction ROW widths for road connections
    const { totalExtentLeft, totalExtentRight, totalWidth, maxLotDepth, frontROW, rearROW, leftROW, rightROW } = useMemo(() => {
        if (lotPositions.length === 0) return { totalExtentLeft: -100, totalExtentRight: 0, totalWidth: 100, maxLotDepth: 100, frontROW: 0, rearROW: 0, leftROW: 0, rightROW: 0 }

        // Find the actual leftmost and rightmost edges across all lots
        let left = Infinity, right = -Infinity
        for (const lp of lotPositions) {
            if (lp.leftEdge < left) left = lp.leftEdge
            if (lp.rightEdge > right) right = lp.rightEdge
        }
        let maxD = 100
        for (const lp of lotPositions) {
            const lot = getLotData(lp.lotId)
            const depth = lot?.lotDepth || 100
            if (depth > maxD) maxD = depth
        }

        // Compute ROW widths per direction from enabled roads
        let fROW = 0, rROW = 0, lROW = 0, rROW2 = 0
        for (const [, road] of Object.entries(roadModules)) {
            if (!road.enabled) continue
            const row = road.rightOfWay || 0
            if (road.direction === 'front') fROW = Math.max(fROW, row)
            if (road.direction === 'rear') rROW = Math.max(rROW, row)
            if (road.direction === 'left') lROW = Math.max(lROW, row)
            if (road.direction === 'right') rROW2 = Math.max(rROW2, row)
        }

        return { totalExtentLeft: left, totalExtentRight: right, totalWidth: right - left, maxLotDepth: maxD, frontROW: fROW, rearROW: rROW, leftROW: lROW, rightROW: rROW2 }
    }, [lotPositions, roadModules])

    // Build a lookup of enabled roads by direction for fillet computation
    // NOTE: All hooks must be called before any early returns (React Rules of Hooks)
    const roadsByDir = useMemo(() => {
        const byDir = {}
        for (const [, road] of Object.entries(roadModules)) {
            if (road.enabled) byDir[road.direction] = road
        }
        return byDir
    }, [roadModules])

    // Generate all 4 fillet sub-corners for each intersection between perpendicular roads.
    // Each intersection has: lot corner (toward×toward), far-B (toward×away),
    // far-A (away×toward), and far corner (away×away).
    const allFilletCorners = useMemo(() => {
        const flipA = d => d === 'front' ? 'rear' : d === 'rear' ? 'front' : d
        const flipB = d => d === 'left' ? 'right' : d === 'right' ? 'left' : d
        const getOffset = (dir) => {
            if (dir === 'front') return { dx: 0, dy: -frontROW }
            if (dir === 'rear') return { dx: 0, dy: rearROW }
            if (dir === 'left') return { dx: -leftROW, dy: 0 }
            if (dir === 'right') return { dx: rightROW, dy: 0 }
            return { dx: 0, dy: 0 }
        }

        const pairs = [
            { dirA: 'front', dirB: 'left', lotPos: [totalExtentLeft, 0] },
            { dirA: 'front', dirB: 'right', lotPos: [totalExtentRight, 0] },
            { dirA: 'rear', dirB: 'left', lotPos: [totalExtentLeft, maxLotDepth] },
            { dirA: 'rear', dirB: 'right', lotPos: [totalExtentRight, maxLotDepth] },
        ]

        const corners = []
        for (const { dirA, dirB, lotPos } of pairs) {
            if (!roadsByDir[dirA] || !roadsByDir[dirB]) continue

            // Suppress fillets at alley (S3) intersections — alleys meet cross
            // streets at 90-degree angles with no curb returns
            const typeA = roadsByDir[dirA].type || 'S1'
            const typeB = roadsByDir[dirB].type || 'S1'
            if (typeA === 'S3' || typeB === 'S3') continue

            const oA = getOffset(dirA)
            const oB = getOffset(dirB)
            const pairName = `${dirA}-${dirB}`

            // Sub-corner 1: lot corner (toward × toward)
            corners.push({ key: `${pairName}-tt`, corner: pairName, dirA, dirB, pos: lotPos, sideA: 'right', sideB: 'right' })
            // Sub-corner 2: toward A × away B (offset by B's ROW)
            corners.push({ key: `${pairName}-ta`, corner: `${dirA}-${flipB(dirB)}`, dirA, dirB, pos: [lotPos[0] + oB.dx, lotPos[1] + oB.dy], sideA: 'right', sideB: 'left' })
            // Sub-corner 3: away A × toward B (offset by A's ROW)
            corners.push({ key: `${pairName}-at`, corner: `${flipA(dirA)}-${dirB}`, dirA, dirB, pos: [lotPos[0] + oA.dx, lotPos[1] + oA.dy], sideA: 'left', sideB: 'right' })
            // Sub-corner 4: away × away (offset by both)
            corners.push({ key: `${pairName}-aa`, corner: `${flipA(dirA)}-${flipB(dirB)}`, dirA, dirB, pos: [lotPos[0] + oA.dx + oB.dx, lotPos[1] + oA.dy + oB.dy], sideA: 'left', sideB: 'left' })
        }
        return corners
    }, [totalExtentLeft, totalExtentRight, maxLotDepth, frontROW, rearROW, leftROW, rightROW, roadsByDir])

    // Compute intersection fill rectangles — one per perpendicular road pair.
    // Each rectangle covers the full ROW × ROW overlap area at z=0.04
    // (above road zones at 0.01 and ROW lines at 0.03, below fillets at 0.05).
    // Corners are notched with concave arcs matching fillet outer radii to prevent z-fighting.
    const intersectionRects = useMemo(() => {
        const pairs = [
            { dirA: 'front', dirB: 'left',  corner: [totalExtentLeft, 0] },
            { dirA: 'front', dirB: 'right', corner: [totalExtentRight, 0] },
            { dirA: 'rear',  dirB: 'left',  corner: [totalExtentLeft, maxLotDepth] },
            { dirA: 'rear',  dirB: 'right', corner: [totalExtentRight, maxLotDepth] },
        ]
        const rects = []
        for (const { dirA, dirB, corner } of pairs) {
            if (!roadsByDir[dirA] || !roadsByDir[dirB]) continue
            // Suppress intersection fill at S3 (alley) corners — the dominant
            // road's extended zone bands cover the corner area instead
            if ((roadsByDir[dirA].type || 'S1') === 'S3' || (roadsByDir[dirB].type || 'S1') === 'S3') continue
            const roadA = roadsByDir[dirA]
            const roadB = roadsByDir[dirB]
            const rowA = roadA.rightOfWay || 0
            const rowB = roadB.rightOfWay || 0
            let x, y, w, h
            if (dirA === 'front' && dirB === 'left') {
                x = corner[0] - rowB; y = corner[1] - rowA; w = rowB; h = rowA
            } else if (dirA === 'front' && dirB === 'right') {
                x = corner[0]; y = corner[1] - rowA; w = rowB; h = rowA
            } else if (dirA === 'rear' && dirB === 'left') {
                x = corner[0] - rowB; y = corner[1]; w = rowB; h = rowA
            } else if (dirA === 'rear' && dirB === 'right') {
                x = corner[0]; y = corner[1]; w = rowB; h = rowA
            }
            if (w > 0 && h > 0) {
                // Compute fillet outer radius at each sub-corner of this intersection rect.
                // Sub-corners: tt = toward A × toward B, ta = toward A × away B,
                //              at = away A × toward B, aa = away A × away B
                const rTT = computeFilletOuterRadius(roadA, roadB, 'right', 'right')
                const rTA = computeFilletOuterRadius(roadA, roadB, 'right', 'left')
                const rAT = computeFilletOuterRadius(roadA, roadB, 'left', 'right')
                const rAA = computeFilletOuterRadius(roadA, roadB, 'left', 'left')

                // Map sub-corners to rect corners (topLeft/topRight/bottomLeft/bottomRight)
                // based on which intersection position this is
                let radii
                if (dirA === 'front' && dirB === 'left') {
                    radii = { topRight: rTT, topLeft: rTA, bottomRight: rAT, bottomLeft: rAA }
                } else if (dirA === 'front' && dirB === 'right') {
                    radii = { topLeft: rTT, topRight: rTA, bottomLeft: rAT, bottomRight: rAA }
                } else if (dirA === 'rear' && dirB === 'left') {
                    radii = { bottomRight: rTT, bottomLeft: rTA, topRight: rAT, topLeft: rAA }
                } else {
                    // rear-right
                    radii = { bottomLeft: rTT, bottomRight: rTA, topLeft: rAT, topRight: rAA }
                }

                const shape = createNotchedRectShape(w, h, radii)
                rects.push({
                    key: `intersection-${dirA}-${dirB}`,
                    cx: x + w / 2,
                    cy: y + h / 2,
                    w, h, shape,
                })
            }
        }
        return rects
    }, [totalExtentLeft, totalExtentRight, maxLotDepth, roadsByDir])

    // Alley fill rects — small connector rectangles at S3 corners, spanning only
    // the perpendicular road's sidewalk+verge strip (lot boundary to curb line).
    const alleyFillRects = useMemo(() => {
        const pairs = [
            { dirA: 'front', dirB: 'left',  corner: [totalExtentLeft, 0] },
            { dirA: 'front', dirB: 'right', corner: [totalExtentRight, 0] },
            { dirA: 'rear',  dirB: 'left',  corner: [totalExtentLeft, maxLotDepth] },
            { dirA: 'rear',  dirB: 'right', corner: [totalExtentRight, maxLotDepth] },
        ]
        const rects = []
        for (const { dirA, dirB, corner } of pairs) {
            if (!roadsByDir[dirA] || !roadsByDir[dirB]) continue
            const typeA = roadsByDir[dirA].type || 'S1'
            const typeB = roadsByDir[dirB].type || 'S1'
            const s3Road = typeA === 'S3' ? roadsByDir[dirA] : typeB === 'S3' ? roadsByDir[dirB] : null
            const perpRoad = typeA === 'S3' ? roadsByDir[dirB] : typeB === 'S3' ? roadsByDir[dirA] : null
            const s3Dir = typeA === 'S3' ? dirA : typeB === 'S3' ? dirB : null
            const perpDir = typeA === 'S3' ? dirB : typeB === 'S3' ? dirA : null
            if (!s3Road || !perpRoad) continue

            const sROW = s3Road.rightOfWay || 20
            const sRW = s3Road.roadWidth || 16
            const inset = (sROW - sRW) / 2
            const perpROW = perpRoad.rightOfWay || 50
            const perpRW = perpRoad.roadWidth || 24
            const perpInset = (perpROW - perpRW) / 2 // sidewalk+verge width (13' for S1)

            let cx, cy, w, h
            if (s3Dir === 'rear' && perpDir === 'left') {
                cx = corner[0] - perpInset / 2
                cy = corner[1] + inset + sRW / 2
                w = perpInset; h = sRW
            } else if (s3Dir === 'rear' && perpDir === 'right') {
                cx = corner[0] + perpInset / 2
                cy = corner[1] + inset + sRW / 2
                w = perpInset; h = sRW
            } else if (s3Dir === 'front' && perpDir === 'left') {
                cx = corner[0] - perpInset / 2
                cy = corner[1] - inset - sRW / 2
                w = perpInset; h = sRW
            } else if (s3Dir === 'front' && perpDir === 'right') {
                cx = corner[0] + perpInset / 2
                cy = corner[1] - inset - sRW / 2
                w = perpInset; h = sRW
            } else if (s3Dir === 'left' && perpDir === 'front') {
                cx = corner[0] - inset - sRW / 2
                cy = corner[1] - perpInset / 2
                w = sRW; h = perpInset
            } else if (s3Dir === 'left' && perpDir === 'rear') {
                cx = corner[0] - inset - sRW / 2
                cy = corner[1] + perpInset / 2
                w = sRW; h = perpInset
            } else if (s3Dir === 'right' && perpDir === 'front') {
                cx = corner[0] + inset + sRW / 2
                cy = corner[1] - perpInset / 2
                w = sRW; h = perpInset
            } else if (s3Dir === 'right' && perpDir === 'rear') {
                cx = corner[0] + inset + sRW / 2
                cy = corner[1] + perpInset / 2
                w = sRW; h = perpInset
            }
            if (w > 0 && h > 0) {
                rects.push({ key: `alley-fill-${dirA}-${dirB}`, cx, cy, w, h })
            }
        }
        return rects
    }, [totalExtentLeft, totalExtentRight, maxLotDepth, roadsByDir])

    if (!roadModuleStyles) return null

    const roadEntries = Object.entries(roadModules)
    if (roadEntries.length === 0) return null

    return (
        <group>
                <>
                    {roadEntries.map(([roadId, road]) => {
                        if (!road.enabled) return null

                        const dir = road.direction || 'front'

                        let spanWidth, posX, posY
                        if (dir === 'front') {
                            spanWidth = totalWidth
                            posX = totalExtentLeft
                            posY = 0
                        } else if (dir === 'rear') {
                            spanWidth = totalWidth
                            posX = totalExtentRight
                            posY = maxLotDepth
                        } else if (dir === 'left') {
                            spanWidth = maxLotDepth
                            posX = totalExtentLeft
                            posY = maxLotDepth
                        } else if (dir === 'right') {
                            spanWidth = maxLotDepth
                            posX = totalExtentRight
                            posY = 0
                        } else {
                            spanWidth = totalWidth
                            posX = totalExtentLeft
                            posY = 0
                        }

                        // Extend non-S3 roads through perpendicular S3 (alley) roads
                        // so the dominant road's zone bands continue through the alley area
                        const ownType = road.type || 'S1'
                        const _isS3 = (r) => (r?.type || 'S1') === 'S3'
                        if (ownType !== 'S3') {
                            // perpLeft/perpRight = the perpendicular road at each end of this road
                            const perpLeft = dir === 'front' ? roadsByDir.left
                                           : dir === 'rear' ? roadsByDir.right
                                           : dir === 'left' ? roadsByDir.rear
                                           : roadsByDir.front
                            const perpRight = dir === 'front' ? roadsByDir.right
                                            : dir === 'rear' ? roadsByDir.left
                                            : dir === 'left' ? roadsByDir.front
                                            : roadsByDir.rear
                            if (perpLeft && _isS3(perpLeft)) {
                                const perpROW = perpLeft.rightOfWay || 0
                                spanWidth += perpROW
                                if (dir === 'front') posX -= perpROW
                                else if (dir === 'rear') posX += perpROW
                                else if (dir === 'left') posY += perpROW
                                else if (dir === 'right') posY -= perpROW
                            }
                            if (perpRight && _isS3(perpRight)) {
                                spanWidth += (perpRight.rightOfWay || 0)
                            }
                        }

                        // Suppress end lines at perpendicular road intersections.
                        // At S3 corners, non-S3 roads extend through (keep end lines);
                        // S3 roads always suppress ends at cross-streets.
                        const isOwnS3 = ownType === 'S3'
                        let suppressLeftEnd = false, suppressRightEnd = false
                        if (dir === 'front') {
                            suppressLeftEnd = !!roadsByDir.left && (isOwnS3 || !_isS3(roadsByDir.left))
                            suppressRightEnd = !!roadsByDir.right && (isOwnS3 || !_isS3(roadsByDir.right))
                        } else if (dir === 'rear') {
                            suppressLeftEnd = !!roadsByDir.right && (isOwnS3 || !_isS3(roadsByDir.right))
                            suppressRightEnd = !!roadsByDir.left && (isOwnS3 || !_isS3(roadsByDir.left))
                        } else if (dir === 'left') {
                            suppressLeftEnd = !!roadsByDir.rear && (isOwnS3 || !_isS3(roadsByDir.rear))
                            suppressRightEnd = !!roadsByDir.front && (isOwnS3 || !_isS3(roadsByDir.front))
                        } else if (dir === 'right') {
                            suppressLeftEnd = !!roadsByDir.front && (isOwnS3 || !_isS3(roadsByDir.front))
                            suppressRightEnd = !!roadsByDir.rear && (isOwnS3 || !_isS3(roadsByDir.rear))
                        }

                        return (
                            <group key={roadId} position={[posX, posY, 0]}>
                                <RoadModule
                                    lotWidth={spanWidth}
                                    roadModule={road}
                                    styles={roadModuleStyles}
                                    model="proposed"
                                    direction={dir}
                                    lineScale={exportLineScale}
                                    suppressLeftEnd={suppressLeftEnd}
                                    suppressRightEnd={suppressRightEnd}
                                />
                            </group>
                        )
                    })}

                    {(layers.roadIntersections !== false) && intersectionRects.map(rect => {
                        if (!rect.shape) return null
                        const intColor = roadModuleStyles.intersectionFill?.fillColor ?? roadModuleStyles.roadWidth?.fillColor ?? '#666666'
                        const intOpacity = roadModuleStyles.intersectionFill?.fillOpacity ?? roadModuleStyles.roadWidth?.fillOpacity ?? 1.0
                        return (
                            <mesh key={rect.key} position={[rect.cx, rect.cy, 0.04]} receiveShadow renderOrder={1}>
                                <shapeGeometry args={[rect.shape]} />
                                <meshStandardMaterial
                                    color={intColor}
                                    opacity={intOpacity}
                                    transparent={intOpacity < 1}
                                    side={THREE.DoubleSide}
                                    depthWrite={intOpacity >= 0.95}
                                    roughness={1}
                                    metalness={0}
                                />
                            </mesh>
                        )
                    })}

                    {(layers.roadIntersections !== false) && alleyFillRects.map(rect => {
                        const intColor = roadModuleStyles.alleyIntersectionFill?.fillColor ?? roadModuleStyles.intersectionFill?.fillColor ?? '#666666'
                        const intOpacity = roadModuleStyles.alleyIntersectionFill?.fillOpacity ?? roadModuleStyles.intersectionFill?.fillOpacity ?? 1.0
                        return (
                            <mesh key={rect.key} position={[rect.cx, rect.cy, 0.035]} receiveShadow renderOrder={1}>
                                <planeGeometry args={[rect.w, rect.h]} />
                                <meshStandardMaterial
                                    color={intColor}
                                    opacity={intOpacity}
                                    transparent={intOpacity < 1}
                                    side={THREE.DoubleSide}
                                    depthWrite={intOpacity >= 0.95}
                                    roughness={1}
                                    metalness={0}
                                />
                            </mesh>
                        )
                    })}

                    {(layers.roadIntersections !== false) && allFilletCorners.map(({ key, corner, dirA, dirB, pos, sideA, sideB }) => (
                        <RoadIntersectionFillet
                            key={key}
                            roadA={roadsByDir[dirA]}
                            roadB={roadsByDir[dirB]}
                            corner={corner}
                            cornerPosition={pos}
                            styles={roadModuleStyles}
                            lineScale={exportLineScale}
                            sideA={sideA}
                            sideB={sideB}
                            roadWidthStyle={roadModuleStyles.roadWidth}
                        />
                    ))}
                </>

            {/* Road annotation labels */}
            {roadEntries.map(([roadId, road]) => {
                if (!road.enabled) return null
                const dir = road.direction || 'front'

                let spanWidth, posX, posY
                if (dir === 'front') {
                    spanWidth = totalWidth; posX = totalExtentLeft; posY = 0
                } else if (dir === 'rear') {
                    spanWidth = totalWidth; posX = totalExtentRight; posY = maxLotDepth
                } else if (dir === 'left') {
                    spanWidth = maxLotDepth; posX = totalExtentLeft; posY = maxLotDepth
                } else if (dir === 'right') {
                    spanWidth = maxLotDepth; posX = totalExtentRight; posY = 0
                } else {
                    spanWidth = totalWidth; posX = totalExtentLeft; posY = 0
                }

                return (
                    <group key={`annot-${roadId}`} position={[posX, posY, 0]}>
                        <group rotation={DIRECTION_ROTATION[dir]}>
                            <RoadAnnotations
                                roadId={roadId}
                                road={road}
                                spanWidth={spanWidth}
                                lineScale={exportLineScale}
                            />
                        </group>
                    </group>
                )
            })}
        </group>
    )
}

// ============================================
// MoveModeCapturePlane — invisible full-screen plane
// that captures pointer events during move mode
// so user can move the mouse freely in 3D space
// ============================================
const MoveModeCapturePlane = () => {
    const moveMode = useStore((s) => s.moveMode)
    const setEntityBuildingPosition = useStore((s) => s.setEntityBuildingPosition)
    const setAnnotationPosition = useStore((s) => s.setAnnotationPosition)
    const exitMoveMode = useStore((s) => s.exitMoveMode)
    const { controls } = useThree()
    const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), [])
    const planeIntersectPoint = useMemo(() => new THREE.Vector3(), [])

    // Get lot offset for building position calculation
    const lotIds = useLotIds()
    const lotPositions = useMemo(() => {
        const positions = {}
        let negOffset = 0
        for (let i = 0; i < lotIds.length; i++) {
            const lot = getLotData(lotIds[i])
            const lotWidth = lot?.lotWidth || 50
            if (i === 0) {
                positions[lotIds[i]] = lotWidth / 2
            } else {
                negOffset -= lotWidth
                positions[lotIds[i]] = negOffset + lotWidth / 2
            }
        }
        return positions
    }, [lotIds])

    const handlePointerMove = useCallback((e) => {
        if (!moveMode?.active || moveMode.phase !== 'moving' || !moveMode.basePoint) return
        e.stopPropagation()
        if (!e.ray.intersectPlane(plane, planeIntersectPoint)) return

        if (moveMode.targetType === 'building') {
            const offsetGroupX = lotPositions[moveMode.targetLotId] ?? 0
            const localX = planeIntersectPoint.x - offsetGroupX
            const localY = planeIntersectPoint.y
            const dx = localX - moveMode.basePoint[0]
            const dy = localY - moveMode.basePoint[1]
            const newX = Math.round((moveMode.originalPosition?.[0] ?? 0) + dx)
            const newY = Math.round((moveMode.originalPosition?.[1] ?? 0) + dy)
            setEntityBuildingPosition(moveMode.targetLotId, moveMode.targetBuildingType, newX, newY)
        } else if (moveMode.targetType === 'lotAccessArrow') {
            const dx = planeIntersectPoint.x - moveMode.basePoint[0]
            const dy = planeIntersectPoint.y - moveMode.basePoint[1]
            const newPos = [
                (moveMode.originalPosition?.[0] ?? 0) + dx,
                (moveMode.originalPosition?.[1] ?? 0) + dy,
                moveMode.originalPosition?.[2] ?? 0,
            ]
            setAnnotationPosition(`lot-${moveMode.targetLotId}-access-${moveMode.targetDirection}`, newPos)
        }
    }, [moveMode, plane, planeIntersectPoint, lotPositions, setEntityBuildingPosition, setAnnotationPosition])

    const handlePointerDown = useCallback((e) => {
        e.stopPropagation()
        useStore.temporal.getState().resume()
        if (controls) controls.enabled = true
        exitMoveMode()
    }, [exitMoveMode, controls])

    return (
        <mesh
            position={[0, 0, 200]}
            onPointerMove={handlePointerMove}
            onPointerDown={handlePointerDown}
        >
            <planeGeometry args={[2000, 2000]} />
            <meshBasicMaterial visible={false} />
        </mesh>
    )
}

// ============================================
// DistrictSceneContent — iterates entityOrder
// and renders LotEntity for each lot, positioned
// in a row along the X axis with spacing.
// ============================================
const DistrictSceneContent = () => {
    const lotIds = useLotIds()
    const layers = useStore(useShallow(state => state.viewSettings.layers))
    const groundStyle = useStore(useShallow(state => state.viewSettings.styleSettings?.ground))
    const roadModulesState = useStore(state => state.entities?.roadModules ?? {})

    // Calculate lot positions: Lot 1 extends in positive X from origin,
    // Lots 2+ extend in negative X from origin. Origin (0,0) = front-left corner of Lot 1.
    const lotPositions = useMemo(() => {
        const LOT_SPACING = 0 // lots are adjacent (touching)
        const positions = []
        let negOffset = 0 // tracks negative X accumulation for lots 2+

        for (let i = 0; i < lotIds.length; i++) {
            const lotId = lotIds[i]
            const lot = getLotData(lotId)
            const lotWidth = lot?.lotWidth || 50

            if (i === 0) {
                // Lot 1: extends in positive X from origin
                positions.push({
                    lotId,
                    offset: 0,
                    leftEdge: 0,
                    rightEdge: lotWidth,
                })
            } else {
                // Lots 2+: extend in negative X from origin
                negOffset -= lotWidth
                positions.push({
                    lotId,
                    offset: negOffset,
                    leftEdge: negOffset,
                    rightEdge: negOffset + lotWidth,
                })
                negOffset -= LOT_SPACING
            }
        }

        return positions
    }, [lotIds])

    // Derive active road directions from actual enabled road modules
    // (not from modelSetup.streetEdges, which can desync during undo/redo)
    const activeRoadDirs = useMemo(() => {
        const dirs = { front: false, left: false, right: false, rear: false }
        for (const road of Object.values(roadModulesState)) {
            if (road.enabled) dirs[road.direction] = true
        }
        return dirs
    }, [roadModulesState])

    // Compute per-lot street sides for setback line placement.
    // Street-facing sides use minSideStreet; interior sides use sideInterior.
    // Lot 1 (index 0, rightmost) may face a right road; last lot (leftmost) may face a left road.
    const lotStreetSides = useMemo(() => {
        return lotPositions.map((_, index) => {
            const isFirst = index === 0
            const isLast = index === lotPositions.length - 1
            const isOnly = lotPositions.length === 1
            return {
                left: isOnly ? activeRoadDirs.left : isLast ? activeRoadDirs.left : false,
                right: isOnly ? activeRoadDirs.right : isFirst ? activeRoadDirs.right : false,
            }
        })
    }, [lotPositions, activeRoadDirs])

    // Move mode state
    const moveMode = useStore((s) => s.moveMode)
    const experimentalMoveModeEnabled = useMemo(() => isExperimentalMoveModeEnabled(), [])

    return (
        <group>
            {/* Ground plane */}
            {layers.ground && <GroundPlane style={groundStyle} />}

            {/* Origin marker */}
            {layers.origin && <OriginMarker />}

            {/* Lot entities */}
            {lotPositions.map(({ lotId, offset }, index) => (
                <LotEntity key={lotId} lotId={lotId} offset={offset} lotIndex={index + 1} streetSides={lotStreetSides[index]} />
            ))}

            {/* Road modules from entity system */}
            {layers.roadModule && (
                <EntityRoadModules lotPositions={lotPositions} />
            )}

            {/* Move mode capture plane — invisible plane that captures pointer events during move */}
            {moveMode?.active && moveMode.phase === 'moving' && (
                experimentalMoveModeEnabled
                    // Future spike path: swap in experimental move-mode implementation here.
                    ? <MoveModeCapturePlane key="move-capture-experimental" />
                    // Default path remains unchanged.
                    : <MoveModeCapturePlane key="move-capture-default" />
            )}
        </group>
    )
}

export default DistrictSceneContent
