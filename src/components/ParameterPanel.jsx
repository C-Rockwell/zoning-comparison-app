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
        </div>
    )
}

export default ParameterPanel
