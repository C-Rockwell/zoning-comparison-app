/**
 * IFC-SPF Generator for Zoning Comparison App
 * Generates IFC4 compliant STEP Physical Format files
 *
 * Spatial hierarchy:
 * IfcProject
 *   └── IfcSite (one per model - existing/proposed)
 *         └── IfcBuilding
 *               └── IfcBuildingStorey
 *                     ├── IfcSlab (lot surface)
 *                     ├── IfcBuildingElementProxy (building mass)
 *                     └── IfcAnnotation (setback lines)
 */

// Entity ID counter for #n= syntax
let entityId = 0

/**
 * Generate a unique entity ID
 */
const nextId = () => ++entityId

/**
 * Generate IFC-compatible GUID (22-character base64)
 */
const generateGUID = () => {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$'
    let guid = ''
    for (let i = 0; i < 22; i++) {
        guid += chars[Math.floor(Math.random() * 64)]
    }
    return guid
}

/**
 * Format a number for IFC (fixed decimal, no trailing zeros on integers)
 */
const fmt = (n) => {
    const val = Number(n)
    if (Number.isInteger(val)) return val.toFixed(1)
    return val.toFixed(6).replace(/\.?0+$/, '')
}

/**
 * Generate IFC header section
 */
const generateHeader = (filename = 'zoning-model.ifc') => {
    const timestamp = new Date().toISOString().split('.')[0]
    return `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('Zoning Comparison Model'),'2;1');
FILE_NAME('${filename}','${timestamp}',('Zoning Comparison App'),(''),'Zoning Comparison App 1.0','','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
`
}

/**
 * Generate IFC footer
 */
const generateFooter = () => `ENDSEC;
END-ISO-10303-21;
`

/**
 * Generate shared context entities (coordinate system, units, etc.)
 */
const generateContext = (entities) => {
    const ids = {}

    // Origin point (0,0,0)
    ids.origin3D = nextId()
    entities.push(`#${ids.origin3D}=IFCCARTESIANPOINT((0.,0.,0.));`)

    ids.origin2D = nextId()
    entities.push(`#${ids.origin2D}=IFCCARTESIANPOINT((0.,0.));`)

    // Direction vectors
    ids.dirZ = nextId()
    entities.push(`#${ids.dirZ}=IFCDIRECTION((0.,0.,1.));`)

    ids.dirX = nextId()
    entities.push(`#${ids.dirX}=IFCDIRECTION((1.,0.,0.));`)

    ids.dirY = nextId()
    entities.push(`#${ids.dirY}=IFCDIRECTION((0.,1.,0.));`)

    ids.dirNegX = nextId()
    entities.push(`#${ids.dirNegX}=IFCDIRECTION((-1.,0.,0.));`)

    ids.dir2DX = nextId()
    entities.push(`#${ids.dir2DX}=IFCDIRECTION((1.,0.));`)

    ids.dir2DY = nextId()
    entities.push(`#${ids.dir2DY}=IFCDIRECTION((0.,1.));`)

    // World coordinate system placement
    ids.worldPlacement = nextId()
    entities.push(`#${ids.worldPlacement}=IFCAXIS2PLACEMENT3D(#${ids.origin3D},#${ids.dirZ},#${ids.dirX});`)

    // Dimensional exponents for length
    ids.dimExp = nextId()
    entities.push(`#${ids.dimExp}=IFCDIMENSIONALEXPONENTS(1,0,0,0,0,0,0);`)

    // SI unit (metre)
    ids.siLength = nextId()
    entities.push(`#${ids.siLength}=IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.);`)

    // Conversion factor: 1 foot = 0.3048 metres
    ids.convFactor = nextId()
    entities.push(`#${ids.convFactor}=IFCMEASUREWITHUNIT(IFCLENGTHMEASURE(0.3048),#${ids.siLength});`)

    // Foot as conversion-based unit
    ids.footUnit = nextId()
    entities.push(`#${ids.footUnit}=IFCCONVERSIONBASEDUNIT(#${ids.dimExp},.LENGTHUNIT.,'FOOT',#${ids.convFactor});`)

    // Area unit (square foot)
    ids.siArea = nextId()
    entities.push(`#${ids.siArea}=IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.);`)

    // Plane angle unit (degree)
    ids.siAngle = nextId()
    entities.push(`#${ids.siAngle}=IFCSIUNIT(*,.PLANEANGLEUNIT.,$,.RADIAN.);`)

    // Unit assignment
    ids.unitAssignment = nextId()
    entities.push(`#${ids.unitAssignment}=IFCUNITASSIGNMENT((#${ids.footUnit},#${ids.siArea},#${ids.siAngle}));`)

    // Geometric representation context (3D)
    ids.context3D = nextId()
    entities.push(`#${ids.context3D}=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#${ids.worldPlacement},$);`)

    // Sub-context for body geometry
    ids.contextBody = nextId()
    entities.push(`#${ids.contextBody}=IFCGEOMETRICREPRESENTATIONSUBCONTEXT('Body','Model',*,*,*,*,#${ids.context3D},$,.MODEL_VIEW.,$);`)

    // Sub-context for footprint geometry
    ids.contextFootprint = nextId()
    entities.push(`#${ids.contextFootprint}=IFCGEOMETRICREPRESENTATIONSUBCONTEXT('FootPrint','Model',*,*,*,*,#${ids.context3D},$,.MODEL_VIEW.,$);`)

    // Sub-context for annotation
    ids.contextAnnotation = nextId()
    entities.push(`#${ids.contextAnnotation}=IFCGEOMETRICREPRESENTATIONSUBCONTEXT('Annotation','Model',*,*,*,*,#${ids.context3D},$,.MODEL_VIEW.,$);`)

    return ids
}

