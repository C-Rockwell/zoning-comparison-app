import { useState, useMemo, useCallback } from 'react'
import { useStore } from '../store/useStore'
import {
    useLotIds,
    useModelSetup, useDistrictParameters, useEntityCount,
    useRoadModules, useActiveLotId,
} from '../hooks/useEntityStore'
import Section from './ui/Section'
import ColorPicker from './ui/ColorPicker'
import SliderInput from './ui/SliderInput'
import LineStyleSelector from './ui/LineStyleSelector'
import {
    ChevronDown, Eye, EyeOff, Palette, Plus, Minus, Trash2, Copy,
    Layers, Settings, Building2, Route,
} from 'lucide-react'

// ============================================
// Helper Sub-Components
// ============================================

/** Small number input cell for model parameter tables */
const ParamCell = ({ value, onChange, min, max, step = 1, disabled = false }) => (
    <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className="w-full text-xs text-right rounded px-1 py-0.5
                   focus:outline-none focus-ring-accent-1 input-theme"
        style={{
            color: 'var(--ui-text-primary)',
            backgroundColor: 'var(--ui-bg-secondary)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--ui-border)',
        }}
    />
)

/** Checkbox cell for model parameter tables */
const CheckCell = ({ checked, onChange }) => (
    <div className="flex items-center justify-center">
        <input
            type="checkbox"
            checked={checked || false}
            onChange={(e) => onChange(e.target.checked)}
            className="rounded accent-theme"
            style={{ backgroundColor: 'var(--ui-bg-secondary)', borderColor: 'var(--ui-border)' }}
        />
    </div>
)

/** Computed (read-only) value cell */
const ComputedCell = ({ value, unit = '' }) => (
    <div
        className="text-xs text-right rounded px-1 py-0.5"
        style={{
            color: 'var(--ui-text-secondary)',
            backgroundColor: 'var(--ui-bg-secondary)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--ui-border)',
        }}
    >
        {value != null ? `${typeof value === 'number' ? value.toFixed(1) : value}${unit ? ` ${unit}` : ''}` : '--'}
    </div>
)

/** District parameter min/max pair input */
const MinMaxInput = ({ min, max, onMinChange, onMaxChange, unit = '' }) => (
    <div className="flex items-center gap-1">
        <input
            type="number"
            value={min ?? ''}
            onChange={(e) => onMinChange(e.target.value === '' ? null : parseFloat(e.target.value))}
            placeholder="min"
            className="w-16 text-xs text-right rounded px-1 py-0.5
                       placeholder-theme focus:outline-none focus-ring-accent-1"
            style={{
                color: 'var(--ui-text-primary)',
                backgroundColor: 'var(--ui-bg-secondary)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'var(--ui-border)',
            }}
        />
        <span className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>-</span>
        <input
            type="number"
            value={max ?? ''}
            onChange={(e) => onMaxChange(e.target.value === '' ? null : parseFloat(e.target.value))}
            placeholder="max"
            className="w-16 text-xs text-right rounded px-1 py-0.5
                       placeholder-theme focus:outline-none focus-ring-accent-1"
            style={{
                color: 'var(--ui-text-primary)',
                backgroundColor: 'var(--ui-bg-secondary)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'var(--ui-border)',
            }}
        />
        {unit && <span className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>{unit}</span>}
    </div>
)

/** Visibility toggle (Eye icon) */
const VisibilityToggle = ({ visible, onClick }) => (
    <button onClick={onClick} className="p-0.5 hover-bg-secondary rounded transition-colors" title="Toggle visibility">
        {visible ? (
            <Eye className="w-3.5 h-3.5" style={{ color: 'var(--ui-text-secondary)' }} />
        ) : (
            <EyeOff className="w-3.5 h-3.5" style={{ color: 'var(--ui-text-muted)' }} />
        )}
    </button>
)

/** Inline style toggle button (palette icon) for section headers */
const StyleToggle = ({ isOpen, onClick }) => (
    <button
        onClick={(e) => { e.stopPropagation(); onClick() }}
        className={`p-0.5 rounded transition-colors ${isOpen ? '' : 'hover-text-secondary'}`}
        style={isOpen
            ? { color: 'var(--ui-accent)', backgroundColor: 'var(--ui-accent-muted)' }
            : { color: 'var(--ui-text-muted)' }
        }
        title="Style controls"
    >
        <Palette className="w-3.5 h-3.5" />
    </button>
)

// ============================================
// MODEL PARAMETERS TABLE
// ============================================

