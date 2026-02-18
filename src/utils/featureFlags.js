const TRUTHY_VALUES = new Set(['1', 'true', 'on', 'yes'])

const isTruthyFlag = (value) => {
    if (value == null) return false
    return TRUTHY_VALUES.has(String(value).toLowerCase())
}

const getQueryFlag = (key) => {
    if (typeof window === 'undefined') return false
    const value = new URLSearchParams(window.location.search).get(key)
    return isTruthyFlag(value)
}

export const isExperimentalMoveModeEnabled = () => {
    const envEnabled = isTruthyFlag(import.meta.env.VITE_EXPERIMENTAL_MOVE_MODE)
    const queryEnabled = getQueryFlag('expMove')
    return envEnabled || queryEnabled
}

