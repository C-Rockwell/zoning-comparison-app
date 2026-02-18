import { useState, useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import { Sun } from 'lucide-react'

const SunControls = () => {
    const sunSettings = useStore((state) => state.sunSettings)
    const setSunSetting = useStore((state) => state.setSunSetting)
    const toggleSun = useStore((state) => state.toggleSun)

    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef(null)

    const { enabled, azimuth, altitude, intensity, shadowsEnabled } = sunSettings

    // Close dropdown when clicking outside
    useEffect(() => {
        if (!isOpen) return
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen])

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors hover-bg-primary"
                style={{
                    backgroundColor: enabled ? 'var(--ui-accent)' : 'var(--ui-bg-secondary)',
                    color: enabled ? '#fff' : 'var(--ui-text-secondary)',
                }}
            >
                <Sun size={14} />
                Sun
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div
                    className="absolute top-full left-0 mt-1 w-56 rounded shadow-lg z-50"
                    style={{ backgroundColor: 'var(--ui-bg-secondary)', border: '1px solid var(--ui-border)' }}
                >
                    {/* Header with ON/OFF */}
                    <div className="flex items-center justify-between p-2.5" style={{ borderBottom: '1px solid var(--ui-border)' }}>
                        <span className="text-xs font-bold" style={{ color: 'var(--ui-text-primary)' }}>Sun Settings</span>
                        <button
                            onClick={toggleSun}
                            className="px-2.5 py-0.5 rounded text-[10px] font-bold transition-colors"
                            style={{
                                backgroundColor: enabled ? 'var(--ui-accent)' : 'var(--ui-bg-tertiary)',
                                color: enabled ? '#fff' : 'var(--ui-text-muted)',
                            }}
                        >
                            {enabled ? 'ON' : 'OFF'}
                        </button>
                    </div>

                    <div className={`p-2.5 space-y-3 ${!enabled ? 'opacity-40 pointer-events-none' : ''}`}>
                        {/* Rotation (Azimuth) */}
                        <div className="space-y-1">
                            <div className="flex justify-between items-center">
                                <span className="text-[11px]" style={{ color: 'var(--ui-text-secondary)' }}>Rotation</span>
                                <span className="text-[11px] font-mono" style={{ color: 'var(--ui-text-primary)' }}>{Math.round(azimuth ?? 45)}°</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="360"
                                step="1"
                                value={azimuth ?? 45}
                                onChange={(e) => setSunSetting('azimuth', parseFloat(e.target.value))}
                                className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-theme"
                                style={{ backgroundColor: 'var(--ui-bg-tertiary)' }}
                            />
                        </div>

                        {/* Angle (Altitude) */}
                        <div className="space-y-1">
                            <div className="flex justify-between items-center">
                                <span className="text-[11px]" style={{ color: 'var(--ui-text-secondary)' }}>Angle</span>
                                <span className="text-[11px] font-mono" style={{ color: 'var(--ui-text-primary)' }}>{Math.round(altitude ?? 45)}°</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="90"
                                step="1"
                                value={altitude ?? 45}
                                onChange={(e) => setSunSetting('altitude', parseFloat(e.target.value))}
                                className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-theme"
                                style={{ backgroundColor: 'var(--ui-bg-tertiary)' }}
                            />
                        </div>

                        {/* Intensity */}
                        <div className="space-y-1">
                            <div className="flex justify-between items-center">
                                <span className="text-[11px]" style={{ color: 'var(--ui-text-secondary)' }}>Intensity</span>
                                <span className="text-[11px] font-mono" style={{ color: 'var(--ui-text-primary)' }}>{(intensity ?? 1.5).toFixed(1)}</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="3"
                                step="0.1"
                                value={intensity ?? 1.5}
                                onChange={(e) => setSunSetting('intensity', parseFloat(e.target.value))}
                                className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-theme"
                                style={{ backgroundColor: 'var(--ui-bg-tertiary)' }}
                            />
                        </div>

                        {/* Shadows Toggle */}
                        <div className="flex items-center justify-between">
                            <span className="text-[11px]" style={{ color: 'var(--ui-text-secondary)' }}>Shadows</span>
                            <button
                                onClick={() => setSunSetting('shadowsEnabled', !shadowsEnabled)}
                                className="px-2 py-0.5 rounded text-[10px] font-bold transition-colors"
                                style={{
                                    backgroundColor: shadowsEnabled ? 'var(--ui-accent)' : 'var(--ui-bg-tertiary)',
                                    color: shadowsEnabled ? '#fff' : 'var(--ui-text-muted)',
                                }}
                            >
                                {shadowsEnabled ? 'ON' : 'OFF'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default SunControls
