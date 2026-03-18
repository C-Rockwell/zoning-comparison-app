import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { temporal } from 'zundo'

// ============================================
// Dimension Font Options
// ============================================
export const DIMENSION_FONT_OPTIONS = [
    { label: 'Inter', url: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff' },
    { label: 'Roboto', url: 'https://fonts.gstatic.com/s/roboto/v51/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWubEbVmUiA8.ttf' },
    { label: 'Lato', url: 'https://fonts.gstatic.com/s/lato/v24/S6uyw4BMUTPHjx4wWA.woff' },
    { label: 'Montserrat', url: 'https://fonts.gstatic.com/s/montserrat/v31/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Hw5aX8.ttf' },
    { label: 'Oswald', url: 'https://fonts.gstatic.com/s/oswald/v57/TK3_WkUHHAIjg75cFRf3bXL8LICs1_FvsUZiYA.ttf' },
    { label: 'Source Sans', url: 'https://fonts.gstatic.com/s/sourcesans3/v19/nwpBtKy2OAdR1K-IwhWudF-R9QMylBJAV3Bo8Ky462EK9C4.ttf' },
]

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

// Check if a point lies on the line segment between lineV1 and lineV2 (within tolerance)
const isPointOnSegment = (point, lineV1, lineV2, tolerance = 0.5) => {
    const dx = lineV2.x - lineV1.x;
    const dy = lineV2.y - lineV1.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.sqrt((point.x - lineV1.x) ** 2 + (point.y - lineV1.y) ** 2) <= tolerance;
    const len = Math.sqrt(lenSq);
    // Distance from point to infinite line
    const dist = Math.abs(dx * (lineV1.y - point.y) - dy * (lineV1.x - point.x)) / len;
    if (dist > tolerance) return false;
    // Check projection falls within segment (with tolerance on endpoints)
    const t = ((point.x - lineV1.x) * dx + (point.y - lineV1.y) * dy) / lenSq;
    return t >= -tolerance / len && t <= 1 + tolerance / len;
};

// Calculate perpendicular direction for an edge (outward normal)
const getEdgePerpendicular = (v1, v2) => {
    const dx = v2.x - v1.x;
    const dy = v2.y - v1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return { x: 0, y: 1 };
    // Rotate 90 degrees clockwise for outward normal (matches EdgeHandle visual direction)
    return { x: dy / len, y: -dx / len };
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
            sideInterior: 5, sideInteriorLeft: null, sideInteriorRight: null,
            minSideStreet: null, maxSideStreet: null, btzSideStreet: null,
        },
        accessory: {
            front: null, rear: null, sideInterior: null, sideInteriorLeft: null, sideInteriorRight: null, sideStreet: null,
            btzFront: null, btzSideStreet: null,
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
    lotAccess: { front: false, sideInterior: false, sideStreet: false, rear: false, sharedDriveLocation: 'front' },
    // Parking locations (Model Parameters)
    parking: { front: false, sideInterior: false, sideStreet: false, rear: false },
    // Parking setbacks (Model Parameters)
    parkingSetbacks: { front: null, sideInterior: null, sideInteriorLeft: null, sideInteriorRight: null, sideStreet: null, rear: null },
    importedModels: {},        // { [modelId]: { filename, name, x, y, rotation, scale, units, style } }
    importedModelOrder: [],    // [modelId, ...] for display order
    ...overrides,
});

