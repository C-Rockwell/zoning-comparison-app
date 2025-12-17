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
    // Sun Simulation Settings (optional, for time-of-day shadows)
    sunSettings: {
        enabled: false,
        latitude: 37.7749,
        longitude: -122.4194,
        date: new Date().toISOString().split('T')[0],
        time: 12,
        animating: false,
        intensity: 1.5,
        ambientIntensity: 0.4,
        shadowsEnabled: true,
    },
    // Render Quality Settings
    renderSettings: {
        quality: 'high', // 'low' | 'medium' | 'high'
        ambientOcclusion: true,
        aoIntensity: 1.5,
        aoRadius: 0.5,
        toneMapping: true,
        antialiasing: true,
        environmentIntensity: 0.8,
        shadowQuality: 'high', // 'low' | 'medium' | 'high'
        contactShadows: true,
        // Material settings
        materialRoughness: 0.7,
        materialMetalness: 0.1,
    },
    viewSettings: {
        mode: 'split', // 'split' | 'overlay'
        cameraView: 'top', // 'iso' | 'top' | 'front' | 'side' | 'left' | 'right'
        viewVersion: 0, // Increment to force camera updates even if view name is same
        projection: 'orthographic', // 'perspective' | 'orthographic'
        backgroundMode: 'dark', // 'dark' | 'light'
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
        // Visual Customization Settings - Split for Existing and Proposed models
        styleSettings: {
            existing: {
                lotLines: {
                    color: '#000000',
                    width: 1.5,
                    dashed: false,
                    dashSize: 1,
                    gapSize: 0.5,
                    opacity: 1.0
                },
                setbacks: {
                    color: '#000000',
                    width: 1,
                    dashed: true,
                    dashSize: 20,
                    gapSize: 10,
                    dashScale: 5,
                    opacity: 1.0
                },
                lotFill: {
                    color: '#D4EAAA',
                    opacity: 1.0,
                    visible: true
                },
                buildingEdges: {
                    color: '#000000',
                    width: 1.5,
                    visible: true,
                    dashed: false,
                    opacity: 1.0
                },
                buildingFaces: {
                    color: '#D5D5D5',
                    opacity: 1.0,
                    transparent: true
                },
            },
            proposed: {
                lotLines: {
                    color: '#000000',
                    width: 2.5,
                    dashed: false,
                    dashSize: 1,
                    gapSize: 0.5,
                    opacity: 1.0
                },
                setbacks: {
                    color: '#000000',
                    width: 2,
                    dashed: true,
                    dashSize: 20,
                    gapSize: 10,
                    dashScale: 5,
                    opacity: 1.0
                },
                lotFill: {
                    color: '#bbd77f',
                    opacity: 1.0,
                    visible: true
                },
                buildingEdges: {
                    color: '#000000',
                    width: 2.5,
                    visible: true,
                    dashed: false,
                    opacity: 1.0
                },
                buildingFaces: {
                    color: '#d7bcff',
                    opacity: 0.7,
                    transparent: true
                },
            },
            // Shared settings
            ground: {
                color: '#1a1a2e',
                opacity: 0.8,
                visible: false
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
    // Update a specific style property for a model (e.g. setStyle('existing', 'lotLines', 'color', '#ff0000'))
    // Or for shared settings like ground: setStyle('ground', 'color', '#ff0000')
    setStyle: (modelOrCategory, categoryOrProperty, propertyOrValue, value) => set((state) => {
        // Check if this is a shared setting (ground) - 3 args
        if (value === undefined) {
            // Shared setting: setStyle('ground', 'color', '#fff')
            const category = modelOrCategory
            const property = categoryOrProperty
            const val = propertyOrValue
            return {
                viewSettings: {
                    ...state.viewSettings,
                    styleSettings: {
                        ...state.viewSettings.styleSettings,
                        [category]: {
                            ...state.viewSettings.styleSettings[category],
                            [property]: val
                        }
                    }
                }
            }
        }
        // Model-specific setting: setStyle('existing', 'lotLines', 'color', '#fff')
        const model = modelOrCategory
        const category = categoryOrProperty
        const property = propertyOrValue
        return {
            viewSettings: {
                ...state.viewSettings,
                styleSettings: {
                    ...state.viewSettings.styleSettings,
                    [model]: {
                        ...state.viewSettings.styleSettings[model],
                        [category]: {
                            ...state.viewSettings.styleSettings[model][category],
                            [property]: value
                        }
                    }
                }
            }
        }
    }),
    toggleProjection: () => set((state) => ({ viewSettings: { ...state.viewSettings, projection: state.viewSettings.projection === 'perspective' ? 'orthographic' : 'perspective' } })),
    toggleBackgroundMode: () => set((state) => ({ viewSettings: { ...state.viewSettings, backgroundMode: state.viewSettings.backgroundMode === 'dark' ? 'light' : 'dark' } })),
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
    // Export trigger actions
    triggerExport: () => set((state) => ({
        viewSettings: { ...state.viewSettings, exportRequested: true }
    })),
    resetExport: () => set((state) => ({
        viewSettings: { ...state.viewSettings, exportRequested: false }
    })),
    // Sun simulation actions
    setSunSetting: (key, value) => set((state) => ({
        sunSettings: { ...state.sunSettings, [key]: value }
    })),
    toggleSun: () => set((state) => ({
        sunSettings: { ...state.sunSettings, enabled: !state.sunSettings.enabled }
    })),
    setSunTime: (time) => set((state) => ({
        sunSettings: { ...state.sunSettings, time }
    })),
    setSunDate: (date) => set((state) => ({
        sunSettings: { ...state.sunSettings, date }
    })),
    setSunLocation: (latitude, longitude) => set((state) => ({
        sunSettings: { ...state.sunSettings, latitude, longitude }
    })),
    toggleSunAnimation: () => set((state) => ({
        sunSettings: { ...state.sunSettings, animating: !state.sunSettings.animating }
    })),
    // Render settings actions
    setRenderSetting: (key, value) => set((state) => ({
        renderSettings: { ...state.renderSettings, [key]: value }
    })),
    toggleAO: () => set((state) => ({
        renderSettings: { ...state.renderSettings, ambientOcclusion: !state.renderSettings.ambientOcclusion }
    })),
}))