/**
 * Generate IfcProject entity
 */
const generateProject = (entities, contextIds) => {
    const ownerHistory = nextId()
    entities.push(`#${ownerHistory}=IFCOWNERHISTORY($,$,$,.NOCHANGE.,$,$,$,0);`)

    const projectId = nextId()
    const guid = generateGUID()
    entities.push(`#${projectId}=IFCPROJECT('${guid}',#${ownerHistory},'Zoning Comparison',$,$,$,$,(#${contextIds.context3D}),#${contextIds.unitAssignment});`)

    return { projectId, ownerHistory }
}

/**
 * Get lot vertices (handles both rectangle and polygon modes)
 * Returns vertices in world coordinates
 */
const getLotVertices = (model, offsetX, offsetY) => {
    if (model.lotGeometry?.mode === 'polygon' && model.lotGeometry?.vertices) {
        return model.lotGeometry.vertices.map(v => ({
            x: v.x + offsetX,
            y: v.y + offsetY
        }))
    } else {
        // Rectangle mode - lot centered at (offsetX, offsetY)
        const w2 = model.lotWidth / 2
        const d2 = model.lotDepth / 2
        return [
            { x: -w2 + offsetX, y: -d2 + offsetY },
            { x: w2 + offsetX, y: -d2 + offsetY },
            { x: w2 + offsetX, y: d2 + offsetY },
            { x: -w2 + offsetX, y: d2 + offsetY }
        ]
    }
}

/**
 * Generate lot boundary polyline from vertices
 */
const generateLotBoundary = (entities, model, contextIds, offsetX, offsetY) => {
    const vertices = getLotVertices(model, offsetX, offsetY)

    // Create points
    const pointIds = vertices.map(v => {
        const id = nextId()
        entities.push(`#${id}=IFCCARTESIANPOINT((${fmt(v.x)},${fmt(v.y)},0.));`)
        return id
    })

    // Close the loop by adding first point again
    pointIds.push(pointIds[0])

    // Create polyline
    const polylineId = nextId()
    const pointRefs = pointIds.map(id => `#${id}`).join(',')
    entities.push(`#${polylineId}=IFCPOLYLINE((${pointRefs}));`)

    return polylineId
}

/**
 * Generate IfcSite entity with lot boundary
 */