export const createDefaultLotStyle = (overrides = {}) => ({
    lotLines: {
        color: '#000000', width: 1.5, dashed: false, dashSize: 3, gapSize: 2, dashScale: 1, opacity: 1.0,
        overrides: {
            front: { enabled: false, color: '#000000', width: 1.5, dashed: false, dashSize: 3, gapSize: 2, dashScale: 1 },
            rear: { enabled: false, color: '#000000', width: 1.5, dashed: false, dashSize: 3, gapSize: 2, dashScale: 1 },
            left: { enabled: false, color: '#000000', width: 1.5, dashed: false, dashSize: 3, gapSize: 2, dashScale: 1 },
            right: { enabled: false, color: '#000000', width: 1.5, dashed: false, dashSize: 3, gapSize: 2, dashScale: 1 },
        }
    },
    setbacks: {
        color: '#000000', width: 1, dashed: true, dashSize: 3, gapSize: 2, dashScale: 1, opacity: 1.0,
        overrides: {
            front: { enabled: false, color: '#000000', width: 1, dashed: true, dashSize: 3, gapSize: 2, dashScale: 1 },
            rear: { enabled: false, color: '#000000', width: 1, dashed: true, dashSize: 3, gapSize: 2, dashScale: 1 },
            left: { enabled: false, color: '#000000', width: 1, dashed: true, dashSize: 3, gapSize: 2, dashScale: 1 },
            right: { enabled: false, color: '#000000', width: 1, dashed: true, dashSize: 3, gapSize: 2, dashScale: 1 },
        }
    },
    lotFill: { color: '#E5E5E5', opacity: 1.0, visible: true },
    setbackFill: { color: '#90EE90', opacity: 0.3, lineColor: '#228B22', lineWidth: 1, lineDashed: false },
    buildingEdges: { color: '#000000', width: 1.5, visible: true, dashed: false, dashSize: 3, gapSize: 2, dashScale: 1, opacity: 1.0 },
    buildingFaces: { color: '#D5D5D5', opacity: 1.0, transparent: true },
    principalBuildingEdges: { color: '#000000', width: 1.5, visible: true, dashed: false, opacity: 1.0 },
    principalBuildingFaces: { color: '#D5D5D5', opacity: 1.0, transparent: true },
    accessoryBuildingEdges: { color: '#666666', width: 1.5, visible: true, dashed: false, opacity: 1.0 },
    accessoryBuildingFaces: { color: '#B0B0B0', opacity: 1.0, transparent: true },
    maxHeightPlane: { color: '#FF6B6B', opacity: 0.3, lineColor: '#FF0000', lineWidth: 2, lineDashed: true, lineDashSize: 3, lineGapSize: 2 },
    maxSetbacks: {
        color: '#000000', width: 1, dashed: true, dashSize: 1.5, gapSize: 2, dashScale: 1, opacity: 1.0,
        overrides: {
            front: { enabled: false, color: '#000000', width: 1, dashed: true, dashSize: 1.5, gapSize: 2, dashScale: 1 },
            rear: { enabled: false, color: '#000000', width: 1, dashed: true, dashSize: 1.5, gapSize: 2, dashScale: 1 },
            left: { enabled: false, color: '#000000', width: 1, dashed: true, dashSize: 1.5, gapSize: 2, dashScale: 1 },
            right: { enabled: false, color: '#000000', width: 1, dashed: true, dashSize: 1.5, gapSize: 2, dashScale: 1 },
        }
    },
    roofFaces: { color: '#B8A088', opacity: 1.0 },
    roofEdges: { color: '#000000', width: 1.5, visible: true, opacity: 1.0 },
    btzPlanes: { color: '#AA00FF', opacity: 1.0 },
    accessorySetbacks: {
        color: '#2196F3', width: 1, dashed: true, dashSize: 2.5, gapSize: 1.5, dashScale: 1, opacity: 1.0,
        overrides: {
            front: { enabled: false, color: '#2196F3', width: 1, dashed: true, dashSize: 2.5, gapSize: 1.5, dashScale: 1 },
            rear: { enabled: false, color: '#2196F3', width: 1, dashed: true, dashSize: 2.5, gapSize: 1.5, dashScale: 1 },
            left: { enabled: false, color: '#2196F3', width: 1, dashed: true, dashSize: 2.5, gapSize: 1.5, dashScale: 1 },
            right: { enabled: false, color: '#2196F3', width: 1, dashed: true, dashSize: 2.5, gapSize: 1.5, dashScale: 1 },
        }
    },
    parkingSetbacks: {
        color: '#FF9800', width: 1, dashed: true, dashSize: 2.5, gapSize: 1.5, dashScale: 1, opacity: 1.0,
        overrides: {
            front: { enabled: false, color: '#FF9800', width: 1, dashed: true, dashSize: 2.5, gapSize: 1.5, dashScale: 1 },
            rear: { enabled: false, color: '#FF9800', width: 1, dashed: true, dashSize: 2.5, gapSize: 1.5, dashScale: 1 },
            left: { enabled: false, color: '#FF9800', width: 1, dashed: true, dashSize: 2.5, gapSize: 1.5, dashScale: 1 },
            right: { enabled: false, color: '#FF9800', width: 1, dashed: true, dashSize: 2.5, gapSize: 1.5, dashScale: 1 },
        }
    },
    lotAccessArrows: { color: '#FF00FF', opacity: 1.0, scale: 1, heightScale: 1, positionOffsetX: 0, positionOffsetY: 0 },
    sharedDriveArrow: { color: '#FF00FF', opacity: 1.0, scale: 1, heightScale: 1, positionOffsetX: 0, positionOffsetY: 0, outlineColor: '#000000', outlineWidth: 1, outlineType: 'solid' },
    placementZone: { color: '#FFD700', opacity: 0.25, lineColor: '#DAA520', lineWidth: 1, lineDashed: false, lineDashSize: 3, lineGapSize: 2 },
    importedModelFaces: { color: '#D5D5D5', opacity: 1.0, transparent: true },
    importedModelEdges: { color: '#000000', width: 1.5, visible: true, opacity: 1.0 },
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

export const createDefaultDistrictParameters = () => ({
    lotArea: { min: null, max: null },
    lotCoverage: { min: null, max: null },
    lotWidth: { min: null, max: null },
    lotWidthAtSetback: { min: null, max: null },
    lotDepth: { min: null, max: null },
    widthToDepthRatio: { min: null, max: null },
    maxImperviousSurface: { min: null, max: null },
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
        btzFront: null,
        btzSideStreet: null,
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
});

export const createDefaultLotVisibility = () => ({
    lotLines: true,
    setbacks: true,
    buildings: true,
    roof: true,
    maxHeightPlane: true,
    maxHeightPlanePrincipal: true,
    maxHeightPlaneAccessory: true,
    dimensions: true,
    accessoryBuilding: true,
    maxSetbacks: true,
    parkingSetbacks: true,
    setbackFill: true,
    btzPlanes: true,
    accessorySetbacks: true,
    lotAccessFront: true,
    lotAccessRear: true,
    lotAccessSideStreet: true,
    lotAccessSharedDrive: true,
    importedModel: true,
    placementZone: true,
    depthDimVisible: true,
});

// Maps district parameter dot-paths to lot property setter functions (mutates lot in place)
const DISTRICT_TO_LOT_MAP = {
    'lotWidth.min': (lot, v) => { lot.lotWidth = v },
    'lotDepth.min': (lot, v) => { lot.lotDepth = v },
    'setbacksPrincipal.front.min': (lot, v) => { lot.setbacks.principal.front = v },
    'setbacksPrincipal.front.max': (lot, v) => { lot.setbacks.principal.maxFront = v },
    'setbacksPrincipal.btzFront': (lot, v) => { lot.setbacks.principal.btzFront = v },
    'setbacksPrincipal.rear.min': (lot, v) => { lot.setbacks.principal.rear = v },
    'setbacksPrincipal.sideInterior.min': (lot, v) => { lot.setbacks.principal.sideInterior = v },
    'setbacksPrincipal.sideStreet.min': (lot, v) => { lot.setbacks.principal.minSideStreet = v },
    'setbacksPrincipal.sideStreet.max': (lot, v) => { lot.setbacks.principal.maxSideStreet = v },
    'setbacksPrincipal.btzSideStreet': (lot, v) => { lot.setbacks.principal.btzSideStreet = v },
    'setbacksAccessory.front.min': (lot, v) => { lot.setbacks.accessory.front = v },
    'setbacksAccessory.rear.min': (lot, v) => { lot.setbacks.accessory.rear = v },
    'setbacksAccessory.sideInterior.min': (lot, v) => { lot.setbacks.accessory.sideInterior = v },
    'setbacksAccessory.sideStreet.min': (lot, v) => { lot.setbacks.accessory.sideStreet = v },
    'setbacksAccessory.btzFront': (lot, v) => { lot.setbacks.accessory.btzFront = v },
    'setbacksAccessory.btzSideStreet': (lot, v) => { lot.setbacks.accessory.btzSideStreet = v },
    'structures.principal.height.max': (lot, v) => { lot.buildings.principal.maxHeight = v },
    'structures.principal.stories.max': (lot, v) => { lot.buildings.principal.stories = v },
    'structures.principal.firstStoryHeight.min': (lot, v) => { lot.buildings.principal.firstFloorHeight = v },
    'structures.principal.upperStoryHeight.min': (lot, v) => { lot.buildings.principal.upperFloorHeight = v },
    'structures.accessory.height.max': (lot, v) => { lot.buildings.accessory.maxHeight = v },
    'structures.accessory.stories.max': (lot, v) => { lot.buildings.accessory.stories = v },
    'structures.accessory.firstStoryHeight.min': (lot, v) => { lot.buildings.accessory.firstFloorHeight = v },
    'structures.accessory.upperStoryHeight.min': (lot, v) => { lot.buildings.accessory.upperFloorHeight = v },
    'lotAccess.primaryStreet.permitted': (lot, v) => { lot.lotAccess.front = v },
    'lotAccess.sharedDrive.permitted': (lot, v) => { lot.lotAccess.sideInterior = v },
    'lotAccess.secondaryStreet.permitted': (lot, v) => { lot.lotAccess.sideStreet = v },
    'lotAccess.rearAlley.permitted': (lot, v) => { lot.lotAccess.rear = v },
    'parkingLocations.front.permitted': (lot, v) => { lot.parking.front = v },
    'parkingLocations.sideInterior.permitted': (lot, v) => { lot.parking.sideInterior = v },
    'parkingLocations.sideStreet.permitted': (lot, v) => { lot.parking.sideStreet = v },
    'parkingLocations.rear.permitted': (lot, v) => { lot.parking.rear = v },
    'parkingLocations.front.min': (lot, v) => {
        if (!lot.parkingSetbacks) lot.parkingSetbacks = { front: null, sideInterior: null, sideStreet: null, rear: null };
        lot.parkingSetbacks.front = v;
    },
    'parkingLocations.sideInterior.min': (lot, v) => {
        if (!lot.parkingSetbacks) lot.parkingSetbacks = { front: null, sideInterior: null, sideStreet: null, rear: null };
        lot.parkingSetbacks.sideInterior = v;
    },
    'parkingLocations.sideStreet.min': (lot, v) => {
        if (!lot.parkingSetbacks) lot.parkingSetbacks = { front: null, sideInterior: null, sideStreet: null, rear: null };
        lot.parkingSetbacks.sideStreet = v;
    },
    'parkingLocations.rear.min': (lot, v) => {
        if (!lot.parkingSetbacks) lot.parkingSetbacks = { front: null, sideInterior: null, sideStreet: null, rear: null };
        lot.parkingSetbacks.rear = v;
    },
};

// Apply all current district parameter defaults to a lot object (mutates in place)
const applyDistrictDefaultsToLot = (lot, dp) => {
    if (!dp) return;
    for (const [path, setter] of Object.entries(DISTRICT_TO_LOT_MAP)) {
        const keys = path.split('.');
        let val = dp;
        for (const k of keys) {
            val = val?.[k];
        }
        if (val != null) setter(lot, val);
    }
};

// Helper: merge per-layer defaults over global defaults (per-layer wins via ??)
export const getEffectiveDrawingDefaults = (state, layerId) => {
    const global = state.drawingDefaults
    const layerDefaults = state.drawingLayers?.[layerId]?.defaults
    if (!layerDefaults || Object.keys(layerDefaults).length === 0) return global
    const merged = { ...global }
    for (const [key, value] of Object.entries(layerDefaults)) {
        if (value != null) merged[key] = value
    }
    return merged
}

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
                selectedImportedModel: null, // { lotId, modelId } or null
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
                // Camera controls ref — transient, set by DistrictViewer (excluded from persist/Zundo)
                _cameraControlsRef: null,
                // Scene bounds — transient, computed from DistrictSceneContent (excluded from persist/Zundo)
                sceneBounds: null, // { minX, maxX, minY, maxY, maxZ }
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
                    fontFamily: null,            // null = browser default; otherwise URL from DIMENSION_FONT_OPTIONS
                    textColor: '#000000',
                    outlineColor: '#ffffff',
                    outlineWidth: 0.15,
                    backgroundColor: '#ffffff',
                    backgroundOpacity: 0.85,
                    backgroundEnabled: true,
                    leaderLineColor: '#666666',
                    leaderLineWidth: 1,
                    leaderLineDashed: false,
                    unitFormat: 'feet',          // 'feet' | 'feet-inches' | 'meters'
                },
                annotationCustomLabels: {
                    // Road labels keyed by direction: { mode: 'default'|'custom', text: '' }
                    roadFront: { mode: 'default', text: '' },
                    roadRight: { mode: 'default', text: '' },
                    roadRear:  { mode: 'default', text: '' },
                    roadLeft:  { mode: 'default', text: '' },
                    // Lot labels added dynamically: lot-{lotId}-name: { mode: 'default', text: '' }
                },
                annotationPositions: {},  // { [annotationId]: [x, y, z] | null }
                activeLabelPresetName: null,
                activeDimensionPresetName: null,
                activeAnnotationPresetName: null,

                // Drawing Editor system
                drawingLayers: {},           // { [layerId]: { name, visible, locked, zHeight, renderMode, order } }
                drawingLayerOrder: [],       // layerId[] in display order
                activeDrawingLayerId: null,  // currently active layer for new drawings
                drawingObjects: {},          // { [objectId]: DrawingObject }
                drawingDefaults: {
                    strokeColor: '#000000',
                    strokeWidth: 2,
                    fillColor: '#cccccc',
                    fillOpacity: 0.3,
                    lineType: 'solid',       // 'solid' | 'dashed'
                    fontSize: 3,
                    fontFamily: null,
                    textColor: '#000000',
                    arrowHead: 'end',        // 'none' | 'start' | 'end' | 'both'
                    cornerRadius: 0,
                    starPoints: 5,
                    outlineWidth: 0.1,
                    outlineColor: '#ffffff',
                    elbowLength: 5,
                },
                // Drawing transient state (excluded from persist/Zundo)
                drawingMode: null,           // { tool: string, phase: string } | null
                selectedDrawingIds: [],      // currently selected drawing object IDs
                textEditState: null,         // { worldPosition, screenPosition, tool, targetPoint?, objectId } | null

                districtParameters: createDefaultDistrictParameters(),

                // Sun Settings (simple azimuth/altitude controls)
                sunSettings: {
                    enabled: false,
                    azimuth: 45,
                    altitude: 45,
                    intensity: 1.5,
                    ambientIntensity: 0.4,
                    shadowsEnabled: true,
                },
                // Render Quality Settings
                renderSettings: {
                    quality: 'high', // 'low' | 'medium' | 'high'
                    ambientOcclusion: true,
                    aoIntensity: 0.8,
                    aoRadius: 0.3,
                    toneMapping: true,
                    antialiasing: true,
                    environmentIntensity: 0.8,
                    shadowQuality: 'high', // 'low' | 'medium' | 'high'
                    contactShadows: false, // deprecated — ContactShadows removed
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
                        principalBuildings: true,
                        accessoryBuildings: true,
                        zoning: true,
                        streets: true,
                        setbacks: true,
                        dimensionsLotWidth: true, // Renamed from dimensionsLot
                        dimensionsLotDepth: true, // Renamed from dimensionsLot
                        dimensionsSetbacks: true,
                        dimensionsHeight: true,           // keep for migration fallback
                        dimensionsHeightPrincipal: true,
                        dimensionsHeightAccessory: true,
                        dimensionsFirstFloorHeight: true, // 1st floor height dimension
                        parkingSetbacks: true,
                        dimensionsParkingSetbacks: true,
                        dimensionsMaxFrontSetback: true,
                        dimensionsMaxSideStreetSetback: true,
                        setbackFill: true,
                        grid: true,
                        axes: false, // Default axes off
                        gimbal: true,
                        origin: true,
                        roadModule: true, // Road module layer
                        maxHeightPlane: true, // Max height plane layer (legacy)
                        maxHeightPlanePrincipal: true, // Principal max height plane
                        maxHeightPlaneAccessory: true, // Accessory max height plane
                        roof: true, // Roof layer
                        // Annotation & intersection layers
                        annotationLabels: false, // Master toggle for all annotation labels
                        labelLotNames: true,     // "Lot 1", "Lot 2" etc.
                        labelLotEdges: true,     // "Front of Lot", "Rear of Lot" etc.
                        labelSetbacks: true,     // "Front Setback" etc.
                        labelMaxSetbacks: true,  // "Max. Front Setback" etc.
                        labelRoadNames: true,    // "S1 - Primary Street" etc.
                        labelRoadZones: true,    // "Right of Way", "Sidewalk" etc.
                        labelPrincipalBuildings: true,    // "Principal Building"
                        labelAccessoryBuildings: true,    // "Accessory Building"
                        maxSetbacks: true,       // Max setback lines
                        btzPlanes: true,         // BTZ front + side street planes
                        accessorySetbacks: true, // Accessory setback lines
                        lotAccessFront: true,    // Lot access front arrow
                        lotAccessRear: true,     // Lot access rear arrow
                        lotAccessSideStreet: true, // Lot access side street arrow
                        lotAccessSharedDrive: true, // Lot access shared drive arrow
                        roadIntersections: true, // Road intersection fillet geometry
                        importedModels: true, // Imported IFC models
                        placementZone: true, // Building placement zone
                    },
                    exportRequested: false,
                    exportFormat: 'obj', // 'obj' | 'glb' | 'dae' | 'dxf' | 'png' | 'jpg' | 'svg'
                    exportSettings: { width: 1920, height: 1080, label: '1080p (1920x1080)' },
                    exportView: 'current', // 'current' | 'iso' | 'front' | 'top' | 'side' | 'left' | 'right'
                    exportLineScale: 1, // Scale factor for line widths during export (WYSIWYG)
                    exportQueue: [],          // Array of { presetSlot, cameraView, layers, label } for batch export
                    isBatchExporting: false,  // Batch export in progress flag
                // Mass export — transient (excluded from persist/Zundo)
                massExportActive: false,
                massExportPlan: null,      // { scenarios: [{ name }], viewSlots: [1,3,5], cameraViews: ['iso','top'], format: 'png', resolution: '1920x1080' }
                massExportProgress: null,  // { scenarioIndex, scenarioCount, scenarioName }
                massExportOriginalScenario: null,
                massExportOriginalSnapshot: null,
                    // Visual Customization Settings - Split for Existing and Proposed models
                    styleSettings: {
                        existing: {
                            lotLines: {
                                color: '#000000',
                                width: 1.5,
                                dashed: false,
                                dashSize: 3,
                                gapSize: 2,
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
                                dashSize: 3,
                                gapSize: 2,
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
                                lineDashSize: 3,
                                lineGapSize: 2,
                            },
                            roofFaces: {
                                color: '#B8A088',
                                opacity: 1.0,
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
                                dashSize: 3,
                                gapSize: 2,
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
                                dashSize: 3,
                                gapSize: 2,
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
                                lineDashSize: 3,
                                lineGapSize: 2,
                            },
                            roofFaces: {
                                color: '#C4B8A8',
                                opacity: 1.0,
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
                            draggableText: false,      // Allow dragging dimension text (future)
                            // Extension line separate styling
                            extensionLineColor: null,  // null = inherit lineColor
                            extensionLineStyle: 'dashed', // 'solid' | 'dashed' | 'dotted' | 'dash-dot' | 'dash-dot-dot'
                            // Main dimension line style
                            dimensionLineStyle: 'solid', // 'solid' | 'dashed' | 'dotted' | 'dash-dot' | 'dash-dot-dot'
                            dimensionDashSize: 1,
                            dimensionGapSize: 0.5,
                            extensionDashSize: 1,
                            extensionGapSize: 0.5,
                            // Marker separate styling
                            markerColor: null,         // null = inherit lineColor
                            markerScale: 1.0,          // multiplier on marker sizing
                            // Font choice (resolved to URL in Dimension.jsx)
                            fontFamily: 'Inter',       // 'Inter' | 'Roboto' | 'Lato' | 'Montserrat' | 'Oswald' | 'Source Sans'
                            // Dimension offsets (replaces hardcoded values in LotEntity.jsx)
                            setbackDimOffset: 5,       // offset for setback dimensions
                            lotDimOffset: 15,          // offset for lot width dimension
                            lotDepthDimOffset: 15,     // offset for lot depth dimension (independent)
                            // Vertical mode
                            verticalMode: false,       // false = XY plan view; true = Z-axis upward
                            verticalOffset: 20,        // height above ground in vertical mode
                            textPerpOffset: 0,
                            textAnchorY: 'bottom',
                            textPerpOffsetDepth: 0,    // depth dim text perp offset (independent)
                            textAnchorYDepth: 'center', // depth dim text side (independent)
                            textModeDepth: 'billboard', // depth dim text mode (billboard faces camera)
                            sideSetbackDimYPosition: 0.5, // DEPRECATED — kept for backward compat
                            frontSetbackDimPosition: 0.5,  // 0=left edge, 0.5=center, 1=right edge (X along lot width)
                            rearSetbackDimPosition: 0.5,   // same as front
                            leftSetbackDimPosition: 0.5,   // 0=front edge, 0.5=center, 1=rear edge (Y along lot depth)
                            rightSetbackDimPosition: 0.5,  // same as left
                            maxFrontSetbackDimOffset: 5,
                            maxSideStreetSetbackDimOffset: 5,
                            lotDepthDimSide: 'right',
                            buildingHeightDimOffset: -10,     // building height dimension offset
                            maxHeightDimOffset: -20,          // max height dimension offset
                            firstFloorHeightDimOffset: -30,   // 1st floor height dimension offset
                            customLabels: {
                                lotWidth: { mode: 'value', text: 'A' },
                                lotDepth: { mode: 'value', text: 'B' },
                                lotArea: { mode: 'value', text: '' },
                                lotCoverage: { mode: 'value', text: '' },
                                lotWidthAtSetback: { mode: 'value', text: '' },
                                widthToDepthRatio: { mode: 'value', text: '' },
                                maxImperviousSurface: { mode: 'value', text: '' },
                                setbackFront: { mode: 'value', text: '' },
                                setbackRear: { mode: 'value', text: '' },
                                setbackSideInterior: { mode: 'value', text: '' },
                                setbackSideStreet: { mode: 'value', text: '' },
                                setbackMaxFront: { mode: 'value', text: '' },
                                setbackMaxSideStreet: { mode: 'value', text: '' },
                                distBetweenBuildingsPrincipal: { mode: 'value', text: '' },
                                setbackFrontAccessory: { mode: 'value', text: '' },
                                setbackRearAccessory: { mode: 'value', text: '' },
                                setbackSideInteriorAccessory: { mode: 'value', text: '' },
                                setbackSideStreetAccessory: { mode: 'value', text: '' },
                                distBetweenBuildingsAccessory: { mode: 'value', text: '' },
                                buildingHeight: { mode: 'value', text: '' },
                                principalMaxHeight: { mode: 'value', text: '' },
                                principalMaxStories: { mode: 'value', text: '' },
                                firstFloorHeight: { mode: 'value', text: '' },
                                principalUpperStoryHeight: { mode: 'value', text: '' },
                                accessoryMaxHeight: { mode: 'value', text: '' },
                                accessoryMaxStories: { mode: 'value', text: '' },
                                accessoryFirstFloorHeight: { mode: 'value', text: '' },
                                accessoryUpperStoryHeight: { mode: 'value', text: '' },
                                btzFrontPrincipal: { mode: 'value', text: '' },
                                btzSideStreetPrincipal: { mode: 'value', text: '' },
                                btzFrontAccessory: { mode: 'value', text: '' },
                                btzSideStreetAccessory: { mode: 'value', text: '' },
                                lotAccessPrimaryStreet: { mode: 'value', text: '' },
                                lotAccessSecondaryStreet: { mode: 'value', text: '' },
                                lotAccessRearAlley: { mode: 'value', text: '' },
                                lotAccessSharedDrive: { mode: 'value', text: '' },
                                parkingLocationFront: { mode: 'value', text: '' },
                                parkingLocationSideInterior: { mode: 'value', text: '' },
                                parkingLocationSideStreet: { mode: 'value', text: '' },
                                parkingLocationRear: { mode: 'value', text: '' },
                                parkingSetbackFront: { mode: 'value', text: '' },
                                parkingSetbackRear: { mode: 'value', text: '' },
                                parkingSetbackSideInterior: { mode: 'value', text: '' },
                                parkingSetbackSideStreet: { mode: 'value', text: '' },
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
                // Vertices centered around (0,0) to match group coordinate system
                enablePolygonMode: (model) => set((state) => {
                    const params = state[model];
                    const w = params.lotWidth;
                    const d = params.lotDepth;

                    // Both existing and proposed: centered around (0,0)
                    const vertices = [
                        { id: generateVertexId(), x: -w / 2, y: -d / 2 },  // Bottom-left
                        { id: generateVertexId(), x: w / 2, y: -d / 2 },   // Bottom-right
                        { id: generateVertexId(), x: w / 2, y: d / 2 },    // Top-right
                        { id: generateVertexId(), x: -w / 2, y: d / 2 },   // Top-left
                    ];

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

                    // Apply perpendicular constraint only for 4-vertex rectangles; free drag for 5+ vertices
                    const newVertices = geometry.vertices.length <= 4
                        ? applyPerpendicularConstraint(geometry.vertices, vertexIndex, snappedX, snappedY)
                        : geometry.vertices.map((v, i) => i === vertexIndex ? { ...v, x: snappedX, y: snappedY } : v);

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

                    // Move all vertices collinear with the edge (handles midpoint splits)
                    const newVertices = vertices.map((v, i) => {
                        if (i === v1Index || i === v2Index || isPointOnSegment(v, v1, v2)) {
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
                    const newVertices = geometry.vertices.length <= 4
                        ? applyPerpendicularConstraint(geometry.vertices, vertexIndex, snappedX, snappedY)
                        : geometry.vertices.map((v, i) => i === vertexIndex ? { ...v, x: snappedX, y: snappedY } : v);
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
                        if (i === v1Index || i === v2Index || isPointOnSegment(v, vertices[v1Index], vertices[v2Index])) {
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
                    const newVertices = geometry.vertices.length <= 4
                        ? applyPerpendicularConstraint(geometry.vertices, vertexIndex, snappedX, snappedY)
                        : geometry.vertices.map((v, i) => i === vertexIndex ? { ...v, x: snappedX, y: snappedY } : v);
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
                        if (i === v1Index || i === v2Index || isPointOnSegment(v, vertices[v1Index], vertices[v2Index])) {
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

                // District parameters (informational) — also auto-populates lots
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

                    // Auto-populate all lots with the changed district parameter
                    const setter = DISTRICT_TO_LOT_MAP[path];
                    if (setter && value != null && state.entityOrder.length > 0) {
                        const newEntities = JSON.parse(JSON.stringify(state.entities));
                        for (const lotId of state.entityOrder) {
                            if (newEntities.lots[lotId]) {
                                setter(newEntities.lots[lotId], value);
                            }
                        }
                        return { districtParameters: newParams, entities: newEntities };
                    }

                    return { districtParameters: newParams };
                }),

                // Lot CRUD
                addLot: (initialData) => set((state) => {
                    const lotId = generateEntityId('lot');
                    // 1. Create lot with hardcoded defaults
                    const lot = createDefaultLot();
                    // 2. Apply district parameter defaults (overrides hardcoded)
                    applyDistrictDefaultsToLot(lot, state.districtParameters);
                    // 3. Copy dimensions from the last lot when no explicit overrides
                    if (!initialData && state.entityOrder.length > 0) {
                        const lastLotId = state.entityOrder[state.entityOrder.length - 1];
                        const lastLot = state.entities.lots[lastLotId];
                        if (lastLot) {
                            lot.lotWidth = lastLot.lotWidth;
                            lot.lotDepth = lastLot.lotDepth;
                        }
                    }
                    // 4. Apply explicit overrides (highest priority)
                    if (initialData) {
                        Object.assign(lot, initialData);
                    }
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

                    // Clear stale lot access arrow positions when dimensions change
                    let annotationPositions = state.annotationPositions;
                    if (key === 'lotWidth' || key === 'lotDepth') {
                        const prefix = `lot-${lotId}-access-`;
                        const filtered = { ...annotationPositions };
                        for (const k of Object.keys(filtered)) {
                            if (k.startsWith(prefix)) delete filtered[k];
                        }
                        annotationPositions = filtered;
                    }

                    return {
                        entities: {
                            ...state.entities,
                            lots: {
                                ...state.entities.lots,
                                [lotId]: { ...lot, [key]: value },
                            },
                        },
                        annotationPositions,
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

                // Imported model actions (multi-model)
                addImportedModel: (lotId, filename) => set((state) => {
                    const lot = state.entities.lots[lotId]
                    if (!lot) return state
                    const principal = lot.buildings?.principal
                    const modelId = generateEntityId('imodel')
                    const newModel = {
                        filename,
                        name: filename.replace(/\.ifc$/i, ''),
                        x: principal?.x ?? 0,
                        y: principal?.y ?? 0,
                        rotation: 0,
                        scale: 1,
                        units: 'auto',
                        locked: false,
                    }
                    return {
                        entities: {
                            ...state.entities,
                            lots: {
                                ...state.entities.lots,
                                [lotId]: {
                                    ...lot,
                                    importedModels: { ...lot.importedModels, [modelId]: newModel },
                                    importedModelOrder: [...(lot.importedModelOrder ?? []), modelId],
                                },
                            },
                        },
                    }
                }),

                setImportedModelName: (lotId, modelId, name) => set((state) => {
                    const lot = state.entities.lots[lotId]
                    const model = lot?.importedModels?.[modelId]
                    if (!model) return state
                    return {
                        entities: {
                            ...state.entities,
                            lots: {
                                ...state.entities.lots,
                                [lotId]: {
                                    ...lot,
                                    importedModels: { ...lot.importedModels, [modelId]: { ...model, name } },
                                },
                            },
                        },
                    }
                }),

                setImportedModelUnits: (lotId, modelId, units) => set((state) => {
                    const lot = state.entities.lots[lotId]
                    const model = lot?.importedModels?.[modelId]
                    if (!model) return state
                    return {
                        entities: {
                            ...state.entities,
                            lots: {
                                ...state.entities.lots,
                                [lotId]: {
                                    ...lot,
                                    importedModels: { ...lot.importedModels, [modelId]: { ...model, units } },
                                },
                            },
                        },
                    }
                }),

                setImportedModelPosition: (lotId, modelId, newX, newY) => set((state) => {
                    const lot = state.entities.lots[lotId]
                    const model = lot?.importedModels?.[modelId]
                    if (!model) return state
                    return {
                        entities: {
                            ...state.entities,
                            lots: {
                                ...state.entities.lots,
                                [lotId]: {
                                    ...lot,
                                    importedModels: { ...lot.importedModels, [modelId]: { ...model, x: newX, y: newY } },
                                },
                            },
                        },
                    }
                }),

                setImportedModelStyle: (lotId, modelId, category, property, value) => set((state) => {
                    const lot = state.entities.lots[lotId]
                    const model = lot?.importedModels?.[modelId]
                    if (!model) return state
                    const currentStyle = model.style ?? {
                        faces: { color: null, opacity: null },
                        edges: { color: null, width: null, opacity: null, visible: null },
                    }
                    return {
                        entities: {
                            ...state.entities,
                            lots: {
                                ...state.entities.lots,
                                [lotId]: {
                                    ...lot,
                                    importedModels: {
                                        ...lot.importedModels,
                                        [modelId]: {
                                            ...model,
                                            style: {
                                                ...currentStyle,
                                                [category]: {
                                                    ...currentStyle[category],
                                                    [property]: value,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    }
                }),

                removeImportedModel: (lotId, modelId) => set((state) => {
                    const lot = state.entities.lots[lotId]
                    if (!lot) return state
                    const newModels = { ...lot.importedModels }
                    delete newModels[modelId]
                    const newOrder = (lot.importedModelOrder ?? []).filter(id => id !== modelId)
                    // Also deselect if this model was selected
                    const sel = state.selectedImportedModel
                    const deselect = sel?.lotId === lotId && sel?.modelId === modelId
                    return {
                        entities: {
                            ...state.entities,
                            lots: {
                                ...state.entities.lots,
                                [lotId]: { ...lot, importedModels: newModels, importedModelOrder: newOrder },
                            },
                        },
                        ...(deselect ? { selectedImportedModel: null } : {}),
                    }
                }),

                removeAllImportedModels: () => set((state) => {
                    const newLots = { ...state.entities.lots }
                    for (const lotId of state.entityOrder) {
                        if (newLots[lotId]?.importedModelOrder?.length > 0) {
                            newLots[lotId] = { ...newLots[lotId], importedModels: {}, importedModelOrder: [] }
                        }
                    }
                    return { entities: { ...state.entities, lots: newLots }, selectedImportedModel: null }
                }),

                // Imported model selection
                selectImportedModel: (lotId, modelId) => set((state) => {
                    const model = state.entities?.lots?.[lotId]?.importedModels?.[modelId]
                    if (model?.locked) return state
                    return { selectedImportedModel: { lotId, modelId } }
                }),
                deselectImportedModel: () => set({ selectedImportedModel: null }),

                setCameraControlsRef: (ref) => set({ _cameraControlsRef: ref }),

                toggleImportedModelVisible: (lotId, modelId) => set((state) => {
                    const lot = state.entities?.lots?.[lotId]
                    const model = lot?.importedModels?.[modelId]
                    if (!model) return state
                    return {
                        entities: { ...state.entities, lots: { ...state.entities.lots, [lotId]: {
                            ...lot, importedModels: { ...lot.importedModels, [modelId]: {
                                ...model, visible: !(model.visible ?? true)
                            }}
                        }}}
                    }
                }),

                toggleImportedModelLocked: (lotId, modelId) => set((state) => {
                    const lot = state.entities?.lots?.[lotId]
                    const model = lot?.importedModels?.[modelId]
                    if (!model) return state
                    const wasLocked = model.locked ?? false
                    const sel = state.selectedImportedModel
                    return {
                        entities: {
                            ...state.entities,
                            lots: {
                                ...state.entities.lots,
                                [lotId]: {
                                    ...lot,
                                    importedModels: {
                                        ...lot.importedModels,
                                        [modelId]: { ...model, locked: !wasLocked },
                                    },
                                },
                            },
                        },
                        // Deselect if locking a currently-selected model
                        ...(!wasLocked && sel?.lotId === lotId && sel?.modelId === modelId
                            ? { selectedImportedModel: null }
                            : {}),
                    }
                }),

                // Entity selection
                selectEntity: (lotId) => set({ activeEntityId: lotId }),
                deselectEntity: () => set({ activeEntityId: null, selectedBuildingType: null }),

                // Reset all data fields while preserving styles, annotations, drawings, etc.
                resetDistrictAndModelParameters: () => set((state) => {
                    const newLotId = generateEntityId('lot');
                    const newLot = createDefaultLot();
                    const newRoadId = generateEntityId('road');
                    const newRoad = createDefaultRoadModule('front', 'S1');
                    return {
                        districtParameters: createDefaultDistrictParameters(),
                        modelSetup: {
                            numLots: 1,
                            streetEdges: { front: true, left: false, right: false, rear: false },
                            streetTypes: { front: 'S1', left: 'S1', right: 'S2', rear: 'S3' },
                        },
                        entities: {
                            lots: { [newLotId]: newLot },
                            roadModules: { [newRoadId]: newRoad },
                        },
                        entityOrder: [newLotId],
                        entityStyles: { [newLotId]: createDefaultLotStyle() },
                        lotVisibility: { [newLotId]: createDefaultLotVisibility() },
                        stashedRoadModules: {},
                        activeEntityId: null,
                        selectedBuildingType: null,
                    };
                }),

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
                        selectedImportedModel: null,
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

                // Scene bounds (transient, computed by DistrictSceneContent)
                setSceneBounds: (bounds) => set({ sceneBounds: bounds }),

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
                    // District lots: centered around (0,0) to match group position at (offset + w/2, d/2)
                    const vertices = [
                        { id: generateVertexId(), x: -w / 2, y: -d / 2 },
                        { id: generateVertexId(), x: w / 2, y: -d / 2 },
                        { id: generateVertexId(), x: w / 2, y: d / 2 },
                        { id: generateVertexId(), x: -w / 2, y: d / 2 },
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
                    // Apply perpendicular constraint only for 4-vertex rectangles; free drag for 5+ vertices
                    const newVertices = lot.lotGeometry.vertices.length <= 4
                        ? applyPerpendicularConstraint(lot.lotGeometry.vertices, vertexIndex, snappedX, snappedY)
                        : lot.lotGeometry.vertices.map((v, i) => i === vertexIndex ? { ...v, x: snappedX, y: snappedY } : v);
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
                        if (i === v1Index || i === v2Index || isPointOnSegment(v, vertices[v1Index], vertices[v2Index])) {
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
                    const newVertices = building.geometry.vertices.length <= 4
                        ? applyPerpendicularConstraint(building.geometry.vertices, vertexIndex, snappedX, snappedY)
                        : building.geometry.vertices.map((v, i) => i === vertexIndex ? { ...v, x: snappedX, y: snappedY } : v);
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
                        if (i === v1Index || i === v2Index || isPointOnSegment(v, vertices[v1Index], vertices[v2Index])) {
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

                resetEntityBuildingGeometryAndPosition: (lotId, buildingType) => set((state) => {
                    const lot = state.entities.lots[lotId];
                    if (!lot) return state;
                    const building = lot.buildings[buildingType];
                    if (!building) return state;
                    const defaultPos = buildingType === 'principal' ? { x: 0, y: 0 } : { x: 0, y: 15 };
                    return {
                        entities: {
                            ...state.entities,
                            lots: {
                                ...state.entities.lots,
                                [lotId]: {
                                    ...lot,
                                    buildings: {
                                        ...lot.buildings,
                                        [buildingType]: { ...building, ...defaultPos, geometry: { mode: 'rectangle', vertices: null }, selected: false },
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

                // Style preset helpers
                getStylePresetData: () => {
                    const state = get()
                    const activeLotId = state.selectedEntity || state.entityOrder[0]
                    return {
                        entityStyles: activeLotId ? state.entityStyles[activeLotId] : null,
                        roadModuleStyles: state.roadModuleStyles,
                        dimensionSettings: state.viewSettings.styleSettings.dimensionSettings,
                        annotationSettings: state.annotationSettings,
                        renderSettings: state.renderSettings,
                        lighting: state.viewSettings.lighting,
                        sunSettings: state.sunSettings,
                    }
                },

                applyStylePreset: (presetData) => set((state) => {
                    const result = {}

                    // Entity styles — apply to all lots
                    if (presetData.entityStyles !== undefined) {
                        const newStyles = { ...state.entityStyles }
                        for (const lotId of state.entityOrder) {
                            newStyles[lotId] = JSON.parse(JSON.stringify(presetData.entityStyles))
                        }
                        result.entityStyles = newStyles
                    }

                    // Road module styles
                    if (presetData.roadModuleStyles !== undefined) {
                        result.roadModuleStyles = presetData.roadModuleStyles
                    }

                    // Annotation settings
                    if (presetData.annotationSettings !== undefined) {
                        result.annotationSettings = { ...state.annotationSettings, ...presetData.annotationSettings }
                    }

                    // Render settings
                    if (presetData.renderSettings !== undefined) {
                        result.renderSettings = { ...state.renderSettings, ...presetData.renderSettings }
                    }

                    // Sun settings
                    if (presetData.sunSettings !== undefined) {
                        result.sunSettings = { ...state.sunSettings, ...presetData.sunSettings }
                    }

                    // Dimension settings + lighting live inside viewSettings
                    const hasDimension = presetData.dimensionSettings !== undefined
                    const hasLighting = presetData.lighting !== undefined
                    if (hasDimension || hasLighting) {
                        result.viewSettings = {
                            ...state.viewSettings,
                            ...(hasLighting ? { lighting: { ...state.viewSettings.lighting, ...presetData.lighting } } : {}),
                            styleSettings: {
                                ...state.viewSettings.styleSettings,
                                ...(hasDimension ? {
                                    dimensionSettings: {
                                        ...state.viewSettings.styleSettings.dimensionSettings,
                                        ...presetData.dimensionSettings,
                                        // Merge nested objects carefully
                                        textBackground: {
                                            ...state.viewSettings.styleSettings.dimensionSettings.textBackground,
                                            ...(presetData.dimensionSettings.textBackground ?? {}),
                                        },
                                        customLabels: {
                                            ...state.viewSettings.styleSettings.dimensionSettings.customLabels,
                                            ...(presetData.dimensionSettings.customLabels ?? {}),
                                        },
                                    },
                                } : {}),
                            },
                        }
                    }

                    return result
                }),

                // Label preset helpers
                getLabelPresetData: () => {
                    const state = get()
                    return {
                        dimensionCustomLabels: state.viewSettings?.styleSettings?.dimensionSettings?.customLabels ?? {},
                        annotationCustomLabels: state.annotationCustomLabels ?? {},
                    }
                },

                applyLabelPreset: (presetData) => set((state) => {
                    const result = {}

                    // Dimension custom labels — spread-merge to preserve dynamically-added lot-name keys
                    if (presetData.dimensionCustomLabels !== undefined) {
                        result.viewSettings = {
                            ...state.viewSettings,
                            styleSettings: {
                                ...state.viewSettings.styleSettings,
                                dimensionSettings: {
                                    ...state.viewSettings.styleSettings.dimensionSettings,
                                    customLabels: {
                                        ...state.viewSettings.styleSettings.dimensionSettings.customLabels,
                                        ...presetData.dimensionCustomLabels,
                                    },
                                },
                            },
                        }
                    }

                    // Annotation custom labels — spread-merge to preserve dynamic lot keys
                    if (presetData.annotationCustomLabels !== undefined) {
                        result.annotationCustomLabels = {
                            ...state.annotationCustomLabels,
                            ...presetData.annotationCustomLabels,
                        }
                    }

                    return result
                }),

                setActiveLabelPresetName: (name) => set({ activeLabelPresetName: name }),

                // Dimension style preset helpers
                getDimensionPresetData: () => {
                    const state = get()
                    const dimSettings = state.viewSettings?.styleSettings?.dimensionSettings ?? {}
                    const { customLabels, ...styleOnly } = dimSettings
                    return { dimensionStyleData: structuredClone(styleOnly) }
                },

                applyDimensionPreset: (presetData) => set((state) => {
                    if (!presetData.dimensionStyleData) return state
                    const currentDimSettings = state.viewSettings?.styleSettings?.dimensionSettings ?? {}
                    return {
                        viewSettings: {
                            ...state.viewSettings,
                            styleSettings: {
                                ...state.viewSettings.styleSettings,
                                dimensionSettings: {
                                    ...currentDimSettings,
                                    ...presetData.dimensionStyleData,
                                    // Nested merge for textBackground
                                    textBackground: {
                                        ...(currentDimSettings.textBackground ?? {}),
                                        ...(presetData.dimensionStyleData.textBackground ?? {}),
                                    },
                                    // Preserve customLabels from current state
                                    customLabels: currentDimSettings.customLabels,
                                },
                            },
                        },
                    }
                }),

                setActiveDimensionPresetName: (name) => set({ activeDimensionPresetName: name }),

                // Annotation style preset helpers
                getAnnotationPresetData: () => {
                    const state = get()
                    return { annotationStyleData: structuredClone(state.annotationSettings) }
                },

                applyAnnotationPreset: (presetData) => set((state) => {
                    if (!presetData.annotationStyleData) return state
                    return {
                        annotationSettings: {
                            ...state.annotationSettings,
                            ...presetData.annotationStyleData,
                        },
                    }
                }),

                setActiveAnnotationPresetName: (name) => set({ activeAnnotationPresetName: name }),

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
                // Mass export actions
                startMassExport: (plan) => {
                    const state = get()
                    const snapshot = state.getSnapshotData()
                    set({
                        massExportActive: true,
                        massExportPlan: plan,
                        massExportProgress: { scenarioIndex: -1, scenarioCount: plan.scenarios.length, scenarioName: null },
                        massExportOriginalScenario: state.activeScenario,
                        massExportOriginalSnapshot: snapshot,
                    })
                },
                advanceMassExport: () => set((state) => ({
                    massExportProgress: state.massExportProgress
                        ? { ...state.massExportProgress, scenarioIndex: state.massExportProgress.scenarioIndex + 1 }
                        : null
                })),
                completeMassExport: () => set({
                    massExportActive: false,
                    massExportPlan: null,
                    massExportProgress: null,
                    massExportOriginalScenario: null,
                    massExportOriginalSnapshot: null,
                }),
                cancelMassExport: () => set({
                    massExportActive: false,
                    massExportPlan: null,
                    massExportProgress: null,
                }),
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
                setAnnotationCustomLabel: (key, mode, text) => set((state) => ({
                    annotationCustomLabels: {
                        ...state.annotationCustomLabels,
                        [key]: { mode, text },
                    }
                })),

                // Drawing Layer Preset helpers
                getDrawingLayerPresetData: (layerId) => {
                    const state = get()
                    const layer = state.drawingLayers[layerId]
                    if (!layer) return null
                    return {
                        layerName: layer.name,
                        defaults: { ...layer.defaults },
                        renderMode: layer.renderMode,
                        zHeight: layer.zHeight,
                    }
                },
                applyDrawingLayerPreset: (presetData) => set((state) => {
                    const id = `drawing-layer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
                    return {
                        drawingLayers: {
                            ...state.drawingLayers,
                            [id]: {
                                name: presetData.layerName || presetData.name || `Layer ${state.drawingLayerOrder.length + 1}`,
                                visible: true,
                                locked: false,
                                zHeight: presetData.zHeight ?? 0.20,
                                renderMode: presetData.renderMode || '3d',
                                order: state.drawingLayerOrder.length,
                                defaults: { ...(presetData.defaults || {}) },
                            },
                        },
                        drawingLayerOrder: [...state.drawingLayerOrder, id],
                        activeDrawingLayerId: id,
                    }
                }),

                // Drawing Editor actions
                createDrawingLayer: (name) => set((state) => {
                    const id = `drawing-layer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
                    return {
                        drawingLayers: {
                            ...state.drawingLayers,
                            [id]: {
                                name: name || `Layer ${state.drawingLayerOrder.length + 1}`,
                                visible: true,
                                locked: false,
                                zHeight: 0.20,
                                renderMode: '3d',
                                order: state.drawingLayerOrder.length,
                                defaults: {},
                            },
                        },
                        drawingLayerOrder: [...state.drawingLayerOrder, id],
                        activeDrawingLayerId: id,
                    }
                }),
                deleteDrawingLayer: (layerId) => set((state) => {
                    const { [layerId]: _, ...remainingLayers } = state.drawingLayers
                    const remainingObjects = {}
                    for (const [id, obj] of Object.entries(state.drawingObjects)) {
                        if (obj.layerId !== layerId) remainingObjects[id] = obj
                    }
                    return {
                        drawingLayers: remainingLayers,
                        drawingLayerOrder: state.drawingLayerOrder.filter(id => id !== layerId),
                        drawingObjects: remainingObjects,
                        activeDrawingLayerId: state.activeDrawingLayerId === layerId ? null : state.activeDrawingLayerId,
                    }
                }),
                renameDrawingLayer: (layerId, name) => set((state) => ({
                    drawingLayers: {
                        ...state.drawingLayers,
                        [layerId]: { ...state.drawingLayers[layerId], name },
                    },
                })),
                setDrawingLayerVisible: (layerId, visible) => set((state) => ({
                    drawingLayers: {
                        ...state.drawingLayers,
                        [layerId]: { ...state.drawingLayers[layerId], visible },
                    },
                })),
                setDrawingLayerLocked: (layerId, locked) => set((state) => ({
                    drawingLayers: {
                        ...state.drawingLayers,
                        [layerId]: { ...state.drawingLayers[layerId], locked },
                    },
                })),
                setDrawingLayerRenderMode: (layerId, renderMode) => set((state) => ({
                    drawingLayers: {
                        ...state.drawingLayers,
                        [layerId]: { ...state.drawingLayers[layerId], renderMode },
                    },
                })),
                setDrawingLayerZHeight: (layerId, zHeight) => set((state) => ({
                    drawingLayers: {
                        ...state.drawingLayers,
                        [layerId]: { ...state.drawingLayers[layerId], zHeight },
                    },
                })),
                setActiveDrawingLayer: (layerId) => set({ activeDrawingLayerId: layerId }),
                setDrawingMode: (mode) => set({ drawingMode: mode }),
                setDrawingDefault: (key, value) => set((state) => ({
                    drawingDefaults: { ...state.drawingDefaults, [key]: value },
                })),
                setDrawingLayerDefault: (layerId, key, value) => set((state) => ({
                    drawingLayers: {
                        ...state.drawingLayers,
                        [layerId]: {
                            ...state.drawingLayers[layerId],
                            defaults: { ...state.drawingLayers[layerId]?.defaults, [key]: value },
                        },
                    },
                })),
                resetDrawingLayerDefaults: (layerId) => set((state) => ({
                    drawingLayers: {
                        ...state.drawingLayers,
                        [layerId]: {
                            ...state.drawingLayers[layerId],
                            defaults: {},
                        },
                    },
                })),
                applyDrawingLayerDefaultsToObjects: (layerId) => set((state) => {
                    const effective = getEffectiveDrawingDefaults(state, layerId)
                    const newObjects = { ...state.drawingObjects }
                    let changed = false
                    for (const [id, obj] of Object.entries(newObjects)) {
                        if (obj.layerId !== layerId) continue
                        const updates = {}
                        if (obj.strokeColor !== undefined) updates.strokeColor = effective.strokeColor
                        if (obj.strokeWidth !== undefined) updates.strokeWidth = effective.strokeWidth
                        if (obj.lineType !== undefined) updates.lineType = effective.lineType
                        if (obj.fillColor !== undefined) updates.fillColor = effective.fillColor
                        if (obj.fillOpacity !== undefined) updates.fillOpacity = effective.fillOpacity
                        if (obj.textColor !== undefined) updates.textColor = effective.textColor
                        if (obj.fontSize !== undefined) updates.fontSize = effective.fontSize
                        if (obj.fontFamily !== undefined) updates.fontFamily = effective.fontFamily
                        if (obj.outlineWidth !== undefined) updates.outlineWidth = effective.outlineWidth
                        if (obj.outlineColor !== undefined) updates.outlineColor = effective.outlineColor
                        if (obj.cornerRadius !== undefined) updates.cornerRadius = effective.cornerRadius
                        if (obj.arrowHead !== undefined) updates.arrowHead = effective.arrowHead
                        if (Object.keys(updates).length > 0) {
                            newObjects[id] = { ...obj, ...updates }
                            changed = true
                        }
                    }
                    return changed ? { drawingObjects: newObjects } : {}
                }),
                addDrawingObject: (obj) => set((state) => {
                    const id = `drawing-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
                    return {
                        drawingObjects: {
                            ...state.drawingObjects,
                            [id]: { ...obj, id },
                        },
                    }
                }),
                updateDrawingObject: (id, updates) => set((state) => ({
                    drawingObjects: {
                        ...state.drawingObjects,
                        [id]: { ...state.drawingObjects[id], ...updates },
                    },
                })),
                updateDrawingObjects: (updates) => set((state) => {
                    const newObjects = { ...state.drawingObjects }
                    for (const [id, partialObj] of Object.entries(updates)) {
                        if (newObjects[id]) {
                            newObjects[id] = { ...newObjects[id], ...partialObj }
                        }
                    }
                    return { drawingObjects: newObjects }
                }),
                deleteDrawingObject: (id) => set((state) => {
                    const { [id]: _, ...remaining } = state.drawingObjects
                    return { drawingObjects: remaining }
                }),
                setSelectedDrawingIds: (ids) => set({ selectedDrawingIds: ids }),
                setTextEditState: (state) => set({ textEditState: state }),

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
                        fillOpacity: 1.0,
                    },
                    // Left side styles
                    leftParking: {
                        lineColor: '#000000',
                        lineWidth: 1,
                        lineDashed: false,
                        lineOpacity: 1.0,
                        fillColor: '#888888',
                        fillOpacity: 1.0,
                    },
                    leftVerge: {
                        lineColor: '#000000',
                        lineWidth: 1,
                        lineDashed: false,
                        lineOpacity: 1.0,
                        fillColor: '#c4a77d',
                        fillOpacity: 1.0,
                    },
                    leftSidewalk: {
                        lineColor: '#000000',
                        lineWidth: 1,
                        lineDashed: false,
                        lineOpacity: 1.0,
                        fillColor: '#90EE90',
                        fillOpacity: 1.0,
                    },
                    leftTransitionZone: {
                        lineColor: '#000000',
                        lineWidth: 1,
                        lineDashed: false,
                        lineOpacity: 1.0,
                        fillColor: '#98D8AA',
                        fillOpacity: 1.0,
                    },
                    // Right side styles
                    rightParking: {
                        lineColor: '#000000',
                        lineWidth: 1,
                        lineDashed: false,
                        lineOpacity: 1.0,
                        fillColor: '#888888',
                        fillOpacity: 1.0,
                    },
                    rightVerge: {
                        lineColor: '#000000',
                        lineWidth: 1,
                        lineDashed: false,
                        lineOpacity: 1.0,
                        fillColor: '#c4a77d',
                        fillOpacity: 1.0,
                    },
                    rightSidewalk: {
                        lineColor: '#000000',
                        lineWidth: 1,
                        lineDashed: false,
                        lineOpacity: 1.0,
                        fillColor: '#90EE90',
                        fillOpacity: 1.0,
                    },
                    rightTransitionZone: {
                        lineColor: '#000000',
                        lineWidth: 1,
                        lineDashed: false,
                        lineOpacity: 1.0,
                        fillColor: '#98D8AA',
                        fillOpacity: 1.0,
                    },
                    // Intersection fill style (where perpendicular roads overlap)
                    intersectionFill: {
                        fillColor: '#666666',
                        fillOpacity: 1.0,
                    },
                    // Alley intersection fill style (S3 corners — independent from main intersection fills)
                    alleyIntersectionFill: {
                        fillColor: '#666666',
                        fillOpacity: 1.0,
                    },
                    // Alley-specific zone styles (null = use regular style)
                    alleyRoadWidth: null,
                    alleyRightOfWay: null,
                    alleyVerge: null,
                    alleyParking: null,
                    alleySidewalk: null,
                    alleyTransitionZone: null,
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
                    // Update alley zone lineWidths (only when non-null)
                    const alleyZoneKeys = ['alleyRoadWidth', 'alleyParking', 'alleyVerge', 'alleySidewalk', 'alleyTransitionZone']
                    for (const key of alleyZoneKeys) {
                        if (updated[key]) updated[key] = { ...updated[key], lineWidth: width }
                    }
                    if (updated.alleyRightOfWay) updated.alleyRightOfWay = { ...updated.alleyRightOfWay, width }
                    return { roadModuleStyles: updated }
                }),
                setAllRoadZoneColor: (color) => set((state) => {
                    const updated = { ...state.roadModuleStyles }
                    if (updated.rightOfWay) updated.rightOfWay = { ...updated.rightOfWay, color }
                    const zoneKeys = ['roadWidth', 'leftParking', 'leftVerge', 'leftSidewalk', 'leftTransitionZone', 'rightParking', 'rightVerge', 'rightSidewalk', 'rightTransitionZone']
                    for (const key of zoneKeys) {
                        if (updated[key]) updated[key] = { ...updated[key], fillColor: color, lineColor: color }
                    }
                    if (updated.intersectionFill) updated.intersectionFill = { ...updated.intersectionFill, fillColor: color }
                    if (updated.alleyIntersectionFill) updated.alleyIntersectionFill = { ...updated.alleyIntersectionFill, fillColor: color }
                    // Update alley zone colors (only when non-null)
                    const alleyZoneKeys = ['alleyRoadWidth', 'alleyParking', 'alleyVerge', 'alleySidewalk', 'alleyTransitionZone']
                    for (const key of alleyZoneKeys) {
                        if (updated[key]) updated[key] = { ...updated[key], fillColor: color, lineColor: color }
                    }
                    if (updated.alleyRightOfWay) updated.alleyRightOfWay = { ...updated.alleyRightOfWay, color }
                    return { roadModuleStyles: updated }
                }),

                setAllRoadZoneOpacity: (opacity) => set((state) => {
                    const updated = { ...state.roadModuleStyles }
                    if (updated.rightOfWay) updated.rightOfWay = { ...updated.rightOfWay, opacity }
                    const zoneKeys = ['roadWidth', 'leftParking', 'leftVerge', 'leftSidewalk', 'leftTransitionZone', 'rightParking', 'rightVerge', 'rightSidewalk', 'rightTransitionZone']
                    for (const key of zoneKeys) {
                        if (updated[key]) updated[key] = { ...updated[key], fillOpacity: opacity }
                    }
                    if (updated.intersectionFill) updated.intersectionFill = { ...updated.intersectionFill, fillOpacity: opacity }
                    if (updated.alleyIntersectionFill) updated.alleyIntersectionFill = { ...updated.alleyIntersectionFill, fillOpacity: opacity }
                    const alleyZoneKeys = ['alleyRoadWidth', 'alleyParking', 'alleyVerge', 'alleySidewalk', 'alleyTransitionZone']
                    for (const key of alleyZoneKeys) {
                        if (updated[key]) updated[key] = { ...updated[key], fillOpacity: opacity }
                    }
                    return { roadModuleStyles: updated }
                }),

                // Road Module Styles Snapshot (for global toggle revert)
                roadModuleStylesSnapshot: null,
                snapshotRoadModuleStyles: () => set((state) => ({
                    roadModuleStylesSnapshot: JSON.parse(JSON.stringify(state.roadModuleStyles))
                })),
                restoreRoadModuleStyles: () => set((state) => {
                    if (!state.roadModuleStylesSnapshot) return {}
                    return {
                        roadModuleStyles: JSON.parse(JSON.stringify(state.roadModuleStylesSnapshot)),
                        roadModuleStylesSnapshot: null,
                    }
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
                scenarios: [], // District scenarios for current project [{ name, code, timestamp }]
                activeScenario: null, // Name of the currently active scenario
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
                    layerStates: [],
                    scenarios: [],
                    activeScenario: null,
                }),

                // Snapshot/Layer state list actions
                setSnapshots: (snapshots) => set({ snapshots }),
                setLayerStates: (layerStates) => set({ layerStates }),

                // Scenario actions
                setScenarios: (scenarios) => set({ scenarios }),
                setActiveScenario: (name) => set({ activeScenario: name }),

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
                        // Drawing editor
                        drawingLayers: state.drawingLayers,
                        drawingLayerOrder: state.drawingLayerOrder,
                        drawingObjects: state.drawingObjects,
                    };
                },

                // Get current state for saving as layer state (styles only, no camera)
                getLayerStateData: () => {
                    const state = useStore.getState();
                    // Extract drawing layer visibility
                    const drawingLayerVisibility = {}
                    for (const [id, layer] of Object.entries(state.drawingLayers)) {
                        drawingLayerVisibility[id] = layer.visible
                    }
                    return {
                        viewSettings: {
                            layers: state.viewSettings.layers,
                            styleSettings: state.viewSettings.styleSettings,
                            lighting: state.viewSettings.lighting,
                        },
                        renderSettings: state.renderSettings,
                        entityStyles: state.entityStyles,
                        roadModuleStyles: state.roadModuleStyles,
                        lotVisibility: state.lotVisibility,
                        sunSettings: state.sunSettings,
                        annotationSettings: state.annotationSettings,
                        drawingLayerVisibility,
                        entityOrder: state.entityOrder,
                    };
                },

                // Apply loaded snapshot (full state + camera)
                applySnapshot: (snapshotData) => set((state) => {
                    const newState = {
                        existing: snapshotData.existing !== undefined ? snapshotData.existing : state.existing,
                        proposed: snapshotData.proposed !== undefined ? snapshotData.proposed : state.proposed,
                        viewSettings: {
                            ...state.viewSettings,
                            mode: snapshotData.viewSettings?.mode !== undefined ? snapshotData.viewSettings.mode : state.viewSettings.mode,
                            projection: snapshotData.viewSettings?.projection !== undefined ? snapshotData.viewSettings.projection : state.viewSettings.projection,
                            backgroundMode: snapshotData.viewSettings?.backgroundMode !== undefined ? snapshotData.viewSettings.backgroundMode : state.viewSettings.backgroundMode,
                            layers: snapshotData.viewSettings?.layers !== undefined ? snapshotData.viewSettings.layers : state.viewSettings.layers,
                            styleSettings: snapshotData.viewSettings?.styleSettings !== undefined ? snapshotData.viewSettings.styleSettings : state.viewSettings.styleSettings,
                            lighting: snapshotData.viewSettings?.lighting !== undefined ? snapshotData.viewSettings.lighting : state.viewSettings.lighting,
                            // Increment viewVersion to trigger camera update
                            viewVersion: state.viewSettings.viewVersion + 1,
                        },
                        roadModule: snapshotData.roadModule !== undefined ? snapshotData.roadModule : state.roadModule,
                        roadModuleStyles: snapshotData.roadModuleStyles !== undefined ? snapshotData.roadModuleStyles : state.roadModuleStyles,
                        comparisonRoads: snapshotData.comparisonRoads !== undefined ? snapshotData.comparisonRoads : state.comparisonRoads,
                        renderSettings: snapshotData.renderSettings !== undefined ? snapshotData.renderSettings : state.renderSettings,
                        sunSettings: snapshotData.sunSettings !== undefined ? snapshotData.sunSettings : state.sunSettings,
                        layoutSettings: snapshotData.layoutSettings !== undefined ? snapshotData.layoutSettings : state.layoutSettings,
                        // Entity system restoration
                        entities: snapshotData.entities !== undefined ? snapshotData.entities : state.entities,
                        entityOrder: snapshotData.entityOrder !== undefined ? snapshotData.entityOrder : state.entityOrder,
                        entityStyles: snapshotData.entityStyles !== undefined ? snapshotData.entityStyles : state.entityStyles,
                        lotVisibility: snapshotData.lotVisibility !== undefined ? snapshotData.lotVisibility : state.lotVisibility,
                        activeModule: snapshotData.activeModule !== undefined ? snapshotData.activeModule : state.activeModule,
                        modelSetup: snapshotData.modelSetup !== undefined ? snapshotData.modelSetup : state.modelSetup,
                        districtParameters: snapshotData.districtParameters !== undefined ? snapshotData.districtParameters : state.districtParameters,
                        // Drawing editor
                        drawingLayers: snapshotData.drawingLayers !== undefined ? snapshotData.drawingLayers : state.drawingLayers,
                        drawingLayerOrder: snapshotData.drawingLayerOrder !== undefined ? snapshotData.drawingLayerOrder : state.drawingLayerOrder,
                        drawingObjects: snapshotData.drawingObjects !== undefined ? snapshotData.drawingObjects : state.drawingObjects,
                    };
                    // Camera will be restored separately by the CameraHandler
                    if (snapshotData.camera) {
                        newState.cameraState = snapshotData.camera;
                        newState._restoreCamera = true; // Flag to trigger camera restoration
                    }
                    return newState;
                }),

                // Apply loaded layer state (styles only)
                applyLayerState: (layerStateData) => set((state) => {
                    const newState = {
                        viewSettings: {
                            ...state.viewSettings,
                            layers: layerStateData.viewSettings?.layers || state.viewSettings.layers,
                            styleSettings: layerStateData.viewSettings?.styleSettings || state.viewSettings.styleSettings,
                            lighting: layerStateData.viewSettings?.lighting || state.viewSettings.lighting,
                        },
                        renderSettings: layerStateData.renderSettings || state.renderSettings,
                    }
                    if (layerStateData.entityStyles) newState.entityStyles = layerStateData.entityStyles
                    if (layerStateData.roadModuleStyles) newState.roadModuleStyles = layerStateData.roadModuleStyles
                    if (layerStateData.lotVisibility) newState.lotVisibility = layerStateData.lotVisibility
                    if (layerStateData.sunSettings) newState.sunSettings = layerStateData.sunSettings
                    if (layerStateData.annotationSettings) newState.annotationSettings = layerStateData.annotationSettings
                    // Restore drawing layer visibility if present
                    if (layerStateData.drawingLayerVisibility) {
                        const updatedLayers = { ...state.drawingLayers }
                        for (const [id, visible] of Object.entries(layerStateData.drawingLayerVisibility)) {
                            if (updatedLayers[id]) {
                                updatedLayers[id] = { ...updatedLayers[id], visible }
                            }
                        }
                        newState.drawingLayers = updatedLayers
                    }
                    return newState
                }),

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
                        // Drawing editor
                        drawingLayers: state.drawingLayers,
                        drawingLayerOrder: state.drawingLayerOrder,
                        drawingObjects: state.drawingObjects,
                        drawingDefaults: state.drawingDefaults,
                    };
                },

                // Apply loaded project state
                applyProjectState: (projectState) => set((state) => ({
                    existing: projectState.existing !== undefined ? projectState.existing : state.existing,
                    proposed: projectState.proposed !== undefined ? projectState.proposed : state.proposed,
                    viewSettings: {
                        ...state.viewSettings,
                        ...projectState.viewSettings,
                        viewVersion: state.viewSettings.viewVersion + 1,
                    },
                    roadModule: projectState.roadModule !== undefined ? projectState.roadModule : state.roadModule,
                    roadModuleStyles: projectState.roadModuleStyles !== undefined ? projectState.roadModuleStyles : state.roadModuleStyles,
                    comparisonRoads: projectState.comparisonRoads !== undefined ? projectState.comparisonRoads : state.comparisonRoads,
                    renderSettings: projectState.renderSettings !== undefined ? projectState.renderSettings : state.renderSettings,
                    sunSettings: projectState.sunSettings !== undefined ? projectState.sunSettings : state.sunSettings,
                    layoutSettings: projectState.layoutSettings !== undefined ? projectState.layoutSettings : state.layoutSettings,
                    savedViews: projectState.savedViews !== undefined ? projectState.savedViews : state.savedViews,
                    uiTheme: projectState.uiTheme !== undefined ? projectState.uiTheme : state.uiTheme,
                    // Entity system restoration
                    entities: projectState.entities !== undefined ? projectState.entities : state.entities,
                    entityOrder: projectState.entityOrder !== undefined ? projectState.entityOrder : state.entityOrder,
                    entityStyles: projectState.entityStyles !== undefined ? projectState.entityStyles : state.entityStyles,
                    lotVisibility: projectState.lotVisibility !== undefined ? projectState.lotVisibility : state.lotVisibility,
                    activeModule: projectState.activeModule !== undefined ? projectState.activeModule : state.activeModule,
                    modelSetup: projectState.modelSetup !== undefined ? projectState.modelSetup : state.modelSetup,
                    districtParameters: projectState.districtParameters !== undefined ? projectState.districtParameters : state.districtParameters,
                    // Reset scenario state to prevent stale cross-project phantom saves
                    activeScenario: projectState.activeScenario ?? null,
                    scenarios: projectState.scenarios ?? [],
                    // Drawing editor
                    drawingLayers: projectState.drawingLayers !== undefined ? projectState.drawingLayers : state.drawingLayers,
                    drawingLayerOrder: projectState.drawingLayerOrder !== undefined ? projectState.drawingLayerOrder : state.drawingLayerOrder,
                    drawingObjects: projectState.drawingObjects !== undefined ? projectState.drawingObjects : state.drawingObjects,
                    drawingDefaults: projectState.drawingDefaults !== undefined ? projectState.drawingDefaults : state.drawingDefaults,
                })),

                // Flag to signal camera restoration needed
                _restoreCamera: false,
                clearRestoreCameraFlag: () => set({ _restoreCamera: false }),
            }),
            {
                name: 'zoning-app-storage',
                version: 34, // v34: model lock, dashScale fixes, z-ordering
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
                        const defaultRoofFaces = (color) => ({ color, opacity: 1.0 });
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
                            fontFamily: null,
                            textColor: '#000000',
                            outlineColor: '#ffffff',
                            outlineWidth: 0.15,
                            backgroundColor: '#ffffff',
                            backgroundOpacity: 0.85,
                            backgroundEnabled: true,
                            leaderLineColor: '#666666',
                            leaderLineWidth: 1,
                            leaderLineDashed: false,
                            unitFormat: 'feet',
                        };
                    } else {
                        // Backfill new annotation settings keys
                        if (persistedState.annotationSettings.fontFamily === undefined) persistedState.annotationSettings.fontFamily = null;
                        if (persistedState.annotationSettings.outlineColor === undefined) persistedState.annotationSettings.outlineColor = '#ffffff';
                        if (persistedState.annotationSettings.outlineWidth === undefined) persistedState.annotationSettings.outlineWidth = 0.15;
                    }
                    if (!persistedState.annotationCustomLabels) {
                        persistedState.annotationCustomLabels = {
                            roadFront: { mode: 'default', text: '' },
                            roadRight: { mode: 'default', text: '' },
                            roadRear:  { mode: 'default', text: '' },
                            roadLeft:  { mode: 'default', text: '' },
                        };
                    }
                    if (!persistedState.annotationPositions) {
                        persistedState.annotationPositions = {};
                    }
                    if (persistedState.activeLabelPresetName === undefined) {
                        persistedState.activeLabelPresetName = null;
                    }
                    if (persistedState.activeDimensionPresetName === undefined) {
                        persistedState.activeDimensionPresetName = null;
                    }
                    if (persistedState.activeAnnotationPresetName === undefined) {
                        persistedState.activeAnnotationPresetName = null;
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
                        // Split labelBuildings -> labelPrincipalBuildings + labelAccessoryBuildings
                        if (lyrs.labelBuildings !== undefined && lyrs.labelPrincipalBuildings === undefined) {
                            lyrs.labelPrincipalBuildings = lyrs.labelBuildings;
                            lyrs.labelAccessoryBuildings = lyrs.labelBuildings;
                        }
                        if (lyrs.labelPrincipalBuildings === undefined) lyrs.labelPrincipalBuildings = true;
                        if (lyrs.labelAccessoryBuildings === undefined) lyrs.labelAccessoryBuildings = true;
                        // Split buildings -> principalBuildings + accessoryBuildings
                        if (lyrs.principalBuildings === undefined) lyrs.principalBuildings = lyrs.buildings ?? true;
                        if (lyrs.accessoryBuildings === undefined) lyrs.accessoryBuildings = lyrs.buildings ?? true;
                        // Split dimensionsHeight -> dimensionsHeightPrincipal + dimensionsHeightAccessory
                        if (lyrs.dimensionsHeightPrincipal === undefined) lyrs.dimensionsHeightPrincipal = lyrs.dimensionsHeight ?? true;
                        if (lyrs.dimensionsHeightAccessory === undefined) lyrs.dimensionsHeightAccessory = lyrs.dimensionsHeight ?? true;
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
                                        color: '#000000', width: 1, dashed: true, dashSize: 1.5, gapSize: 2, dashScale: 1, opacity: 1.0,
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
                                        color: '#2196F3', width: 1, dashed: true, dashSize: 2.5, gapSize: 1.5, dashScale: 1, opacity: 1.0,
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
                                        color: '#000000', width: 1, dashed: true, dashSize: 1.5, gapSize: 2, dashScale: 1, opacity: 1.0,
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
                                        color: '#2196F3', width: 1, dashed: true, dashSize: 2.5, gapSize: 1.5, dashScale: 1, opacity: 1.0,
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

                    if (version < 23) {
                        // v23: Fix remaining sub-1.0 fillOpacity defaults that v17 missed (0.6 values)
                        const rms = persistedState.roadModuleStyles;
                        if (rms) {
                            const allZoneKeys = [
                                'roadWidth', 'leftParking', 'leftVerge', 'leftSidewalk', 'leftTransitionZone',
                                'rightParking', 'rightVerge', 'rightSidewalk', 'rightTransitionZone',
                            ];
                            for (const key of allZoneKeys) {
                                if (rms[key] && rms[key].fillOpacity != null && rms[key].fillOpacity < 1) {
                                    rms[key].fillOpacity = 1.0;
                                }
                            }
                        }
                        // v23: Reduce AO intensity/radius to prevent dark artifacts at road fillet corners
                        if (persistedState.renderSettings) {
                            if (persistedState.renderSettings.aoIntensity >= 1.5) {
                                persistedState.renderSettings.aoIntensity = 0.8;
                            }
                            if (persistedState.renderSettings.aoRadius >= 0.5) {
                                persistedState.renderSettings.aoRadius = 0.3;
                            }
                        }
                    }

                    if (version < 24) {
                        // v24: Add alleyIntersectionFill style
                        const rms = persistedState.roadModuleStyles;
                        if (rms && !rms.alleyIntersectionFill) {
                            rms.alleyIntersectionFill = { fillColor: '#666666', fillOpacity: 1.0 };
                        }
                    }

                    if (version < 25) {
                        // v25: split buildings/labelBuildings/dimensionsHeight layer keys
                        const layers = persistedState.viewSettings?.layers ?? {};
                        persistedState.viewSettings = {
                            ...persistedState.viewSettings,
                            layers: {
                                ...layers,
                                principalBuildings: layers.principalBuildings ?? layers.buildings ?? true,
                                accessoryBuildings: layers.accessoryBuildings ?? layers.buildings ?? true,
                                labelPrincipalBuildings: layers.labelPrincipalBuildings ?? layers.labelBuildings ?? true,
                                labelAccessoryBuildings: layers.labelAccessoryBuildings ?? layers.labelBuildings ?? true,
                                dimensionsHeightPrincipal: layers.dimensionsHeightPrincipal ?? layers.dimensionsHeight ?? true,
                                dimensionsHeightAccessory: layers.dimensionsHeightAccessory ?? layers.dimensionsHeight ?? true,
                            }
                        };
                    }

                    if (version < 26) {
                        // v26: parking setback layer keys
                        const layers = persistedState.viewSettings?.layers ?? {};
                        if (layers.parkingSetbacks === undefined) layers.parkingSetbacks = true;
                        if (layers.dimensionsParkingSetbacks === undefined) layers.dimensionsParkingSetbacks = true;
                    }

                    if (version < 27) {
                        // v27: fix parking setback visibility default + add setbackFill layer
                        if (persistedState.lotVisibility) {
                            for (const lotId of Object.keys(persistedState.lotVisibility)) {
                                if (persistedState.lotVisibility[lotId].parkingSetbacks === false) {
                                    persistedState.lotVisibility[lotId].parkingSetbacks = true;
                                }
                            }
                        }
                        const layers27 = persistedState.viewSettings?.layers ?? {};
                        if (layers27.setbackFill === undefined) layers27.setbackFill = true;

                        // Reconcile parking setback lot data with district parameters
                        // District params may have been set before DISTRICT_TO_LOT_MAP entries existed
                        const dp27 = persistedState.districtParameters;
                        const lots27 = persistedState.entities?.lots;
                        if (dp27 && lots27) {
                            for (const lotId of Object.keys(lots27)) {
                                const lot = lots27[lotId];
                                if (!lot.parkingSetbacks) {
                                    lot.parkingSetbacks = { front: null, sideInterior: null, sideStreet: null, rear: null };
                                }
                                if (lot.parkingSetbacks.front == null && dp27.parkingLocations?.front?.min != null) {
                                    lot.parkingSetbacks.front = dp27.parkingLocations.front.min;
                                }
                                if (lot.parkingSetbacks.sideInterior == null && dp27.parkingLocations?.sideInterior?.min != null) {
                                    lot.parkingSetbacks.sideInterior = dp27.parkingLocations.sideInterior.min;
                                }
                                if (lot.parkingSetbacks.sideStreet == null && dp27.parkingLocations?.sideStreet?.min != null) {
                                    lot.parkingSetbacks.sideStreet = dp27.parkingLocations.sideStreet.min;
                                }
                                if (lot.parkingSetbacks.rear == null && dp27.parkingLocations?.rear?.min != null) {
                                    lot.parkingSetbacks.rear = dp27.parkingLocations.rear.min;
                                }
                            }
                        }
                    }

                    if (version < 28) {
                        // v28: reconcile parking setbacks with district parameters
                        // Fixes v27 migration that was skipped due to HMR auto-saving version
                        const dp28 = persistedState.districtParameters;
                        const lots28 = persistedState.entities?.lots;
                        if (dp28?.parkingLocations && lots28) {
                            for (const lotId of Object.keys(lots28)) {
                                const lot = lots28[lotId];
                                if (!lot.parkingSetbacks) {
                                    lot.parkingSetbacks = { front: null, sideInterior: null, sideStreet: null, rear: null };
                                }
                                if (lot.parkingSetbacks.front == null && dp28.parkingLocations.front?.min != null)
                                    lot.parkingSetbacks.front = dp28.parkingLocations.front.min;
                                if (lot.parkingSetbacks.sideInterior == null && dp28.parkingLocations.sideInterior?.min != null)
                                    lot.parkingSetbacks.sideInterior = dp28.parkingLocations.sideInterior.min;
                                if (lot.parkingSetbacks.sideStreet == null && dp28.parkingLocations.sideStreet?.min != null)
                                    lot.parkingSetbacks.sideStreet = dp28.parkingLocations.sideStreet.min;
                                if (lot.parkingSetbacks.rear == null && dp28.parkingLocations.rear?.min != null)
                                    lot.parkingSetbacks.rear = dp28.parkingLocations.rear.min;
                            }
                        }
                    }

                    if (version < 29) {
                        // v29: drawing editor foundation — initialize empty drawing state
                        if (!persistedState.drawingLayers) persistedState.drawingLayers = {}
                        if (!persistedState.drawingLayerOrder) persistedState.drawingLayerOrder = []
                        if (!persistedState.drawingObjects) persistedState.drawingObjects = {}
                        if (persistedState.activeDrawingLayerId === undefined) persistedState.activeDrawingLayerId = null
                        if (!persistedState.drawingDefaults) {
                            persistedState.drawingDefaults = {
                                strokeColor: '#000000', strokeWidth: 2, fillColor: '#cccccc',
                                fillOpacity: 0.3, lineType: 'solid', fontSize: 3, fontFamily: null,
                                textColor: '#000000', arrowHead: 'end', cornerRadius: 0, starPoints: 5,
                                outlineWidth: 0.1, outlineColor: '#ffffff',
                            }
                        }
                        // Add drawingEditor layer toggle
                        const layers29 = persistedState.viewSettings?.layers
                        if (layers29 && layers29.drawingEditor === undefined) layers29.drawingEditor = true
                    }

                    if (version < 30) {
                        // v30: imported IFC models — patch lots missing importedModel
                        const lots30 = persistedState.entities?.lots
                        if (lots30) {
                            for (const lotId of Object.keys(lots30)) {
                                if (lots30[lotId].importedModel === undefined) {
                                    lots30[lotId].importedModel = null
                                }
                            }
                        }
                        // Add importedModels layer
                        const layers30 = persistedState.viewSettings?.layers
                        if (layers30 && layers30.importedModels === undefined) layers30.importedModels = true
                    }

                    if (version < 31) {
                        // v31: accessory BTZ, W:D ratio, impervious surface
                        const dp31 = persistedState.districtParameters
                        if (dp31) {
                            if (dp31.widthToDepthRatio === undefined) dp31.widthToDepthRatio = { min: null, max: null }
                            if (dp31.maxImperviousSurface === undefined) dp31.maxImperviousSurface = { min: null, max: null }
                            if (dp31.setbacksAccessory) {
                                if (dp31.setbacksAccessory.btzFront === undefined) dp31.setbacksAccessory.btzFront = null
                                if (dp31.setbacksAccessory.btzSideStreet === undefined) dp31.setbacksAccessory.btzSideStreet = null
                            }
                        }
                        const lots31 = persistedState.entities?.lots
                        if (lots31) {
                            for (const lotId of Object.keys(lots31)) {
                                const acc = lots31[lotId].setbacks?.accessory
                                if (acc) {
                                    if (acc.btzFront === undefined) acc.btzFront = null
                                    if (acc.btzSideStreet === undefined) acc.btzSideStreet = null
                                }
                            }
                        }
                    }

                    if (version < 33) {
                        // v33: multi-model import — migrate importedModel (singular) to importedModels map + importedModelOrder
                        const lots33 = persistedState.entities?.lots
                        if (lots33) {
                            for (const lotId of Object.keys(lots33)) {
                                const lot = lots33[lotId]
                                if (lot.importedModel !== undefined) {
                                    if (lot.importedModel != null) {
                                        const modelId = `imodel-migrated-${lotId}`
                                        lot.importedModels = { [modelId]: lot.importedModel }
                                        lot.importedModelOrder = [modelId]
                                    } else {
                                        lot.importedModels = {}
                                        lot.importedModelOrder = []
                                    }
                                    delete lot.importedModel
                                }
                                // Ensure new keys exist even if lot had neither
                                if (lot.importedModels === undefined) lot.importedModels = {}
                                if (lot.importedModelOrder === undefined) lot.importedModelOrder = []
                            }
                        }
                    }

                    return {
                        ...persistedState,
                        version: 34
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
                    activeScenario: state.activeScenario,
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
                    annotationCustomLabels: state.annotationCustomLabels,
                    annotationPositions: state.annotationPositions,
                    activeLabelPresetName: state.activeLabelPresetName,
                    activeDimensionPresetName: state.activeDimensionPresetName,
                    activeAnnotationPresetName: state.activeAnnotationPresetName,
                    // Drawing editor (exclude transient: drawingMode, selectedDrawingIds, textEditState)
                    drawingLayers: state.drawingLayers,
                    drawingLayerOrder: state.drawingLayerOrder,
                    activeDrawingLayerId: state.activeDrawingLayerId,
                    drawingObjects: state.drawingObjects,
                    drawingDefaults: state.drawingDefaults,
                }),
                merge: (persistedState, currentState) => {
                    const merged = { ...currentState, ...persistedState };
                    // Patch missing entityStyles keys for all lots
                    if (merged.entityStyles) {
                        const styleDefaults = createDefaultLotStyle();
                        for (const lotId of Object.keys(merged.entityStyles)) {
                            for (const [key, val] of Object.entries(styleDefaults)) {
                                if (merged.entityStyles[lotId][key] === undefined) {
                                    merged.entityStyles[lotId][key] = JSON.parse(JSON.stringify(val));
                                }
                            }
                            // Patch missing sub-keys on lotAccessArrows/sharedDriveArrow (heightScale, positionOffsetX/Y)
                            const arrowCats = ['lotAccessArrows', 'sharedDriveArrow'];
                            for (const ac of arrowCats) {
                                const a = merged.entityStyles[lotId][ac];
                                if (a) {
                                    if (a.heightScale === undefined) a.heightScale = 1;
                                    if (a.positionOffsetX === undefined) a.positionOffsetX = 0;
                                    if (a.positionOffsetY === undefined) a.positionOffsetY = 0;
                                }
                            }
                            // Patch missing sub-keys on maxHeightPlane (lineDashSize/lineGapSize)
                            if (merged.entityStyles[lotId].maxHeightPlane) {
                                const mhp = merged.entityStyles[lotId].maxHeightPlane;
                                if (mhp.lineDashSize === undefined || mhp.lineDashSize < 2) mhp.lineDashSize = 3;
                                if (mhp.lineGapSize === undefined || mhp.lineGapSize < 1) mhp.lineGapSize = 2;
                            }
                            // Patch dash params: migrate old tiny world-space values to scene-scaled values
                            // Old: dashScale=5 with dashSize=1,gapSize=0.5 → New: dashScale=1 with dashSize=3,gapSize=2
                            const dashCategories = ['lotLines', 'setbacks', 'maxSetbacks', 'accessorySetbacks', 'parkingSetbacks'];
                            for (const cat of dashCategories) {
                                const s = merged.entityStyles[lotId][cat];
                                if (s) {
                                    // Migrate old dashScale=5 regime to dashScale=1 with larger sizes
                                    if (s.dashScale === 5) {
                                        s.dashScale = 1;
                                        s.dashSize = (s.dashSize ?? 1) * 5;
                                        s.gapSize = (s.gapSize ?? 0.5) * 5;
                                    } else if (s.dashSize != null && s.dashSize < 2) {
                                        // Old-regime values with dashScale already 1 or undefined — scale up
                                        s.dashScale = 1;
                                        s.dashSize = s.dashSize * 5;
                                        s.gapSize = (s.gapSize ?? 0.5) * 5;
                                    }
                                    if (s.dashScale === undefined) s.dashScale = 1;
                                    if (s.dashSize === undefined) s.dashSize = 3;
                                    if (s.gapSize === undefined) s.gapSize = 2;
                                    if (s.overrides) {
                                        for (const side of ['front', 'rear', 'left', 'right']) {
                                            const o = s.overrides[side];
                                            if (o) {
                                                if (o.dashScale === 5) {
                                                    o.dashScale = 1;
                                                    o.dashSize = (o.dashSize ?? 1) * 5;
                                                    o.gapSize = (o.gapSize ?? 0.5) * 5;
                                                } else if (o.dashSize != null && o.dashSize < 2) {
                                                    o.dashScale = 1;
                                                    o.dashSize = o.dashSize * 5;
                                                    o.gapSize = (o.gapSize ?? 0.5) * 5;
                                                }
                                                if (o.dashScale === undefined) o.dashScale = 1;
                                                if (o.dashSize === undefined) o.dashSize = 3;
                                                if (o.gapSize === undefined) o.gapSize = 2;
                                            }
                                        }
                                    }
                                }
                            }
                            // Patch buildingEdges dash props
                            const be = merged.entityStyles[lotId].buildingEdges;
                            if (be) {
                                if (be.dashScale === 5) {
                                    be.dashScale = 1;
                                    be.dashSize = (be.dashSize ?? 1) * 5;
                                    be.gapSize = (be.gapSize ?? 0.5) * 5;
                                } else if (be.dashSize != null && be.dashSize < 2) {
                                    be.dashScale = 1;
                                    be.dashSize = be.dashSize * 5;
                                    be.gapSize = (be.gapSize ?? 0.5) * 5;
                                }
                                if (be.dashSize === undefined) be.dashSize = 3;
                                if (be.gapSize === undefined) be.gapSize = 2;
                                if (be.dashScale === undefined) be.dashScale = 1;
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
                    // Patch missing district parameter keys (v31)
                    if (merged.districtParameters) {
                        if (merged.districtParameters.widthToDepthRatio === undefined) merged.districtParameters.widthToDepthRatio = { min: null, max: null };
                        if (merged.districtParameters.maxImperviousSurface === undefined) merged.districtParameters.maxImperviousSurface = { min: null, max: null };
                        if (merged.districtParameters.setbacksAccessory) {
                            if (merged.districtParameters.setbacksAccessory.btzFront === undefined) merged.districtParameters.setbacksAccessory.btzFront = null;
                            if (merged.districtParameters.setbacksAccessory.btzSideStreet === undefined) merged.districtParameters.setbacksAccessory.btzSideStreet = null;
                        }
                    }
                    // Patch missing lot data keys (parkingSetbacks, importedModels) + reconcile with district params
                    if (merged.entities?.lots) {
                        const dp = merged.districtParameters;
                        for (const lotId of Object.keys(merged.entities.lots)) {
                            const lot = merged.entities.lots[lotId];
                            // Migrate legacy single importedModel if still present
                            if (lot.importedModel !== undefined) {
                                if (lot.importedModel != null) {
                                    const mId = `imodel-migrated-${lotId}`
                                    if (!lot.importedModels) lot.importedModels = {}
                                    if (!lot.importedModelOrder) lot.importedModelOrder = []
                                    lot.importedModels[mId] = lot.importedModel
                                    lot.importedModelOrder.push(mId)
                                }
                                delete lot.importedModel
                            }
                            if (lot.importedModels === undefined) lot.importedModels = {}
                            if (lot.importedModelOrder === undefined) lot.importedModelOrder = []
                            // Patch missing locked flag on imported models (v34)
                            for (const mId of Object.keys(lot.importedModels)) {
                                if (lot.importedModels[mId].locked === undefined) {
                                    lot.importedModels[mId].locked = false
                                }
                            }
                            // Patch missing sharedDriveLocation
                            if (lot.lotAccess && lot.lotAccess.sharedDriveLocation === undefined) {
                                lot.lotAccess.sharedDriveLocation = 'front';
                            }
                            // Patch missing accessory BTZ fields (v31)
                            if (lot.setbacks?.accessory) {
                                if (lot.setbacks.accessory.btzFront === undefined) lot.setbacks.accessory.btzFront = null;
                                if (lot.setbacks.accessory.btzSideStreet === undefined) lot.setbacks.accessory.btzSideStreet = null;
                            }
                            // Patch missing per-side interior setback overrides (townhome support)
                            if (lot.setbacks?.principal) {
                                if (lot.setbacks.principal.sideInteriorLeft === undefined) lot.setbacks.principal.sideInteriorLeft = null;
                                if (lot.setbacks.principal.sideInteriorRight === undefined) lot.setbacks.principal.sideInteriorRight = null;
                            }
                            if (lot.setbacks?.accessory) {
                                if (lot.setbacks.accessory.sideInteriorLeft === undefined) lot.setbacks.accessory.sideInteriorLeft = null;
                                if (lot.setbacks.accessory.sideInteriorRight === undefined) lot.setbacks.accessory.sideInteriorRight = null;
                            }
                            if (lot.parkingSetbacks) {
                                if (lot.parkingSetbacks.sideInteriorLeft === undefined) lot.parkingSetbacks.sideInteriorLeft = null;
                                if (lot.parkingSetbacks.sideInteriorRight === undefined) lot.parkingSetbacks.sideInteriorRight = null;
                            }
                            if (!lot.parkingSetbacks) {
                                lot.parkingSetbacks = { front: null, sideInterior: null, sideStreet: null, rear: null };
                            }
                            // Reconcile: apply district param parking values to lots that still have null
                            // Only applies when lot value is null AND district value exists
                            // Does NOT overwrite user-set values (non-null lot values are preserved)
                            if (dp?.parkingLocations) {
                                if (lot.parkingSetbacks.front == null && dp.parkingLocations.front?.min != null)
                                    lot.parkingSetbacks.front = dp.parkingLocations.front.min;
                                if (lot.parkingSetbacks.sideInterior == null && dp.parkingLocations.sideInterior?.min != null)
                                    lot.parkingSetbacks.sideInterior = dp.parkingLocations.sideInterior.min;
                                if (lot.parkingSetbacks.sideStreet == null && dp.parkingLocations.sideStreet?.min != null)
                                    lot.parkingSetbacks.sideStreet = dp.parkingLocations.sideStreet.min;
                                if (lot.parkingSetbacks.rear == null && dp.parkingLocations.rear?.min != null)
                                    lot.parkingSetbacks.rear = dp.parkingLocations.rear.min;
                            }
                        }
                    }
                    // Patch missing roadModuleStyles keys
                    if (merged.roadModuleStyles && merged.roadModuleStyles.intersectionFill === undefined) {
                        merged.roadModuleStyles.intersectionFill = { fillColor: '#666666', fillOpacity: 1.0 };
                    }
                    if (merged.roadModuleStyles && merged.roadModuleStyles.alleyIntersectionFill === undefined) {
                        merged.roadModuleStyles.alleyIntersectionFill = { fillColor: '#666666', fillOpacity: 1.0 };
                    }
                    // Patch missing alley zone style keys
                    if (merged.roadModuleStyles) {
                        const alleyKeys = ['alleyRoadWidth', 'alleyRightOfWay', 'alleyVerge', 'alleyParking', 'alleySidewalk', 'alleyTransitionZone'];
                        for (const key of alleyKeys) {
                            if (merged.roadModuleStyles[key] === undefined) {
                                merged.roadModuleStyles[key] = null;
                            }
                        }
                    }
                    // Patch missing left/right zone style keys
                    if (merged.roadModuleStyles) {
                        const zoneStyleDefaults = {
                            leftParking: { lineColor: '#000000', lineWidth: 1, lineDashed: false, lineOpacity: 1.0, fillColor: '#888888', fillOpacity: 1.0 },
                            leftVerge: { lineColor: '#000000', lineWidth: 1, lineDashed: false, lineOpacity: 1.0, fillColor: '#c4a77d', fillOpacity: 1.0 },
                            leftSidewalk: { lineColor: '#000000', lineWidth: 1, lineDashed: false, lineOpacity: 1.0, fillColor: '#90EE90', fillOpacity: 1.0 },
                            leftTransitionZone: { lineColor: '#000000', lineWidth: 1, lineDashed: false, lineOpacity: 1.0, fillColor: '#98D8AA', fillOpacity: 1.0 },
                            rightParking: { lineColor: '#000000', lineWidth: 1, lineDashed: false, lineOpacity: 1.0, fillColor: '#888888', fillOpacity: 1.0 },
                            rightVerge: { lineColor: '#000000', lineWidth: 1, lineDashed: false, lineOpacity: 1.0, fillColor: '#c4a77d', fillOpacity: 1.0 },
                            rightSidewalk: { lineColor: '#000000', lineWidth: 1, lineDashed: false, lineOpacity: 1.0, fillColor: '#90EE90', fillOpacity: 1.0 },
                            rightTransitionZone: { lineColor: '#000000', lineWidth: 1, lineDashed: false, lineOpacity: 1.0, fillColor: '#98D8AA', fillOpacity: 1.0 },
                        };
                        for (const [key, defaultVal] of Object.entries(zoneStyleDefaults)) {
                            if (merged.roadModuleStyles[key] === undefined) {
                                merged.roadModuleStyles[key] = defaultVal;
                            }
                        }
                    }
                    // Patch importedModels layer key
                    if (merged.viewSettings?.layers && merged.viewSettings.layers.importedModels === undefined) {
                        merged.viewSettings.layers.importedModels = true;
                    }
                    // Reset transient batch export state on hydration
                    if (merged.viewSettings) {
                        merged.viewSettings.exportQueue = []
                        merged.viewSettings.isBatchExporting = false
                    }
                    merged.massExportActive = false
                    merged.massExportPlan = null
                    merged.massExportProgress = null
                    merged.massExportOriginalScenario = null
                    merged.massExportOriginalSnapshot = null
                    // Patch missing dimensionSettings keys (new fields added in v25)
                    if (merged.viewSettings?.styleSettings?.dimensionSettings) {
                        const dimDefaults = {
                            extensionLineColor: null,
                            extensionLineStyle: 'dashed',
                            markerColor: null,
                            markerScale: 1.0,
                            fontFamily: 'Inter',
                            setbackDimOffset: 5,
                            lotDimOffset: 15,
                            verticalMode: false,
                            verticalOffset: 20,
                        };
                        const ds = merged.viewSettings.styleSettings.dimensionSettings;
                        for (const [key, val] of Object.entries(dimDefaults)) {
                            if (ds[key] === undefined) {
                                ds[key] = val;
                            }
                        }
                        // Patch dimension line style keys (v32)
                        if (ds.dimensionLineStyle === undefined) ds.dimensionLineStyle = 'solid';
                        if (ds.dimensionDashSize === undefined) ds.dimensionDashSize = 1;
                        if (ds.dimensionGapSize === undefined) ds.dimensionGapSize = 0.5;
                        if (ds.extensionDashSize === undefined) ds.extensionDashSize = 1;
                        if (ds.extensionGapSize === undefined) ds.extensionGapSize = 0.5;
                        // Patch new dimensionSettings keys (v25)
                        if (ds.textPerpOffset === undefined) ds.textPerpOffset = 0;
                        if (ds.textAnchorY === undefined) ds.textAnchorY = 'bottom';
                        if (ds.lotDepthDimSide === undefined) ds.lotDepthDimSide = 'right';
                        if (ds.sideSetbackDimYPosition === undefined) ds.sideSetbackDimYPosition = 0.5;
                        if (ds.frontSetbackDimPosition === undefined) ds.frontSetbackDimPosition = 0.5;
                        if (ds.rearSetbackDimPosition === undefined) ds.rearSetbackDimPosition = 0.5;
                        if (ds.leftSetbackDimPosition === undefined) ds.leftSetbackDimPosition = ds.sideSetbackDimYPosition ?? 0.5;
                        if (ds.rightSetbackDimPosition === undefined) ds.rightSetbackDimPosition = ds.sideSetbackDimYPosition ?? 0.5;
                        // Patch new depth-independent keys
                        if (ds.lotDepthDimOffset === undefined) ds.lotDepthDimOffset = ds.lotDimOffset ?? 15;
                        if (ds.textPerpOffsetDepth === undefined) ds.textPerpOffsetDepth = 0;
                        if (ds.textAnchorYDepth === undefined) ds.textAnchorYDepth = 'center';
                        if (ds.textModeDepth === undefined) ds.textModeDepth = 'billboard';
                        // Patch height dimension offset keys
                        if (ds.buildingHeightDimOffset === undefined) ds.buildingHeightDimOffset = -10;
                        if (ds.maxHeightDimOffset === undefined) ds.maxHeightDimOffset = -20;
                        if (ds.firstFloorHeightDimOffset === undefined) ds.firstFloorHeightDimOffset = -30;
                        if (ds.maxFrontSetbackDimOffset === undefined) ds.maxFrontSetbackDimOffset = 5;
                        if (ds.maxSideStreetSetbackDimOffset === undefined) ds.maxSideStreetSetbackDimOffset = 5;
                        // Patch missing customLabels keys
                        if (!ds.customLabels) ds.customLabels = {};
                        // Migrate old setbackLeft/setbackRight keys to semantic names
                        if (ds.customLabels.setbackLeft !== undefined && ds.customLabels.setbackSideInterior === undefined) {
                            ds.customLabels.setbackSideInterior = ds.customLabels.setbackLeft;
                        }
                        if (ds.customLabels.setbackRight !== undefined && ds.customLabels.setbackSideStreet === undefined) {
                            ds.customLabels.setbackSideStreet = ds.customLabels.setbackRight;
                        }
                        const customLabelDefaults = {
                            lotArea: { mode: 'value', text: '' },
                            lotCoverage: { mode: 'value', text: '' },
                            lotWidthAtSetback: { mode: 'value', text: '' },
                            widthToDepthRatio: { mode: 'value', text: '' },
                            maxImperviousSurface: { mode: 'value', text: '' },
                            principalMaxHeight: { mode: 'value', text: '' },
                            accessoryMaxHeight: { mode: 'value', text: '' },
                            setbackSideInterior: { mode: 'value', text: '' },
                            setbackSideStreet: { mode: 'value', text: '' },
                            setbackMaxFront: { mode: 'value', text: '' },
                            setbackMaxSideStreet: { mode: 'value', text: '' },
                            distBetweenBuildingsPrincipal: { mode: 'value', text: '' },
                            setbackFrontAccessory: { mode: 'value', text: '' },
                            setbackRearAccessory: { mode: 'value', text: '' },
                            setbackSideInteriorAccessory: { mode: 'value', text: '' },
                            setbackSideStreetAccessory: { mode: 'value', text: '' },
                            distBetweenBuildingsAccessory: { mode: 'value', text: '' },
                            firstFloorHeight: { mode: 'value', text: '' },
                            principalMaxStories: { mode: 'value', text: '' },
                            principalUpperStoryHeight: { mode: 'value', text: '' },
                            accessoryMaxStories: { mode: 'value', text: '' },
                            accessoryFirstFloorHeight: { mode: 'value', text: '' },
                            accessoryUpperStoryHeight: { mode: 'value', text: '' },
                            btzFrontPrincipal: { mode: 'value', text: '' },
                            btzSideStreetPrincipal: { mode: 'value', text: '' },
                            btzFrontAccessory: { mode: 'value', text: '' },
                            btzSideStreetAccessory: { mode: 'value', text: '' },
                            lotAccessPrimaryStreet: { mode: 'value', text: '' },
                            lotAccessSecondaryStreet: { mode: 'value', text: '' },
                            lotAccessRearAlley: { mode: 'value', text: '' },
                            lotAccessSharedDrive: { mode: 'value', text: '' },
                            parkingLocationFront: { mode: 'value', text: '' },
                            parkingLocationSideInterior: { mode: 'value', text: '' },
                            parkingLocationSideStreet: { mode: 'value', text: '' },
                            parkingLocationRear: { mode: 'value', text: '' },
                            parkingSetbackFront: { mode: 'value', text: '' },
                            parkingSetbackRear: { mode: 'value', text: '' },
                            parkingSetbackSideInterior: { mode: 'value', text: '' },
                            parkingSetbackSideStreet: { mode: 'value', text: '' },
                        };
                        for (const [key, val] of Object.entries(customLabelDefaults)) {
                            if (ds.customLabels[key] === undefined) {
                                ds.customLabels[key] = val;
                            }
                        }
                    }
                    // Patch missing viewSettings.layers keys
                    if (merged.viewSettings?.layers) {
                        const layerDefaults = { maxSetbacks: true, btzPlanes: true, accessorySetbacks: true, lotAccessArrows: true, lotAccessFront: true, lotAccessRear: true, lotAccessSideStreet: true, lotAccessSharedDrive: true, maxHeightPlanePrincipal: true, maxHeightPlaneAccessory: true, parkingSetbacks: true, dimensionsParkingSetbacks: true, dimensionsMaxFrontSetback: true, dimensionsMaxSideStreetSetback: true, setbackFill: true, drawingEditor: true, dimensionsFirstFloorHeight: true, placementZone: true };
                        for (const [key, val] of Object.entries(layerDefaults)) {
                            if (merged.viewSettings.layers[key] === undefined) {
                                merged.viewSettings.layers[key] = val;
                            }
                        }
                    }
                    // Patch missing drawing editor state
                    if (!merged.drawingLayers) merged.drawingLayers = {}
                    // Patch missing defaults on existing drawing layers
                    for (const layerId of Object.keys(merged.drawingLayers)) {
                        if (!merged.drawingLayers[layerId].defaults) {
                            merged.drawingLayers[layerId] = { ...merged.drawingLayers[layerId], defaults: {} }
                        }
                    }
                    if (!merged.drawingLayerOrder) merged.drawingLayerOrder = []
                    if (!merged.drawingObjects) merged.drawingObjects = {}
                    if (merged.activeDrawingLayerId === undefined) merged.activeDrawingLayerId = null
                    if (!merged.drawingDefaults) {
                        merged.drawingDefaults = {
                            strokeColor: '#000000', strokeWidth: 2, fillColor: '#cccccc',
                            fillOpacity: 0.3, lineType: 'solid', fontSize: 3, fontFamily: null,
                            textColor: '#000000', arrowHead: 'end', cornerRadius: 0, starPoints: 5,
                            outlineWidth: 0.1, outlineColor: '#ffffff', elbowLength: 5,
                        }
                    } else {
                        // Patch individual missing keys (Phase 2+3 additions)
                        if (merged.drawingDefaults.starPoints === undefined) merged.drawingDefaults.starPoints = 5
                        if (merged.drawingDefaults.outlineWidth === undefined) merged.drawingDefaults.outlineWidth = 0.1
                        if (merged.drawingDefaults.outlineColor === undefined) merged.drawingDefaults.outlineColor = '#ffffff'
                        if (merged.drawingDefaults.elbowLength === undefined) merged.drawingDefaults.elbowLength = 5
                    }
                    return merged;
                },
            }
        ),
        {
            limit: 50,
            partialize: (state) => {
                const { existing, proposed, viewSettings, layoutSettings, sunSettings, renderSettings, roadModule, roadModuleStyles, comparisonRoads, entities, entityOrder, entityStyles, lotVisibility, modelSetup, annotationSettings, annotationCustomLabels, annotationPositions, drawingLayers, drawingLayerOrder, drawingObjects } = state
                // Exclude export triggers from undo history
                const { exportRequested: _exportRequested, exportQueue: _exportQueue, isBatchExporting: _isBatchExporting, ...trackedViewSettings } = viewSettings
                return { existing, proposed, viewSettings: trackedViewSettings, layoutSettings, sunSettings, renderSettings, roadModule, roadModuleStyles, comparisonRoads, entities, entityOrder, entityStyles, lotVisibility, modelSetup, annotationSettings, annotationCustomLabels, annotationPositions, drawingLayers, drawingLayerOrder, drawingObjects }
            }
        }
    )
);

// Expose store on window in dev mode for Playwright testing
if (typeof window !== 'undefined' && import.meta.env.DEV) {
    window.__store = useStore;
}
