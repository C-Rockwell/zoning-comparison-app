import ColorPicker from './ColorPicker'
import SliderInput from './SliderInput'

const LINE_TYPE_PRESETS = {
    solid:           { dashed: false },
    dashed:          { dashed: true, dashSize: 3,   gapSize: 2,   dashScale: 1 },
    dotted:          { dashed: true, dashSize: 0.5, gapSize: 2,   dashScale: 1 },
    'dash-dot':      { dashed: true, dashSize: 3,   gapSize: 1.5, dashScale: 1 },
    'dash-dot-dot':  { dashed: true, dashSize: 3,   gapSize: 1,   dashScale: 1 },
}

const LINE_TYPE_OPTIONS = [
    { value: 'solid', label: 'Solid' },
    { value: 'dashed', label: 'Dashed' },
    { value: 'dotted', label: 'Dotted' },
    { value: 'dash-dot', label: 'Dash-Dot' },
    { value: 'dash-dot-dot', label: 'Dash-Dot-Dot' },
    { value: 'custom', label: 'Custom' },
]

function detectLineType(style) {
    if (!style.dashed) return 'solid'
    const ds = style.dashSize
    const gs = style.gapSize
    for (const [key, preset] of Object.entries(LINE_TYPE_PRESETS)) {
        if (key === 'solid') continue
        if (preset.dashSize === ds && preset.gapSize === gs) return key
    }
    return 'custom'
}

/**
 * Controls for line style properties: color, width, opacity, and line type dropdown.
 *
 * @param {object} style - Current style object with { color, width, opacity, dashed, dashSize, gapSize, dashScale? }
 * @param {function} onChange - Callback: (property, value) => void
 * @param {boolean} showDash - Whether to show line type controls (default: true)
 */
const LineStyleSelector = ({ style, onChange, showDash = true }) => {
    const lineType = detectLineType(style)

    const handleLineTypeChange = (type) => {
        if (type === 'custom') {
            onChange('dashed', true)
            onChange('dashSize', style.dashSize ?? 3)
            onChange('gapSize', style.gapSize ?? 2)
            onChange('dashScale', style.dashScale ?? 1)
        } else {
            const preset = LINE_TYPE_PRESETS[type]
            onChange('dashed', preset.dashed)
            if (preset.dashed) {
                onChange('dashSize', preset.dashSize)
                onChange('gapSize', preset.gapSize)
                onChange('dashScale', preset.dashScale)
            }
        }
    }

    return (
        <div className="space-y-1">
            <ColorPicker
                label="Color"
                value={style.color}
                onChange={(v) => onChange('color', v)}
            />
            <SliderInput
                label="Width"
                value={style.width}
                onChange={(v) => onChange('width', v)}
                min={0.5}
                max={15}
                step={0.5}
                unit="px"
            />
            <SliderInput
                label="Opacity"
                value={style.opacity}
                onChange={(v) => onChange('opacity', v)}
                min={0}
                max={1}
                step={0.05}
            />
            {showDash && (
                <>
                    <div className="flex items-center gap-2">
                        <span className="text-xs shrink-0" style={{ color: 'var(--ui-text-muted)', minWidth: '60px' }}>Line Type</span>
                        <select
                            value={lineType}
                            onChange={(e) => handleLineTypeChange(e.target.value)}
                            className="flex-1 text-xs rounded px-1 py-0.5"
                            style={{
                                backgroundColor: 'var(--ui-bg)',
                                color: 'var(--ui-text)',
                                borderWidth: '1px',
                                borderStyle: 'solid',
                                borderColor: 'var(--ui-border)',
                            }}
                        >
                            {LINE_TYPE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    {lineType === 'custom' && (
                        <>
                            <SliderInput
                                label="Dash Size"
                                value={style.dashSize ?? 3}
                                onChange={(v) => onChange('dashSize', v)}
                                min={0.5}
                                max={20}
                                step={0.5}
                                unit="ft"
                            />
                            <SliderInput
                                label="Gap Size"
                                value={style.gapSize ?? 2}
                                onChange={(v) => onChange('gapSize', v)}
                                min={0.5}
                                max={20}
                                step={0.5}
                                unit="ft"
                            />
                            <SliderInput
                                label="Dash Scale"
                                value={style.dashScale ?? 1}
                                onChange={(v) => onChange('dashScale', v)}
                                min={0.1}
                                max={5}
                                step={0.1}
                            />
                        </>
                    )}
                </>
            )}
        </div>
    )
}

export default LineStyleSelector
