import { useState, useRef, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { useShallow } from 'zustand/react/shallow'
import {
    Pencil, Minus, ArrowRight, Pentagon, Square, RectangleHorizontal,
    Circle, Star, Octagon, Type, MessageSquare, Eraser, MousePointer2,
    Play, X, Plus, ChevronDown
} from 'lucide-react'

const DRAWING_TOOLS = [
    { id: 'select', icon: MousePointer2, label: 'Select (V)', shortcut: 'V' },
    { id: 'freehand', icon: Pencil, label: 'Freehand (F)', shortcut: 'F' },
    { id: 'line', icon: Minus, label: 'Line (L)', shortcut: 'L' },
    { id: 'arrow', icon: ArrowRight, label: 'Arrow (A)', shortcut: 'A' },
    { id: 'polygon', icon: Pentagon, label: 'Polygon (P)', shortcut: 'P' },
    { id: 'rectangle', icon: Square, label: 'Rectangle (R)', shortcut: 'R' },
    { id: 'roundedRect', icon: RectangleHorizontal, label: 'Rounded Rect', shortcut: null },
    { id: 'circle', icon: Circle, label: 'Circle (C)', shortcut: 'C' },
    { id: 'ellipse', icon: Circle, label: 'Ellipse', shortcut: null },
    { id: 'octagon', icon: Octagon, label: 'Octagon', shortcut: null },
    { id: 'star', icon: Star, label: 'Star', shortcut: null },
    { id: 'text', icon: Type, label: 'Text (T)', shortcut: 'T' },
    { id: 'leader', icon: MessageSquare, label: 'Leader', shortcut: null },
    { id: 'eraser', icon: Eraser, label: 'Eraser (E)', shortcut: 'E' },
]

const LayerDropdown = ({ onClose }) => {
    const [newLayerName, setNewLayerName] = useState('')
    const [showNewInput, setShowNewInput] = useState(false)
    const inputRef = useRef(null)

    const { drawingLayers, drawingLayerOrder, activeDrawingLayerId } = useStore(useShallow(state => ({
        drawingLayers: state.drawingLayers,
        drawingLayerOrder: state.drawingLayerOrder,
        activeDrawingLayerId: state.activeDrawingLayerId,
    })))
    const createDrawingLayer = useStore(state => state.createDrawingLayer)
    const setActiveDrawingLayer = useStore(state => state.setActiveDrawingLayer)

    useEffect(() => {
        if (showNewInput && inputRef.current) inputRef.current.focus()
    }, [showNewInput])

    const handleCreate = () => {
        if (newLayerName.trim() || !showNewInput) {
            createDrawingLayer(newLayerName.trim() || undefined)
            setNewLayerName('')
            setShowNewInput(false)
            onClose()
        }
    }

    return (
        <div className="absolute left-14 top-0 w-48 rounded shadow-lg z-20 py-1"
            style={{ backgroundColor: 'var(--ui-bg-primary)', border: '1px solid var(--ui-border)' }}>
            <div className="px-3 py-1.5 text-xs font-semibold" style={{ color: 'var(--ui-text-secondary)' }}>
                Drawing Layers
            </div>
            {drawingLayerOrder.map(layerId => {
                const layer = drawingLayers[layerId]
                if (!layer) return null
                const isActive = layerId === activeDrawingLayerId
                return (
                    <button
                        key={layerId}
                        className="w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 hover-bg-secondary"
                        style={{
                            color: isActive ? 'var(--ui-accent)' : 'var(--ui-text-primary)',
                            fontWeight: isActive ? 600 : 400,
                        }}
                        onClick={() => { setActiveDrawingLayer(layerId); onClose() }}
                    >
                        <span className="w-2 h-2 rounded-full" style={{
                            backgroundColor: isActive ? 'var(--ui-accent)' : 'transparent',
                            border: isActive ? 'none' : '1px solid var(--ui-text-muted)',
                        }} />
                        {layer.name}
                    </button>
                )
            })}
            <div className="border-t my-1" style={{ borderColor: 'var(--ui-border)' }} />
            {showNewInput ? (
                <div className="px-3 py-1.5 flex gap-1">
                    <input
                        ref={inputRef}
                        type="text"
                        value={newLayerName}
                        onChange={e => setNewLayerName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setShowNewInput(false); onClose() } }}
                        placeholder="Layer name..."
                        className="flex-1 text-xs px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: 'var(--ui-bg-secondary)', color: 'var(--ui-text-primary)', border: '1px solid var(--ui-border)' }}
                    />
                    <button onClick={handleCreate} className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--ui-accent)', color: 'white' }}>
                        OK
                    </button>
                </div>
            ) : (
                <button
                    className="w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 hover-bg-secondary"
                    style={{ color: 'var(--ui-accent)' }}
                    onClick={() => setShowNewInput(true)}
                >
                    <Plus size={14} /> New Layer
                </button>
            )}
        </div>
    )
}

