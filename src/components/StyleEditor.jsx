import React, { useState } from 'react'
import { useStore } from '../store/useStore'
import { ChevronDown, ChevronUp, Palette } from 'lucide-react'

const Section = ({ title, children, isOpen, onToggle }) => (
    <div className="border-b border-gray-700 last:border-0">
        <button
            onClick={onToggle}
            className="w-full flex items-center justify-between p-2 bg-gray-800 hover:bg-gray-750 text-[10px] font-bold uppercase tracking-wider text-gray-300 transition-colors"
        >
            {title}
            {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        {isOpen && <div className="p-2 bg-gray-900 space-y-2">{children}</div>}
    </div>
)

const ControlRow = ({ label, children }) => (
    <div className="flex items-center justify-between gap-1">
        <label className="text-[10px] text-gray-400 font-medium">{label}</label>
        <div className="flex items-center gap-1">{children}</div>
    </div>
)

const ColorPicker = ({ value, onChange }) => (
    <div className="relative group">
        <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-5 h-5 rounded border-0 p-0 overflow-hidden cursor-pointer"
        />
        <div className="absolute inset-0 ring-1 ring-white/20 rounded pointer-events-none group-hover:ring-white/40" />
    </div>
)

const Slider = ({ value, onChange, min = 0, max = 1, step = 0.1, className = "w-14" }) => (
    <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={`h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500 ${className}`}
    />
)

const LineStyleSelector = ({ dashed, dashSize, gapSize, onChange, onDashChange, onGapChange }) => (
    <div className="space-y-1">
        <div className="flex gap-1">
            <button
                onClick={() => onChange(false)}
                className={`flex-1 text-[9px] px-1 py-0.5 rounded border transition-colors ${!dashed ? 'bg-blue-900 border-blue-500 text-blue-100' : 'bg-transparent border-gray-600 text-gray-400 hover:border-gray-500'
                    }`}
            >
                SOLID
            </button>
            <button
                onClick={() => onChange(true)}
                className={`flex-1 text-[9px] px-1 py-0.5 rounded border transition-colors ${dashed ? 'bg-blue-900 border-blue-500 text-blue-100' : 'bg-transparent border-gray-600 text-gray-400 hover:border-gray-500'
                    }`}
            >
                DASH
            </button>
        </div>
        {dashed && (
            <div className="grid grid-cols-2 gap-1">
                <div className="flex items-center gap-1">
                    <span className="text-[9px] text-gray-500">D</span>
                    <input
                        type="number"
                        min="0.5"
                        max="10"
                        step="0.5"
                        value={dashSize}
                        onChange={(e) => onDashChange(parseFloat(e.target.value))}
                        className="w-10 bg-gray-800 border border-gray-600 rounded px-1 py-0.5 text-[9px] text-white"
                    />
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-[9px] text-gray-500">G</span>
                    <input
                        type="number"
                        min="0.5"
                        max="10"
                        step="0.5"
                        value={gapSize}
                        onChange={(e) => onGapChange(parseFloat(e.target.value))}
                        className="w-10 bg-gray-800 border border-gray-600 rounded px-1 py-0.5 text-[9px] text-white"
                    />
                </div>
            </div>
        )}
    </div>
)

// Style controls for a single model (existing or proposed)
const ModelStyleControls = ({ model, styles, setStyle, setStyleOverride, openSections, toggleSection }) => {
    const prefix = model // 'existing' or 'proposed'

    const renderOverrideControls = (category, currentStyle) => {
        // Only for lotLines and setbacks
        if (category !== 'lotLines' && category !== 'setbacks') return null

        const sectionId = `${model}_${category}_granular`
        const isOpen = openSections[sectionId]

        return (
            <div className="border-t border-gray-800 mt-2 pt-2">
                <button
                    onClick={() => toggleSection(sectionId)}
                    className="w-full flex items-center justify-between text-[9px] text-gray-400 hover:text-white mb-2"
                >
                    <span className="flex items-center gap-1">
                        <span className={`w-3 h-3 rounded flex items-center justify-center border ${isOpen ? 'bg-blue-600 border-blue-600' : 'border-gray-600'}`}>
                            {isOpen && <span className="w-1.5 h-1.5 bg-white rounded-sm" />}
                        </span>
                        Customize Sides
                    </span>
                    {isOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                </button>

                {isOpen && ['front', 'rear', 'left', 'right'].map(side => {
                    const override = currentStyle.overrides?.[side] || {}
                    const isEnabled = override.enabled

                    return (
                        <div key={side} className="ml-2 mb-2 border-l border-gray-700 pl-2">
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-[9px] uppercase font-bold text-gray-500">{side}</label>
                                <button
                                    onClick={() => setStyleOverride(model, category, side, 'enabled', !isEnabled)}
                                    className={`text-[8px] px-1 rounded ${isEnabled ? 'bg-blue-900 text-blue-200' : 'bg-gray-800 text-gray-500'}`}
                                >
                                    {isEnabled ? 'CUSTOM' : 'DEFAULT'}
                                </button>
                            </div>

                            {isEnabled && (
                                <div className="space-y-1">
                                    <ControlRow label="Color">
                                        <ColorPicker
                                            value={override.color || currentStyle.color}
                                            onChange={(c) => setStyleOverride(model, category, side, 'color', c)}
                                        />
                                    </ControlRow>
                                    <ControlRow label="Width">
                                        <Slider
                                            value={override.width || currentStyle.width}
                                            onChange={(v) => setStyleOverride(model, category, side, 'width', v)}
                                            min={1}
                                            max={10}
                                            step={0.5}
                                            className="w-10"
                                        />
                                    </ControlRow>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => setStyleOverride(model, category, side, 'dashed', false)}
                                            className={`flex-1 text-[8px] border rounded ${!override.dashed ? 'bg-blue-900 border-blue-500 text-white' : 'border-gray-700 text-gray-500'}`}
                                        >
                                            Solid
                                        </button>
                                        <button
                                            onClick={() => setStyleOverride(model, category, side, 'dashed', true)}
                                            className={`flex-1 text-[8px] border rounded ${override.dashed ? 'bg-blue-900 border-blue-500 text-white' : 'border-gray-700 text-gray-500'}`}
                                        >
                                            Dash
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        )
    }

    return (
        <div className="flex-1 min-w-0">
            {/* Lot Boundaries */}
            <Section
                title="Lot Lines"
                isOpen={openSections[`${prefix}_lot`]}
                onToggle={() => toggleSection(`${prefix}_lot`)}
            >
                <ControlRow label="Color">
                    <ColorPicker
                        value={styles.lotLines.color}
                        onChange={(c) => setStyle(model, 'lotLines', 'color', c)}
                    />
                </ControlRow>
                <ControlRow label="Width">
                    <Slider
                        value={styles.lotLines.width}
                        onChange={(v) => setStyle(model, 'lotLines', 'width', v)}
                        min={1}
                        max={10}
                        step={0.5}
                    />
                    <span className="text-[9px] text-gray-400 w-4 font-mono">{styles.lotLines.width}</span>
                </ControlRow>
                <ControlRow label="Opacity">
                    <Slider
                        value={styles.lotLines.opacity}
                        onChange={(v) => setStyle(model, 'lotLines', 'opacity', v)}
                    />
                    <span className="text-[9px] text-gray-400 w-4 font-mono">{styles.lotLines.opacity.toFixed(1)}</span>
                </ControlRow>
                <div className="pt-1">
                    <LineStyleSelector
                        dashed={styles.lotLines.dashed}
                        dashSize={styles.lotLines.dashSize}
                        gapSize={styles.lotLines.gapSize}
                        onChange={(v) => setStyle(model, 'lotLines', 'dashed', v)}
                        onDashChange={(v) => setStyle(model, 'lotLines', 'dashSize', v)}
                        onGapChange={(v) => setStyle(model, 'lotLines', 'gapSize', v)}
                    />
                </div>
                {renderOverrideControls('lotLines', styles.lotLines)}
            </Section>

            {/* Lot Fill */}
            <Section
                title="Lot Fill"
                isOpen={openSections[`${prefix}_lotFill`]}
                onToggle={() => toggleSection(`${prefix}_lotFill`)}
            >
                <ControlRow label="Visible">
                    <button
                        onClick={() => setStyle(model, 'lotFill', 'visible', !styles.lotFill.visible)}
                        className={`px-2 py-0.5 rounded text-[9px] font-bold ${styles.lotFill.visible
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-400'
                            }`}
                    >
                        {styles.lotFill.visible ? 'ON' : 'OFF'}
                    </button>
                </ControlRow>
                <ControlRow label="Color">
                    <ColorPicker
                        value={styles.lotFill.color}
                        onChange={(c) => setStyle(model, 'lotFill', 'color', c)}
                    />
                </ControlRow>
                <ControlRow label="Opacity">
                    <Slider
                        value={styles.lotFill.opacity}
                        onChange={(v) => setStyle(model, 'lotFill', 'opacity', v)}
                        min={0}
                        max={1}
                        step={0.1}
                    />
                    <span className="text-[9px] text-gray-400 w-4 font-mono">{styles.lotFill.opacity.toFixed(1)}</span>
                </ControlRow>
            </Section>

            {/* Setbacks */}
            <Section
                title="Setbacks"
                isOpen={openSections[`${prefix}_setbacks`]}
                onToggle={() => toggleSection(`${prefix}_setbacks`)}
            >
                <ControlRow label="Color">
                    <ColorPicker
                        value={styles.setbacks.color}
                        onChange={(c) => setStyle(model, 'setbacks', 'color', c)}
                    />
                </ControlRow>
                <ControlRow label="Width">
                    <Slider
                        value={styles.setbacks.width}
                        onChange={(v) => setStyle(model, 'setbacks', 'width', v)}
                        min={1}
                        max={10}
                        step={0.5}
                    />
                    <span className="text-[9px] text-gray-400 w-4 font-mono">{styles.setbacks.width}</span>
                </ControlRow>
                <ControlRow label="Opacity">
                    <Slider
                        value={styles.setbacks.opacity}
                        onChange={(v) => setStyle(model, 'setbacks', 'opacity', v)}
                    />
                    <span className="text-[9px] text-gray-400 w-4 font-mono">{styles.setbacks.opacity.toFixed(1)}</span>
                </ControlRow>
                <div className="pt-1">
                    <LineStyleSelector
                        dashed={styles.setbacks.dashed}
                        dashSize={styles.setbacks.dashSize}
                        gapSize={styles.setbacks.gapSize}
                        onChange={(v) => setStyle(model, 'setbacks', 'dashed', v)}
                        onDashChange={(v) => setStyle(model, 'setbacks', 'dashSize', v)}
                        onGapChange={(v) => setStyle(model, 'setbacks', 'gapSize', v)}
                    />
                </div>
                {renderOverrideControls('setbacks', styles.setbacks)}
            </Section>

            {/* Building Edges */}
            <Section
                title="Building Edges"
                isOpen={openSections[`${prefix}_edges`]}
                onToggle={() => toggleSection(`${prefix}_edges`)}
            >
                <ControlRow label="Visible">
                    <button
                        onClick={() => setStyle(model, 'buildingEdges', 'visible', !styles.buildingEdges.visible)}
                        className={`px-2 py-0.5 rounded text-[9px] font-bold ${styles.buildingEdges.visible
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-400'
                            }`}
                    >
                        {styles.buildingEdges.visible ? 'ON' : 'OFF'}
                    </button>
                </ControlRow>
                <ControlRow label="Color">
                    <ColorPicker
                        value={styles.buildingEdges.color}
                        onChange={(c) => setStyle(model, 'buildingEdges', 'color', c)}
                    />
                </ControlRow>
                <ControlRow label="Width">
                    <Slider
                        value={styles.buildingEdges.width}
                        onChange={(v) => setStyle(model, 'buildingEdges', 'width', v)}
                        min={0.5}
                        max={5}
                        step={0.5}
                    />
                    <span className="text-[9px] text-gray-400 w-4 font-mono">{styles.buildingEdges.width}</span>
                </ControlRow>
                <ControlRow label="Opacity">
                    <Slider
                        value={styles.buildingEdges.opacity}
                        onChange={(v) => setStyle(model, 'buildingEdges', 'opacity', v)}
                    />
                    <span className="text-[9px] text-gray-400 w-4 font-mono">{styles.buildingEdges.opacity.toFixed(1)}</span>
                </ControlRow>
            </Section>

            {/* Building Mass */}
            <Section
                title="Building Mass"
                isOpen={openSections[`${prefix}_faces`]}
                onToggle={() => toggleSection(`${prefix}_faces`)}
            >
                <ControlRow label="Color">
                    <ColorPicker
                        value={styles.buildingFaces.color}
                        onChange={(c) => setStyle(model, 'buildingFaces', 'color', c)}
                    />
                </ControlRow>
                <ControlRow label="Opacity">
                    <Slider
                        value={styles.buildingFaces.opacity}
                        onChange={(v) => setStyle(model, 'buildingFaces', 'opacity', v)}
                    />
                    <span className="text-[9px] text-gray-400 w-4 font-mono">{styles.buildingFaces.opacity.toFixed(1)}</span>
                </ControlRow>
            </Section>
        </div>
    )
}

// Color presets - now applies to both models with different tints
const colorPresets = {
    default: {
        name: 'Default',
        existing: {
            lotLines: '#000000', setbacks: '#000000', buildingEdges: '#000000',
            buildingFaces: '#D5D5D5', lotFill: '#D4EAAA'
        },
        proposed: {
            lotLines: '#000000', setbacks: '#000000', buildingEdges: '#000000',
            buildingFaces: '#d7bcff', lotFill: '#bbd77f'
        },
        ground: '#1a1a2e'
    },
    blueprint: {
        name: 'Blueprint',
        existing: {
            lotLines: '#4169E1', setbacks: '#00CED1', buildingEdges: '#1E90FF',
            buildingFaces: '#B0C4DE', lotFill: '#4169E1'
        },
        proposed: {
            lotLines: '#00BFFF', setbacks: '#00FFFF', buildingEdges: '#87CEEB',
            buildingFaces: '#E6F3FF', lotFill: '#87CEEB'
        },
        ground: '#0a0a1a'
    },
    contrast: {
        name: 'Contrast',
        existing: {
            lotLines: '#FF0000', setbacks: '#FF6600', buildingEdges: '#CC0000',
            buildingFaces: '#FFCCCC', lotFill: '#FF6666'
        },
        proposed: {
            lotLines: '#00FF00', setbacks: '#00CC00', buildingEdges: '#006600',
            buildingFaces: '#CCFFCC', lotFill: '#66FF66'
        },
        ground: '#111111'
    },
    monochrome: {
        name: 'Mono',
        existing: {
            lotLines: '#666666', setbacks: '#888888', buildingEdges: '#444444',
            buildingFaces: '#AAAAAA', lotFill: '#666666'
        },
        proposed: {
            lotLines: '#FFFFFF', setbacks: '#CCCCCC', buildingEdges: '#EEEEEE',
            buildingFaces: '#FFFFFF', lotFill: '#DDDDDD'
        },
        ground: '#111111'
    }
}

const StyleEditor = () => {
    const styleSettings = useStore((state) => state.viewSettings.styleSettings)
    const lighting = useStore((state) => state.viewSettings.lighting)
    const layoutSettings = useStore((state) => state.layoutSettings)
    const setLighting = useStore((state) => state.setLighting)
    const setLayoutSetting = useStore((state) => state.setLayoutSetting)
    const setStyle = useStore((state) => state.setStyle)
    const setStyleOverride = useStore((state) => state.setStyleOverride)
    const setDimensionSetting = useStore((state) => state.setDimensionSetting)
    const [openSections, setOpenSections] = useState({})
    const [isPanelOpen, setIsPanelOpen] = useState(false)

    const toggleSection = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))

    const applyPreset = (presetKey) => {
        const preset = colorPresets[presetKey]
        // Apply existing styles
        setStyle('existing', 'lotLines', 'color', preset.existing.lotLines)
        setStyle('existing', 'setbacks', 'color', preset.existing.setbacks)
        setStyle('existing', 'buildingEdges', 'color', preset.existing.buildingEdges)
        setStyle('existing', 'buildingFaces', 'color', preset.existing.buildingFaces)
        setStyle('existing', 'lotFill', 'color', preset.existing.lotFill)
        // Apply proposed styles
        setStyle('proposed', 'lotLines', 'color', preset.proposed.lotLines)
        setStyle('proposed', 'setbacks', 'color', preset.proposed.setbacks)
        setStyle('proposed', 'buildingEdges', 'color', preset.proposed.buildingEdges)
        setStyle('proposed', 'buildingFaces', 'color', preset.proposed.buildingFaces)
        setStyle('proposed', 'lotFill', 'color', preset.proposed.lotFill)
        // Apply ground
        setStyle('ground', 'color', preset.ground)
    }

    if (!styleSettings || !styleSettings.existing || !styleSettings.proposed) return null

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
                <div className="absolute top-20 right-16 z-20 w-[480px] bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden max-h-[85vh] overflow-y-auto custom-scrollbar">
                    <div className="p-2 bg-gray-800 border-b border-gray-700 font-bold text-sm text-white flex justify-between items-center">
                        <span>Style Manager</span>
                    </div>

                    {/* Color Presets */}
                    <div className="p-2 border-b border-gray-700">
                        <label className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 block">Quick Presets</label>
                        <div className="flex flex-wrap gap-1">
                            {Object.entries(colorPresets).map(([key, preset]) => (
                                <button
                                    key={key}
                                    onClick={() => applyPreset(key)}
                                    className="px-2 py-1 text-[9px] bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded text-gray-300 transition-colors"
                                >
                                    {preset.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Two Column Headers */}
                    <div className="flex border-b border-gray-700">
                        <div className="flex-1 p-2 bg-gray-800 text-center border-r border-gray-700">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400">Existing</span>
                        </div>
                        <div className="flex-1 p-2 bg-gray-800 text-center">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-green-400">Proposed</span>
                        </div>
                    </div>

                    {/* Two Column Style Controls */}
                    <div className="flex">
                        <div className="flex-1 border-r border-gray-700">
                            <ModelStyleControls
                                model="existing"
                                styles={styleSettings.existing}
                                setStyle={setStyle}
                                setStyleOverride={setStyleOverride}
                                openSections={openSections}
                                toggleSection={toggleSection}
                            />
                        </div>
                        <div className="flex-1">
                            <ModelStyleControls
                                model="proposed"
                                styles={styleSettings.proposed}
                                setStyle={setStyle}
                                setStyleOverride={setStyleOverride}
                                openSections={openSections}
                                toggleSection={toggleSection}
                            />
                        </div>
                    </div>

                    {/* Layout Settings - New Section */}
                    <div className="border-t border-gray-700">
                        <Section
                            title="Layout"
                            isOpen={openSections.layout}
                            onToggle={() => toggleSection('layout')}
                        >
                            <ControlRow label="Spacing">
                                <Slider
                                    value={layoutSettings?.lotSpacing ?? 10}
                                    onChange={(v) => setLayoutSetting('lotSpacing', v)}
                                    min={0}
                                    max={100}
                                    step={1}
                                />
                                <span className="text-[9px] text-gray-400 w-8 font-mono text-right whitespace-nowrap">
                                    {(layoutSettings?.lotSpacing ?? 10)}'
                                </span>
                            </ControlRow>
                        </Section>
                    </div>

                    {/* Dimension Settings - New Section */}
                    <div className="border-t border-gray-700">
                        <Section
                            title="Dimensions"
                            isOpen={openSections.dimensions}
                            onToggle={() => toggleSection('dimensions')}
                        >
                            <ControlRow label="Line Color">
                                <ColorPicker
                                    value={styleSettings.dimensionSettings?.lineColor ?? '#000000'}
                                    onChange={(c) => setDimensionSetting('lineColor', c)}
                                />
                            </ControlRow>
                            <ControlRow label="Text Color">
                                <ColorPicker
                                    value={styleSettings.dimensionSettings?.textColor ?? '#000000'}
                                    onChange={(c) => setDimensionSetting('textColor', c)}
                                />
                            </ControlRow>
                            <ControlRow label="Width">
                                <Slider
                                    value={styleSettings.dimensionSettings?.lineWidth ?? 1}
                                    onChange={(v) => setDimensionSetting('lineWidth', v)}
                                    min={0.5}
                                    max={5}
                                    step={0.5}
                                />
                                <span className="text-[9px] text-gray-400 w-4 font-mono">{styleSettings.dimensionSettings?.lineWidth ?? 1}</span>
                            </ControlRow>
                            <ControlRow label="Font Size">
                                <Slider
                                    value={styleSettings.dimensionSettings?.fontSize ?? 2}
                                    onChange={(v) => setDimensionSetting('fontSize', v)}
                                    min={1}
                                    max={10}
                                    step={0.5}
                                />
                                <span className="text-[9px] text-gray-400 w-4 font-mono">{styleSettings.dimensionSettings?.fontSize ?? 2}</span>
                            </ControlRow>
                            <ControlRow label="Marker">
                                <div className="flex gap-1 text-[9px]">
                                    {['tick', 'arrow', 'dot'].map(marker => (
                                        <button
                                            key={marker}
                                            onClick={() => setDimensionSetting('endMarker', marker)}
                                            className={`px-2 py-1 rounded border border-gray-600 ${(styleSettings.dimensionSettings?.endMarker || 'tick') === marker
                                                ? 'bg-blue-600 text-white border-blue-500'
                                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                                } capitalize`}
                                        >
                                            {marker}
                                        </button>
                                    ))}
                                </div>
                            </ControlRow>
                        </Section>
                    </div>

                    {/* Dimension Text Customization - New Section */}
                    <div className="border-t border-gray-700">
                        <Section
                            title="Text Style"
                            isOpen={openSections.textSettings}
                            onToggle={() => toggleSection('textSettings')}
                        >
                            <ControlRow label="Outline Clr">
                                <ColorPicker
                                    value={styleSettings.dimensionSettings?.outlineColor ?? '#ffffff'}
                                    onChange={(c) => setDimensionSetting('outlineColor', c)}
                                />
                            </ControlRow>
                            <ControlRow label="Outline Wid">
                                <Slider
                                    value={styleSettings.dimensionSettings?.outlineWidth ?? 0.1}
                                    onChange={(v) => setDimensionSetting('outlineWidth', v)}
                                    min={0}
                                    max={0.5}
                                    step={0.05}
                                />
                                <span className="text-[9px] text-gray-400 w-4 font-mono">{(styleSettings.dimensionSettings?.outlineWidth ?? 0.1).toFixed(2)}</span>
                            </ControlRow>

                        </Section>
                    </div>

                    {/* Ground Plane - Shared */}
                    <div className="border-t border-gray-700">
                        <Section
                            title="Ground Plane (Shared)"
                            isOpen={openSections.ground}
                            onToggle={() => toggleSection('ground')}
                        >
                            <ControlRow label="Visible">
                                <button
                                    onClick={() => setStyle('ground', 'visible', !styleSettings.ground.visible)}
                                    className={`px-2 py-0.5 rounded text-[9px] font-bold ${styleSettings.ground.visible
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-700 text-gray-400'
                                        }`}
                                >
                                    {styleSettings.ground.visible ? 'ON' : 'OFF'}
                                </button>
                            </ControlRow>
                            <ControlRow label="Color">
                                <ColorPicker
                                    value={styleSettings.ground.color}
                                    onChange={(c) => setStyle('ground', 'color', c)}
                                />
                            </ControlRow>
                            <ControlRow label="Opacity">
                                <Slider
                                    value={styleSettings.ground.opacity}
                                    onChange={(v) => setStyle('ground', 'opacity', v)}
                                />
                                <span className="text-[9px] text-gray-400 w-4 font-mono">{styleSettings.ground.opacity.toFixed(1)}</span>
                            </ControlRow>
                        </Section>
                    </div>

                    {/* Environment - Shared */}
                    <div className="border-t border-gray-700">
                        <Section
                            title="Environment"
                            isOpen={openSections.environment}
                            onToggle={() => toggleSection('environment')}
                        >
                            <ControlRow label="Shadows">
                                <button
                                    onClick={() => setLighting('shadows', !lighting.shadows)}
                                    className={`px-2 py-0.5 rounded text-[9px] font-bold ${lighting.shadows
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-700 text-gray-400'
                                        }`}
                                >
                                    {lighting.shadows ? 'ON' : 'OFF'}
                                </button>
                            </ControlRow>
                            <ControlRow label="Direction">
                                <Slider
                                    value={(lighting.azimuth || 0) * (180 / Math.PI)}
                                    onChange={(degrees) => setLighting('azimuth', degrees * (Math.PI / 180))}
                                    min={0}
                                    max={360}
                                    step={15}
                                />
                                <span className="text-[9px] text-gray-400 w-8 font-mono text-right whitespace-nowrap">
                                    {Math.round((lighting.azimuth || 0) * (180 / Math.PI))}°
                                </span>
                            </ControlRow>
                            <ControlRow label="Intensity">
                                <Slider
                                    value={lighting.intensity || 1.5}
                                    onChange={(v) => setLighting('intensity', v)}
                                    min={0}
                                    max={3}
                                    step={0.1}
                                />
                                <span className="text-[9px] text-gray-400 w-8 font-mono text-right whitespace-nowrap">
                                    {(lighting.intensity || 1.5).toFixed(1)}
                                </span>
                            </ControlRow>
                        </Section>
                    </div>
                </div>
            )}
        </>
    )
}

export default StyleEditor
