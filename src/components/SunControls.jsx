import React, { useState, useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import { useSunPosition, presetLocations } from '../hooks/useSunPosition'
import { Sun, Moon, Play, Pause, MapPin, ChevronDown, ChevronUp } from 'lucide-react'

const SunControls = () => {
    const sunSettings = useStore((state) => state.sunSettings)
    const setSunSetting = useStore((state) => state.setSunSetting)
    const toggleSun = useStore((state) => state.toggleSun)
    const toggleSunAnimation = useStore((state) => state.toggleSunAnimation)

    const [isPanelOpen, setIsPanelOpen] = useState(false)
    const [showPresets, setShowPresets] = useState(false)
    const animationRef = useRef(null)

    const { enabled, latitude, longitude, date, time, animating, intensity, shadowsEnabled } = sunSettings

    // Get computed sun position
    const sunData = useSunPosition(latitude, longitude, date, time)

    // Animation loop for time-of-day
    useEffect(() => {
        if (animating && enabled) {
            let lastTime = performance.now()
            const animate = (currentTime) => {
                const delta = (currentTime - lastTime) / 1000 // seconds
                lastTime = currentTime

                // Get current time from store and update
                const currentSunTime = useStore.getState().sunSettings.time
                let newTime = currentSunTime + delta * 0.5 // 0.5 hours per second
                if (newTime >= 24) newTime = 0
                setSunSetting('time', newTime)

                animationRef.current = requestAnimationFrame(animate)
            }
            animationRef.current = requestAnimationFrame(animate)
        }

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
        }
    }, [animating, enabled, setSunSetting])

    const formatTimeDisplay = (hour) => {
        const h = Math.floor(hour)
        const m = Math.floor((hour % 1) * 60)
        const ampm = h >= 12 ? 'PM' : 'AM'
        const displayHour = h % 12 || 12
        return `${displayHour}:${m.toString().padStart(2, '0')} ${ampm}`
    }

    const handlePresetSelect = (preset) => {
        setSunSetting('latitude', preset.latitude)
        setSunSetting('longitude', preset.longitude)
        setShowPresets(false)
    }

    return (
        <>
            {/* Toggle Button */}
            <button
                onClick={() => setIsPanelOpen(!isPanelOpen)}
                className={`absolute top-32 right-4 z-20 p-2 rounded-lg shadow-lg border transition-colors ${
                    enabled
                        ? 'bg-yellow-600 text-white border-yellow-500'
                        : isPanelOpen
                            ? 'bg-blue-600 text-white border-blue-500'
                            : 'bg-gray-900/90 text-gray-400 hover:text-white border-gray-700'
                }`}
                title="Sun Simulation"
            >
                {enabled && sunData.isAboveHorizon ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Panel */}
            {isPanelOpen && (
                <div className="absolute top-32 right-16 z-20 w-72 bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
                    {/* Header */}
                    <div className="p-3 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
                        <span className="font-bold text-sm text-white">Sun Simulation</span>
                        <button
                            onClick={toggleSun}
                            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                                enabled
                                    ? 'bg-yellow-600 text-white'
                                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                            }`}
                        >
                            {enabled ? 'ON' : 'OFF'}
                        </button>
                    </div>

                    <div className={`p-3 space-y-4 ${!enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                        {/* Location Section */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Location</label>
                                <button
                                    onClick={() => setShowPresets(!showPresets)}
                                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                                >
                                    <MapPin size={12} />
                                    Presets
                                    {showPresets ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                </button>
                            </div>

                            {/* Preset Dropdown */}
                            {showPresets && (
                                <div className="bg-gray-800 rounded border border-gray-700 max-h-40 overflow-y-auto">
                                    {presetLocations.map((preset) => (
                                        <button
                                            key={preset.name}
                                            onClick={() => handlePresetSelect(preset)}
                                            className="w-full text-left px-2 py-1.5 text-xs text-gray-300 hover:bg-gray-700 transition-colors"
                                        >
                                            {preset.name}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Lat/Long Inputs */}
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] text-gray-500 block mb-1">Latitude</label>
                                    <input
                                        type="number"
                                        value={latitude}
                                        onChange={(e) => setSunSetting('latitude', parseFloat(e.target.value) || 0)}
                                        step="0.0001"
                                        min="-90"
                                        max="90"
                                        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-500 block mb-1">Longitude</label>
                                    <input
                                        type="number"
                                        value={longitude}
                                        onChange={(e) => setSunSetting('longitude', parseFloat(e.target.value) || 0)}
                                        step="0.0001"
                                        min="-180"
                                        max="180"
                                        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Date & Time Section */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Date & Time</label>

                            <div className="flex gap-2">
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setSunSetting('date', e.target.value)}
                                    className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white"
                                />
                            </div>

                            {/* Time Slider */}
                            <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-gray-400">Time of Day</span>
                                    <span className="text-xs font-mono text-white">{formatTimeDisplay(time)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="range"
                                        min="0"
                                        max="24"
                                        step="0.25"
                                        value={time}
                                        onChange={(e) => setSunSetting('time', parseFloat(e.target.value))}
                                        className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                                    />
                                    <button
                                        onClick={toggleSunAnimation}
                                        className={`p-1.5 rounded ${
                                            animating ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'
                                        }`}
                                        title={animating ? 'Pause Animation' : 'Play Animation'}
                                    >
                                        {animating ? <Pause size={14} /> : <Play size={14} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Sun Info Display */}
                        <div className="bg-gray-800 rounded p-2 space-y-1">
                            <div className="flex justify-between text-[10px]">
                                <span className="text-gray-500">Sunrise</span>
                                <span className="text-orange-400 font-mono">{sunData.sunriseTime}</span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                                <span className="text-gray-500">Sunset</span>
                                <span className="text-purple-400 font-mono">{sunData.sunsetTime}</span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                                <span className="text-gray-500">Altitude</span>
                                <span className={`font-mono ${sunData.isAboveHorizon ? 'text-yellow-400' : 'text-gray-500'}`}>
                                    {sunData.altitudeDegrees.toFixed(1)}°
                                </span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                                <span className="text-gray-500">Azimuth</span>
                                <span className="text-blue-400 font-mono">{sunData.azimuthDegrees.toFixed(1)}°</span>
                            </div>
                        </div>

                        {/* Light Settings */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Light Settings</label>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-400">Intensity</span>
                                    <span className="text-xs font-mono text-white">{intensity.toFixed(1)}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="3"
                                    step="0.1"
                                    value={intensity}
                                    onChange={(e) => setSunSetting('intensity', parseFloat(e.target.value))}
                                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400">Shadows</span>
                                <button
                                    onClick={() => setSunSetting('shadowsEnabled', !shadowsEnabled)}
                                    className={`px-2 py-1 rounded text-[10px] font-bold ${
                                        shadowsEnabled
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-700 text-gray-400'
                                    }`}
                                >
                                    {shadowsEnabled ? 'ON' : 'OFF'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default SunControls
