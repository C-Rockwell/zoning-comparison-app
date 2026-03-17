import { useMemo, useCallback } from 'react'
import { Settings2 } from 'lucide-react'
import { useStore, DIMENSION_FONT_OPTIONS } from '../../store/useStore'
import { useShallow } from 'zustand/react/shallow'
import Section from '../ui/Section'
import ColorPicker from '../ui/ColorPicker'
import SliderInput from '../ui/SliderInput'

// --- Type groupings for property visibility ---

const STROKE_TYPES = new Set(['freehand', 'line', 'arrow', 'polygon', 'rectangle', 'roundedRect', 'circle', 'ellipse', 'star', 'octagon', 'leader', 'dimension'])
const FILL_TYPES = new Set(['polygon', 'rectangle', 'roundedRect', 'circle', 'ellipse', 'star', 'octagon'])
const TEXT_TYPES = new Set(['text', 'leader', 'dimension'])
const TEXT_OUTLINE_TYPES = new Set(['text'])
const ARROW_TYPES = new Set(['arrow'])
const ROUNDED_RECT_TYPES = new Set(['roundedRect'])
const STAR_TYPES = new Set(['star'])

// --- Type labels for selection header ---

const TYPE_LABELS = {
    freehand: 'Freehand', line: 'Line', arrow: 'Arrow', polygon: 'Polygon',
    rectangle: 'Rectangle', roundedRect: 'Rounded Rect', circle: 'Circle',
    ellipse: 'Ellipse', star: 'Star', octagon: 'Octagon', text: 'Text', leader: 'Leader', dimension: 'Dimension',
}

// --- Inline select styling ---

const selectStyle = {
    backgroundColor: 'var(--ui-bg-secondary)',
    border: '1px solid var(--ui-border)',
    color: 'var(--ui-text-primary)',
}

// --- Sub-section divider ---

const SubSectionLabel = ({ children }) => (
    <div
        className="text-[10px] font-bold uppercase tracking-wider px-1 py-1 -mx-1 mt-1"
        style={{ color: 'var(--ui-text-secondary)', borderBottom: '1px solid var(--ui-border)' }}
    >
        {children}
    </div>
)

// --- Main component ---

