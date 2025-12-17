import { create } from 'zustand'

export const useStore = create((set) => ({
    existing: {
        lotWidth: 50,
        lotDepth: 100,
        setbackFront: 20,
        setbackRear: 10,
        setbackSideLeft: 5,
        setbackSideRight: 5,
        buildingHeight: 30,
        buildingWidth: 30,
        buildingDepth: 40,
    },
    proposed: {
        lotWidth: 50,
        lotDepth: 100,
        setbackFront: 15,
        setbackRear: 10,
        setbackSideLeft: 5,
        setbackSideRight: 5,
        buildingHeight: 45,
        buildingWidth: 35,
        buildingDepth: 50,
    },
    viewSettings: {
        mode: 'split', // 'split' | 'overlay'
        cameraView: 'top', // 'iso' | 'top' | 'front' | 'side' | 'left' | 'right'
        viewVersion: 0, // Increment to force camera updates even if view name is same
        projection: 'orthographic', // 'perspective' | 'orthographic'
        layers: {
            lotLines: true,
            setbackLines: true,
            buildings: true,
            zoning: true,
            streets: true,
            setbacks: true,
            dimensions: true,
            grid: true,
            axes: false, // Default axes off
            gimbal: true,
            origin: true,
        },
        exportRequested: false,
        exportFormat: 'obj', // 'obj' | 'glb' | 'dae' | 'dxf' | 'png' | 'jpg' | 'svg'
        exportSettings: { width: 1920, height: 1080, label: '1080p (1920x1080)' },
        exportView: 'current', // 'current' | 'iso' | 'front' | 'top' | 'side' | 'left' | 'right'
        // Visual Customization Settings
        styleSettings: {
            lotLines: {
                color: '#000000',
                width: 3,
                dashed: false,
                opacity: 1.0
            },
            setbacks: {
                color: '#FFD700', // Gold
                width: 2,
                dashed: true,
                dashScale: 10,
                opacity: 1.0
            },
            buildingEdges: {
                color: '#333333',
                width: 1,
                visible: true,
                opacity: 1.0
            },
            buildingFaces: {
                color: '#FFFFFF',
                opacity: 0.9,
                transparent: true
            }
        },
    },
    updateExisting: (key, value) => set((state) => ({ existing: { ...state.existing, [key]: value } })),
    updateProposed: (key, value) => set((state) => ({ proposed: { ...state.proposed, [key]: value } })),
    toggleViewMode: () => set((state) => ({ viewSettings: { ...state.viewSettings, mode: state.viewSettings.mode === 'split' ? 'overlay' : 'split' } })),
    setCameraView: (view) => set((state) => ({
        viewSettings: {
            ...state.viewSettings,
            cameraView: view,
            viewVersion: state.viewSettings.viewVersion + 1
        }
    })),
    setProjection: (projection) => set((state) => ({
        viewSettings: { ...state.viewSettings, projection }
    })),
    setLayer: (layer, value) => set((state) => ({
        viewSettings: {
            ...state.viewSettings,
            layers: { ...state.viewSettings.layers, [layer]: value }
        }
    })),
    // Update a specific style property (e.g. setStyle('lotLines', 'color', '#ff0000'))
    setStyle: (category, property, value) => set((state) => ({
        viewSettings: {
            ...state.viewSettings,
            styleSettings: {
                ...state.viewSettings.styleSettings,
                [category]: {
                    ...state.viewSettings.styleSettings[category],
                    [property]: value
                }
            }
        }
    })),
    toggleProjection: () => set((state) => ({ viewSettings: { ...state.viewSettings, projection: state.viewSettings.projection === 'perspective' ? 'orthographic' : 'perspective' } })),
    toggleLayer: (layer) => set((state) => ({ viewSettings: { ...state.viewSettings, layers: { ...state.viewSettings.layers, [layer]: !state.viewSettings.layers[layer] } } })),
    setExportFormat: (format) => set((state) => ({ viewSettings: { ...state.viewSettings, exportFormat: format } })),
    setExportSettings: (settings) => set((state) => ({ viewSettings: { ...state.viewSettings, exportSettings: settings } })),
    setExportView: (view) => set((state) => ({ viewSettings: { ...state.viewSettings, exportView: view } })),
    savedViews: {
        1: null,
        2: null,
        3: null,
        4: null,
        5: null
    },
    // ... actions ...
    setSavedView: (index, data) => set((state) => ({
        savedViews: { ...state.savedViews, [index]: data }
    })),
}))