const generateSite = (entities, model, contextIds, ownerHistory, name, offsetX, offsetY) => {
    const guid = generateGUID()

    // Local placement at world origin
    const placementId = nextId()
    entities.push(`#${placementId}=IFCLOCALPLACEMENT($,#${contextIds.worldPlacement});`)

    // Generate lot boundary
    const boundaryId = generateLotBoundary(entities, model, contextIds, offsetX, offsetY)

    // Shape representation for site footprint
    const shapeRepId = nextId()
    entities.push(`#${shapeRepId}=IFCSHAPEREPRESENTATION(#${contextIds.contextFootprint},'FootPrint','Curve2D',(#${boundaryId}));`)

    const productShapeId = nextId()
    entities.push(`#${productShapeId}=IFCPRODUCTDEFINITIONSHAPE($,$,(#${shapeRepId}));`)

    // Create site entity
    const siteId = nextId()
    entities.push(`#${siteId}=IFCSITE('${guid}',#${ownerHistory},'${name} Site',$,$,#${placementId},#${productShapeId},$,.ELEMENT.,$,$,$,$,$);`)

    return siteId
}

/**
 * Generate IfcBuilding entity
 */
const generateBuilding = (entities, contextIds, ownerHistory, siteId, name) => {
    const guid = generateGUID()

    // Local placement relative to site
    const placementId = nextId()
    entities.push(`#${placementId}=IFCLOCALPLACEMENT(#${siteId},$);`)

    const buildingId = nextId()
    entities.push(`#${buildingId}=IFCBUILDING('${guid}',#${ownerHistory},'${name}',$,$,#${placementId},$,$,.ELEMENT.,$,$,$);`)

    return buildingId
}

/**
 * Generate IfcBuildingStorey entity
 */
const generateStorey = (entities, contextIds, ownerHistory, buildingId, elevation = 0) => {
    const guid = generateGUID()

    // Create elevation point
    const elevPoint = nextId()
    entities.push(`#${elevPoint}=IFCCARTESIANPOINT((0.,0.,${fmt(elevation)}));`)

    // Axis placement at elevation
    const axisPlacement = nextId()
    entities.push(`#${axisPlacement}=IFCAXIS2PLACEMENT3D(#${elevPoint},$,$);`)

    // Local placement relative to building
    const placementId = nextId()
    entities.push(`#${placementId}=IFCLOCALPLACEMENT(#${buildingId},#${axisPlacement});`)

    const storeyId = nextId()
    entities.push(`#${storeyId}=IFCBUILDINGSTOREY('${guid}',#${ownerHistory},'Ground Floor',$,$,#${placementId},$,$,.ELEMENT.,${fmt(elevation)});`)

    return storeyId
}

/**
 * Generate extruded solid from arbitrary profile
 */
const generateExtrudedSolidFromVertices = (entities, vertices, height, contextIds, zOffset = 0) => {
    // Create 2D profile points
    const pointIds = vertices.map(v => {
        const id = nextId()
        entities.push(`#${id}=IFCCARTESIANPOINT((${fmt(v.x)},${fmt(v.y)}));`)
        return id
    })

    // Close the profile
    pointIds.push(pointIds[0])

    const polylineId = nextId()
    const pointRefs = pointIds.map(id => `#${id}`).join(',')
    entities.push(`#${polylineId}=IFCPOLYLINE((${pointRefs}));`)

    // Arbitrary closed profile
    const profileId = nextId()
    entities.push(`#${profileId}=IFCARBITRARYCLOSEDPROFILEDEF(.AREA.,$,#${polylineId});`)

    // Position at zOffset
    const positionPoint = nextId()
    entities.push(`#${positionPoint}=IFCCARTESIANPOINT((0.,0.,${fmt(zOffset)}));`)

    const position = nextId()
    entities.push(`#${position}=IFCAXIS2PLACEMENT3D(#${positionPoint},$,$);`)

    // Extrusion direction (up)
    const extrudeDir = nextId()
    entities.push(`#${extrudeDir}=IFCDIRECTION((0.,0.,1.));`)

    // Extruded area solid
    const solidId = nextId()
    entities.push(`#${solidId}=IFCEXTRUDEDAREASOLID(#${profileId},#${position},#${extrudeDir},${fmt(height)});`)

    return solidId
}