const ModelParametersTable = () => {
    const lotIds = useLotIds()
    const updateLotParam = useStore((s) => s.updateLotParam)
    const updateLotSetback = useStore((s) => s.updateLotSetback)
    const updateBuildingParam = useStore((s) => s.updateBuildingParam)
    const setLotVisibilityAction = useStore((s) => s.setLotVisibility)
    const lots = useStore((s) => s.entities?.lots ?? {})
    const lotVisibilityAll = useStore((s) => s.lotVisibility ?? {})

    // Parameter row definitions
    const sections = useMemo(() => [
        {
            title: 'Lot Dimensions',
            rows: [
                {
                    label: 'Lot Width (ft)',
                    visKey: 'lotLines',
                    getValue: (lot) => lot.lotWidth,
                    setValue: (lotId, v) => updateLotParam(lotId, 'lotWidth', v),
                    type: 'number', min: 1,
                },
                {
                    label: 'Lot Depth (ft)',
                    visKey: 'lotLines',
                    getValue: (lot) => lot.lotDepth,
                    setValue: (lotId, v) => updateLotParam(lotId, 'lotDepth', v),
                    type: 'number', min: 1,
                },
            ],
        },
        {
            title: 'Setbacks Principle',
            rows: [
                {
                    label: 'Front (ft)',
                    visKey: 'setbacks',
                    getValue: (lot) => lot.setbacks?.principal?.front,
                    setValue: (lotId, v) => updateLotSetback(lotId, 'principal', 'front', v),
                    type: 'number', min: 0,
                },
                {
                    label: 'Max. Front (ft)',
                    visKey: 'maxSetbacks',
                    getValue: (lot) => lot.setbacks?.principal?.maxFront,
                    setValue: (lotId, v) => updateLotSetback(lotId, 'principal', 'maxFront', v),
                    type: 'number', min: 0,
                },
                {
                    label: 'BTZ - Front (%)',
                    visKey: 'btzPlanes',
                    getValue: (lot) => lot.setbacks?.principal?.btzFront,
                    setValue: (lotId, v) => updateLotSetback(lotId, 'principal', 'btzFront', v),
                    type: 'number', min: 0, max: 100,
                },
                {
                    label: 'Rear (ft)',
                    visKey: 'setbacks',
                    getValue: (lot) => lot.setbacks?.principal?.rear,
                    setValue: (lotId, v) => updateLotSetback(lotId, 'principal', 'rear', v),
                    type: 'number', min: 0,
                },
                {
                    label: 'Side, Interior (ft)',
                    visKey: 'setbacks',
                    getValue: (lot) => lot.setbacks?.principal?.sideInterior,
                    setValue: (lotId, v) => updateLotSetback(lotId, 'principal', 'sideInterior', v),
                    type: 'number', min: 0,
                },
                {
                    label: 'Min. Side, Street (ft)',
                    visKey: 'setbacks',
                    getValue: (lot) => lot.setbacks?.principal?.minSideStreet,
                    setValue: (lotId, v) => updateLotSetback(lotId, 'principal', 'minSideStreet', v),
                    type: 'number', min: 0,
                },
                {
                    label: 'Max. Side, Street (ft)',
                    visKey: 'maxSetbacks',
                    getValue: (lot) => lot.setbacks?.principal?.maxSideStreet,
                    setValue: (lotId, v) => updateLotSetback(lotId, 'principal', 'maxSideStreet', v),
                    type: 'number', min: 0,
                },
                {
                    label: 'BTZ - Side, Street (%)',
                    visKey: 'btzPlanes',
                    getValue: (lot) => lot.setbacks?.principal?.btzSideStreet,
                    setValue: (lotId, v) => updateLotSetback(lotId, 'principal', 'btzSideStreet', v),
                    type: 'number', min: 0, max: 100,
                },
            ],
        },
        {
            title: 'Setbacks Accessory',
            rows: [
                {
                    label: 'Front (ft)',
                    visKey: 'accessorySetbacks',
                    getValue: (lot) => lot.setbacks?.accessory?.front,
                    setValue: (lotId, v) => updateLotSetback(lotId, 'accessory', 'front', v),
                    type: 'number', min: 0,
                },
                {
                    label: 'Rear (ft)',
                    visKey: 'accessorySetbacks',
                    getValue: (lot) => lot.setbacks?.accessory?.rear,
                    setValue: (lotId, v) => updateLotSetback(lotId, 'accessory', 'rear', v),
                    type: 'number', min: 0,
                },
                {
                    label: 'Side, Interior (ft)',
                    visKey: 'accessorySetbacks',
                    getValue: (lot) => lot.setbacks?.accessory?.sideInterior,
                    setValue: (lotId, v) => updateLotSetback(lotId, 'accessory', 'sideInterior', v),
                    type: 'number', min: 0,
                },
                {
                    label: 'Side, Street (ft)',
                    visKey: 'accessorySetbacks',
                    getValue: (lot) => lot.setbacks?.accessory?.sideStreet,
                    setValue: (lotId, v) => updateLotSetback(lotId, 'accessory', 'sideStreet', v),
                    type: 'number', min: 0,
                },
            ],
        },
        {
            title: 'Structures Principal',
            rows: [
                {
                    label: 'Height',
                    visKey: 'buildings',
                    getValue: (lot) => {
                        const b = lot.buildings?.principal
                        if (!b) return null
                        return b.firstFloorHeight + (b.upperFloorHeight * Math.max(0, (b.stories || 1) - 1))
                    },
                    type: 'computed',
                },
                {
                    label: 'Width (ft)',
                    visKey: 'buildings',
                    getValue: (lot) => lot.buildings?.principal?.width,
                    setValue: (lotId, v) => updateBuildingParam(lotId, 'principal', 'width', v),
                    type: 'number', min: 1,
                },
                {
                    label: 'Depth (ft)',
                    visKey: 'buildings',
                    getValue: (lot) => lot.buildings?.principal?.depth,
                    setValue: (lotId, v) => updateBuildingParam(lotId, 'principal', 'depth', v),
                    type: 'number', min: 1,
                },
                {
                    label: 'Stories',
                    visKey: 'buildings',
                    getValue: (lot) => lot.buildings?.principal?.stories,
                    setValue: (lotId, v) => updateBuildingParam(lotId, 'principal', 'stories', v),
                    type: 'number', min: 1, step: 1,
                },
                {
                    label: 'Show Roof',
                    visKey: 'roof',
                    getValue: (lot) => lot.buildings?.principal?.roof?.type !== 'flat',
                    type: 'display',
                },
                {
                    label: 'First Story Height',
                    visKey: 'buildings',
                    getValue: (lot) => lot.buildings?.principal?.firstFloorHeight,
                    setValue: (lotId, v) => updateBuildingParam(lotId, 'principal', 'firstFloorHeight', v),
                    type: 'number', min: 1,
                },
                {
                    label: 'Upper Floor Height',
                    visKey: 'buildings',
                    getValue: (lot) => lot.buildings?.principal?.upperFloorHeight,
                    setValue: (lotId, v) => updateBuildingParam(lotId, 'principal', 'upperFloorHeight', v),
                    type: 'number', min: 1,
                },
                {
                    label: 'Show Max. Height Plane',
                    visKey: 'maxHeightPlane',
                    getValue: () => true,
                    type: 'display',
                },
            ],
        },
        {
            title: 'Structures Accessory',
            rows: [
                {
                    label: 'Height',
                    visKey: 'accessoryBuilding',
                    getValue: (lot) => {
                        const b = lot.buildings?.accessory
                        if (!b) return null
                        return b.firstFloorHeight + (b.upperFloorHeight * Math.max(0, (b.stories || 1) - 1))
                    },
                    type: 'computed',
                },
                {
                    label: 'Width (ft)',
                    visKey: 'accessoryBuilding',
                    getValue: (lot) => lot.buildings?.accessory?.width,
                    setValue: (lotId, v) => updateBuildingParam(lotId, 'accessory', 'width', v),
                    type: 'number', min: 1,
                },
                {
                    label: 'Depth (ft)',
                    visKey: 'accessoryBuilding',
                    getValue: (lot) => lot.buildings?.accessory?.depth,
                    setValue: (lotId, v) => updateBuildingParam(lotId, 'accessory', 'depth', v),
                    type: 'number', min: 1,
                },
                {
                    label: 'Stories',
                    visKey: 'accessoryBuilding',
                    getValue: (lot) => lot.buildings?.accessory?.stories,
                    setValue: (lotId, v) => updateBuildingParam(lotId, 'accessory', 'stories', v),
                    type: 'number', min: 1, step: 1,
                },
                {
                    label: 'First Story Height',
                    visKey: 'accessoryBuilding',
                    getValue: (lot) => lot.buildings?.accessory?.firstFloorHeight,
                    setValue: (lotId, v) => updateBuildingParam(lotId, 'accessory', 'firstFloorHeight', v),
                    type: 'number', min: 1,
                },
                {
                    label: 'Upper Floor Height',
                    visKey: 'accessoryBuilding',
                    getValue: (lot) => lot.buildings?.accessory?.upperFloorHeight,
                    setValue: (lotId, v) => updateBuildingParam(lotId, 'accessory', 'upperFloorHeight', v),
                    type: 'number', min: 1,
                },
                {
                    label: 'Show Roof',
                    visKey: 'roof',
                    getValue: (lot) => lot.buildings?.accessory?.roof?.type !== 'flat',
                    type: 'display',
                },
                {
                    label: 'Show Max. Height Plane',
                    visKey: 'maxHeightPlane',
                    getValue: () => true,
                    type: 'display',
                },
            ],
        },
        {
            title: 'Lot Access',
            rows: [
                {
                    label: 'Front',
                    visKey: 'lotAccessArrows',
                    getValue: (lot) => lot.lotAccess?.front,
                    setValue: (lotId, v) => updateLotParam(lotId, 'lotAccess', { ...lots[lotId]?.lotAccess, front: v }),
                    type: 'checkbox',
                },
                {
                    label: 'Shared Drive',
                    visKey: 'lotAccessArrows',
                    getValue: (lot) => lot.lotAccess?.sideInterior,
                    setValue: (lotId, v) => updateLotParam(lotId, 'lotAccess', { ...lots[lotId]?.lotAccess, sideInterior: v }),
                    type: 'checkbox',
                },
                {
                    label: 'Side, Street',
                    visKey: 'lotAccessArrows',
                    getValue: (lot) => lot.lotAccess?.sideStreet,
                    setValue: (lotId, v) => updateLotParam(lotId, 'lotAccess', { ...lots[lotId]?.lotAccess, sideStreet: v }),
                    type: 'checkbox',
                },
                {
                    label: 'Rear',
                    visKey: 'lotAccessArrows',
                    getValue: (lot) => lot.lotAccess?.rear,
                    setValue: (lotId, v) => updateLotParam(lotId, 'lotAccess', { ...lots[lotId]?.lotAccess, rear: v }),
                    type: 'checkbox',
                },
            ],
        },
        {
            title: 'Parking',
            rows: [
                {
                    label: 'Front',
                    visKey: null,
                    getValue: (lot) => lot.parking?.front,
                    setValue: (lotId, v) => updateLotParam(lotId, 'parking', { ...lots[lotId]?.parking, front: v }),
                    type: 'checkbox',
                },
                {
                    label: 'Side, Interior',
                    visKey: null,
                    getValue: (lot) => lot.parking?.sideInterior,
                    setValue: (lotId, v) => updateLotParam(lotId, 'parking', { ...lots[lotId]?.parking, sideInterior: v }),
                    type: 'checkbox',
                },
                {
                    label: 'Side, Street',
                    visKey: null,
                    getValue: (lot) => lot.parking?.sideStreet,
                    setValue: (lotId, v) => updateLotParam(lotId, 'parking', { ...lots[lotId]?.parking, sideStreet: v }),
                    type: 'checkbox',
                },
                {
                    label: 'Rear',
                    visKey: null,
                    getValue: (lot) => lot.parking?.rear,
                    setValue: (lotId, v) => updateLotParam(lotId, 'parking', { ...lots[lotId]?.parking, rear: v }),
                    type: 'checkbox',
                },
            ],
        },
        {
            title: 'Parking Setbacks',
            rows: [
                {
                    label: 'Front (ft)',
                    visKey: 'parkingSetbacks',
                    getValue: (lot) => lot.parkingSetbacks?.front,
                    setValue: (lotId, v) => updateLotParam(lotId, 'parkingSetbacks', { ...lots[lotId]?.parkingSetbacks, front: v }),
                    type: 'number', min: 0,
                },
                {
                    label: 'Side, Interior (ft)',
                    visKey: 'parkingSetbacks',
                    getValue: (lot) => lot.parkingSetbacks?.sideInterior,
                    setValue: (lotId, v) => updateLotParam(lotId, 'parkingSetbacks', { ...lots[lotId]?.parkingSetbacks, sideInterior: v }),
                    type: 'number', min: 0,
                },
                {
                    label: 'Side, Street (ft)',
                    visKey: 'parkingSetbacks',
                    getValue: (lot) => lot.parkingSetbacks?.sideStreet,
                    setValue: (lotId, v) => updateLotParam(lotId, 'parkingSetbacks', { ...lots[lotId]?.parkingSetbacks, sideStreet: v }),
                    type: 'number', min: 0,
                },
                {
                    label: 'Rear (ft)',
                    visKey: 'parkingSetbacks',
                    getValue: (lot) => lot.parkingSetbacks?.rear,
                    setValue: (lotId, v) => updateLotParam(lotId, 'parkingSetbacks', { ...lots[lotId]?.parkingSetbacks, rear: v }),
                    type: 'number', min: 0,
                },
            ],
        },
    ], [lots, updateLotParam, updateLotSetback, updateBuildingParam])

    // First lot's visibility used for the eye-icon column (controls all lots)
    const firstLotVis = lotVisibilityAll[lotIds[0]] ?? {}

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
                {/* Header */}
                <thead>
                    <tr style={{ borderBottom: '1px solid var(--ui-border)' }}>
                        <th
                            className="text-left font-medium py-1 pr-2 sticky left-0 z-10 min-w-[140px]"
                            style={{ color: 'var(--ui-text-secondary)', backgroundColor: 'var(--ui-bg-primary)' }}
                        >
                            Parameter
                        </th>
                        {lotIds.map((id, i) => (
                            <th key={id} className="text-center font-medium py-1 px-1 min-w-[60px]" style={{ color: 'var(--ui-text-secondary)' }}>
                                Lot {i + 1}
                            </th>
                        ))}
                        <th className="text-center font-medium py-1 px-1 w-8" style={{ color: 'var(--ui-text-muted)' }}>
                            <Eye className="w-3 h-3 mx-auto" />
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {sections.map((section) => (
                        <SectionGroup
                            key={section.title}
                            section={section}
                            lotIds={lotIds}
                            lots={lots}
                            firstLotVis={firstLotVis}
                            setLotVisibilityAction={setLotVisibilityAction}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    )
}

/** A group of rows in the model parameters table with a collapsible section header */
const SectionGroup = ({ section, lotIds, lots, firstLotVis, setLotVisibilityAction }) => {
    const [isOpen, setIsOpen] = useState(true)

    return (
    <>
        <tr>
            <td
                colSpan={lotIds.length + 2}
                className="text-[10px] font-bold uppercase tracking-wider pt-3 pb-1 cursor-pointer select-none"
                style={{ color: 'var(--ui-text-secondary)', borderBottom: '2px solid var(--ui-border)', borderLeft: '2px solid var(--ui-text-muted)', paddingLeft: '4px' }}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-1">
                    <ChevronDown
                        className={`w-3 h-3 transition-transform ${isOpen ? '' : '-rotate-90'}`}
                        style={{ color: 'var(--ui-text-muted)' }}
                    />
                    {section.title}
                </div>
            </td>
        </tr>
        {isOpen && section.rows.map((row) => (
            <tr key={row.label} className="hover-bg-secondary transition-colors" style={{ borderBottom: '1px solid var(--ui-border)' }}>
                {/* Parameter name (sticky left) */}
                <td
                    className="text-xs py-1 pr-2 sticky left-0 z-10"
                    style={{ color: 'var(--ui-text-secondary)', backgroundColor: 'var(--ui-bg-primary)' }}
                >
                    {row.label}
                </td>

                {/* Lot value cells */}
                {lotIds.map((lotId) => {
                    const lot = lots[lotId]
                    if (!lot) return <td key={lotId} />

                    const value = row.getValue(lot)

                    if (row.type === 'computed') {
                        return (
                            <td key={lotId} className="py-1 px-1">
                                <ComputedCell value={value} />
                            </td>
                        )
                    }

                    if (row.type === 'display') {
                        return (
                            <td key={lotId} className="py-1 px-1 text-center text-xs" style={{ color: 'var(--ui-text-secondary)' }}>
                                {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : (value ?? '--')}
                            </td>
                        )
                    }

                    if (row.type === 'checkbox') {
                        return (
                            <td key={lotId} className="py-1 px-1">
                                <CheckCell
                                    checked={value}
                                    onChange={(v) => row.setValue(lotId, v)}
                                />
                            </td>
                        )
                    }

                    // Default: number input
                    return (
                        <td key={lotId} className="py-1 px-1">
                            <ParamCell
                                value={value}
                                onChange={(v) => row.setValue(lotId, v)}
                                min={row.min}
                                max={row.max}
                                step={row.step}
                            />
                        </td>
                    )
                })}

                {/* Visibility eye icon */}
                <td className="py-1 px-1 text-center">
                    {row.visKey != null ? (
                        <VisibilityToggle
                            visible={firstLotVis[row.visKey] !== false}
                            onClick={() => {
                                const newVal = firstLotVis[row.visKey] === false ? true : false
                                // Apply to all lots
                                lotIds.forEach((id) => {
                                    setLotVisibilityAction(id, row.visKey, newVal)
                                })
                            }}
                        />
                    ) : (
                        <span style={{ color: 'var(--ui-text-muted)' }}>--</span>
                    )}
                </td>
            </tr>
        ))}
    </>
    )
}

// ============================================
// MODEL SETUP SECTION
// ============================================

const ModelSetupSection = () => {
    const modelSetup = useModelSetup()
    const entityCount = useEntityCount()
    const setStreetEdge = useStore((s) => s.setStreetEdge)
    const setStreetType = useStore((s) => s.setStreetType)
    const addLot = useStore((s) => s.addLot)
    const removeLot = useStore((s) => s.removeLot)
    const lotIds = useLotIds()

    const handleAddLot = useCallback(() => {
        if (entityCount < 5) addLot()
    }, [entityCount, addLot])

    const handleRemoveLot = useCallback(() => {
        if (entityCount > 0) {
            const lastId = lotIds[lotIds.length - 1]
            removeLot(lastId)
        }
    }, [entityCount, lotIds, removeLot])

    const streetEdges = modelSetup.streetEdges ?? { front: true, left: false, right: false, rear: false }
    const streetTypes = modelSetup.streetTypes ?? { front: 'S1', left: 'S1', right: 'S2', rear: 'S3' }

    return (
        <Section title="Model Setup" icon={<Settings className="w-4 h-4" />} defaultOpen={true}>
            {/* Number of Lots */}
            <div className="mb-3">
                <label className="text-xs block mb-1" style={{ color: 'var(--ui-text-secondary)' }}>Number of Lots</label>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleRemoveLot}
                        disabled={entityCount <= 0}
                        className="p-1 rounded border hover-bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        style={{ borderColor: 'var(--ui-border)' }}
                    >
                        <Minus className="w-3.5 h-3.5" style={{ color: 'var(--ui-text-secondary)' }} />
                    </button>
                    <span className="text-sm font-semibold w-8 text-center" style={{ color: 'var(--ui-text-primary)' }}>{entityCount}</span>
                    <button
                        onClick={handleAddLot}
                        disabled={entityCount >= 5}
                        className="p-1 rounded border hover-bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        style={{ borderColor: 'var(--ui-border)' }}
                    >
                        <Plus className="w-3.5 h-3.5" style={{ color: 'var(--ui-text-secondary)' }} />
                    </button>
                </div>
            </div>

            {/* Street Edges */}
            <div className="mb-3">
                <label className="text-xs block mb-1" style={{ color: 'var(--ui-text-secondary)' }}>Street Edges</label>
                <div className="space-y-1.5">
                    {['front', 'left', 'right', 'rear'].map((edge) => (
                        <div key={edge} className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={streetEdges[edge] || false}
                                    onChange={(e) => setStreetEdge(edge, e.target.checked)}
                                    disabled={edge === 'front'}
                                    className="rounded accent-theme
                                               disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ backgroundColor: 'var(--ui-bg-secondary)', borderColor: 'var(--ui-border)' }}
                                />
                                <span className="text-xs capitalize" style={{ color: 'var(--ui-text-secondary)' }}>{edge}</span>
                            </label>
                            {streetEdges[edge] && (
                                <select
                                    value={streetTypes[edge] || 'S1'}
                                    onChange={(e) => setStreetType(edge, e.target.value)}
                                    className="text-xs rounded px-1.5 py-0.5
                                               focus:outline-none focus-ring-accent-1"
                                    style={{
                                        color: 'var(--ui-text-primary)',
                                        backgroundColor: 'var(--ui-bg-secondary)',
                                        borderWidth: '1px',
                                        borderStyle: 'solid',
                                        borderColor: 'var(--ui-border)',
                                    }}
                                >
                                    <option value="S1">S1</option>
                                    <option value="S2">S2</option>
                                    <option value="S3">S3</option>
                                </select>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </Section>
    )
}

// ============================================
// LAYERS SECTION
// ============================================

const LayersSection = () => {
    const layers = useStore((s) => s.viewSettings?.layers ?? {})
    const setLayer = useStore((s) => s.setLayer)

    const layerList = [
        { key: 'lotLines', label: 'Lot Lines' },
        { key: 'setbacks', label: 'Setbacks' },
        { key: 'accessorySetbacks', label: 'Accessory Setbacks' },
        { key: 'maxSetbacks', label: 'Max Setbacks' },
        { key: 'btzPlanes', label: 'BTZ Planes' },
        { key: 'buildings', label: 'Buildings' },
        { key: 'roof', label: 'Roof' },
        { key: 'maxHeightPlane', label: 'Max Height Plane' },
        { key: 'lotAccessArrows', label: 'Lot Access Arrows' },
        { key: 'dimensionsLotWidth', label: 'Dim: Lot Width' },
        { key: 'dimensionsLotDepth', label: 'Dim: Lot Depth' },
        { key: 'dimensionsSetbacks', label: 'Dim: Setbacks' },
        { key: 'dimensionsHeight', label: 'Dim: Height' },
        { key: 'grid', label: 'Grid' },
        { key: 'roadModule', label: 'Road Module' },
        { key: 'roadIntersections', label: 'Road Intersections' },
        { key: 'unifiedRoadPreview', label: 'Road: Unified Preview' },
        { key: 'annotationLabels', label: 'Annotation Labels' },
        { key: 'labelLotNames', label: '  Lot Names' },
        { key: 'labelLotEdges', label: '  Lot Edges' },
        { key: 'labelSetbacks', label: '  Setback Labels' },
        { key: 'labelMaxSetbacks', label: '  Max Setback Labels' },
        { key: 'labelRoadNames', label: '  Road Names' },
        { key: 'labelRoadZones', label: '  Road Zones' },
        { key: 'labelBuildings', label: '  Building Labels' },
        { key: 'origin', label: 'Origin' },
        { key: 'ground', label: 'Ground Plane' },
        { key: 'axes', label: 'Axes' },
        { key: 'gimbal', label: 'Gimbal' },
    ]

    return (
        <Section title="Layers" icon={<Layers className="w-4 h-4" />} defaultOpen={true}>
            <div className="space-y-1">
                {layerList.map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer py-0.5">
                        <input
                            type="checkbox"
                            checked={layers[key] !== false}
                            onChange={(e) => setLayer(key, e.target.checked)}
                            className="rounded accent-theme"
                            style={{ backgroundColor: 'var(--ui-bg-secondary)', borderColor: 'var(--ui-border)' }}
                        />
                        <span className="text-xs" style={{ color: 'var(--ui-text-secondary)' }}>{label}</span>
                    </label>
                ))}
            </div>
        </Section>
    )
}

// ============================================
// DISTRICT PARAMETERS SECTION
// ============================================

const DistrictParametersSection = () => {
    const districtParams = useDistrictParameters()
    const setDistrictParameter = useStore((s) => s.setDistrictParameter)
    const [collapsed, setCollapsed] = useState({})
    const toggle = (key) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))

    const dp = (path) => {
        const keys = path.split('.')
        let val = districtParams
        for (const k of keys) {
            val = val?.[k]
        }
        return val
    }

    return (
        <Section title="District Parameters" icon={<Building2 className="w-4 h-4" />} defaultOpen={false}>
            <p className="text-[10px] mb-2" style={{ color: 'var(--ui-text-muted)' }}>
                Informational reference data. Not visualized in the 3D scene.
            </p>

            {/* Lot Dimensions */}
            <div className="mb-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider mb-1 cursor-pointer select-none flex items-center gap-1"
                    style={{ color: 'var(--ui-text-muted)' }}
                    onClick={() => toggle('lotDimensions')}>
                    <ChevronDown className={`w-3 h-3 transition-transform ${collapsed.lotDimensions ? '-rotate-90' : ''}`} />
                    Lot Dimensions
                </h4>
                {!collapsed.lotDimensions && (
                <div className="space-y-1">
                    {[
                        { label: 'Lot Area (sf)', path: 'lotArea' },
                        { label: 'Lot Coverage (%)', path: 'lotCoverage' },
                        { label: 'Lot Width (ft)', path: 'lotWidth' },
                        { label: 'Lot Width at Setback (ft)', path: 'lotWidthAtSetback' },
                        { label: 'Lot Depth (ft)', path: 'lotDepth' },
                    ].map(({ label, path }) => (
                        <div key={path} className="flex items-center justify-between gap-2">
                            <span className="text-xs flex-shrink-0" style={{ color: 'var(--ui-text-secondary)' }}>{label}</span>
                            <MinMaxInput
                                min={dp(`${path}.min`)}
                                max={dp(`${path}.max`)}
                                onMinChange={(v) => setDistrictParameter(`${path}.min`, v)}
                                onMaxChange={(v) => setDistrictParameter(`${path}.max`, v)}
                            />
                        </div>
                    ))}
                </div>
                )}
            </div>

            {/* Setbacks - Principal */}
            <div className="mb-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider mb-1 cursor-pointer select-none flex items-center gap-1"
                    style={{ color: 'var(--ui-text-muted)' }}
                    onClick={() => toggle('setbacksPrincipal')}>
                    <ChevronDown className={`w-3 h-3 transition-transform ${collapsed.setbacksPrincipal ? '-rotate-90' : ''}`} />
                    Setbacks - Principal
                </h4>
                {!collapsed.setbacksPrincipal && (
                <div className="space-y-1">
                    {[
                        { label: 'Front (ft)', path: 'setbacksPrincipal.front' },
                        { label: 'Rear (ft)', path: 'setbacksPrincipal.rear' },
                        { label: 'Side, Interior (ft)', path: 'setbacksPrincipal.sideInterior' },
                        { label: 'Side, Street (ft)', path: 'setbacksPrincipal.sideStreet' },
                        { label: 'Between Buildings (ft)', path: 'setbacksPrincipal.distanceBetweenBuildings' },
                    ].map(({ label, path }) => (
                        <div key={path} className="flex items-center justify-between gap-2">
                            <span className="text-xs flex-shrink-0" style={{ color: 'var(--ui-text-secondary)' }}>{label}</span>
                            <MinMaxInput
                                min={dp(`${path}.min`)}
                                max={dp(`${path}.max`)}
                                onMinChange={(v) => setDistrictParameter(`${path}.min`, v)}
                                onMaxChange={(v) => setDistrictParameter(`${path}.max`, v)}
                            />
                        </div>
                    ))}
                    {/* BTZ fields (single value, not min/max) */}
                    {[
                        { label: 'BTZ - Front (%)', path: 'setbacksPrincipal.btzFront' },
                        { label: 'BTZ - Side, Street (%)', path: 'setbacksPrincipal.btzSideStreet' },
                    ].map(({ label, path }) => (
                        <div key={path} className="flex items-center justify-between gap-2">
                            <span className="text-xs flex-shrink-0" style={{ color: 'var(--ui-text-secondary)' }}>{label}</span>
                            <input
                                type="number"
                                value={dp(path) ?? ''}
                                onChange={(e) => setDistrictParameter(path, e.target.value === '' ? null : parseFloat(e.target.value))}
                                min={0}
                                max={100}
                                className="w-16 text-xs text-right rounded px-1 py-0.5
                                           focus:outline-none focus-ring-accent-1"
                                style={{
                                    color: 'var(--ui-text-primary)',
                                    backgroundColor: 'var(--ui-bg-secondary)',
                                    borderWidth: '1px',
                                    borderStyle: 'solid',
                                    borderColor: 'var(--ui-border)',
                                }}
                            />
                        </div>
                    ))}
                </div>
                )}
            </div>

            {/* Setbacks - Accessory */}
            <div className="mb-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider mb-1 cursor-pointer select-none flex items-center gap-1"
                    style={{ color: 'var(--ui-text-muted)' }}
                    onClick={() => toggle('setbacksAccessory')}>
                    <ChevronDown className={`w-3 h-3 transition-transform ${collapsed.setbacksAccessory ? '-rotate-90' : ''}`} />
                    Setbacks - Accessory
                </h4>
                {!collapsed.setbacksAccessory && (
                <div className="space-y-1">
                    {[
                        { label: 'Front (ft)', path: 'setbacksAccessory.front' },
                        { label: 'Rear (ft)', path: 'setbacksAccessory.rear' },
                        { label: 'Side, Interior (ft)', path: 'setbacksAccessory.sideInterior' },
                        { label: 'Side, Street (ft)', path: 'setbacksAccessory.sideStreet' },
                        { label: 'Between Buildings (ft)', path: 'setbacksAccessory.distanceBetweenBuildings' },
                    ].map(({ label, path }) => (
                        <div key={path} className="flex items-center justify-between gap-2">
                            <span className="text-xs flex-shrink-0" style={{ color: 'var(--ui-text-secondary)' }}>{label}</span>
                            <MinMaxInput
                                min={dp(`${path}.min`)}
                                max={dp(`${path}.max`)}
                                onMinChange={(v) => setDistrictParameter(`${path}.min`, v)}
                                onMaxChange={(v) => setDistrictParameter(`${path}.max`, v)}
                            />
                        </div>
                    ))}
                </div>
                )}
            </div>

            {/* Structures */}
            <div className="mb-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider mb-1 cursor-pointer select-none flex items-center gap-1"
                    style={{ color: 'var(--ui-text-muted)' }}
                    onClick={() => toggle('structures')}>
                    <ChevronDown className={`w-3 h-3 transition-transform ${collapsed.structures ? '-rotate-90' : ''}`} />
                    Structures
                </h4>
                {!collapsed.structures && (
                <div>
                {['principal', 'accessory'].map((type) => (
                    <div key={type} className="mb-2">
                        <span className="text-[10px] capitalize font-medium" style={{ color: 'var(--ui-text-secondary)' }}>{type}</span>
                        <div className="space-y-1 mt-1 ml-2">
                            {[
                                { label: 'Height (ft)', path: `structures.${type}.height` },
                                { label: 'Stories', path: `structures.${type}.stories` },
                                { label: '1st Story Height (ft)', path: `structures.${type}.firstStoryHeight` },
                                { label: 'Upper Story Height (ft)', path: `structures.${type}.upperStoryHeight` },
                            ].map(({ label, path }) => (
                                <div key={path} className="flex items-center justify-between gap-2">
                                    <span className="text-xs flex-shrink-0" style={{ color: 'var(--ui-text-secondary)' }}>{label}</span>
                                    <MinMaxInput
                                        min={dp(`${path}.min`)}
                                        max={dp(`${path}.max`)}
                                        onMinChange={(v) => setDistrictParameter(`${path}.min`, v)}
                                        onMaxChange={(v) => setDistrictParameter(`${path}.max`, v)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                </div>
                )}
            </div>

            {/* Lot Access */}
            <div className="mb-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider mb-1 cursor-pointer select-none flex items-center gap-1"
                    style={{ color: 'var(--ui-text-muted)' }}
                    onClick={() => toggle('lotAccess')}>
                    <ChevronDown className={`w-3 h-3 transition-transform ${collapsed.lotAccess ? '-rotate-90' : ''}`} />
                    Lot Access
                </h4>
                {!collapsed.lotAccess && (
                <div className="space-y-1">
                    {[
                        { label: 'Primary Street', path: 'lotAccess.primaryStreet' },
                        { label: 'Secondary Street', path: 'lotAccess.secondaryStreet' },
                        { label: 'Rear Alley', path: 'lotAccess.rearAlley' },
                        { label: 'Shared Drive', path: 'lotAccess.sharedDrive' },
                    ].map(({ label, path }) => (
                        <div key={path} className="flex items-center justify-between gap-2">
                            <span className="text-xs flex-shrink-0" style={{ color: 'var(--ui-text-secondary)' }}>{label}</span>
                            <div className="flex items-center gap-2">
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={dp(`${path}.permitted`) || false}
                                        onChange={(e) => setDistrictParameter(`${path}.permitted`, e.target.checked)}
                                        className="rounded accent-theme"
                                        style={{ backgroundColor: 'var(--ui-bg-secondary)', borderColor: 'var(--ui-border)' }}
                                    />
                                    <span className="text-[10px]" style={{ color: 'var(--ui-text-muted)' }}>Permitted</span>
                                </label>
                                <MinMaxInput
                                    min={dp(`${path}.min`)}
                                    max={dp(`${path}.max`)}
                                    onMinChange={(v) => setDistrictParameter(`${path}.min`, v)}
                                    onMaxChange={(v) => setDistrictParameter(`${path}.max`, v)}
                                />
                            </div>
                        </div>
                    ))}
                </div>
                )}
            </div>

            {/* Parking Locations */}
            <div className="mb-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider mb-1 cursor-pointer select-none flex items-center gap-1"
                    style={{ color: 'var(--ui-text-muted)' }}
                    onClick={() => toggle('parkingLocations')}>
                    <ChevronDown className={`w-3 h-3 transition-transform ${collapsed.parkingLocations ? '-rotate-90' : ''}`} />
                    Parking Locations
                </h4>
                {!collapsed.parkingLocations && (
                <div className="space-y-1">
                    {[
                        { label: 'Front', path: 'parkingLocations.front' },
                        { label: 'Side, Interior', path: 'parkingLocations.sideInterior' },
                        { label: 'Side, Street', path: 'parkingLocations.sideStreet' },
                        { label: 'Rear', path: 'parkingLocations.rear' },
                    ].map(({ label, path }) => (
                        <div key={path} className="flex items-center justify-between gap-2">
                            <span className="text-xs flex-shrink-0" style={{ color: 'var(--ui-text-secondary)' }}>{label}</span>
                            <div className="flex items-center gap-2">
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={dp(`${path}.permitted`) || false}
                                        onChange={(e) => setDistrictParameter(`${path}.permitted`, e.target.checked)}
                                        className="rounded accent-theme"
                                        style={{ backgroundColor: 'var(--ui-bg-secondary)', borderColor: 'var(--ui-border)' }}
                                    />
                                    <span className="text-[10px]" style={{ color: 'var(--ui-text-muted)' }}>Permitted</span>
                                </label>
                                <MinMaxInput
                                    min={dp(`${path}.min`)}
                                    max={dp(`${path}.max`)}
                                    onMinChange={(v) => setDistrictParameter(`${path}.min`, v)}
                                    onMaxChange={(v) => setDistrictParameter(`${path}.max`, v)}
                                />
                            </div>
                        </div>
                    ))}
                </div>
                )}
            </div>
        </Section>
    )
}

// ============================================
// BUILDING & ROOF SECTION
// ============================================

const BuildingRoofSection = () => {
    const lotIds = useLotIds()
    const activeLotId = useActiveLotId()
    const lots = useStore((s) => s.entities?.lots ?? {})
    const setEntityRoofSetting = useStore((s) => s.setEntityRoofSetting)
    const selectEntity = useStore((s) => s.selectEntity)

    // Use active lot, or fall back to first lot
    const targetLotId = activeLotId || lotIds[0]
    const lot = lots[targetLotId]

    if (!lot || lotIds.length === 0) {
        return (
            <Section title="Building & Roof" icon={<Building2 className="w-4 h-4" />} defaultOpen={true}>
                <p className="text-xs italic" style={{ color: 'var(--ui-text-muted)' }}>No lots available. Add a lot first.</p>
            </Section>
        )
    }

    const lotLabel = activeLotId
        ? `Lot ${lotIds.indexOf(activeLotId) + 1}`
        : `Lot 1 (default)`

    const renderBuildingRoofControls = (buildingType, label) => {
        const building = lot.buildings?.[buildingType]
        if (!building) return null

        const roof = building.roof || {}
        const totalHeight = building.firstFloorHeight +
            (building.upperFloorHeight * Math.max(0, (building.stories || 1) - 1))

        return (
            <div className="mb-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--ui-text-muted)' }}>{label}</h4>
                <div className="space-y-2 ml-1">
                    {/* Roof Type */}
                    <div>
                        <label className="text-[10px] block mb-0.5" style={{ color: 'var(--ui-text-secondary)' }}>Roof Type</label>
                        <select
                            value={roof.type || 'flat'}
                            onChange={(e) => setEntityRoofSetting(targetLotId, buildingType, 'type', e.target.value)}
                            className="w-full text-xs rounded px-1.5 py-1
                                       focus:outline-none focus-ring-accent-1"
                            style={{
                                color: 'var(--ui-text-primary)',
                                backgroundColor: 'var(--ui-bg-secondary)',
                                borderWidth: '1px',
                                borderStyle: 'solid',
                                borderColor: 'var(--ui-border)',
                            }}
                        >
                            <option value="flat">Flat</option>
                            <option value="shed">Shed</option>
                            <option value="gabled">Gabled</option>
                            <option value="hipped">Hipped</option>
                        </select>
                    </div>

                    {/* Ridge Direction (gabled/hipped) */}
                    {(roof.type === 'gabled' || roof.type === 'hipped') && (
                        <div>
                            <label className="text-[10px] block mb-0.5" style={{ color: 'var(--ui-text-secondary)' }}>Ridge Direction</label>
                            <div className="flex gap-1">
                                {['x', 'y'].map((dir) => (
                                    <button
                                        key={dir}
                                        onClick={() => setEntityRoofSetting(targetLotId, buildingType, 'ridgeDirection', dir)}
                                        className="flex-1 text-[10px] px-1 py-1 rounded border transition-colors"
                                        style={(roof.ridgeDirection || 'x') === dir
                                            ? { backgroundColor: 'var(--ui-accent-muted)', borderColor: 'var(--ui-accent)', color: 'var(--ui-text-primary)' }
                                            : { backgroundColor: 'var(--ui-bg-secondary)', borderColor: 'var(--ui-border)', color: 'var(--ui-text-secondary)' }
                                        }
                                    >
                                        {dir.toUpperCase()}-Axis
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Shed Direction */}
                    {roof.type === 'shed' && (
                        <div>
                            <label className="text-[10px] block mb-0.5" style={{ color: 'var(--ui-text-secondary)' }}>Slope Direction</label>
                            <select
                                value={roof.shedDirection || '+y'}
                                onChange={(e) => setEntityRoofSetting(targetLotId, buildingType, 'shedDirection', e.target.value)}
                                className="w-full text-xs rounded px-1.5 py-1
                                           focus:outline-none focus-ring-accent-1"
                                style={{
                                    color: 'var(--ui-text-primary)',
                                    backgroundColor: 'var(--ui-bg-secondary)',
                                    borderWidth: '1px',
                                    borderStyle: 'solid',
                                    borderColor: 'var(--ui-border)',
                                }}
                            >
                                <option value="+x">+X (Left to Right)</option>
                                <option value="-x">-X (Right to Left)</option>
                                <option value="+y">+Y (Front to Back)</option>
                                <option value="-y">-Y (Back to Front)</option>
                            </select>
                        </div>
                    )}

                    {/* Override Height */}
                    {roof.type !== 'flat' && (
                        <div>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={roof.overrideHeight || false}
                                    onChange={(e) => setEntityRoofSetting(targetLotId, buildingType, 'overrideHeight', e.target.checked)}
                                    className="rounded accent-theme"
                                    style={{ backgroundColor: 'var(--ui-bg-secondary)', borderColor: 'var(--ui-border)' }}
                                />
                                <span className="text-[10px]" style={{ color: 'var(--ui-text-secondary)' }}>Override Height</span>
                            </label>
                            {roof.overrideHeight && (
                                <div className="flex items-center gap-1 mt-1">
                                    <input
                                        type="number"
                                        value={roof.ridgeHeight ?? Math.round(building.maxHeight ?? totalHeight)}
                                        onChange={(e) => setEntityRoofSetting(targetLotId, buildingType, 'ridgeHeight', parseFloat(e.target.value) || 0)}
                                        className="w-full text-xs rounded px-1 py-0.5
                                                   text-right focus:outline-none focus-ring-accent-1"
                                        style={{
                                            color: 'var(--ui-text-primary)',
                                            backgroundColor: 'var(--ui-bg-secondary)',
                                            borderWidth: '1px',
                                            borderStyle: 'solid',
                                            borderColor: 'var(--ui-border)',
                                        }}
                                        min={Math.round(totalHeight)}
                                        step={1}
                                    />
                                    <span className="text-[10px]" style={{ color: 'var(--ui-text-muted)' }}>ft</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <Section title="Building & Roof" icon={<Building2 className="w-4 h-4" />} defaultOpen={true}>
            {/* Active lot indicator */}
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs" style={{ color: 'var(--ui-text-secondary)' }}>Active: <strong style={{ color: 'var(--ui-text-primary)' }}>{lotLabel}</strong></span>
                {lotIds.length > 1 && (
                    <select
                        value={targetLotId}
                        onChange={(e) => selectEntity(e.target.value)}
                        className="text-xs rounded px-1.5 py-0.5
                                   focus:outline-none focus-ring-accent-1"
                        style={{
                            color: 'var(--ui-text-primary)',
                            backgroundColor: 'var(--ui-bg-secondary)',
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            borderColor: 'var(--ui-border)',
                        }}
                    >
                        {lotIds.map((id, i) => (
                            <option key={id} value={id}>Lot {i + 1}</option>
                        ))}
                    </select>
                )}
            </div>

            {renderBuildingRoofControls('principal', 'Principal Building')}
            {renderBuildingRoofControls('accessory', 'Accessory Building')}
        </Section>
    )
}

// ============================================
// ROAD MODULE(S) SECTION
// ============================================

const RoadModulesSection = () => {
    const roadModules = useRoadModules()
    const addEntityRoadModule = useStore((s) => s.addEntityRoadModule)
    const removeEntityRoadModule = useStore((s) => s.removeEntityRoadModule)
    const updateEntityRoadModule = useStore((s) => s.updateEntityRoadModule)
    const changeEntityRoadModuleType = useStore((s) => s.changeEntityRoadModuleType)
    const modelSetup = useModelSetup()
    const streetEdges = modelSetup.streetEdges ?? { front: true, left: false, right: false, rear: false }

    const roadEntries = Object.entries(roadModules)

    // Directions with streets enabled
    const enabledDirections = Object.entries(streetEdges)
        .filter(([, enabled]) => enabled)
        .map(([edge]) => edge)

    return (
        <Section title="Road Module(s)" icon={<Route className="w-4 h-4" />} defaultOpen={true}>
            {/* Add road module button */}
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xs" style={{ color: 'var(--ui-text-secondary)' }}>Add road for:</span>
                {enabledDirections.map((dir) => (
                    <button
                        key={dir}
                        onClick={() => addEntityRoadModule(dir, modelSetup.streetTypes?.[dir] || 'S1')}
                        className="text-[10px] px-2 py-0.5
                                   rounded transition-colors capitalize"
                        style={{
                            backgroundColor: 'var(--ui-accent-muted)',
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            borderColor: 'var(--ui-accent)',
                            color: 'var(--ui-accent)',
                        }}
                    >
                        {dir}
                    </button>
                ))}
            </div>

            {/* List of road modules */}
            {roadEntries.length === 0 && (
                <p className="text-xs italic" style={{ color: 'var(--ui-text-muted)' }}>No road modules yet. Add one above.</p>
            )}

            {roadEntries.map(([roadId, road]) => (
                <RoadModuleCard
                    key={roadId}
                    road={road}
                    onRemove={() => removeEntityRoadModule(roadId)}
                    onUpdate={(key, val) => updateEntityRoadModule(roadId, key, val)}
                    onChangeType={(newType) => changeEntityRoadModuleType(roadId, newType)}
                />
            ))}
        </Section>
    )
}

// ============================================
// ROAD MODULE STYLES SECTION
// ============================================

/** Simple label + control row */
const ControlRow = ({ label, children }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
        <label style={{ fontSize: '10px', fontWeight: 500, color: 'var(--ui-text-secondary)' }}>{label}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{children}</div>
    </div>
)

const RoadModuleStylesSection = () => {
    const roadModuleStyles = useStore((s) => s.roadModuleStyles)
    const setRoadModuleStyle = useStore((s) => s.setRoadModuleStyle)
    const setAllRoadLineWidths = useStore((s) => s.setAllRoadLineWidths)

    if (!roadModuleStyles) return null

    // Use roadWidth lineWidth as the reference for the universal slider
    const universalLineWidth = roadModuleStyles.roadWidth?.lineWidth ?? 1

    return (
        <Section title="Road Module Styles" icon={<Palette className="w-4 h-4" />} defaultOpen={false}>
            {/* Universal Line Width */}
            <div style={{ marginBottom: '12px' }}>
                <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px', color: 'var(--ui-text-muted)' }}>All Lines</span>
                <ControlRow label="Line Width">
                    <SliderInput value={universalLineWidth} onChange={(v) => setAllRoadLineWidths(v)} min={0.5} max={5} step={0.5} />
                </ControlRow>
            </div>

            {/* Right-of-Way Lines */}
            <div style={{ paddingTop: '8px', marginBottom: '12px', borderTop: '1px solid var(--ui-bg-primary)' }}>
                <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px', color: 'var(--ui-text-muted)' }}>Right-of-Way Lines</span>
                <ControlRow label="Color">
                    <ColorPicker value={roadModuleStyles.rightOfWay?.color ?? '#000000'} onChange={(c) => setRoadModuleStyle('rightOfWay', 'color', c)} />
                </ControlRow>
                <ControlRow label="Width">
                    <SliderInput value={roadModuleStyles.rightOfWay?.width ?? 1} onChange={(v) => setRoadModuleStyle('rightOfWay', 'width', v)} min={0.5} max={5} step={0.5} />
                </ControlRow>
                <ControlRow label="Opacity">
                    <SliderInput value={roadModuleStyles.rightOfWay?.opacity ?? 1} onChange={(v) => setRoadModuleStyle('rightOfWay', 'opacity', v)} min={0} max={1} step={0.05} />
                </ControlRow>
                <div style={{ paddingTop: '4px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer', color: 'var(--ui-text-muted)' }}>
                        <input
                            type="checkbox"
                            checked={roadModuleStyles.rightOfWay?.dashed ?? true}
                            onChange={(e) => setRoadModuleStyle('rightOfWay', 'dashed', e.target.checked)}
                            style={{ borderColor: 'var(--ui-border)' }}
                        />
                        Dashed
                    </label>
                </div>
            </div>

            {/* Road Surface */}
            <div style={{ paddingTop: '8px', marginBottom: '12px', borderTop: '1px solid var(--ui-bg-primary)' }}>
                <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px', color: 'var(--ui-text-muted)' }}>Road Surface</span>
                <ControlRow label="Line Color">
                    <ColorPicker value={roadModuleStyles.roadWidth?.lineColor ?? '#000000'} onChange={(c) => setRoadModuleStyle('roadWidth', 'lineColor', c)} />
                </ControlRow>
                <ControlRow label="Line Width">
                    <SliderInput value={roadModuleStyles.roadWidth?.lineWidth ?? 1} onChange={(v) => setRoadModuleStyle('roadWidth', 'lineWidth', v)} min={0.5} max={5} step={0.5} />
                </ControlRow>
                <ControlRow label="Fill Color">
                    <ColorPicker value={roadModuleStyles.roadWidth?.fillColor ?? '#666666'} onChange={(c) => setRoadModuleStyle('roadWidth', 'fillColor', c)} />
                </ControlRow>
                <ControlRow label="Fill Opacity">
                    <SliderInput value={roadModuleStyles.roadWidth?.fillOpacity ?? 0.8} onChange={(v) => setRoadModuleStyle('roadWidth', 'fillOpacity', v)} min={0} max={1} step={0.05} />
                </ControlRow>
            </div>

            {/* Left Side Elements */}
            <div style={{ paddingTop: '8px', marginBottom: '12px', borderTop: '1px solid var(--ui-bg-primary)' }}>
                <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--ui-accent)' }}>Left Side</span>
                {[
                    { key: 'leftParking', label: 'Parking', defaultFill: '#888888' },
                    { key: 'leftVerge', label: 'Verge', defaultFill: '#c4a77d' },
                    { key: 'leftSidewalk', label: 'Sidewalk', defaultFill: '#90EE90' },
                    { key: 'leftTransitionZone', label: 'Transition Zone', defaultFill: '#98D8AA' },
                ].map(({ key, label, defaultFill }) => (
                    <div key={key} style={{ marginBottom: '12px', paddingLeft: '8px', borderLeft: '2px solid var(--ui-border)' }}>
                        <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px', color: 'var(--ui-text-muted)' }}>{label}</span>
                        <ControlRow label="Line Color">
                            <ColorPicker value={roadModuleStyles[key]?.lineColor ?? '#000000'} onChange={(c) => setRoadModuleStyle(key, 'lineColor', c)} />
                        </ControlRow>
                        <ControlRow label="Line Width">
                            <SliderInput value={roadModuleStyles[key]?.lineWidth ?? 1} onChange={(v) => setRoadModuleStyle(key, 'lineWidth', v)} min={0.5} max={5} step={0.5} />
                        </ControlRow>
                        <ControlRow label="Fill Color">
                            <ColorPicker value={roadModuleStyles[key]?.fillColor ?? defaultFill} onChange={(c) => setRoadModuleStyle(key, 'fillColor', c)} />
                        </ControlRow>
                        <ControlRow label="Fill Opacity">
                            <SliderInput value={roadModuleStyles[key]?.fillOpacity ?? 0.7} onChange={(v) => setRoadModuleStyle(key, 'fillOpacity', v)} min={0} max={1} step={0.05} />
                        </ControlRow>
                    </div>
                ))}
            </div>

            {/* Right Side Elements */}
            <div style={{ paddingTop: '8px', borderTop: '1px solid var(--ui-bg-primary)' }}>
                <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--ui-success, var(--ui-accent))' }}>Right Side</span>
                {[
                    { key: 'rightParking', label: 'Parking', defaultFill: '#888888' },
                    { key: 'rightVerge', label: 'Verge', defaultFill: '#c4a77d' },
                    { key: 'rightSidewalk', label: 'Sidewalk', defaultFill: '#90EE90' },
                    { key: 'rightTransitionZone', label: 'Transition Zone', defaultFill: '#98D8AA' },
                ].map(({ key, label, defaultFill }) => (
                    <div key={key} style={{ marginBottom: '12px', paddingLeft: '8px', borderLeft: '2px solid var(--ui-border)' }}>
                        <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px', color: 'var(--ui-text-muted)' }}>{label}</span>
                        <ControlRow label="Line Color">
                            <ColorPicker value={roadModuleStyles[key]?.lineColor ?? '#000000'} onChange={(c) => setRoadModuleStyle(key, 'lineColor', c)} />
                        </ControlRow>
                        <ControlRow label="Line Width">
                            <SliderInput value={roadModuleStyles[key]?.lineWidth ?? 1} onChange={(v) => setRoadModuleStyle(key, 'lineWidth', v)} min={0.5} max={5} step={0.5} />
                        </ControlRow>
                        <ControlRow label="Fill Color">
                            <ColorPicker value={roadModuleStyles[key]?.fillColor ?? defaultFill} onChange={(c) => setRoadModuleStyle(key, 'fillColor', c)} />
                        </ControlRow>
                        <ControlRow label="Fill Opacity">
                            <SliderInput value={roadModuleStyles[key]?.fillOpacity ?? 0.7} onChange={(v) => setRoadModuleStyle(key, 'fillOpacity', v)} min={0} max={1} step={0.05} />
                        </ControlRow>
                    </div>
                ))}
            </div>
        </Section>
    )
}

const RoadModuleCard = ({ road, onRemove, onUpdate, onChangeType }) => {
    const [isOpen, setIsOpen] = useState(true)

    // Calculate available space
    const rightOfWay = road.rightOfWay ?? 50
    const roadWidth = road.roadWidth ?? 24
    const availablePerSide = (rightOfWay - roadWidth) / 2

    const leftUsed = (road.leftParking || 0) + (road.leftVerge || 0) +
        (road.leftSidewalk || 0) + (road.leftTransitionZone || 0)
    const rightUsed = (road.rightParking || 0) + (road.rightVerge || 0) +
        (road.rightSidewalk || 0) + (road.rightTransitionZone || 0)
    const leftRemaining = availablePerSide - leftUsed
    const rightRemaining = availablePerSide - rightUsed

    return (
        <div className="rounded mb-2 overflow-hidden" style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--ui-border)' }}>
            {/* Card header */}
            <div
                className="flex items-center justify-between px-2 py-1.5"
                style={{ backgroundColor: 'var(--ui-bg-secondary)', borderBottom: '1px solid var(--ui-border)' }}
            >
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-1.5 text-xs font-medium"
                    style={{ color: 'var(--ui-text-primary)' }}
                >
                    <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                    <span className="capitalize">{road.direction}</span>
                    <span className="font-normal" style={{ color: 'var(--ui-text-muted)' }}>({road.type || 'S1'})</span>
                </button>
                <button
                    onClick={onRemove}
                    className="p-0.5 transition-colors hover-text-error"
                    style={{ color: 'var(--ui-text-muted)' }}
                    title="Remove road module"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>

            {isOpen && (
                <div className="p-2 space-y-2">
                    {/* Type selector */}
                    <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: 'var(--ui-text-secondary)' }}>Type</span>
                        <select
                            value={road.type || 'S1'}
                            onChange={(e) => onChangeType(e.target.value)}
                            className="text-xs rounded px-1.5 py-0.5
                                       focus:outline-none focus-ring-accent-1"
                            style={{
                                color: 'var(--ui-text-primary)',
                                backgroundColor: 'var(--ui-bg-secondary)',
                                borderWidth: '1px',
                                borderStyle: 'solid',
                                borderColor: 'var(--ui-border)',
                            }}
                        >
                            <option value="S1">S1 (50&apos; ROW)</option>
                            <option value="S2">S2 (40&apos; ROW)</option>
                            <option value="S3">S3 (20&apos; ROW)</option>
                        </select>
                    </div>

                    {/* ROW and Road Width */}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-[10px] block mb-0.5" style={{ color: 'var(--ui-text-secondary)' }}>Right-of-Way</label>
                            <div className="flex items-center gap-1">
                                <input
                                    type="number"
                                    value={road.rightOfWay ?? 50}
                                    onChange={(e) => onUpdate('rightOfWay', parseFloat(e.target.value) || 0)}
                                    className="w-full text-xs text-right rounded px-1 py-0.5
                                               focus:outline-none focus-ring-accent-1"
                                    style={{
                                        color: 'var(--ui-text-primary)',
                                        backgroundColor: 'var(--ui-bg-secondary)',
                                        borderWidth: '1px',
                                        borderStyle: 'solid',
                                        borderColor: 'var(--ui-border)',
                                    }}
                                />
                                <span className="text-[10px]" style={{ color: 'var(--ui-text-muted)' }}>ft</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] block mb-0.5" style={{ color: 'var(--ui-text-secondary)' }}>Road Width</label>
                            <div className="flex items-center gap-1">
                                <input
                                    type="number"
                                    value={road.roadWidth ?? 24}
                                    onChange={(e) => onUpdate('roadWidth', parseFloat(e.target.value) || 0)}
                                    className="w-full text-xs text-right rounded px-1 py-0.5
                                               focus:outline-none focus-ring-accent-1"
                                    style={{
                                        color: roadWidth > rightOfWay ? 'var(--ui-error)' : 'var(--ui-text-primary)',
                                        backgroundColor: 'var(--ui-bg-secondary)',
                                        borderWidth: '1px',
                                        borderStyle: 'solid',
                                        borderColor: roadWidth > rightOfWay ? 'var(--ui-error)' : 'var(--ui-border)',
                                    }}
                                />
                                <span className="text-[10px]" style={{ color: 'var(--ui-text-muted)' }}>ft</span>
                            </div>
                        </div>
                    </div>
                    {roadWidth > rightOfWay && (
                        <div
                            className="text-[10px] px-2 py-1 rounded"
                            style={{ color: 'var(--ui-error)', backgroundColor: 'var(--ui-error-muted)' }}
                        >
                            Road width cannot exceed right-of-way
                        </div>
                    )}

                    {/* Left Side */}
                    <div className="pt-2" style={{ borderTop: '1px solid var(--ui-border)' }}>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--ui-text-muted)' }}>Left Side</span>
                            <span
                                className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                                style={
                                    leftRemaining < 0
                                        ? { backgroundColor: 'var(--ui-error-muted)', color: 'var(--ui-error)' }
                                        : leftRemaining === 0
                                            ? { backgroundColor: 'var(--ui-warning-muted)', color: 'var(--ui-warning)' }
                                            : { backgroundColor: 'var(--ui-success-muted)', color: 'var(--ui-success)' }
                                }
                            >
                                {leftRemaining.toFixed(1)}' left
                            </span>
                        </div>
                        {[
                            { key: 'leftParking', label: 'Parking' },
                            { key: 'leftVerge', label: 'Verge' },
                            { key: 'leftSidewalk', label: 'Sidewalk' },
                            { key: 'leftTransitionZone', label: 'Transition' },
                        ].map(({ key, label }) => (
                            <div key={key} className="flex items-center justify-between py-0.5">
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={road[key] != null}
                                        onChange={(e) => onUpdate(key, e.target.checked ? 8 : null)}
                                        className="rounded accent-theme"
                                        style={{ backgroundColor: 'var(--ui-bg-secondary)', borderColor: 'var(--ui-border)' }}
                                    />
                                    <span className="text-xs" style={{ color: 'var(--ui-text-secondary)' }}>{label}</span>
                                </label>
                                {road[key] != null && (
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            value={road[key] ?? 0}
                                            onChange={(e) => onUpdate(key, parseFloat(e.target.value) || 0)}
                                            className="w-14 text-xs text-right rounded px-1 py-0.5
                                                       focus:outline-none focus-ring-accent-1"
                                            style={{
                                                color: 'var(--ui-text-primary)',
                                                backgroundColor: 'var(--ui-bg-secondary)',
                                                borderWidth: '1px',
                                                borderStyle: 'solid',
                                                borderColor: 'var(--ui-border)',
                                            }}
                                        />
                                        <span className="text-[10px]" style={{ color: 'var(--ui-text-muted)' }}>ft</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Right Side */}
                    <div className="pt-2" style={{ borderTop: '1px solid var(--ui-border)' }}>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--ui-text-muted)' }}>Right Side</span>
                            <span
                                className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                                style={
                                    rightRemaining < 0
                                        ? { backgroundColor: 'var(--ui-error-muted)', color: 'var(--ui-error)' }
                                        : rightRemaining === 0
                                            ? { backgroundColor: 'var(--ui-warning-muted)', color: 'var(--ui-warning)' }
                                            : { backgroundColor: 'var(--ui-success-muted)', color: 'var(--ui-success)' }
                                }
                            >
                                {rightRemaining.toFixed(1)}' left
                            </span>
                        </div>
                        {[
                            { key: 'rightParking', label: 'Parking' },
                            { key: 'rightVerge', label: 'Verge' },
                            { key: 'rightSidewalk', label: 'Sidewalk' },
                            { key: 'rightTransitionZone', label: 'Transition' },
                        ].map(({ key, label }) => (
                            <div key={key} className="flex items-center justify-between py-0.5">
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={road[key] != null}
                                        onChange={(e) => onUpdate(key, e.target.checked ? 8 : null)}
                                        className="rounded accent-theme"
                                        style={{ backgroundColor: 'var(--ui-bg-secondary)', borderColor: 'var(--ui-border)' }}
                                    />
                                    <span className="text-xs" style={{ color: 'var(--ui-text-secondary)' }}>{label}</span>
                                </label>
                                {road[key] != null && (
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            value={road[key] ?? 0}
                                            onChange={(e) => onUpdate(key, parseFloat(e.target.value) || 0)}
                                            className="w-14 text-xs text-right rounded px-1 py-0.5
                                                       focus:outline-none focus-ring-accent-1"
                                            style={{
                                                color: 'var(--ui-text-primary)',
                                                backgroundColor: 'var(--ui-bg-secondary)',
                                                borderWidth: '1px',
                                                borderStyle: 'solid',
                                                borderColor: 'var(--ui-border)',
                                            }}
                                        />
                                        <span className="text-[10px]" style={{ color: 'var(--ui-text-muted)' }}>ft</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

// ============================================
// VIEWS SECTION (simplified StateManager)
// ============================================

const ViewsSection = () => {
    const savedViews = useStore((s) => s.savedViews ?? {})
    const setSavedView = useStore((s) => s.setSavedView)
    const viewSettings = useStore((s) => s.viewSettings)

    const handleSaveView = useCallback((slot) => {
        setSavedView(slot, {
            cameraView: viewSettings.cameraView,
            projection: viewSettings.projection,
            layers: { ...viewSettings.layers },
            savedAt: new Date().toISOString(),
        })
    }, [setSavedView, viewSettings])

    const handleLoadView = useCallback((slot) => {
        const saved = savedViews[slot]
        if (!saved) return
        // Restore via individual store actions
        const store = useStore.getState()
        if (saved.cameraView) store.setCameraView(saved.cameraView)
        if (saved.projection) store.setProjection(saved.projection)
        if (saved.layers) {
            Object.entries(saved.layers).forEach(([key, val]) => {
                store.setLayer(key, val)
            })
        }
    }, [savedViews])

    return (
        <Section title="Views" defaultOpen={false}>
            <div className="space-y-1.5">
                {[1, 2, 3, 4, 5].map((slot) => {
                    const saved = savedViews[slot]
                    return (
                        <div key={slot} className="flex items-center gap-1.5">
                            <span className="text-xs w-6" style={{ color: 'var(--ui-text-secondary)' }}>#{slot}</span>
                            <button
                                onClick={() => handleSaveView(slot)}
                                className="text-[10px] px-2 py-0.5 rounded hover-bg-primary transition-colors"
                                style={{
                                    backgroundColor: 'var(--ui-bg-secondary)',
                                    borderWidth: '1px',
                                    borderStyle: 'solid',
                                    borderColor: 'var(--ui-border)',
                                    color: 'var(--ui-text-secondary)',
                                }}
                            >
                                Save
                            </button>
                            <button
                                onClick={() => handleLoadView(slot)}
                                disabled={!saved}
                                className="text-[10px] px-2 py-0.5
                                           rounded transition-colors
                                           disabled:opacity-30 disabled:cursor-not-allowed"
                                style={{
                                    backgroundColor: 'var(--ui-accent-muted)',
                                    borderWidth: '1px',
                                    borderStyle: 'solid',
                                    borderColor: 'var(--ui-accent)',
                                    color: 'var(--ui-accent)',
                                }}
                            >
                                Load
                            </button>
                            {saved && (
                                <>
                                    <span className="text-[9px] flex-1 truncate" style={{ color: 'var(--ui-text-muted)' }}>
                                        {saved.cameraView} / {saved.projection?.slice(0, 5)}
                                    </span>
                                    <button
                                        onClick={() => setSavedView(slot, null)}
                                        className="p-0.5 transition-colors hover-text-error"
                                        style={{ color: 'var(--ui-text-muted)' }}
                                        title="Clear saved view"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </>
                            )}
                        </div>
                    )
                })}
            </div>
        </Section>
    )
}

// ============================================
// INLINE STYLE CONTROLS (per-lot style editing)
// ============================================

const InlineStyleControls = ({ lotId, category, style }) => {
    const setEntityStyle = useStore((s) => s.setEntityStyle)
    const applyStyleToAllLots = useStore((s) => s.applyStyleToAllLots)

    if (!style) return null

    const handleChange = (property, value) => {
        setEntityStyle(lotId, category, property, value)
    }

    // Mesh-only categories: only color + opacity (no line width/dashed)
    const isMeshCategory = category === 'btzPlanes' || category === 'lotAccessArrows'

    return (
        <div
            className="rounded p-2 mt-1 space-y-1.5"
            style={{
                backgroundColor: 'var(--ui-bg-secondary)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'var(--ui-border)',
            }}
        >
            {isMeshCategory ? (
                <div className="space-y-1">
                    <ColorPicker
                        label="Color"
                        value={style.color ?? '#000000'}
                        onChange={(v) => handleChange('color', v)}
                    />
                    <SliderInput
                        label="Opacity"
                        value={style.opacity ?? 1}
                        onChange={(v) => handleChange('opacity', v)}
                        min={0}
                        max={1}
                        step={0.05}
                    />
                </div>
            ) : (
                <LineStyleSelector
                    style={{
                        color: style.color ?? '#000000',
                        width: style.width ?? 1,
                        opacity: style.opacity ?? 1,
                        dashed: style.dashed ?? false,
                    }}
                    onChange={handleChange}
                    showDash={category !== 'buildingFaces' && category !== 'lotFill'}
                />
            )}
            {/* Apply to all lots button */}
            <button
                onClick={() => {
                    // Apply all current style properties to all lots
                    Object.entries(style).forEach(([prop, val]) => {
                        if (prop !== 'overrides') {
                            applyStyleToAllLots(category, prop, val)
                        }
                    })
                }}
                className="w-full text-[10px] px-2 py-0.5
                           rounded transition-colors"
                style={{
                    backgroundColor: 'var(--ui-accent-muted)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: 'var(--ui-accent)',
                    color: 'var(--ui-accent)',
                }}
            >
                Apply to All Lots
            </button>
        </div>
    )
}

// ============================================
// MODEL PARAMETERS SECTION (with inline styles)
// ============================================

const ModelParametersSection = () => {
    const lotIds = useLotIds()
    const [styleCategory, setStyleCategory] = useState(null)
    const [styleLotId, setStyleLotId] = useState(null)
    const entityStyles = useStore((s) => s.entityStyles ?? {})
    const duplicateLot = useStore((s) => s.duplicateLot)
    const removeLot = useStore((s) => s.removeLot)
    const selectEntity = useStore((s) => s.selectEntity)
    const activeLotId = useActiveLotId()

    // Lot header with duplicate/delete actions
    const renderLotHeader = () => {
        if (lotIds.length === 0) return null
        return (
            <div className="flex items-center gap-1 mb-2 flex-wrap">
                {lotIds.map((id, i) => (
                    <div key={id} className="flex items-center gap-0.5">
                        <button
                            onClick={() => selectEntity(id)}
                            className="text-xs px-2 py-0.5 rounded border transition-colors"
                            style={activeLotId === id
                                ? { backgroundColor: 'var(--ui-accent-muted)', borderColor: 'var(--ui-accent)', color: 'var(--ui-text-primary)' }
                                : { backgroundColor: 'var(--ui-bg-secondary)', borderColor: 'var(--ui-border)', color: 'var(--ui-text-secondary)' }
                            }
                        >
                            Lot {i + 1}
                        </button>
                        <button
                            onClick={() => duplicateLot(id)}
                            className="p-0.5 transition-colors hover-text-accent"
                            style={{ color: 'var(--ui-text-muted)' }}
                            title="Duplicate lot"
                        >
                            <Copy className="w-3 h-3" />
                        </button>
                        {lotIds.length > 1 && (
                            <button
                                onClick={() => removeLot(id)}
                                className="p-0.5 transition-colors hover-text-error"
                                style={{ color: 'var(--ui-text-muted)' }}
                                title="Remove lot"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        )
    }

    // Toggle inline style for a section
    const toggleStyle = (cat, lotId) => {
        if (styleCategory === cat && styleLotId === lotId) {
            setStyleCategory(null)
            setStyleLotId(null)
        } else {
            setStyleCategory(cat)
            setStyleLotId(lotId)
        }
    }

    // Style categories that can be edited per-section
    const styleCategories = [
        { key: 'lotLines', label: 'Lot Lines' },
        { key: 'setbacks', label: 'Setbacks' },
        { key: 'accessorySetbacks', label: 'Accessory Setbacks' },
        { key: 'maxSetbacks', label: 'Max Setbacks' },
        { key: 'btzPlanes', label: 'BTZ Planes' },
        { key: 'lotAccessArrows', label: 'Lot Access Arrows' },
        { key: 'buildingEdges', label: 'Building Edges' },
        { key: 'buildingFaces', label: 'Building Faces' },
        { key: 'roofFaces', label: 'Roof' },
        { key: 'maxHeightPlane', label: 'Max Height Plane' },
    ]

    // Use first lot for style palette toggles
    const defaultStyleLotId = activeLotId || lotIds[0]

    return (
        <Section
            title="Model Parameters"
            defaultOpen={true}
            headerRight={
                defaultStyleLotId && (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {styleCategories.map(({ key }) => (
                            <StyleToggle
                                key={key}
                                isOpen={styleCategory === key && styleLotId === defaultStyleLotId}
                                onClick={() => toggleStyle(key, defaultStyleLotId)}
                            />
                        ))}
                    </div>
                )
            }
        >
            {/* Inline style editor (when a palette is toggled) */}
            {styleCategory && styleLotId && entityStyles[styleLotId] && (
                <div className="mb-2">
                    <div className="text-[10px] mb-1" style={{ color: 'var(--ui-text-muted)' }}>
                        Editing: <strong style={{ color: 'var(--ui-text-secondary)' }}>{styleCategories.find(c => c.key === styleCategory)?.label}</strong>
                        {' '}for Lot {lotIds.indexOf(styleLotId) + 1}
                    </div>
                    <InlineStyleControls
                        lotId={styleLotId}
                        category={styleCategory}
                        style={entityStyles[styleLotId][styleCategory]}
                    />
                </div>
            )}

            {renderLotHeader()}

            {lotIds.length > 0 ? (
                <ModelParametersTable />
            ) : (
                <p className="text-xs italic" style={{ color: 'var(--ui-text-muted)' }}>No lots. Use Model Setup to add lots.</p>
            )}
        </Section>
    )
}

// ============================================
// MAIN PANEL COMPONENT
// ============================================

// ============================================
// ANNOTATION SETTINGS SECTION
// ============================================

const AnnotationSettingsSection = () => {
    const annotationSettings = useStore((s) => s.annotationSettings)
    const setAnnotationSetting = useStore((s) => s.setAnnotationSetting)
    const resetAnnotationPositions = useStore((s) => s.resetAnnotationPositions)

    if (!annotationSettings) return null

    return (
        <Section title="Annotation Labels" icon={<Settings className="w-4 h-4" />} defaultOpen={false}>
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium" style={{ color: 'var(--ui-text-secondary)' }}>Text Rotation</span>
                    <div className="flex gap-1 text-[9px]">
                        {['billboard', 'fixed'].map(mode => (
                            <button key={mode}
                                onClick={() => setAnnotationSetting('textRotation', mode)}
                                className="px-2 py-0.5 rounded border capitalize"
                                style={{
                                    backgroundColor: annotationSettings.textRotation === mode ? 'var(--ui-accent)' : 'var(--ui-bg-primary)',
                                    borderColor: annotationSettings.textRotation === mode ? 'var(--ui-accent)' : 'var(--ui-border)',
                                    color: annotationSettings.textRotation === mode ? '#fff' : 'var(--ui-text-secondary)',
                                }}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium" style={{ color: 'var(--ui-text-secondary)' }}>Font Size</span>
                    <SliderInput value={annotationSettings.fontSize} onChange={(v) => setAnnotationSetting('fontSize', v)} min={0.5} max={5} step={0.25} />
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium" style={{ color: 'var(--ui-text-secondary)' }}>Text Color</span>
                    <ColorPicker value={annotationSettings.textColor} onChange={(c) => setAnnotationSetting('textColor', c)} />
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium" style={{ color: 'var(--ui-text-secondary)' }}>Background</span>
                    <label className="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked={annotationSettings.backgroundEnabled} onChange={(e) => setAnnotationSetting('backgroundEnabled', e.target.checked)} className="rounded accent-theme" />
                        <ColorPicker value={annotationSettings.backgroundColor} onChange={(c) => setAnnotationSetting('backgroundColor', c)} />
                    </label>
                </div>
                {annotationSettings.backgroundEnabled && (
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium" style={{ color: 'var(--ui-text-secondary)' }}>Bg Opacity</span>
                        <SliderInput value={annotationSettings.backgroundOpacity} onChange={(v) => setAnnotationSetting('backgroundOpacity', v)} min={0} max={1} step={0.05} />
                    </div>
                )}
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium" style={{ color: 'var(--ui-text-secondary)' }}>Leader Color</span>
                    <ColorPicker value={annotationSettings.leaderLineColor} onChange={(c) => setAnnotationSetting('leaderLineColor', c)} />
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium" style={{ color: 'var(--ui-text-secondary)' }}>Leader Width</span>
                    <SliderInput value={annotationSettings.leaderLineWidth} onChange={(v) => setAnnotationSetting('leaderLineWidth', v)} min={0.5} max={5} step={0.5} />
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium" style={{ color: 'var(--ui-text-secondary)' }}>Leader Dashed</span>
                    <input type="checkbox" checked={annotationSettings.leaderLineDashed} onChange={(e) => setAnnotationSetting('leaderLineDashed', e.target.checked)} className="rounded accent-theme" />
                </div>
                <button
                    onClick={resetAnnotationPositions}
                    className="w-full px-2 py-1 text-[10px] rounded transition-colors hover-bg-secondary"
                    style={{ backgroundColor: 'var(--ui-bg-secondary)', color: 'var(--ui-text-secondary)', border: '1px solid var(--ui-border)' }}
                >
                    Reset All Label Positions
                </button>
            </div>
        </Section>
    )
}

const DistrictParameterPanel = () => {
    return (
        <div
            className="w-full md:w-[480px] flex-shrink-0 overflow-y-auto h-full
                        scrollbar-thin scrollbar-theme"
            style={{
                backgroundColor: 'var(--ui-bg-primary)',
                borderRight: '1px solid var(--ui-border)',
            }}
        >
            {/* Panel header */}
            <div
                className="px-3 py-2"
                style={{
                    borderBottom: '1px solid var(--ui-border)',
                    backgroundColor: 'var(--ui-bg-tertiary)',
                }}
            >
                <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ui-text-secondary)' }}>District Module</h2>
            </div>

            <div className="p-2">
                <ModelSetupSection />
                <LayersSection />
                <AnnotationSettingsSection />
                <DistrictParametersSection />
                <ModelParametersSection />
                <BuildingRoofSection />
                <RoadModulesSection />
                <RoadModuleStylesSection />
                <ViewsSection />
            </div>
        </div>
    )
}

export default DistrictParameterPanel
