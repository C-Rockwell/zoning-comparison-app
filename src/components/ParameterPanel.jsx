import { useStore, calculatePolygonArea } from '../store/useStore'
import { useState } from 'react'

const ParameterPanel = () => {
    const existing = useStore((state) => state.existing)
    const proposed = useStore((state) => state.proposed)
    const updateExisting = useStore((state) => state.updateExisting)
    const updateProposed = useStore((state) => state.updateProposed)

    const layers = useStore((state) => state.viewSettings.layers)
    const toggleLayer = useStore((state) => state.toggleLayer)

    // Road Module state
    const roadModule = useStore((state) => state.roadModule)
    const setRoadModuleSetting = useStore((state) => state.setRoadModuleSetting)

    // Polygon editing actions
    const enablePolygonMode = useStore((state) => state.enablePolygonMode)
    const resetToRectangle = useStore((state) => state.resetToRectangle)
    const setPolygonEditing = useStore((state) => state.setPolygonEditing)
    const commitPolygonChanges = useStore((state) => state.commitPolygonChanges)

    // Check polygon modes
    const existingIsPolygon = existing.lotGeometry?.mode === 'polygon'
    const proposedIsPolygon = proposed.lotGeometry?.mode === 'polygon'
    const existingIsEditing = existingIsPolygon && existing.lotGeometry?.editing
    const proposedIsEditing = proposedIsPolygon && proposed.lotGeometry?.editing

    // Calculate lot areas (use polygon area if in polygon mode)
    const existingLotArea = existingIsPolygon && existing.lotGeometry?.vertices
        ? calculatePolygonArea(existing.lotGeometry.vertices)
        : existing.lotWidth * existing.lotDepth

    const proposedLotArea = proposedIsPolygon && proposed.lotGeometry?.vertices
        ? calculatePolygonArea(proposed.lotGeometry.vertices)
        : proposed.lotWidth * proposed.lotDepth

    // Filter out non-numeric and internal properties from keys
    const keys = Object.keys(existing).filter(key =>
        typeof existing[key] === 'number' && key !== 'buildingX' && key !== 'buildingY'
    )

    // Custom labels for parameters
    const parameterLabels = {
        lotWidth: 'Lot Width',
        lotDepth: 'Lot Depth',
        setbackFront: 'Front Setback',
        setbackRear: 'Rear Setback',
        setbackSideLeft: 'Left Setback',
        setbackSideRight: 'Right Setback',
        buildingWidth: 'Building Width',
        buildingDepth: 'Building Depth',
        buildingStories: 'Stories',
        firstFloorHeight: '1st Floor Height',
        upperFloorHeight: 'Upper Floor Height',
        maxHeight: 'Max Height',
    }

    // Custom order for parameters
    const parameterOrder = [
        'lotWidth',
        'lotDepth',
        'setbackFront',
        'setbackRear',
        'setbackSideLeft',
        'setbackSideRight',
        'buildingWidth',
        'buildingDepth',
        'buildingStories',
        'firstFloorHeight',
        'upperFloorHeight',
        'maxHeight',
    ]

    // Sort keys by custom order
    const sortedKeys = keys.sort((a, b) => {
        const indexA = parameterOrder.indexOf(a)
        const indexB = parameterOrder.indexOf(b)
        if (indexA === -1 && indexB === -1) return 0
        if (indexA === -1) return 1
        if (indexB === -1) return -1
        return indexA - indexB
    })

    // Get label for a parameter key
    const getLabel = (key) => parameterLabels[key] || key.replace(/([A-Z])/g, ' $1')

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

            {/* Polygon Editing Section */}
            <div className="mb-6 bg-gray-700/50 p-3 rounded">
                <h3 className="text-sm font-bold mb-2 uppercase tracking-wide text-gray-400">Lot Shape Editing</h3>
                <div className="grid grid-cols-2 gap-3">
                    {/* Existing Lot */}
                    <div className="space-y-1.5">
                        <span className="text-xs text-gray-400 font-medium">Existing</span>
                        {!existingIsPolygon ? (
                            // Rectangle mode - show Edit Polygon button
                            <button
                                onClick={() => enablePolygonMode('existing')}
                                className="w-full px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                            >
                                Edit Shape
                            </button>
                        ) : existingIsEditing ? (
                            // Polygon mode, editing - show Done button
                            <button
                                onClick={() => commitPolygonChanges('existing')}
                                className="w-full px-2 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                            >
                                Done Editing
                            </button>
                        ) : (
                            // Polygon mode, not editing - show Edit and Reset buttons
                            <div className="space-y-1">
                                <button
                                    onClick={() => setPolygonEditing('existing', true)}
                                    className="w-full px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                                >
                                    Edit Shape
                                </button>
                                <button
                                    onClick={() => resetToRectangle('existing')}
                                    className="w-full px-2 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded transition-colors"
                                >
                                    Reset to Rectangle
                                </button>
                            </div>
                        )}
                        {existingIsPolygon && (
                            <span className="text-[10px] text-green-400 block">
                                Polygon: {existing.lotGeometry?.vertices?.length || 0} vertices
                            </span>
                        )}
                    </div>
                    {/* Proposed Lot */}
                    <div className="space-y-1.5">
                        <span className="text-xs text-gray-400 font-medium">Proposed</span>
                        {!proposedIsPolygon ? (
                            // Rectangle mode - show Edit Polygon button
                            <button
                                onClick={() => enablePolygonMode('proposed')}
                                className="w-full px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                            >
                                Edit Shape
                            </button>
                        ) : proposedIsEditing ? (
                            // Polygon mode, editing - show Done button
                            <button
                                onClick={() => commitPolygonChanges('proposed')}
                                className="w-full px-2 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                            >
                                Done Editing
                            </button>
                        ) : (
                            // Polygon mode, not editing - show Edit and Reset buttons
                            <div className="space-y-1">
                                <button
                                    onClick={() => setPolygonEditing('proposed', true)}
                                    className="w-full px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                                >
                                    Edit Shape
                                </button>
                                <button
                                    onClick={() => resetToRectangle('proposed')}
                                    className="w-full px-2 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded transition-colors"
                                >
                                    Reset to Rectangle
                                </button>
                            </div>
                        )}
                        {proposedIsPolygon && (
                            <span className="text-[10px] text-green-400 block">
                                Polygon: {proposed.lotGeometry?.vertices?.length || 0} vertices
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Road Module Section */}
            <div className="mb-6 bg-gray-700/50 p-3 rounded">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-gray-400">Road Module</h3>
                    <button
                        onClick={() => setRoadModuleSetting('enabled', !roadModule?.enabled)}
                        className={`px-2 py-1 rounded text-xs font-bold ${roadModule?.enabled
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-600 text-gray-400'
                            }`}
                    >
                        {roadModule?.enabled ? 'ON' : 'OFF'}
                    </button>
                </div>

                {roadModule?.enabled && (() => {
                    // Calculate available space for each side
                    const rightOfWay = roadModule?.rightOfWay ?? 50
                    const roadWidth = roadModule?.roadWidth ?? 24
                    const availablePerSide = (rightOfWay - roadWidth) / 2

                    // Calculate used space on left side
                    const leftUsed = (roadModule?.leftParking || 0) +
                        (roadModule?.leftVerge || 0) +
                        (roadModule?.leftSidewalk || 0) +
                        (roadModule?.leftTransitionZone || 0)
                    const leftRemaining = availablePerSide - leftUsed

                    // Calculate used space on right side
                    const rightUsed = (roadModule?.rightParking || 0) +
                        (roadModule?.rightVerge || 0) +
                        (roadModule?.rightSidewalk || 0) +
                        (roadModule?.rightTransitionZone || 0)
                    const rightRemaining = availablePerSide - rightUsed

                    return (
                        <div className="space-y-3">
                            {/* Required Parameters */}
                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2 items-center">
                                    <label className="text-xs text-gray-400">Right-of-Way</label>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            value={roadModule?.rightOfWay ?? 50}
                                            onChange={(e) => setRoadModuleSetting('rightOfWay', parseFloat(e.target.value) || 0)}
                                            className="bg-gray-700 p-1 rounded text-right text-sm w-full outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                        <span className="text-[10px] text-gray-500">ft</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 items-center">
                                    <label className="text-xs text-gray-400">Road Width</label>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            value={roadModule?.roadWidth ?? 24}
                                            onChange={(e) => setRoadModuleSetting('roadWidth', parseFloat(e.target.value) || 0)}
                                            className={`bg-gray-700 p-1 rounded text-right text-sm w-full outline-none focus:ring-1 ${roadWidth > rightOfWay ? 'ring-1 ring-red-500 text-red-400' : 'focus:ring-blue-500'}`}
                                        />
                                        <span className="text-[10px] text-gray-500">ft</span>
                                    </div>
                                </div>
                                {roadWidth > rightOfWay && (
                                    <div className="text-[10px] text-red-400 bg-red-900/30 px-2 py-1 rounded">
                                        Road width cannot exceed right-of-way
                                    </div>
                                )}
                            </div>

                            {/* Optional Parameters - Left Side */}
                            <div className="border-t border-gray-600 pt-2">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Left Side (toward outer ROW)</span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${leftRemaining < 0
                                        ? 'bg-red-900/50 text-red-400'
                                        : leftRemaining === 0
                                            ? 'bg-yellow-900/50 text-yellow-400'
                                            : 'bg-green-900/50 text-green-400'
                                        }`}>
                                        {leftRemaining.toFixed(1)}' left
                                    </span>
                                </div>
                                {leftRemaining < 0 && (
                                    <div className="text-[10px] text-red-400 bg-red-900/30 px-2 py-1 rounded mb-2">
                                        Exceeds available space by {Math.abs(leftRemaining).toFixed(1)}'
                                    </div>
                                )}
                                {[
                                    { key: 'leftParking', label: 'Parking' },
                                    { key: 'leftVerge', label: 'Verge' },
                                    { key: 'leftSidewalk', label: 'Sidewalk' },
                                    { key: 'leftTransitionZone', label: 'Transition' },
                                ].map(({ key, label }) => (
                                    <div key={key} className="grid grid-cols-3 gap-2 items-center mb-1">
                                        <label className="flex items-center gap-1 cursor-pointer col-span-2">
                                            <input
                                                type="checkbox"
                                                checked={roadModule?.[key] !== null && roadModule?.[key] !== undefined}
                                                onChange={(e) => setRoadModuleSetting(key, e.target.checked ? 8 : null)}
                                                className="form-checkbox h-3 w-3 text-blue-600 rounded focus:ring-blue-500 bg-gray-700 border-gray-500"
                                            />
                                            <span className="text-xs text-gray-400">{label}</span>
                                        </label>
                                        {roadModule?.[key] !== null && roadModule?.[key] !== undefined && (
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="number"
                                                    value={roadModule?.[key] ?? 0}
                                                    onChange={(e) => setRoadModuleSetting(key, parseFloat(e.target.value) || 0)}
                                                    className={`bg-gray-700 p-1 rounded text-right text-sm w-full outline-none focus:ring-1 ${leftRemaining < 0 ? 'ring-1 ring-red-500 text-red-400' : 'focus:ring-blue-500'}`}
                                                />
                                                <span className="text-[10px] text-gray-500">ft</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Optional Parameters - Right Side */}
                            <div className="border-t border-gray-600 pt-2">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Right Side (toward lot)</span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${rightRemaining < 0
                                        ? 'bg-red-900/50 text-red-400'
                                        : rightRemaining === 0
                                            ? 'bg-yellow-900/50 text-yellow-400'
                                            : 'bg-green-900/50 text-green-400'
                                        }`}>
                                        {rightRemaining.toFixed(1)}' left
                                    </span>
                                </div>
                                {rightRemaining < 0 && (
                                    <div className="text-[10px] text-red-400 bg-red-900/30 px-2 py-1 rounded mb-2">
                                        Exceeds available space by {Math.abs(rightRemaining).toFixed(1)}'
                                    </div>
                                )}
                                {[
                                    { key: 'rightParking', label: 'Parking' },
                                    { key: 'rightVerge', label: 'Verge' },
                                    { key: 'rightSidewalk', label: 'Sidewalk' },
                                    { key: 'rightTransitionZone', label: 'Transition' },
                                ].map(({ key, label }) => (
                                    <div key={key} className="grid grid-cols-3 gap-2 items-center mb-1">
                                        <label className="flex items-center gap-1 cursor-pointer col-span-2">
                                            <input
                                                type="checkbox"
                                                checked={roadModule?.[key] !== null && roadModule?.[key] !== undefined}
                                                onChange={(e) => setRoadModuleSetting(key, e.target.checked ? 8 : null)}
                                                className="form-checkbox h-3 w-3 text-blue-600 rounded focus:ring-blue-500 bg-gray-700 border-gray-500"
                                            />
                                            <span className="text-xs text-gray-400">{label}</span>
                                        </label>
                                        {roadModule?.[key] !== null && roadModule?.[key] !== undefined && (
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="number"
                                                    value={roadModule?.[key] ?? 0}
                                                    onChange={(e) => setRoadModuleSetting(key, parseFloat(e.target.value) || 0)}
                                                    className={`bg-gray-700 p-1 rounded text-right text-sm w-full outline-none focus:ring-1 ${rightRemaining < 0 ? 'ring-1 ring-red-500 text-red-400' : 'focus:ring-blue-500'}`}
                                                />
                                                <span className="text-[10px] text-gray-500">ft</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })()}
            </div>

            <h2 className="text-xl font-bold mb-4">Parameters</h2>
            <div className="grid grid-cols-3 gap-2 mb-2 font-semibold text-sm">
                <div className="col-span-1">Name</div>
                <div className="col-span-1 text-center">Existing</div>
                <div className="col-span-1 text-center">Proposed</div>
            </div>
            <div className="space-y-2">
                {sortedKeys.map((key) => (
                    <div key={key} className="grid grid-cols-3 gap-2 items-center">
                        <label className="text-xs text-gray-400 break-words pr-2">
                            {getLabel(key)}
                        </label>
                        <input
                            type="number"
                            value={existing[key]}
                            onChange={(e) => updateExisting(key, parseFloat(e.target.value) || 0)}
                            className="bg-gray-700 p-1 rounded text-right text-sm w-full outline-none focus:ring-1 focus:ring-blue-500"
                            step={key === 'buildingStories' ? 1 : undefined}
                            min={key === 'buildingStories' ? 1 : undefined}
                        />
                        <input
                            type="number"
                            value={proposed[key]}
                            onChange={(e) => updateProposed(key, parseFloat(e.target.value) || 0)}
                            className="bg-gray-700 p-1 rounded text-right text-sm w-full outline-none focus:ring-1 focus:ring-blue-500"
                            step={key === 'buildingStories' ? 1 : undefined}
                            min={key === 'buildingStories' ? 1 : undefined}
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
                        {Math.round(existingLotArea).toLocaleString()} <span className="text-[10px] text-gray-500">sq ft</span>
                    </div>
                    <div className="bg-gray-700 p-1 rounded text-right text-sm w-full text-gray-200">
                        {Math.round(proposedLotArea).toLocaleString()} <span className="text-[10px] text-gray-500">sq ft</span>
                    </div>
                </div>

                {/* Building Coverage */}
                <div className="grid grid-cols-3 gap-2 items-center">
                    <label className="text-xs text-gray-400 capitalize break-words pr-2">
                        Coverage
                    </label>
                    <div className="bg-gray-700 p-1 rounded text-right text-sm w-full text-gray-200">
                        {((existing.buildingWidth * existing.buildingDepth) / existingLotArea * 100).toFixed(1)}%
                    </div>
                    <div className="bg-gray-700 p-1 rounded text-right text-sm w-full text-gray-200">
                        {((proposed.buildingWidth * proposed.buildingDepth) / proposedLotArea * 100).toFixed(1)}%
                    </div>
                </div>

                {/* Gross Floor Area */}
                <div className="grid grid-cols-3 gap-2 items-center">
                    <label className="text-xs text-gray-400 capitalize break-words pr-2">
                        Gross Floor Area
                    </label>
                    <div className="bg-gray-700 p-1 rounded text-right text-sm w-full text-gray-200">
                        {(existing.buildingWidth * existing.buildingDepth * (existing.buildingStories || 1)).toLocaleString()} <span className="text-[10px] text-gray-500">sq ft</span>
                    </div>
                    <div className="bg-gray-700 p-1 rounded text-right text-sm w-full text-gray-200">
                        {(proposed.buildingWidth * proposed.buildingDepth * (proposed.buildingStories || 1)).toLocaleString()} <span className="text-[10px] text-gray-500">sq ft</span>
                    </div>
                </div>

                {/* Floor Area Ratio (FAR) */}
                <div className="grid grid-cols-3 gap-2 items-center">
                    <label className="text-xs text-gray-400 capitalize break-words pr-2">
                        FAR
                    </label>
                    <div className="bg-gray-700 p-1 rounded text-right text-sm w-full text-gray-200">
                        {((existing.buildingWidth * existing.buildingDepth * (existing.buildingStories || 1)) / existingLotArea).toFixed(2)}
                    </div>
                    <div className="bg-gray-700 p-1 rounded text-right text-sm w-full text-gray-200">
                        {((proposed.buildingWidth * proposed.buildingDepth * (proposed.buildingStories || 1)) / proposedLotArea).toFixed(2)}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ParameterPanel
