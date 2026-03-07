import { useState, useRef, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { useShallow } from 'zustand/react/shallow'
import { Eye, EyeOff, Lock, Unlock, Trash2, Plus, Pencil, Check, X, ChevronDown, ChevronRight } from 'lucide-react'

const DrawingLayersPanel = () => {
    const [isOpen, setIsOpen] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [editName, setEditName] = useState('')
    const editRef = useRef(null)

    const {
        drawingLayers, drawingLayerOrder, activeDrawingLayerId,
    } = useStore(useShallow(state => ({
        drawingLayers: state.drawingLayers,
        drawingLayerOrder: state.drawingLayerOrder,
        activeDrawingLayerId: state.activeDrawingLayerId,
    })))

    const createDrawingLayer = useStore(state => state.createDrawingLayer)
    const deleteDrawingLayer = useStore(state => state.deleteDrawingLayer)
    const renameDrawingLayer = useStore(state => state.renameDrawingLayer)
    const setDrawingLayerVisible = useStore(state => state.setDrawingLayerVisible)
    const setDrawingLayerLocked = useStore(state => state.setDrawingLayerLocked)
    const setDrawingLayerRenderMode = useStore(state => state.setDrawingLayerRenderMode)
    const setDrawingLayerZHeight = useStore(state => state.setDrawingLayerZHeight)
    const setActiveDrawingLayer = useStore(state => state.setActiveDrawingLayer)
    const setDrawingMode = useStore(state => state.setDrawingMode)

    useEffect(() => {
        if (editingId && editRef.current) editRef.current.focus()
    }, [editingId])

    const handleStartEdit = (layerId) => {
        setEditingId(layerId)
        setEditName(drawingLayers[layerId]?.name || '')
    }

    const handleSaveEdit = () => {
        if (editingId && editName.trim()) {
            renameDrawingLayer(editingId, editName.trim())
        }
        setEditingId(null)
    }

    const handleDelete = (layerId) => {
        deleteDrawingLayer(layerId)
        if (activeDrawingLayerId === layerId) {
            setDrawingMode(null)
        }
    }

    const handleLayerClick = (layerId) => {
        if (activeDrawingLayerId === layerId) {
            setActiveDrawingLayer(null)
            setDrawingMode(null)
        } else {
            setActiveDrawingLayer(layerId)
        }
    }

    const layerCount = drawingLayerOrder.length

    return (
        <div className="mb-1">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold hover-bg-secondary rounded"
                style={{ color: 'var(--ui-text-primary)' }}
            >
                <span className="flex items-center gap-2">
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    Drawing Layers
                    {layerCount > 0 && (
                        <span className="text-xs px-1.5 rounded-full" style={{ backgroundColor: 'var(--ui-bg-secondary)', color: 'var(--ui-text-secondary)' }}>
                            {layerCount}
                        </span>
                    )}
                </span>
                <button
                    onClick={(e) => { e.stopPropagation(); createDrawingLayer() }}
                    className="p-0.5 rounded hover-bg-secondary"
                    style={{ color: 'var(--ui-accent)' }}
                    title="New drawing layer"
                >
                    <Plus size={14} />
                </button>
            </button>

            {isOpen && (
                <div className="px-2 pb-2 flex flex-col gap-1">
                    {layerCount === 0 && (
                        <div className="text-xs py-2 text-center" style={{ color: 'var(--ui-text-muted)' }}>
                            No drawing layers yet. Click + to create one.
                        </div>
                    )}

                    {drawingLayerOrder.map(layerId => {
                        const layer = drawingLayers[layerId]
                        if (!layer) return null
                        const isActive = layerId === activeDrawingLayerId
                        const isEditing = editingId === layerId

                        return (
                            <div
                                key={layerId}
                                className="flex items-center gap-1 px-2 py-1.5 rounded text-sm"
                                style={{
                                    backgroundColor: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                    border: isActive ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
                                }}
                            >
                                {/* Active indicator */}
                                <button
                                    onClick={() => handleLayerClick(layerId)}
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 cursor-pointer"
                                    style={{
                                        backgroundColor: isActive ? 'var(--ui-accent)' : 'transparent',
                                        border: isActive ? 'none' : '1.5px solid var(--ui-text-muted)',
                                    }}
                                    title={isActive ? 'Deactivate layer' : 'Activate layer'}
                                />

                                {/* Layer name */}
                                {isEditing ? (
                                    <input
                                        ref={editRef}
                                        type="text"
                                        value={editName}
                                        onChange={e => setEditName(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingId(null) }}
                                        onBlur={handleSaveEdit}
                                        className="flex-1 text-xs px-1 py-0.5 rounded min-w-0"
                                        style={{ backgroundColor: 'var(--ui-bg-secondary)', color: 'var(--ui-text-primary)', border: '1px solid var(--ui-accent)' }}
                                    />
                                ) : (
                                    <span
                                        className="flex-1 text-xs truncate cursor-pointer"
                                        style={{ color: isActive ? 'var(--ui-accent)' : 'var(--ui-text-primary)' }}
                                        onClick={() => handleLayerClick(layerId)}
                                        onDoubleClick={() => handleStartEdit(layerId)}
                                        title="Click to activate, double-click to rename"
                                    >
                                        {layer.name}
                                    </span>
                                )}

                                {/* Render mode indicator */}
                                <button
                                    onClick={() => setDrawingLayerRenderMode(layerId, layer.renderMode === '3d' ? 'overlay' : '3d')}
                                    className="text-[9px] px-1 py-0.5 rounded flex-shrink-0"
                                    style={{
                                        backgroundColor: 'var(--ui-bg-secondary)',
                                        color: layer.renderMode === '3d' ? 'var(--ui-accent)' : 'var(--ui-warning)',
                                        border: '1px solid var(--ui-border)',
                                    }}
                                    title={`Render mode: ${layer.renderMode === '3d' ? '3D (in scene)' : '2D Overlay'}`}
                                >
                                    {layer.renderMode === '3d' ? '3D' : '2D'}
                                </button>

                                {/* Visibility toggle */}
                                <button
                                    onClick={() => setDrawingLayerVisible(layerId, !layer.visible)}
                                    className="p-0.5 rounded hover-bg-secondary flex-shrink-0"
                                    style={{ color: layer.visible ? 'var(--ui-text-primary)' : 'var(--ui-text-muted)' }}
                                    title={layer.visible ? 'Hide layer' : 'Show layer'}
                                >
                                    {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                                </button>

                                {/* Lock toggle */}
                                <button
                                    onClick={() => setDrawingLayerLocked(layerId, !layer.locked)}
                                    className="p-0.5 rounded hover-bg-secondary flex-shrink-0"
                                    style={{ color: layer.locked ? 'var(--ui-warning)' : 'var(--ui-text-muted)' }}
                                    title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                                >
                                    {layer.locked ? <Lock size={12} /> : <Unlock size={12} />}
                                </button>

                                {/* Rename button */}
                                <button
                                    onClick={() => handleStartEdit(layerId)}
                                    className="p-0.5 rounded hover-bg-secondary flex-shrink-0"
                                    style={{ color: 'var(--ui-text-muted)' }}
                                    title="Rename layer"
                                >
                                    <Pencil size={12} />
                                </button>

                                {/* Delete button */}
                                <button
                                    onClick={() => handleDelete(layerId)}
                                    className="p-0.5 rounded hover-bg-secondary flex-shrink-0"
                                    style={{ color: 'var(--ui-text-muted)' }}
                                    title="Delete layer"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        )
                    })}

                    {/* Z-height control for active layer */}
                    {activeDrawingLayerId && drawingLayers[activeDrawingLayerId]?.renderMode === '3d' && (
                        <div className="flex items-center gap-2 px-2 pt-1">
                            <span className="text-[10px]" style={{ color: 'var(--ui-text-muted)' }}>Z Height:</span>
                            <input
                                type="range"
                                min={0}
                                max={2}
                                step={0.01}
                                value={drawingLayers[activeDrawingLayerId]?.zHeight ?? 0.20}
                                onChange={e => setDrawingLayerZHeight(activeDrawingLayerId, parseFloat(e.target.value))}
                                className="flex-1 accent-theme"
                            />
                            <span className="text-[10px] w-8 text-right" style={{ color: 'var(--ui-text-secondary)' }}>
                                {(drawingLayers[activeDrawingLayerId]?.zHeight ?? 0.20).toFixed(2)}
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default DrawingLayersPanel
