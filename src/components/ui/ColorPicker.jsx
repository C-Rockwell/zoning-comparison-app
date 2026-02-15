/**
 * Simple color picker input with optional label and hex value display.
 * Extracted from StyleEditor.jsx color picker pattern.
 *
 * @param {string} label - Optional text label displayed to the left
 * @param {string} value - Current hex color value (e.g. '#FF0000')
 * @param {function} onChange - Callback with new hex color string
 * @param {string} className - Optional additional CSS classes for the wrapper
 */
const ColorPicker = ({ label, value, onChange, className }) => (
    <div className={`flex items-center gap-2 ${className || ''}`}>
        {label && <span className="text-xs w-16" style={{ color: 'var(--ui-text-muted)' }}>{label}</span>}
        <div className="relative group">
            <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-6 h-6 rounded cursor-pointer p-0 overflow-hidden"
                style={{ borderColor: 'var(--ui-border)' }}
            />
            <div className="absolute inset-0 ring-1 ring-black/10 rounded pointer-events-none group-hover:ring-black/20" />
        </div>
        <span className="text-xs font-mono" style={{ color: 'var(--ui-text-secondary)' }}>{value}</span>
    </div>
)

export default ColorPicker
