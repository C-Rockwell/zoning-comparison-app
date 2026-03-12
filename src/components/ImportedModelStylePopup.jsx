import { useStore } from '../store/useStore'
import { useLotIds } from '../hooks/useEntityStore'
import ColorPicker from './ui/ColorPicker'
import SliderInput from './ui/SliderInput'
import { X, Trash2, Lock, Unlock } from 'lucide-react'

const ImportedModelStylePopup = () => {
    const selectedImportedModel = useStore((s) => s.selectedImportedModel)
    const lots = useStore((s) => s.entities?.lots ?? {})
    const entityStyles = useStore((s) => s.entityStyles ?? {})
    const lotIds = useLotIds()
    const setImportedModelName = useStore((s) => s.setImportedModelName)
    const setImportedModelUnits = useStore((s) => s.setImportedModelUnits)
    const setImportedModelStyle = useStore((s) => s.setImportedModelStyle)
    const removeImportedModel = useStore((s) => s.removeImportedModel)
    const deselectImportedModel = useStore((s) => s.deselectImportedModel)
    const toggleImportedModelLocked = useStore((s) => s.toggleImportedModelLocked)

    if (!selectedImportedModel) return null

    const { lotId, modelId } = selectedImportedModel
    const lot = lots[lotId]
    const model = lot?.importedModels?.[modelId]
    if (!model) return null

    const lotIndex = lotIds.indexOf(lotId)
    const lotStyle = entityStyles[lotId] ?? {}
    const modelStyle = model.style

    const faceColor = modelStyle?.faces?.color ?? lotStyle.importedModelFaces?.color ?? '#D5D5D5'
    const faceOpacity = modelStyle?.faces?.opacity ?? lotStyle.importedModelFaces?.opacity ?? 1.0
    const edgeColor = modelStyle?.edges?.color ?? lotStyle.importedModelEdges?.color ?? '#000000'
    const edgeWidth = modelStyle?.edges?.width ?? lotStyle.importedModelEdges?.width ?? 1.5
    const edgeOpacity = modelStyle?.edges?.opacity ?? lotStyle.importedModelEdges?.opacity ?? 1.0
    const edgeVisible = modelStyle?.edges?.visible ?? lotStyle.importedModelEdges?.visible ?? true

    return (
        <div
            className="absolute top-20 right-4 z-10 w-56 rounded-lg shadow-xl border"
            style={{
                background: 'var(--ui-bg)',
                borderColor: 'var(--ui-border)',
                color: 'var(--ui-text)',
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--ui-border)' }}>
                <span className="text-xs font-semibold" style={{ color: 'var(--ui-text-muted)' }}>
                    Lot {lotIndex + 1} Model
                </span>
                <button
                    onClick={deselectImportedModel}
                    className="p-0.5 rounded hover:bg-gray-500/20"
                    style={{ color: 'var(--ui-text-muted)' }}
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>

            <div className="p-3 space-y-2.5">
                {/* Model name + lock */}
                <div>
                    <label className="text-[10px] block mb-0.5" style={{ color: 'var(--ui-text-muted)' }}>Name</label>
                    <div className="flex items-center gap-1">
                        <input
                            type="text"
                            defaultValue={model.name ?? model.filename?.replace(/\.ifc$/i, '') ?? 'Imported Model'}
                            onBlur={(e) => setImportedModelName(lotId, modelId, e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur() }}
                            className="flex-1 text-xs rounded px-2 py-1"
                            style={{ background: 'var(--ui-input-bg)', color: 'var(--ui-text)', border: '1px solid var(--ui-border)' }}
                        />
                        <button
                            onClick={() => toggleImportedModelLocked(lotId, modelId)}
                            className="p-1 rounded hover:bg-amber-500/20 shrink-0"
                            style={{ color: (model.locked ?? false) ? '#f59e0b' : 'var(--ui-text-muted)' }}
                            title={(model.locked ?? false) ? 'Unlock model' : 'Lock model'}
                        >
                            {(model.locked ?? false) ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>
                    </div>
                </div>

                {/* Units */}
                <div>
                    <label className="text-[10px] block mb-0.5" style={{ color: 'var(--ui-text-muted)' }}>Units</label>
                    <select
                        value={model.units ?? 'auto'}
                        onChange={(e) => setImportedModelUnits(lotId, modelId, e.target.value)}
                        className="w-full text-xs rounded px-2 py-1"
                        style={{ background: 'var(--ui-input-bg)', color: 'var(--ui-text)', border: '1px solid var(--ui-border)' }}
                    >
                        <option value="auto">Auto</option>
                        <option value="meters">Meters</option>
                        <option value="feet">Feet</option>
                    </select>
                </div>

                {/* Face styles */}
                <div className="space-y-1.5">
                    <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--ui-text-muted)' }}>Faces</span>
                    <div className="flex items-center justify-between">
                        <label className="text-[10px]" style={{ color: 'var(--ui-text-secondary)' }}>Color</label>
                        <ColorPicker value={faceColor} onChange={(c) => setImportedModelStyle(lotId, modelId, 'faces', 'color', c)} />
                    </div>
                    <div className="flex items-center justify-between">
                        <label className="text-[10px]" style={{ color: 'var(--ui-text-secondary)' }}>Opacity</label>
                        <SliderInput value={faceOpacity} onChange={(v) => setImportedModelStyle(lotId, modelId, 'faces', 'opacity', v)} min={0} max={1} step={0.05} />
                    </div>
                </div>

                {/* Edge styles */}
                <div className="space-y-1.5">
                    <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--ui-text-muted)' }}>Edges</span>
                    <div className="flex items-center justify-between">
                        <label className="text-[10px]" style={{ color: 'var(--ui-text-secondary)' }}>Visible</label>
                        <input
                            type="checkbox"
                            checked={edgeVisible}
                            onChange={(e) => setImportedModelStyle(lotId, modelId, 'edges', 'visible', e.target.checked)}
                            className="w-3 h-3"
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <label className="text-[10px]" style={{ color: 'var(--ui-text-secondary)' }}>Color</label>
                        <ColorPicker value={edgeColor} onChange={(c) => setImportedModelStyle(lotId, modelId, 'edges', 'color', c)} />
                    </div>
                    <div className="flex items-center justify-between">
                        <label className="text-[10px]" style={{ color: 'var(--ui-text-secondary)' }}>Width</label>
                        <SliderInput value={edgeWidth} onChange={(v) => setImportedModelStyle(lotId, modelId, 'edges', 'width', v)} min={0.5} max={5} step={0.5} />
                    </div>
                    <div className="flex items-center justify-between">
                        <label className="text-[10px]" style={{ color: 'var(--ui-text-secondary)' }}>Opacity</label>
                        <SliderInput value={edgeOpacity} onChange={(v) => setImportedModelStyle(lotId, modelId, 'edges', 'opacity', v)} min={0} max={1} step={0.05} />
                    </div>
                </div>

                {/* Delete button */}
                <button
                    onClick={() => {
                        if (window.confirm('Delete this imported model?')) {
                            removeImportedModel(lotId, modelId)
                        }
                    }}
                    className="w-full text-xs py-1.5 px-2 rounded flex items-center justify-center gap-1 mt-1"
                    style={{
                        background: 'var(--ui-input-bg)',
                        color: '#ef4444',
                        border: '1px solid var(--ui-border)',
                    }}
                >
                    <Trash2 className="w-3 h-3" />
                    Delete Model
                </button>
            </div>
        </div>
    )
}

export default ImportedModelStylePopup