const DrawingPropertiesPanel = () => {
    const selectedDrawingIds = useStore(state => state.selectedDrawingIds)
    const drawingObjects = useStore(useShallow(state => state.drawingObjects))
    const updateDrawingObjects = useStore(state => state.updateDrawingObjects)
    const updateDrawingObject = useStore(state => state.updateDrawingObject)
    const setDrawingDefault = useStore(state => state.setDrawingDefault)
    const drawingDefaults = useStore(useShallow(state => state.drawingDefaults))

    // Build selected objects array + type analysis
    const { selectedObjects, selectedTypes, allHaveStroke, allHaveFill, allAreText, allAreTextOutline, allAreArrow, allAreRoundedRect, allAreStar } = useMemo(() => {
        const objs = []
        for (const id of selectedDrawingIds) {
            const obj = drawingObjects[id]
            if (obj) objs.push(obj)
        }
        const types = new Set(objs.map(o => o.type))
        return {
            selectedObjects: objs,
            selectedTypes: types,
            allHaveStroke: [...types].every(t => STROKE_TYPES.has(t)),
            allHaveFill: [...types].every(t => FILL_TYPES.has(t)),
            allAreText: [...types].every(t => TEXT_TYPES.has(t)),
            allAreTextOutline: [...types].every(t => TEXT_OUTLINE_TYPES.has(t)),
            allAreArrow: [...types].every(t => ARROW_TYPES.has(t)),
            allAreRoundedRect: [...types].every(t => ROUNDED_RECT_TYPES.has(t)),
            allAreStar: [...types].every(t => STAR_TYPES.has(t)),
        }
    }, [selectedDrawingIds, drawingObjects])

    // Batch change handler — updates all selected objects + defaults
    const handleChange = useCallback((property, value) => {
        const updates = {}
        for (const id of selectedDrawingIds) {
            updates[id] = { [property]: value }
        }
        updateDrawingObjects(updates)
        // Also update defaults for future objects
        if (drawingDefaults[property] !== undefined || property in drawingDefaults) {
            setDrawingDefault(property, value)
        }
    }, [selectedDrawingIds, updateDrawingObjects, setDrawingDefault, drawingDefaults])

    // cornerRadius needs per-object clamping
    const handleCornerRadiusChange = useCallback((value) => {
        const updates = {}
        for (const id of selectedDrawingIds) {
            const obj = drawingObjects[id]
            if (obj && obj.type === 'roundedRect') {
                const maxR = Math.min(Math.abs(obj.width) / 2, Math.abs(obj.height) / 2)
                updates[id] = { cornerRadius: Math.min(value, maxR) }
            }
        }
        updateDrawingObjects(updates)
        setDrawingDefault('cornerRadius', value)
    }, [selectedDrawingIds, drawingObjects, updateDrawingObjects, setDrawingDefault])

    // Text change — single object only (no batch for text content)
    const handleTextChange = useCallback((value) => {
        if (selectedDrawingIds.length === 1) {
            const obj = drawingObjects[selectedDrawingIds[0]]
            if (obj?.type === 'dimension') {
                updateDrawingObject(selectedDrawingIds[0], { label: value })
            } else {
                updateDrawingObject(selectedDrawingIds[0], { text: value })
            }
        }
    }, [selectedDrawingIds, drawingObjects, updateDrawingObject])

    if (selectedObjects.length === 0) return null

    // First selected object provides display values
    const first = selectedObjects[0]

    // Selection header text
    const selectionLabel = selectedObjects.length === 1
        ? `1 ${TYPE_LABELS[first.type] ?? first.type} selected`
        : `${selectedObjects.length} objects selected`

    const showShape = allAreRoundedRect || allAreStar

    return (
        <Section title="Drawing Properties" icon={<Settings2 size={16} />} defaultOpen={false}>
            {/* Selection header */}
            <div className="text-[10px] font-medium px-1" style={{ color: 'var(--ui-text-secondary)' }}>
                {selectionLabel}
            </div>

            {/* Stroke section */}
            {allHaveStroke && (
                <>
                    <SubSectionLabel>Stroke</SubSectionLabel>
                    <div className="space-y-1.5">
                        <ColorPicker
                            label="Color"
                            value={first.strokeColor ?? '#000000'}
                            onChange={(v) => handleChange('strokeColor', v)}
                        />
                        <SliderInput
                            label="Width"
                            value={first.strokeWidth ?? 2}
                            onChange={(v) => handleChange('strokeWidth', v)}
                            min={0.5}
                            max={10}
                            step={0.5}
                        />
                        <div className="flex items-center gap-2">
                            <span className="text-xs w-20 flex-shrink-0" style={{ color: 'var(--ui-text-muted)' }}>Line Type</span>
                            <select
                                value={first.lineType ?? 'solid'}
                                onChange={(e) => handleChange('lineType', e.target.value)}
                                className="flex-1 text-xs rounded px-1 py-0.5"
                                style={selectStyle}
                            >
                                <option value="solid">Solid</option>
                                <option value="dashed">Dashed</option>
                            </select>
                        </div>
                        {allAreArrow && (
                            <div className="flex items-center gap-2">
                                <span className="text-xs w-20 flex-shrink-0" style={{ color: 'var(--ui-text-muted)' }}>Arrowhead</span>
                                <select
                                    value={first.arrowHead ?? 'end'}
                                    onChange={(e) => handleChange('arrowHead', e.target.value)}
                                    className="flex-1 text-xs rounded px-1 py-0.5"
                                    style={selectStyle}
                                >
                                    <option value="none">None</option>
                                    <option value="start">Start</option>
                                    <option value="end">End</option>
                                    <option value="both">Both</option>
                                </select>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Fill section */}
            {allHaveFill && (
                <>
                    <SubSectionLabel>Fill</SubSectionLabel>
                    <div className="space-y-1.5">
                        <ColorPicker
                            label="Color"
                            value={first.fillColor ?? '#cccccc'}
                            onChange={(v) => handleChange('fillColor', v)}
                        />
                        <SliderInput
                            label="Opacity"
                            value={first.fillOpacity ?? 0.3}
                            onChange={(v) => handleChange('fillOpacity', v)}
                            min={0}
                            max={1}
                            step={0.05}
                        />
                    </div>
                </>
            )}

            {/* Text section */}
            {allAreText && (
                <>
                    <SubSectionLabel>Text</SubSectionLabel>
                    <div className="space-y-1.5">
                        {selectedObjects.length === 1 && (
                            <div className="flex items-center gap-2">
                                <span className="text-xs w-20 flex-shrink-0" style={{ color: 'var(--ui-text-muted)' }}>{first.type === 'dimension' ? 'Label' : 'Content'}</span>
                                <input
                                    type="text"
                                    value={first.type === 'dimension' ? (first.label ?? '') : (first.text ?? '')}
                                    onChange={(e) => handleTextChange(e.target.value)}
                                    className="flex-1 text-xs rounded px-1 py-0.5"
                                    style={selectStyle}
                                />
                            </div>
                        )}
                        <ColorPicker
                            label="Color"
                            value={first.textColor ?? '#000000'}
                            onChange={(v) => handleChange('textColor', v)}
                        />
                        <SliderInput
                            label="Font Size"
                            value={first.fontSize ?? 3}
                            onChange={(v) => handleChange('fontSize', v)}
                            min={0.5}
                            max={20}
                            step={0.5}
                        />
                        <div className="flex items-center gap-2">
                            <span className="text-xs w-20 flex-shrink-0" style={{ color: 'var(--ui-text-muted)' }}>Font</span>
                            <select
                                value={first.fontFamily ?? ''}
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
                        {allAreTextOutline && (
                            <>
                                <SliderInput
                                    label="Outline W"
                                    value={first.outlineWidth ?? 0.1}
                                    onChange={(v) => handleChange('outlineWidth', v)}
                                    min={0}
                                    max={1}
                                    step={0.05}
                                />
                                <ColorPicker
                                    label="Outline"
                                    value={first.outlineColor ?? '#ffffff'}
                                    onChange={(v) => handleChange('outlineColor', v)}
                                />
                            </>
                        )}
                    </div>
                </>
            )}

            {/* Shape-specific section */}
            {showShape && (
                <>
                    <SubSectionLabel>Shape</SubSectionLabel>
                    <div className="space-y-1.5">
                        {allAreRoundedRect && (
                            <SliderInput
                                label="Corner R"
                                value={first.cornerRadius ?? 0}
                                onChange={handleCornerRadiusChange}
                                min={0}
                                max={50}
                                step={0.5}
                            />
                        )}
                        {allAreStar && (
                            <SliderInput
                                label="Points"
                                value={first.numPoints ?? 5}
                                onChange={(v) => handleChange('numPoints', v)}
                                min={3}
                                max={20}
                                step={1}
                            />
                        )}
                    </div>
                </>
            )}

            {/* Opacity — always shown */}
            <SubSectionLabel>Opacity</SubSectionLabel>
            <SliderInput
                label="Opacity"
                value={first.opacity ?? 1}
                onChange={(v) => handleChange('opacity', v)}
                min={0}
                max={1}
                step={0.05}
            />
        </Section>
    )
}

export default DrawingPropertiesPanel
