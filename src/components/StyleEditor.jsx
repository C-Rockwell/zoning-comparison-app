import React, { useState } from 'react'
import { useStore } from '../store/useStore'
import { ChevronDown, ChevronUp, Palette, Eye, EyeOff } from 'lucide-react'

const Section = ({ title, children, isOpen, onToggle }) => (
    <div className="border-b border-gray-700 last:border-0">
        <button
            onClick={onToggle}
            className="w-full flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-750 text-xs font-bold uppercase tracking-wider text-gray-300 transition-colors"
        >
            {title}
            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {isOpen && <div className="p-3 bg-gray-900 space-y-3">{children}</div>}
    </div>
)

const ControlRow = ({ label, children }) => (
    <div className="flex items-center justify-between gap-2">
        <label className="text-xs text-gray-400 font-medium">{label}</label>
        <div className="flex items-center gap-2">{children}</div>
    </div>
)

const ColorPicker = ({ value, onChange }) => (
    <div className="relative group">
        <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-6 h-6 rounded border-0 p-0 overflow-hidden cursor-pointer"
        />
        <div className="absolute inset-0 ring-1 ring-white/20 rounded pointer-events-none group-hover:ring-white/40" />
    </div>
)

const StyleEditor = () => {
    const styleSettings = useStore((state) => state.viewSettings.styleSettings)
    const setStyle = useStore((state) => state.setStyle)
    const [openSections, setOpenSections] = useState({ lot: true })
    const [isPanelOpen, setIsPanelOpen] = useState(false)

    const toggleSection = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))

    if (!styleSettings) return null

    return (
        <>
            {/* Toggle Button */}
            <button
                onClick={() => setIsPanelOpen(!isPanelOpen)}
                className={`absolute top-20 right-4 z-20 p-2 rounded-lg shadow-lg border border-gray-700 transition-colors ${isPanelOpen ? 'bg-blue-600 text-white border-blue-500' : 'bg-gray-900/90 text-gray-400 hover:text-white'
                    }`}
                title="Visual Style Editor"
            >
                <Palette size={20} />
            </button>

            {/* Panel */}
            {isPanelOpen && (
                <div className="absolute top-20 right-16 z-20 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden max-h-[80vh] overflow-y-auto custom-scrollbar">
                    <div className="p-3 bg-gray-800 border-b border-gray-700 font-bold text-sm text-white flex justify-between items-center">
                        <span>Style Manager</span>
                    </div>

                    {/* Lot Lines */}
                    <Section
                        title="Lot Boundaries"
                        isOpen={openSections.lot}
                        onToggle={() => toggleSection('lot')}
                    >
                        <ControlRow label="Color">
                            <ColorPicker
                                value={styleSettings.lotLines.color}
                                onChange={(c) => setStyle('lotLines', 'color', c)}
                            />
                        </ControlRow>
                        <ControlRow label="Width">
                            <input
                                type="range" min="1" max="10" step="0.5"
                                value={styleSettings.lotLines.width}
                                onChange={(e) => setStyle('lotLines', 'width', parseFloat(e.target.value))}
                                className="w-24 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                            <span className="text-xs text-gray-400 w-4 font-mono">{styleSettings.lotLines.width}</span>
                        </ControlRow>
                        <ControlRow label="Style">
                            <button
                                onClick={() => setStyle('lotLines', 'dashed', !styleSettings.lotLines.dashed)}
                                className={`text-[10px] px-2 py-1 rounded border ${styleSettings.lotLines.dashed ? 'bg-blue-900 border-blue-500 text-blue-100' : 'bg-transparent border-gray-600 text-gray-400'}`}
                            >
                                {styleSettings.lotLines.dashed ? 'DASHED' : 'SOLID'}
                            </button>
                        </ControlRow>
                    </Section>

                    {/* Setbacks */}
                    <Section
                        title="Setbacks"
                        isOpen={openSections.setbacks}
                        onToggle={() => toggleSection('setbacks')}
                    >
                        <ControlRow label="Color">
                            <ColorPicker
                                value={styleSettings.setbacks.color}
                                onChange={(c) => setStyle('setbacks', 'color', c)}
                            />
                        </ControlRow>
                        <ControlRow label="Width">
                            <input
                                type="range" min="1" max="10" step="0.5"
                                value={styleSettings.setbacks.width}
                                onChange={(e) => setStyle('setbacks', 'width', parseFloat(e.target.value))}
                                className="w-24 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                        </ControlRow>
                        <ControlRow label="Style">
                            <button
                                onClick={() => setStyle('setbacks', 'dashed', !styleSettings.setbacks.dashed)}
                                className={`text-[10px] px-2 py-1 rounded border ${styleSettings.setbacks.dashed ? 'bg-blue-900 border-blue-500 text-blue-100' : 'bg-transparent border-gray-600 text-gray-400'}`}
                            >
                                DASHED
                            </button>
                        </ControlRow>
                    </Section>

                    {/* Building Edges */}
                    <Section
                        title="Building Edges"
                        isOpen={openSections.edges}
                        onToggle={() => toggleSection('edges')}
                    >
                        <ControlRow label="Edge Color">
                            <ColorPicker
                                value={styleSettings.buildingEdges.color}
                                onChange={(c) => setStyle('buildingEdges', 'color', c)}
                            />
                        </ControlRow>
                        <ControlRow label="Thickness">
                            <input
                                type="range" min="0.5" max="5" step="0.5"
                                value={styleSettings.buildingEdges.width}
                                onChange={(e) => setStyle('buildingEdges', 'width', parseFloat(e.target.value))}
                                className="w-24 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                        </ControlRow>
                    </Section>

                    {/* Building Faces */}
                    <Section
                        title="Building Mass"
                        isOpen={openSections.faces}
                        onToggle={() => toggleSection('faces')}
                    >
                        <ControlRow label="Fill Color">
                            <ColorPicker
                                value={styleSettings.buildingFaces.color}
                                onChange={(c) => setStyle('buildingFaces', 'color', c)}
                            />
                        </ControlRow>
                        <ControlRow label="Opacity">
                            <input
                                type="range" min="0" max="1" step="0.1"
                                value={styleSettings.buildingFaces.opacity}
                                onChange={(e) => setStyle('buildingFaces', 'opacity', parseFloat(e.target.value))}
                                className="w-24 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                        </ControlRow>
                    </Section>
                </div>
            )}
        </>
    )
}

export default StyleEditor