/**
 * Generate IfcSlab for lot surface
 */
const generateLotSurface = (entities, model, contextIds, ownerHistory, storeyId, name, offsetX, offsetY) => {
    const guid = generateGUID()
    const vertices = getLotVertices(model, offsetX, offsetY)

    // Local placement relative to storey
    const placementId = nextId()
    entities.push(`#${placementId}=IFCLOCALPLACEMENT(#${storeyId},$);`)

    // Generate thin slab (0.1 feet thick, slightly below ground)
    const solidId = generateExtrudedSolidFromVertices(entities, vertices, 0.1, contextIds, -0.1)

    // Shape representation
    const shapeRepId = nextId()
    entities.push(`#${shapeRepId}=IFCSHAPEREPRESENTATION(#${contextIds.contextBody},'Body','SweptSolid',(#${solidId}));`)

    const productShapeId = nextId()
    entities.push(`#${productShapeId}=IFCPRODUCTDEFINITIONSHAPE($,$,(#${shapeRepId}));`)

    // Create slab entity
    const slabId = nextId()
    entities.push(`#${slabId}=IFCSLAB('${guid}',#${ownerHistory},'${name}',$,$,#${placementId},#${productShapeId},$,.BASESLAB.);`)

    return { elementId: slabId, shapeRepId }
}

/**
 * Generate setback boundary vertices
 */
const getSetbackVertices = (model, offsetX, offsetY) => {
    const { lotWidth, lotDepth, setbackFront, setbackRear, setbackSideLeft, setbackSideRight } = model

    const w2 = lotWidth / 2
    const d2 = lotDepth / 2

    // Inner setback rectangle
    const x1 = -w2 + setbackSideLeft + offsetX
    const x2 = w2 - setbackSideRight + offsetX
    const y1 = -d2 + setbackFront + offsetY
    const y2 = d2 - setbackRear + offsetY

    return [
        { x: x1, y: y1 },
        { x: x2, y: y1 },
        { x: x2, y: y2 },
        { x: x1, y: y2 }
    ]
}

/**
 * Generate a thin extruded strip (for setback line visualization)
 */
const generateLineStrip = (entities, start, end, width, height, contextIds, zOffset = 0) => {
    // Calculate direction and perpendicular
    const dx = end.x - start.x
    const dy = end.y - start.y
    const len = Math.sqrt(dx * dx + dy * dy)

    if (len === 0) return null

    // Perpendicular direction (normalized)
    const px = -dy / len * (width / 2)
    const py = dx / len * (width / 2)

    // Four corners of the strip
    const vertices = [
        { x: start.x - px, y: start.y - py },
        { x: end.x - px, y: end.y - py },
        { x: end.x + px, y: end.y + py },
        { x: start.x + px, y: start.y + py }
    ]

    return generateExtrudedSolidFromVertices(entities, vertices, height, contextIds, zOffset)
}

/**
 * Generate setback lines as thin extruded solids (visible in SketchUp)
 */
