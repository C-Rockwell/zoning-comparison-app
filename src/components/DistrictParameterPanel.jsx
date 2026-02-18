import { useState, useMemo, useCallback } from 'react'
import { useStore, calculatePolygonArea } from '../store/useStore'
import {
    useLotIds,
    useModelSetup, useDistrictParameters, useEntityCount,
    useRoadModules, useActiveLotId, getLotData,
} from '../hooks/useEntityStore'
import Section from './ui/Section'
import ColorPicker from './ui/ColorPicker'
import SliderInput from './ui/SliderInput'
import LineStyleSelector from './ui/LineStyleSelector'
import {
    ChevronDown, ChevronUp, Eye, EyeOff, Palette, Plus, Minus, Trash2, Copy,
    Layers, Settings, Building2, Route, Upload, Download, BarChart3, Hexagon,
} from 'lucide-react'
import ImportWizard from './ImportWizard'

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

// ============================================
// MODEL PARAMETERS TABLE
// ============================================

const ModelParametersTable = ({ collapseKey, allModelCollapsed }) => {
    const lotIds = useLotIds()
    const updateLotParam = useStore((s) => s.updateLotParam)
    const updateLotSetback = useStore((s) => s.updateLotSetback)
    const updateBuildingParam = useStore((s) => s.updateBuildingParam)
    const setLotVisibilityAction = useStore((s) => s.setLotVisibility)
    const lots = useStore((s) => s.entities?.lots ?? {})
    const lotVisibilityAll = useStore((s) => s.lotVisibility ?? {})
    const modelSetup = useModelSetup()

    // Compute which lots are corner lots (have a street side)
    const lotCornerStatus = useMemo(() => {
        const edges = modelSetup.streetEdges ?? { front: true, left: false, right: false, rear: false }
        const status = {}
        lotIds.forEach((lotId, index) => {
            const isFirst = index === 0
            const isLast = index === lotIds.length - 1
            const isOnly = lotIds.length === 1
            const hasLeftStreet = isOnly ? edges.left : isLast ? edges.left : false
            const hasRightStreet = isOnly ? edges.right : isFirst ? edges.right : false
            status[lotId] = { isCorner: hasLeftStreet || hasRightStreet }
        })
        return status
    }, [lotIds, modelSetup.streetEdges])

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
                    cornerOnly: true,
                    getValue: (lot) => lot.setbacks?.principal?.minSideStreet,
                    setValue: (lotId, v) => updateLotSetback(lotId, 'principal', 'minSideStreet', v),
                    type: 'number', min: 0,
                },
                {
                    label: 'Max. Side, Street (ft)',
                    visKey: 'maxSetbacks',
                    cornerOnly: true,
                    getValue: (lot) => lot.setbacks?.principal?.maxSideStreet,
                    setValue: (lotId, v) => updateLotSetback(lotId, 'principal', 'maxSideStreet', v),
                    type: 'number', min: 0,
                },
                {
                    label: 'BTZ - Side, Street (%)',
                    visKey: 'btzPlanes',
                    cornerOnly: true,
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
                    cornerOnly: true,
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
                    visKey: 'maxHeightPlanePrincipal',
                    getValue: () => true,
                    type: 'display',
                },
                {
                    label: 'Edit Shape',
                    type: 'action',
                    buildingType: 'principal',
                    canAct: (lot) => (lot.buildings?.principal?.width ?? 0) > 0 && (lot.buildings?.principal?.stories ?? 0) > 0,
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
                    visKey: 'maxHeightPlaneAccessory',
                    getValue: () => true,
                    type: 'display',
                },
                {
                    label: 'Edit Shape',
                    type: 'action',
                    buildingType: 'accessory',
                    canAct: (lot) => (lot.buildings?.accessory?.width ?? 0) > 0 && (lot.buildings?.accessory?.stories ?? 0) > 0,
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
                            lotCornerStatus={lotCornerStatus}
                            collapseKey={collapseKey}
                            allModelCollapsed={allModelCollapsed}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    )
}

