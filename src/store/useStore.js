import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { temporal } from 'zundo'

export const useStore = create(
    temporal(
        persist(
            (set) => ({
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
                    buildingX: 0, // Calculated in migration
                    buildingY: 0, // Calculated in migration
                },
                proposed: {
                    lotWidth: 72,
                    lotDepth: 100,
                    setbackFront: 15,
                    setbackRear: 10,
                    setbackSideLeft: 5,
                    setbackSideRight: 5,
                    buildingHeight: 45,
                    buildingWidth: 35,
                    buildingDepth: 50,
                    buildingX: 0, // Calculated in migration
                    buildingY: 0, // Calculated in migration
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
                        dimensionsLotWidth: true, // Renamed from dimensionsLot
                        dimensionsLotDepth: true, // Renamed from dimensionsLot
                        dimensionsSetbacks: true,
                        dimensionsHeight: true,
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
                                dashSize: 0.5,
                                gapSize: 0.2, // Reduced gaps
                                opacity: 1.0,
                                overrides: {
                                    front: { enabled: false, color: '#000000', width: 1.5, dashed: false },
                                    rear: { enabled: false, color: '#000000', width: 1.5, dashed: false },
                                    left: { enabled: false, color: '#000000', width: 1.5, dashed: false },
                                    right: { enabled: false, color: '#000000', width: 1.5, dashed: false },
                                }
                            },
                            setbacks: {
                                color: '#000000',
                                width: 1,
                                dashed: true,
                                dashSize: 1, // Smaller checks
                                gapSize: 0.5,
                                dashScale: 1,
                                opacity: 1.0,
                                overrides: {
                                    front: { enabled: false, color: '#000000', width: 1, dashed: true },
                                    rear: { enabled: false, color: '#000000', width: 1, dashed: true },
                                    left: { enabled: false, color: '#000000', width: 1, dashed: true },
                                    right: { enabled: false, color: '#000000', width: 1, dashed: true },
                                }
                            },
                            lotFill: {
                                color: '#E5E5E5', // Gray for existing
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
                                width: 1.5,
                                dashed: false,
                                dashSize: 0.5,
                                gapSize: 0.2,
                                opacity: 1.0,
                                overrides: {
                                    front: { enabled: false, color: '#000000', width: 1.5, dashed: false },
                                    rear: { enabled: false, color: '#000000', width: 1.5, dashed: false },
                                    left: { enabled: false, color: '#000000', width: 1.5, dashed: false },
                                    right: { enabled: false, color: '#000000', width: 1.5, dashed: false },
                                }
                            },
                            setbacks: {
                                color: '#000000',
                                width: 1,
                                dashed: true,
                                dashSize: 1,
                                gapSize: 0.5,
                                dashScale: 1,
                                opacity: 1.0,
                                overrides: {
                                    front: { enabled: false, color: '#000000', width: 1, dashed: true },
                                    rear: { enabled: false, color: '#000000', width: 1, dashed: true },
                                    left: { enabled: false, color: '#000000', width: 1, dashed: true },
                                    right: { enabled: false, color: '#000000', width: 1, dashed: true },
                                }
                            },
                            lotFill: {
                                color: '#FFFACD', // Light yellow for proposed
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
                                color: '#FFFFFF',
                                opacity: 0.9,
                                transparent: true
                            },
                        },
                        // Shared settings
                        ground: {
                            color: '#1a1a2e',
                            opacity: 0.8,
                            visible: false
                        },
                        dimensionSettings: {
                            textColor: '#000000',
                            lineColor: '#000000',
                            lineWidth: 1,
                            fontSize: 2,
                            endMarker: 'tick', // 'tick' | 'arrow' | 'dot'
                            opacity: 1.0,
                            outlineColor: '#ffffff', // New
                            outlineWidth: 0.1, // New, relative to font size (0.0 - 0.5)
                            extensionWidth: 0.5, // New, relative to main line width
                            font: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff' // Default Inter
                        }
                    },
                    lighting: {
                        shadows: true,
                        azimuth: 0.785, // 45 degrees
                        altitude: 0.523, // 30 degrees
                        intensity: 1.5
                    }
                },
                updateExisting: (key, value) => set((state) => ({ existing: { ...state.existing, [key]: value } })),
                updateProposed: (key, value) => set((state) => ({ proposed: { ...state.proposed, [key]: value } })),
                // New Action: Set Building Position
                setBuildingPosition: (model, x, y) => set((state) => ({
                    [model]: { ...state[model], buildingX: x, buildingY: y }
                })),
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
                setDimensionSetting: (key, value) => set((state) => ({
                    viewSettings: {
                        ...state.viewSettings,
                        styleSettings: {
                            ...state.viewSettings.styleSettings,
                            dimensionSettings: {
                                ...state.viewSettings.styleSettings.dimensionSettings,
                                [key]: value
                            }
                        }
                    }
                })),
                // Layout Settings
                layoutSettings: {
                    lotSpacing: 10,
                },
                setLayoutSetting: (key, value) => set((state) => ({
                    layoutSettings: { ...state.layoutSettings, [key]: value }
                })),
                setStyleOverride: (model, category, side, key, value) => set((state) => {
                    const currentStyle = state.viewSettings.styleSettings[model][category];
                    const currentOverrides = currentStyle.overrides || {};
                    const currentSide = currentOverrides[side] || {};

                    return {
                        viewSettings: {
                            ...state.viewSettings,
                            styleSettings: {
                                ...state.viewSettings.styleSettings,
                                [model]: {
                                    ...state.viewSettings.styleSettings[model],
                                    [category]: {
                                        ...state.viewSettings.styleSettings[model][category],
                                        overrides: {
                                            ...currentOverrides,
                                            [side]: {
                                                ...currentSide,
                                                [key]: value
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    };
                }),
                // Render settings actions
                setRenderSetting: (key, value) => set((state) => ({
                    renderSettings: { ...state.renderSettings, [key]: value }
                })),
                toggleAO: () => set((state) => ({
                    renderSettings: { ...state.renderSettings, ambientOcclusion: !state.renderSettings.ambientOcclusion }
                })),
                // Lighting settings actions
                setLighting: (key, value) => set((state) => ({
                    viewSettings: {
                        ...state.viewSettings,
                        lighting: { ...state.viewSettings.lighting, [key]: value }
                    }
                })),

                // User Defaults
                userDefaults: null, // Stores user's preferred style settings
                saveAsDefault: () => set((state) => ({
                    userDefaults: {
                        styleSettings: state.viewSettings.styleSettings,
                        lighting: state.viewSettings.lighting,
                        ground: state.viewSettings.styleSettings.ground // Ensure ground is captured if not in styleSettings
                    }
                })),
                loadUserDefaults: () => set((state) => {
                    if (!state.userDefaults) return state;
                    return {
                        viewSettings: {
                            ...state.viewSettings,
                            styleSettings: state.userDefaults.styleSettings,
                            lighting: state.userDefaults.lighting || state.viewSettings.lighting
                        }
                    };
                }),
            }),
            {
                name: 'zoning-app-storage',
                version: 7, // Updated to 7 to force migration
                migrate: (persistedState, version) => {
                    // Split dimensionsLot into dimensionsLotWidth and dimensionsLotDepth
                    if (persistedState.viewSettings && persistedState.viewSettings.layers && persistedState.viewSettings.layers.dimensionsLot !== undefined) {
                        persistedState.viewSettings.layers.dimensionsLotWidth = persistedState.viewSettings.layers.dimensionsLot;
                        persistedState.viewSettings.layers.dimensionsLotDepth = persistedState.viewSettings.layers.dimensionsLot;
                        delete persistedState.viewSettings.layers.dimensionsLot;
                    } else if (persistedState.viewSettings && persistedState.viewSettings.layers) {
                        // Ensure these exist if missing
                        if (persistedState.viewSettings.layers.dimensionsLotWidth === undefined) {
                            persistedState.viewSettings.layers.dimensionsLotWidth = true;
                        }
                        if (persistedState.viewSettings.layers.dimensionsLotDepth === undefined) {
                            persistedState.viewSettings.layers.dimensionsLotDepth = true;
                        }
                    }

                    if (version < 3) {
                        // Migration to 3
                        // Ensure dimensionSettings has text styling defaults
                        const styleSettings = persistedState.viewSettings.styleSettings || {};
                        const dimSettings = styleSettings.dimensionSettings || {};
                        styleSettings.dimensionSettings = {
                            ...dimSettings,
                            outlineColor: dimSettings.outlineColor || '#ffffff',
                            outlineWidth: dimSettings.outlineWidth !== undefined ? dimSettings.outlineWidth : 0.1,
                            font: dimSettings.font || 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff'
                        };
                        persistedState.viewSettings.styleSettings = styleSettings;
                    }

                    if (version < 4) {
                        // Migration to 4
                        // Initialize buildingX/Y with calculated centered defaults
                        if (persistedState.existing && persistedState.existing.buildingX === undefined) {
                            const { lotWidth, lotDepth, setbackFront, setbackRear, setbackSideLeft, setbackSideRight } = persistedState.existing;
                            persistedState.existing.buildingX = ((-lotWidth + setbackSideLeft) - setbackSideRight) / 2;
                            persistedState.existing.buildingY = (setbackFront + (lotDepth - setbackRear)) / 2;
                        }
                        if (persistedState.proposed && persistedState.proposed.buildingX === undefined) {
                            const { lotWidth, lotDepth, setbackFront, setbackRear, setbackSideLeft, setbackSideRight } = persistedState.proposed;
                            persistedState.proposed.buildingX = (setbackSideLeft + (lotWidth - setbackSideRight)) / 2;
                            persistedState.proposed.buildingY = (setbackFront + (lotDepth - setbackRear)) / 2;
                        }
                    }

                    if (version < 5) {
                        // Migration to 5
                        // Add extensionWidth to dimensionSettings
                        const styleSettings = persistedState.viewSettings.styleSettings || {};
                        const dimSettings = styleSettings.dimensionSettings || {};
                        styleSettings.dimensionSettings = {
                            ...dimSettings,
                            extensionWidth: dimSettings.extensionWidth !== undefined ? dimSettings.extensionWidth : 0.5
                        };
                        persistedState.viewSettings.styleSettings = styleSettings;
                    }

                    if (version < 6) {
                        // Migration to 6
                        // Add dimensionsHeight to layers
                        if (persistedState.viewSettings && persistedState.viewSettings.layers) {
                            persistedState.viewSettings.layers.dimensionsHeight = true;
                        }
                    }

                    if (version < 7) {
                        // Migration to 7
                        // Add ground to layers
                        if (persistedState.viewSettings && persistedState.viewSettings.layers) {
                            persistedState.viewSettings.layers.ground = true;
                        }
                    }

                    return {
                        ...persistedState,
                        version: 7 // Update verified version
                    };
                },
                partialize: (state) => ({
                    existing: state.existing,
                    proposed: state.proposed,
                    viewSettings: state.viewSettings,
                    sunSettings: state.sunSettings,
                    renderSettings: state.renderSettings,
                    layoutSettings: state.layoutSettings,

                    savedViews: state.savedViews,
                    userDefaults: state.userDefaults
                }),
            }
        ),
        {
            limit: 50,
            partialize: (state) => {
                const { existing, proposed, viewSettings, layoutSettings, sunSettings, renderSettings } = state
                // Exclude export triggers from undo history
                const { exportRequested, ...trackedViewSettings } = viewSettings
                return { existing, proposed, viewSettings: trackedViewSettings, layoutSettings, sunSettings, renderSettings }
            }
        }
    )
);
