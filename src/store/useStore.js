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

// ============================================
// Entity Factory Functions
// ============================================

let entityIdCounter = 0;
const generateEntityId = (prefix = 'lot') => `${prefix}-${Date.now()}-${entityIdCounter++}`;

export const createDefaultLot = (overrides = {}) => ({
    lotWidth: 50,
    lotDepth: 100,
    setbacks: {
        principal: {
            front: 20, maxFront: null, btzFront: null,
            rear: 10,
            sideInterior: 5,
            minSideStreet: null, maxSideStreet: null, btzSideStreet: null,
        },
        accessory: {
            front: null, rear: null, sideInterior: null, sideStreet: null,
        },
    },
    lotGeometry: { mode: 'rectangle', editing: false, vertices: null },
    buildings: {
        principal: {
            width: 30, depth: 40, stories: 2,
            firstFloorHeight: 12, upperFloorHeight: 10,
            x: 0, y: 0, maxHeight: 30,
            geometry: { mode: 'rectangle', vertices: null },
            selected: false,
            roof: { type: 'flat', overrideHeight: false, ridgeHeight: null, ridgeDirection: 'x', shedDirection: '+y' },
        },
        accessory: {
            width: 0, depth: 0, stories: 0,
            firstFloorHeight: 10, upperFloorHeight: 10,
            x: 0, y: 0, maxHeight: 15,
            geometry: { mode: 'rectangle', vertices: null },
            selected: false,
            roof: { type: 'flat', overrideHeight: false, ridgeHeight: null, ridgeDirection: 'x', shedDirection: '+y' },
        },
    },
    // Lot access (Model Parameters)
    lotAccess: { front: false, sideInterior: false, sideStreet: false, rear: false },
    // Parking locations (Model Parameters)
    parking: { front: false, sideInterior: false, sideStreet: false, rear: false },
    // Parking setbacks (Model Parameters)
    parkingSetbacks: { front: null, sideInterior: null, sideStreet: null, rear: null },
    ...overrides,
});

export const createDefaultLotStyle = (overrides = {}) => ({
    lotLines: {
        color: '#000000', width: 1.5, dashed: false, dashSize: 0.5, gapSize: 0.2, opacity: 1.0,
        overrides: {
            front: { enabled: false, color: '#000000', width: 1.5, dashed: false },
            rear: { enabled: false, color: '#000000', width: 1.5, dashed: false },
            left: { enabled: false, color: '#000000', width: 1.5, dashed: false },
            right: { enabled: false, color: '#000000', width: 1.5, dashed: false },
        }
    },
    setbacks: {
        color: '#000000', width: 1, dashed: true, dashSize: 1, gapSize: 0.5, dashScale: 1, opacity: 1.0,
        overrides: {
            front: { enabled: false, color: '#000000', width: 1, dashed: true },
            rear: { enabled: false, color: '#000000', width: 1, dashed: true },
            left: { enabled: false, color: '#000000', width: 1, dashed: true },
            right: { enabled: false, color: '#000000', width: 1, dashed: true },
        }
    },
    lotFill: { color: '#E5E5E5', opacity: 1.0, visible: true },
    buildingEdges: { color: '#000000', width: 1.5, visible: true, dashed: false, opacity: 1.0 },
    buildingFaces: { color: '#D5D5D5', opacity: 1.0, transparent: true },
    principalBuildingEdges: { color: '#000000', width: 1.5, visible: true, dashed: false, opacity: 1.0 },
    principalBuildingFaces: { color: '#D5D5D5', opacity: 1.0, transparent: true },
    accessoryBuildingEdges: { color: '#666666', width: 1.5, visible: true, dashed: false, opacity: 1.0 },
    accessoryBuildingFaces: { color: '#B0B0B0', opacity: 1.0, transparent: true },
    maxHeightPlane: { color: '#FF6B6B', opacity: 0.3, lineColor: '#FF0000', lineWidth: 2, lineDashed: true },
    maxSetbacks: {
        color: '#000000', width: 1, dashed: true, dashSize: 0.5, gapSize: 0.3, dashScale: 1, opacity: 1.0,
        overrides: {
            front: { enabled: false, color: '#000000', width: 1, dashed: true },
            rear: { enabled: false, color: '#000000', width: 1, dashed: true },
            left: { enabled: false, color: '#000000', width: 1, dashed: true },
            right: { enabled: false, color: '#000000', width: 1, dashed: true },
        }
    },
    roofFaces: { color: '#B8A088', opacity: 0.85, transparent: true },
    roofEdges: { color: '#000000', width: 1.5, visible: true, opacity: 1.0 },
    btzPlanes: { color: '#AA00FF', opacity: 1.0 },
    accessorySetbacks: {
        color: '#2196F3', width: 1, dashed: true, dashSize: 0.8, gapSize: 0.4, dashScale: 1, opacity: 1.0,
        overrides: {
            front: { enabled: false, color: '#2196F3', width: 1, dashed: true },
            rear: { enabled: false, color: '#2196F3', width: 1, dashed: true },
            left: { enabled: false, color: '#2196F3', width: 1, dashed: true },
            right: { enabled: false, color: '#2196F3', width: 1, dashed: true },
        }
    },
    lotAccessArrows: { color: '#FF00FF', opacity: 1.0 },
    ...overrides,
});

export const createDefaultRoadModule = (direction = 'front', type = 'S1', overrides = {}) => {
    const defaults = {
        S1: { rightOfWay: 50, roadWidth: 24, rightVerge: 7, rightSidewalk: 6 },
        S2: { rightOfWay: 40, roadWidth: 24, rightVerge: 5, rightSidewalk: 5 },
        S3: { rightOfWay: 20, roadWidth: 16 },
    };
    const d = defaults[type] || defaults.S1;
    return {
        direction,
        type,
        enabled: true,
        rightOfWay: d.rightOfWay,
        roadWidth: d.roadWidth,
        leftParking: null, rightParking: null,
        leftVerge: null, rightVerge: d.rightVerge || null,
        leftSidewalk: null, rightSidewalk: d.rightSidewalk || null,
        leftTransitionZone: null, rightTransitionZone: null,
        ...overrides,
    };
};