const generateSetbackLines = (entities, model, contextIds, ownerHistory, storeyId, name, offsetX, offsetY) => {
    const guid = generateGUID()
    const vertices = getSetbackVertices(model, offsetX, offsetY)

    // Line strip dimensions
    const lineWidth = 0.5  // 6 inches wide
    const lineHeight = 0.2 // 2.4 inches tall
    const zOffset = 0.05   // Slightly above ground

    // Local placement relative to storey
    const placementId = nextId()
    entities.push(`#${placementId}=IFCLOCALPLACEMENT(#${storeyId},$);`)

    // Generate 4 line strips for the setback rectangle
    const solidIds = []
    for (let i = 0; i < vertices.length; i++) {
        const start = vertices[i]
        const end = vertices[(i + 1) % vertices.length]
        const solidId = generateLineStrip(entities, start, end, lineWidth, lineHeight, contextIds, zOffset)
        if (solidId) solidIds.push(solidId)
    }

    // Shape representation with all 4 strips
    const shapeRepId = nextId()
    const solidRefs = solidIds.map(id => `#${id}`).join(',')
    entities.push(`#${shapeRepId}=IFCSHAPEREPRESENTATION(#${contextIds.contextBody},'Body','SweptSolid',(${solidRefs}));`)

    const productShapeId = nextId()
    entities.push(`#${productShapeId}=IFCPRODUCTDEFINITIONSHAPE($,$,(#${shapeRepId}));`)

    // Create as BuildingElementProxy (will be visible in SketchUp)
    const elementId = nextId()
    entities.push(`#${elementId}=IFCBUILDINGELEMENTPROXY('${guid}',#${ownerHistory},'${name}',$,$,#${placementId},#${productShapeId},$,.NOTDEFINED.);`)

    return { elementId, shapeRepId }
}

/**
 * Generate IfcBuildingElementProxy for building mass
 */
const generateBuildingMass = (entities, model, contextIds, ownerHistory, storeyId, name, offsetX, offsetY) => {
    const guid = generateGUID()
    const { buildingWidth, buildingDepth, buildingHeight, buildingX, buildingY } = model

    // Building center position (with model offset)
    const cx = (buildingX || 0) + offsetX
    const cy = (buildingY || 0) + offsetY
    const w2 = buildingWidth / 2
    const d2 = buildingDepth / 2

    // Building footprint vertices
    const vertices = [
        { x: cx - w2, y: cy - d2 },
        { x: cx + w2, y: cy - d2 },
        { x: cx + w2, y: cy + d2 },
        { x: cx - w2, y: cy + d2 }
    ]

    // Local placement relative to storey
    const placementId = nextId()
    entities.push(`#${placementId}=IFCLOCALPLACEMENT(#${storeyId},$);`)

    // Generate solid geometry
    const solidId = generateExtrudedSolidFromVertices(entities, vertices, buildingHeight, contextIds, 0)

    // Shape representation
    const shapeRepId = nextId()
    entities.push(`#${shapeRepId}=IFCSHAPEREPRESENTATION(#${contextIds.contextBody},'Body','SweptSolid',(#${solidId}));`)

    const productShapeId = nextId()
    entities.push(`#${productShapeId}=IFCPRODUCTDEFINITIONSHAPE($,$,(#${shapeRepId}));`)

    // Building element proxy
    const elementId = nextId()
    entities.push(`#${elementId}=IFCBUILDINGELEMENTPROXY('${guid}',#${ownerHistory},'${name}',$,$,#${placementId},#${productShapeId},$,.NOTDEFINED.);`)

    return { elementId, shapeRepId }
}

/**
 * Generate IfcRelAggregates for spatial hierarchy
 */
const generateAggregation = (entities, ownerHistory, parentId, childIds) => {
    const guid = generateGUID()
    const childRefs = childIds.map(id => `#${id}`).join(',')
    const relId = nextId()
    entities.push(`#${relId}=IFCRELAGGREGATES('${guid}',#${ownerHistory},$,$,#${parentId},(${childRefs}));`)
    return relId
}

/**
 * Generate IfcRelContainedInSpatialStructure for element containment
 */
const generateContainment = (entities, ownerHistory, structureId, elementIds) => {
    const guid = generateGUID()
    const elementRefs = elementIds.map(id => `#${id}`).join(',')
    const relId = nextId()
    entities.push(`#${relId}=IFCRELCONTAINEDINSPATIALSTRUCTURE('${guid}',#${ownerHistory},$,$,(${elementRefs}),#${structureId});`)
    return relId
}

/**
 * Generate IfcPresentationLayerAssignment for layer/tag naming
 */
const generateLayerAssignment = (entities, layerName, shapeRepIds) => {
    if (shapeRepIds.length === 0) return null
    const layerId = nextId()
    const repRefs = shapeRepIds.map(id => `#${id}`).join(',')
    entities.push(`#${layerId}=IFCPRESENTATIONLAYERASSIGNMENT('${layerName}',$,(${repRefs}),$);`)
    return layerId
}

