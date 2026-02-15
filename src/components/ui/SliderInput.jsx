/**
 * Combined range slider + number input control.
 * Extracted from ParameterPanel.jsx and StyleEditor.jsx slider patterns.
 *
 * @param {string} label - Optional text label displayed to the left
 * @param {number|null} value - Current numeric value (null renders empty)
 * @param {function} onChange - Callback with new numeric value (or null if cleared)
 * @param {number} min - Minimum value (default: 0)
 * @param {number} max - Maximum value (default: 100)
 * @param {number} step - Step increment (default: 1)
 * @param {string} unit - Optional unit suffix (e.g. 'ft', 'px', '%')
 */
const SliderInput = ({ label, value, onChange, min = 0, max = 100, step = 1, unit = '' }) => (
    <div className="flex items-center gap-2">
        {label && <span className="text-xs w-20 flex-shrink-0" style={{ color: 'var(--ui-text-muted)' }}>{label}</span>}
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value ?? min}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="flex-1 h-1 appearance-none rounded cursor-pointer accent-theme"
            style={{ backgroundColor: 'var(--ui-border)' }}
        />
        <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
            className="w-16 text-xs text-right rounded px-1 py-0.5 focus-ring-accent-1"
            style={{ backgroundColor: 'var(--ui-bg-secondary)', borderColor: 'var(--ui-border)', color: 'var(--ui-text-primary)', border: '1px solid var(--ui-border)' }}
        />
        {unit && <span className="text-xs" style={{ color: 'var(--ui-text-secondary)' }}>{unit}</span>}
    </div>
)

export default SliderInput
