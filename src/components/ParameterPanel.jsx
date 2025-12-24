import { useState } from 'react'
import { useStore } from '../store/useStore'
import Section from './common/Section'

const ParameterPanel = () => {
    const existing = useStore((state) => state.existing)
    const proposed = useStore((state) => state.proposed)
    const updateExisting = useStore((state) => state.updateExisting)
    const updateProposed = useStore((state) => state.updateProposed)

    const layers = useStore((state) => state.viewSettings.layers)
    const labels = useStore((state) => state.viewSettings.labels)
    const toggleLayer = useStore((state) => state.toggleLayer)
    const toggleLabel = useStore((state) => state.toggleLabel)

    const [openSections, setOpenSections] = useState({
        layers: true,
        parameters: true,
        stats: true,
        labels: false
    })

    const toggleSection = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))

    const keys = Object.keys(existing)

    return (
        <div className="bg-gray-900 text-white w-full md:w-96 flex-shrink-0 overflow-y-auto border-r border-gray-700 h-full scrollbar-thin scrollbar-thumb-gray-600">
            <div className="p-2 bg-gray-800 border-b border-gray-700 font-bold text-sm text-white flex justify-between items-center">
                <span>Project Parameters</span>
            </div>

            {/* Layers Section */}
            <Section
                title="Layers"
                isOpen={openSections.layers}
                onToggle={() => toggleSection('layers')}
            >
                <div className="space-y-2">
                    {Object.keys(layers).map(layer => (
                        <label key={layer} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-800/50 p-1 rounded transition-colors">
                            <input
                                type="checkbox"
                                checked={layers[layer]}
                                onChange={() => toggleLayer(layer)}
                                className="form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-blue-500 bg-gray-700 border-gray-500"
                            />
                            <span className="text-sm capitalize text-gray-300">{layer.replace(/([A-Z])/g, ' $1')}</span>
                        </label>
                    ))}
                </div>
            </Section>

            {/* Parameters Section */}
            <Section
                title="Parameters"
                isOpen={openSections.parameters}
                onToggle={() => toggleSection('parameters')}
            >
                <div className="grid grid-cols-3 gap-2 mb-2 font-semibold text-xs text-gray-500 uppercase tracking-wider">
                    <div className="col-span-1">Name</div>
                    <div className="col-span-1 text-center">Existing</div>
                    <div className="col-span-1 text-center">Proposed</div>
                </div>
                <div className="space-y-2">
                    {keys.map((key) => {
                        // Skip internal properties
                        if (key === 'buildingX' || key === 'buildingY') return null;

                        return (
                            <div key={key} className="grid grid-cols-3 gap-2 items-center">
                                <label className="text-xs text-gray-400 capitalize break-words pr-2">
                                    {key.replace(/([A-Z])/g, ' $1').replace('floor Count', 'Stories')}
                                </label>
                                <input
                                    type="number"
                                    value={existing[key]}
                                    onChange={(e) => updateExisting(key, parseFloat(e.target.value) || 0)}
                                    className="bg-gray-800 p-1 rounded text-right text-xs w-full text-gray-200 border border-gray-700 focus:border-blue-500 outline-none"
                                />
                                <input
                                    type="number"
                                    value={proposed[key]}
                                    onChange={(e) => updateProposed(key, parseFloat(e.target.value) || 0)}
                                    className="bg-gray-800 p-1 rounded text-right text-xs w-full text-gray-200 border border-gray-700 focus:border-blue-500 outline-none"
                                />
                            </div>
                        )
                    })}
                </div>
            </Section>

            {/* Stats Section */}
            <Section
                title="Statistics"
                isOpen={openSections.stats}
                onToggle={() => toggleSection('stats')}
            >
                <div className="grid grid-cols-3 gap-2 mb-2 font-semibold text-xs text-gray-500 uppercase tracking-wider">
                    <div className="col-span-1">Metric</div>
                    <div className="col-span-1 text-center">Existing</div>
                    <div className="col-span-1 text-center">Proposed</div>
                </div>
                <div className="space-y-2">
                    {/* Lot Size */}
                    <div className="grid grid-cols-3 gap-2 items-center">
                        <label className="text-xs text-gray-400 capitalize break-words pr-2">
                            Lot Size
                        </label>
                        <div className="bg-gray-800 p-1 rounded text-right text-xs w-full text-gray-200 border border-gray-700">
                            {(existing.lotWidth * existing.lotDepth).toLocaleString()} <span className="text-[9px] text-gray-500">ft²</span>
                        </div>
                        <div className="bg-gray-800 p-1 rounded text-right text-xs w-full text-gray-200 border border-gray-700">
                            {(proposed.lotWidth * proposed.lotDepth).toLocaleString()} <span className="text-[9px] text-gray-500">ft²</span>
                        </div>
                    </div>

                    {/* Building Coverage */}
                    <div className="grid grid-cols-3 gap-2 items-center">
                        <label className="text-xs text-gray-400 capitalize break-words pr-2">
                            Coverage
                        </label>
                        <div className="bg-gray-800 p-1 rounded text-right text-xs w-full text-gray-200 border border-gray-700">
                            {((existing.buildingWidth * existing.buildingDepth) / (existing.lotWidth * existing.lotDepth) * 100).toFixed(1)}%
                        </div>
                        <div className="bg-gray-800 p-1 rounded text-right text-xs w-full text-gray-200 border border-gray-700">
                            {((proposed.buildingWidth * proposed.buildingDepth) / (proposed.lotWidth * proposed.lotDepth) * 100).toFixed(1)}%
                        </div>
                    </div>

                    {/* Total Floor Area */}
                    <div className="grid grid-cols-3 gap-2 items-center">
                        <label className="text-xs text-gray-400 capitalize break-words pr-2">
                            Floor Area
                        </label>
                        <div className="bg-gray-800 p-1 rounded text-right text-xs w-full text-gray-200 border border-gray-700">
                            {((existing.buildingWidth * existing.buildingDepth) * existing.floorCount).toLocaleString()} <span className="text-[9px] text-gray-500">ft²</span>
                        </div>
                        <div className="bg-gray-800 p-1 rounded text-right text-xs w-full text-gray-200 border border-gray-700">
                            {((proposed.buildingWidth * proposed.buildingDepth) * proposed.floorCount).toLocaleString()} <span className="text-[9px] text-gray-500">ft²</span>
                        </div>
                    </div>

                    {/* Floor Area Ratio (FAR) */}
                    <div className="grid grid-cols-3 gap-2 items-center">
                        <label className="text-xs text-gray-400 capitalize break-words pr-2">
                            FAR
                        </label>
                        <div className="bg-gray-800 p-1 rounded text-right text-xs w-full text-gray-200 border border-gray-700">
                            {(((existing.buildingWidth * existing.buildingDepth) * existing.floorCount) / (existing.lotWidth * existing.lotDepth)).toFixed(2)}
                        </div>
                        <div className="bg-gray-800 p-1 rounded text-right text-xs w-full text-gray-200 border border-gray-700">
                            {(((proposed.buildingWidth * proposed.buildingDepth) * proposed.floorCount) / (proposed.lotWidth * proposed.lotDepth)).toFixed(2)}
                        </div>
                    </div>
                </div>
            </Section>

            {/* Labels Section */}
            <Section
                title="Labels"
                isOpen={openSections.labels}
                onToggle={() => toggleSection('labels')}
            >
                <div className="space-y-2">
                    {labels && Object.keys(labels).map(label => (
                        <label key={label} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-800/50 p-1 rounded transition-colors">
                            <input
                                type="checkbox"
                                checked={labels[label]}
                                onChange={() => toggleLabel(label)}
                                className="form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-blue-500 bg-gray-700 border-gray-500"
                            />
                            <span className="text-sm capitalize text-gray-300">{label.replace(/([A-Z])/g, ' $1').replace('District', ' District')}</span>
                        </label>
                    ))}
                    {!labels && (
                        <div className="text-xs text-gray-500 italic p-1">
                            No labels available.
                        </div>
                    )}
                </div>
            </Section>
        </div>
    )
}

export default ParameterPanel
