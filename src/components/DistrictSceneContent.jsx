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

    if (!roadModuleStyles) return null

    const roadEntries = Object.entries(roadModules)
    if (roadEntries.length === 0) return null

    // Build a lookup of enabled roads by direction for fillet computation
    const roadsByDir = useMemo(() => {
        const byDir = {}
        for (const [, road] of roadEntries) {
            if (road.enabled) byDir[road.direction] = road
        }
        return byDir
    }, [roadEntries])

    // Corner pairs for intersection fillets
    const cornerPairs = useMemo(() => [
        { corner: 'front-left', dirA: 'front', dirB: 'left', pos: [totalExtentLeft, 0] },
        { corner: 'front-right', dirA: 'front', dirB: 'right', pos: [totalExtentRight, 0] },
        { corner: 'rear-left', dirA: 'rear', dirB: 'left', pos: [totalExtentLeft, maxLotDepth] },
        { corner: 'rear-right', dirA: 'rear', dirB: 'right', pos: [totalExtentRight, maxLotDepth] },
    ], [totalExtentLeft, totalExtentRight, maxLotDepth])

    return (
        <group>
            {roadEntries.map(([roadId, road]) => {
                if (!road.enabled) return null

                const dir = road.direction || 'front'

                // Determine the span and group position for each direction.
                // Roads extend to cover adjacent ROW areas so corners connect.
                // Lots extend in negative X: totalExtentLeft is negative, totalExtentRight is 0.
                let spanWidth, posX, posY
                if (dir === 'front') {
                    spanWidth = totalWidth + leftROW + rightROW
                    posX = totalExtentLeft - leftROW
                    posY = 0
                } else if (dir === 'rear') {
                    spanWidth = totalWidth + leftROW + rightROW
                    posX = totalExtentRight + rightROW
                    posY = maxLotDepth
                } else if (dir === 'left') {
                    spanWidth = maxLotDepth + frontROW + rearROW
                    posX = totalExtentLeft
                    posY = maxLotDepth + rearROW
                } else if (dir === 'right') {
                    spanWidth = maxLotDepth + frontROW + rearROW
                    posX = totalExtentRight
                    posY = -frontROW
                } else {
                    spanWidth = totalWidth
                    posX = totalExtentLeft
                    posY = 0
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

            {/* Road Intersection Fillets */}
            {layers.roadIntersections && cornerPairs.map(({ corner, dirA, dirB, pos }) => {
                const rA = roadsByDir[dirA]
                const rB = roadsByDir[dirB]
                if (!rA || !rB) return null
                return (
                    <RoadIntersectionFillet
                        key={corner}
                        roadA={rA}
                        roadB={rB}
                        corner={corner}
                        cornerPosition={pos}
                        styles={roadModuleStyles}
                        lineScale={exportLineScale}
                    />
                )
            })}
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
