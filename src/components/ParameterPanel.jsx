import { useStore, calculatePolygonArea, DIMENSION_FONT_OPTIONS } from '../store/useStore'
import { useStore as useZustandStore } from 'zustand'
import { useState } from 'react'
import { calculateRoofPitch } from '../utils/roofGeometry'
import StateManager from './StateManager'
import {
    ChevronUp, ChevronDown, Eye, EyeOff, Palette, Undo, Save
} from 'lucide-react'

// ============================================
// Reusable UI Sub-Components
// ============================================

const Section = ({ title, children, defaultOpen = true, headerRight }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen)
    return (
        <div className="mb-3">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-2 rounded text-xs font-bold uppercase tracking-wide hover-bg-secondary"
                style={{ backgroundColor: 'var(--ui-bg-secondary-50)', color: 'var(--ui-text-secondary)' }}
            >
                <span>{title}</span>
                <div className="flex items-center gap-2">
                    {headerRight}
                    {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
            </button>
            {isOpen && <div className="p-2 space-y-2">{children}</div>}
        </div>
    )
}

const SubSection = ({ title, children, isOpen, onToggle }) => (
    <div className="last:border-0" style={{ borderBottom: '1px solid var(--ui-border)' }}>
        <button
            onClick={onToggle}
            className="w-full flex items-center justify-between p-2 text-[10px] font-bold uppercase tracking-wider transition-colors hover-bg-secondary"
            style={{ backgroundColor: 'var(--ui-bg-primary)', color: 'var(--ui-text-secondary)' }}
        >
            {title}
            {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        {isOpen && <div className="p-2 space-y-2" style={{ backgroundColor: 'var(--ui-bg-tertiary)' }}>{children}</div>}
    </div>
)

const ControlRow = ({ label, children }) => (
    <div className="flex items-center justify-between gap-1">
        <label className="text-[10px] font-medium" style={{ color: 'var(--ui-text-secondary)' }}>{label}</label>
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
                className={`h-1 rounded-lg appearance-none cursor-pointer accent-theme ${className}`}
                style={{ backgroundColor: 'var(--ui-border)' }}
            />
            <div className="flex items-center rounded overflow-hidden" style={{ backgroundColor: 'var(--ui-bg-primary)', border: '1px solid var(--ui-border)' }}>
                <input
                    type="number"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className="w-8 pl-1 py-0.5 text-[9px] bg-transparent text-center focus:outline-none no-spinner"
                    style={{ color: 'var(--ui-text-primary)' }}
                />
                <div className="flex flex-col" style={{ borderLeft: '1px solid var(--ui-border)' }}>
                    <button
                        onClick={() => updateValue(value + step)}
                        className="px-0.5 flex items-center justify-center h-2.5 hover-bg-secondary hover-text-primary"
                        style={{ color: 'var(--ui-text-secondary)', borderBottom: '1px solid var(--ui-border)' }}
                    >
                        <ChevronUp size={8} />
                    </button>
                    <button
                        onClick={() => updateValue(value - step)}
                        className="px-0.5 flex items-center justify-center h-2.5 hover-bg-secondary hover-text-primary"
                        style={{ color: 'var(--ui-text-secondary)' }}
                    >
                        <ChevronDown size={8} />
                    </button>
                </div>
            </div>
        </div>
    )
}

const LineStyleSelector = ({ dashed, dashSize, gapSize, onChange, onDashChange, onGapChange }) => (
    <div className="space-y-1">
        <div className="flex gap-1">
            <button
                onClick={() => onChange(false)}
                className="flex-1 text-[9px] px-1 py-0.5 rounded border transition-colors"
                style={{
                    backgroundColor: !dashed ? 'var(--ui-accent-muted)' : 'transparent',
                    borderColor: !dashed ? 'var(--ui-accent)' : 'var(--ui-border)',
                    color: !dashed ? 'var(--ui-text-primary)' : 'var(--ui-text-secondary)',
                }}
            >
                SOLID
            </button>
            <button
                onClick={() => onChange(true)}
                className="flex-1 text-[9px] px-1 py-0.5 rounded border transition-colors"
                style={{
                    backgroundColor: dashed ? 'var(--ui-accent-muted)' : 'transparent',
                    borderColor: dashed ? 'var(--ui-accent)' : 'var(--ui-border)',
                    color: dashed ? 'var(--ui-text-primary)' : 'var(--ui-text-secondary)',
                }}
            >
                DASH
            </button>
        </div>
        {dashed && (
            <div className="grid grid-cols-2 gap-1">
                <div className="flex items-center gap-1">
                    <span className="text-[9px]" style={{ color: 'var(--ui-text-muted)' }}>D</span>
                    <input type="number" min="0.5" max="10" step="0.5" value={dashSize}
                        onChange={(e) => onDashChange(parseFloat(e.target.value))}
                        className="w-10 rounded px-1 py-0.5 text-[9px]"
                        style={{ backgroundColor: 'var(--ui-bg-primary)', border: '1px solid var(--ui-border)', color: 'var(--ui-text-primary)' }} />
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-[9px]" style={{ color: 'var(--ui-text-muted)' }}>G</span>
                    <input type="number" min="0.5" max="10" step="0.5" value={gapSize}
                        onChange={(e) => onGapChange(parseFloat(e.target.value))}
                        className="w-10 rounded px-1 py-0.5 text-[9px]"
                        style={{ backgroundColor: 'var(--ui-bg-primary)', border: '1px solid var(--ui-border)', color: 'var(--ui-text-primary)' }} />
                </div>
            </div>
        )}
    </div>
)

const CustomLabelRow = ({ label, dimensionKey, customLabels, setCustomLabel }) => {
    const config = customLabels?.[dimensionKey] || { mode: 'value', text: '' }
    const isCustom = config.mode === 'custom'

    return (
        <div className="flex items-center gap-1 mb-1">
            <span className="text-[9px] w-16 truncate" style={{ color: 'var(--ui-text-secondary)' }}>{label}</span>
            <div className="flex items-center gap-1 flex-1">
                <button
                    onClick={() => setCustomLabel(dimensionKey, isCustom ? 'value' : 'custom', config.text)}
                    className="px-1.5 py-0.5 rounded text-[8px] font-medium border transition-colors"
                    style={{
                        backgroundColor: isCustom ? 'var(--ui-accent)' : 'var(--ui-bg-primary)',
                        borderColor: isCustom ? 'var(--ui-accent)' : 'var(--ui-border)',
                        color: isCustom ? '#fff' : 'var(--ui-text-secondary)',
                    }}
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
                        className="flex-1 px-1 py-0.5 text-[9px] rounded focus:outline-none placeholder-theme focus-ring-accent-1"
                        style={{ backgroundColor: 'var(--ui-bg-primary)', border: '1px solid var(--ui-border)', color: 'var(--ui-text-primary)' }}
                    />
                )}
            </div>
        </div>
    )
}

// ============================================
// Color Presets
// ============================================

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

// ============================================
// Model Style Controls (per-condition style panel)
// ============================================