/** A group of rows in the model parameters table with a collapsible section header */
const SectionGroup = ({ section, lotIds, lots, firstLotVis, setLotVisibilityAction, lotCornerStatus, collapseKey, allModelCollapsed }) => {
    const [isOpen, setIsOpen] = useState(true)
    // Sync with parent collapse-all toggle
    const [prevCollapseKey, setPrevCollapseKey] = useState(collapseKey)
    if (collapseKey !== prevCollapseKey) {
        setPrevCollapseKey(collapseKey)
        setIsOpen(!allModelCollapsed)
    }
    const regenerateEntityBuilding = useStore((s) => s.regenerateEntityBuilding)
    const enableEntityBuildingPolygonMode = useStore((s) => s.enableEntityBuildingPolygonMode)

    // Detect if this is a Structures section with a deleted building
    const isStructuresSection = section.title === 'Structures Principal' || section.title === 'Structures Accessory'
    const buildingType = section.title === 'Structures Principal' ? 'principal' : section.title === 'Structures Accessory' ? 'accessory' : null
    const allBuildingsDeleted = isStructuresSection && lotIds.every(lotId => {
        const b = lots[lotId]?.buildings?.[buildingType]
        return !b || (b.width === 0 && b.stories === 0)
    })

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
                    {isStructuresSection && allBuildingsDeleted && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                lotIds.forEach(lotId => regenerateEntityBuilding(lotId, buildingType))
                            }}
                            className="ml-2 p-0.5 rounded transition-colors"
                            style={{ color: 'var(--ui-accent)' }}
                            title={`Regenerate ${buildingType} building for all lots`}
                        >
                            <Plus className="w-3 h-3" />
                        </button>
                    )}
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

                    // Corner-only rows show -- for interior lots
                    if (row.cornerOnly && !lotCornerStatus?.[lotId]?.isCorner) {
                        return (
                            <td key={lotId} className="py-1 px-1 text-center text-xs" style={{ color: 'var(--ui-text-muted)' }}>
                                --
                            </td>
                        )
                    }

                    if (row.type === 'action') {
                        const canAct = row.canAct ? row.canAct(lot) : true
                        return (
                            <td key={lotId} className="py-1 px-1 text-center">
                                {canAct ? (
                                    <button
                                        onClick={() => enableEntityBuildingPolygonMode(lotId, row.buildingType)}
                                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] transition-colors"
                                        style={{ color: 'var(--ui-accent)', border: '1px solid var(--ui-accent)' }}
                                        title={`Edit ${row.buildingType} shape`}
                                    >
                                        <Hexagon className="w-3 h-3" />
                                        Edit
                                    </button>
                                ) : (
                                    <span className="text-[10px]" style={{ color: 'var(--ui-text-muted)' }}>--</span>
                                )}
                            </td>
                        )
                    }

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
    const [showImportWizard, setShowImportWizard] = useState(false)
    const toggle = (key) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))
    const allDistrictKeys = ['lotDimensions', 'setbacksPrincipal', 'setbacksAccessory', 'structures', 'lotAccess', 'parkingLocations']
    const allCollapsed = allDistrictKeys.every(k => collapsed[k])
    const toggleCollapseAll = (e) => {
        e.stopPropagation()
        if (allCollapsed) {
            setCollapsed({})
        } else {
            const next = {}
            allDistrictKeys.forEach(k => { next[k] = true })
            setCollapsed(next)
        }
    }

    const dp = (path) => {
        const keys = path.split('.')
        let val = districtParams
        for (const k of keys) {
            val = val?.[k]
        }
        return val
    }

    return (
        <Section
            title="District Parameters"
            icon={<Building2 className="w-4 h-4" />}
            defaultOpen={false}
            headerRight={
                <div className="flex items-center gap-1">
                    <button
                        onClick={toggleCollapseAll}
                        className="px-1.5 py-0.5 rounded text-[10px] transition-opacity hover:opacity-80"
                        style={{ color: 'var(--ui-text-muted)' }}
                        title={allCollapsed ? 'Expand All' : 'Collapse All'}
                    >
                        {allCollapsed ? 'Expand All' : 'Collapse All'}
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowImportWizard(true) }}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition-opacity hover:opacity-80"
                        style={{ color: 'var(--ui-accent)' }}
                        title="Import district parameters from CSV"
                    >
                        <Upload className="w-3 h-3" />
                        Import CSV
                    </button>
                </div>
            }
        >
            {showImportWizard && (
                <ImportWizard isOpen={showImportWizard} onClose={() => setShowImportWizard(false)} />
            )}
            <p className="text-[10px] mb-2" style={{ color: 'var(--ui-text-muted)' }}>
                Informational reference data. Not visualized in the 3D scene.
            </p>

            {/* Lot Dimensions */}
            <div className="mb-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider cursor-pointer select-none flex items-center gap-1"
                    style={{ color: 'var(--ui-text-secondary)', borderBottom: '1px solid var(--ui-border)', borderLeft: '2px solid var(--ui-text-muted)', paddingLeft: '6px', paddingBottom: '4px', paddingTop: '8px' }}
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
                <h4 className="text-[10px] font-bold uppercase tracking-wider cursor-pointer select-none flex items-center gap-1"
                    style={{ color: 'var(--ui-text-secondary)', borderBottom: '1px solid var(--ui-border)', borderLeft: '2px solid var(--ui-text-muted)', paddingLeft: '6px', paddingBottom: '4px', paddingTop: '8px' }}
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
                <h4 className="text-[10px] font-bold uppercase tracking-wider cursor-pointer select-none flex items-center gap-1"
                    style={{ color: 'var(--ui-text-secondary)', borderBottom: '1px solid var(--ui-border)', borderLeft: '2px solid var(--ui-text-muted)', paddingLeft: '6px', paddingBottom: '4px', paddingTop: '8px' }}
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
                <h4 className="text-[10px] font-bold uppercase tracking-wider cursor-pointer select-none flex items-center gap-1"
                    style={{ color: 'var(--ui-text-secondary)', borderBottom: '1px solid var(--ui-border)', borderLeft: '2px solid var(--ui-text-muted)', paddingLeft: '6px', paddingBottom: '4px', paddingTop: '8px' }}
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
                <h4 className="text-[10px] font-bold uppercase tracking-wider cursor-pointer select-none flex items-center gap-1"
                    style={{ color: 'var(--ui-text-secondary)', borderBottom: '1px solid var(--ui-border)', borderLeft: '2px solid var(--ui-text-muted)', paddingLeft: '6px', paddingBottom: '4px', paddingTop: '8px' }}
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
                <h4 className="text-[10px] font-bold uppercase tracking-wider cursor-pointer select-none flex items-center gap-1"
                    style={{ color: 'var(--ui-text-secondary)', borderBottom: '1px solid var(--ui-border)', borderLeft: '2px solid var(--ui-text-muted)', paddingLeft: '6px', paddingBottom: '4px', paddingTop: '8px' }}
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
    const setAllRoadZoneColor = useStore((s) => s.setAllRoadZoneColor)
    const setAllRoadZoneOpacity = useStore((s) => s.setAllRoadZoneOpacity)

    const [collapsedZones, setCollapsedZones] = useState({})
    const toggleZone = (key) => setCollapsedZones(prev => ({ ...prev, [key]: !prev[key] }))
    const [savedSnapshot, setSavedSnapshot] = useState(null)

    if (!roadModuleStyles) return null

    // Use roadWidth lineWidth as the reference for the universal slider
    const universalLineWidth = roadModuleStyles.roadWidth?.lineWidth ?? 1

    // Snapshot current styles before applying global changes
    const snapshotAndApply = (fn) => {
        if (!savedSnapshot) setSavedSnapshot(JSON.parse(JSON.stringify(roadModuleStyles)))
        fn()
    }
    const handleResetGlobal = () => {
        if (!savedSnapshot) return
        for (const [key, val] of Object.entries(savedSnapshot)) {
            if (typeof val === 'object' && val !== null) {
                for (const [prop, propVal] of Object.entries(val)) {
                    setRoadModuleStyle(key, prop, propVal)
                }
            }
        }
        setSavedSnapshot(null)
    }

    const renderZoneHeader = (zoneKey, label) => (
        <div
            onClick={() => toggleZone(zoneKey)}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', marginBottom: '4px', borderTop: '1px solid var(--ui-bg-primary)' }}
        >
            <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ui-text-muted)' }}>{label}</span>
            {collapsedZones[zoneKey] ? <ChevronDown size={12} style={{ color: 'var(--ui-text-muted)' }} /> : <ChevronUp size={12} style={{ color: 'var(--ui-text-muted)' }} />}
        </div>
    )

    const renderSideZoneGroup = (zones, sideLabel, sideColor) => (
        <div style={{ paddingTop: '8px', marginBottom: '12px', borderTop: '1px solid var(--ui-bg-primary)' }}>
            <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px', fontWeight: 'bold', color: sideColor }}>
                {sideLabel}
            </span>
            {zones.map(({ key, label, defaultFill }) => (
                <div key={key} style={{ marginBottom: '4px', paddingLeft: '8px', borderLeft: '2px solid var(--ui-border)' }}>
                    <div
                        onClick={() => toggleZone(key)}
                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}
                    >
                        <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ui-text-muted)' }}>{label}</span>
                        {collapsedZones[key] ? <ChevronDown size={10} style={{ color: 'var(--ui-text-muted)' }} /> : <ChevronUp size={10} style={{ color: 'var(--ui-text-muted)' }} />}
                    </div>
                    {!collapsedZones[key] && (
                        <div style={{ marginBottom: '8px' }}>
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
                    )}
                </div>
            ))}
        </div>
    )

    return (
        <Section title="Road Module Styles" icon={<Palette className="w-4 h-4" />} defaultOpen={false}>
            {/* Global Controls */}
            <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold', color: 'var(--ui-accent)' }}>Global</span>
                    {savedSnapshot && (
                        <button
                            onClick={handleResetGlobal}
                            className="text-[9px] px-1.5 py-0.5 rounded transition-colors"
                            style={{ color: 'var(--ui-warning)', border: '1px solid var(--ui-warning)' }}
                        >
                            Reset
                        </button>
                    )}
                </div>
                <ControlRow label="Color">
                    <ColorPicker value={roadModuleStyles.roadWidth?.fillColor ?? '#666666'} onChange={(c) => snapshotAndApply(() => setAllRoadZoneColor(c))} />
                </ControlRow>
                <ControlRow label="Opacity">
                    <SliderInput value={roadModuleStyles.roadWidth?.fillOpacity ?? 1} onChange={(v) => snapshotAndApply(() => setAllRoadZoneOpacity(v))} min={0} max={1} step={0.05} />
                </ControlRow>
                <ControlRow label="Line Width">
                    <SliderInput value={universalLineWidth} onChange={(v) => snapshotAndApply(() => setAllRoadLineWidths(v))} min={0.5} max={5} step={0.5} />
                </ControlRow>
            </div>

            {/* Right-of-Way Lines */}
            {renderZoneHeader('rightOfWay', 'Right-of-Way Lines')}
            {!collapsedZones.rightOfWay && (
                <div style={{ marginBottom: '12px' }}>
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
            )}

            {/* Road Surface */}
            {renderZoneHeader('roadSurface', 'Road Surface')}
            {!collapsedZones.roadSurface && (
                <div style={{ marginBottom: '12px' }}>
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
            )}

            {/* Intersection Fill */}
            {renderZoneHeader('intersectionFill', 'Intersection Fill')}
            {!collapsedZones.intersectionFill && (
                <div style={{ marginBottom: '12px' }}>
                    <ControlRow label="Fill Color">
                        <ColorPicker value={roadModuleStyles.intersectionFill?.fillColor ?? roadModuleStyles.roadWidth?.fillColor ?? '#666666'} onChange={(c) => setRoadModuleStyle('intersectionFill', 'fillColor', c)} />
                    </ControlRow>
                    <ControlRow label="Fill Opacity">
                        <SliderInput value={roadModuleStyles.intersectionFill?.fillOpacity ?? 1} onChange={(v) => setRoadModuleStyle('intersectionFill', 'fillOpacity', v)} min={0} max={1} step={0.05} />
                    </ControlRow>
                </div>
            )}

            {/* Alley Intersection Fill */}
            {renderZoneHeader('alleyIntersectionFill', 'Alley Intersection Fill')}
            {!collapsedZones.alleyIntersectionFill && (
                <div style={{ marginBottom: '12px' }}>
                    <ControlRow label="Fill Color">
                        <ColorPicker value={roadModuleStyles.alleyIntersectionFill?.fillColor ?? '#666666'} onChange={(c) => setRoadModuleStyle('alleyIntersectionFill', 'fillColor', c)} />
                    </ControlRow>
                    <ControlRow label="Fill Opacity">
                        <SliderInput value={roadModuleStyles.alleyIntersectionFill?.fillOpacity ?? 1} onChange={(v) => setRoadModuleStyle('alleyIntersectionFill', 'fillOpacity', v)} min={0} max={1} step={0.05} />
                    </ControlRow>
                </div>
            )}

            {/* Left Side Elements */}
            {renderSideZoneGroup(
                [
                    { key: 'leftParking', label: 'Parking', defaultFill: '#888888' },
                    { key: 'leftVerge', label: 'Verge', defaultFill: '#c4a77d' },
                    { key: 'leftSidewalk', label: 'Sidewalk', defaultFill: '#90EE90' },
                    { key: 'leftTransitionZone', label: 'Transition Zone', defaultFill: '#98D8AA' },
                ],
                'Left Side',
                'var(--ui-accent)'
            )}

            {/* Right Side Elements */}
            {renderSideZoneGroup(
                [
                    { key: 'rightParking', label: 'Parking', defaultFill: '#888888' },
                    { key: 'rightVerge', label: 'Verge', defaultFill: '#c4a77d' },
                    { key: 'rightSidewalk', label: 'Sidewalk', defaultFill: '#90EE90' },
                    { key: 'rightTransitionZone', label: 'Transition Zone', defaultFill: '#98D8AA' },
                ],
                'Right Side',
                'var(--ui-success, var(--ui-accent))'
            )}
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
// BATCH EXPORT SECTION
// ============================================

const CAMERA_VIEWS = [
    { key: 'iso', label: 'ISO' },
    { key: 'top', label: 'Top' },
    { key: 'front', label: 'Front' },
    { key: 'side', label: 'Side' },
    { key: 'left', label: 'Left' },
]

const RESOLUTION_PRESETS = [
    { value: '1280x720', label: '720p' },
    { value: '1920x1080', label: '1080p' },
    { value: '3840x2160', label: '4K' },
    { value: '7680x4320', label: '8K' },
]

const BatchExportSection = () => {
    const savedViews = useStore((s) => s.savedViews ?? {})
    const isBatchExporting = useStore((s) => s.viewSettings.isBatchExporting)
    const addToExportQueue = useStore((s) => s.addToExportQueue)
    const setIsBatchExporting = useStore((s) => s.setIsBatchExporting)

    const [checked, setChecked] = useState({}) // { 'slot-view': true }
    const [format, setFormat] = useState('png')
    const [resolution, setResolution] = useState('1920x1080')

    const populatedSlots = useMemo(() =>
        [1, 2, 3, 4, 5].filter(slot => savedViews[slot] != null),
    [savedViews])

    const checkedCount = Object.values(checked).filter(Boolean).length

    const toggleCheck = useCallback((key) => {
        setChecked(prev => ({ ...prev, [key]: !prev[key] }))
    }, [])

    const handleExport = useCallback(() => {
        if (checkedCount === 0 || isBatchExporting) return

        const [w, h] = resolution.split('x').map(Number)
        const queue = []

        for (const slot of populatedSlots) {
            const saved = savedViews[slot]
            if (!saved) continue

            for (const view of CAMERA_VIEWS) {
                const key = `${slot}-${view.key}`
                if (!checked[key]) continue

                queue.push({
                    presetSlot: slot,
                    cameraView: view.key,
                    layers: saved.layers ? { ...saved.layers } : undefined,
                    format,
                    label: `view-${slot}-${view.key}`,
                })
            }
        }

        if (queue.length === 0) return

        // Set export settings for resolution
        const store = useStore.getState()
        store.setExportSettings({ width: w, height: h, label: resolution })

        addToExportQueue(queue)
        setIsBatchExporting(true)
    }, [checkedCount, isBatchExporting, resolution, populatedSlots, savedViews, checked, format, addToExportQueue, setIsBatchExporting])

    return (
        <Section title="Batch Export" icon={<Download className="w-4 h-4" />} defaultOpen={false}>
            {populatedSlots.length === 0 ? (
                <p className="text-[10px]" style={{ color: 'var(--ui-text-muted)' }}>
                    Save views in the Views section above to enable batch export.
                </p>
            ) : (
                <div className="space-y-3">
                    {/* Checkbox grid */}
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
                                                        disabled={isBatchExporting}
                                                    />
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Format + Resolution row */}
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
                            disabled={isBatchExporting}
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
                            disabled={isBatchExporting}
                        >
                            {RESOLUTION_PRESETS.map(r => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Export button */}
                    <button
                        onClick={handleExport}
                        disabled={checkedCount === 0 || isBatchExporting}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-opacity disabled:opacity-40"
                        style={{
                            backgroundColor: 'var(--ui-accent)',
                            color: '#fff',
                        }}
                    >
                        <Download className="w-3.5 h-3.5" />
                        {isBatchExporting
                            ? 'Exporting...'
                            : `Export ${checkedCount} Diagram${checkedCount !== 1 ? 's' : ''}`
                        }
                    </button>
                </div>
            )}
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
    const isMeshCategory = ['btzPlanes', 'lotAccessArrows', 'principalBuildingFaces', 'accessoryBuildingFaces', 'buildingFaces', 'roofFaces'].includes(category)
    // Hybrid categories: mesh controls (fill color/opacity) + line controls (lineColor/lineWidth/lineDashed)
    const isHybridCategory = category === 'maxHeightPlane'

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
            {isHybridCategory ? (
                <div className="space-y-1">
                    <ColorPicker
                        label="Fill Color"
                        value={style.color ?? '#FF6B6B'}
                        onChange={(v) => handleChange('color', v)}
                    />
                    <SliderInput
                        label="Fill Opacity"
                        value={style.opacity ?? 0.3}
                        onChange={(v) => handleChange('opacity', v)}
                        min={0}
                        max={1}
                        step={0.05}
                    />
                    <ColorPicker
                        label="Line Color"
                        value={style.lineColor ?? '#FF0000'}
                        onChange={(v) => handleChange('lineColor', v)}
                    />
                    <SliderInput
                        label="Line Width"
                        value={style.lineWidth ?? 2}
                        onChange={(v) => handleChange('lineWidth', v)}
                        min={0.5}
                        max={5}
                        step={0.5}
                    />
                    <div style={{ paddingTop: '4px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer', color: 'var(--ui-text-muted)' }}>
                            <input
                                type="checkbox"
                                checked={style.lineDashed ?? true}
                                onChange={(e) => handleChange('lineDashed', e.target.checked)}
                                style={{ borderColor: 'var(--ui-border)' }}
                            />
                            Dashed
                        </label>
                    </div>
                </div>
            ) : isMeshCategory ? (
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
    const duplicateLot = useStore((s) => s.duplicateLot)
    const removeLot = useStore((s) => s.removeLot)
    const selectEntity = useStore((s) => s.selectEntity)
    const activeLotId = useActiveLotId()
    const [collapseKey, setCollapseKey] = useState(0)
    const [allModelCollapsed, setAllModelCollapsed] = useState(false)
    const toggleModelCollapseAll = (e) => {
        e.stopPropagation()
        setAllModelCollapsed(!allModelCollapsed)
        setCollapseKey(k => k + 1)
    }

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

    return (
        <Section title="Model Parameters" defaultOpen={true} headerRight={
            <button
                onClick={toggleModelCollapseAll}
                className="px-1.5 py-0.5 rounded text-[10px] transition-opacity hover:opacity-80"
                style={{ color: 'var(--ui-text-muted)' }}
                title={allModelCollapsed ? 'Expand All' : 'Collapse All'}
            >
                {allModelCollapsed ? 'Expand All' : 'Collapse All'}
            </button>
        }>
            {renderLotHeader()}

            {lotIds.length > 0 ? (
                <ModelParametersTable collapseKey={collapseKey} allModelCollapsed={allModelCollapsed} />
            ) : (
                <p className="text-xs italic" style={{ color: 'var(--ui-text-muted)' }}>No lots. Use Model Setup to add lots.</p>
            )}
        </Section>
    )
}

// ============================================
// STYLES SECTION (per-lot style editing)
// ============================================

const StylesSection = () => {
    const lotIds = useLotIds()
    const activeLotId = useActiveLotId()
    const entityStyles = useStore((s) => s.entityStyles ?? {})
    const [expandedCategory, setExpandedCategory] = useState(null)

    const styleLotId = activeLotId || lotIds[0]
    if (!styleLotId || !entityStyles[styleLotId]) return null

    const styleCategories = [
        { key: 'lotLines', label: 'Lot Lines' },
        { key: 'setbacks', label: 'Setbacks' },
        { key: 'accessorySetbacks', label: 'Accessory Setbacks' },
        { key: 'maxSetbacks', label: 'Max Setbacks' },
        { key: 'btzPlanes', label: 'BTZ Planes' },
        { key: 'lotAccessArrows', label: 'Lot Access Arrows' },
        { key: 'principalBuildingEdges', label: 'Principal Building Edges' },
        { key: 'principalBuildingFaces', label: 'Principal Building Faces' },
        { key: 'accessoryBuildingEdges', label: 'Accessory Building Edges' },
        { key: 'accessoryBuildingFaces', label: 'Accessory Building Faces' },
        { key: 'roofFaces', label: 'Roof' },
        { key: 'maxHeightPlane', label: 'Max Height Plane' },
    ]

    return (
        <Section title="Styles" icon={<Palette className="w-4 h-4" />} defaultOpen={false}>
            <div className="text-[10px] mb-2" style={{ color: 'var(--ui-text-muted)' }}>
                Editing styles for Lot {lotIds.indexOf(styleLotId) + 1}
            </div>
            <div className="space-y-0.5">
                {styleCategories.map(({ key, label }) => (
                    <div key={key}>
                        <button
                            onClick={() => setExpandedCategory(expandedCategory === key ? null : key)}
                            className="w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors"
                            style={{
                                backgroundColor: expandedCategory === key ? 'var(--ui-accent-muted)' : 'transparent',
                                color: expandedCategory === key ? 'var(--ui-accent)' : 'var(--ui-text-secondary)',
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <Palette className="w-3 h-3" />
                                <span>{label}</span>
                            </div>
                            {expandedCategory === key ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                        {expandedCategory === key && (
                            <InlineStyleControls
                                lotId={styleLotId}
                                category={key}
                                style={entityStyles[styleLotId][key]}
                            />
                        )}
                    </div>
                ))}
            </div>
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

// ============================================
// ANALYTICS SECTION — Per-lot metrics dashboard
// ============================================

const AnalyticsSection = () => {
    const lotIds = useLotIds()
    const lots = useStore((s) => s.entities?.lots ?? {})

    const metrics = useMemo(() => {
        let districtLotArea = 0
        let districtGFA = 0
        let districtFootprint = 0

        const perLot = lotIds.map((lotId) => {
            const lot = lots[lotId]
            if (!lot) return { lotArea: 0, coverage: 0, gfa: 0, far: 0, footprint: 0 }

            // Lot area
            const isPolygon = lot.lotGeometry?.mode === 'polygon' && lot.lotGeometry?.vertices?.length >= 3
            const lotArea = isPolygon
                ? calculatePolygonArea(lot.lotGeometry.vertices)
                : (lot.lotWidth ?? 50) * (lot.lotDepth ?? 100)

            // Building footprints + GFA
            let totalFootprint = 0
            let totalGFA = 0
            for (const type of ['principal', 'accessory']) {
                const b = lot.buildings?.[type]
                if (b && b.width > 0 && b.depth > 0 && (b.stories ?? 0) > 0) {
                    const footprint = b.width * b.depth
                    totalFootprint += footprint
                    totalGFA += footprint * b.stories
                }
            }

            const coverage = lotArea > 0 ? (totalFootprint / lotArea) * 100 : 0
            const far = lotArea > 0 ? totalGFA / lotArea : 0

            districtLotArea += lotArea
            districtGFA += totalGFA
            districtFootprint += totalFootprint

            return { lotArea, coverage, gfa: totalGFA, far, footprint: totalFootprint }
        })

        const districtCoverage = districtLotArea > 0 ? (districtFootprint / districtLotArea) * 100 : 0
        const districtFAR = districtLotArea > 0 ? districtGFA / districtLotArea : 0

        return { perLot, district: { lotArea: districtLotArea, coverage: districtCoverage, gfa: districtGFA, far: districtFAR } }
    }, [lotIds, lots])

    const formatNum = (n, decimals = 0) => {
        if (n == null || isNaN(n)) return '--'
        return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    }

    const metricRows = [
        { label: 'Lot Area', unit: 'SF', key: 'lotArea', decimals: 0 },
        { label: 'Coverage', unit: '%', key: 'coverage', decimals: 1, showBar: true },
        { label: 'GFA', unit: 'SF', key: 'gfa', decimals: 0 },
        { label: 'FAR', unit: '', key: 'far', decimals: 2 },
    ]

    return (
        <Section title="Analytics" icon={<BarChart3 className="w-4 h-4" />} defaultOpen={true}>
            <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--ui-border)' }}>
                            <th
                                className="text-left font-medium py-1 pr-2 min-w-[80px]"
                                style={{ color: 'var(--ui-text-secondary)' }}
                            >
                                Metric
                            </th>
                            {lotIds.map((_, i) => (
                                <th key={i} className="text-right font-medium py-1 px-1 min-w-[65px]" style={{ color: 'var(--ui-text-secondary)' }}>
                                    Lot {i + 1}
                                </th>
                            ))}
                            {lotIds.length > 1 && (
                                <th className="text-right font-medium py-1 px-1 min-w-[65px]" style={{ color: 'var(--ui-accent)' }}>
                                    Total
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {metricRows.map(({ label, unit, key, decimals, showBar }) => (
                            <tr key={key} style={{ borderBottom: '1px solid var(--ui-border)' }}>
                                <td className="py-1.5 pr-2 font-medium" style={{ color: 'var(--ui-text-secondary)' }}>
                                    {label}
                                    {unit && <span className="ml-1 opacity-50 font-normal">({unit})</span>}
                                </td>
                                {metrics.perLot.map((m, i) => (
                                    <td key={i} className="text-right py-1.5 px-1">
                                        <div className="relative">
                                            {showBar && (
                                                <div
                                                    className="absolute inset-0 rounded-sm opacity-20"
                                                    style={{
                                                        backgroundColor: 'var(--ui-accent)',
                                                        width: `${Math.min(100, m[key])}%`,
                                                    }}
                                                />
                                            )}
                                            <span className="relative" style={{ color: 'var(--ui-text-primary)' }}>
                                                {formatNum(m[key], decimals)}
                                            </span>
                                        </div>
                                    </td>
                                ))}
                                {lotIds.length > 1 && (
                                    <td className="text-right py-1.5 px-1 font-semibold" style={{ color: 'var(--ui-accent)' }}>
                                        {formatNum(metrics.district[key], decimals)}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
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
                <StylesSection />
                <AnalyticsSection />
                <BuildingRoofSection />
                <RoadModulesSection />
                <RoadModuleStylesSection />
                <ViewsSection />
                <BatchExportSection />
            </div>
        </div>
    )
}

export default DistrictParameterPanel
