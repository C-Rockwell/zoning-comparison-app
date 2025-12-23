import { useStore } from '../store/useStore'

const ParameterPanel = () => {
    const existing = useStore((state) => state.existing)
    const proposed = useStore((state) => state.proposed)
    const updateExisting = useStore((state) => state.updateExisting)
    const updateProposed = useStore((state) => state.updateProposed)

    const layers = useStore((state) => state.viewSettings.layers)
    const toggleLayer = useStore((state) => state.toggleLayer)

    const keys = Object.keys(existing)

    return (
        <div className="p-4 bg-gray-800 text-white w-full md:w-96 flex-shrink-0 overflow-y-auto border-r border-gray-700 h-full scrollbar-thin scrollbar-thumb-gray-600">

            {/* Layers Section */}
            <div className="mb-6 bg-gray-700/50 p-3 rounded">
                <h3 className="text-sm font-bold mb-2 uppercase tracking-wide text-gray-400">Layers</h3>
                <div className="space-y-2">
                    {Object.keys(layers).map(layer => (
                        <label key={layer} className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={layers[layer]}
                                onChange={() => toggleLayer(layer)}
                                className="form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-blue-500 bg-gray-700 border-gray-500"
                            />
                            <span className="text-sm capitalize">{layer.replace(/([A-Z])/g, ' $1')}</span>
                        </label>
                    ))}
                </div>
            </div>

            <h2 className="text-xl font-bold mb-4">Parameters</h2>
            <div className="grid grid-cols-3 gap-2 mb-2 font-semibold text-sm">
                <div className="col-span-1">Name</div>
                <div className="col-span-1 text-center">Existing</div>
                <div className="col-span-1 text-center">Proposed</div>
            </div>
            <div className="space-y-2">
                {keys.map((key) => (
                    <div key={key} className="grid grid-cols-3 gap-2 items-center">
                        <label className="text-xs text-gray-400 capitalize break-words pr-2">
                            {key.replace(/([A-Z])/g, ' $1')}
                        </label>
                        <input
                            type="number"
                            value={existing[key]}
                            onChange={(e) => updateExisting(key, parseFloat(e.target.value) || 0)}
                            className="bg-gray-700 p-1 rounded text-right text-sm w-full outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                            type="number"
                            value={proposed[key]}
                            onChange={(e) => updateProposed(key, parseFloat(e.target.value) || 0)}
                            className="bg-gray-700 p-1 rounded text-right text-sm w-full outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                ))}
            </div>
            <h2 className="text-xl font-bold mb-4 border-t border-gray-700 pt-6 mt-6">Stats</h2>
            <div className="grid grid-cols-3 gap-2 mb-2 font-semibold text-sm">
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
                    <div className="bg-gray-700 p-1 rounded text-right text-sm w-full text-gray-200">
                        {(existing.lotWidth * existing.lotDepth).toLocaleString()} <span className="text-[10px] text-gray-500">sq ft</span>
                    </div>
                    <div className="bg-gray-700 p-1 rounded text-right text-sm w-full text-gray-200">
                        {(proposed.lotWidth * proposed.lotDepth).toLocaleString()} <span className="text-[10px] text-gray-500">sq ft</span>
                    </div>
                </div>

                {/* Building Coverage */}
                <div className="grid grid-cols-3 gap-2 items-center">
                    <label className="text-xs text-gray-400 capitalize break-words pr-2">
                        Coverage
                    </label>
                    <div className="bg-gray-700 p-1 rounded text-right text-sm w-full text-gray-200">
                        {((existing.buildingWidth * existing.buildingDepth) / (existing.lotWidth * existing.lotDepth) * 100).toFixed(1)}%
                    </div>
                    <div className="bg-gray-700 p-1 rounded text-right text-sm w-full text-gray-200">
                        {((proposed.buildingWidth * proposed.buildingDepth) / (proposed.lotWidth * proposed.lotDepth) * 100).toFixed(1)}%
                    </div>
                </div>

                {/* Total Floor Area */}
                <div className="grid grid-cols-3 gap-2 items-center">
                    <label className="text-xs text-gray-400 capitalize break-words pr-2">
                        Floor Area
                    </label>
                    <div className="bg-gray-700 p-1 rounded text-right text-sm w-full text-gray-200">
                        {(existing.buildingWidth * existing.buildingDepth).toLocaleString()} <span className="text-[10px] text-gray-500">sq ft</span>
                    </div>
                    <div className="bg-gray-700 p-1 rounded text-right text-sm w-full text-gray-200">
                        {(proposed.buildingWidth * proposed.buildingDepth).toLocaleString()} <span className="text-[10px] text-gray-500">sq ft</span>
                    </div>
                </div>

                {/* Floor Area Ratio (FAR) */}
                <div className="grid grid-cols-3 gap-2 items-center">
                    <label className="text-xs text-gray-400 capitalize break-words pr-2">
                        FAR
                    </label>
                    <div className="bg-gray-700 p-1 rounded text-right text-sm w-full text-gray-200">
                        {((existing.buildingWidth * existing.buildingDepth) / (existing.lotWidth * existing.lotDepth)).toFixed(2)}
                    </div>
                    <div className="bg-gray-700 p-1 rounded text-right text-sm w-full text-gray-200">
                        {((proposed.buildingWidth * proposed.buildingDepth) / (proposed.lotWidth * proposed.lotDepth)).toFixed(2)}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ParameterPanel
