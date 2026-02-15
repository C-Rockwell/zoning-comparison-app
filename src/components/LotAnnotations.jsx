import { useMemo } from 'react'
import { useStore } from '../store/useStore'
import { useShallow } from 'zustand/react/shallow'
import DraggableLabel from './DraggableLabel'

/**
 * Renders all annotation labels for a single lot/condition.
 * Each label is a DraggableLabel with drag-to-reposition and leader lines.
 *
 * Labels include: lot name, lot edge labels, setback labels, and building labels.
 * All gated by the master annotationLabels toggle plus per-category layer toggles.
 */
const LotAnnotations = ({
    lotId,
    lotWidth,
    lotDepth,
    setbacks = {},
    buildings = {},
    lotIndex = 1,
    lotCenter = [0, 0],
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

    // Shared style props derived from annotation settings
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

    // ---------- Lot Name ----------
    const lotNameId = `lot-${lotId}-name`
    const lotNameDefault = [lotWidth / 2, lotDepth / 2, 0.2]

    // ---------- Lot Edge Labels ----------
    const edgeLabels = [
        {
            id: `lot-${lotId}-edge-front`,
            text: 'Front',
            defaultPosition: [lotWidth / 2, -3, 0.15],
            anchorPoint: [lotWidth / 2, 0, 0],
        },
        {
            id: `lot-${lotId}-edge-rear`,
            text: 'Rear',
            defaultPosition: [lotWidth / 2, lotDepth + 3, 0.15],
            anchorPoint: [lotWidth / 2, lotDepth, 0],
        },
        {
            id: `lot-${lotId}-edge-interior`,
            text: 'Side (Interior)',
            defaultPosition: [-3, lotDepth / 2, 0.15],
            anchorPoint: [0, lotDepth / 2, 0],
        },
        {
            id: `lot-${lotId}-edge-street`,
            text: 'Side (Street)',
            defaultPosition: [lotWidth + 3, lotDepth / 2, 0.15],
            anchorPoint: [lotWidth, lotDepth / 2, 0],
        },
    ]

    // ---------- Setback Labels ----------
    const { front: sbFront = 0, rear: sbRear = 0, left: sbLeft = 0, right: sbRight = 0 } = setbacks
    const setbackLabels = []

    if (sbFront > 0) {
        setbackLabels.push({
            id: `lot-${lotId}-setback-front`,
            text: 'Front Setback',
            defaultPosition: [lotWidth / 2, sbFront / 2, 0.15],
        })
    }
    if (sbRear > 0) {
        setbackLabels.push({
            id: `lot-${lotId}-setback-rear`,
            text: 'Rear Setback',
            defaultPosition: [lotWidth / 2, lotDepth - sbRear / 2, 0.15],
        })
    }
    if (sbLeft > 0) {
        setbackLabels.push({
            id: `lot-${lotId}-setback-left`,
            text: 'Left Setback',
            defaultPosition: [sbLeft / 2, lotDepth / 2, 0.15],
        })
    }
    if (sbRight > 0) {
        setbackLabels.push({
            id: `lot-${lotId}-setback-right`,
            text: 'Right Setback',
            defaultPosition: [lotWidth - sbRight / 2, lotDepth / 2, 0.15],
        })
    }

    // ---------- Building Labels ----------
    const buildingLabels = []
    const principal = buildings?.principal
    const accessory = buildings?.accessory

    if (principal && principal.width > 0 && principal.depth > 0) {
        const px = (principal.x ?? 0) + principal.width / 2
        const py = (principal.y ?? 0) + principal.depth / 2
        const pz = (principal.totalHeight ?? 0) + 2
        buildingLabels.push({
            id: `lot-${lotId}-bldg-principal`,
            text: 'Principal Building',
            defaultPosition: [px, py, pz],
        })
    }

    if (accessory && accessory.width > 0 && accessory.depth > 0) {
        const ax = (accessory.x ?? 0) + accessory.width / 2
        const ay = (accessory.y ?? 0) + accessory.depth / 2
        const az = (accessory.totalHeight ?? 0) + 2
        buildingLabels.push({
            id: `lot-${lotId}-bldg-accessory`,
            text: 'Accessory Building',
            defaultPosition: [ax, ay, az],
        })
    }

    return (
        <group>
            {/* Lot Name */}
            {layers.labelLotNames && (
                <DraggableLabel
                    {...sharedProps}
                    text={`Lot ${lotIndex}`}
                    fontSize={baseFontSize * 1.3}
                    defaultPosition={lotNameDefault}
                    anchorPoint={[lotWidth / 2, lotDepth / 2, 0]}
                    customPosition={annotationPositions[lotNameId] || null}
                    onPositionChange={(pos) => setAnnotationPosition(lotNameId, pos)}
                />
            )}

            {/* Lot Edge Labels */}
            {layers.labelLotEdges && edgeLabels.map((label) => (
                <DraggableLabel
                    key={label.id}
                    {...sharedProps}
                    text={label.text}
                    fontSize={baseFontSize}
                    defaultPosition={label.defaultPosition}
                    anchorPoint={label.anchorPoint}
                    customPosition={annotationPositions[label.id] || null}
                    onPositionChange={(pos) => setAnnotationPosition(label.id, pos)}
                />
            ))}

            {/* Setback Labels */}
            {layers.labelSetbacks && setbackLabels.map((label) => (
                <DraggableLabel
                    key={label.id}
                    {...sharedProps}
                    text={label.text}
                    fontSize={baseFontSize}
                    defaultPosition={label.defaultPosition}
                    anchorPoint={label.defaultPosition}
                    customPosition={annotationPositions[label.id] || null}
                    onPositionChange={(pos) => setAnnotationPosition(label.id, pos)}
                />
            ))}

            {/* Building Labels */}
            {layers.labelBuildings && buildingLabels.map((label) => (
                <DraggableLabel
                    key={label.id}
                    {...sharedProps}
                    text={label.text}
                    fontSize={baseFontSize}
                    defaultPosition={label.defaultPosition}
                    anchorPoint={label.defaultPosition}
                    customPosition={annotationPositions[label.id] || null}
                    onPositionChange={(pos) => setAnnotationPosition(label.id, pos)}
                />
            ))}
        </group>
    )
}

export default LotAnnotations
