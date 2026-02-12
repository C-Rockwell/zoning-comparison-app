import React, { useState } from 'react'
import { useStore as useZustandStore } from 'zustand'
import { useStore } from '../store/useStore'
import { ChevronDown, ChevronUp, Palette, Undo, Save } from 'lucide-react'



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



const SliderInput = ({ value, onChange, min = 0, max = 1, step = 0.1, className = "w-10" }) => {
    const updateValue = (newValue) => {
        const clamped = Math.min(Math.max(newValue, min), max)
        onChange(Number(clamped.toFixed(2)))
    }

    return (
        <div className="flex items-center gap-1">
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className={`h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500 ${className}`}
            />
            <div className="flex items-center bg-gray-800 border border-gray-600 rounded overflow-hidden">
                <input
                    type="number"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className="w-8 pl-1 py-0.5 text-[9px] text-white bg-transparent text-center focus:outline-none no-spinner"
                />
                <div className="flex flex-col border-l border-gray-600">
                    <button
                        onClick={() => updateValue(value + step)}
                        className="px-0.5 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center h-2.5 border-b border-gray-600"
                    >
                        <ChevronUp size={8} />
                    </button>
                    <button
                        onClick={() => updateValue(value - step)}
                        className="px-0.5 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center h-2.5"
                    >
                        <ChevronDown size={8} />
                    </button>
                </div>
            </div>
        </div>
    )
}

