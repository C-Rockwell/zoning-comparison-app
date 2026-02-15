import { useMemo } from 'react'
import { useStore } from '../store/useStore'
import { useShallow } from 'zustand/react/shallow'

// ============================================
// Entity System Selector Hooks
// ============================================
// Memoized Zustand selectors for the entity-based store architecture.
// Uses useShallow for object returns to prevent unnecessary re-renders.

/**
 * Returns the lot data object for a given lotId.
 * @param {string} lotId
 * @returns {object|undefined} Lot data or undefined if not found
 */
export const useLot = (lotId) =>
    useStore(useShallow((state) => state.entities?.lots?.[lotId]))

/**
 * Returns the entityOrder array (lot IDs in display order).
 * @returns {string[]}
 */
export const useLotIds = () =>
    useStore(useShallow((state) => state.entityOrder ?? []))

/**
 * Returns the activeEntityId.
 * @returns {string|null}
 */
export const useActiveLotId = () =>
    useStore((state) => state.activeEntityId)

/**
 * Returns the lot data for the activeEntityId, or null if none active.
 * @returns {object|null}
 */
export const useActiveLot = () =>
    useStore(useShallow((state) => {
        const id = state.activeEntityId
        if (!id) return null
        return state.entities?.lots?.[id] ?? null
    }))

/**
 * Returns entityStyles[lotId] for a given lot.
 * @param {string} lotId
 * @returns {object|undefined}
 */
export const useLotStyle = (lotId) =>
    useStore(useShallow((state) => state.entityStyles?.[lotId]))

/**
 * Returns lot.buildings[buildingType] for a given lot and building type.
 * @param {string} lotId
 * @param {'principal'|'accessory'} buildingType
 * @returns {object|undefined}
 */
export const useBuilding = (lotId, buildingType) =>
    useStore(useShallow((state) =>
        state.entities?.lots?.[lotId]?.buildings?.[buildingType]
    ))

/**
 * Returns the entire entities.roadModules object.
 * @returns {object}
 */
export const useRoadModules = () =>
    useStore(useShallow((state) => state.entities?.roadModules ?? {}))

/**
 * Returns road modules matching a given direction.
 * @param {string} direction - 'front' | 'left' | 'right' | 'rear'
 * @returns {object} Filtered roadModules keyed by roadId
 */
export const useRoadModulesByDirection = (direction) => {
    const roadModules = useStore(useShallow((state) => state.entities?.roadModules ?? {}))
    return useMemo(() => {
        const filtered = {}
        for (const [id, mod] of Object.entries(roadModules)) {
            if (mod.direction === direction) {
                filtered[id] = mod
            }
        }
        return filtered
    }, [roadModules, direction])
}

/**
 * Returns lotVisibility[lotId], falling back to global viewSettings.layers
 * if no per-lot visibility is defined.
 * @param {string} lotId
 * @returns {object} Visibility flags for the lot
 */
export const useLotVisibility = (lotId) =>
    useStore(useShallow((state) => {
        const perLot = state.lotVisibility?.[lotId]
        if (perLot) return perLot
        // Fallback to global layer visibility
        return state.viewSettings?.layers ?? {}
    }))

/**
 * Returns the activeModule ('comparison' | 'district').
 * @returns {string}
 */
export const useActiveModule = () =>
    useStore((state) => state.activeModule ?? 'comparison')

/**
 * Returns the modelSetup configuration.
 * @returns {object}
 */
export const useModelSetup = () =>
    useStore(useShallow((state) => state.modelSetup ?? {
        numLots: 1,
        streetEdges: { front: true, left: false, right: false, rear: false },
        streetTypes: { front: 'S1', left: 'S1', right: 'S2', rear: 'S3' },
    }))

/**
 * Returns the districtParameters object.
 * @returns {object}
 */
export const useDistrictParameters = () =>
    useStore(useShallow((state) => state.districtParameters ?? {}))

/**
 * Returns the number of entities (lots) in entityOrder.
 * @returns {number}
 */
export const useEntityCount = () =>
    useStore((state) => state.entityOrder?.length ?? 0)

// ============================================
// Non-Hook Accessors (for use outside React)
// ============================================

/**
 * Get lot data by ID directly from the store (non-reactive).
 * Use this outside React components (event handlers, utilities, etc.).
 * @param {string} lotId
 * @returns {object|undefined}
 */
export const getLotData = (lotId) =>
    useStore.getState().entities?.lots?.[lotId]