/**
 * Main export function - generates complete IFC file
 * @param {Object} existingModel - The "existing" model data from store
 * @param {Object} proposedModel - The "proposed" model data from store
 * @param {Object} options - Export options (e.g., lotSpacing)
 * @returns {string} - Complete IFC-SPF file content
 */
export const generateIFC = (existingModel, proposedModel, options = {}) => {
    // Reset entity counter
    entityId = 0
    const entities = []

    // Calculate model offsets to match scene positioning
    // In scene: existing group at (-spacing/2, 0), lot at (-lotWidth/2, lotDepth/2) relative to group
    // In scene: proposed group at (spacing/2, 0), lot at (lotWidth/2, lotDepth/2) relative to group
    const lotSpacing = options.lotSpacing || 10

    // Existing lot center in world coords
    const existingOffsetX = -(lotSpacing / 2) - (existingModel.lotWidth / 2)
    const existingOffsetY = existingModel.lotDepth / 2

    // Proposed lot center in world coords
    const proposedOffsetX = (lotSpacing / 2) + (proposedModel.lotWidth / 2)
    const proposedOffsetY = proposedModel.lotDepth / 2

    // 1. Generate shared context
    const contextIds = generateContext(entities)

    // 2. Generate project
    const { projectId, ownerHistory } = generateProject(entities, contextIds)

    // 3. Generate sites (one for each model)
    const existingSiteId = generateSite(entities, existingModel, contextIds, ownerHistory, 'Existing', existingOffsetX, existingOffsetY)
    const proposedSiteId = generateSite(entities, proposedModel, contextIds, ownerHistory, 'Proposed', proposedOffsetX, proposedOffsetY)

    // 4. Aggregate sites to project
    generateAggregation(entities, ownerHistory, projectId, [existingSiteId, proposedSiteId])

    // 5. Generate buildings
    const existingBuildingId = generateBuilding(entities, contextIds, ownerHistory, existingSiteId, 'Existing Building')
    const proposedBuildingId = generateBuilding(entities, contextIds, ownerHistory, proposedSiteId, 'Proposed Building')

    // 6. Aggregate buildings to sites
    generateAggregation(entities, ownerHistory, existingSiteId, [existingBuildingId])
    generateAggregation(entities, ownerHistory, proposedSiteId, [proposedBuildingId])

    // 7. Generate storeys
    const existingStoreyId = generateStorey(entities, contextIds, ownerHistory, existingBuildingId)
    const proposedStoreyId = generateStorey(entities, contextIds, ownerHistory, proposedBuildingId)

    // 8. Aggregate storeys to buildings
    generateAggregation(entities, ownerHistory, existingBuildingId, [existingStoreyId])
    generateAggregation(entities, ownerHistory, proposedBuildingId, [proposedStoreyId])

    // 9. Generate lot surfaces (slabs)
    const existingLot = generateLotSurface(entities, existingModel, contextIds, ownerHistory, existingStoreyId, 'Existing Lot', existingOffsetX, existingOffsetY)
    const proposedLot = generateLotSurface(entities, proposedModel, contextIds, ownerHistory, proposedStoreyId, 'Proposed Lot', proposedOffsetX, proposedOffsetY)

    // 10. Generate setback lines
    const existingSetback = generateSetbackLines(entities, existingModel, contextIds, ownerHistory, existingStoreyId, 'Existing Setbacks', existingOffsetX, existingOffsetY)
    const proposedSetback = generateSetbackLines(entities, proposedModel, contextIds, ownerHistory, proposedStoreyId, 'Proposed Setbacks', proposedOffsetX, proposedOffsetY)

    // 11. Generate building masses
    const existingMass = generateBuildingMass(entities, existingModel, contextIds, ownerHistory, existingStoreyId, 'Existing Mass', existingOffsetX, existingOffsetY)
    const proposedMass = generateBuildingMass(entities, proposedModel, contextIds, ownerHistory, proposedStoreyId, 'Proposed Mass', proposedOffsetX, proposedOffsetY)

    // 12. Contain all elements in storeys
    generateContainment(entities, ownerHistory, existingStoreyId, [existingLot.elementId, existingSetback.elementId, existingMass.elementId])
    generateContainment(entities, ownerHistory, proposedStoreyId, [proposedLot.elementId, proposedSetback.elementId, proposedMass.elementId])

    // 13. Create layer assignments (matching app layer names)
    generateLayerAssignment(entities, 'Lot Lines', [existingLot.shapeRepId, proposedLot.shapeRepId])
    generateLayerAssignment(entities, 'Setback Lines', [existingSetback.shapeRepId, proposedSetback.shapeRepId])
    generateLayerAssignment(entities, 'Buildings', [existingMass.shapeRepId, proposedMass.shapeRepId])

    // Assemble file
    const header = generateHeader(options.filename || 'zoning-model.ifc')
    const body = entities.join('\n')
    const footer = generateFooter()

    return header + body + '\n' + footer
}