// Custom label row for dimension labels
const CustomLabelRow = ({ label, dimensionKey, customLabels, setCustomLabel }) => {
    const config = customLabels?.[dimensionKey] || { mode: 'value', text: '' }
    const isCustom = config.mode === 'custom'

    return (
        <div className="flex items-center gap-1 mb-1">
            <span className="text-[9px] text-gray-400 w-16 truncate">{label}</span>
            <div className="flex items-center gap-1 flex-1">
                <button
                    onClick={() => setCustomLabel(dimensionKey, isCustom ? 'value' : 'custom', config.text)}
                    className={`px-1.5 py-0.5 rounded text-[8px] font-medium border transition-colors ${
                        isCustom
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'
                    }`}
                    title={isCustom ? 'Using custom label' : 'Using numeric value'}
                >
                    {isCustom ? 'Custom' : 'Value'}
                </button>
                {isCustom && (
                    <input
                        type="text"
                        value={config.text}
                        onChange={(e) => setCustomLabel(dimensionKey, 'custom', e.target.value)}
                        placeholder="A, B, etc."
                        className="flex-1 px-1 py-0.5 text-[9px] bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                )}
            </div>
        </div>
    )
}

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
                                        <SliderInput
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
                    <SliderInput
                        value={styles.lotLines.width}
                        onChange={(v) => setStyle(model, 'lotLines', 'width', v)}
                        min={1}
                        max={10}
                        step={0.5}
                    />
                </ControlRow>
                <ControlRow label="Opacity">
                    <SliderInput
                        value={styles.lotLines.opacity}
                        onChange={(v) => setStyle(model, 'lotLines', 'opacity', v)}
                    />
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
                    <SliderInput
                        value={styles.lotFill.opacity}
                        onChange={(v) => setStyle(model, 'lotFill', 'opacity', v)}
                        min={0}
                        max={1}
                        step={0.1}
                    />
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
                    <SliderInput
                        value={styles.setbacks.width}
                        onChange={(v) => setStyle(model, 'setbacks', 'width', v)}
                        min={1}
                        max={10}
                        step={0.5}
                    />
                </ControlRow>
                <ControlRow label="Opacity">
                    <SliderInput
                        value={styles.setbacks.opacity}
                        onChange={(v) => setStyle(model, 'setbacks', 'opacity', v)}
                    />
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
                    <SliderInput
                        value={styles.buildingEdges.width}
                        onChange={(v) => setStyle(model, 'buildingEdges', 'width', v)}
                        min={0.5}
                        max={5}
                        step={0.5}
                    />
                </ControlRow>
                <ControlRow label="Opacity">
                    <SliderInput
                        value={styles.buildingEdges.opacity}
                        onChange={(v) => setStyle(model, 'buildingEdges', 'opacity', v)}
                    />
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
                    <SliderInput
                        value={styles.buildingFaces.opacity}
                        onChange={(v) => setStyle(model, 'buildingFaces', 'opacity', v)}
                    />
                </ControlRow>
            </Section>

            {/* Max Height Plane */}
            <Section
                title="Max Height Plane"
                isOpen={openSections[`${prefix}_maxHeight`]}
                onToggle={() => toggleSection(`${prefix}_maxHeight`)}
            >
                <ControlRow label="Fill Color">
                    <ColorPicker
                        value={styles.maxHeightPlane?.color ?? '#FF6B6B'}
                        onChange={(c) => setStyle(model, 'maxHeightPlane', 'color', c)}
                    />
                </ControlRow>
                <ControlRow label="Fill Opacity">
                    <SliderInput
                        value={styles.maxHeightPlane?.opacity ?? 0.3}
                        onChange={(v) => setStyle(model, 'maxHeightPlane', 'opacity', v)}
                    />
                </ControlRow>
                <ControlRow label="Line Color">
                    <ColorPicker
                        value={styles.maxHeightPlane?.lineColor ?? '#FF0000'}
                        onChange={(c) => setStyle(model, 'maxHeightPlane', 'lineColor', c)}
                    />
                </ControlRow>
                <ControlRow label="Line Width">
                    <SliderInput
                        value={styles.maxHeightPlane?.lineWidth ?? 2}
                        onChange={(v) => setStyle(model, 'maxHeightPlane', 'lineWidth', v)}
                        min={0.5}
                        max={5}
                        step={0.5}
                    />
                </ControlRow>
                <ControlRow label="Line Dashed">
                    <button
                        onClick={() => setStyle(model, 'maxHeightPlane', 'lineDashed', !styles.maxHeightPlane?.lineDashed)}
                        className={`px-2 py-0.5 rounded text-[9px] font-bold ${styles.maxHeightPlane?.lineDashed
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-400'
                            }`}
                    >
                        {styles.maxHeightPlane?.lineDashed ? 'ON' : 'OFF'}
                    </button>
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
    const { undo } = useStore.temporal.getState()
    const pastStates = useZustandStore(useStore.temporal, (state) => state.pastStates)
    const styleSettings = useStore((state) => state.viewSettings.styleSettings)
    const lighting = useStore((state) => state.viewSettings.lighting)
    const layoutSettings = useStore((state) => state.layoutSettings)
    const setLighting = useStore((state) => state.setLighting)
    const setLayoutSetting = useStore((state) => state.setLayoutSetting)
    const setStyle = useStore((state) => state.setStyle)
    const setStyleOverride = useStore((state) => state.setStyleOverride)
    const setDimensionSetting = useStore((state) => state.setDimensionSetting)
    const setCustomLabel = useStore((state) => state.setCustomLabel)
    const userDefaults = useStore((state) => state.userDefaults)
    const saveAsDefault = useStore((state) => state.saveAsDefault)
    const loadUserDefaults = useStore((state) => state.loadUserDefaults)
    const roadModuleStyles = useStore((state) => state.roadModuleStyles)
    const setRoadModuleStyle = useStore((state) => state.setRoadModuleStyle)
    const uiTheme = useStore((state) => state.uiTheme)
    const setUiTheme = useStore((state) => state.setUiTheme)
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
            {/* Undo Button */}
            <button
                onClick={() => undo()}
                disabled={pastStates.length === 0}
                className={`absolute top-20 right-14 z-20 flex items-center gap-1 px-3 py-2 rounded-lg shadow-lg border border-red-700 transition-colors 
                    ${pastStates.length > 0
                        ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer'
                        : 'bg-red-900/50 text-red-400/50 cursor-not-allowed border-red-900/50'
                    }`}
                title="Undo last change"
            >
                <Undo size={16} strokeWidth={2.5} />
                <span className="text-[10px] font-black tracking-wider">SH$T!</span>
            </button>
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
                        <div className="flex flex-wrap gap-1 mb-2">
                            {Object.entries(colorPresets).map(([key, preset]) => (
                                <button
                                    key={key}
                                    onClick={() => applyPreset(key)}
                                    className="px-2 py-1 text-[9px] bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded text-gray-300 transition-colors"
                                >
                                    {preset.name}
                                </button>
                            ))}
                            <div className="w-px h-6 bg-gray-700 mx-1" />
                            {/* User Defaults Controls */}
                            <button
                                onClick={saveAsDefault}
                                className="px-2 py-1 text-[9px] bg-gray-800 hover:bg-blue-900 border border-gray-600 hover:border-blue-500 rounded text-gray-300 hover:text-white transition-colors flex items-center gap-1"
                                title="Save current styles as your default"
                            >
                                <Save size={10} />
                                Save as Default
                            </button>
                            {userDefaults && (
                                <button
                                    onClick={loadUserDefaults}
                                    className="px-2 py-1 text-[9px] bg-blue-900/50 hover:bg-blue-800 border border-blue-700/50 hover:border-blue-500 rounded text-blue-200 transition-colors font-semibold"
                                >
                                    My Defaults
                                </button>
                            )}
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
                                <SliderInput
                                    value={layoutSettings?.lotSpacing ?? 10}
                                    onChange={(v) => setLayoutSetting('lotSpacing', v)}
                                    min={0}
                                    max={100}
                                    step={1}
                                />
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
                                <SliderInput
                                    value={styleSettings.dimensionSettings?.lineWidth ?? 1}
                                    onChange={(v) => setDimensionSetting('lineWidth', v)}
                                    min={0.5}
                                    max={5}
                                    step={0.5}
                                />
                            </ControlRow>
                            <ControlRow label="Font Size">
                                <SliderInput
                                    value={styleSettings.dimensionSettings?.fontSize ?? 2}
                                    onChange={(v) => setDimensionSetting('fontSize', v)}
                                    min={1}
                                    max={10}
                                    step={0.5}
                                />
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
                            <ControlRow label="Ext. Width">
                                <SliderInput
                                    value={styleSettings.dimensionSettings?.extensionWidth ?? 0.5}
                                    onChange={(v) => setDimensionSetting('extensionWidth', v)}
                                    min={0.1}
                                    max={2}
                                    step={0.1}
                                />
                            </ControlRow>
                            <div className="border-t border-gray-800 my-1 pt-1">
                                <ControlRow label="Outline Clr">
                                    <ColorPicker
                                        value={styleSettings.dimensionSettings?.outlineColor ?? '#ffffff'}
                                        onChange={(c) => setDimensionSetting('outlineColor', c)}
                                    />
                                </ControlRow>
                                <ControlRow label="Outline Wid">
                                    <SliderInput
                                        value={styleSettings.dimensionSettings?.outlineWidth ?? 0.1}
                                        onChange={(v) => setDimensionSetting('outlineWidth', v)}
                                        min={0}
                                        max={0.5}
                                        step={0.05}
                                    />
                                </ControlRow>
                            </div>
                        </Section>
                    </div>

                    {/* Custom Dimension Labels */}
                    <div className="border-t border-gray-700">
                        <Section
                            title="Custom Dimension Labels"
                            isOpen={openSections.customLabels}
                            onToggle={() => toggleSection('customLabels')}
                        >
                            <p className="text-[9px] text-gray-500 mb-2">Set custom text labels for dimensions instead of numeric values. Applies to both models.</p>

                            <CustomLabelRow
                                label="Lot Width"
                                dimensionKey="lotWidth"
                                customLabels={styleSettings.dimensionSettings?.customLabels}
                                setCustomLabel={setCustomLabel}
                            />
                            <CustomLabelRow
                                label="Lot Depth"
                                dimensionKey="lotDepth"
                                customLabels={styleSettings.dimensionSettings?.customLabels}
                                setCustomLabel={setCustomLabel}
                            />
                            <CustomLabelRow
                                label="Setback Front"
                                dimensionKey="setbackFront"
                                customLabels={styleSettings.dimensionSettings?.customLabels}
                                setCustomLabel={setCustomLabel}
                            />
                            <CustomLabelRow
                                label="Setback Rear"
                                dimensionKey="setbackRear"
                                customLabels={styleSettings.dimensionSettings?.customLabels}
                                setCustomLabel={setCustomLabel}
                            />
                            <CustomLabelRow
                                label="Setback Left"
                                dimensionKey="setbackLeft"
                                customLabels={styleSettings.dimensionSettings?.customLabels}
                                setCustomLabel={setCustomLabel}
                            />
                            <CustomLabelRow
                                label="Setback Right"
                                dimensionKey="setbackRight"
                                customLabels={styleSettings.dimensionSettings?.customLabels}
                                setCustomLabel={setCustomLabel}
                            />
                            <CustomLabelRow
                                label="Bldg Height"
                                dimensionKey="buildingHeight"
                                customLabels={styleSettings.dimensionSettings?.customLabels}
                                setCustomLabel={setCustomLabel}
                            />
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
                                <SliderInput
                                    value={styleSettings.ground.opacity}
                                    onChange={(v) => setStyle('ground', 'opacity', v)}
                                />
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
                                <SliderInput
                                    value={(lighting.azimuth || 0) * (180 / Math.PI)}
                                    onChange={(degrees) => setLighting('azimuth', degrees * (Math.PI / 180))}
                                    min={0}
                                    max={360}
                                    step={15}
                                />
                            </ControlRow>
                            <ControlRow label="Intensity">
                                <SliderInput
                                    value={lighting.intensity || 1.5}
                                    onChange={(v) => setLighting('intensity', v)}
                                    min={0}
                                    max={3}
                                    step={0.1}
                                />
                            </ControlRow>
                        </Section>
                    </div>

                    {/* Grid - Shared */}
                    <div className="border-t border-gray-700">
                        <Section
                            title="Grid"
                            isOpen={openSections.grid}
                            onToggle={() => toggleSection('grid')}
                        >
                            <ControlRow label="Primary Color">
                                <ColorPicker
                                    value={styleSettings.grid?.sectionColor ?? '#9ca3af'}
                                    onChange={(c) => setStyle('grid', 'sectionColor', c)}
                                />
                            </ControlRow>
                            <ControlRow label="Primary Width">
                                <SliderInput
                                    value={styleSettings.grid?.sectionThickness ?? 1.5}
                                    onChange={(v) => setStyle('grid', 'sectionThickness', v)}
                                    min={0.5}
                                    max={5}
                                    step={0.5}
                                />
                            </ControlRow>
                            <ControlRow label="Secondary Color">
                                <ColorPicker
                                    value={styleSettings.grid?.cellColor ?? '#d1d5db'}
                                    onChange={(c) => setStyle('grid', 'cellColor', c)}
                                />
                            </ControlRow>
                            <ControlRow label="Secondary Width">
                                <SliderInput
                                    value={styleSettings.grid?.cellThickness ?? 1}
                                    onChange={(v) => setStyle('grid', 'cellThickness', v)}
                                    min={0.5}
                                    max={3}
                                    step={0.5}
                                />
                            </ControlRow>
                            <ControlRow label="Fade Distance">
                                <SliderInput
                                    value={styleSettings.grid?.fadeDistance ?? 400}
                                    onChange={(v) => setStyle('grid', 'fadeDistance', v)}
                                    min={100}
                                    max={1000}
                                    step={50}
                                />
                            </ControlRow>
                        </Section>
                    </div>

                    {/* Road Module Styles */}
                    {roadModuleStyles && (
                        <div className="border-t border-gray-700">
                            <Section
                                title="Road Module"
                                isOpen={openSections.roadModule}
                                onToggle={() => toggleSection('roadModule')}
                            >
                                {/* Right-of-Way Lines */}
                                <div className="mb-3">
                                    <span className="text-[9px] text-gray-500 uppercase tracking-wider block mb-1">Right-of-Way Lines</span>
                                    <ControlRow label="Color">
                                        <ColorPicker
                                            value={roadModuleStyles.rightOfWay?.color ?? '#000000'}
                                            onChange={(c) => setRoadModuleStyle('rightOfWay', 'color', c)}
                                        />
                                    </ControlRow>
                                    <ControlRow label="Width">
                                        <SliderInput
                                            value={roadModuleStyles.rightOfWay?.width ?? 1}
                                            onChange={(v) => setRoadModuleStyle('rightOfWay', 'width', v)}
                                            min={0.5}
                                            max={5}
                                            step={0.5}
                                        />
                                    </ControlRow>
                                    <ControlRow label="Opacity">
                                        <SliderInput
                                            value={roadModuleStyles.rightOfWay?.opacity ?? 1}
                                            onChange={(v) => setRoadModuleStyle('rightOfWay', 'opacity', v)}
                                        />
                                    </ControlRow>
                                    <div className="pt-1">
                                        <LineStyleSelector
                                            dashed={roadModuleStyles.rightOfWay?.dashed ?? true}
                                            dashSize={roadModuleStyles.rightOfWay?.dashSize ?? 2}
                                            gapSize={roadModuleStyles.rightOfWay?.gapSize ?? 1}
                                            onChange={(v) => setRoadModuleStyle('rightOfWay', 'dashed', v)}
                                            onDashChange={(v) => setRoadModuleStyle('rightOfWay', 'dashSize', v)}
                                            onGapChange={(v) => setRoadModuleStyle('rightOfWay', 'gapSize', v)}
                                        />
                                    </div>
                                </div>

                                {/* Road Width */}
                                <div className="border-t border-gray-800 pt-2 mb-3">
                                    <span className="text-[9px] text-gray-500 uppercase tracking-wider block mb-1">Road Surface</span>
                                    <ControlRow label="Line Color">
                                        <ColorPicker
                                            value={roadModuleStyles.roadWidth?.lineColor ?? '#000000'}
                                            onChange={(c) => setRoadModuleStyle('roadWidth', 'lineColor', c)}
                                        />
                                    </ControlRow>
                                    <ControlRow label="Line Width">
                                        <SliderInput
                                            value={roadModuleStyles.roadWidth?.lineWidth ?? 1}
                                            onChange={(v) => setRoadModuleStyle('roadWidth', 'lineWidth', v)}
                                            min={0.5}
                                            max={5}
                                            step={0.5}
                                        />
                                    </ControlRow>
                                    <ControlRow label="Fill Color">
                                        <ColorPicker
                                            value={roadModuleStyles.roadWidth?.fillColor ?? '#666666'}
                                            onChange={(c) => setRoadModuleStyle('roadWidth', 'fillColor', c)}
                                        />
                                    </ControlRow>
                                    <ControlRow label="Fill Opacity">
                                        <SliderInput
                                            value={roadModuleStyles.roadWidth?.fillOpacity ?? 0.8}
                                            onChange={(v) => setRoadModuleStyle('roadWidth', 'fillOpacity', v)}
                                        />
                                    </ControlRow>
                                </div>

                                {/* Left Side Elements */}
                                <div className="border-t border-gray-800 pt-2 mb-3">
                                    <span className="text-[9px] text-blue-400 uppercase tracking-wider block mb-2 font-bold">Left Side (toward outer ROW)</span>

                                    {[
                                        { key: 'leftParking', label: 'Parking', defaultFill: '#888888' },
                                        { key: 'leftVerge', label: 'Verge', defaultFill: '#c4a77d' },
                                        { key: 'leftSidewalk', label: 'Sidewalk', defaultFill: '#90EE90' },
                                        { key: 'leftTransitionZone', label: 'Transition Zone', defaultFill: '#98D8AA' },
                                    ].map(({ key, label, defaultFill }) => (
                                        <div key={key} className="mb-3 pl-2 border-l-2 border-gray-700">
                                            <span className="text-[9px] text-gray-500 uppercase tracking-wider block mb-1">{label}</span>
                                            <ControlRow label="Line Color">
                                                <ColorPicker
                                                    value={roadModuleStyles[key]?.lineColor ?? '#000000'}
                                                    onChange={(c) => setRoadModuleStyle(key, 'lineColor', c)}
                                                />
                                            </ControlRow>
                                            <ControlRow label="Line Width">
                                                <SliderInput
                                                    value={roadModuleStyles[key]?.lineWidth ?? 1}
                                                    onChange={(v) => setRoadModuleStyle(key, 'lineWidth', v)}
                                                    min={0.5}
                                                    max={5}
                                                    step={0.5}
                                                />
                                            </ControlRow>
                                            <ControlRow label="Fill Color">
                                                <ColorPicker
                                                    value={roadModuleStyles[key]?.fillColor ?? defaultFill}
                                                    onChange={(c) => setRoadModuleStyle(key, 'fillColor', c)}
                                                />
                                            </ControlRow>
                                            <ControlRow label="Fill Opacity">
                                                <SliderInput
                                                    value={roadModuleStyles[key]?.fillOpacity ?? 0.7}
                                                    onChange={(v) => setRoadModuleStyle(key, 'fillOpacity', v)}
                                                />
                                            </ControlRow>
                                        </div>
                                    ))}
                                </div>

                                {/* Right Side Elements */}
                                <div className="border-t border-gray-800 pt-2">
                                    <span className="text-[9px] text-green-400 uppercase tracking-wider block mb-2 font-bold">Right Side (toward lot)</span>

                                    {[
                                        { key: 'rightParking', label: 'Parking', defaultFill: '#888888' },
                                        { key: 'rightVerge', label: 'Verge', defaultFill: '#c4a77d' },
                                        { key: 'rightSidewalk', label: 'Sidewalk', defaultFill: '#90EE90' },
                                        { key: 'rightTransitionZone', label: 'Transition Zone', defaultFill: '#98D8AA' },
                                    ].map(({ key, label, defaultFill }) => (
                                        <div key={key} className="mb-3 pl-2 border-l-2 border-gray-700">
                                            <span className="text-[9px] text-gray-500 uppercase tracking-wider block mb-1">{label}</span>
                                            <ControlRow label="Line Color">
                                                <ColorPicker
                                                    value={roadModuleStyles[key]?.lineColor ?? '#000000'}
                                                    onChange={(c) => setRoadModuleStyle(key, 'lineColor', c)}
                                                />
                                            </ControlRow>
                                            <ControlRow label="Line Width">
                                                <SliderInput
                                                    value={roadModuleStyles[key]?.lineWidth ?? 1}
                                                    onChange={(v) => setRoadModuleStyle(key, 'lineWidth', v)}
                                                    min={0.5}
                                                    max={5}
                                                    step={0.5}
                                                />
                                            </ControlRow>
                                            <ControlRow label="Fill Color">
                                                <ColorPicker
                                                    value={roadModuleStyles[key]?.fillColor ?? defaultFill}
                                                    onChange={(c) => setRoadModuleStyle(key, 'fillColor', c)}
                                                />
                                            </ControlRow>
                                            <ControlRow label="Fill Opacity">
                                                <SliderInput
                                                    value={roadModuleStyles[key]?.fillOpacity ?? 0.7}
                                                    onChange={(v) => setRoadModuleStyle(key, 'fillOpacity', v)}
                                                />
                                            </ControlRow>
                                        </div>
                                    ))}
                                </div>
                            </Section>
                        </div>
                    )}
                </div>
            )}
        </>
    )
}

export default StyleEditor
