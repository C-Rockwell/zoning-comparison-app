import ColorPicker from './ColorPicker'
import SliderInput from './SliderInput'

/**
 * Controls for line style properties: color, width, opacity, and optional dashed toggle.
 * Extracted from StyleEditor.jsx line style patterns.
 *
 * @param {object} style - Current style object with { color, width, opacity, dashed }
 * @param {function} onChange - Callback: (property, value) => void
 * @param {boolean} showDash - Whether to show the dashed checkbox (default: true)
 */
const LineStyleSelector = ({ style, onChange, showDash = true }) => (
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
            max={5}
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
            <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--ui-text-muted)' }}>
                <input
                    type="checkbox"
                    checked={style.dashed || false}
                    onChange={(e) => onChange('dashed', e.target.checked)}
                    className="rounded accent-theme"
                    style={{ borderColor: 'var(--ui-border)' }}
                />
                Dashed
            </label>
        )}
    </div>
)

export default LineStyleSelector
