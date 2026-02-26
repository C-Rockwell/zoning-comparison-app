import { useStore } from '../../store/useStore'
import { useShallow } from 'zustand/react/shallow'
import DrawingCapturePlane from './DrawingCapturePlane'
import DrawingObjectRenderer from './DrawingObjectRenderer'
import DrawingSelectionOverlay from './DrawingSelectionOverlay'

const DrawingEditor = () => {
    const { drawingLayers, drawingLayerOrder, drawingObjects, drawingMode, drawingEditorVisible, selectedDrawingIds } = useStore(useShallow(state => ({
        drawingLayers: state.drawingLayers,
        drawingLayerOrder: state.drawingLayerOrder,
        drawingObjects: state.drawingObjects,
        drawingMode: state.drawingMode,
        drawingEditorVisible: state.viewSettings.layers.drawingEditor ?? true,
        selectedDrawingIds: state.selectedDrawingIds,
    })))

    if (!drawingEditorVisible) return null

    // Group objects by layer for visibility gating
    const objectsByLayer = {}
    for (const [id, obj] of Object.entries(drawingObjects)) {
        if (!objectsByLayer[obj.layerId]) objectsByLayer[obj.layerId] = []
        objectsByLayer[obj.layerId].push(obj)
    }

    return (
        <group>
            {/* Render drawing objects grouped by layer */}
            {drawingLayerOrder.map(layerId => {
                const layer = drawingLayers[layerId]
                if (!layer || !layer.visible) return null
                const layerObjects = objectsByLayer[layerId] || []
                if (layerObjects.length === 0) return null

                return (
                    <group key={layerId} position={[0, 0, layer.zHeight ?? 0.20]}>
                        {layerObjects.map(obj => (
                            <DrawingObjectRenderer
                                key={obj.id}
                                obj={obj}
                                isSelected={selectedDrawingIds.includes(obj.id)}
                            />
                        ))}
                    </group>
                )
            })}

            {/* Selection handles overlay */}
            {selectedDrawingIds.length > 0 && <DrawingSelectionOverlay />}

            {/* Capture plane for active drawing tool */}
            {drawingMode && <DrawingCapturePlane />}
        </group>
    )
}

export default DrawingEditor
