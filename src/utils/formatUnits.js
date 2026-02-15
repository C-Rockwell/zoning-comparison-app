/**
 * Format a dimension value for display.
 * @param {number} value - The value in feet
 * @param {string} format - 'feet' | 'feet-inches' | 'meters'
 * @returns {string}
 */
export const formatDimension = (value, format = 'feet') => {
    if (value == null || isNaN(value)) return ''

    switch (format) {
        case 'feet-inches': {
            const feet = Math.floor(Math.abs(value))
            const inches = Math.round((Math.abs(value) - feet) * 12)
            const sign = value < 0 ? '-' : ''
            if (inches === 12) return `${sign}${feet + 1}'-0"`
            return `${sign}${feet}'-${inches}"`
        }
        case 'meters': {
            const meters = value * 0.3048
            return `${meters.toFixed(2)} m`
        }
        case 'feet':
        default:
            return `${value}'`
    }
}

/**
 * Format an angle value for display.
 * @param {number} degrees
 * @returns {string}
 */
export const formatAngle = (degrees) => {
    if (degrees == null || isNaN(degrees)) return ''
    return `${degrees.toFixed(1)}\u00B0`
}
