import { useState, useMemo, useCallback } from 'react'
import { useStore } from '../store/useStore'
import { X, Download, Layers } from 'lucide-react'
import { CAMERA_VIEWS, RESOLUTION_PRESETS } from './DistrictParameterPanel'

const MassExportModal = ({ isOpen, onClose, scenarios }) => {
    const savedViews = useStore((s) => s.savedViews ?? {})
    const massExportActive = useStore((s) => s.massExportActive)
    const massExportProgress = useStore((s) => s.massExportProgress)
    const startMassExport = useStore((s) => s.startMassExport)
    const cancelMassExport = useStore((s) => s.cancelMassExport)
    const advanceMassExport = useStore((s) => s.advanceMassExport)

    const [selectedScenarios, setSelectedScenarios] = useState(new Set())
    const [checked, setChecked] = useState({}) // { 'slot-view': true }
    const [format, setFormat] = useState('png')
    const [resolution, setResolution] = useState('1920x1080')

    const populatedSlots = useMemo(() =>
        [1, 2, 3, 4, 5].filter(slot => savedViews[slot] != null),
    [savedViews])

    const scenarioNames = useMemo(() =>
        (scenarios ?? []).map(s => s.name),
    [scenarios])

    const toggleScenario = useCallback((name) => {
        setSelectedScenarios(prev => {
            const next = new Set(prev)
            if (next.has(name)) next.delete(name)
            else next.add(name)
            return next
        })
    }, [])

    const selectAll = useCallback(() => {
        setSelectedScenarios(new Set(scenarioNames))
    }, [scenarioNames])

    const deselectAll = useCallback(() => {
        setSelectedScenarios(new Set())
    }, [])

    const toggleCheck = useCallback((key) => {
        setChecked(prev => ({ ...prev, [key]: !prev[key] }))
    }, [])

    const checkedCount = Object.values(checked).filter(Boolean).length
    const totalImages = selectedScenarios.size * checkedCount
    const totalZips = selectedScenarios.size

    const handleExport = useCallback(() => {
        if (selectedScenarios.size === 0 || checkedCount === 0) return

        // Build selected view slots and camera views from checked state
        const viewSlots = new Set()
        const cameraViews = new Set()
        for (const [key, val] of Object.entries(checked)) {
            if (!val) continue
            const [slot, cam] = key.split('-')
            viewSlots.add(Number(slot))
            cameraViews.add(cam)
        }

        const plan = {
            scenarios: [...selectedScenarios].map(name => ({ name })),
            viewSlots: [...viewSlots].sort((a, b) => a - b),
            cameraViews: [...cameraViews],
            format,
            resolution,
        }

        startMassExport(plan)
        // Kick off first scenario
        setTimeout(() => {
            useStore.getState().advanceMassExport()
        }, 100)
    }, [selectedScenarios, checkedCount, checked, format, resolution, startMassExport])

    const handleCancel = useCallback(() => {
        cancelMassExport()
    }, [cancelMassExport])

    if (!isOpen) return null

    const isExporting = massExportActive
    const progressText = massExportProgress
        ? `Exporting scenario ${Math.max(0, massExportProgress.scenarioIndex) + 1} of ${massExportProgress.scenarioCount}`
        : ''

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div
                className="rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col"
                style={{ backgroundColor: 'var(--ui-bg-primary)', color: 'var(--ui-text-primary)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--ui-border)' }}>
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <Layers className="w-4 h-4" />
                        Mass Export
                    </div>
                    <button onClick={onClose} disabled={isExporting} className="p-1 rounded hover:bg-black/10 disabled:opacity-40">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                    {/* Scenario Selection */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium" style={{ color: 'var(--ui-text-secondary)' }}>Scenarios</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={selectAll}
                                    disabled={isExporting}
                                    className="text-[10px] px-1.5 py-0.5 rounded"
                                    style={{ color: 'var(--ui-accent)' }}
                                >
                                    Select All
                                </button>
                                <button
                                    onClick={deselectAll}
                                    disabled={isExporting}
                                    className="text-[10px] px-1.5 py-0.5 rounded"
                                    style={{ color: 'var(--ui-text-muted)' }}
                                >
                                    Deselect All
                                </button>
                            </div>
                        </div>
                        <div
                            className="max-h-40 overflow-y-auto rounded border p-1.5 space-y-0.5"
                            style={{ borderColor: 'var(--ui-border)', backgroundColor: 'var(--ui-bg-secondary)' }}
                        >
                            {scenarioNames.length === 0 ? (
                                <p className="text-[10px] py-1" style={{ color: 'var(--ui-text-muted)' }}>No scenarios found</p>
                            ) : scenarioNames.map(name => (
                                <label key={name} className="flex items-center gap-2 px-1 py-0.5 rounded cursor-pointer hover:bg-black/5 text-[11px]">
                                    <input
                                        type="checkbox"
                                        checked={selectedScenarios.has(name)}
                                        onChange={() => toggleScenario(name)}
                                        disabled={isExporting}
                                        className="accent-theme"
                                    />
                                    <span className="truncate">{name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* View + Camera Grid */}
                    <div>
                        <span className="text-xs font-medium block mb-1.5" style={{ color: 'var(--ui-text-secondary)' }}>Views & Camera Angles</span>
                        {populatedSlots.length === 0 ? (
                            <p className="text-[10px]" style={{ color: 'var(--ui-text-muted)' }}>
                                Save views in the Views section to enable mass export.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-[10px]">
                                    <thead>
                                        <tr>
                                            <th className="text-left px-1 py-0.5" style={{ color: 'var(--ui-text-muted)' }}>View</th>
                                            {CAMERA_VIEWS.map(v => (
                                                <th key={v.key} className="text-center px-1 py-0.5" style={{ color: 'var(--ui-text-muted)' }}>
                                                    {v.label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {populatedSlots.map(slot => (
                                            <tr key={slot}>
                                                <td className="px-1 py-0.5" style={{ color: 'var(--ui-text-secondary)' }}>
                                                    #{slot}
                                                    <span className="ml-1" style={{ color: 'var(--ui-text-muted)' }}>
                                                        {savedViews[slot]?.cameraView}
                                                    </span>
                                                </td>
                                                {CAMERA_VIEWS.map(v => {
                                                    const key = `${slot}-${v.key}`
                                                    return (
                                                        <td key={v.key} className="text-center px-1 py-0.5">
                                                            <input
                                                                type="checkbox"
                                                                checked={!!checked[key]}
                                                                onChange={() => toggleCheck(key)}
                                                                className="accent-theme"
                                                                disabled={isExporting}
                                                            />
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Format + Resolution */}
                    <div className="flex items-center gap-2">
                        <select
                            value={format}
                            onChange={(e) => setFormat(e.target.value)}
                            className="flex-1 text-[10px] px-1.5 py-1 rounded"
                            style={{
                                backgroundColor: 'var(--ui-bg-tertiary)',
                                color: 'var(--ui-text-primary)',
                                borderWidth: '1px',
                                borderStyle: 'solid',
                                borderColor: 'var(--ui-border)',
                            }}
                            disabled={isExporting}
                        >
                            <option value="png">PNG</option>
                            <option value="jpg">JPG</option>
                        </select>
                        <select
                            value={resolution}
                            onChange={(e) => setResolution(e.target.value)}
                            className="flex-1 text-[10px] px-1.5 py-1 rounded"
                            style={{
                                backgroundColor: 'var(--ui-bg-tertiary)',
                                color: 'var(--ui-text-primary)',
                                borderWidth: '1px',
                                borderStyle: 'solid',
                                borderColor: 'var(--ui-border)',
                            }}
                            disabled={isExporting}
                        >
                            {RESOLUTION_PRESETS.map(r => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Summary */}
                    <div className="text-[10px] text-center py-1" style={{ color: 'var(--ui-text-muted)' }}>
                        {selectedScenarios.size > 0 && checkedCount > 0
                            ? `${totalZips} scenario${totalZips !== 1 ? 's' : ''} × ${checkedCount} view${checkedCount !== 1 ? 's' : ''} = ${totalImages} image${totalImages !== 1 ? 's' : ''} → ${totalZips} ZIP${totalZips !== 1 ? 's' : ''}`
                            : 'Select scenarios and views to export'
                        }
                    </div>

                    {/* Progress */}
                    {isExporting && (
                        <div className="text-xs text-center py-2 font-medium" style={{ color: 'var(--ui-accent)' }}>
                            {progressText}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-4 py-3 border-t" style={{ borderColor: 'var(--ui-border)' }}>
                    {isExporting ? (
                        <button
                            onClick={handleCancel}
                            className="px-3 py-1.5 rounded text-xs font-medium"
                            style={{ backgroundColor: 'var(--ui-bg-tertiary)', color: 'var(--ui-text-primary)' }}
                        >
                            Cancel
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={onClose}
                                className="px-3 py-1.5 rounded text-xs font-medium"
                                style={{ backgroundColor: 'var(--ui-bg-tertiary)', color: 'var(--ui-text-primary)' }}
                            >
                                Close
                            </button>
                            <button
                                onClick={handleExport}
                                disabled={selectedScenarios.size === 0 || checkedCount === 0 || populatedSlots.length === 0}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-opacity disabled:opacity-40"
                                style={{ backgroundColor: 'var(--ui-accent)', color: '#fff' }}
                            >
                                <Download className="w-3.5 h-3.5" />
                                Export {totalZips} ZIP{totalZips !== 1 ? 's' : ''}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default MassExportModal
