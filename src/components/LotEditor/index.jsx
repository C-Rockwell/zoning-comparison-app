import { useCallback } from 'react'
import PolygonLot from './PolygonLot'
import VertexHandle from './VertexHandle'
import MidpointHandle from './MidpointHandle'
import EdgeHandle from './EdgeHandle'

// Main LotEditor component - orchestrates polygon editing
const LotEditor = ({
    model,           // 'existing' | 'proposed'
    vertices,        // Array of {id, x, y}
    editing = false, // Whether to show editing handles
    style,           // Lot line style
    fillStyle,       // Lot fill style
    showDimensions = false,
    dimensionSettings = {},
    offsetGroupX = 0,
    // Store actions
    updateVertex,
    splitEdge,
    extrudeEdge,
}) => {
    // Handle vertex drag
    const handleVertexDrag = useCallback((vertexIndex, newX, newY) => {
        if (updateVertex) {
            updateVertex(model, vertexIndex, newX, newY)
        }
    }, [model, updateVertex])

    // Handle vertex drag end (for undo checkpoints if needed)
    const handleVertexDragEnd = useCallback((vertexIndex) => {
        // Could trigger undo checkpoint here if needed
    }, [])

    // Handle edge split (add vertex at midpoint)
    const handleSplit = useCallback((edgeIndex) => {
        if (splitEdge) {
            splitEdge(model, edgeIndex)
        }
    }, [model, splitEdge])

    // Handle edge extrusion (push/pull)
    const handleExtrude = useCallback((edgeIndex, distance) => {
        if (extrudeEdge) {
            extrudeEdge(model, edgeIndex, distance)
        }
    }, [model, extrudeEdge])

    if (!vertices || vertices.length < 3) return null

    return (
        <group>
            {/* Render the polygon lot */}
            <PolygonLot
                vertices={vertices}
                style={style}
                fillStyle={fillStyle}
                showDimensions={showDimensions}
                dimensionSettings={dimensionSettings}
            />

            {/* Only show handles when editing */}
            {editing && (
                <>
                    {/* Vertex handles at each corner */}
                    {vertices.map((vertex, index) => (
                        <VertexHandle
                            key={vertex.id || index}
                            position={vertex}
                            vertexIndex={index}
                            onDrag={handleVertexDrag}
                            onDragEnd={handleVertexDragEnd}
                            offsetGroupX={offsetGroupX}
                        />
                    ))}

                    {/* Midpoint handles on each edge */}
                    {vertices.map((vertex, index) => {
                        const nextVertex = vertices[(index + 1) % vertices.length]
                        return (
                            <MidpointHandle
                                key={`mid-${vertex.id || index}`}
                                v1={vertex}
                                v2={nextVertex}
                                edgeIndex={index}
                                onSplit={handleSplit}
                            />
                        )
                    })}

                    {/* Edge extrusion handles */}
                    {vertices.map((vertex, index) => {
                        const nextVertex = vertices[(index + 1) % vertices.length]
                        return (
                            <EdgeHandle
                                key={`edge-${vertex.id || index}`}
                                v1={vertex}
                                v2={nextVertex}
                                edgeIndex={index}
                                onExtrude={handleExtrude}
                                offsetGroupX={offsetGroupX}
                            />
                        )
                    })}
                </>
            )}
        </group>
    )
}

export default LotEditor
