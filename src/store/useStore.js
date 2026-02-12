import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { temporal } from 'zundo'

// ============================================
// Polygon Geometry Utility Functions
// ============================================

// Generate unique vertex ID
let vertexIdCounter = 0;
const generateVertexId = () => `v${Date.now()}_${vertexIdCounter++}`;

// Convert rectangle parameters to vertex array (counter-clockwise from bottom-left)
export const rectToVertices = (width, depth, centerX = 0, centerY = 0) => {
    const w2 = width / 2;
    const d2 = depth / 2;
    return [
        { id: generateVertexId(), x: centerX - w2, y: centerY - d2 }, // Bottom-left
        { id: generateVertexId(), x: centerX + w2, y: centerY - d2 }, // Bottom-right
        { id: generateVertexId(), x: centerX + w2, y: centerY + d2 }, // Top-right
        { id: generateVertexId(), x: centerX - w2, y: centerY + d2 }, // Top-left
    ];
};

// Convert polygon vertices to bounding rectangle
export const verticesToBoundingRect = (vertices) => {
    if (!vertices || vertices.length === 0) return { width: 0, depth: 0, centerX: 0, centerY: 0 };
    const xs = vertices.map(v => v.x);
    const ys = vertices.map(v => v.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return {
        width: maxX - minX,
        depth: maxY - minY,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
    };
};

// Calculate polygon area using Shoelace formula
export const calculatePolygonArea = (vertices) => {
    if (!vertices || vertices.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < vertices.length; i++) {
        const j = (i + 1) % vertices.length;
        area += vertices[i].x * vertices[j].y;
        area -= vertices[j].x * vertices[i].y;
    }
    return Math.abs(area / 2);
};

// Snap value to grid
const snapToGrid = (value, gridSize = 1) => Math.round(value / gridSize) * gridSize;

// Determine if edge between two vertices is vertical (same X) or horizontal (same Y)
const isEdgeVertical = (v1, v2) => Math.abs(v1.x - v2.x) < 0.01;

// Apply perpendicular constraint when moving a vertex
// Adjusts adjacent vertices to maintain 90-degree angles
const applyPerpendicularConstraint = (vertices, movedIndex, newX, newY) => {
    const n = vertices.length;
    const prevIndex = (movedIndex - 1 + n) % n;
    const nextIndex = (movedIndex + 1) % n;

    const prevVertex = vertices[prevIndex];
    const currentVertex = vertices[movedIndex];
    const nextVertex = vertices[nextIndex];

    // Clone vertices
    const newVertices = vertices.map(v => ({ ...v }));

    // Determine edge orientations
    const prevEdgeVertical = isEdgeVertical(currentVertex, prevVertex);
    const nextEdgeVertical = isEdgeVertical(currentVertex, nextVertex);

    // Apply constraints to adjacent vertices
    if (prevEdgeVertical) {
        newVertices[prevIndex] = { ...prevVertex, x: newX };
    } else {
        newVertices[prevIndex] = { ...prevVertex, y: newY };
    }

    if (nextEdgeVertical) {
        newVertices[nextIndex] = { ...nextVertex, x: newX };
    } else {
        newVertices[nextIndex] = { ...nextVertex, y: newY };
    }

    // Update moved vertex
    newVertices[movedIndex] = { ...currentVertex, x: newX, y: newY };

    return newVertices;
};

// Calculate perpendicular direction for an edge (outward normal)
const getEdgePerpendicular = (v1, v2) => {
    const dx = v2.x - v1.x;
    const dy = v2.y - v1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return { x: 0, y: 1 };
    // Rotate 90 degrees counter-clockwise for outward normal
    return { x: -dy / len, y: dx / len };
};

export const useStore = create(
    temporal(
        persist(
            (set, get) => ({
                // UI Theme setting
                uiTheme: 'standard', // 'standard' | 'modern'
                setUiTheme: (theme) => set({ uiTheme: theme }),

                existing: {
                    lotWidth: 50,
                    lotDepth: 100,
                    setbackFront: 20,
                    setbackRear: 10,
                    setbackSideLeft: 5,
                    setbackSideRight: 5,
                    maxHeight: 30, // Max height plane (was buildingHeight)
                    buildingWidth: 30,
                    buildingDepth: 40,
                    buildingStories: 2, // Number of stories
                    firstFloorHeight: 12, // Height of first floor
                    upperFloorHeight: 10, // Height of upper floors
                    buildingX: 0, // Calculated in migration
                    buildingY: 0, // Calculated in migration
                    // Polygon editing state
                    lotGeometry: {
                        mode: 'rectangle', // 'rectangle' | 'polygon'
                        editing: false,    // Whether handles are visible
                        vertices: null,    // Array of {id, x, y} when in polygon mode
                    },
                },
                proposed: {
                    lotWidth: 72,
                    lotDepth: 100,
                    setbackFront: 15,
                    setbackRear: 10,
                    setbackSideLeft: 5,
                    setbackSideRight: 5,
                    maxHeight: 45, // Max height plane (was buildingHeight)
                    buildingWidth: 35,
                    buildingDepth: 50,
                    buildingStories: 3, // Number of stories
                    firstFloorHeight: 14, // Height of first floor
                    upperFloorHeight: 10, // Height of upper floors
                    buildingX: 0, // Calculated in migration
                    buildingY: 0, // Calculated in migration
                    // Polygon editing state
                    lotGeometry: {
                        mode: 'rectangle', // 'rectangle' | 'polygon'
                        editing: false,    // Whether handles are visible
                        vertices: null,    // Array of {id, x, y} when in polygon mode
                    },
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
                        roadModule: true, // Road module layer
                        maxHeightPlane: true, // Max height plane layer
                    },
                    exportRequested: false,
                    exportFormat: 'obj', // 'obj' | 'glb' | 'dae' | 'dxf' | 'png' | 'jpg' | 'svg'
                    exportSettings: { width: 1920, height: 1080, label: '1080p (1920x1080)' },
                    exportView: 'current', // 'current' | 'iso' | 'front' | 'top' | 'side' | 'left' | 'right'
                    exportLineScale: 1, // Scale factor for line widths during export (WYSIWYG)
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
                            maxHeightPlane: {
                                color: '#FF6B6B',
                                opacity: 0.3,
                                lineColor: '#FF0000',
                                lineWidth: 2,
                                lineDashed: true,
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
                            maxHeightPlane: {
                                color: '#FF6B6B',
                                opacity: 0.3,
                                lineColor: '#FF0000',
                                lineWidth: 2,
                                lineDashed: true,
                            },
                        },
                        // Shared settings
                        ground: {
                            color: '#1a1a2e',
                            opacity: 0.8,
                            visible: false
                        },
                        grid: {
                            sectionColor: '#9ca3af',  // Primary grid lines (gray-400)
                            cellColor: '#d1d5db',     // Secondary grid lines (gray-300)
                            sectionThickness: 1.5,
                            cellThickness: 1,
                            fadeDistance: 400,
                            fadeStrength: 1,
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
                            font: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff', // Default Inter
                            // Custom label settings - universal (applies to both existing and proposed)
                            // mode: 'value' (shows calculated value) or 'custom' (shows custom text)
                            customLabels: {
                                lotWidth: { mode: 'value', text: 'A' },
                                lotDepth: { mode: 'value', text: 'B' },
                                setbackFront: { mode: 'value', text: '' },
                                setbackRear: { mode: 'value', text: '' },
                                setbackLeft: { mode: 'value', text: '' },
                                setbackRight: { mode: 'value', text: '' },
                                buildingHeight: { mode: 'value', text: '' },
                            }
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

                // ============================================
                // Polygon Editing Actions
                // ============================================

                // Enable polygon editing mode - converts rectangle to vertices
                // Preserves the anchor point: existing lot anchors at (0,0) = bottom-right
                // Proposed lot anchors at (0,0) = bottom-left
                enablePolygonMode: (model) => set((state) => {
                    const params = state[model];
                    const w = params.lotWidth;
                    const d = params.lotDepth;

                    let vertices;
                    if (model === 'existing') {
                        // Existing: anchor at bottom-right (0,0)
                        // Lot extends to negative X
                        vertices = [
                            { id: generateVertexId(), x: -w, y: 0 },  // Bottom-left
                            { id: generateVertexId(), x: 0, y: 0 },   // Bottom-right (anchor)
                            { id: generateVertexId(), x: 0, y: d },   // Top-right
                            { id: generateVertexId(), x: -w, y: d },  // Top-left
                        ];
                    } else {
                        // Proposed: anchor at bottom-left (0,0)
                        // Lot extends to positive X
                        vertices = [
                            { id: generateVertexId(), x: 0, y: 0 },   // Bottom-left (anchor)
                            { id: generateVertexId(), x: w, y: 0 },   // Bottom-right
                            { id: generateVertexId(), x: w, y: d },   // Top-right
                            { id: generateVertexId(), x: 0, y: d },   // Top-left
                        ];
                    }

                    return {
                        [model]: {
                            ...state[model],
                            lotGeometry: {
                                mode: 'polygon',
                                editing: true,
                                vertices: vertices,
                            }
                        }
                    };
                }),

                // Toggle editing mode (show/hide handles) without changing shape
                setPolygonEditing: (model, editing) => set((state) => {
                    const geometry = state[model].lotGeometry;
                    if (!geometry || geometry.mode !== 'polygon') return state;
                    return {
                        [model]: {
                            ...state[model],
                            lotGeometry: {
                                ...geometry,
                                editing: editing,
                            }
                        }
                    };
                }),

                // Exit polygon mode and commit changes - updates lot dimensions from vertices
                commitPolygonChanges: (model) => set((state) => {
                    const geometry = state[model].lotGeometry;
                    if (!geometry || geometry.mode !== 'polygon' || !geometry.vertices) {
                        return state;
                    }
                    const bounds = verticesToBoundingRect(geometry.vertices);
                    return {
                        [model]: {
                            ...state[model],
                            lotWidth: bounds.width,
                            lotDepth: bounds.depth,
                            lotGeometry: {
                                ...geometry,
                                editing: false,
                            }
                        }
                    };
                }),

                // Reset to rectangle mode - discards polygon and uses current dimensions
                resetToRectangle: (model) => set((state) => {
                    const geometry = state[model].lotGeometry;
                    if (!geometry || geometry.mode !== 'polygon' || !geometry.vertices) {
                        return state;
                    }
                    const bounds = verticesToBoundingRect(geometry.vertices);
                    return {
                        [model]: {
                            ...state[model],
                            lotWidth: bounds.width,
                            lotDepth: bounds.depth,
                            lotGeometry: { mode: 'rectangle', editing: false, vertices: null }
                        }
                    };
                }),

                // Update a vertex position with perpendicular constraints
                updateVertex: (model, vertexIndex, newX, newY) => set((state) => {
                    const geometry = state[model].lotGeometry;
                    if (!geometry || !geometry.vertices) return state;

                    // Snap to grid
                    const snappedX = snapToGrid(newX);
                    const snappedY = snapToGrid(newY);

                    // Apply perpendicular constraint
                    const newVertices = applyPerpendicularConstraint(
                        geometry.vertices,
                        vertexIndex,
                        snappedX,
                        snappedY
                    );

                    // Update bounding dimensions for slider sync
                    const bounds = verticesToBoundingRect(newVertices);

                    return {
                        [model]: {
                            ...state[model],
                            lotWidth: bounds.width,
                            lotDepth: bounds.depth,
                            lotGeometry: {
                                ...geometry,
                                vertices: newVertices,
                            }
                        }
                    };
                }),

                // Split an edge by adding a new vertex at the midpoint
                splitEdge: (model, edgeIndex) => set((state) => {
                    const geometry = state[model].lotGeometry;
                    if (!geometry || !geometry.vertices) return state;

                    const vertices = geometry.vertices;
                    const n = vertices.length;
                    const v1 = vertices[edgeIndex];
                    const v2 = vertices[(edgeIndex + 1) % n];

                    // Calculate midpoint
                    const midX = (v1.x + v2.x) / 2;
                    const midY = (v1.y + v2.y) / 2;

                    // Create new vertex at midpoint
                    const newVertex = {
                        id: generateVertexId(),
                        x: snapToGrid(midX),
                        y: snapToGrid(midY),
                    };

                    // Insert new vertex after v1
                    const newVertices = [
                        ...vertices.slice(0, edgeIndex + 1),
                        newVertex,
                        ...vertices.slice(edgeIndex + 1)
                    ];

                    return {
                        [model]: {
                            ...state[model],
                            lotGeometry: {
                                ...geometry,
                                vertices: newVertices,
                            }
                        }
                    };
                }),

                // Extrude an edge perpendicular to itself (push/pull)
                extrudeEdge: (model, edgeIndex, distance) => set((state) => {
                    const geometry = state[model].lotGeometry;
                    if (!geometry || !geometry.vertices) return state;

                    const vertices = geometry.vertices;
                    const n = vertices.length;
                    const v1Index = edgeIndex;
                    const v2Index = (edgeIndex + 1) % n;
                    const v1 = vertices[v1Index];
                    const v2 = vertices[v2Index];

                    // Calculate perpendicular direction
                    const perp = getEdgePerpendicular(v1, v2);

                    // Snap distance to grid
                    const snappedDistance = snapToGrid(distance);
                    if (Math.abs(snappedDistance) < 0.5) return state;

                    // Move both vertices of the edge
                    const newVertices = vertices.map((v, i) => {
                        if (i === v1Index || i === v2Index) {
                            return {
                                ...v,
                                x: snapToGrid(v.x + perp.x * snappedDistance),
                                y: snapToGrid(v.y + perp.y * snappedDistance),
                            };
                        }
                        return v;
                    });

                    // Update bounding dimensions
                    const bounds = verticesToBoundingRect(newVertices);

                    return {
                        [model]: {
                            ...state[model],
                            lotWidth: bounds.width,
                            lotDepth: bounds.depth,
                            lotGeometry: {
                                ...geometry,
                                vertices: newVertices,
                            }
                        }
                    };
                }),

                // Delete a vertex (minimum 4 vertices required)
                deleteVertex: (model, vertexIndex) => set((state) => {
                    const geometry = state[model].lotGeometry;
                    if (!geometry || !geometry.vertices || geometry.vertices.length <= 4) {
                        return state; // Minimum 4 vertices for a valid polygon
                    }

                    const newVertices = geometry.vertices.filter((_, i) => i !== vertexIndex);
                    const bounds = verticesToBoundingRect(newVertices);

                    return {
                        [model]: {
                            ...state[model],
                            lotWidth: bounds.width,
                            lotDepth: bounds.depth,
                            lotGeometry: {
                                ...geometry,
                                vertices: newVertices,
                            }
                        }
                    };
                }),

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
                    viewSettings: { ...state.viewSettings, exportRequested: false, exportLineScale: 1 }
                })),
                setExportLineScale: (scale) => set((state) => ({
                    viewSettings: { ...state.viewSettings, exportLineScale: scale }
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
                // Update custom label for a specific dimension
                setCustomLabel: (dimensionKey, mode, text) => set((state) => ({
                    viewSettings: {
                        ...state.viewSettings,
                        styleSettings: {
                            ...state.viewSettings.styleSettings,
                            dimensionSettings: {
                                ...state.viewSettings.styleSettings.dimensionSettings,
                                customLabels: {
                                    ...state.viewSettings.styleSettings.dimensionSettings.customLabels,
                                    [dimensionKey]: { mode, text }
                                }
                            }
                        }
                    }
                })),
                // Layout Settings
                layoutSettings: {
                    lotSpacing: 10,
                },
                // Road Module Settings (shared parameters, applied to both existing and proposed)
                roadModule: {
                    enabled: true,
                    rightOfWay: 50, // Total depth of road module
                    roadWidth: 24, // Width of the road surface
                    // Optional elements - null means not included
                    leftParking: null,      // e.g., 8 for 8' parking lane
                    rightParking: null,
                    leftVerge: null,        // e.g., 6 for 6' verge/planting strip
                    rightVerge: null,
                    leftSidewalk: null,     // e.g., 5 for 5' sidewalk
                    rightSidewalk: null,
                    leftTransitionZone: null, // e.g., 4 for 4' transition zone
                    rightTransitionZone: null,
                },
                // Road Module Styles
                roadModuleStyles: {
                    rightOfWay: {
                        color: '#000000',
                        width: 1,
                        dashed: true,
                        dashSize: 2,
                        gapSize: 1,
                        opacity: 1.0,
                    },
                    roadWidth: {
                        lineColor: '#000000',
                        lineWidth: 1,
                        lineDashed: false,
                        lineOpacity: 1.0,
                        fillColor: '#666666',
                        fillOpacity: 0.8,
                    },
                    // Left side styles
                    leftParking: {
                        lineColor: '#000000',
                        lineWidth: 1,
                        lineDashed: false,
                        lineOpacity: 1.0,
                        fillColor: '#888888',
                        fillOpacity: 0.6,
                    },
                    leftVerge: {
                        lineColor: '#000000',
                        lineWidth: 1,
                        lineDashed: false,
                        lineOpacity: 1.0,
                        fillColor: '#c4a77d',
                        fillOpacity: 0.7,
                    },
                    leftSidewalk: {
                        lineColor: '#000000',
                        lineWidth: 1,
                        lineDashed: false,
                        lineOpacity: 1.0,
                        fillColor: '#90EE90',
                        fillOpacity: 0.7,
                    },
                    leftTransitionZone: {
                        lineColor: '#000000',
                        lineWidth: 1,
                        lineDashed: false,
                        lineOpacity: 1.0,
                        fillColor: '#98D8AA',
                        fillOpacity: 0.6,
                    },
                    // Right side styles
                    rightParking: {
                        lineColor: '#000000',
                        lineWidth: 1,
                        lineDashed: false,
                        lineOpacity: 1.0,
                        fillColor: '#888888',
                        fillOpacity: 0.6,
                    },
                    rightVerge: {
                        lineColor: '#000000',
                        lineWidth: 1,
                        lineDashed: false,
                        lineOpacity: 1.0,
                        fillColor: '#c4a77d',
                        fillOpacity: 0.7,
                    },
                    rightSidewalk: {
                        lineColor: '#000000',
                        lineWidth: 1,
                        lineDashed: false,
                        lineOpacity: 1.0,
                        fillColor: '#90EE90',
                        fillOpacity: 0.7,
                    },
                    rightTransitionZone: {
                        lineColor: '#000000',
                        lineWidth: 1,
                        lineDashed: false,
                        lineOpacity: 1.0,
                        fillColor: '#98D8AA',
                        fillOpacity: 0.6,
                    },
                },
                setLayoutSetting: (key, value) => set((state) => ({
                    layoutSettings: { ...state.layoutSettings, [key]: value }
                })),
                // Road Module Actions
                setRoadModuleSetting: (key, value) => set((state) => ({
                    roadModule: { ...state.roadModule, [key]: value }
                })),
                setRoadModuleStyle: (layerType, property, value) => set((state) => ({
                    roadModuleStyles: {
                        ...state.roadModuleStyles,
                        [layerType]: {
                            ...state.roadModuleStyles[layerType],
                            [property]: value
                        }
                    }
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

                // ============================================
                // Project Management
                // ============================================
                projectConfig: {
                    projectsDirectory: null,
                    isConfigured: false,
                },
                currentProject: null, // { id, name, path, createdAt, modifiedAt }
                projects: [], // List of available projects
                snapshots: [], // Snapshots for current project
                layerStates: [], // Layer states for current project
                cameraState: null, // Current camera state for snapshots

                // Toast notifications
                toast: null, // { message, type: 'success' | 'error' | 'info', id }
                showToast: (message, type = 'success') => {
                    const id = Date.now()
                    set({ toast: { message, type, id } })
                    // Auto-dismiss after 3 seconds
                    setTimeout(() => {
                        const currentToast = useStore.getState().toast
                        if (currentToast?.id === id) {
                            set({ toast: null })
                        }
                    }, 3000)
                },
                hideToast: () => set({ toast: null }),

                // Config actions
                setProjectConfig: (config) => set({
                    projectConfig: { ...config, isConfigured: !!config.projectsDirectory }
                }),

                // Project actions
                setCurrentProject: (project) => set({ currentProject: project }),
                setProjects: (projects) => set({ projects }),
                clearCurrentProject: () => set({
                    currentProject: null,
                    snapshots: [],
                    layerStates: []
                }),

                // Snapshot/Layer state list actions
                setSnapshots: (snapshots) => set({ snapshots }),
                setLayerStates: (layerStates) => set({ layerStates }),

                // Camera state for snapshots
                setCameraState: (cameraState) => set({ cameraState }),

                // Get current state for saving as snapshot (full state + camera)
                getSnapshotData: () => {
                    const state = useStore.getState();
                    return {
                        existing: state.existing,
                        proposed: state.proposed,
                        viewSettings: {
                            mode: state.viewSettings.mode,
                            projection: state.viewSettings.projection,
                            backgroundMode: state.viewSettings.backgroundMode,
                            layers: state.viewSettings.layers,
                            styleSettings: state.viewSettings.styleSettings,
                            lighting: state.viewSettings.lighting,
                        },
                        camera: state.cameraState,
                        roadModule: state.roadModule,
                        roadModuleStyles: state.roadModuleStyles,
                        renderSettings: state.renderSettings,
                        sunSettings: state.sunSettings,
                        layoutSettings: state.layoutSettings,
                    };
                },

                // Get current state for saving as layer state (styles only, no camera)
                getLayerStateData: () => {
                    const state = useStore.getState();
                    return {
                        viewSettings: {
                            layers: state.viewSettings.layers,
                            styleSettings: state.viewSettings.styleSettings,
                            lighting: state.viewSettings.lighting,
                        },
                        renderSettings: state.renderSettings,
                    };
                },

                // Apply loaded snapshot (full state + camera)
                applySnapshot: (snapshotData) => set((state) => {
                    const newState = {
                        existing: snapshotData.existing || state.existing,
                        proposed: snapshotData.proposed || state.proposed,
                        viewSettings: {
                            ...state.viewSettings,
                            mode: snapshotData.viewSettings?.mode || state.viewSettings.mode,
                            projection: snapshotData.viewSettings?.projection || state.viewSettings.projection,
                            backgroundMode: snapshotData.viewSettings?.backgroundMode || state.viewSettings.backgroundMode,
                            layers: snapshotData.viewSettings?.layers || state.viewSettings.layers,
                            styleSettings: snapshotData.viewSettings?.styleSettings || state.viewSettings.styleSettings,
                            lighting: snapshotData.viewSettings?.lighting || state.viewSettings.lighting,
                            // Increment viewVersion to trigger camera update
                            viewVersion: state.viewSettings.viewVersion + 1,
                        },
                        roadModule: snapshotData.roadModule || state.roadModule,
                        roadModuleStyles: snapshotData.roadModuleStyles || state.roadModuleStyles,
                        renderSettings: snapshotData.renderSettings || state.renderSettings,
                        sunSettings: snapshotData.sunSettings || state.sunSettings,
                        layoutSettings: snapshotData.layoutSettings || state.layoutSettings,
                    };
                    // Camera will be restored separately by the CameraHandler
                    if (snapshotData.camera) {
                        newState.cameraState = snapshotData.camera;
                        newState._restoreCamera = true; // Flag to trigger camera restoration
                    }
                    return newState;
                }),

                // Apply loaded layer state (styles only)
                applyLayerState: (layerStateData) => set((state) => ({
                    viewSettings: {
                        ...state.viewSettings,
                        layers: layerStateData.viewSettings?.layers || state.viewSettings.layers,
                        styleSettings: layerStateData.viewSettings?.styleSettings || state.viewSettings.styleSettings,
                        lighting: layerStateData.viewSettings?.lighting || state.viewSettings.lighting,
                    },
                    renderSettings: layerStateData.renderSettings || state.renderSettings,
                })),

                // Get full project state for saving
                getProjectState: () => {
                    const state = useStore.getState();
                    return {
                        existing: state.existing,
                        proposed: state.proposed,
                        viewSettings: state.viewSettings,
                        roadModule: state.roadModule,
                        roadModuleStyles: state.roadModuleStyles,
                        renderSettings: state.renderSettings,
                        sunSettings: state.sunSettings,
                        layoutSettings: state.layoutSettings,
                        savedViews: state.savedViews,
                        uiTheme: state.uiTheme,
                    };
                },

                // Apply loaded project state
                applyProjectState: (projectState) => set((state) => ({
                    existing: projectState.existing || state.existing,
                    proposed: projectState.proposed || state.proposed,
                    viewSettings: {
                        ...state.viewSettings,
                        ...projectState.viewSettings,
                        viewVersion: state.viewSettings.viewVersion + 1,
                    },
                    roadModule: projectState.roadModule || state.roadModule,
                    roadModuleStyles: projectState.roadModuleStyles || state.roadModuleStyles,
                    renderSettings: projectState.renderSettings || state.renderSettings,
                    sunSettings: projectState.sunSettings || state.sunSettings,
                    layoutSettings: projectState.layoutSettings || state.layoutSettings,
                    savedViews: projectState.savedViews || state.savedViews,
                    uiTheme: projectState.uiTheme || state.uiTheme,
                })),

                // Flag to signal camera restoration needed
                _restoreCamera: false,
                clearRestoreCameraFlag: () => set({ _restoreCamera: false }),
            }),
            {
                name: 'zoning-app-storage',
                version: 13, // Updated to 13 for custom dimension labels
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

                    if (version < 8) {
                        // Migration to 8
                        // Add lotGeometry to existing and proposed
                        const defaultLotGeometry = {
                            mode: 'rectangle',
                            vertices: null,
                        };
                        if (persistedState.existing && !persistedState.existing.lotGeometry) {
                            persistedState.existing.lotGeometry = defaultLotGeometry;
                        }
                        if (persistedState.proposed && !persistedState.proposed.lotGeometry) {
                            persistedState.proposed.lotGeometry = defaultLotGeometry;
                        }
                    }

                    if (version < 9) {
                        // Migration to 9
                        // Add editing flag and reset any cached polygon vertices to fix positioning
                        const fixLotGeometry = (lotGeometry) => {
                            if (!lotGeometry) {
                                return { mode: 'rectangle', editing: false, vertices: null };
                            }
                            // Reset to rectangle to fix any incorrectly positioned polygons
                            return {
                                mode: 'rectangle',
                                editing: false,
                                vertices: null,
                            };
                        };
                        if (persistedState.existing) {
                            persistedState.existing.lotGeometry = fixLotGeometry(persistedState.existing.lotGeometry);
                        }
                        if (persistedState.proposed) {
                            persistedState.proposed.lotGeometry = fixLotGeometry(persistedState.proposed.lotGeometry);
                        }
                    }

                    if (version < 10) {
                        // Migration to 10
                        // Add roadModule layer toggle and initialize roadModule/roadModuleStyles
                        if (persistedState.viewSettings?.layers && persistedState.viewSettings.layers.roadModule === undefined) {
                            persistedState.viewSettings.layers.roadModule = true;
                        }
                        if (!persistedState.roadModule) {
                            persistedState.roadModule = {
                                enabled: true,
                                rightOfWay: 50,
                                roadWidth: 24,
                                leftParking: null,
                                rightParking: null,
                                leftVerge: null,
                                rightVerge: null,
                                leftSidewalk: null,
                                rightSidewalk: null,
                                leftTransitionZone: null,
                                rightTransitionZone: null,
                            };
                        }
                    }

                    if (version < 11) {
                        // Migration to 11
                        // Update roadModuleStyles to have separate left/right styles
                        const defaultStyle = (fillColor) => ({
                            lineColor: '#000000',
                            lineWidth: 1,
                            lineDashed: false,
                            lineOpacity: 1.0,
                            fillColor,
                            fillOpacity: 0.7,
                        });

                        persistedState.roadModuleStyles = {
                            rightOfWay: persistedState.roadModuleStyles?.rightOfWay || {
                                color: '#000000',
                                width: 1,
                                dashed: true,
                                dashSize: 2,
                                gapSize: 1,
                                opacity: 1.0,
                            },
                            roadWidth: persistedState.roadModuleStyles?.roadWidth || {
                                lineColor: '#000000',
                                lineWidth: 1,
                                lineDashed: false,
                                lineOpacity: 1.0,
                                fillColor: '#666666',
                                fillOpacity: 0.8,
                            },
                            // Left side
                            leftParking: persistedState.roadModuleStyles?.leftParking || persistedState.roadModuleStyles?.parking || defaultStyle('#888888'),
                            leftVerge: persistedState.roadModuleStyles?.leftVerge || persistedState.roadModuleStyles?.verge || defaultStyle('#c4a77d'),
                            leftSidewalk: persistedState.roadModuleStyles?.leftSidewalk || persistedState.roadModuleStyles?.sidewalk || defaultStyle('#90EE90'),
                            leftTransitionZone: persistedState.roadModuleStyles?.leftTransitionZone || persistedState.roadModuleStyles?.transitionZone || defaultStyle('#98D8AA'),
                            // Right side
                            rightParking: persistedState.roadModuleStyles?.rightParking || persistedState.roadModuleStyles?.parking || defaultStyle('#888888'),
                            rightVerge: persistedState.roadModuleStyles?.rightVerge || persistedState.roadModuleStyles?.verge || defaultStyle('#c4a77d'),
                            rightSidewalk: persistedState.roadModuleStyles?.rightSidewalk || persistedState.roadModuleStyles?.sidewalk || defaultStyle('#90EE90'),
                            rightTransitionZone: persistedState.roadModuleStyles?.rightTransitionZone || persistedState.roadModuleStyles?.transitionZone || defaultStyle('#98D8AA'),
                        };
                    }

                    if (version < 12) {
                        // Migration to 12
                        // Add building stories, floor heights, and rename buildingHeight to maxHeight
                        const migrateModel = (model) => {
                            if (model) {
                                // Rename buildingHeight to maxHeight
                                if (model.buildingHeight !== undefined && model.maxHeight === undefined) {
                                    model.maxHeight = model.buildingHeight;
                                    delete model.buildingHeight;
                                }
                                // Add new building parameters with defaults
                                if (model.buildingStories === undefined) model.buildingStories = 2;
                                if (model.firstFloorHeight === undefined) model.firstFloorHeight = 12;
                                if (model.upperFloorHeight === undefined) model.upperFloorHeight = 10;
                            }
                        };
                        migrateModel(persistedState.existing);
                        migrateModel(persistedState.proposed);

                        // Add maxHeightPlane layer toggle
                        if (persistedState.viewSettings?.layers && persistedState.viewSettings.layers.maxHeightPlane === undefined) {
                            persistedState.viewSettings.layers.maxHeightPlane = true;
                        }

                        // Add maxHeightPlane styles
                        const defaultMaxHeightStyle = {
                            color: '#FF6B6B',
                            opacity: 0.3,
                            lineColor: '#FF0000',
                            lineWidth: 2,
                            lineDashed: true,
                        };
                        if (persistedState.viewSettings?.styleSettings?.existing && !persistedState.viewSettings.styleSettings.existing.maxHeightPlane) {
                            persistedState.viewSettings.styleSettings.existing.maxHeightPlane = defaultMaxHeightStyle;
                        }
                        if (persistedState.viewSettings?.styleSettings?.proposed && !persistedState.viewSettings.styleSettings.proposed.maxHeightPlane) {
                            persistedState.viewSettings.styleSettings.proposed.maxHeightPlane = defaultMaxHeightStyle;
                        }
                    }

                    if (version < 13) {
                        // Migration to 13
                        // Add universal customLabels to dimensionSettings (applies to both existing and proposed)
                        const dimSettings = persistedState.viewSettings?.styleSettings?.dimensionSettings || {};
                        // Reset to universal format (remove any old existing/proposed specific labels)
                        dimSettings.customLabels = {
                            lotWidth: { mode: 'value', text: 'A' },
                            lotDepth: { mode: 'value', text: 'B' },
                            setbackFront: { mode: 'value', text: '' },
                            setbackRear: { mode: 'value', text: '' },
                            setbackLeft: { mode: 'value', text: '' },
                            setbackRight: { mode: 'value', text: '' },
                            buildingHeight: { mode: 'value', text: '' },
                        };
                        if (persistedState.viewSettings?.styleSettings) {
                            persistedState.viewSettings.styleSettings.dimensionSettings = dimSettings;
                        }
                    }

                    return {
                        ...persistedState,
                        version: 13 // Update verified version
                    };
                },
                partialize: (state) => ({
                    existing: state.existing,
                    proposed: state.proposed,
                    viewSettings: state.viewSettings,
                    sunSettings: state.sunSettings,
                    renderSettings: state.renderSettings,
                    layoutSettings: state.layoutSettings,
                    roadModule: state.roadModule,
                    roadModuleStyles: state.roadModuleStyles,
                    savedViews: state.savedViews,
                    userDefaults: state.userDefaults,
                    projectConfig: state.projectConfig,
                    currentProject: state.currentProject,
                    uiTheme: state.uiTheme,
                }),
            }
        ),
        {
            limit: 50,
            partialize: (state) => {
                const { existing, proposed, viewSettings, layoutSettings, sunSettings, renderSettings, roadModule, roadModuleStyles } = state
                // Exclude export triggers from undo history
                const { exportRequested, ...trackedViewSettings } = viewSettings
                return { existing, proposed, viewSettings: trackedViewSettings, layoutSettings, sunSettings, renderSettings, roadModule, roadModuleStyles }
            }
        }
    )
);
