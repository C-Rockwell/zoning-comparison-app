import { useState, useEffect } from 'react'
import { X, Trash2 } from 'lucide-react'
import { listDrawingPresets, loadDrawingPreset, deleteDrawingPreset } from '../../services/api'

const DrawingLibraryModal = ({ onClose, onLoadPreset }) => {
    const [presets, setPresets] = useState([])
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const fetchPresets = async () => {
            setLoading(true)
            try {
                const data = await listDrawingPresets()
                setPresets(data)
            } catch (err) {
                console.error('Failed to load drawing presets:', err)
                setPresets([])
            }
            setLoading(false)
        }
        fetchPresets()
    }, [])

    const handleLoad = async (preset) => {
        try {
            const data = await loadDrawingPreset(preset.filename)
            onLoadPreset(data)
            onClose()
        } catch (err) {
            console.error('Failed to load drawing preset:', err)
            alert('Failed to load preset: ' + err.message)
        }
    }

    const handleDelete = async (preset, e) => {
        e.stopPropagation()
        try {
            await deleteDrawingPreset(preset.filename)
            setPresets(prev => prev.filter(p => p.filename !== preset.filename))
        } catch (err) {
            console.error('Failed to delete drawing preset:', err)
        }
    }

    const filtered = presets.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.layerName && p.layerName.toLowerCase().includes(search.toLowerCase()))
    )

    return (
        <div
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={onClose}
        >
            <div
                className="rounded-lg p-4 w-80 max-h-96 flex flex-col"
                style={{ backgroundColor: 'var(--ui-bg-primary)', border: '1px solid var(--ui-border)' }}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold" style={{ color: 'var(--ui-text-primary)' }}>Drawing Layer Library</span>
                    <button onClick={onClose} className="p-1 rounded hover-bg-secondary" style={{ color: 'var(--ui-text-muted)' }}>
                        <X size={14} />
                    </button>
                </div>
                <input
                    type="text"
                    placeholder="Search presets..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full text-xs px-2 py-1.5 rounded mb-2"
                    style={{ backgroundColor: 'var(--ui-bg-secondary)', color: 'var(--ui-text-primary)', border: '1px solid var(--ui-border)' }}
                    autoFocus
                />
                <div className="flex-1 overflow-y-auto space-y-1">
                    {loading && (
                        <div className="text-xs text-center py-4" style={{ color: 'var(--ui-text-muted)' }}>Loading...</div>
                    )}
                    {!loading && filtered.length === 0 && (
                        <div className="text-xs text-center py-4" style={{ color: 'var(--ui-text-muted)' }}>
                            {presets.length === 0 ? 'No presets saved yet.' : 'No matches.'}
                        </div>
                    )}
                    {filtered.map(preset => (
                        <div
                            key={preset.filename}
                            className="flex items-center justify-between px-2 py-1.5 rounded cursor-pointer hover-bg-secondary"
                            style={{ border: '1px solid var(--ui-border)' }}
                            onClick={() => handleLoad(preset)}
                        >
                            <div className="flex flex-col min-w-0">
                                <span className="text-xs truncate" style={{ color: 'var(--ui-text-primary)' }}>{preset.name}</span>
                                {preset.layerName && preset.layerName !== preset.name && (
                                    <span className="text-[10px] truncate" style={{ color: 'var(--ui-text-muted)' }}>Layer: {preset.layerName}</span>
                                )}
                            </div>
                            <button
                                onClick={(e) => handleDelete(preset, e)}
                                className="p-0.5 rounded hover-bg-secondary flex-shrink-0 ml-2"
                                style={{ color: 'var(--ui-text-muted)' }}
                                title="Delete preset"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default DrawingLibraryModal