const ModelStyleControls = ({ model, styles, setStyle, setStyleOverride, openSections, toggleSection }) => {
    const prefix = model

    const renderOverrideControls = (category, currentStyle) => {
        if (category !== 'lotLines' && category !== 'setbacks') return null

        const sectionId = `${model}_${category}_granular`
        const isOpen = openSections[sectionId]

        return (
            <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--ui-bg-primary)' }}>
                <button
                    onClick={() => toggleSection(sectionId)}
                    className="w-full flex items-center justify-between text-[9px] mb-2 hover-text-primary"
                    style={{ color: 'var(--ui-text-secondary)' }}
                >
                    <span className="flex items-center gap-1">
                        <span
                            className="w-3 h-3 rounded flex items-center justify-center border"
                            style={{
                                backgroundColor: isOpen ? 'var(--ui-accent)' : 'transparent',
                                borderColor: isOpen ? 'var(--ui-accent)' : 'var(--ui-border)',
                            }}
                        >
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
                        <div key={side} className="ml-2 mb-2 pl-2" style={{ borderLeft: '1px solid var(--ui-border)' }}>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-[9px] uppercase font-bold" style={{ color: 'var(--ui-text-muted)' }}>{side}</label>
                                <button
                                    onClick={() => setStyleOverride(model, category, side, 'enabled', !isEnabled)}
                                    className="text-[8px] px-1 rounded"
                                    style={{
                                        backgroundColor: isEnabled ? 'var(--ui-accent-muted)' : 'var(--ui-bg-primary)',
                                        color: isEnabled ? 'var(--ui-text-primary)' : 'var(--ui-text-muted)',
                                    }}
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
                                            min={1} max={10} step={0.5} className="w-10"
                                        />
                                    </ControlRow>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => setStyleOverride(model, category, side, 'dashed', false)}
                                            className="flex-1 text-[8px] border rounded"
                                            style={{
                                                backgroundColor: !override.dashed ? 'var(--ui-accent-muted)' : 'transparent',
                                                borderColor: !override.dashed ? 'var(--ui-accent)' : 'var(--ui-border)',
                                                color: !override.dashed ? '#fff' : 'var(--ui-text-muted)',
                                            }}
                                        >
                                            Solid
                                        </button>
                                        <button
                                            onClick={() => setStyleOverride(model, category, side, 'dashed', true)}
                                            className="flex-1 text-[8px] border rounded"
                                            style={{
                                                backgroundColor: override.dashed ? 'var(--ui-accent-muted)' : 'transparent',
                                                borderColor: override.dashed ? 'var(--ui-accent)' : 'var(--ui-border)',
                                                color: override.dashed ? '#fff' : 'var(--ui-text-muted)',
                                            }}
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
            {/* Lot Lines */}
            <SubSection
                title="Lot Lines"
                isOpen={openSections[`${prefix}_lot`]}
                onToggle={() => toggleSection(`${prefix}_lot`)}
            >
                <ControlRow label="Color">
                    <ColorPicker value={styles.lotLines.color} onChange={(c) => setStyle(model, 'lotLines', 'color', c)} />
                </ControlRow>
                <ControlRow label="Width">
                    <SliderInput value={styles.lotLines.width} onChange={(v) => setStyle(model, 'lotLines', 'width', v)} min={1} max={10} step={0.5} />
                </ControlRow>
                <ControlRow label="Opacity">
                    <SliderInput value={styles.lotLines.opacity} onChange={(v) => setStyle(model, 'lotLines', 'opacity', v)} />
                </ControlRow>
                <div className="pt-1">
                    <LineStyleSelector
                        dashed={styles.lotLines.dashed} dashSize={styles.lotLines.dashSize} gapSize={styles.lotLines.gapSize}
                        onChange={(v) => setStyle(model, 'lotLines', 'dashed', v)}
                        onDashChange={(v) => setStyle(model, 'lotLines', 'dashSize', v)}
                        onGapChange={(v) => setStyle(model, 'lotLines', 'gapSize', v)}
                    />
                </div>
                {renderOverrideControls('lotLines', styles.lotLines)}
            </SubSection>

            {/* Lot Fill */}
            <SubSection
                title="Lot Fill"
                isOpen={openSections[`${prefix}_lotFill`]}
                onToggle={() => toggleSection(`${prefix}_lotFill`)}
            >
                <ControlRow label="Visible">
                    <button
                        onClick={() => setStyle(model, 'lotFill', 'visible', !styles.lotFill.visible)}
                        className="px-2 py-0.5 rounded text-[9px] font-bold"
                        style={{
                            backgroundColor: styles.lotFill.visible ? 'var(--ui-accent)' : 'var(--ui-bg-secondary)',
                            color: styles.lotFill.visible ? '#fff' : 'var(--ui-text-secondary)',
                        }}
                    >
                        {styles.lotFill.visible ? 'ON' : 'OFF'}
                    </button>
                </ControlRow>
                <ControlRow label="Color">
                    <ColorPicker value={styles.lotFill.color} onChange={(c) => setStyle(model, 'lotFill', 'color', c)} />
                </ControlRow>
                <ControlRow label="Opacity">
                    <SliderInput value={styles.lotFill.opacity} onChange={(v) => setStyle(model, 'lotFill', 'opacity', v)} min={0} max={1} step={0.1} />
                </ControlRow>
            </SubSection>

            {/* Setbacks */}
            <SubSection
                title="Setbacks"
                isOpen={openSections[`${prefix}_setbacks`]}
                onToggle={() => toggleSection(`${prefix}_setbacks`)}
            >
                <ControlRow label="Color">
                    <ColorPicker value={styles.setbacks.color} onChange={(c) => setStyle(model, 'setbacks', 'color', c)} />
                </ControlRow>
                <ControlRow label="Width">
                    <SliderInput value={styles.setbacks.width} onChange={(v) => setStyle(model, 'setbacks', 'width', v)} min={1} max={10} step={0.5} />
                </ControlRow>
                <ControlRow label="Opacity">
                    <SliderInput value={styles.setbacks.opacity} onChange={(v) => setStyle(model, 'setbacks', 'opacity', v)} />
                </ControlRow>
                <div className="pt-1">
                    <LineStyleSelector
                        dashed={styles.setbacks.dashed} dashSize={styles.setbacks.dashSize} gapSize={styles.setbacks.gapSize}
                        onChange={(v) => setStyle(model, 'setbacks', 'dashed', v)}
                        onDashChange={(v) => setStyle(model, 'setbacks', 'dashSize', v)}
                        onGapChange={(v) => setStyle(model, 'setbacks', 'gapSize', v)}
                    />
                </div>
                {renderOverrideControls('setbacks', styles.setbacks)}
            </SubSection>

            {/* Building Edges */}
            <SubSection
                title="Building Edges"
                isOpen={openSections[`${prefix}_edges`]}
                onToggle={() => toggleSection(`${prefix}_edges`)}
            >
                <ControlRow label="Visible">
                    <button
                        onClick={() => setStyle(model, 'buildingEdges', 'visible', !styles.buildingEdges.visible)}
                        className="px-2 py-0.5 rounded text-[9px] font-bold"
                        style={{
                            backgroundColor: styles.buildingEdges.visible ? 'var(--ui-accent)' : 'var(--ui-bg-secondary)',
                            color: styles.buildingEdges.visible ? '#fff' : 'var(--ui-text-secondary)',
                        }}
                    >
                        {styles.buildingEdges.visible ? 'ON' : 'OFF'}
                    </button>
                </ControlRow>
                <ControlRow label="Color">
                    <ColorPicker value={styles.buildingEdges.color} onChange={(c) => setStyle(model, 'buildingEdges', 'color', c)} />
                </ControlRow>
                <ControlRow label="Width">
                    <SliderInput value={styles.buildingEdges.width} onChange={(v) => setStyle(model, 'buildingEdges', 'width', v)} min={0.5} max={5} step={0.5} />
                </ControlRow>
                <ControlRow label="Opacity">
                    <SliderInput value={styles.buildingEdges.opacity} onChange={(v) => setStyle(model, 'buildingEdges', 'opacity', v)} />
                </ControlRow>
            </SubSection>

            {/* Building Mass */}
            <SubSection
                title="Building Mass"
                isOpen={openSections[`${prefix}_faces`]}
                onToggle={() => toggleSection(`${prefix}_faces`)}
            >
                <ControlRow label="Color">
                    <ColorPicker value={styles.buildingFaces.color} onChange={(c) => setStyle(model, 'buildingFaces', 'color', c)} />
                </ControlRow>
                <ControlRow label="Opacity">
                    <SliderInput value={styles.buildingFaces.opacity} onChange={(v) => setStyle(model, 'buildingFaces', 'opacity', v)} />
                </ControlRow>
            </SubSection>

            {/* Roof */}
            <SubSection
                title="Roof"
                isOpen={openSections[`${prefix}_roof`]}
                onToggle={() => toggleSection(`${prefix}_roof`)}
            >
                <ControlRow label="Face Color">
                    <ColorPicker value={styles.roofFaces?.color ?? '#B8A088'} onChange={(c) => setStyle(model, 'roofFaces', 'color', c)} />
                </ControlRow>
                <ControlRow label="Face Opacity">
                    <SliderInput value={styles.roofFaces?.opacity ?? 0.85} onChange={(v) => setStyle(model, 'roofFaces', 'opacity', v)} />
                </ControlRow>
                <ControlRow label="Edge Visible">
                    <button
                        onClick={() => setStyle(model, 'roofEdges', 'visible', !(styles.roofEdges?.visible ?? true))}
                        className="px-2 py-0.5 rounded text-[9px] font-bold"
                        style={{
                            backgroundColor: (styles.roofEdges?.visible ?? true) ? 'var(--ui-accent)' : 'var(--ui-bg-secondary)',
                            color: (styles.roofEdges?.visible ?? true) ? '#fff' : 'var(--ui-text-secondary)',
                        }}
                    >
                        {(styles.roofEdges?.visible ?? true) ? 'ON' : 'OFF'}
                    </button>
                </ControlRow>
                <ControlRow label="Edge Color">
                    <ColorPicker value={styles.roofEdges?.color ?? '#000000'} onChange={(c) => setStyle(model, 'roofEdges', 'color', c)} />
                </ControlRow>
                <ControlRow label="Edge Width">
                    <SliderInput value={styles.roofEdges?.width ?? 1.5} onChange={(v) => setStyle(model, 'roofEdges', 'width', v)} min={0.5} max={5} step={0.5} />
                </ControlRow>
                <ControlRow label="Edge Opacity">
                    <SliderInput value={styles.roofEdges?.opacity ?? 1.0} onChange={(v) => setStyle(model, 'roofEdges', 'opacity', v)} />
                </ControlRow>
            </SubSection>

            {/* Max Height Plane */}
            <SubSection
                title="Max Height Plane"
                isOpen={openSections[`${prefix}_maxHeight`]}
                onToggle={() => toggleSection(`${prefix}_maxHeight`)}
            >
                <ControlRow label="Fill Color">
                    <ColorPicker value={styles.maxHeightPlane?.color ?? '#FF6B6B'} onChange={(c) => setStyle(model, 'maxHeightPlane', 'color', c)} />
                </ControlRow>
                <ControlRow label="Fill Opacity">
                    <SliderInput value={styles.maxHeightPlane?.opacity ?? 0.3} onChange={(v) => setStyle(model, 'maxHeightPlane', 'opacity', v)} />
                </ControlRow>
                <ControlRow label="Line Color">
                    <ColorPicker value={styles.maxHeightPlane?.lineColor ?? '#FF0000'} onChange={(c) => setStyle(model, 'maxHeightPlane', 'lineColor', c)} />
                </ControlRow>
                <ControlRow label="Line Width">
                    <SliderInput value={styles.maxHeightPlane?.lineWidth ?? 2} onChange={(v) => setStyle(model, 'maxHeightPlane', 'lineWidth', v)} min={0.5} max={5} step={0.5} />
                </ControlRow>
                <ControlRow label="Line Dashed">
                    <button
                        onClick={() => setStyle(model, 'maxHeightPlane', 'lineDashed', !styles.maxHeightPlane?.lineDashed)}
                        className="px-2 py-0.5 rounded text-[9px] font-bold"
                        style={{
                            backgroundColor: styles.maxHeightPlane?.lineDashed ? 'var(--ui-accent)' : 'var(--ui-bg-secondary)',
                            color: styles.maxHeightPlane?.lineDashed ? '#fff' : 'var(--ui-text-secondary)',
                        }}
                    >
                        {styles.maxHeightPlane?.lineDashed ? 'ON' : 'OFF'}
                    </button>
                </ControlRow>
            </SubSection>
        </div>
    )
}


// ============================================
// Main ParameterPanel Component
// ============================================