/**
 * Compute total building height from story-based parameters
 * @param {Object} building - Building sub-object with firstFloorHeight, upperFloorHeight, stories
 * @returns {number} - Total building height
 */
const computeBuildingHeight = (building) => {
    const stories = building.stories || 1
    const firstFloor = building.firstFloorHeight || 12
    const upperFloor = building.upperFloorHeight || 10
    if (stories <= 1) return firstFloor
    return firstFloor + (stories - 1) * upperFloor
}

/**
 * Create a temporary model object compatible with existing helper functions
 * from an entity lot's building sub-object (principal or accessory)
 * @param {Object} building - buildings.principal or buildings.accessory from entity lot
 * @returns {Object} - Model with buildingWidth, buildingDepth, buildingHeight, buildingX, buildingY
 */
const buildingToModel = (building) => ({
    buildingWidth: building.width,
    buildingDepth: building.depth,
    buildingHeight: computeBuildingHeight(building),
    buildingX: building.x || 0,
    buildingY: building.y || 0,
})

/**
 * Create a temporary model object compatible with getLotVertices and setback helpers
 * from an entity lot object
 * @param {Object} lot - Entity lot object
 * @param {string} buildingType - 'principal' or 'accessory'
 * @returns {Object} - Model with lotWidth, lotDepth, setbackFront, etc., and lotGeometry
 */
const lotToModel = (lot, buildingType = 'principal') => {
    const setbacks = lot.setbacks?.[buildingType] || lot.setbacks?.principal || {}
    return {
        lotWidth: lot.lotWidth,
        lotDepth: lot.lotDepth,
        setbackFront: setbacks.front || 0,
        setbackRear: setbacks.rear || 0,
        setbackSideLeft: setbacks.sideInterior || 0,
        setbackSideRight: setbacks.sideStreet || setbacks.sideInterior || 0,
        lotGeometry: lot.lotGeometry,
    }
}

/**
 * Generate IFC for the district module (multiple lots)
 * @param {Object} lotsMap - The entities.lots object from store
 * @param {string[]} entityOrder - Array of lot IDs in display order
 * @param {Object} options - { filename, lotSpacing }
 * @returns {string} - Complete IFC-SPF file content
 */
