import { useMemo } from 'react'
import { useStore } from '../store/useStore'
import { useShallow } from 'zustand/react/shallow'
import DraggableLabel from './DraggableLabel'

/**
 * Road type display name mapping.
 */
const ROAD_TYPE_NAMES = {
    S1: 'Primary Street',
    S2: 'Secondary Street',
    S3: 'Alley',
}

/**
 * Renders annotation labels for a road module.
 * Labels include: road name and road zone labels (surface, R.O.W., parking, verge, sidewalk, transition).
 * All gated by the master annotationLabels toggle plus per-category layer toggles.
 *
 * Positions are in canonical "front" orientation (road along X, zones stacking in -Y).
 * The parent group (RoadModule) handles rotation for other directions.
 */
const RoadAnnotations = ({
    roadId,
    road = {},
    spanWidth = 0,
    lineScale = 1,
}) => {
    const { annotationSettings, annotationPositions, setAnnotationPosition, layers } = useStore(
        useShallow((state) => ({
            annotationSettings: state.annotationSettings,
            annotationPositions: state.annotationPositions,
            setAnnotationPosition: state.setAnnotationPosition,
            layers: state.viewSettings?.layers,
        }))
    )

    // Master toggle — hide everything if annotation labels are off
    if (!layers?.annotationLabels) return null

    const {
        type = 'S1',
        rightOfWay = 50,
        roadWidth = 24,
        rightParking = 0,
        rightVerge = 0,
        rightSidewalk = 0,
        rightTransitionZone = 0,
        leftParking = 0,
        leftVerge = 0,
        leftSidewalk = 0,
        leftTransitionZone = 0,
    } = road

    // Canonical geometry layout (matching RoadModule.jsx):
    // - Centerline Y = -rightOfWay/2
    // - Road top edge = centerlineY + roadWidth/2 (closer to lot, toward Y=0)
    // - Road bottom edge = centerlineY - roadWidth/2 (toward Y=-rightOfWay)
    // - Right-side zones stack from road top toward Y=0
    // - Left-side zones stack from road bottom toward Y=-rightOfWay
    const centerlineY = -rightOfWay / 2
    const roadHalfWidth = roadWidth / 2
    const roadTopY = centerlineY + roadHalfWidth
    const roadBottomY = centerlineY - roadHalfWidth

    // Shared style props
    const sharedProps = {
        color: annotationSettings.textColor,
        rotation: annotationSettings.textRotation,
        background: {
            enabled: annotationSettings.backgroundEnabled,
            color: annotationSettings.backgroundColor,
            opacity: annotationSettings.backgroundOpacity,
            padding: 0.3,
        },
        outlineColor: '#ffffff',
        outlineWidth: 0.15,
        leaderLineSettings: {
            color: annotationSettings.leaderLineColor,
            width: annotationSettings.leaderLineWidth,
            dashed: annotationSettings.leaderLineDashed,
        },
        lineScale,
    }

    const baseFontSize = annotationSettings.fontSize
    const zoneFontSize = baseFontSize * 0.8
    const midX = spanWidth / 2

    // ---------- Road Name ----------
    const roadTypeName = ROAD_TYPE_NAMES[type] || type
    const roadNameId = `road-${roadId}-name`
    const roadNameDefault = [midX, centerlineY, 0.2]

    // ---------- Road Zone Labels ----------
    // Build zone labels by computing stacking positions
    const zoneLabels = useMemo(() => {
        const labels = []

        // Road Surface — at centerline
        labels.push({
            id: `road-${roadId}-zone-surface`,
            text: 'Road Surface',
            defaultPosition: [midX, centerlineY, 0.15],
        })

        // R.O.W. — near the outer boundary
        labels.push({
            id: `road-${roadId}-zone-row`,
            text: 'R.O.W.',
            defaultPosition: [midX, -rightOfWay + 1, 0.15],
        })

        // Right-side zones (stacking from road top toward Y=0)
        let rightCursor = roadTopY

        if (rightParking > 0) {
            labels.push({
                id: `road-${roadId}-zone-right-parking`,
                text: 'Parking',
                defaultPosition: [midX, rightCursor + rightParking / 2, 0.15],
            })
            rightCursor += rightParking
        }

        if (rightVerge > 0) {
            labels.push({
                id: `road-${roadId}-zone-right-verge`,
                text: 'Verge',
                defaultPosition: [midX, rightCursor + rightVerge / 2, 0.15],
            })
            rightCursor += rightVerge
        }

        if (rightSidewalk > 0) {
            labels.push({
                id: `road-${roadId}-zone-right-sidewalk`,
                text: 'Sidewalk',
                defaultPosition: [midX, rightCursor + rightSidewalk / 2, 0.15],
            })
            rightCursor += rightSidewalk
        }

        if (rightTransitionZone > 0) {
            labels.push({
                id: `road-${roadId}-zone-right-transition`,
                text: 'Transition',
                defaultPosition: [midX, rightCursor + rightTransitionZone / 2, 0.15],
            })
            rightCursor += rightTransitionZone
        }

        // Left-side zones (stacking from road bottom toward Y=-rightOfWay)
        let leftCursor = roadBottomY

        if (leftParking > 0) {
            labels.push({
                id: `road-${roadId}-zone-left-parking`,
                text: 'Parking',
                defaultPosition: [midX, leftCursor - leftParking / 2, 0.15],
            })
            leftCursor -= leftParking
        }

        if (leftVerge > 0) {
            labels.push({
                id: `road-${roadId}-zone-left-verge`,
                text: 'Verge',
                defaultPosition: [midX, leftCursor - leftVerge / 2, 0.15],
            })
            leftCursor -= leftVerge
        }

        if (leftSidewalk > 0) {
            labels.push({
                id: `road-${roadId}-zone-left-sidewalk`,
                text: 'Sidewalk',
                defaultPosition: [midX, leftCursor - leftSidewalk / 2, 0.15],
            })
            leftCursor -= leftSidewalk
        }

        if (leftTransitionZone > 0) {
            labels.push({
                id: `road-${roadId}-zone-left-transition`,
                text: 'Transition',
                defaultPosition: [midX, leftCursor - leftTransitionZone / 2, 0.15],
            })
            leftCursor -= leftTransitionZone
        }

        return labels
    }, [
        roadId, midX, centerlineY, rightOfWay,
        roadTopY, roadBottomY,
        rightParking, rightVerge, rightSidewalk, rightTransitionZone,
        leftParking, leftVerge, leftSidewalk, leftTransitionZone,
    ])

    return (
        <group>
            {/* Road Name */}
            {layers.labelRoadNames && (
                <DraggableLabel
                    {...sharedProps}
                    text={`${type} - ${roadTypeName}`}
                    fontSize={baseFontSize * 1.2}
                    defaultPosition={roadNameDefault}
                    anchorPoint={[midX, centerlineY, 0]}
                    customPosition={annotationPositions[roadNameId] || null}
                    onPositionChange={(pos) => setAnnotationPosition(roadNameId, pos)}
                />
            )}

            {/* Road Zone Labels */}
            {layers.labelRoadZones && zoneLabels.map((label) => (
                <DraggableLabel
                    key={label.id}
                    {...sharedProps}
                    text={label.text}
                    fontSize={zoneFontSize}
                    defaultPosition={label.defaultPosition}
                    anchorPoint={label.defaultPosition}
                    customPosition={annotationPositions[label.id] || null}
                    onPositionChange={(pos) => setAnnotationPosition(label.id, pos)}
                />
            ))}
        </group>
    )
}

export default RoadAnnotations