const ParameterPanel = () => {
    const existing = useStore((state) => state.existing)
    const proposed = useStore((state) => state.proposed)
    const updateExisting = useStore((state) => state.updateExisting)
    const updateProposed = useStore((state) => state.updateProposed)

    const layers = useStore((state) => state.viewSettings.layers)
    const toggleLayer = useStore((state) => state.toggleLayer)

    // Road Module state
    const roadModule = useStore((state) => state.roadModule)
    const setRoadModuleSetting = useStore((state) => state.setRoadModuleSetting)

    // Comparison Roads state (being added by another agent)
    const comparisonRoads = useStore((state) => state.comparisonRoads)
    const setComparisonRoadSetting = useStore((state) => state.setComparisonRoadSetting)
    const toggleComparisonRoad = useStore((state) => state.toggleComparisonRoad)

    // Polygon editing actions
    const enablePolygonMode = useStore((state) => state.enablePolygonMode)
    const resetToRectangle = useStore((state) => state.resetToRectangle)
    const setPolygonEditing = useStore((state) => state.setPolygonEditing)
    const commitPolygonChanges = useStore((state) => state.commitPolygonChanges)

    // Building polygon + roof actions
    const setRoofSetting = useStore((state) => state.setRoofSetting)
    const resetBuildingToRectangle = useStore((state) => state.resetBuildingToRectangle)

    // Style actions
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

    // Annotation settings
    const annotationSettings = useStore((state) => state.annotationSettings)
    const setAnnotationSetting = useStore((state) => state.setAnnotationSetting)
    const resetAnnotationPositions = useStore((state) => state.resetAnnotationPositions)

    // Undo
    const { undo } = useStore.temporal.getState()
    const pastStates = useZustandStore(useStore.temporal, (state) => state.pastStates)

    // Parameter visibility (per-param eye toggles)
    const [paramVisibility, setParamVisibility] = useState({})
    const toggleParamVisibility = (key) => setParamVisibility(prev => ({ ...prev, [key]: !prev[key] }))

    // Style sections open state
    const [openSections, setOpenSections] = useState({})
    const toggleStyleSection = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))

    // Check polygon modes
    const existingIsPolygon = existing.lotGeometry?.mode === 'polygon'
    const proposedIsPolygon = proposed.lotGeometry?.mode === 'polygon'
    const existingBldgIsPolygon = existing.buildingGeometry?.mode === 'polygon'
    const proposedBldgIsPolygon = proposed.buildingGeometry?.mode === 'polygon'
    const existingIsEditing = existingIsPolygon && existing.lotGeometry?.editing
    const proposedIsEditing = proposedIsPolygon && proposed.lotGeometry?.editing

    // Calculate lot areas
    const existingLotArea = existingIsPolygon && existing.lotGeometry?.vertices
        ? calculatePolygonArea(existing.lotGeometry.vertices)
        : existing.lotWidth * existing.lotDepth

    const proposedLotArea = proposedIsPolygon && proposed.lotGeometry?.vertices
        ? calculatePolygonArea(proposed.lotGeometry.vertices)
        : proposed.lotWidth * proposed.lotDepth

    // Parameter groups
    const parameterGroups = [
        {
            title: 'Lot Dimensions',
            params: [
                { key: 'lotWidth', label: 'Lot Width' },
                { key: 'lotDepth', label: 'Lot Depth' },
            ]
        },
        {
            title: 'Setbacks',
            params: [
                { key: 'setbackFront', label: 'Front Setback' },
                { key: 'setbackRear', label: 'Rear Setback' },
                { key: 'setbackSideLeft', label: 'Left Setback' },
                { key: 'setbackSideRight', label: 'Right Setback' },
            ]
        },
        {
            title: 'Building (Principal)',
            params: [
                { key: 'buildingWidth', label: 'Building Width' },
                { key: 'buildingDepth', label: 'Building Depth' },
                { key: 'buildingStories', label: 'Stories', step: 1, min: 1 },
                { key: 'firstFloorHeight', label: '1st Floor Height' },
                { key: 'upperFloorHeight', label: 'Upper Floor Height' },
                { key: 'maxHeight', label: 'Max Height' },
            ]
        },
        {
            title: 'Building (Accessory)',
            params: [
                { key: 'accessoryWidth', label: 'Accessory Width' },
                { key: 'accessoryDepth', label: 'Accessory Depth' },
                { key: 'accessoryStories', label: 'Acc. Stories', step: 1, min: 1 },
                { key: 'accessoryFirstFloorHeight', label: 'Acc. 1st Floor Ht' },
                { key: 'accessoryUpperFloorHeight', label: 'Acc. Upper Floor Ht' },
                { key: 'accessoryMaxHeight', label: 'Acc. Max Height' },
            ]
        },
    ]

    // Apply color preset
    const applyPreset = (presetKey) => {
        const preset = colorPresets[presetKey]
        setStyle('existing', 'lotLines', 'color', preset.existing.lotLines)
        setStyle('existing', 'setbacks', 'color', preset.existing.setbacks)
        setStyle('existing', 'buildingEdges', 'color', preset.existing.buildingEdges)
        setStyle('existing', 'buildingFaces', 'color', preset.existing.buildingFaces)
        setStyle('existing', 'lotFill', 'color', preset.existing.lotFill)
        setStyle('proposed', 'lotLines', 'color', preset.proposed.lotLines)
        setStyle('proposed', 'setbacks', 'color', preset.proposed.setbacks)
        setStyle('proposed', 'buildingEdges', 'color', preset.proposed.buildingEdges)
        setStyle('proposed', 'buildingFaces', 'color', preset.proposed.buildingFaces)
        setStyle('proposed', 'lotFill', 'color', preset.proposed.lotFill)
        setStyle('ground', 'color', preset.ground)
    }

    return (
        <div className="p-4 w-full md:w-96 flex-shrink-0 overflow-y-auto h-full scrollbar-theme" style={{ backgroundColor: 'var(--ui-bg-primary)', color: 'var(--ui-text-primary)', borderRight: '1px solid var(--ui-border)' }}>

            {/* ============================================ */}
            {/* LAYERS */}
            {/* ============================================ */}
            <Section title="Layers" defaultOpen={true}>
                <div className="space-y-2">
                    {Object.keys(layers).map(layer => (
                        <label key={layer} className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={layers[layer]}
                                onChange={() => toggleLayer(layer)}
                                className="h-4 w-4 rounded accent-theme"
                                style={{ backgroundColor: 'var(--ui-bg-secondary)', borderColor: 'var(--ui-border)' }}
                            />
                            <span className="text-sm capitalize">{layer.replace(/([A-Z])/g, ' $1')}</span>
                        </label>
                    ))}
                </div>
            </Section>

            {/* ============================================ */}
            {/* LOT SHAPE EDITING */}
            {/* ============================================ */}
            <Section title="Lot Shape Editing" defaultOpen={true}>
                <div className="grid grid-cols-2 gap-3">
                    {/* Existing Lot */}
                    <div className="space-y-1.5">
                        <span className="text-xs font-medium" style={{ color: 'var(--ui-text-secondary)' }}>Existing</span>
                        {!existingIsPolygon ? (
                            <button onClick={() => enablePolygonMode('existing')}
                                className="w-full px-2 py-1.5 text-xs rounded transition-colors hover-bg-accent-hover"
                                style={{ backgroundColor: 'var(--ui-accent)', color: '#fff' }}>
                                Edit Shape
                            </button>
                        ) : existingIsEditing ? (
                            <button onClick={() => commitPolygonChanges('existing')}
                                className="w-full px-2 py-1.5 text-xs rounded transition-colors"
                                style={{ backgroundColor: 'var(--ui-success)', color: '#fff' }}>
                                Done Editing
                            </button>
                        ) : (
                            <div className="space-y-1">
                                <button onClick={() => setPolygonEditing('existing', true)}
                                    className="w-full px-2 py-1.5 text-xs rounded transition-colors hover-bg-accent-hover"
                                    style={{ backgroundColor: 'var(--ui-accent)', color: '#fff' }}>
                                    Edit Shape
                                </button>
                                <button onClick={() => resetToRectangle('existing')}
                                    className="w-full px-2 py-1.5 text-xs rounded transition-colors hover-bg-secondary"
                                    style={{ backgroundColor: 'var(--ui-border)', color: '#fff' }}>
                                    Reset to Rectangle
                                </button>
                            </div>
                        )}
                        {existingIsPolygon && (
                            <span className="text-[10px] block" style={{ color: 'var(--ui-success)' }}>
                                Polygon: {existing.lotGeometry?.vertices?.length || 0} vertices
                            </span>
                        )}
                    </div>
                    {/* Proposed Lot */}
                    <div className="space-y-1.5">
                        <span className="text-xs font-medium" style={{ color: 'var(--ui-text-secondary)' }}>Proposed</span>
                        {!proposedIsPolygon ? (
                            <button onClick={() => enablePolygonMode('proposed')}
                                className="w-full px-2 py-1.5 text-xs rounded transition-colors hover-bg-accent-hover"
                                style={{ backgroundColor: 'var(--ui-accent)', color: '#fff' }}>
                                Edit Shape
                            </button>
                        ) : proposedIsEditing ? (
                            <button onClick={() => commitPolygonChanges('proposed')}
                                className="w-full px-2 py-1.5 text-xs rounded transition-colors"
                                style={{ backgroundColor: 'var(--ui-success)', color: '#fff' }}>
                                Done Editing
                            </button>
                        ) : (
                            <div className="space-y-1">
                                <button onClick={() => setPolygonEditing('proposed', true)}
                                    className="w-full px-2 py-1.5 text-xs rounded transition-colors hover-bg-accent-hover"
                                    style={{ backgroundColor: 'var(--ui-accent)', color: '#fff' }}>
                                    Edit Shape
                                </button>
                                <button onClick={() => resetToRectangle('proposed')}
                                    className="w-full px-2 py-1.5 text-xs rounded transition-colors hover-bg-secondary"
                                    style={{ backgroundColor: 'var(--ui-border)', color: '#fff' }}>
                                    Reset to Rectangle
                                </button>
                            </div>
                        )}
                        {proposedIsPolygon && (
                            <span className="text-[10px] block" style={{ color: 'var(--ui-success)' }}>
                                Polygon: {proposed.lotGeometry?.vertices?.length || 0} vertices
                            </span>
                        )}
                    </div>
                </div>
            </Section>

            {/* ============================================ */}
            {/* PARAMETERS */}
            {/* ============================================ */}
            <Section title="Parameters" defaultOpen={true}>
                <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-x-2 gap-y-1 mb-2">
                    <div className="text-[10px] font-bold uppercase" style={{ color: 'var(--ui-text-muted)' }}>Name</div>
                    <div className="text-[10px] font-bold uppercase text-center" style={{ color: 'var(--ui-text-muted)' }}>Existing</div>
                    <div className="text-[10px] font-bold uppercase text-center" style={{ color: 'var(--ui-text-muted)' }}>Proposed</div>
                    <div className="text-[10px] font-bold uppercase text-center" style={{ color: 'var(--ui-text-muted)' }}>
                        <Eye size={10} className="inline" />
                    </div>
                </div>
                {parameterGroups.map((group) => (
                    <div key={group.title} className="mb-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider pb-1 mb-1.5" style={{ color: 'var(--ui-text-muted)', borderBottom: '1px solid var(--ui-border)' }}>
                            {group.title}
                        </div>
                        <div className="space-y-1">
                            {group.params.map(({ key, label, step, min }) => {
                                const existingVal = existing[key]
                                const proposedVal = proposed[key]
                                const isVisible = paramVisibility[key] !== false

                                return (
                                    <div key={key} className={`grid grid-cols-[auto_1fr_1fr_auto] gap-x-2 items-center ${!isVisible ? 'opacity-40' : ''}`}>
                                        <label className="text-xs break-words pr-1 min-w-[90px]" style={{ color: 'var(--ui-text-secondary)' }}>
                                            {label}
                                        </label>
                                        <input
                                            type="number"
                                            value={existingVal ?? ''}
                                            onChange={(e) => updateExisting(key, parseFloat(e.target.value) || 0)}
                                            className="p-1 rounded text-right text-sm w-full outline-none focus-ring-accent-1"
                                            style={{ backgroundColor: 'var(--ui-bg-secondary)', color: 'var(--ui-text-primary)' }}
                                            step={step}
                                            min={min}
                                        />
                                        <input
                                            type="number"
                                            value={proposedVal ?? ''}
                                            onChange={(e) => updateProposed(key, parseFloat(e.target.value) || 0)}
                                            className="p-1 rounded text-right text-sm w-full outline-none focus-ring-accent-1"
                                            style={{ backgroundColor: 'var(--ui-bg-secondary)', color: 'var(--ui-text-primary)' }}
                                            step={step}
                                            min={min}
                                        />
                                        <button
                                            onClick={() => toggleParamVisibility(key)}
                                            className="p-0.5 rounded transition-colors hover-bg-secondary"
                                            title="Toggle visibility"
                                        >
                                            {isVisible
                                                ? <Eye size={12} style={{ color: 'var(--ui-text-secondary)' }} />
                                                : <EyeOff size={12} style={{ color: 'var(--ui-text-muted)' }} />
                                            }
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </Section>

            {/* ============================================ */}
            {/* BUILDING & ROOF */}
            {/* ============================================ */}
            <Section title="Building & Roof" defaultOpen={true}>
                <div className="grid grid-cols-2 gap-3">
                    {['existing', 'proposed'].map((model) => {
                        const condition = model === 'existing' ? existing : proposed
                        const roof = condition.roof || {}
                        const isBldgPolygon = model === 'existing' ? existingBldgIsPolygon : proposedBldgIsPolygon

                        // Calculate roof analytics
                        const totalBuildingHeight = condition.firstFloorHeight +
                            (condition.upperFloorHeight * Math.max(0, (condition.buildingStories || 1) - 1))
                        const ridgeZ = roof.overrideHeight && roof.ridgeHeight != null
                            ? roof.ridgeHeight
                            : condition.maxHeight
                        const baseZ = totalBuildingHeight
                        const halfSpan = Math.min(condition.buildingWidth, condition.buildingDepth) / 2
                        const roofActive = roof.type !== 'flat' && ridgeZ > baseZ
                        const pitch = roofActive ? calculateRoofPitch(baseZ, ridgeZ, halfSpan) : null

                        // Accessory roof (fields being added by another agent)
                        const accessoryRoof = condition.accessoryRoof || {}

                        return (
                            <div key={model} className="space-y-2">
                                <span className="text-xs font-medium capitalize" style={{ color: 'var(--ui-text-secondary)' }}>{model}</span>

                                {/* Principal Building Shape Status */}
                                <div className="text-[10px] uppercase tracking-wider font-bold mt-1" style={{ color: 'var(--ui-text-muted)' }}>Principal</div>
                                <div className="text-[10px]" style={{ color: 'var(--ui-text-muted)' }}>
                                    Shape: {isBldgPolygon ? (
                                        <span style={{ color: 'var(--ui-success)' }}>
                                            Polygon ({condition.buildingGeometry?.vertices?.length || 0}v)
                                        </span>
                                    ) : (
                                        <span style={{ color: 'var(--ui-text-secondary)' }}>Rectangle</span>
                                    )}
                                </div>
                                {isBldgPolygon && (
                                    <button
                                        onClick={() => resetBuildingToRectangle(model)}
                                        className="w-full px-2 py-1 text-xs rounded transition-colors hover-bg-secondary"
                                        style={{ backgroundColor: 'var(--ui-border)', color: '#fff' }}
                                    >
                                        Reset to Rect
                                    </button>
                                )}

                                {/* Principal Roof Type */}
                                <div>
                                    <label className="text-[10px] block mb-1" style={{ color: 'var(--ui-text-muted)' }}>Roof Type</label>
                                    <select
                                        value={roof.type || 'flat'}
                                        onChange={(e) => setRoofSetting(model, 'type', e.target.value)}
                                        className="w-full text-xs p-1.5 rounded outline-none focus-ring-accent-1"
                                        style={{ backgroundColor: 'var(--ui-bg-secondary)', color: 'var(--ui-text-primary)', border: '1px solid var(--ui-border)' }}
                                    >
                                        <option value="flat">Flat</option>
                                        <option value="shed">Shed</option>
                                        <option value="gabled">Gabled</option>
                                        <option value="hipped">Hipped</option>
                                    </select>
                                </div>

                                {/* Ridge Direction (gabled/hipped) */}
                                {(roof.type === 'gabled' || roof.type === 'hipped') && (
                                    <div>
                                        <label className="text-[10px] block mb-1" style={{ color: 'var(--ui-text-muted)' }}>Ridge Direction</label>
                                        <div className="flex gap-1">
                                            {['x', 'y'].map((dir) => (
                                                <button
                                                    key={dir}
                                                    onClick={() => setRoofSetting(model, 'ridgeDirection', dir)}
                                                    className="flex-1 text-[10px] px-1 py-1 rounded border transition-colors"
                                                    style={{
                                                        backgroundColor: (roof.ridgeDirection || 'x') === dir ? 'var(--ui-accent-muted)' : 'transparent',
                                                        borderColor: (roof.ridgeDirection || 'x') === dir ? 'var(--ui-accent)' : 'var(--ui-border)',
                                                        color: (roof.ridgeDirection || 'x') === dir ? 'var(--ui-text-primary)' : 'var(--ui-text-secondary)',
                                                    }}
                                                >
                                                    {dir.toUpperCase()}-Axis
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Shed Direction */}
                                {roof.type === 'shed' && (
                                    <div>
                                        <label className="text-[10px] block mb-1" style={{ color: 'var(--ui-text-muted)' }}>Slope Direction</label>
                                        <select
                                            value={roof.shedDirection || '+y'}
                                            onChange={(e) => setRoofSetting(model, 'shedDirection', e.target.value)}
                                            className="w-full text-xs p-1.5 rounded outline-none focus-ring-accent-1"
                                            style={{ backgroundColor: 'var(--ui-bg-secondary)', color: 'var(--ui-text-primary)', border: '1px solid var(--ui-border)' }}
                                        >
                                            <option value="+x">+X (Left to Right)</option>
                                            <option value="-x">-X (Right to Left)</option>
                                            <option value="+y">+Y (Front to Back)</option>
                                            <option value="-y">-Y (Back to Front)</option>
                                        </select>
                                    </div>
                                )}

                                {/* Override Height */}
                                {roof.type !== 'flat' && (
                                    <div>
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={roof.overrideHeight || false}
                                                onChange={(e) => setRoofSetting(model, 'overrideHeight', e.target.checked)}
                                                className="h-3 w-3 rounded accent-theme"
                                                style={{ backgroundColor: 'var(--ui-bg-secondary)', borderColor: 'var(--ui-border)' }}
                                            />
                                            <span className="text-[10px]" style={{ color: 'var(--ui-text-secondary)' }}>Override Height</span>
                                        </label>
                                        {roof.overrideHeight && (
                                            <div className="flex items-center gap-1 mt-1">
                                                <input
                                                    type="number"
                                                    value={roof.ridgeHeight ?? Math.round(condition.maxHeight)}
                                                    onChange={(e) => setRoofSetting(model, 'ridgeHeight', parseFloat(e.target.value) || 0)}
                                                    className="w-full p-1 rounded text-right text-sm outline-none focus-ring-accent-1"
                                                    style={{ backgroundColor: 'var(--ui-bg-secondary)', color: 'var(--ui-text-primary)' }}
                                                    min={Math.round(totalBuildingHeight)}
                                                    step={1}
                                                />
                                                <span className="text-[10px]" style={{ color: 'var(--ui-text-muted)' }}>ft</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Roof Analytics */}
                                {roofActive && pitch && (
                                    <div className="p-1.5 rounded space-y-0.5" style={{ backgroundColor: 'var(--ui-bg-secondary-50)' }}>
                                        <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'var(--ui-text-muted)' }}>Roof Analytics</div>
                                        <div className="flex justify-between text-[10px]">
                                            <span style={{ color: 'var(--ui-text-muted)' }}>Pitch</span>
                                            <span style={{ color: 'var(--ui-text-primary)' }}>{pitch.angleDeg.toFixed(1)}&deg;</span>
                                        </div>
                                        <div className="flex justify-between text-[10px]">
                                            <span style={{ color: 'var(--ui-text-muted)' }}>Ratio</span>
                                            <span style={{ color: 'var(--ui-text-primary)' }}>{pitch.pitchRatio}</span>
                                        </div>
                                        <div className="flex justify-between text-[10px]">
                                            <span style={{ color: 'var(--ui-text-muted)' }}>Rise</span>
                                            <span style={{ color: 'var(--ui-text-primary)' }}>{pitch.rise.toFixed(1)}&apos;</span>
                                        </div>
                                        <div className="flex justify-between text-[10px]">
                                            <span style={{ color: 'var(--ui-text-muted)' }}>Ridge</span>
                                            <span style={{ color: 'var(--ui-text-primary)' }}>{ridgeZ.toFixed(1)}&apos;</span>
                                        </div>
                                    </div>
                                )}

                                {/* Accessory Building Roof (fields being added by another agent) */}
                                {condition.accessoryWidth != null && condition.accessoryWidth > 0 && (
                                    <>
                                        <div className="text-[10px] uppercase tracking-wider font-bold mt-3 pt-2" style={{ color: 'var(--ui-text-muted)', borderTop: '1px solid var(--ui-border)' }}>Accessory</div>
                                        <div>
                                            <label className="text-[10px] block mb-1" style={{ color: 'var(--ui-text-muted)' }}>Acc. Roof Type</label>
                                            <select
                                                value={accessoryRoof.type || 'flat'}
                                                onChange={(e) => setRoofSetting && setRoofSetting(model, 'type', e.target.value, 'accessory')}
                                                className="w-full text-xs p-1.5 rounded outline-none focus-ring-accent-1"
                                                style={{ backgroundColor: 'var(--ui-bg-secondary)', color: 'var(--ui-text-primary)', border: '1px solid var(--ui-border)' }}
                                            >
                                                <option value="flat">Flat</option>
                                                <option value="shed">Shed</option>
                                                <option value="gabled">Gabled</option>
                                                <option value="hipped">Hipped</option>
                                            </select>
                                        </div>
                                    </>
                                )}
                            </div>
                        )
                    })}
                </div>
            </Section>

            {/* ============================================ */}
            {/* ROAD MODULE(S) */}
            {/* ============================================ */}
            <Section title="Road Module(s)" defaultOpen={true}>
                {/* Front Road Module (existing) */}
                <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--ui-text-muted)' }}>Front Road</span>
                        <button
                            onClick={() => setRoadModuleSetting('enabled', !roadModule?.enabled)}
                            className="px-2 py-1 rounded text-xs font-bold"
                            style={{
                                backgroundColor: roadModule?.enabled ? 'var(--ui-accent)' : 'var(--ui-border)',
                                color: roadModule?.enabled ? '#fff' : 'var(--ui-text-secondary)',
                            }}
                        >
                            {roadModule?.enabled ? 'ON' : 'OFF'}
                        </button>
                    </div>

                    {roadModule?.enabled && (() => {
                        const rightOfWay = roadModule?.rightOfWay ?? 50
                        const roadWidth = roadModule?.roadWidth ?? 24
                        const availablePerSide = (rightOfWay - roadWidth) / 2

                        const leftUsed = (roadModule?.leftParking || 0) +
                            (roadModule?.leftVerge || 0) +
                            (roadModule?.leftSidewalk || 0) +
                            (roadModule?.leftTransitionZone || 0)
                        const leftRemaining = availablePerSide - leftUsed

                        const rightUsed = (roadModule?.rightParking || 0) +
                            (roadModule?.rightVerge || 0) +
                            (roadModule?.rightSidewalk || 0) +
                            (roadModule?.rightTransitionZone || 0)
                        const rightRemaining = availablePerSide - rightUsed

                        return (
                            <div className="space-y-3">
                                {/* Required Parameters */}
                                <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-2 items-center">
                                        <label className="text-xs" style={{ color: 'var(--ui-text-secondary)' }}>Right-of-Way</label>
                                        <div className="flex items-center gap-1">
                                            <input type="number" value={roadModule?.rightOfWay ?? 50}
                                                onChange={(e) => setRoadModuleSetting('rightOfWay', parseFloat(e.target.value) || 0)}
                                                className="p-1 rounded text-right text-sm w-full outline-none focus-ring-accent-1"
                                                style={{ backgroundColor: 'var(--ui-bg-secondary)', color: 'var(--ui-text-primary)' }} />
                                            <span className="text-[10px]" style={{ color: 'var(--ui-text-muted)' }}>ft</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 items-center">
                                        <label className="text-xs" style={{ color: 'var(--ui-text-secondary)' }}>Road Width</label>
                                        <div className="flex items-center gap-1">
                                            <input type="number" value={roadModule?.roadWidth ?? 24}
                                                onChange={(e) => setRoadModuleSetting('roadWidth', parseFloat(e.target.value) || 0)}
                                                className={`p-1 rounded text-right text-sm w-full outline-none ${roadWidth > rightOfWay ? '' : 'focus-ring-accent-1'}`}
                                                style={{
                                                    backgroundColor: 'var(--ui-bg-secondary)',
                                                    color: roadWidth > rightOfWay ? 'var(--ui-error)' : 'var(--ui-text-primary)',
                                                    ...(roadWidth > rightOfWay ? { boxShadow: '0 0 0 1px var(--ui-error)' } : {}),
                                                }} />
                                            <span className="text-[10px]" style={{ color: 'var(--ui-text-muted)' }}>ft</span>
                                        </div>
                                    </div>
                                    {roadWidth > rightOfWay && (
                                        <div className="text-[10px] px-2 py-1 rounded" style={{ color: 'var(--ui-error)', backgroundColor: 'var(--ui-error-muted)' }}>
                                            Road width cannot exceed right-of-way
                                        </div>
                                    )}
                                </div>

                                {/* Left Side */}
                                <div className="pt-2" style={{ borderTop: '1px solid var(--ui-border)' }}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--ui-text-muted)' }}>Left Side</span>
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{
                                            backgroundColor: leftRemaining < 0 ? 'var(--ui-error-muted)' : leftRemaining === 0 ? 'var(--ui-warning-muted)' : 'var(--ui-success-muted)',
                                            color: leftRemaining < 0 ? 'var(--ui-error)' : leftRemaining === 0 ? 'var(--ui-warning)' : 'var(--ui-success)',
                                        }}>
                                            {leftRemaining.toFixed(1)}' left
                                        </span>
                                    </div>
                                    {leftRemaining < 0 && (
                                        <div className="text-[10px] px-2 py-1 rounded mb-2" style={{ color: 'var(--ui-error)', backgroundColor: 'var(--ui-error-muted)' }}>
                                            Exceeds available space by {Math.abs(leftRemaining).toFixed(1)}'
                                        </div>
                                    )}
                                    {[
                                        { key: 'leftParking', label: 'Parking' },
                                        { key: 'leftVerge', label: 'Verge' },
                                        { key: 'leftSidewalk', label: 'Sidewalk' },
                                        { key: 'leftTransitionZone', label: 'Transition' },
                                    ].map(({ key, label }) => (
                                        <div key={key} className="grid grid-cols-3 gap-2 items-center mb-1">
                                            <label className="flex items-center gap-1 cursor-pointer col-span-2">
                                                <input type="checkbox"
                                                    checked={roadModule?.[key] !== null && roadModule?.[key] !== undefined}
                                                    onChange={(e) => setRoadModuleSetting(key, e.target.checked ? 8 : null)}
                                                    className="h-3 w-3 rounded accent-theme"
                                                    style={{ backgroundColor: 'var(--ui-bg-secondary)', borderColor: 'var(--ui-border)' }} />
                                                <span className="text-xs" style={{ color: 'var(--ui-text-secondary)' }}>{label}</span>
                                            </label>
                                            {roadModule?.[key] !== null && roadModule?.[key] !== undefined && (
                                                <div className="flex items-center gap-1">
                                                    <input type="number" value={roadModule?.[key] ?? 0}
                                                        onChange={(e) => setRoadModuleSetting(key, parseFloat(e.target.value) || 0)}
                                                        className={`p-1 rounded text-right text-sm w-full outline-none ${leftRemaining < 0 ? '' : 'focus-ring-accent-1'}`}
                                                        style={{
                                                            backgroundColor: 'var(--ui-bg-secondary)',
                                                            color: leftRemaining < 0 ? 'var(--ui-error)' : 'var(--ui-text-primary)',
                                                            ...(leftRemaining < 0 ? { boxShadow: '0 0 0 1px var(--ui-error)' } : {}),
                                                        }} />
                                                    <span className="text-[10px]" style={{ color: 'var(--ui-text-muted)' }}>ft</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Right Side */}
                                <div className="pt-2" style={{ borderTop: '1px solid var(--ui-border)' }}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--ui-text-muted)' }}>Right Side</span>
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{
                                            backgroundColor: rightRemaining < 0 ? 'var(--ui-error-muted)' : rightRemaining === 0 ? 'var(--ui-warning-muted)' : 'var(--ui-success-muted)',
                                            color: rightRemaining < 0 ? 'var(--ui-error)' : rightRemaining === 0 ? 'var(--ui-warning)' : 'var(--ui-success)',
                                        }}>
                                            {rightRemaining.toFixed(1)}' left
                                        </span>
                                    </div>
                                    {rightRemaining < 0 && (
                                        <div className="text-[10px] px-2 py-1 rounded mb-2" style={{ color: 'var(--ui-error)', backgroundColor: 'var(--ui-error-muted)' }}>
                                            Exceeds available space by {Math.abs(rightRemaining).toFixed(1)}'
                                        </div>
                                    )}
                                    {[
                                        { key: 'rightParking', label: 'Parking' },
                                        { key: 'rightVerge', label: 'Verge' },
                                        { key: 'rightSidewalk', label: 'Sidewalk' },
                                        { key: 'rightTransitionZone', label: 'Transition' },
                                    ].map(({ key, label }) => (
                                        <div key={key} className="grid grid-cols-3 gap-2 items-center mb-1">
                                            <label className="flex items-center gap-1 cursor-pointer col-span-2">
                                                <input type="checkbox"
                                                    checked={roadModule?.[key] !== null && roadModule?.[key] !== undefined}
                                                    onChange={(e) => setRoadModuleSetting(key, e.target.checked ? 8 : null)}
                                                    className="h-3 w-3 rounded accent-theme"
                                                    style={{ backgroundColor: 'var(--ui-bg-secondary)', borderColor: 'var(--ui-border)' }} />
                                                <span className="text-xs" style={{ color: 'var(--ui-text-secondary)' }}>{label}</span>
                                            </label>
                                            {roadModule?.[key] !== null && roadModule?.[key] !== undefined && (
                                                <div className="flex items-center gap-1">
                                                    <input type="number" value={roadModule?.[key] ?? 0}
                                                        onChange={(e) => setRoadModuleSetting(key, parseFloat(e.target.value) || 0)}
                                                        className={`p-1 rounded text-right text-sm w-full outline-none ${rightRemaining < 0 ? '' : 'focus-ring-accent-1'}`}
                                                        style={{
                                                            backgroundColor: 'var(--ui-bg-secondary)',
                                                            color: rightRemaining < 0 ? 'var(--ui-error)' : 'var(--ui-text-primary)',
                                                            ...(rightRemaining < 0 ? { boxShadow: '0 0 0 1px var(--ui-error)' } : {}),
                                                        }} />
                                                    <span className="text-[10px]" style={{ color: 'var(--ui-text-muted)' }}>ft</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })()}
                </div>

                {/* Comparison Roads (left/right/rear) - fields being added by another agent */}
                {['left', 'right', 'rear'].map((direction) => {
                    const road = comparisonRoads?.[direction]
                    const isEnabled = road?.enabled

                    return (
                        <div key={direction} className="mb-3 pt-2" style={{ borderTop: '1px solid var(--ui-border)' }}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] uppercase tracking-wider font-bold capitalize" style={{ color: 'var(--ui-text-muted)' }}>{direction} Road</span>
                                <button
                                    onClick={() => toggleComparisonRoad && toggleComparisonRoad(direction)}
                                    className="px-2 py-1 rounded text-xs font-bold"
                                    style={{
                                        backgroundColor: isEnabled ? 'var(--ui-accent)' : 'var(--ui-border)',
                                        color: isEnabled ? '#fff' : 'var(--ui-text-secondary)',
                                    }}
                                >
                                    {isEnabled ? 'ON' : 'OFF'}
                                </button>
                            </div>

                            {isEnabled && (
                                <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-2 items-center">
                                        <label className="text-xs" style={{ color: 'var(--ui-text-secondary)' }}>Type</label>
                                        <select
                                            value={road?.type || 'S1'}
                                            onChange={(e) => setComparisonRoadSetting && setComparisonRoadSetting(direction, 'type', e.target.value)}
                                            className="text-xs p-1 rounded outline-none focus-ring-accent-1"
                                            style={{ backgroundColor: 'var(--ui-bg-secondary)', color: 'var(--ui-text-primary)', border: '1px solid var(--ui-border)' }}
                                        >
                                            <option value="S1">S1 (50' ROW)</option>
                                            <option value="S2">S2 (40' ROW)</option>
                                            <option value="S3">S3 (20' ROW)</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 items-center">
                                        <label className="text-xs" style={{ color: 'var(--ui-text-secondary)' }}>Right-of-Way</label>
                                        <div className="flex items-center gap-1">
                                            <input type="number" value={road?.rightOfWay ?? 50}
                                                onChange={(e) => setComparisonRoadSetting && setComparisonRoadSetting(direction, 'rightOfWay', parseFloat(e.target.value) || 0)}
                                                className="p-1 rounded text-right text-sm w-full outline-none focus-ring-accent-1"
                                                style={{ backgroundColor: 'var(--ui-bg-secondary)', color: 'var(--ui-text-primary)' }} />
                                            <span className="text-[10px]" style={{ color: 'var(--ui-text-muted)' }}>ft</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 items-center">
                                        <label className="text-xs" style={{ color: 'var(--ui-text-secondary)' }}>Road Width</label>
                                        <div className="flex items-center gap-1">
                                            <input type="number" value={road?.roadWidth ?? 24}
                                                onChange={(e) => setComparisonRoadSetting && setComparisonRoadSetting(direction, 'roadWidth', parseFloat(e.target.value) || 0)}
                                                className="p-1 rounded text-right text-sm w-full outline-none focus-ring-accent-1"
                                                style={{ backgroundColor: 'var(--ui-bg-secondary)', color: 'var(--ui-text-primary)' }} />
                                            <span className="text-[10px]" style={{ color: 'var(--ui-text-muted)' }}>ft</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </Section>

            {/* ============================================ */}
            {/* STYLE */}
            {/* ============================================ */}
            <Section title="Style" defaultOpen={false}>
                {/* Color Presets */}
                <div className="mb-3">
                    <label className="text-[9px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--ui-text-muted)' }}>Quick Presets</label>
                    <div className="flex flex-wrap gap-1 mb-2">
                        {Object.entries(colorPresets).map(([key, preset]) => (
                            <button
                                key={key}
                                onClick={() => applyPreset(key)}
                                className="px-2 py-1 text-[9px] rounded transition-colors hover-bg-secondary"
                                style={{ backgroundColor: 'var(--ui-bg-primary)', border: '1px solid var(--ui-border)', color: 'var(--ui-text-secondary)' }}
                            >
                                {preset.name}
                            </button>
                        ))}
                        <div className="w-px h-6 mx-1" style={{ backgroundColor: 'var(--ui-bg-secondary)' }} />
                        <button
                            onClick={saveAsDefault}
                            className="px-2 py-1 text-[9px] rounded transition-colors flex items-center gap-1 hover-bg-accent-hover hover-text-primary hover-border-accent"
                            style={{ backgroundColor: 'var(--ui-bg-primary)', border: '1px solid var(--ui-border)', color: 'var(--ui-text-secondary)' }}
                            title="Save current styles as your default"
                        >
                            <Save size={10} />
                            Save as Default
                        </button>
                        {userDefaults && (
                            <button
                                onClick={loadUserDefaults}
                                className="px-2 py-1 text-[9px] rounded transition-colors font-semibold hover-bg-accent-hover hover-border-accent"
                                style={{ backgroundColor: 'var(--ui-accent-muted)', border: '1px solid var(--ui-accent)', color: 'var(--ui-text-primary)' }}
                            >
                                My Defaults
                            </button>
                        )}
                    </div>
                </div>

                {/* Undo Button */}
                <div className="mb-3">
                    <button
                        onClick={() => undo()}
                        disabled={pastStates.length === 0}
                        className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors w-full justify-center ${pastStates.length > 0 ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                        style={{
                            border: `1px solid ${pastStates.length > 0 ? 'var(--ui-error)' : 'var(--ui-error-muted)'}`,
                            backgroundColor: pastStates.length > 0 ? 'var(--ui-error)' : 'var(--ui-error-muted)',
                            color: pastStates.length > 0 ? '#fff' : 'var(--ui-text-muted)',
                        }}
                        title="Undo last change"
                    >
                        <Undo size={16} strokeWidth={2.5} />
                        <span className="text-[10px] font-black tracking-wider">UNDO</span>
                    </button>
                </div>

                {/* Two Column Headers */}
                {styleSettings && styleSettings.existing && styleSettings.proposed && (
                    <>
                        <div className="flex mb-1" style={{ borderBottom: '1px solid var(--ui-border)' }}>
                            <div className="flex-1 p-2 text-center" style={{ backgroundColor: 'var(--ui-bg-primary)', borderRight: '1px solid var(--ui-border)' }}>
                                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--ui-warning)' }}>Existing</span>
                            </div>
                            <div className="flex-1 p-2 text-center" style={{ backgroundColor: 'var(--ui-bg-primary)' }}>
                                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--ui-success)' }}>Proposed</span>
                            </div>
                        </div>

                        {/* Two Column Style Controls */}
                        <div className="flex mb-3">
                            <div className="flex-1" style={{ borderRight: '1px solid var(--ui-border)' }}>
                                <ModelStyleControls
                                    model="existing"
                                    styles={styleSettings.existing}
                                    setStyle={setStyle}
                                    setStyleOverride={setStyleOverride}
                                    openSections={openSections}
                                    toggleSection={toggleStyleSection}
                                />
                            </div>
                            <div className="flex-1">
                                <ModelStyleControls
                                    model="proposed"
                                    styles={styleSettings.proposed}
                                    setStyle={setStyle}
                                    setStyleOverride={setStyleOverride}
                                    openSections={openSections}
                                    toggleSection={toggleStyleSection}
                                />
                            </div>
                        </div>

                        {/* Layout Settings */}
                        <SubSection
                            title="Layout"
                            isOpen={openSections.layout}
                            onToggle={() => toggleStyleSection('layout')}
                        >
                            <ControlRow label="Spacing">
                                <SliderInput
                                    value={layoutSettings?.lotSpacing ?? 10}
                                    onChange={(v) => setLayoutSetting('lotSpacing', v)}
                                    min={0} max={100} step={1}
                                />
                            </ControlRow>
                        </SubSection>

                        {/* Dimension Settings */}
                        <SubSection
                            title="Dimensions"
                            isOpen={openSections.dimensions}
                            onToggle={() => toggleStyleSection('dimensions')}
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
                                <SliderInput value={styleSettings.dimensionSettings?.lineWidth ?? 1} onChange={(v) => setDimensionSetting('lineWidth', v)} min={0.5} max={5} step={0.5} />
                            </ControlRow>
                            <ControlRow label="Font Size">
                                <SliderInput value={styleSettings.dimensionSettings?.fontSize ?? 2} onChange={(v) => setDimensionSetting('fontSize', v)} min={1} max={10} step={0.5} />
                            </ControlRow>
                            <ControlRow label="Marker">
                                <div className="flex gap-1 text-[9px]">
                                    {['tick', 'arrow', 'dot'].map(marker => (
                                        <button key={marker}
                                            onClick={() => setDimensionSetting('endMarker', marker)}
                                            className="px-2 py-1 rounded border capitalize"
                                            style={{
                                                backgroundColor: (styleSettings.dimensionSettings?.endMarker || 'tick') === marker ? 'var(--ui-accent)' : 'var(--ui-bg-primary)',
                                                borderColor: (styleSettings.dimensionSettings?.endMarker || 'tick') === marker ? 'var(--ui-accent)' : 'var(--ui-border)',
                                                color: (styleSettings.dimensionSettings?.endMarker || 'tick') === marker ? '#fff' : 'var(--ui-text-secondary)',
                                            }}
                                        >
                                            {marker}
                                        </button>
                                    ))}
                                </div>
                            </ControlRow>
                            <ControlRow label="Ext. Width">
                                <SliderInput value={styleSettings.dimensionSettings?.extensionWidth ?? 0.5} onChange={(v) => setDimensionSetting('extensionWidth', v)} min={0.1} max={2} step={0.1} />
                            </ControlRow>
                            <ControlRow label="Ext. Color">
                                <div className="flex items-center gap-1">
                                    <ColorPicker value={styleSettings.dimensionSettings?.extensionLineColor ?? styleSettings.dimensionSettings?.lineColor ?? '#000000'} onChange={(c) => setDimensionSetting('extensionLineColor', c)} />
                                    <button
                                        onClick={() => setDimensionSetting('extensionLineColor', null)}
                                        className="text-[8px] px-1 py-0.5 rounded border"
                                        style={{ borderColor: styleSettings.dimensionSettings?.extensionLineColor == null ? 'var(--ui-accent)' : 'var(--ui-border)', color: styleSettings.dimensionSettings?.extensionLineColor == null ? 'var(--ui-accent)' : 'var(--ui-text-muted)', backgroundColor: 'var(--ui-bg-primary)' }}
                                        title="Use same color as main line"
                                    >auto</button>
                                </div>
                            </ControlRow>
                            <ControlRow label="Ext. Style">
                                <div className="flex gap-1 text-[9px]">
                                    {[{ key: 'dashed', label: 'Dashed' }, { key: 'solid', label: 'Solid' }].map(({ key, label }) => (
                                        <button key={key}
                                            onClick={() => setDimensionSetting('extensionLineStyle', key)}
                                            className="px-2 py-0.5 rounded border"
                                            style={{
                                                backgroundColor: (styleSettings.dimensionSettings?.extensionLineStyle ?? 'dashed') === key ? 'var(--ui-accent)' : 'var(--ui-bg-primary)',
                                                borderColor: (styleSettings.dimensionSettings?.extensionLineStyle ?? 'dashed') === key ? 'var(--ui-accent)' : 'var(--ui-border)',
                                                color: (styleSettings.dimensionSettings?.extensionLineStyle ?? 'dashed') === key ? '#fff' : 'var(--ui-text-secondary)',
                                            }}
                                        >{label}</button>
                                    ))}
                                </div>
                            </ControlRow>
                            <ControlRow label="Marker Clr">
                                <div className="flex items-center gap-1">
                                    <ColorPicker value={styleSettings.dimensionSettings?.markerColor ?? styleSettings.dimensionSettings?.lineColor ?? '#000000'} onChange={(c) => setDimensionSetting('markerColor', c)} />
                                    <button
                                        onClick={() => setDimensionSetting('markerColor', null)}
                                        className="text-[8px] px-1 py-0.5 rounded border"
                                        style={{ borderColor: styleSettings.dimensionSettings?.markerColor == null ? 'var(--ui-accent)' : 'var(--ui-border)', color: styleSettings.dimensionSettings?.markerColor == null ? 'var(--ui-accent)' : 'var(--ui-text-muted)', backgroundColor: 'var(--ui-bg-primary)' }}
                                        title="Use same color as main line"
                                    >auto</button>
                                </div>
                            </ControlRow>
                            <ControlRow label="Marker Scale">
                                <SliderInput value={styleSettings.dimensionSettings?.markerScale ?? 1} onChange={(v) => setDimensionSetting('markerScale', v)} min={0.5} max={3} step={0.1} />
                            </ControlRow>
                            <div className="my-1 pt-1" style={{ borderTop: '1px solid var(--ui-bg-primary)' }}>
                                <ControlRow label="Font">
                                    <select
                                        value={styleSettings.dimensionSettings?.fontFamily ?? 'Inter'}
                                        onChange={(e) => setDimensionSetting('fontFamily', e.target.value)}
                                        className="w-full px-1 py-0.5 text-[9px] rounded focus:outline-none"
                                        style={{ backgroundColor: 'var(--ui-bg-primary)', border: '1px solid var(--ui-border)', color: 'var(--ui-text-primary)' }}
                                    >
                                        {DIMENSION_FONT_OPTIONS.map(f => (
                                            <option key={f.label} value={f.label}>{f.label}</option>
                                        ))}
                                    </select>
                                </ControlRow>
                                <ControlRow label="Outline Clr">
                                    <ColorPicker value={styleSettings.dimensionSettings?.outlineColor ?? '#ffffff'} onChange={(c) => setDimensionSetting('outlineColor', c)} />
                                </ControlRow>
                                <ControlRow label="Outline Wid">
                                    <SliderInput value={styleSettings.dimensionSettings?.outlineWidth ?? 0.1} onChange={(v) => setDimensionSetting('outlineWidth', v)} min={0} max={0.5} step={0.05} />
                                </ControlRow>
                                <ControlRow label="Text BG">
                                    <input
                                        type="checkbox"
                                        checked={!!styleSettings.dimensionSettings?.textBackground?.enabled}
                                        onChange={(e) => setDimensionSetting('textBackground', { ...(styleSettings.dimensionSettings?.textBackground ?? {}), enabled: e.target.checked })}
                                        className="rounded accent-theme"
                                    />
                                </ControlRow>
                                {styleSettings.dimensionSettings?.textBackground?.enabled && (
                                    <>
                                        <ControlRow label="BG Color">
                                            <ColorPicker value={styleSettings.dimensionSettings?.textBackground?.color ?? '#ffffff'} onChange={(c) => setDimensionSetting('textBackground', { ...(styleSettings.dimensionSettings?.textBackground ?? {}), color: c })} />
                                        </ControlRow>
                                        <ControlRow label="BG Opacity">
                                            <SliderInput value={styleSettings.dimensionSettings?.textBackground?.opacity ?? 0.85} onChange={(v) => setDimensionSetting('textBackground', { ...(styleSettings.dimensionSettings?.textBackground ?? {}), opacity: v })} min={0} max={1} step={0.05} />
                                        </ControlRow>
                                    </>
                                )}
                            </div>
                            <div className="my-1 pt-1" style={{ borderTop: '1px solid var(--ui-bg-primary)' }}>
                                <ControlRow label="Unit Format">
                                    <div className="flex gap-1 text-[9px]">
                                        {[{ key: 'feet', label: "ft'" }, { key: 'feet-inches', label: "ft-in" }, { key: 'meters', label: 'm' }].map(({ key, label }) => (
                                            <button key={key}
                                                onClick={() => setDimensionSetting('unitFormat', key)}
                                                className="px-2 py-0.5 rounded border"
                                                style={{
                                                    backgroundColor: (styleSettings.dimensionSettings?.unitFormat || 'feet') === key ? 'var(--ui-accent)' : 'var(--ui-bg-primary)',
                                                    borderColor: (styleSettings.dimensionSettings?.unitFormat || 'feet') === key ? 'var(--ui-accent)' : 'var(--ui-border)',
                                                    color: (styleSettings.dimensionSettings?.unitFormat || 'feet') === key ? '#fff' : 'var(--ui-text-secondary)',
                                                }}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </ControlRow>
                                <ControlRow label="Text Mode">
                                    <div className="flex gap-1 text-[9px]">
                                        {[{ key: 'follow-line', label: 'Follow' }, { key: 'billboard', label: 'Billboard' }].map(({ key, label }) => (
                                            <button key={key}
                                                onClick={() => setDimensionSetting('textMode', key)}
                                                className="px-2 py-0.5 rounded border"
                                                style={{
                                                    backgroundColor: (styleSettings.dimensionSettings?.textMode || 'follow-line') === key ? 'var(--ui-accent)' : 'var(--ui-bg-primary)',
                                                    borderColor: (styleSettings.dimensionSettings?.textMode || 'follow-line') === key ? 'var(--ui-accent)' : 'var(--ui-border)',
                                                    color: (styleSettings.dimensionSettings?.textMode || 'follow-line') === key ? '#fff' : 'var(--ui-text-secondary)',
                                                }}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </ControlRow>
                            </div>
                            <div className="my-1 pt-1" style={{ borderTop: '1px solid var(--ui-bg-primary)' }}>
                                <ControlRow label="Setbk Offset">
                                    <SliderInput value={styleSettings.dimensionSettings?.setbackDimOffset ?? 5} onChange={(v) => setDimensionSetting('setbackDimOffset', v)} min={1} max={30} step={1} />
                                </ControlRow>
                                <ControlRow label="Lot Offset">
                                    <SliderInput value={styleSettings.dimensionSettings?.lotDimOffset ?? 15} onChange={(v) => setDimensionSetting('lotDimOffset', v)} min={5} max={40} step={1} />
                                </ControlRow>
                                <ControlRow label="View Mode">
                                    <div className="flex gap-1 text-[9px]">
                                        {[{ key: false, label: '2D' }, { key: true, label: '3D Vert' }].map(({ key, label }) => (
                                            <button key={String(key)}
                                                onClick={() => setDimensionSetting('verticalMode', key)}
                                                className="px-2 py-0.5 rounded border"
                                                style={{
                                                    backgroundColor: (styleSettings.dimensionSettings?.verticalMode ?? false) === key ? 'var(--ui-accent)' : 'var(--ui-bg-primary)',
                                                    borderColor: (styleSettings.dimensionSettings?.verticalMode ?? false) === key ? 'var(--ui-accent)' : 'var(--ui-border)',
                                                    color: (styleSettings.dimensionSettings?.verticalMode ?? false) === key ? '#fff' : 'var(--ui-text-secondary)',
                                                }}
                                            >{label}</button>
                                        ))}
                                    </div>
                                </ControlRow>
                                {styleSettings.dimensionSettings?.verticalMode && (
                                    <ControlRow label="Vert. Height">
                                        <SliderInput value={styleSettings.dimensionSettings?.verticalOffset ?? 20} onChange={(v) => setDimensionSetting('verticalOffset', v)} min={5} max={60} step={1} />
                                    </ControlRow>
                                )}
                            </div>
                        </SubSection>

                        {/* Custom Dimension Labels */}
                        <SubSection
                            title="Custom Dimension Labels"
                            isOpen={openSections.customLabels}
                            onToggle={() => toggleStyleSection('customLabels')}
                        >
                            <p className="text-[9px] mb-2" style={{ color: 'var(--ui-text-muted)' }}>Set custom text labels for dimensions instead of numeric values. Applies to both models.</p>
                            <CustomLabelRow label="Lot Width" dimensionKey="lotWidth" customLabels={styleSettings.dimensionSettings?.customLabels} setCustomLabel={setCustomLabel} />
                            <CustomLabelRow label="Lot Depth" dimensionKey="lotDepth" customLabels={styleSettings.dimensionSettings?.customLabels} setCustomLabel={setCustomLabel} />
                            <CustomLabelRow label="Setback Front" dimensionKey="setbackFront" customLabels={styleSettings.dimensionSettings?.customLabels} setCustomLabel={setCustomLabel} />
                            <CustomLabelRow label="Setback Rear" dimensionKey="setbackRear" customLabels={styleSettings.dimensionSettings?.customLabels} setCustomLabel={setCustomLabel} />
                            <CustomLabelRow label="Setback Left" dimensionKey="setbackLeft" customLabels={styleSettings.dimensionSettings?.customLabels} setCustomLabel={setCustomLabel} />
                            <CustomLabelRow label="Setback Right" dimensionKey="setbackRight" customLabels={styleSettings.dimensionSettings?.customLabels} setCustomLabel={setCustomLabel} />
                            <CustomLabelRow label="Bldg Height" dimensionKey="buildingHeight" customLabels={styleSettings.dimensionSettings?.customLabels} setCustomLabel={setCustomLabel} />
                        </SubSection>

                        {/* Annotation Labels */}
                        <SubSection
                            title="Annotation Labels"
                            isOpen={openSections.annotations}
                            onToggle={() => toggleStyleSection('annotations')}
                        >
                            {annotationSettings && (
                                <div className="space-y-1.5">
                                    <ControlRow label="Text Mode">
                                        <div className="flex gap-1 text-[9px]">
                                            {['billboard', 'fixed'].map(mode => (
                                                <button key={mode}
                                                    onClick={() => setAnnotationSetting('textRotation', mode)}
                                                    className="px-2 py-0.5 rounded border capitalize"
                                                    style={{
                                                        backgroundColor: annotationSettings.textRotation === mode ? 'var(--ui-accent)' : 'var(--ui-bg-primary)',
                                                        borderColor: annotationSettings.textRotation === mode ? 'var(--ui-accent)' : 'var(--ui-border)',
                                                        color: annotationSettings.textRotation === mode ? '#fff' : 'var(--ui-text-secondary)',
                                                    }}
                                                >
                                                    {mode}
                                                </button>
                                            ))}
                                        </div>
                                    </ControlRow>
                                    <ControlRow label="Font Size">
                                        <SliderInput value={annotationSettings.fontSize} onChange={(v) => setAnnotationSetting('fontSize', v)} min={0.5} max={5} step={0.25} />
                                    </ControlRow>
                                    <ControlRow label="Text Color">
                                        <ColorPicker value={annotationSettings.textColor} onChange={(c) => setAnnotationSetting('textColor', c)} />
                                    </ControlRow>
                                    <ControlRow label="Background">
                                        <div className="flex items-center gap-1">
                                            <input type="checkbox" checked={annotationSettings.backgroundEnabled} onChange={(e) => setAnnotationSetting('backgroundEnabled', e.target.checked)} className="rounded accent-theme" />
                                            <ColorPicker value={annotationSettings.backgroundColor} onChange={(c) => setAnnotationSetting('backgroundColor', c)} />
                                        </div>
                                    </ControlRow>
                                    {annotationSettings.backgroundEnabled && (
                                        <ControlRow label="Bg Opacity">
                                            <SliderInput value={annotationSettings.backgroundOpacity} onChange={(v) => setAnnotationSetting('backgroundOpacity', v)} min={0} max={1} step={0.05} />
                                        </ControlRow>
                                    )}
                                    <ControlRow label="Leader Color">
                                        <ColorPicker value={annotationSettings.leaderLineColor} onChange={(c) => setAnnotationSetting('leaderLineColor', c)} />
                                    </ControlRow>
                                    <ControlRow label="Leader Width">
                                        <SliderInput value={annotationSettings.leaderLineWidth} onChange={(v) => setAnnotationSetting('leaderLineWidth', v)} min={0.5} max={5} step={0.5} />
                                    </ControlRow>
                                    <ControlRow label="Leader Dashed">
                                        <input type="checkbox" checked={annotationSettings.leaderLineDashed} onChange={(e) => setAnnotationSetting('leaderLineDashed', e.target.checked)} className="rounded accent-theme" />
                                    </ControlRow>
                                    <button
                                        onClick={resetAnnotationPositions}
                                        className="w-full px-2 py-1 text-[9px] rounded transition-colors hover-bg-secondary"
                                        style={{ backgroundColor: 'var(--ui-bg-secondary)', color: 'var(--ui-text-secondary)', border: '1px solid var(--ui-border)' }}
                                    >
                                        Reset All Label Positions
                                    </button>
                                </div>
                            )}
                        </SubSection>

                        {/* Ground Plane */}
                        <SubSection
                            title="Ground Plane (Shared)"
                            isOpen={openSections.ground}
                            onToggle={() => toggleStyleSection('ground')}
                        >
                            <ControlRow label="Visible">
                                <button
                                    onClick={() => setStyle('ground', 'visible', !styleSettings.ground.visible)}
                                    className="px-2 py-0.5 rounded text-[9px] font-bold"
                                    style={{
                                        backgroundColor: styleSettings.ground.visible ? 'var(--ui-accent)' : 'var(--ui-bg-secondary)',
                                        color: styleSettings.ground.visible ? '#fff' : 'var(--ui-text-secondary)',
                                    }}
                                >
                                    {styleSettings.ground.visible ? 'ON' : 'OFF'}
                                </button>
                            </ControlRow>
                            <ControlRow label="Color">
                                <ColorPicker value={styleSettings.ground.color} onChange={(c) => setStyle('ground', 'color', c)} />
                            </ControlRow>
                            <ControlRow label="Opacity">
                                <SliderInput value={styleSettings.ground.opacity} onChange={(v) => setStyle('ground', 'opacity', v)} />
                            </ControlRow>
                        </SubSection>

                        {/* Environment */}
                        <SubSection
                            title="Environment"
                            isOpen={openSections.environment}
                            onToggle={() => toggleStyleSection('environment')}
                        >
                            <ControlRow label="Shadows">
                                <button
                                    onClick={() => setLighting('shadows', !lighting.shadows)}
                                    className="px-2 py-0.5 rounded text-[9px] font-bold"
                                    style={{
                                        backgroundColor: lighting.shadows ? 'var(--ui-accent)' : 'var(--ui-bg-secondary)',
                                        color: lighting.shadows ? '#fff' : 'var(--ui-text-secondary)',
                                    }}
                                >
                                    {lighting.shadows ? 'ON' : 'OFF'}
                                </button>
                            </ControlRow>
                            <ControlRow label="Direction">
                                <SliderInput
                                    value={(lighting.azimuth || 0) * (180 / Math.PI)}
                                    onChange={(degrees) => setLighting('azimuth', degrees * (Math.PI / 180))}
                                    min={0} max={360} step={15}
                                />
                            </ControlRow>
                            <ControlRow label="Intensity">
                                <SliderInput
                                    value={lighting.intensity || 1.5}
                                    onChange={(v) => setLighting('intensity', v)}
                                    min={0} max={3} step={0.1}
                                />
                            </ControlRow>
                        </SubSection>

                        {/* Grid */}
                        <SubSection
                            title="Grid"
                            isOpen={openSections.grid}
                            onToggle={() => toggleStyleSection('grid')}
                        >
                            <ControlRow label="Primary Color">
                                <ColorPicker value={styleSettings.grid?.sectionColor ?? '#9ca3af'} onChange={(c) => setStyle('grid', 'sectionColor', c)} />
                            </ControlRow>
                            <ControlRow label="Primary Width">
                                <SliderInput value={styleSettings.grid?.sectionThickness ?? 1.5} onChange={(v) => setStyle('grid', 'sectionThickness', v)} min={0.5} max={5} step={0.5} />
                            </ControlRow>
                            <ControlRow label="Secondary Color">
                                <ColorPicker value={styleSettings.grid?.cellColor ?? '#d1d5db'} onChange={(c) => setStyle('grid', 'cellColor', c)} />
                            </ControlRow>
                            <ControlRow label="Secondary Width">
                                <SliderInput value={styleSettings.grid?.cellThickness ?? 1} onChange={(v) => setStyle('grid', 'cellThickness', v)} min={0.5} max={3} step={0.5} />
                            </ControlRow>
                            <ControlRow label="Fade Distance">
                                <SliderInput value={styleSettings.grid?.fadeDistance ?? 400} onChange={(v) => setStyle('grid', 'fadeDistance', v)} min={100} max={1000} step={50} />
                            </ControlRow>
                        </SubSection>

                        {/* Road Module Styles */}
                        {roadModuleStyles && (
                            <SubSection
                                title="Road Module Styles"
                                isOpen={openSections.roadModuleStyles}
                                onToggle={() => toggleStyleSection('roadModuleStyles')}
                            >
                                {/* Right-of-Way Lines */}
                                <div className="mb-3">
                                    <span className="text-[9px] uppercase tracking-wider block mb-1" style={{ color: 'var(--ui-text-muted)' }}>Right-of-Way Lines</span>
                                    <ControlRow label="Color">
                                        <ColorPicker value={roadModuleStyles.rightOfWay?.color ?? '#000000'} onChange={(c) => setRoadModuleStyle('rightOfWay', 'color', c)} />
                                    </ControlRow>
                                    <ControlRow label="Width">
                                        <SliderInput value={roadModuleStyles.rightOfWay?.width ?? 1} onChange={(v) => setRoadModuleStyle('rightOfWay', 'width', v)} min={0.5} max={5} step={0.5} />
                                    </ControlRow>
                                    <ControlRow label="Opacity">
                                        <SliderInput value={roadModuleStyles.rightOfWay?.opacity ?? 1} onChange={(v) => setRoadModuleStyle('rightOfWay', 'opacity', v)} />
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

                                {/* Road Surface */}
                                <div className="pt-2 mb-3" style={{ borderTop: '1px solid var(--ui-bg-primary)' }}>
                                    <span className="text-[9px] uppercase tracking-wider block mb-1" style={{ color: 'var(--ui-text-muted)' }}>Road Surface</span>
                                    <ControlRow label="Line Color">
                                        <ColorPicker value={roadModuleStyles.roadWidth?.lineColor ?? '#000000'} onChange={(c) => setRoadModuleStyle('roadWidth', 'lineColor', c)} />
                                    </ControlRow>
                                    <ControlRow label="Line Width">
                                        <SliderInput value={roadModuleStyles.roadWidth?.lineWidth ?? 1} onChange={(v) => setRoadModuleStyle('roadWidth', 'lineWidth', v)} min={0.5} max={5} step={0.5} />
                                    </ControlRow>
                                    <ControlRow label="Fill Color">
                                        <ColorPicker value={roadModuleStyles.roadWidth?.fillColor ?? '#666666'} onChange={(c) => setRoadModuleStyle('roadWidth', 'fillColor', c)} />
                                    </ControlRow>
                                    <ControlRow label="Fill Opacity">
                                        <SliderInput value={roadModuleStyles.roadWidth?.fillOpacity ?? 0.8} onChange={(v) => setRoadModuleStyle('roadWidth', 'fillOpacity', v)} />
                                    </ControlRow>
                                </div>

                                {/* Left Side Elements */}
                                <div className="pt-2 mb-3" style={{ borderTop: '1px solid var(--ui-bg-primary)' }}>
                                    <span className="text-[9px] uppercase tracking-wider block mb-2 font-bold" style={{ color: 'var(--ui-accent)' }}>Left Side</span>
                                    {[
                                        { key: 'leftParking', label: 'Parking', defaultFill: '#888888' },
                                        { key: 'leftVerge', label: 'Verge', defaultFill: '#c4a77d' },
                                        { key: 'leftSidewalk', label: 'Sidewalk', defaultFill: '#90EE90' },
                                        { key: 'leftTransitionZone', label: 'Transition Zone', defaultFill: '#98D8AA' },
                                    ].map(({ key, label, defaultFill }) => (
                                        <div key={key} className="mb-3 pl-2 border-l-2" style={{ borderColor: 'var(--ui-border)' }}>
                                            <span className="text-[9px] uppercase tracking-wider block mb-1" style={{ color: 'var(--ui-text-muted)' }}>{label}</span>
                                            <ControlRow label="Line Color">
                                                <ColorPicker value={roadModuleStyles[key]?.lineColor ?? '#000000'} onChange={(c) => setRoadModuleStyle(key, 'lineColor', c)} />
                                            </ControlRow>
                                            <ControlRow label="Line Width">
                                                <SliderInput value={roadModuleStyles[key]?.lineWidth ?? 1} onChange={(v) => setRoadModuleStyle(key, 'lineWidth', v)} min={0.5} max={5} step={0.5} />
                                            </ControlRow>
                                            <ControlRow label="Fill Color">
                                                <ColorPicker value={roadModuleStyles[key]?.fillColor ?? defaultFill} onChange={(c) => setRoadModuleStyle(key, 'fillColor', c)} />
                                            </ControlRow>
                                            <ControlRow label="Fill Opacity">
                                                <SliderInput value={roadModuleStyles[key]?.fillOpacity ?? 0.7} onChange={(v) => setRoadModuleStyle(key, 'fillOpacity', v)} />
                                            </ControlRow>
                                        </div>
                                    ))}
                                </div>

                                {/* Right Side Elements */}
                                <div className="pt-2" style={{ borderTop: '1px solid var(--ui-bg-primary)' }}>
                                    <span className="text-[9px] uppercase tracking-wider block mb-2 font-bold" style={{ color: 'var(--ui-success)' }}>Right Side</span>
                                    {[
                                        { key: 'rightParking', label: 'Parking', defaultFill: '#888888' },
                                        { key: 'rightVerge', label: 'Verge', defaultFill: '#c4a77d' },
                                        { key: 'rightSidewalk', label: 'Sidewalk', defaultFill: '#90EE90' },
                                        { key: 'rightTransitionZone', label: 'Transition Zone', defaultFill: '#98D8AA' },
                                    ].map(({ key, label, defaultFill }) => (
                                        <div key={key} className="mb-3 pl-2 border-l-2" style={{ borderColor: 'var(--ui-border)' }}>
                                            <span className="text-[9px] uppercase tracking-wider block mb-1" style={{ color: 'var(--ui-text-muted)' }}>{label}</span>
                                            <ControlRow label="Line Color">
                                                <ColorPicker value={roadModuleStyles[key]?.lineColor ?? '#000000'} onChange={(c) => setRoadModuleStyle(key, 'lineColor', c)} />
                                            </ControlRow>
                                            <ControlRow label="Line Width">
                                                <SliderInput value={roadModuleStyles[key]?.lineWidth ?? 1} onChange={(v) => setRoadModuleStyle(key, 'lineWidth', v)} min={0.5} max={5} step={0.5} />
                                            </ControlRow>
                                            <ControlRow label="Fill Color">
                                                <ColorPicker value={roadModuleStyles[key]?.fillColor ?? defaultFill} onChange={(c) => setRoadModuleStyle(key, 'fillColor', c)} />
                                            </ControlRow>
                                            <ControlRow label="Fill Opacity">
                                                <SliderInput value={roadModuleStyles[key]?.fillOpacity ?? 0.7} onChange={(v) => setRoadModuleStyle(key, 'fillOpacity', v)} />
                                            </ControlRow>
                                        </div>
                                    ))}
                                </div>
                            </SubSection>
                        )}
                    </>
                )}
            </Section>

            {/* ============================================ */}
            {/* VIEWS (was Snapshots + Layer States) */}
            {/* ============================================ */}
            <Section title="Views" defaultOpen={false}>
                <StateManager />
            </Section>

            {/* ============================================ */}
            {/* STATS */}
            {/* ============================================ */}
            <Section title="Stats" defaultOpen={true}>
                <div className="grid grid-cols-3 gap-2 mb-2 font-semibold text-sm">
                    <div className="col-span-1">Metric</div>
                    <div className="col-span-1 text-center">Existing</div>
                    <div className="col-span-1 text-center">Proposed</div>
                </div>
                <div className="space-y-2">
                    {/* Lot Size */}
                    <div className="grid grid-cols-3 gap-2 items-center">
                        <label className="text-xs capitalize break-words pr-2" style={{ color: 'var(--ui-text-secondary)' }}>Lot Size</label>
                        <div className="p-1 rounded text-right text-sm w-full" style={{ backgroundColor: 'var(--ui-bg-secondary)', color: 'var(--ui-text-primary)' }}>
                            {Math.round(existingLotArea).toLocaleString()} <span className="text-[10px]" style={{ color: 'var(--ui-text-muted)' }}>sq ft</span>
                        </div>
                        <div className="p-1 rounded text-right text-sm w-full" style={{ backgroundColor: 'var(--ui-bg-secondary)', color: 'var(--ui-text-primary)' }}>
                            {Math.round(proposedLotArea).toLocaleString()} <span className="text-[10px]" style={{ color: 'var(--ui-text-muted)' }}>sq ft</span>
                        </div>
                    </div>

                    {/* Building Coverage */}
                    <div className="grid grid-cols-3 gap-2 items-center">
                        <label className="text-xs capitalize break-words pr-2" style={{ color: 'var(--ui-text-secondary)' }}>Coverage</label>
                        <div className="p-1 rounded text-right text-sm w-full" style={{ backgroundColor: 'var(--ui-bg-secondary)', color: 'var(--ui-text-primary)' }}>
                            {((existing.buildingWidth * existing.buildingDepth) / existingLotArea * 100).toFixed(1)}%
                        </div>
                        <div className="p-1 rounded text-right text-sm w-full" style={{ backgroundColor: 'var(--ui-bg-secondary)', color: 'var(--ui-text-primary)' }}>
                            {((proposed.buildingWidth * proposed.buildingDepth) / proposedLotArea * 100).toFixed(1)}%
                        </div>
                    </div>

                    {/* Gross Floor Area */}
                    <div className="grid grid-cols-3 gap-2 items-center">
                        <label className="text-xs capitalize break-words pr-2" style={{ color: 'var(--ui-text-secondary)' }}>Gross Floor Area</label>
                        <div className="p-1 rounded text-right text-sm w-full" style={{ backgroundColor: 'var(--ui-bg-secondary)', color: 'var(--ui-text-primary)' }}>
                            {(existing.buildingWidth * existing.buildingDepth * (existing.buildingStories || 1)).toLocaleString()} <span className="text-[10px]" style={{ color: 'var(--ui-text-muted)' }}>sq ft</span>
                        </div>
                        <div className="p-1 rounded text-right text-sm w-full" style={{ backgroundColor: 'var(--ui-bg-secondary)', color: 'var(--ui-text-primary)' }}>
                            {(proposed.buildingWidth * proposed.buildingDepth * (proposed.buildingStories || 1)).toLocaleString()} <span className="text-[10px]" style={{ color: 'var(--ui-text-muted)' }}>sq ft</span>
                        </div>
                    </div>

                    {/* Floor Area Ratio (FAR) */}
                    <div className="grid grid-cols-3 gap-2 items-center">
                        <label className="text-xs capitalize break-words pr-2" style={{ color: 'var(--ui-text-secondary)' }}>FAR</label>
                        <div className="p-1 rounded text-right text-sm w-full" style={{ backgroundColor: 'var(--ui-bg-secondary)', color: 'var(--ui-text-primary)' }}>
                            {((existing.buildingWidth * existing.buildingDepth * (existing.buildingStories || 1)) / existingLotArea).toFixed(2)}
                        </div>
                        <div className="p-1 rounded text-right text-sm w-full" style={{ backgroundColor: 'var(--ui-bg-secondary)', color: 'var(--ui-text-primary)' }}>
                            {((proposed.buildingWidth * proposed.buildingDepth * (proposed.buildingStories || 1)) / proposedLotArea).toFixed(2)}
                        </div>
                    </div>
                </div>
            </Section>
        </div>
    )
}

export default ParameterPanel
