import { useCallback } from 'react'
import { Paintbrush, RotateCcw } from 'lucide-react'
import { useStore, DIMENSION_FONT_OPTIONS, getEffectiveDrawingDefaults } from '../../store/useStore'
import { useShallow } from 'zustand/react/shallow'
import Section from '../ui/Section'
import ColorPicker from '../ui/ColorPicker'
import SliderInput from '../ui/SliderInput'

const selectStyle = {
    backgroundColor: 'var(--ui-bg-secondary)',
    border: '1px solid var(--ui-border)',
    color: 'var(--ui-text-primary)',
}

const SubSectionLabel = ({ children }) => (
    <div
        className="text-[10px] font-bold uppercase tracking-wider px-1 py-1 -mx-1 mt-1"
        style={{ color: 'var(--ui-text-secondary)', borderBottom: '1px solid var(--ui-border)' }}
    >
        {children}
    </div>
)

const LayerStyleControls = ({ layerId }) => {
    const drawingLayers = useStore(useShallow(state => state.drawingLayers))
    const drawingDefaults = useStore(useShallow(state => state.drawingDefaults))
    const setDrawingLayerDefault = useStore(state => state.setDrawingLayerDefault)
    const resetDrawingLayerDefaults = useStore(state => state.resetDrawingLayerDefaults)

    const layer = drawingLayers[layerId]
    if (!layer) return null

    const effective = getEffectiveDrawingDefaults({ drawingDefaults, drawingLayers }, layerId)
    const layerDefs = layer.defaults ?? {}
    const hasOverrides = Object.keys(layerDefs).length > 0

    const handleChange = (key, value) => {
        setDrawingLayerDefault(layerId, key, value)
    }

    return (
        <Section
            title={layer.name}
            icon={<Paintbrush size={14} />}
            defaultOpen={false}
            headerRight={hasOverrides ? (
                <button
                    onClick={(e) => { e.stopPropagation(); resetDrawingLayerDefaults(layerId) }}
                    className="text-[9px] px-1.5 py-0.5 rounded hover:opacity-80"
                    style={{ color: 'var(--ui-text-muted)', border: '1px solid var(--ui-border)' }}
                    title="Reset to global defaults"
                >
                    <RotateCcw size={10} />
                </button>
            ) : null}
        >
            {/* Stroke */}
            <SubSectionLabel>Stroke</SubSectionLabel>
            <div className="space-y-1.5">
                <ColorPicker
                    label="Color"
                    value={effective.strokeColor ?? '#000000'}
                    onChange={(v) => handleChange('strokeColor', v)}
                />
                <SliderInput
                    label="Width"
                    value={effective.strokeWidth ?? 2}
                    onChange={(v) => handleChange('strokeWidth', v)}
                    min={0.5}
                    max={10}
                    step={0.5}
                />
                <div className="flex items-center gap-2">
                    <span className="text-xs w-20 flex-shrink-0" style={{ color: 'var(--ui-text-muted)' }}>Line Type</span>
                    <select
                        value={effective.lineType ?? 'solid'}
                        onChange={(e) => handleChange('lineType', e.target.value)}
                        className="flex-1 text-xs rounded px-1 py-0.5"
                        style={selectStyle}
                    >
                        <option value="solid">Solid</option>
                        <option value="dashed">Dashed</option>
                    </select>
                </div>
            </div>

            {/* Fill */}
            <SubSectionLabel>Fill</SubSectionLabel>
            <div className="space-y-1.5">
                <ColorPicker
                    label="Color"
                    value={effective.fillColor ?? '#cccccc'}
                    onChange={(v) => handleChange('fillColor', v)}
                />
                <SliderInput
                    label="Opacity"
                    value={effective.fillOpacity ?? 0.3}
                    onChange={(v) => handleChange('fillOpacity', v)}
                    min={0}
                    max={1}
                    step={0.05}
                />
            </div>

            {/* Text */}
            <SubSectionLabel>Text</SubSectionLabel>
            <div className="space-y-1.5">
                <ColorPicker
                    label="Color"
                    value={effective.textColor ?? '#000000'}
                    onChange={(v) => handleChange('textColor', v)}
                />
                <SliderInput
                    label="Font Size"
                    value={effective.fontSize ?? 3}
                    onChange={(v) => handleChange('fontSize', v)}
                    min={0.5}
                    max={20}
                    step={0.5}
                />
                <div className="flex items-center gap-2">
                    <span className="text-xs w-20 flex-shrink-0" style={{ color: 'var(--ui-text-muted)' }}>Font</span>
                    <select
                        value={effective.fontFamily ?? ''}
                        onChange={(e) => handleChange('fontFamily', e.target.value || null)}
                        className="flex-1 text-xs rounded px-1 py-0.5"
                        style={selectStyle}
                    >
                        <option value="">Default</option>
                        {DIMENSION_FONT_OPTIONS.map(f => (
                            <option key={f.label} value={f.label}>{f.label}</option>
                        ))}
                    </select>
                </div>
                <SliderInput
                    label="Outline W"
                    value={effective.outlineWidth ?? 0.1}
                    onChange={(v) => handleChange('outlineWidth', v)}
                    min={0}
                    max={1}
                    step={0.05}
                />
                <ColorPicker
                    label="Outline"
                    value={effective.outlineColor ?? '#ffffff'}
                    onChange={(v) => handleChange('outlineColor', v)}
                />
            </div>

            {/* Shape */}
            <SubSectionLabel>Shape</SubSectionLabel>
            <div className="space-y-1.5">
                <SliderInput
                    label="Corner R"
                    value={effective.cornerRadius ?? 0}
                    onChange={(v) => handleChange('cornerRadius', v)}
                    min={0}
                    max={50}
                    step={0.5}
                />
                <SliderInput
                    label="Star Pts"
                    value={effective.starPoints ?? 5}
                    onChange={(v) => handleChange('starPoints', v)}
                    min={3}
                    max={20}
                    step={1}
                />
            </div>
        </Section>
    )
}

const DrawingLayerStylesPanel = () => {
    const drawingLayerOrder = useStore(state => state.drawingLayerOrder)

    if (!drawingLayerOrder || drawingLayerOrder.length === 0) return null

    return (
        <Section title="Drawing Layer Styles" icon={<Paintbrush size={16} />} defaultOpen={false}>
            {drawingLayerOrder.map(layerId => (
                <LayerStyleControls key={layerId} layerId={layerId} />
            ))}
        </Section>
    )
}

export default DrawingLayerStylesPanel