const DrawingToolbar = () => {
    const [showLayerDropdown, setShowLayerDropdown] = useState(false)

    const { drawingMode, activeDrawingLayerId, drawingDefaults } = useStore(useShallow(state => ({
        drawingMode: state.drawingMode,
        activeDrawingLayerId: state.activeDrawingLayerId,
        drawingDefaults: state.drawingDefaults,
    })))
    const setDrawingMode = useStore(state => state.setDrawingMode)
    const setDrawingDefault = useStore(state => state.setDrawingDefault)
    const setActiveDrawingLayer = useStore(state => state.setActiveDrawingLayer)

    const hasActiveLayer = activeDrawingLayerId != null
    const activeTool = drawingMode?.tool ?? null

    const handleToolClick = (toolId) => {
        if (!hasActiveLayer) return
        if (activeTool === toolId) {
            setDrawingMode(null)
        } else {
            setDrawingMode({ tool: toolId, phase: 'idle' })
        }
    }

    const handleStartClick = () => {
        if (hasActiveLayer && !showLayerDropdown) {
            // Toggle off: deactivate layer and drawing mode
            setActiveDrawingLayer(null)
            setDrawingMode(null)
        } else {
            setShowLayerDropdown(prev => !prev)
        }
    }

    return (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-1 p-1.5 rounded-lg"
            style={{
                backgroundColor: 'rgba(17, 24, 39, 0.85)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(75, 85, 99, 0.5)',
            }}
        >
            {/* Start / Layer selector */}
            <div className="relative">
                <button
                    onClick={handleStartClick}
                    className="w-9 h-9 rounded flex items-center justify-center transition-colors"
                    style={{
                        backgroundColor: hasActiveLayer ? 'var(--ui-accent)' : 'transparent',
                        color: hasActiveLayer ? 'white' : 'var(--ui-text-secondary)',
                    }}
                    title={hasActiveLayer ? 'Deactivate drawing' : 'Start drawing'}
                >
                    {hasActiveLayer ? <X size={16} /> : <Play size={16} />}
                </button>
                {showLayerDropdown && (
                    <LayerDropdown onClose={() => setShowLayerDropdown(false)} />
                )}
            </div>

            {/* Divider */}
            <div className="w-6 border-t" style={{ borderColor: 'rgba(75, 85, 99, 0.5)' }} />

            {/* Tool buttons */}
            {DRAWING_TOOLS.map(tool => {
                const Icon = tool.icon
                const isActive = activeTool === tool.id
                return (
                    <button
                        key={tool.id}
                        onClick={() => handleToolClick(tool.id)}
                        disabled={!hasActiveLayer}
                        className="w-9 h-9 rounded flex items-center justify-center transition-colors"
                        style={{
                            backgroundColor: isActive ? 'var(--ui-accent)' : 'transparent',
                            color: isActive ? 'white' : hasActiveLayer ? 'var(--ui-text-primary)' : 'var(--ui-text-muted)',
                            opacity: hasActiveLayer ? 1 : 0.4,
                            cursor: hasActiveLayer ? 'pointer' : 'not-allowed',
                        }}
                        title={tool.label}
                    >
                        <Icon size={16} />
                    </button>
                )
            })}

            {/* Divider */}
            <div className="w-6 border-t" style={{ borderColor: 'rgba(75, 85, 99, 0.5)' }} />

            {/* Quick color picker */}
            <div className="flex flex-col items-center gap-1">
                <label className="w-7 h-7 rounded cursor-pointer border" style={{ borderColor: 'var(--ui-border)' }}>
                    <input
                        type="color"
                        value={drawingDefaults.strokeColor}
                        onChange={e => setDrawingDefault('strokeColor', e.target.value)}
                        className="w-full h-full opacity-0 cursor-pointer"
                        title="Stroke color"
                    />
                    <div className="w-full h-full rounded -mt-7 pointer-events-none" style={{ backgroundColor: drawingDefaults.strokeColor }} />
                </label>
                <span className="text-[9px]" style={{ color: 'var(--ui-text-muted)' }}>
                    {drawingDefaults.strokeWidth}px
                </span>
            </div>

            {/* ArrowHead toggle (shown when arrow tool is active) */}
            {activeTool === 'arrow' && (
                <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[9px]" style={{ color: 'var(--ui-text-muted)' }}>Arrow</span>
                    <select
                        value={drawingDefaults.arrowHead}
                        onChange={e => setDrawingDefault('arrowHead', e.target.value)}
                        className="text-[10px] w-9 rounded px-0.5"
                        style={{
                            backgroundColor: 'var(--ui-bg-secondary)',
                            color: 'var(--ui-text-primary)',
                            border: '1px solid var(--ui-border)',
                        }}
                    >
                        <option value="end">End</option>
                        <option value="start">Start</option>
                        <option value="both">Both</option>
                        <option value="none">None</option>
                    </select>
                </div>
            )}
        </div>
    )
}

export default DrawingToolbar
