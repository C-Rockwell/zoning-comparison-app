import { useMemo } from 'react'
import * as THREE from 'three'
import { useStore } from '../store/useStore'
import { useLotIds, useRoadModules, getLotData } from '../hooks/useEntityStore'
import { useShallow } from 'zustand/react/shallow'
import LotEntity from './LotEntity'
import RoadModule from './RoadModule'
import RoadAnnotations from './RoadAnnotations'
import RoadIntersectionFillet from './RoadIntersectionFillet'

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
            const rowA = roadsByDir[dirA].rightOfWay || 0
            const rowB = roadsByDir[dirB].rightOfWay || 0
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
                rects.push({
                    key: `intersection-${dirA}-${dirB}`,
                    cx: x + w / 2,
                    cy: y + h / 2,
                    w, h,
                })
            }
        }
        return rects
    }, [totalExtentLeft, totalExtentRight, maxLotDepth, roadsByDir])

    if (!roadModuleStyles) return null

    const roadEntries = Object.entries(roadModules)
    if (roadEntries.length === 0) return null

    return (
        <group>
            {roadEntries.map(([roadId, road]) => {
                if (!road.enabled) return null

                const dir = road.direction || 'front'

                // Determine the span and group position for each direction.
                // Roads stop at lot boundaries; intersection fillets handle corners.
                // Lots extend in negative X: totalExtentLeft is negative, totalExtentRight is 0.
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

                // Suppress end-edge lines where perpendicular roads create intersections.
                // After DIRECTION_ROTATION, canonical xMin/xMax map to different world edges.
                let suppressLeftEnd = false, suppressRightEnd = false
                if (dir === 'front') {
                    suppressLeftEnd = !!roadsByDir.left
                    suppressRightEnd = !!roadsByDir.right
                } else if (dir === 'rear') {
                    suppressLeftEnd = !!roadsByDir.right
                    suppressRightEnd = !!roadsByDir.left
                } else if (dir === 'left') {
                    suppressLeftEnd = !!roadsByDir.rear
                    suppressRightEnd = !!roadsByDir.front
                } else if (dir === 'right') {
                    suppressLeftEnd = !!roadsByDir.front
                    suppressRightEnd = !!roadsByDir.rear
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
                        {/* Road annotation labels (rotated to match road direction) */}
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

            {/* Intersection fill rectangles — road surface covering ROW overlap areas */}
            {(layers.roadIntersections !== false) && intersectionRects.map(rect => (
                <mesh key={rect.key} position={[rect.cx, rect.cy, 0.04]} receiveShadow renderOrder={1}>
                    <planeGeometry args={[rect.w, rect.h]} />
                    <meshStandardMaterial
                        color={roadModuleStyles.roadWidth?.fillColor || '#666666'}
                        opacity={roadModuleStyles.roadWidth?.fillOpacity ?? 1.0}
                        transparent={(roadModuleStyles.roadWidth?.fillOpacity ?? 1.0) < 1}
                        side={THREE.DoubleSide}
                        depthWrite={(roadModuleStyles.roadWidth?.fillOpacity ?? 1.0) >= 0.95}
                        roughness={1}
                        metalness={0}
                    />
                </mesh>
            ))}

            {/* Road Intersection Fillets — all 4 sub-corners per intersection */}
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
        </group>
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

    return (
        <group>
            {/* Ground plane */}
            {layers.ground && <GroundPlane style={groundStyle} />}

            {/* Origin marker */}
            {layers.origin && <OriginMarker />}

            {/* Lot entities */}
            {lotPositions.map(({ lotId, offset }, index) => (
                <LotEntity key={lotId} lotId={lotId} offset={offset} lotIndex={index + 1} />
            ))}

            {/* Road modules from entity system */}
            {layers.roadModule && (
                <EntityRoadModules lotPositions={lotPositions} />
            )}
        </group>
    )
}

export default DistrictSceneContent