export const generateDistrictIFC = (lotsMap, entityOrder, options = {}) => {
    // Reset entity counter
    entityId = 0
    const entities = []
    const lotSpacing = options.lotSpacing || 10

    // 1. Generate shared context
    const contextIds = generateContext(entities)

    // 2. Generate project
    const { projectId, ownerHistory } = generateProject(entities, contextIds)

    // 3. Iterate lots and generate spatial hierarchy for each
    const siteIds = []
    const lotShapeRepIds = []        // For 'Lot Lines' layer
    const setbackShapeRepIds = []    // For 'Setback Lines' layer
    const buildingShapeRepIds = []   // For 'Buildings' layer
    const accessoryShapeRepIds = []  // For 'Accessory Buildings' layer

    // Calculate X offsets: Lot 1 extends in positive X from origin,
    // Lots 2+ extend in negative X from origin
    let negOffset = 0

    entityOrder.forEach((lotId, index) => {
        const lot = lotsMap[lotId]
        if (!lot) return

        let lotCenterX
        if (index === 0) {
            // Lot 1: front-left at origin, extends positive X
            lotCenterX = lot.lotWidth / 2
        } else {
            // Lots 2+: extend in negative X
            negOffset -= lot.lotWidth
            lotCenterX = negOffset + lot.lotWidth / 2
        }
        const lotCenterY = lot.lotDepth / 2
        const lotLabel = `Lot ${index + 1}`

        // Create a model-compatible object for lot helpers
        const lotModel = lotToModel(lot, 'principal')

        // Generate site for this lot
        const siteId = generateSite(entities, lotModel, contextIds, ownerHistory, lotLabel, lotCenterX, lotCenterY)
        siteIds.push(siteId)

        // Generate building container
        const buildingId = generateBuilding(entities, contextIds, ownerHistory, siteId, `${lotLabel} Building`)
        generateAggregation(entities, ownerHistory, siteId, [buildingId])

        // Generate storey
        const storeyId = generateStorey(entities, contextIds, ownerHistory, buildingId)
        generateAggregation(entities, ownerHistory, buildingId, [storeyId])

        // Generate lot surface
        const lotSurface = generateLotSurface(entities, lotModel, contextIds, ownerHistory, storeyId, `${lotLabel} Surface`, lotCenterX, lotCenterY)
        lotShapeRepIds.push(lotSurface.shapeRepId)

        // Generate setback lines
        const setbackLines = generateSetbackLines(entities, lotModel, contextIds, ownerHistory, storeyId, `${lotLabel} Setbacks`, lotCenterX, lotCenterY)
        setbackShapeRepIds.push(setbackLines.shapeRepId)

        // Collect all elements for containment
        const containedElements = [lotSurface.elementId, setbackLines.elementId]

        // Generate principal building mass
        const principal = lot.buildings?.principal
        if (principal && principal.width > 0 && principal.depth > 0) {
            const principalModel = buildingToModel(principal)
            const principalMass = generateBuildingMass(entities, principalModel, contextIds, ownerHistory, storeyId, `${lotLabel} Principal`, lotCenterX, lotCenterY)
            buildingShapeRepIds.push(principalMass.shapeRepId)
            containedElements.push(principalMass.elementId)
        }

        // Generate accessory building mass
        const accessory = lot.buildings?.accessory
        if (accessory && accessory.width > 0 && accessory.depth > 0) {
            const accessoryModel = buildingToModel(accessory)
            const accessoryMass = generateBuildingMass(entities, accessoryModel, contextIds, ownerHistory, storeyId, `${lotLabel} Accessory`, lotCenterX, lotCenterY)
            accessoryShapeRepIds.push(accessoryMass.shapeRepId)
            containedElements.push(accessoryMass.elementId)
        }

        // Contain all elements in storey
        generateContainment(entities, ownerHistory, storeyId, containedElements)

        // Advance spacing for lots 2+ (negative direction)
        if (index > 0) negOffset -= lotSpacing
    })

    // 4. Aggregate all sites to project
    if (siteIds.length > 0) {
        generateAggregation(entities, ownerHistory, projectId, siteIds)
    }

    // 5. Create layer assignments
    generateLayerAssignment(entities, 'Lot Lines', lotShapeRepIds)
    generateLayerAssignment(entities, 'Setback Lines', setbackShapeRepIds)
    generateLayerAssignment(entities, 'Buildings', buildingShapeRepIds)
    generateLayerAssignment(entities, 'Accessory Buildings', accessoryShapeRepIds)

    // Assemble file
    const header = generateHeader(options.filename || 'zoning-district.ifc')
    const body = entities.join('\n')
    const footer = generateFooter()

    return header + body + '\n' + footer
}

export default generateIFC