export const createDefaultLotVisibility = () => ({
    lotLines: true,
    setbacks: true,
    buildings: true,
    roof: true,
    maxHeightPlane: true,
    dimensions: true,
    accessoryBuilding: true,
    maxSetbacks: true,
    parkingSetbacks: false,
    btzPlanes: true,
    accessorySetbacks: true,
    lotAccessArrows: true,
});

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
                    // Building polygon editing state
                    buildingGeometry: {
                        mode: 'rectangle', // 'rectangle' | 'polygon'
                        vertices: null,    // Array of {id, x, y} when in polygon mode
                    },
                    selectedBuilding: false, // Whether building handles are visible
                    // Roof settings
                    roof: {
                        type: 'flat',          // 'flat' | 'shed' | 'gabled' | 'hipped'
                        overrideHeight: false, // Bypass max height for ridge
                        ridgeHeight: null,     // Manual ridge height (when overrideHeight true)
                        ridgeDirection: 'x',   // Ridge axis for gabled/hipped
                        shedDirection: '+y',   // Slope direction for shed: '+x' | '-x' | '+y' | '-y'
                    },
                    // Accessory building fields (0 width = hidden/disabled)
                    accessoryWidth: 0,
                    accessoryDepth: 0,
                    accessoryX: 0,
                    accessoryY: 0,
                    accessoryStories: 1,
                    accessoryFirstFloorHeight: 10,
                    accessoryUpperFloorHeight: 10,
                    accessoryMaxHeight: 15,
                    accessoryBuildingGeometry: { mode: 'rectangle' },
                    accessorySelectedBuilding: false,
                    accessoryRoof: {
                        type: 'flat',
                        overrideHeight: false,
                        ridgeHeight: null,
                        ridgeDirection: 'x',
                        shedDirection: '+y',
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
                    // Building polygon editing state
                    buildingGeometry: {
                        mode: 'rectangle', // 'rectangle' | 'polygon'
                        vertices: null,    // Array of {id, x, y} when in polygon mode
                    },
                    selectedBuilding: false, // Whether building handles are visible
                    // Roof settings
                    roof: {
                        type: 'flat',          // 'flat' | 'shed' | 'gabled' | 'hipped'
                        overrideHeight: false, // Bypass max height for ridge
                        ridgeHeight: null,     // Manual ridge height (when overrideHeight true)
                        ridgeDirection: 'x',   // Ridge axis for gabled/hipped
                        shedDirection: '+y',   // Slope direction for shed: '+x' | '-x' | '+y' | '-y'
                    },
                    // Accessory building fields (0 width = hidden/disabled)
                    accessoryWidth: 0,
                    accessoryDepth: 0,
                    accessoryX: 0,
                    accessoryY: 0,
                    accessoryStories: 1,
                    accessoryFirstFloorHeight: 10,
                    accessoryUpperFloorHeight: 10,
                    accessoryMaxHeight: 15,
                    accessoryBuildingGeometry: { mode: 'rectangle' },
                    accessorySelectedBuilding: false,
                    accessoryRoof: {
                        type: 'flat',
                        overrideHeight: false,
                        ridgeHeight: null,
                        ridgeDirection: 'x',
                        shedDirection: '+y',
                    },
                },
                // ============================================
                // Entity System (District Module)
                // ============================================
                // Coexists with existing/proposed for backward compat
                activeModule: 'comparison', // 'comparison' | 'district'
                entities: {
                    lots: {},         // { [lotId]: lotData }
                    roadModules: {},  // { [roadId]: roadModuleData }
                },
                entityOrder: [],      // lot IDs in display order
                nextEntityId: 1,
                activeEntityId: null,
                selectedBuildingType: null, // 'principal' | 'accessory' | null
                moveMode: {
                    active: false,
                    phase: null, // 'selectObject' | 'selectBase' | 'moving'
                    targetType: null, // 'building' | 'lotAccessArrow'
                    targetLotId: null,
                    targetBuildingType: null, // 'principal' | 'accessory'
                    targetDirection: null, // for lot access arrows
                    basePoint: null, // [x, y]
                    originalPosition: null, // [x, y]
                },
                entityStyles: {},     // { [lotId]: styleData }
                lotVisibility: {},    // { [lotId]: per-parameter visibility }
                modelSetup: {
                    numLots: 1,
                    streetEdges: { front: true, left: false, right: false, rear: false },
                    streetTypes: { front: 'S1', left: 'S1', right: 'S2', rear: 'S3' },
                },
                stashedRoadModules: {}, // { [direction]: roadModuleData } — preserved when street edge unchecked
                // Annotation system — shared text labels for lots, setbacks, roads, buildings
                annotationSettings: {
                    textRotation: 'billboard',   // 'follow-line' | 'billboard' | 'fixed'
                    fontSize: 1.5,
                    textColor: '#000000',
                    backgroundColor: '#ffffff',
                    backgroundOpacity: 0.85,
                    backgroundEnabled: true,
                    leaderLineColor: '#666666',
                    leaderLineWidth: 1,
                    leaderLineDashed: false,
                    unitFormat: 'feet',          // 'feet' | 'feet-inches' | 'meters'
                },
                annotationPositions: {},  // { [annotationId]: [x, y, z] | null }

                districtParameters: {
                    // Informational/reference fields — not visualized in 3D
                    lotArea: { min: null, max: null },
                    lotCoverage: { min: null, max: null },
                    lotWidth: { min: null, max: null },
                    lotWidthAtSetback: { min: null, max: null },
                    lotDepth: { min: null, max: null },
                    setbacksPrincipal: {
                        front: { min: null, max: null },
                        btzFront: null,
                        rear: { min: null, max: null },
                        sideInterior: { min: null, max: null },
                        sideStreet: { min: null, max: null },
                        btzSideStreet: null,
                        distanceBetweenBuildings: { min: null, max: null },
                    },
                    setbacksAccessory: {
                        front: { min: null, max: null },
                        rear: { min: null, max: null },
                        sideInterior: { min: null, max: null },
                        sideStreet: { min: null, max: null },
                        distanceBetweenBuildings: { min: null, max: null },
                    },
                    structures: {
                        principal: {
                            height: { min: null, max: null },
                            stories: { min: null, max: null },
                            firstStoryHeight: { min: null, max: null },
                            upperStoryHeight: { min: null, max: null },
                        },
                        accessory: {
                            height: { min: null, max: null },
                            stories: { min: null, max: null },
                            firstStoryHeight: { min: null, max: null },
                            upperStoryHeight: { min: null, max: null },
                        },
                    },
                    lotAccess: {
                        primaryStreet: { min: null, max: null, permitted: false },
                        secondaryStreet: { min: null, max: null, permitted: false },
                        rearAlley: { min: null, max: null, permitted: false },
                        sharedDrive: { min: null, max: null, permitted: false },
                    },
                    parkingLocations: {
                        front: { min: null, max: null, permitted: false },
                        sideInterior: { min: null, max: null, permitted: false },
                        sideStreet: { min: null, max: null, permitted: false },
                        rear: { min: null, max: null, permitted: false },
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
                        roof: true, // Roof layer
                        // Annotation & intersection layers
                        annotationLabels: false, // Master toggle for all annotation labels
                        labelLotNames: true,     // "Lot 1", "Lot 2" etc.
                        labelLotEdges: true,     // "Front of Lot", "Rear of Lot" etc.
                        labelSetbacks: true,     // "Front Setback" etc.
                        labelMaxSetbacks: true,  // "Max. Front Setback" etc.
                        labelRoadNames: true,    // "S1 - Primary Street" etc.
                        labelRoadZones: true,    // "Right of Way", "Sidewalk" etc.
                        labelBuildings: true,    // "Principal Building", "Accessory Building"
                        maxSetbacks: true,       // Max setback lines
                        btzPlanes: true,         // BTZ front + side street planes
                        accessorySetbacks: true, // Accessory setback lines
                        lotAccessArrows: true,   // Lot access directional arrows
                        roadIntersections: true, // Road intersection fillet geometry
                    },
                    exportRequested: false,
                    exportFormat: 'obj', // 'obj' | 'glb' | 'dae' | 'dxf' | 'png' | 'jpg' | 'svg'
                    exportSettings: { width: 1920, height: 1080, label: '1080p (1920x1080)' },
                    exportView: 'current', // 'current' | 'iso' | 'front' | 'top' | 'side' | 'left' | 'right'
                    exportLineScale: 1, // Scale factor for line widths during export (WYSIWYG)
                    exportQueue: [],          // Array of { presetSlot, cameraView, layers, label } for batch export
                    isBatchExporting: false,  // Batch export in progress flag
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
                            roofFaces: {
                                color: '#B8A088',
                                opacity: 0.85,
                                transparent: true,
                            },
                            roofEdges: {
                                color: '#000000',
                                width: 1.5,
                                visible: true,
                                opacity: 1.0,
                            },
                            // Accessory building styles
                            accessoryBuildingEdges: {
                                color: '#555555',
                                width: 1.0,
                                visible: true,
                                dashed: false,
                                opacity: 1.0,
                            },
                            accessoryBuildingFaces: {
                                color: '#E0E0E0',
                                opacity: 0.9,
                                transparent: true,
                            },
                            accessoryRoofFaces: {
                                color: '#C8B898',
                                opacity: 0.85,
                                transparent: true,
                            },
                            accessoryRoofEdges: {
                                color: '#555555',
                                width: 1.0,
                                visible: true,
                                opacity: 1.0,
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
                            roofFaces: {
                                color: '#C4B8A8',
                                opacity: 0.85,
                                transparent: true,
                            },
                            roofEdges: {
                                color: '#000000',
                                width: 1.5,
                                visible: true,
                                opacity: 1.0,
                            },
                            // Accessory building styles
                            accessoryBuildingEdges: {
                                color: '#555555',
                                width: 1.0,
                                visible: true,
                                dashed: false,
                                opacity: 1.0,
                            },
                            accessoryBuildingFaces: {
                                color: '#F0F0F0',
                                opacity: 0.85,
                                transparent: true,
                            },
                            accessoryRoofFaces: {
                                color: '#D4C8B8',
                                opacity: 0.85,
                                transparent: true,
                            },
                            accessoryRoofEdges: {
                                color: '#555555',
                                width: 1.0,
                                visible: true,
                                opacity: 1.0,
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
                            // Enhanced dimension settings
                            textMode: 'follow-line',   // 'follow-line' | 'billboard'
                            textBackground: {
                                enabled: false,
                                color: '#ffffff',
                                opacity: 0.85,
                                padding: 0.3,
                            },
                            autoStack: true,           // Auto-offset parallel dimensions
                            stackGap: 8,               // Gap between stacked dimensions
                            unitFormat: 'feet',        // 'feet' | 'feet-inches' | 'meters'
                            draggableText: false,      // Allow dragging dimension text
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
                // New Action: Set Building Position (translates polygon vertices if in polygon mode)
                setBuildingPosition: (model, newX, newY) => set((state) => {
                    const current = state[model]
                    const dx = newX - current.buildingX
                    const dy = newY - current.buildingY
                    const geometry = current.buildingGeometry

                    if (geometry?.mode === 'polygon' && geometry.vertices?.length >= 3) {
                        const newVertices = geometry.vertices.map(v => ({
                            ...v,
                            x: v.x + dx,
                            y: v.y + dy,
                        }))
                        return {
                            [model]: {
                                ...current,
                                buildingX: newX,
                                buildingY: newY,
                                buildingGeometry: { ...geometry, vertices: newVertices },
                            }
                        }
                    }

                    return { [model]: { ...current, buildingX: newX, buildingY: newY } }
                }),

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

                // ============================================
                // Building Polygon Editing Actions
                // ============================================

                // Select/deselect building (shows/hides handles)
                selectBuilding: (model, selected) => set((state) => ({
                    [model]: { ...state[model], selectedBuilding: selected }
                })),

                // Deselect all buildings (click-outside) — includes accessory
                deselectAllBuildings: () => set((state) => ({
                    existing: { ...state.existing, selectedBuilding: false, accessorySelectedBuilding: false },
                    proposed: { ...state.proposed, selectedBuilding: false, accessorySelectedBuilding: false },
                })),

                // Enable building polygon mode - converts rect to vertices centered on building position
                enableBuildingPolygonMode: (model) => set((state) => {
                    const params = state[model];
                    const bx = params.buildingX;
                    const by = params.buildingY;
                    const w2 = params.buildingWidth / 2;
                    const d2 = params.buildingDepth / 2;
                    const vertices = [
                        { id: generateVertexId(), x: bx - w2, y: by - d2 }, // BL
                        { id: generateVertexId(), x: bx + w2, y: by - d2 }, // BR
                        { id: generateVertexId(), x: bx + w2, y: by + d2 }, // TR
                        { id: generateVertexId(), x: bx - w2, y: by + d2 }, // TL
                    ];
                    return {
                        [model]: {
                            ...state[model],
                            buildingGeometry: { mode: 'polygon', vertices },
                        }
                    };
                }),

                // Update building vertex with perpendicular constraints + grid snap
                updateBuildingVertex: (model, vertexIndex, newX, newY) => set((state) => {
                    const geometry = state[model].buildingGeometry;
                    if (!geometry || !geometry.vertices) return state;
                    const snappedX = snapToGrid(newX);
                    const snappedY = snapToGrid(newY);
                    const newVertices = applyPerpendicularConstraint(geometry.vertices, vertexIndex, snappedX, snappedY);
                    const bounds = verticesToBoundingRect(newVertices);
                    return {
                        [model]: {
                            ...state[model],
                            buildingWidth: bounds.width,
                            buildingDepth: bounds.depth,
                            buildingX: bounds.centerX,
                            buildingY: bounds.centerY,
                            buildingGeometry: { ...geometry, vertices: newVertices },
                        }
                    };
                }),

                // Split building edge - add vertex at midpoint
                splitBuildingEdge: (model, edgeIndex) => set((state) => {
                    const geometry = state[model].buildingGeometry;
                    if (!geometry || !geometry.vertices) return state;
                    const vertices = geometry.vertices;
                    const n = vertices.length;
                    const v1 = vertices[edgeIndex];
                    const v2 = vertices[(edgeIndex + 1) % n];
                    const newVertex = {
                        id: generateVertexId(),
                        x: snapToGrid((v1.x + v2.x) / 2),
                        y: snapToGrid((v1.y + v2.y) / 2),
                    };
                    const newVertices = [
                        ...vertices.slice(0, edgeIndex + 1),
                        newVertex,
                        ...vertices.slice(edgeIndex + 1)
                    ];
                    return {
                        [model]: {
                            ...state[model],
                            buildingGeometry: { ...geometry, vertices: newVertices },
                        }
                    };
                }),

                // Extrude building edge perpendicular (push/pull)
                extrudeBuildingEdge: (model, edgeIndex, distance) => set((state) => {
                    const geometry = state[model].buildingGeometry;
                    if (!geometry || !geometry.vertices) return state;
                    const vertices = geometry.vertices;
                    const n = vertices.length;
                    const v1Index = edgeIndex;
                    const v2Index = (edgeIndex + 1) % n;
                    const v1 = vertices[v1Index];
                    const v2 = vertices[v2Index];
                    const perp = getEdgePerpendicular(v1, v2);
                    const snappedDistance = snapToGrid(distance);
                    if (Math.abs(snappedDistance) < 0.5) return state;
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
                    const bounds = verticesToBoundingRect(newVertices);
                    return {
                        [model]: {
                            ...state[model],
                            buildingWidth: bounds.width,
                            buildingDepth: bounds.depth,
                            buildingX: bounds.centerX,
                            buildingY: bounds.centerY,
                            buildingGeometry: { ...geometry, vertices: newVertices },
                        }
                    };
                }),

                // Delete building vertex (minimum 4 vertices required)
                deleteBuildingVertex: (model, vertexIndex) => set((state) => {
                    const geometry = state[model].buildingGeometry;
                    if (!geometry || !geometry.vertices || geometry.vertices.length <= 4) return state;
                    const newVertices = geometry.vertices.filter((_, i) => i !== vertexIndex);
                    const bounds = verticesToBoundingRect(newVertices);
                    return {
                        [model]: {
                            ...state[model],
                            buildingWidth: bounds.width,
                            buildingDepth: bounds.depth,
                            buildingX: bounds.centerX,
                            buildingY: bounds.centerY,
                            buildingGeometry: { ...geometry, vertices: newVertices },
                        }
                    };
                }),

                // Reset building to rectangle mode
                resetBuildingToRectangle: (model) => set((state) => {
                    const geometry = state[model].buildingGeometry;
                    if (!geometry || geometry.mode !== 'polygon') return state;
                    const bounds = geometry.vertices ? verticesToBoundingRect(geometry.vertices) : {
                        width: state[model].buildingWidth,
                        depth: state[model].buildingDepth,
                        centerX: state[model].buildingX,
                        centerY: state[model].buildingY,
                    };
                    return {
                        [model]: {
                            ...state[model],
                            buildingWidth: bounds.width,
                            buildingDepth: bounds.depth,
                            buildingX: bounds.centerX,
                            buildingY: bounds.centerY,
                            buildingGeometry: { mode: 'rectangle', vertices: null },
                        }
                    };
                }),

                // Adjust building total height by modifying upperFloorHeight
                setBuildingTotalHeight: (model, newTotalHeight) => set((state) => {
                    const params = state[model];
                    const stories = params.buildingStories || 1;
                    const firstFloor = params.firstFloorHeight;
                    if (stories === 1) {
                        return { [model]: { ...state[model], firstFloorHeight: Math.max(1, newTotalHeight) } };
                    }
                    const newUpperFloor = Math.max(1, (newTotalHeight - firstFloor) / (stories - 1));
                    return {
                        [model]: { ...state[model], upperFloorHeight: newUpperFloor }
                    };
                }),

                // ============================================
                // Roof Actions
                // ============================================

                setRoofSetting: (model, key, value) => set((state) => ({
                    [model]: {
                        ...state[model],
                        roof: { ...state[model].roof, [key]: value }
                    }
                })),

                // ============================================
                // Accessory Building Actions (Comparison Module)
                // ============================================

                // Select/deselect accessory building
                selectAccessoryBuilding: (model, selected) => set((state) => ({
                    [model]: { ...state[model], accessorySelectedBuilding: selected }
                })),

                // Deselect all accessory buildings (click-outside)
                deselectAllAccessoryBuildings: () => set((state) => ({
                    existing: { ...state.existing, accessorySelectedBuilding: false },
                    proposed: { ...state.proposed, accessorySelectedBuilding: false },
                })),

                // Set accessory building position (translates polygon vertices if in polygon mode)
                setAccessoryBuildingPosition: (model, newX, newY) => set((state) => {
                    const current = state[model]
                    const dx = newX - current.accessoryX
                    const dy = newY - current.accessoryY
                    const geometry = current.accessoryBuildingGeometry

                    if (geometry?.mode === 'polygon' && geometry.vertices?.length >= 3) {
                        const newVertices = geometry.vertices.map(v => ({
                            ...v,
                            x: v.x + dx,
                            y: v.y + dy,
                        }))
                        return {
                            [model]: {
                                ...current,
                                accessoryX: newX,
                                accessoryY: newY,
                                accessoryBuildingGeometry: { ...geometry, vertices: newVertices },
                            }
                        }
                    }

                    return { [model]: { ...current, accessoryX: newX, accessoryY: newY } }
                }),

                // Enable accessory building polygon mode
                enableAccessoryBuildingPolygonMode: (model) => set((state) => {
                    const params = state[model];
                    const bx = params.accessoryX;
                    const by = params.accessoryY;
                    const w2 = params.accessoryWidth / 2;
                    const d2 = params.accessoryDepth / 2;
                    const vertices = [
                        { id: generateVertexId(), x: bx - w2, y: by - d2 },
                        { id: generateVertexId(), x: bx + w2, y: by - d2 },
                        { id: generateVertexId(), x: bx + w2, y: by + d2 },
                        { id: generateVertexId(), x: bx - w2, y: by + d2 },
                    ];
                    return {
                        [model]: {
                            ...state[model],
                            accessoryBuildingGeometry: { mode: 'polygon', vertices },
                        }
                    };
                }),

                // Update accessory building vertex with perpendicular constraints + grid snap
                updateAccessoryBuildingVertex: (model, vertexIndex, newX, newY) => set((state) => {
                    const geometry = state[model].accessoryBuildingGeometry;
                    if (!geometry || !geometry.vertices) return state;
                    const snappedX = snapToGrid(newX);
                    const snappedY = snapToGrid(newY);
                    const newVertices = applyPerpendicularConstraint(geometry.vertices, vertexIndex, snappedX, snappedY);
                    const bounds = verticesToBoundingRect(newVertices);
                    return {
                        [model]: {
                            ...state[model],
                            accessoryWidth: bounds.width,
                            accessoryDepth: bounds.depth,
                            accessoryX: bounds.centerX,
                            accessoryY: bounds.centerY,
                            accessoryBuildingGeometry: { ...geometry, vertices: newVertices },
                        }
                    };
                }),

                // Split accessory building edge
                splitAccessoryBuildingEdge: (model, edgeIndex) => set((state) => {
                    const geometry = state[model].accessoryBuildingGeometry;
                    if (!geometry || !geometry.vertices) return state;
                    const vertices = geometry.vertices;
                    const n = vertices.length;
                    const v1 = vertices[edgeIndex];
                    const v2 = vertices[(edgeIndex + 1) % n];
                    const newVertex = {
                        id: generateVertexId(),
                        x: snapToGrid((v1.x + v2.x) / 2),
                        y: snapToGrid((v1.y + v2.y) / 2),
                    };
                    const newVertices = [
                        ...vertices.slice(0, edgeIndex + 1),
                        newVertex,
                        ...vertices.slice(edgeIndex + 1)
                    ];
                    return {
                        [model]: {
                            ...state[model],
                            accessoryBuildingGeometry: { ...geometry, vertices: newVertices },
                        }
                    };
                }),

                // Extrude accessory building edge perpendicular
                extrudeAccessoryBuildingEdge: (model, edgeIndex, distance) => set((state) => {
                    const geometry = state[model].accessoryBuildingGeometry;
                    if (!geometry || !geometry.vertices) return state;
                    const vertices = geometry.vertices;
                    const n = vertices.length;
                    const v1Index = edgeIndex;
                    const v2Index = (edgeIndex + 1) % n;
                    const v1 = vertices[v1Index];
                    const v2 = vertices[v2Index];
                    const perp = getEdgePerpendicular(v1, v2);
                    const snappedDistance = snapToGrid(distance);
                    if (Math.abs(snappedDistance) < 0.5) return state;
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
                    const bounds = verticesToBoundingRect(newVertices);
                    return {
                        [model]: {
                            ...state[model],
                            accessoryWidth: bounds.width,
                            accessoryDepth: bounds.depth,
                            accessoryX: bounds.centerX,
                            accessoryY: bounds.centerY,
                            accessoryBuildingGeometry: { ...geometry, vertices: newVertices },
                        }
                    };
                }),

                // Delete accessory building vertex (minimum 4)
                deleteAccessoryBuildingVertex: (model, vertexIndex) => set((state) => {
                    const geometry = state[model].accessoryBuildingGeometry;
                    if (!geometry || !geometry.vertices || geometry.vertices.length <= 4) return state;
                    const newVertices = geometry.vertices.filter((_, i) => i !== vertexIndex);
                    const bounds = verticesToBoundingRect(newVertices);
                    return {
                        [model]: {
                            ...state[model],
                            accessoryWidth: bounds.width,
                            accessoryDepth: bounds.depth,
                            accessoryX: bounds.centerX,
                            accessoryY: bounds.centerY,
                            accessoryBuildingGeometry: { ...geometry, vertices: newVertices },
                        }
                    };
                }),

                // Reset accessory building to rectangle
                resetAccessoryBuildingToRectangle: (model) => set((state) => {
                    const geometry = state[model].accessoryBuildingGeometry;
                    if (!geometry || geometry.mode !== 'polygon') return state;
                    const bounds = geometry.vertices ? verticesToBoundingRect(geometry.vertices) : {
                        width: state[model].accessoryWidth,
                        depth: state[model].accessoryDepth,
                        centerX: state[model].accessoryX,
                        centerY: state[model].accessoryY,
                    };
                    return {
                        [model]: {
                            ...state[model],
                            accessoryWidth: bounds.width,
                            accessoryDepth: bounds.depth,
                            accessoryX: bounds.centerX,
                            accessoryY: bounds.centerY,
                            accessoryBuildingGeometry: { mode: 'rectangle', vertices: null },
                        }
                    };
                }),

                // Set accessory building total height
                setAccessoryBuildingTotalHeight: (model, newTotalHeight) => set((state) => {
                    const params = state[model];
                    const stories = params.accessoryStories || 1;
                    const firstFloor = params.accessoryFirstFloorHeight;
                    if (stories === 1) {
                        return { [model]: { ...state[model], accessoryFirstFloorHeight: Math.max(1, newTotalHeight) } };
                    }
                    const newUpperFloor = Math.max(1, (newTotalHeight - firstFloor) / (stories - 1));
                    return {
                        [model]: { ...state[model], accessoryUpperFloorHeight: newUpperFloor }
                    };
                }),

                // Set accessory roof setting
                setAccessoryRoofSetting: (model, key, value) => set((state) => ({
                    [model]: {
                        ...state[model],
                        accessoryRoof: { ...state[model].accessoryRoof, [key]: value }
                    }
                })),

                // ============================================
                // Entity CRUD Actions (District Module)
                // ============================================

                setActiveModule: (module) => set({ activeModule: module }),

                // Model setup
                setModelSetup: (key, value) => set((state) => ({
                    modelSetup: { ...state.modelSetup, [key]: value }
                })),
                setStreetEdge: (edge, enabled) => set((state) => {
                    const updatedSetup = {
                        ...state.modelSetup,
                        streetEdges: { ...state.modelSetup.streetEdges, [edge]: enabled }
                    }

                    if (!enabled) {
                        // Unchecking: stash road modules for this direction, then remove them
                        const toStash = Object.entries(state.entities.roadModules)
                            .find(([, road]) => road.direction === edge)
                        const remainingRoads = {}
                        for (const [id, road] of Object.entries(state.entities.roadModules)) {
                            if (road.direction !== edge) remainingRoads[id] = road
                        }
                        return {
                            modelSetup: updatedSetup,
                            stashedRoadModules: {
                                ...state.stashedRoadModules,
                                [edge]: toStash ? toStash[1] : state.stashedRoadModules[edge],
                            },
                            entities: { ...state.entities, roadModules: remainingRoads },
                        }
                    } else {
                        // Checking: restore from stash or create default
                        const stashed = state.stashedRoadModules[edge]
                        const roadId = `road-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
                        const roadData = stashed || createDefaultRoadModule(edge, state.modelSetup.streetTypes?.[edge] || 'S1')
                        const { [edge]: _, ...remainingStash } = state.stashedRoadModules
                        return {
                            modelSetup: updatedSetup,
                            stashedRoadModules: remainingStash,
                            entities: {
                                ...state.entities,
                                roadModules: { ...state.entities.roadModules, [roadId]: roadData },
                            },
                        }
                    }
                }),
                setStreetType: (edge, type) => set((state) => ({
                    modelSetup: {
                        ...state.modelSetup,
                        streetTypes: { ...state.modelSetup.streetTypes, [edge]: type }
                    }
                })),

                // District parameters (informational)
                setDistrictParameter: (path, value) => set((state) => {
                    // path is dot-separated, e.g. 'lotArea.min' or 'setbacksPrincipal.front.min'
                    const keys = path.split('.');
                    const newParams = JSON.parse(JSON.stringify(state.districtParameters));
                    let obj = newParams;
                    for (let i = 0; i < keys.length - 1; i++) {
                        if (!obj[keys[i]]) obj[keys[i]] = {};
                        obj = obj[keys[i]];
                    }
                    obj[keys[keys.length - 1]] = value;
                    return { districtParameters: newParams };
                }),

                // Lot CRUD
                addLot: (initialData) => set((state) => {
                    const lotId = generateEntityId('lot');
                    const lot = createDefaultLot(initialData);
                    const style = createDefaultLotStyle();
                    const visibility = createDefaultLotVisibility();
                    return {
                        entities: {
                            ...state.entities,
                            lots: { ...state.entities.lots, [lotId]: lot },
                        },
                        entityOrder: [...state.entityOrder, lotId],
                        nextEntityId: state.nextEntityId + 1,
                        entityStyles: { ...state.entityStyles, [lotId]: style },
                        lotVisibility: { ...state.lotVisibility, [lotId]: visibility },
                    };
                }),

                removeLot: (lotId) => set((state) => {
                    const { [lotId]: _, ...remainingLots } = state.entities.lots;
                    const { [lotId]: __, ...remainingStyles } = state.entityStyles;
                    const { [lotId]: ___, ...remainingVisibility } = state.lotVisibility;
                    return {
                        entities: {
                            ...state.entities,
                            lots: remainingLots,
                        },
                        entityOrder: state.entityOrder.filter(id => id !== lotId),
                        entityStyles: remainingStyles,
                        lotVisibility: remainingVisibility,
                        activeEntityId: state.activeEntityId === lotId ? null : state.activeEntityId,
                    };
                }),

                duplicateLot: (lotId) => set((state) => {
                    const sourceLot = state.entities.lots[lotId];
                    const sourceStyle = state.entityStyles[lotId];
                    const sourceVisibility = state.lotVisibility[lotId];
                    if (!sourceLot) return state;

                    const newLotId = generateEntityId('lot');
                    return {
                        entities: {
                            ...state.entities,
                            lots: {
                                ...state.entities.lots,
                                [newLotId]: JSON.parse(JSON.stringify(sourceLot)),
                            },
                        },
                        entityOrder: [...state.entityOrder, newLotId],
                        nextEntityId: state.nextEntityId + 1,
                        entityStyles: {
                            ...state.entityStyles,
                            [newLotId]: JSON.parse(JSON.stringify(sourceStyle || createDefaultLotStyle())),
                        },
                        lotVisibility: {
                            ...state.lotVisibility,
                            [newLotId]: JSON.parse(JSON.stringify(sourceVisibility || createDefaultLotVisibility())),
                        },
                    };
                }),

                // Lot parameter updates
                updateLotParam: (lotId, key, value) => set((state) => {
                    const lot = state.entities.lots[lotId];
                    if (!lot) return state;
                    return {
                        entities: {
                            ...state.entities,
                            lots: {
                                ...state.entities.lots,
                                [lotId]: { ...lot, [key]: value },
                            },
                        },
                    };
                }),

                updateLotSetback: (lotId, buildingType, key, value) => set((state) => {
                    const lot = state.entities.lots[lotId];
                    if (!lot) return state;
                    return {
                        entities: {
                            ...state.entities,
                            lots: {
                                ...state.entities.lots,
                                [lotId]: {
                                    ...lot,
                                    setbacks: {
                                        ...lot.setbacks,
                                        [buildingType]: {
                                            ...lot.setbacks[buildingType],
                                            [key]: value,
                                        },
                                    },
                                },
                            },
                        },
                    };
                }),

                // Building parameter updates
                updateBuildingParam: (lotId, buildingType, key, value) => set((state) => {
                    const lot = state.entities.lots[lotId];
                    if (!lot || !lot.buildings[buildingType]) return state;
                    return {
                        entities: {
                            ...state.entities,
                            lots: {
                                ...state.entities.lots,
                                [lotId]: {
                                    ...lot,
                                    buildings: {
                                        ...lot.buildings,
                                        [buildingType]: {
                                            ...lot.buildings[buildingType],
                                            [key]: value,
                                        },
                                    },
                                },
                            },
                        },
                    };
                }),

                deleteEntityBuilding: (lotId, buildingType) => set((state) => {
                    const lot = state.entities.lots[lotId]
                    if (!lot) return state
                    const resetBuilding = {
                        width: 0, depth: 0, stories: 0, x: 0, y: 0,
                        firstFloorHeight: buildingType === 'principal' ? 12 : 10,
                        upperFloorHeight: 10,
                        maxHeight: buildingType === 'principal' ? 30 : 15,
                        geometry: { mode: 'rectangle', vertices: null },
                        selected: false,
                        roof: { type: 'flat', overrideHeight: false, ridgeHeight: null, ridgeDirection: 'x', shedDirection: '+y' },
                    }
                    return {
                        entities: {
                            ...state.entities,
                            lots: {
                                ...state.entities.lots,
                                [lotId]: {
                                    ...lot,
                                    buildings: {
                                        ...lot.buildings,
                                        [buildingType]: resetBuilding,
                                    },
                                },
                            },
                        },
                        selectedBuildingType: null,
                    }
                }),

                regenerateEntityBuilding: (lotId, buildingType) => set((state) => {
                    const lot = state.entities.lots[lotId]
                    if (!lot) return state
                    const defaults = buildingType === 'principal'
                        ? { width: 30, depth: 40, stories: 2, firstFloorHeight: 12, upperFloorHeight: 10, x: 0, y: 0, maxHeight: 30 }
                        : { width: 15, depth: 20, stories: 1, firstFloorHeight: 10, upperFloorHeight: 10, x: 0, y: 15, maxHeight: 15 }
                    const newBuilding = {
                        ...defaults,
                        geometry: { mode: 'rectangle', vertices: null },
                        selected: false,
                        roof: { type: 'flat', overrideHeight: false, ridgeHeight: null, ridgeDirection: 'x', shedDirection: '+y' },
                    }
                    return {
                        entities: {
                            ...state.entities,
                            lots: {
                                ...state.entities.lots,
                                [lotId]: {
                                    ...lot,
                                    buildings: {
                                        ...lot.buildings,
                                        [buildingType]: newBuilding,
                                    },
                                },
                            },
                        },
                    }
                }),

                // Building roof settings (entity version)
                setEntityRoofSetting: (lotId, buildingType, key, value) => set((state) => {
                    const lot = state.entities.lots[lotId];
                    if (!lot || !lot.buildings[buildingType]) return state;
                    return {
                        entities: {
                            ...state.entities,
                            lots: {
                                ...state.entities.lots,
                                [lotId]: {
                                    ...lot,
                                    buildings: {
                                        ...lot.buildings,
                                        [buildingType]: {
                                            ...lot.buildings[buildingType],
                                            roof: {
                                                ...lot.buildings[buildingType].roof,
                                                [key]: value,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    };
                }),

                // Building total height (entity version)
                setEntityBuildingTotalHeight: (lotId, buildingType, newTotalHeight) => set((state) => {
                    const lot = state.entities.lots[lotId];
                    if (!lot) return state;
                    const building = lot.buildings[buildingType];
                    if (!building) return state;
                    const stories = building.stories || 1;
                    const firstFloor = building.firstFloorHeight;
                    let updates;
                    if (stories === 1) {
                        updates = { firstFloorHeight: Math.max(1, newTotalHeight) };
                    } else {
                        updates = { upperFloorHeight: Math.max(1, (newTotalHeight - firstFloor) / (stories - 1)) };
                    }
                    return {
                        entities: {
                            ...state.entities,
                            lots: {
                                ...state.entities.lots,
                                [lotId]: {
                                    ...lot,
                                    buildings: {
                                        ...lot.buildings,
                                        [buildingType]: { ...building, ...updates },
                                    },
                                },
                            },
                        },
                    };
                }),

                // Entity selection
                selectEntity: (lotId) => set({ activeEntityId: lotId }),
                deselectEntity: () => set({ activeEntityId: null, selectedBuildingType: null }),
                selectEntityBuilding: (lotId, buildingType) => set((state) => {
                    // Deselect any previously selected building
                    const lots = { ...state.entities.lots };
                    for (const id of state.entityOrder) {
                        if (lots[id]) {
                            const lot = lots[id];
                            const pSelected = lot.buildings.principal.selected;
                            const aSelected = lot.buildings.accessory.selected;
                            if (pSelected || aSelected) {
                                lots[id] = {
                                    ...lot,
                                    buildings: {
                                        ...lot.buildings,
                                        principal: { ...lot.buildings.principal, selected: false },
                                        accessory: { ...lot.buildings.accessory, selected: false },
                                    },
                                };
                            }
                        }
                    }
                    // Select the target building
                    if (lots[lotId]) {
                        lots[lotId] = {
                            ...lots[lotId],
                            buildings: {
                                ...lots[lotId].buildings,
                                [buildingType]: { ...lots[lotId].buildings[buildingType], selected: true },
                            },
                        };
                    }
                    return {
                        entities: { ...state.entities, lots },
                        activeEntityId: lotId,
                        selectedBuildingType: buildingType,
                    };
                }),
                deselectAllEntityBuildings: () => set((state) => {
                    const lots = { ...state.entities.lots };
                    for (const id of state.entityOrder) {
                        if (lots[id]) {
                            const lot = lots[id];
                            if (lot.buildings.principal.selected || lot.buildings.accessory.selected) {
                                lots[id] = {
                                    ...lot,
                                    buildings: {
                                        ...lot.buildings,
                                        principal: { ...lot.buildings.principal, selected: false },
                                        accessory: { ...lot.buildings.accessory, selected: false },
                                    },
                                };
                            }
                        }
                    }
                    return {
                        entities: { ...state.entities, lots },
                        selectedBuildingType: null,
                    };
                }),

                // Move mode actions
                enterMoveMode: () => set({
                    moveMode: { active: true, phase: 'selectObject', targetType: null, targetLotId: null, targetBuildingType: null, targetDirection: null, basePoint: null, originalPosition: null }
                }),
                exitMoveMode: () => set({
                    moveMode: { active: false, phase: null, targetType: null, targetLotId: null, targetBuildingType: null, targetDirection: null, basePoint: null, originalPosition: null }
                }),
                setMoveTarget: (targetType, lotId, buildingType, direction) => set((state) => ({
                    moveMode: { ...state.moveMode, phase: 'selectBase', targetType, targetLotId: lotId, targetBuildingType: buildingType, targetDirection: direction }
                })),
                setMoveBasePoint: (point, originalPosition) => set((state) => ({
                    moveMode: { ...state.moveMode, phase: 'moving', basePoint: point, originalPosition }
                })),

                // Entity building position
                setEntityBuildingPosition: (lotId, buildingType, newX, newY) => set((state) => {
                    const lot = state.entities.lots[lotId];
                    if (!lot) return state;
                    const building = lot.buildings[buildingType];
                    if (!building) return state;
                    const dx = newX - building.x;
                    const dy = newY - building.y;
                    const geometry = building.geometry;

                    let updatedBuilding;
                    if (geometry?.mode === 'polygon' && geometry.vertices?.length >= 3) {
                        const newVertices = geometry.vertices.map(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
                        updatedBuilding = { ...building, x: newX, y: newY, geometry: { ...geometry, vertices: newVertices } };
                    } else {
                        updatedBuilding = { ...building, x: newX, y: newY };
                    }

                    return {
                        entities: {
                            ...state.entities,
                            lots: {
                                ...state.entities.lots,
                                [lotId]: {
                                    ...lot,
                                    buildings: { ...lot.buildings, [buildingType]: updatedBuilding },
                                },
                            },
                        },
                    };
                }),

                // Entity polygon editing (lot)
                enableEntityPolygonMode: (lotId) => set((state) => {
                    const lot = state.entities.lots[lotId];
                    if (!lot) return state;
                    const w = lot.lotWidth;
                    const d = lot.lotDepth;
                    // District lots anchor at bottom-left (0,0), extend to positive X
                    const vertices = [
                        { id: generateVertexId(), x: 0, y: 0 },
                        { id: generateVertexId(), x: w, y: 0 },
                        { id: generateVertexId(), x: w, y: d },
                        { id: generateVertexId(), x: 0, y: d },
                    ];
                    return {
                        entities: {
                            ...state.entities,
                            lots: {
                                ...state.entities.lots,
                                [lotId]: {
                                    ...lot,
                                    lotGeometry: { mode: 'polygon', editing: true, vertices },
                                },
                            },
                        },
                    };
                }),

                setEntityPolygonEditing: (lotId, editing) => set((state) => {
                    const lot = state.entities.lots[lotId];
                    if (!lot || lot.lotGeometry?.mode !== 'polygon') return state;
                    return {
                        entities: {
                            ...state.entities,
                            lots: {
                                ...state.entities.lots,
                                [lotId]: {
                                    ...lot,
                                    lotGeometry: { ...lot.lotGeometry, editing },
                                },
                            },
                        },
                    };
                }),

                updateEntityVertex: (lotId, vertexIndex, newX, newY) => set((state) => {
                    const lot = state.entities.lots[lotId];
                    if (!lot || !lot.lotGeometry?.vertices) return state;
                    const snappedX = snapToGrid(newX);
                    const snappedY = snapToGrid(newY);
                    const newVertices = applyPerpendicularConstraint(lot.lotGeometry.vertices, vertexIndex, snappedX, snappedY);
                    const bounds = verticesToBoundingRect(newVertices);
                    return {
                        entities: {
                            ...state.entities,
                            lots: {
                                ...state.entities.lots,
                                [lotId]: {
                                    ...lot,
                                    lotWidth: bounds.width,
                                    lotDepth: bounds.depth,
                                    lotGeometry: { ...lot.lotGeometry, vertices: newVertices },
                                },
                            },
                        },
                    };
                }),

                splitEntityEdge: (lotId, edgeIndex) => set((state) => {
                    const lot = state.entities.lots[lotId];
                    if (!lot || !lot.lotGeometry?.vertices) return state;
                    const vertices = lot.lotGeometry.vertices;
                    const n = vertices.length;
                    const v1 = vertices[edgeIndex];
                    const v2 = vertices[(edgeIndex + 1) % n];
                    const newVertex = { id: generateVertexId(), x: snapToGrid((v1.x + v2.x) / 2), y: snapToGrid((v1.y + v2.y) / 2) };
                    const newVertices = [...vertices.slice(0, edgeIndex + 1), newVertex, ...vertices.slice(edgeIndex + 1)];
                    return {
                        entities: {
                            ...state.entities,
                            lots: {
                                ...state.entities.lots,
                                [lotId]: { ...lot, lotGeometry: { ...lot.lotGeometry, vertices: newVertices } },
                            },
                        },
                    };
                }),

                extrudeEntityEdge: (lotId, edgeIndex, distance) => set((state) => {
                    const lot = state.entities.lots[lotId];
                    if (!lot || !lot.lotGeometry?.vertices) return state;
                    const vertices = lot.lotGeometry.vertices;
                    const n = vertices.length;
                    const v1Index = edgeIndex;
                    const v2Index = (edgeIndex + 1) % n;
                    const perp = getEdgePerpendicular(vertices[v1Index], vertices[v2Index]);
                    const snappedDistance = snapToGrid(distance);
                    if (Math.abs(snappedDistance) < 0.5) return state;
                    const newVertices = vertices.map((v, i) => {
                        if (i === v1Index || i === v2Index) {
                            return { ...v, x: snapToGrid(v.x + perp.x * snappedDistance), y: snapToGrid(v.y + perp.y * snappedDistance) };
                        }
                        return v;
                    });
                    const bounds = verticesToBoundingRect(newVertices);
                    return {
                        entities: {
                            ...state.entities,
                            lots: {
                                ...state.entities.lots,
                                [lotId]: { ...lot, lotWidth: bounds.width, lotDepth: bounds.depth, lotGeometry: { ...lot.lotGeometry, vertices: newVertices } },
                            },
                        },
                    };
                }),

                deleteEntityVertex: (lotId, vertexIndex) => set((state) => {
                    const lot = state.entities.lots[lotId];
                    if (!lot || !lot.lotGeometry?.vertices || lot.lotGeometry.vertices.length <= 4) return state;
                    const newVertices = lot.lotGeometry.vertices.filter((_, i) => i !== vertexIndex);
                    const bounds = verticesToBoundingRect(newVertices);
                    return {
                        entities: {
                            ...state.entities,
                            lots: {
                                ...state.entities.lots,
                                [lotId]: { ...lot, lotWidth: bounds.width, lotDepth: bounds.depth, lotGeometry: { ...lot.lotGeometry, vertices: newVertices } },
                            },
                        },
                    };
                }),

                commitEntityPolygonChanges: (lotId) => set((state) => {
                    const lot = state.entities.lots[lotId];
                    if (!lot || lot.lotGeometry?.mode !== 'polygon' || !lot.lotGeometry.vertices) return state;
                    const bounds = verticesToBoundingRect(lot.lotGeometry.vertices);
                    return {
                        entities: {
                            ...state.entities,
                            lots: {
                                ...state.entities.lots,
                                [lotId]: { ...lot, lotWidth: bounds.width, lotDepth: bounds.depth, lotGeometry: { ...lot.lotGeometry, editing: false } },
                            },
                        },
                    };
                }),

                resetEntityToRectangle: (lotId) => set((state) => {
                    const lot = state.entities.lots[lotId];
                    if (!lot || lot.lotGeometry?.mode !== 'polygon') return state;
                    const bounds = lot.lotGeometry.vertices ? verticesToBoundingRect(lot.lotGeometry.vertices) : { width: lot.lotWidth, depth: lot.lotDepth };
                    return {
                        entities: {
                            ...state.entities,
                            lots: {
                                ...state.entities.lots,
                                [lotId]: { ...lot, lotWidth: bounds.width, lotDepth: bounds.depth, lotGeometry: { mode: 'rectangle', editing: false, vertices: null } },
                            },
                        },
                    };
                }),

                // Entity building polygon editing
                enableEntityBuildingPolygonMode: (lotId, buildingType) => set((state) => {
                    const lot = state.entities.lots[lotId];
                    if (!lot) return state;
                    const building = lot.buildings[buildingType];
                    if (!building) return state;
                    const bx = building.x;
                    const by = building.y;
                    const w2 = building.width / 2;
                    const d2 = building.depth / 2;
                    const vertices = [
                        { id: generateVertexId(), x: bx - w2, y: by - d2 },
                        { id: generateVertexId(), x: bx + w2, y: by - d2 },
                        { id: generateVertexId(), x: bx + w2, y: by + d2 },
                        { id: generateVertexId(), x: bx - w2, y: by + d2 },
                    ];
                    return {
                        entities: {
                            ...state.entities,
                            lots: {
                                ...state.entities.lots,
                                [lotId]: {
                                    ...lot,
                                    buildings: {
                                        ...lot.buildings,
                                        [buildingType]: { ...building, geometry: { mode: 'polygon', vertices } },
                                    },
                                },
                            },
                        },
                    };
                }),

                updateEntityBuildingVertex: (lotId, buildingType, vertexIndex, newX, newY) => set((state) => {
                    const lot = state.entities.lots[lotId];
                    if (!lot) return state;
                    const building = lot.buildings[buildingType];
                    if (!building || !building.geometry?.vertices) return state;
                    const snappedX = snapToGrid(newX);
                    const snappedY = snapToGrid(newY);
                    const newVertices = applyPerpendicularConstraint(building.geometry.vertices, vertexIndex, snappedX, snappedY);
                    const bounds = verticesToBoundingRect(newVertices);
                    return {
                        entities: {
                            ...state.entities,
                            lots: {
                                ...state.entities.lots,
                                [lotId]: {
                                    ...lot,
                                    buildings: {
                                        ...lot.buildings,
                                        [buildingType]: {
                                            ...building,
                                            width: bounds.width, depth: bounds.depth,
                                            x: bounds.centerX, y: bounds.centerY,
                                            geometry: { ...building.geometry, vertices: newVertices },
                                        },
                                    },
                                },
                            },
                        },
                    };
                }),

                splitEntityBuildingEdge: (lotId, buildingType, edgeIndex) => set((state) => {
                    const lot = state.entities.lots[lotId];
                    if (!lot) return state;
                    const building = lot.buildings[buildingType];
                    if (!building || !building.geometry?.vertices) return state;
                    const vertices = building.geometry.vertices;
                    const n = vertices.length;
                    const v1 = vertices[edgeIndex];
                    const v2 = vertices[(edgeIndex + 1) % n];
                    const newVertex = { id: generateVertexId(), x: snapToGrid((v1.x + v2.x) / 2), y: snapToGrid((v1.y + v2.y) / 2) };
                    const newVertices = [...vertices.slice(0, edgeIndex + 1), newVertex, ...vertices.slice(edgeIndex + 1)];
                    return {
                        entities: {
                            ...state.entities,
                            lots: {
                                ...state.entities.lots,
                                [lotId]: {
                                    ...lot,
                                    buildings: {
                                        ...lot.buildings,
                                        [buildingType]: { ...building, geometry: { ...building.geometry, vertices: newVertices } },
                                    },
                                },
                            },
                        },
                    };
                }),

                extrudeEntityBuildingEdge: (lotId, buildingType, edgeIndex, distance) => set((state) => {
                    const lot = state.entities.lots[lotId];
                    if (!lot) return state;
                    const building = lot.buildings[buildingType];
                    if (!building || !building.geometry?.vertices) return state;
                    const vertices = building.geometry.vertices;
                    const n = vertices.length;
                    const v1Index = edgeIndex;
                    const v2Index = (edgeIndex + 1) % n;
                    const perp = getEdgePerpendicular(vertices[v1Index], vertices[v2Index]);
                    const snappedDistance = snapToGrid(distance);
                    if (Math.abs(snappedDistance) < 0.5) return state;
                    const newVertices = vertices.map((v, i) => {
                        if (i === v1Index || i === v2Index) {
                            return { ...v, x: snapToGrid(v.x + perp.x * snappedDistance), y: snapToGrid(v.y + perp.y * snappedDistance) };
                        }
                        return v;
                    });
                    const bounds = verticesToBoundingRect(newVertices);
                    return {
                        entities: {
                            ...state.entities,
                            lots: {
                                ...state.entities.lots,
                                [lotId]: {
                                    ...lot,
                                    buildings: {
                                        ...lot.buildings,
                                        [buildingType]: { ...building, width: bounds.width, depth: bounds.depth, x: bounds.centerX, y: bounds.centerY, geometry: { ...building.geometry, vertices: newVertices } },
                                    },
                                },
                            },
                        },
                    };
                }),

                deleteEntityBuildingVertex: (lotId, buildingType, vertexIndex) => set((state) => {
                    const lot = state.entities.lots[lotId];
                    if (!lot) return state;
                    const building = lot.buildings[buildingType];
                    if (!building || !building.geometry?.vertices || building.geometry.vertices.length <= 4) return state;
                    const newVertices = building.geometry.vertices.filter((_, i) => i !== vertexIndex);
                    const bounds = verticesToBoundingRect(newVertices);
                    return {
                        entities: {
                            ...state.entities,
                            lots: {
                                ...state.entities.lots,
                                [lotId]: {
                                    ...lot,
                                    buildings: {
                                        ...lot.buildings,
                                        [buildingType]: { ...building, width: bounds.width, depth: bounds.depth, x: bounds.centerX, y: bounds.centerY, geometry: { ...building.geometry, vertices: newVertices } },
                                    },
                                },
                            },
                        },
                    };
                }),

                resetEntityBuildingToRectangle: (lotId, buildingType) => set((state) => {
                    const lot = state.entities.lots[lotId];
                    if (!lot) return state;
                    const building = lot.buildings[buildingType];
                    if (!building || building.geometry?.mode !== 'polygon') return state;
                    const bounds = building.geometry.vertices ? verticesToBoundingRect(building.geometry.vertices) : { width: building.width, depth: building.depth, centerX: building.x, centerY: building.y };
                    return {
                        entities: {
                            ...state.entities,
                            lots: {
                                ...state.entities.lots,
                                [lotId]: {
                                    ...lot,
                                    buildings: {
                                        ...lot.buildings,
                                        [buildingType]: { ...building, width: bounds.width, depth: bounds.depth, x: bounds.centerX, y: bounds.centerY, geometry: { mode: 'rectangle', vertices: null } },
                                    },
                                },
                            },
                        },
                    };
                }),

                // Road module CRUD (entity system)
                addEntityRoadModule: (direction, type) => set((state) => {
                    const roadId = generateEntityId('road');
                    const road = createDefaultRoadModule(direction, type);
                    return {
                        entities: {
                            ...state.entities,
                            roadModules: { ...state.entities.roadModules, [roadId]: road },
                        },
                    };
                }),

                removeEntityRoadModule: (roadId) => set((state) => {
                    const { [roadId]: _, ...remaining } = state.entities.roadModules;
                    return {
                        entities: { ...state.entities, roadModules: remaining },
                    };
                }),

                updateEntityRoadModule: (roadId, key, value) => set((state) => {
                    const road = state.entities.roadModules[roadId];
                    if (!road) return state;
                    return {
                        entities: {
                            ...state.entities,
                            roadModules: {
                                ...state.entities.roadModules,
                                [roadId]: { ...road, [key]: value },
                            },
                        },
                    };
                }),

                changeEntityRoadModuleType: (roadId, newType) => set((state) => {
                    const road = state.entities.roadModules[roadId];
                    if (!road) return state;
                    const defaults = createDefaultRoadModule(road.direction, newType);
                    return {
                        entities: {
                            ...state.entities,
                            roadModules: {
                                ...state.entities.roadModules,
                                [roadId]: {
                                    ...road,
                                    type: newType,
                                    rightOfWay: defaults.rightOfWay,
                                    roadWidth: defaults.roadWidth,
                                    rightVerge: defaults.rightVerge,
                                    rightSidewalk: defaults.rightSidewalk,
                                },
                            },
                        },
                    };
                }),

                // Entity style actions
                setEntityStyle: (lotId, category, property, value) => set((state) => {
                    const style = state.entityStyles[lotId];
                    if (!style) return state;
                    return {
                        entityStyles: {
                            ...state.entityStyles,
                            [lotId]: {
                                ...style,
                                [category]: {
                                    ...style[category],
                                    [property]: value,
                                },
                            },
                        },
                    };
                }),

                setEntityStyleOverride: (lotId, category, side, key, value) => set((state) => {
                    const style = state.entityStyles[lotId];
                    if (!style || !style[category]) return state;
                    const currentOverrides = style[category].overrides || {};
                    const currentSide = currentOverrides[side] || {};
                    return {
                        entityStyles: {
                            ...state.entityStyles,
                            [lotId]: {
                                ...style,
                                [category]: {
                                    ...style[category],
                                    overrides: {
                                        ...currentOverrides,
                                        [side]: { ...currentSide, [key]: value },
                                    },
                                },
                            },
                        },
                    };
                }),

                applyStyleToAllLots: (category, property, value) => set((state) => {
                    const newStyles = { ...state.entityStyles };
                    for (const lotId of state.entityOrder) {
                        if (newStyles[lotId] && newStyles[lotId][category]) {
                            newStyles[lotId] = {
                                ...newStyles[lotId],
                                [category]: {
                                    ...newStyles[lotId][category],
                                    [property]: value,
                                },
                            };
                        }
                    }
                    return { entityStyles: newStyles };
                }),

                // Per-lot visibility toggles
                setLotVisibility: (lotId, key, value) => set((state) => {
                    const vis = state.lotVisibility[lotId];
                    if (!vis) return state;
                    return {
                        lotVisibility: {
                            ...state.lotVisibility,
                            [lotId]: { ...vis, [key]: value },
                        },
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
                // Batch export actions
                addToExportQueue: (items) => set((state) => ({
                    viewSettings: { ...state.viewSettings, exportQueue: [...state.viewSettings.exportQueue, ...items] }
                })),
                shiftExportQueue: () => set((state) => ({
                    viewSettings: { ...state.viewSettings, exportQueue: state.viewSettings.exportQueue.slice(1) }
                })),
                clearExportQueue: () => set((state) => ({
                    viewSettings: { ...state.viewSettings, exportQueue: [], isBatchExporting: false }
                })),
                setIsBatchExporting: (bool) => set((state) => ({
                    viewSettings: { ...state.viewSettings, isBatchExporting: bool }
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
                // Annotation Settings
                setAnnotationSetting: (key, value) => set((state) => ({
                    annotationSettings: { ...state.annotationSettings, [key]: value }
                })),
                setAnnotationPosition: (annotationId, position) => set((state) => ({
                    annotationPositions: { ...state.annotationPositions, [annotationId]: position }
                })),
                resetAnnotationPositions: () => set({ annotationPositions: {} }),
                resetAnnotationPositionsForCategory: (category) => set((state) => {
                    const filtered = {}
                    for (const [key, val] of Object.entries(state.annotationPositions)) {
                        if (!key.startsWith(category + '-')) {
                            filtered[key] = val
                        }
                    }
                    return { annotationPositions: filtered }
                }),
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
                // ============================================
                // Comparison Roads (multi-direction, left/right/rear)
                // ============================================
                // Front road is the legacy `roadModule` above; these are additional direction roads
                comparisonRoads: {
                    left: {
                        enabled: false, type: 'S2', rightOfWay: 40, roadWidth: 24,
                        leftParking: null, rightParking: null,
                        leftVerge: null, rightVerge: null,
                        leftSidewalk: null, rightSidewalk: null,
                        leftTransitionZone: null, rightTransitionZone: null,
                    },
                    right: {
                        enabled: false, type: 'S2', rightOfWay: 40, roadWidth: 24,
                        leftParking: null, rightParking: null,
                        leftVerge: null, rightVerge: null,
                        leftSidewalk: null, rightSidewalk: null,
                        leftTransitionZone: null, rightTransitionZone: null,
                    },
                    rear: {
                        enabled: false, type: 'S3', rightOfWay: 20, roadWidth: 16,
                        leftParking: null, rightParking: null,
                        leftVerge: null, rightVerge: null,
                        leftSidewalk: null, rightSidewalk: null,
                        leftTransitionZone: null, rightTransitionZone: null,
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
                setAllRoadLineWidths: (width) => set((state) => {
                    const updated = { ...state.roadModuleStyles }
                    // Update rightOfWay width
                    if (updated.rightOfWay) updated.rightOfWay = { ...updated.rightOfWay, width }
                    // Update all zone lineWidths
                    const zoneKeys = ['roadWidth', 'leftParking', 'leftVerge', 'leftSidewalk', 'leftTransitionZone', 'rightParking', 'rightVerge', 'rightSidewalk', 'rightTransitionZone']
                    for (const key of zoneKeys) {
                        if (updated[key]) updated[key] = { ...updated[key], lineWidth: width }
                    }
                    return { roadModuleStyles: updated }
                }),
                setAllRoadZoneColor: (color) => set((state) => {
                    const updated = { ...state.roadModuleStyles }
                    if (updated.rightOfWay) updated.rightOfWay = { ...updated.rightOfWay, color }
                    const zoneKeys = ['roadWidth', 'leftParking', 'leftVerge', 'leftSidewalk', 'leftTransitionZone', 'rightParking', 'rightVerge', 'rightSidewalk', 'rightTransitionZone']
                    for (const key of zoneKeys) {
                        if (updated[key]) updated[key] = { ...updated[key], fillColor: color, lineColor: color }
                    }
                    return { roadModuleStyles: updated }
                }),

                setAllRoadZoneOpacity: (opacity) => set((state) => {
                    const updated = { ...state.roadModuleStyles }
                    if (updated.rightOfWay) updated.rightOfWay = { ...updated.rightOfWay, opacity }
                    const zoneKeys = ['roadWidth', 'leftParking', 'leftVerge', 'leftSidewalk', 'leftTransitionZone', 'rightParking', 'rightVerge', 'rightSidewalk', 'rightTransitionZone']
                    for (const key of zoneKeys) {
                        if (updated[key]) updated[key] = { ...updated[key], fillOpacity: opacity }
                    }
                    return { roadModuleStyles: updated }
                }),

                // Comparison Roads Actions
                setComparisonRoadSetting: (direction, key, value) => set((state) => ({
                    comparisonRoads: {
                        ...state.comparisonRoads,
                        [direction]: {
                            ...state.comparisonRoads[direction],
                            [key]: value,
                        },
                    },
                })),
                toggleComparisonRoad: (direction) => set((state) => ({
                    comparisonRoads: {
                        ...state.comparisonRoads,
                        [direction]: {
                            ...state.comparisonRoads[direction],
                            enabled: !state.comparisonRoads[direction].enabled,
                        },
                    },
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

                // Auto-save state
                autoSave: {
                    enabled: false,
                    intervalMs: 30000, // 30 seconds
                    lastSavedAt: null,
                    isDirty: false,
                },

                // Auto-save actions
                setAutoSaveEnabled: (enabled) => set({ autoSave: { ...get().autoSave, enabled } }),
                markDirty: () => set({ autoSave: { ...get().autoSave, isDirty: true } }),
                markSaved: () => set({ autoSave: { ...get().autoSave, isDirty: false, lastSavedAt: Date.now() } }),

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
                        comparisonRoads: state.comparisonRoads,
                        renderSettings: state.renderSettings,
                        sunSettings: state.sunSettings,
                        layoutSettings: state.layoutSettings,
                        // Entity system data
                        entities: state.entities,
                        entityOrder: state.entityOrder,
                        entityStyles: state.entityStyles,
                        lotVisibility: state.lotVisibility,
                        activeModule: state.activeModule,
                        modelSetup: state.modelSetup,
                        districtParameters: state.districtParameters,
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
                        comparisonRoads: snapshotData.comparisonRoads || state.comparisonRoads,
                        renderSettings: snapshotData.renderSettings || state.renderSettings,
                        sunSettings: snapshotData.sunSettings || state.sunSettings,
                        layoutSettings: snapshotData.layoutSettings || state.layoutSettings,
                        // Entity system restoration
                        entities: snapshotData.entities || state.entities,
                        entityOrder: snapshotData.entityOrder || state.entityOrder,
                        entityStyles: snapshotData.entityStyles || state.entityStyles,
                        lotVisibility: snapshotData.lotVisibility || state.lotVisibility,
                        activeModule: snapshotData.activeModule || state.activeModule,
                        modelSetup: snapshotData.modelSetup || state.modelSetup,
                        districtParameters: snapshotData.districtParameters || state.districtParameters,
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
                        comparisonRoads: state.comparisonRoads,
                        renderSettings: state.renderSettings,
                        sunSettings: state.sunSettings,
                        layoutSettings: state.layoutSettings,
                        savedViews: state.savedViews,
                        uiTheme: state.uiTheme,
                        // Entity system data
                        entities: state.entities,
                        entityOrder: state.entityOrder,
                        entityStyles: state.entityStyles,
                        lotVisibility: state.lotVisibility,
                        activeModule: state.activeModule,
                        modelSetup: state.modelSetup,
                        districtParameters: state.districtParameters,
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
                    comparisonRoads: projectState.comparisonRoads || state.comparisonRoads,
                    renderSettings: projectState.renderSettings || state.renderSettings,
                    sunSettings: projectState.sunSettings || state.sunSettings,
                    layoutSettings: projectState.layoutSettings || state.layoutSettings,
                    savedViews: projectState.savedViews || state.savedViews,
                    uiTheme: projectState.uiTheme || state.uiTheme,
                    // Entity system restoration
                    entities: projectState.entities || state.entities,
                    entityOrder: projectState.entityOrder || state.entityOrder,
                    entityStyles: projectState.entityStyles || state.entityStyles,
                    lotVisibility: projectState.lotVisibility || state.lotVisibility,
                    activeModule: projectState.activeModule || state.activeModule,
                    modelSetup: projectState.modelSetup || state.modelSetup,
                    districtParameters: projectState.districtParameters || state.districtParameters,
                })),

                // Flag to signal camera restoration needed
                _restoreCamera: false,
                clearRestoreCameraFlag: () => set({ _restoreCamera: false }),
            }),
            {
                name: 'zoning-app-storage',
                version: 22, // v22: split building styles into principal/accessory variants
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
                            fillOpacity: 1.0,
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
                                fillOpacity: 1.0,
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

                    if (version < 14) {
                        // Migration to 14 - Building polygon editing + roof layer
                        const migrateBuildingAndRoof = (condition) => {
                            if (condition) {
                                if (!condition.buildingGeometry) {
                                    condition.buildingGeometry = { mode: 'rectangle', vertices: null };
                                }
                                if (condition.selectedBuilding === undefined) {
                                    condition.selectedBuilding = false;
                                }
                                if (!condition.roof) {
                                    condition.roof = {
                                        type: 'flat',
                                        overrideHeight: false,
                                        ridgeHeight: null,
                                        ridgeDirection: 'x',
                                        shedDirection: '+y',
                                    };
                                }
                            }
                        };
                        migrateBuildingAndRoof(persistedState.existing);
                        migrateBuildingAndRoof(persistedState.proposed);

                        // Add roof layer toggle
                        if (persistedState.viewSettings?.layers && persistedState.viewSettings.layers.roof === undefined) {
                            persistedState.viewSettings.layers.roof = true;
                        }

                        // Add roof style defaults
                        const defaultRoofFaces = (color) => ({ color, opacity: 0.85, transparent: true });
                        const defaultRoofEdges = { color: '#000000', width: 1.5, visible: true, opacity: 1.0 };
                        if (persistedState.viewSettings?.styleSettings?.existing && !persistedState.viewSettings.styleSettings.existing.roofFaces) {
                            persistedState.viewSettings.styleSettings.existing.roofFaces = defaultRoofFaces('#B8A088');
                            persistedState.viewSettings.styleSettings.existing.roofEdges = defaultRoofEdges;
                        }
                        if (persistedState.viewSettings?.styleSettings?.proposed && !persistedState.viewSettings.styleSettings.proposed.roofFaces) {
                            persistedState.viewSettings.styleSettings.proposed.roofFaces = defaultRoofFaces('#C4B8A8');
                            persistedState.viewSettings.styleSettings.proposed.roofEdges = defaultRoofEdges;
                        }
                    }

                    if (version < 15) {
                        // Migration to 15 - Entity system for District Module
                        // Initialize entity state if not present
                        if (!persistedState.entities) {
                            persistedState.entities = { lots: {}, roadModules: {} };
                        }
                        if (!persistedState.entityOrder) {
                            persistedState.entityOrder = [];
                        }
                        if (persistedState.nextEntityId === undefined) {
                            persistedState.nextEntityId = 1;
                        }
                        if (persistedState.activeEntityId === undefined) {
                            persistedState.activeEntityId = null;
                        }
                        if (persistedState.selectedBuildingType === undefined) {
                            persistedState.selectedBuildingType = null;
                        }
                        if (!persistedState.entityStyles) {
                            persistedState.entityStyles = {};
                        }
                        if (!persistedState.lotVisibility) {
                            persistedState.lotVisibility = {};
                        }
                        if (!persistedState.activeModule) {
                            persistedState.activeModule = 'comparison';
                        }
                        if (!persistedState.modelSetup) {
                            persistedState.modelSetup = {
                                numLots: 1,
                                streetEdges: { front: true, left: false, right: false, rear: false },
                                streetTypes: { front: 'S1', left: 'S1', right: 'S2', rear: 'S3' },
                            };
                        }
                        if (!persistedState.districtParameters) {
                            persistedState.districtParameters = {};
                        }
                    }

                    // ============================================
                    // Accessory building fields migration (Phase 4.1)
                    // Always run — patches existing v15 data that lacks these fields
                    // ============================================
                    const migrateAccessory = (condition) => {
                        if (!condition) return;
                        if (condition.accessoryWidth === undefined) condition.accessoryWidth = 0;
                        if (condition.accessoryDepth === undefined) condition.accessoryDepth = 0;
                        if (condition.accessoryX === undefined) condition.accessoryX = 0;
                        if (condition.accessoryY === undefined) condition.accessoryY = 0;
                        if (condition.accessoryStories === undefined) condition.accessoryStories = 1;
                        if (condition.accessoryFirstFloorHeight === undefined) condition.accessoryFirstFloorHeight = 10;
                        if (condition.accessoryUpperFloorHeight === undefined) condition.accessoryUpperFloorHeight = 10;
                        if (condition.accessoryMaxHeight === undefined) condition.accessoryMaxHeight = 15;
                        if (!condition.accessoryBuildingGeometry) condition.accessoryBuildingGeometry = { mode: 'rectangle' };
                        if (condition.accessorySelectedBuilding === undefined) condition.accessorySelectedBuilding = false;
                        if (!condition.accessoryRoof) {
                            condition.accessoryRoof = {
                                type: 'flat', overrideHeight: false, ridgeHeight: null,
                                ridgeDirection: 'x', shedDirection: '+y',
                            };
                        }
                    };
                    migrateAccessory(persistedState.existing);
                    migrateAccessory(persistedState.proposed);

                    // Accessory style defaults
                    const defaultAccessoryBuildingEdges = { color: '#555555', width: 1.0, visible: true, dashed: false, opacity: 1.0 };
                    const defaultAccessoryRoofEdges = { color: '#555555', width: 1.0, visible: true, opacity: 1.0 };
                    if (persistedState.viewSettings?.styleSettings?.existing) {
                        const es = persistedState.viewSettings.styleSettings.existing;
                        if (!es.accessoryBuildingFaces) es.accessoryBuildingFaces = { color: '#E0E0E0', opacity: 0.9, transparent: true };
                        if (!es.accessoryBuildingEdges) es.accessoryBuildingEdges = { ...defaultAccessoryBuildingEdges };
                        if (!es.accessoryRoofFaces) es.accessoryRoofFaces = { color: '#C8B898', opacity: 0.85, transparent: true };
                        if (!es.accessoryRoofEdges) es.accessoryRoofEdges = { ...defaultAccessoryRoofEdges };
                    }
                    if (persistedState.viewSettings?.styleSettings?.proposed) {
                        const ps = persistedState.viewSettings.styleSettings.proposed;
                        if (!ps.accessoryBuildingFaces) ps.accessoryBuildingFaces = { color: '#F0F0F0', opacity: 0.85, transparent: true };
                        if (!ps.accessoryBuildingEdges) ps.accessoryBuildingEdges = { ...defaultAccessoryBuildingEdges };
                        if (!ps.accessoryRoofFaces) ps.accessoryRoofFaces = { color: '#D4C8B8', opacity: 0.85, transparent: true };
                        if (!ps.accessoryRoofEdges) ps.accessoryRoofEdges = { ...defaultAccessoryRoofEdges };
                    }

                    // ============================================
                    // Comparison Roads migration (Phase 4.2)
                    // ============================================
                    if (!persistedState.comparisonRoads) {
                        persistedState.comparisonRoads = {
                            left: {
                                enabled: false, type: 'S2', rightOfWay: 40, roadWidth: 24,
                                leftParking: null, rightParking: null,
                                leftVerge: null, rightVerge: null,
                                leftSidewalk: null, rightSidewalk: null,
                                leftTransitionZone: null, rightTransitionZone: null,
                            },
                            right: {
                                enabled: false, type: 'S2', rightOfWay: 40, roadWidth: 24,
                                leftParking: null, rightParking: null,
                                leftVerge: null, rightVerge: null,
                                leftSidewalk: null, rightSidewalk: null,
                                leftTransitionZone: null, rightTransitionZone: null,
                            },
                            rear: {
                                enabled: false, type: 'S3', rightOfWay: 20, roadWidth: 16,
                                leftParking: null, rightParking: null,
                                leftVerge: null, rightVerge: null,
                                leftSidewalk: null, rightSidewalk: null,
                                leftTransitionZone: null, rightTransitionZone: null,
                            },
                        };
                    }

                    // ============================================
                    // v16: Annotation system + enhanced dimensions + road intersections
                    // ============================================
                    if (!persistedState.annotationSettings) {
                        persistedState.annotationSettings = {
                            textRotation: 'billboard',
                            fontSize: 1.5,
                            textColor: '#000000',
                            backgroundColor: '#ffffff',
                            backgroundOpacity: 0.85,
                            backgroundEnabled: true,
                            leaderLineColor: '#666666',
                            leaderLineWidth: 1,
                            leaderLineDashed: false,
                            unitFormat: 'feet',
                        };
                    }
                    if (!persistedState.annotationPositions) {
                        persistedState.annotationPositions = {};
                    }
                    // Add new layer keys
                    const lyrs = persistedState.viewSettings?.layers;
                    if (lyrs) {
                        if (lyrs.annotationLabels === undefined) lyrs.annotationLabels = false;
                        if (lyrs.labelLotNames === undefined) lyrs.labelLotNames = true;
                        if (lyrs.labelLotEdges === undefined) lyrs.labelLotEdges = true;
                        if (lyrs.labelSetbacks === undefined) lyrs.labelSetbacks = true;
                        if (lyrs.labelRoadNames === undefined) lyrs.labelRoadNames = true;
                        if (lyrs.labelRoadZones === undefined) lyrs.labelRoadZones = true;
                        if (lyrs.labelBuildings === undefined) lyrs.labelBuildings = true;
                        if (lyrs.roadIntersections === undefined) lyrs.roadIntersections = true;
                    }
                    // Enhanced dimension settings
                    const dimS = persistedState.viewSettings?.styleSettings?.dimensionSettings;
                    if (dimS) {
                        if (dimS.textMode === undefined) dimS.textMode = 'follow-line';
                        if (dimS.textBackground === undefined) dimS.textBackground = { enabled: false, color: '#ffffff', opacity: 0.85, padding: 0.3 };
                        if (dimS.autoStack === undefined) dimS.autoStack = true;
                        if (dimS.stackGap === undefined) dimS.stackGap = 8;
                        if (dimS.unitFormat === undefined) dimS.unitFormat = 'feet';
                        if (dimS.draggableText === undefined) dimS.draggableText = false;
                    }

                    if (version < 17) {
                        // Migration to 17 — fix fillOpacity defaults to 1.0
                        // Old defaults (0.7 for zones, 0.8 for roadWidth) caused transparent
                        // sorting issues with Three.js, hiding arc lines behind fill rects.
                        const rms = persistedState.roadModuleStyles;
                        if (rms) {
                            if (rms.roadWidth && rms.roadWidth.fillOpacity === 0.8) rms.roadWidth.fillOpacity = 1.0;
                            const zoneKeys = [
                                'leftParking', 'leftVerge', 'leftSidewalk', 'leftTransitionZone',
                                'rightParking', 'rightVerge', 'rightSidewalk', 'rightTransitionZone',
                            ];
                            for (const key of zoneKeys) {
                                if (rms[key] && rms[key].fillOpacity === 0.7) rms[key].fillOpacity = 1.0;
                            }
                        }
                    }

                    if (version < 18) {
                        // Migration to 18 — add max setback style, visibility, and layer toggles
                        if (persistedState.entityStyles) {
                            for (const lotId of Object.keys(persistedState.entityStyles)) {
                                const s = persistedState.entityStyles[lotId];
                                if (!s.maxSetbacks) {
                                    s.maxSetbacks = {
                                        color: '#000000', width: 1, dashed: true, dashSize: 0.5, gapSize: 0.3, dashScale: 1, opacity: 1.0,
                                        overrides: {
                                            front: { enabled: false, color: '#000000', width: 1, dashed: true },
                                            rear: { enabled: false, color: '#000000', width: 1, dashed: true },
                                            left: { enabled: false, color: '#000000', width: 1, dashed: true },
                                            right: { enabled: false, color: '#000000', width: 1, dashed: true },
                                        }
                                    };
                                }
                            }
                        }
                        if (persistedState.lotVisibility) {
                            for (const lotId of Object.keys(persistedState.lotVisibility)) {
                                if (persistedState.lotVisibility[lotId].maxSetbacks === undefined) {
                                    persistedState.lotVisibility[lotId].maxSetbacks = true;
                                }
                            }
                        }
                        if (persistedState.viewSettings?.layers) {
                            if (persistedState.viewSettings.layers.maxSetbacks === undefined) persistedState.viewSettings.layers.maxSetbacks = true;
                            if (persistedState.viewSettings.layers.labelMaxSetbacks === undefined) persistedState.viewSettings.layers.labelMaxSetbacks = true;
                        }
                    }

                    if (version < 19) {
                        // Migration to 19 — add unifiedRoadPreview layer toggle
                        if (persistedState.viewSettings?.layers) {
                            if (persistedState.viewSettings.layers.unifiedRoadPreview === undefined) {
                                persistedState.viewSettings.layers.unifiedRoadPreview = false;
                            }
                        }
                    }

                    if (version < 20) {
                        // Migration to 20 — add btzPlanes, accessorySetbacks styles/visibility, layer toggles
                        if (persistedState.entityStyles) {
                            for (const lotId of Object.keys(persistedState.entityStyles)) {
                                const s = persistedState.entityStyles[lotId];
                                if (!s.btzPlanes) {
                                    s.btzPlanes = { color: '#AA00FF', opacity: 1.0 };
                                }
                                if (!s.accessorySetbacks) {
                                    s.accessorySetbacks = {
                                        color: '#2196F3', width: 1, dashed: true, dashSize: 0.8, gapSize: 0.4, dashScale: 1, opacity: 1.0,
                                        overrides: {
                                            front: { enabled: false, color: '#2196F3', width: 1, dashed: true },
                                            rear: { enabled: false, color: '#2196F3', width: 1, dashed: true },
                                            left: { enabled: false, color: '#2196F3', width: 1, dashed: true },
                                            right: { enabled: false, color: '#2196F3', width: 1, dashed: true },
                                        }
                                    };
                                }
                                if (!s.lotAccessArrows) {
                                    s.lotAccessArrows = { color: '#FF00FF', opacity: 1.0 };
                                }
                                // Fix accessory setback colors for users who already migrated to v20 with black
                                if (s.accessorySetbacks && s.accessorySetbacks.color === '#000000') {
                                    s.accessorySetbacks.color = '#2196F3';
                                    if (s.accessorySetbacks.overrides) {
                                        for (const side of ['front', 'rear', 'left', 'right']) {
                                            if (s.accessorySetbacks.overrides[side] && s.accessorySetbacks.overrides[side].color === '#000000') {
                                                s.accessorySetbacks.overrides[side].color = '#2196F3';
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        if (persistedState.lotVisibility) {
                            for (const lotId of Object.keys(persistedState.lotVisibility)) {
                                if (persistedState.lotVisibility[lotId].btzPlanes === undefined) {
                                    persistedState.lotVisibility[lotId].btzPlanes = true;
                                }
                                if (persistedState.lotVisibility[lotId].accessorySetbacks === undefined) {
                                    persistedState.lotVisibility[lotId].accessorySetbacks = true;
                                }
                                if (persistedState.lotVisibility[lotId].lotAccessArrows === undefined) {
                                    persistedState.lotVisibility[lotId].lotAccessArrows = true;
                                }
                            }
                        }
                        if (persistedState.viewSettings?.layers) {
                            if (persistedState.viewSettings.layers.btzPlanes === undefined) persistedState.viewSettings.layers.btzPlanes = true;
                            if (persistedState.viewSettings.layers.accessorySetbacks === undefined) persistedState.viewSettings.layers.accessorySetbacks = true;
                            if (persistedState.viewSettings.layers.lotAccessArrows === undefined) persistedState.viewSettings.layers.lotAccessArrows = true;
                        }
                    }

                    if (version < 21) {
                        // v21: Backfill keys that were added to v20 defaults AFTER
                        // the version was already bumped to 20 in persisted state
                        if (persistedState.entityStyles) {
                            for (const lotId of Object.keys(persistedState.entityStyles)) {
                                const s = persistedState.entityStyles[lotId];
                                if (!s.maxSetbacks) {
                                    s.maxSetbacks = {
                                        color: '#000000', width: 1, dashed: true, dashSize: 0.5, gapSize: 0.3, dashScale: 1, opacity: 1.0,
                                        overrides: {
                                            front: { enabled: false, color: '#000000', width: 1, dashed: true },
                                            rear: { enabled: false, color: '#000000', width: 1, dashed: true },
                                            left: { enabled: false, color: '#000000', width: 1, dashed: true },
                                            right: { enabled: false, color: '#000000', width: 1, dashed: true },
                                        }
                                    };
                                }
                                if (!s.btzPlanes) {
                                    s.btzPlanes = { color: '#AA00FF', opacity: 1.0 };
                                }
                                if (!s.accessorySetbacks) {
                                    s.accessorySetbacks = {
                                        color: '#2196F3', width: 1, dashed: true, dashSize: 0.8, gapSize: 0.4, dashScale: 1, opacity: 1.0,
                                        overrides: {
                                            front: { enabled: false, color: '#2196F3', width: 1, dashed: true },
                                            rear: { enabled: false, color: '#2196F3', width: 1, dashed: true },
                                            left: { enabled: false, color: '#2196F3', width: 1, dashed: true },
                                            right: { enabled: false, color: '#2196F3', width: 1, dashed: true },
                                        }
                                    };
                                }
                                if (!s.lotAccessArrows) {
                                    s.lotAccessArrows = { color: '#FF00FF', opacity: 1.0 };
                                }
                            }
                        }
                        if (persistedState.lotVisibility) {
                            for (const lotId of Object.keys(persistedState.lotVisibility)) {
                                const v = persistedState.lotVisibility[lotId];
                                if (v.maxSetbacks === undefined) v.maxSetbacks = true;
                                if (v.btzPlanes === undefined) v.btzPlanes = true;
                                if (v.accessorySetbacks === undefined) v.accessorySetbacks = true;
                                if (v.lotAccessArrows === undefined) v.lotAccessArrows = true;
                            }
                        }
                        if (persistedState.viewSettings?.layers) {
                            const l = persistedState.viewSettings.layers;
                            if (l.maxSetbacks === undefined) l.maxSetbacks = true;
                            if (l.btzPlanes === undefined) l.btzPlanes = true;
                            if (l.accessorySetbacks === undefined) l.accessorySetbacks = true;
                            if (l.lotAccessArrows === undefined) l.lotAccessArrows = true;
                        }
                    }

                    if (version < 22) {
                        // v22: Split buildingEdges/buildingFaces into principal/accessory variants
                        if (persistedState.entityStyles) {
                            for (const lotId of Object.keys(persistedState.entityStyles)) {
                                const s = persistedState.entityStyles[lotId];
                                if (!s.principalBuildingEdges) {
                                    s.principalBuildingEdges = s.buildingEdges
                                        ? JSON.parse(JSON.stringify(s.buildingEdges))
                                        : { color: '#000000', width: 1.5, visible: true, dashed: false, opacity: 1.0 };
                                }
                                if (!s.principalBuildingFaces) {
                                    s.principalBuildingFaces = s.buildingFaces
                                        ? JSON.parse(JSON.stringify(s.buildingFaces))
                                        : { color: '#D5D5D5', opacity: 1.0, transparent: true };
                                }
                                if (!s.accessoryBuildingEdges) {
                                    s.accessoryBuildingEdges = { color: '#666666', width: 1.5, visible: true, dashed: false, opacity: 1.0 };
                                }
                                if (!s.accessoryBuildingFaces) {
                                    s.accessoryBuildingFaces = { color: '#B0B0B0', opacity: 1.0, transparent: true };
                                }
                            }
                        }
                    }

                    return {
                        ...persistedState,
                        version: 22
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
                    comparisonRoads: state.comparisonRoads,
                    savedViews: state.savedViews,
                    userDefaults: state.userDefaults,
                    projectConfig: state.projectConfig,
                    currentProject: state.currentProject,
                    uiTheme: state.uiTheme,
                    // Entity system
                    entities: state.entities,
                    entityOrder: state.entityOrder,
                    nextEntityId: state.nextEntityId,
                    activeModule: state.activeModule,
                    entityStyles: state.entityStyles,
                    lotVisibility: state.lotVisibility,
                    modelSetup: state.modelSetup,
                    districtParameters: state.districtParameters,
                    annotationSettings: state.annotationSettings,
                    annotationPositions: state.annotationPositions,
                }),
                merge: (persistedState, currentState) => {
                    const merged = { ...currentState, ...persistedState };
                    // Patch missing entityStyles keys for all lots
                    if (merged.entityStyles) {
                        const styleDefaults = createDefaultLotStyle();
                        for (const lotId of Object.keys(merged.entityStyles)) {
                            for (const [key, val] of Object.entries(styleDefaults)) {
                                if (!merged.entityStyles[lotId][key]) {
                                    merged.entityStyles[lotId][key] = JSON.parse(JSON.stringify(val));
                                }
                            }
                        }
                    }
                    // Patch missing lotVisibility keys for all lots
                    if (merged.lotVisibility) {
                        const visDefaults = createDefaultLotVisibility();
                        for (const lotId of Object.keys(merged.lotVisibility)) {
                            for (const [key, val] of Object.entries(visDefaults)) {
                                if (merged.lotVisibility[lotId][key] === undefined) {
                                    merged.lotVisibility[lotId][key] = val;
                                }
                            }
                        }
                    }
                    // Reset transient batch export state on hydration
                    if (merged.viewSettings) {
                        merged.viewSettings.exportQueue = []
                        merged.viewSettings.isBatchExporting = false
                    }
                    // Patch missing viewSettings.layers keys
                    if (merged.viewSettings?.layers) {
                        const layerDefaults = { maxSetbacks: true, btzPlanes: true, accessorySetbacks: true, lotAccessArrows: true };
                        for (const [key, val] of Object.entries(layerDefaults)) {
                            if (merged.viewSettings.layers[key] === undefined) {
                                merged.viewSettings.layers[key] = val;
                            }
                        }
                    }
                    return merged;
                },
            }
        ),
        {
            limit: 50,
            partialize: (state) => {
                const { existing, proposed, viewSettings, layoutSettings, sunSettings, renderSettings, roadModule, roadModuleStyles, comparisonRoads, entities, entityOrder, entityStyles, lotVisibility, modelSetup, annotationSettings, annotationPositions } = state
                // Exclude export triggers from undo history
                const { exportRequested: _exportRequested, exportQueue: _exportQueue, isBatchExporting: _isBatchExporting, ...trackedViewSettings } = viewSettings
                return { existing, proposed, viewSettings: trackedViewSettings, layoutSettings, sunSettings, renderSettings, roadModule, roadModuleStyles, comparisonRoads, entities, entityOrder, entityStyles, lotVisibility, modelSetup, annotationSettings, annotationPositions }
            }
        }
    )
);
