/**
 * CSV Import Parser for Zoning Comparison App
 *
 * Pure CSV parsing utilities with field mapping for the entity lot system.
 * No external dependencies required.
 */

/**
 * Available app fields for mapping CSV columns to lot parameters.
 * Each field has a key (matching the store's lot data structure),
 * a human-readable label, and a group for UI organization.
 */
export const APP_FIELDS = [
  { key: 'lotWidth', label: 'Lot Width', group: 'Lot Dimensions' },
  { key: 'lotDepth', label: 'Lot Depth', group: 'Lot Dimensions' },
  { key: 'setbackFront', label: 'Front Setback', group: 'Setbacks' },
  { key: 'setbackRear', label: 'Rear Setback', group: 'Setbacks' },
  { key: 'setbackSideLeft', label: 'Side Left Setback', group: 'Setbacks' },
  { key: 'setbackSideRight', label: 'Side Right Setback', group: 'Setbacks' },
  { key: 'buildingWidth', label: 'Building Width', group: 'Building' },
  { key: 'buildingDepth', label: 'Building Depth', group: 'Building' },
  { key: 'buildingHeight', label: 'Building Height', group: 'Building' },
  { key: 'buildingStories', label: 'Stories', group: 'Building' },
  { key: 'firstFloorHeight', label: 'First Floor Height', group: 'Building' },
  { key: 'upperFloorHeight', label: 'Upper Floor Height', group: 'Building' },
  { key: 'maxHeight', label: 'Max Height', group: 'Building' },
  { key: 'accessoryWidth', label: 'Accessory Width', group: 'Accessory' },
  { key: 'accessoryDepth', label: 'Accessory Depth', group: 'Accessory' },
  { key: 'accessoryMaxHeight', label: 'Accessory Max Height', group: 'Accessory' },
]

/**
 * Available district parameter fields for CSV import.
 * Each field maps to a dot-path in the districtParameters store object.
 */
export const DISTRICT_FIELDS = [
  // Meta (scenario identity — not stored in districtParameters)
  { key: '_districtName', label: 'District Name', group: 'Meta' },
  { key: '_districtCode', label: 'District Code', group: 'Meta' },

  // Lot Dimensions
  { key: 'lotArea.min', label: 'Min Lot Area', group: 'Lot Dimensions' },
  { key: 'lotArea.max', label: 'Max Lot Area', group: 'Lot Dimensions' },
  { key: 'lotCoverage.min', label: 'Min Lot Coverage', group: 'Lot Dimensions' },
  { key: 'lotCoverage.max', label: 'Max Lot Coverage', group: 'Lot Dimensions' },
  { key: 'lotWidth.min', label: 'Min Lot Width', group: 'Lot Dimensions' },
  { key: 'lotWidth.max', label: 'Max Lot Width', group: 'Lot Dimensions' },
  { key: 'lotWidthAtSetback.min', label: 'Min Width at Setback', group: 'Lot Dimensions' },
  { key: 'lotWidthAtSetback.max', label: 'Max Width at Setback', group: 'Lot Dimensions' },
  { key: 'lotDepth.min', label: 'Min Lot Depth', group: 'Lot Dimensions' },
  { key: 'lotDepth.max', label: 'Max Lot Depth', group: 'Lot Dimensions' },
  { key: 'widthToDepthRatio.min', label: 'Min W:D Ratio', group: 'Lot Dimensions' },
  { key: 'widthToDepthRatio.max', label: 'Max W:D Ratio', group: 'Lot Dimensions' },
  { key: 'maxImperviousSurface.min', label: 'Min Impervious Surface', group: 'Lot Dimensions' },
  { key: 'maxImperviousSurface.max', label: 'Max Impervious Surface', group: 'Lot Dimensions' },

  // Setbacks - Principal
  { key: 'setbacksPrincipal.front.min', label: 'Min Front Setback', group: 'Setbacks Principal' },
  { key: 'setbacksPrincipal.front.max', label: 'Max Front Setback', group: 'Setbacks Principal' },
  { key: 'setbacksPrincipal.btzFront', label: 'BTZ Front (%)', group: 'Setbacks Principal' },
  { key: 'setbacksPrincipal.rear.min', label: 'Min Rear Setback', group: 'Setbacks Principal' },
  { key: 'setbacksPrincipal.rear.max', label: 'Max Rear Setback', group: 'Setbacks Principal' },
  { key: 'setbacksPrincipal.sideInterior.min', label: 'Min Side Interior Setback', group: 'Setbacks Principal' },
  { key: 'setbacksPrincipal.sideInterior.max', label: 'Max Side Interior Setback', group: 'Setbacks Principal' },
  { key: 'setbacksPrincipal.sideStreet.min', label: 'Min Side Street Setback', group: 'Setbacks Principal' },
  { key: 'setbacksPrincipal.sideStreet.max', label: 'Max Side Street Setback', group: 'Setbacks Principal' },
  { key: 'setbacksPrincipal.btzSideStreet', label: 'BTZ Side Street (%)', group: 'Setbacks Principal' },
  { key: 'setbacksPrincipal.distanceBetweenBuildings.min', label: 'Min Dist Between Buildings', group: 'Setbacks Principal' },
  { key: 'setbacksPrincipal.distanceBetweenBuildings.max', label: 'Max Dist Between Buildings', group: 'Setbacks Principal' },

  // Setbacks - Accessory
  { key: 'setbacksAccessory.front.min', label: 'Acc Min Front Setback', group: 'Setbacks Accessory' },
  { key: 'setbacksAccessory.front.max', label: 'Acc Max Front Setback', group: 'Setbacks Accessory' },
  { key: 'setbacksAccessory.rear.min', label: 'Acc Min Rear Setback', group: 'Setbacks Accessory' },
  { key: 'setbacksAccessory.rear.max', label: 'Acc Max Rear Setback', group: 'Setbacks Accessory' },
  { key: 'setbacksAccessory.sideInterior.min', label: 'Acc Min Side Interior', group: 'Setbacks Accessory' },
  { key: 'setbacksAccessory.sideInterior.max', label: 'Acc Max Side Interior', group: 'Setbacks Accessory' },
  { key: 'setbacksAccessory.sideStreet.min', label: 'Acc Min Side Street', group: 'Setbacks Accessory' },
  { key: 'setbacksAccessory.sideStreet.max', label: 'Acc Max Side Street', group: 'Setbacks Accessory' },
  { key: 'setbacksAccessory.btzFront', label: 'Acc BTZ Front (%)', group: 'Setbacks Accessory' },
  { key: 'setbacksAccessory.btzSideStreet', label: 'Acc BTZ Side Street (%)', group: 'Setbacks Accessory' },
  { key: 'setbacksAccessory.distanceBetweenBuildings.min', label: 'Acc Min Dist Between Bldgs', group: 'Setbacks Accessory' },
  { key: 'setbacksAccessory.distanceBetweenBuildings.max', label: 'Acc Max Dist Between Bldgs', group: 'Setbacks Accessory' },

  // Structures - Principal
  { key: 'structures.principal.height.min', label: 'Min Height', group: 'Structures Principal' },
  { key: 'structures.principal.height.max', label: 'Max Height', group: 'Structures Principal' },
  { key: 'structures.principal.stories.min', label: 'Min Stories', group: 'Structures Principal' },
  { key: 'structures.principal.stories.max', label: 'Max Stories', group: 'Structures Principal' },
  { key: 'structures.principal.firstStoryHeight.min', label: 'Min 1st Story Height', group: 'Structures Principal' },
  { key: 'structures.principal.firstStoryHeight.max', label: 'Max 1st Story Height', group: 'Structures Principal' },
  { key: 'structures.principal.upperStoryHeight.min', label: 'Min Upper Story Height', group: 'Structures Principal' },
  { key: 'structures.principal.upperStoryHeight.max', label: 'Max Upper Story Height', group: 'Structures Principal' },

  // Structures - Accessory
  { key: 'structures.accessory.height.min', label: 'Acc Min Height', group: 'Structures Accessory' },
  { key: 'structures.accessory.height.max', label: 'Acc Max Height', group: 'Structures Accessory' },
  { key: 'structures.accessory.stories.min', label: 'Acc Min Stories', group: 'Structures Accessory' },
  { key: 'structures.accessory.stories.max', label: 'Acc Max Stories', group: 'Structures Accessory' },
  { key: 'structures.accessory.firstStoryHeight.min', label: 'Acc Min 1st Story Height', group: 'Structures Accessory' },
  { key: 'structures.accessory.firstStoryHeight.max', label: 'Acc Max 1st Story Height', group: 'Structures Accessory' },
  { key: 'structures.accessory.upperStoryHeight.min', label: 'Acc Min Upper Story Height', group: 'Structures Accessory' },
  { key: 'structures.accessory.upperStoryHeight.max', label: 'Acc Max Upper Story Height', group: 'Structures Accessory' },

  // Lot Access
  { key: 'lotAccess.primaryStreet.permitted', label: 'Primary Street Permitted', group: 'Lot Access' },
  { key: 'lotAccess.primaryStreet.min', label: 'Min Primary Street Access', group: 'Lot Access' },
  { key: 'lotAccess.primaryStreet.max', label: 'Max Primary Street Access', group: 'Lot Access' },
  { key: 'lotAccess.secondaryStreet.permitted', label: 'Secondary Street Permitted', group: 'Lot Access' },
  { key: 'lotAccess.secondaryStreet.min', label: 'Min Secondary Street Access', group: 'Lot Access' },
  { key: 'lotAccess.secondaryStreet.max', label: 'Max Secondary Street Access', group: 'Lot Access' },
  { key: 'lotAccess.rearAlley.permitted', label: 'Rear Alley Permitted', group: 'Lot Access' },
  { key: 'lotAccess.rearAlley.min', label: 'Min Rear Alley Access', group: 'Lot Access' },
  { key: 'lotAccess.rearAlley.max', label: 'Max Rear Alley Access', group: 'Lot Access' },
  { key: 'lotAccess.sharedDrive.permitted', label: 'Shared Drive Permitted', group: 'Lot Access' },
  { key: 'lotAccess.sharedDrive.min', label: 'Min Shared Drive Access', group: 'Lot Access' },
  { key: 'lotAccess.sharedDrive.max', label: 'Max Shared Drive Access', group: 'Lot Access' },

  // Parking Locations
  { key: 'parkingLocations.front.permitted', label: 'Front Parking Permitted', group: 'Parking' },
  { key: 'parkingLocations.front.min', label: 'Min Front Parking', group: 'Parking' },
  { key: 'parkingLocations.front.max', label: 'Max Front Parking', group: 'Parking' },
  { key: 'parkingLocations.sideInterior.permitted', label: 'Side Int Parking Permitted', group: 'Parking' },
  { key: 'parkingLocations.sideInterior.min', label: 'Min Side Int Parking', group: 'Parking' },
  { key: 'parkingLocations.sideInterior.max', label: 'Max Side Int Parking', group: 'Parking' },
  { key: 'parkingLocations.sideStreet.permitted', label: 'Side St Parking Permitted', group: 'Parking' },
  { key: 'parkingLocations.sideStreet.min', label: 'Min Side St Parking', group: 'Parking' },
  { key: 'parkingLocations.sideStreet.max', label: 'Max Side St Parking', group: 'Parking' },
  { key: 'parkingLocations.rear.permitted', label: 'Rear Parking Permitted', group: 'Parking' },
  { key: 'parkingLocations.rear.min', label: 'Min Rear Parking', group: 'Parking' },
  { key: 'parkingLocations.rear.max', label: 'Max Rear Parking', group: 'Parking' },
]

/**
 * Parse CSV text into headers and rows.
 * Handles quoted fields (fields containing commas), mixed line endings,
 * trims whitespace, and skips empty rows.
 *
 * @param {string} csvText - Raw CSV content
 * @returns {{ headers: string[], rows: string[][] }}
 */
export function parseCSV(csvText) {
  if (!csvText || typeof csvText !== 'string') {
    return { headers: [], rows: [] }
  }

  // Normalize line endings to \n
  const normalized = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  const lines = parseCSVLines(normalized)

  // Filter out empty lines
  const nonEmptyLines = lines.filter(fields =>
    fields.some(field => field.trim() !== '')
  )

  if (nonEmptyLines.length === 0) {
    return { headers: [], rows: [] }
  }

  const headers = nonEmptyLines[0].map(h => h.trim())
  const rows = nonEmptyLines.slice(1).map(row =>
    row.map(cell => cell.trim())
  )

  return { headers, rows }
}

/**
 * Parse CSV text into an array of field arrays, respecting quoted fields.
 * A quoted field may contain commas, newlines, and escaped quotes ("").
 *
 * @param {string} text - Normalized CSV text (only \n line endings)
 * @returns {string[][]}
 */
function parseCSVLines(text) {
  const results = []
  let current = []
  let field = ''
  let inQuotes = false
  let i = 0

  while (i < text.length) {
    const char = text[i]

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote ("")
        if (i + 1 < text.length && text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        // End of quoted field
        inQuotes = false
        i++
        continue
      }
      // Character inside quotes (including commas and newlines)
      field += char
      i++
    } else {
      if (char === '"' && field === '') {
        // Start of quoted field
        inQuotes = true
        i++
      } else if (char === ',') {
        // Field separator
        current.push(field)
        field = ''
        i++
      } else if (char === '\n') {
        // End of row
        current.push(field)
        results.push(current)
        current = []
        field = ''
        i++
      } else {
        field += char
        i++
      }
    }
  }

  // Handle last field/row (file may not end with newline)
  if (field !== '' || current.length > 0) {
    current.push(field)
    results.push(current)
  }

  return results
}

/**
 * Normalize a string for fuzzy matching: lowercase, strip underscores/hyphens/spaces,
 * and collapse into a single token.
 *
 * @param {string} str
 * @returns {string}
 */
function normalize(str) {
  return str.toLowerCase().replace(/[_\-\s]+/g, '')
}

/**
 * Known aliases for each app field key, used for fuzzy auto-matching.
 * Each entry maps an app field key to an array of normalized alternative forms
 * that CSV headers might use.
 */
const FIELD_ALIASES = {
  lotWidth: ['lotwidth', 'lot_width', 'lotw', 'width'],
  lotDepth: ['lotdepth', 'lot_depth', 'lotd', 'depth'],
  setbackFront: ['setbackfront', 'frontsetback', 'front', 'setback_front', 'front_setback'],
  setbackRear: ['setbackrear', 'rearsetback', 'rear', 'setback_rear', 'rear_setback'],
  setbackSideLeft: ['setbacksideleft', 'sideleftsetback', 'leftsetback', 'setback_side_left', 'left_setback', 'sideleft'],
  setbackSideRight: ['setbacksideright', 'siderightsetback', 'rightsetback', 'setback_side_right', 'right_setback', 'sideright'],
  buildingWidth: ['buildingwidth', 'building_width', 'bldgwidth', 'bldg_width'],
  buildingDepth: ['buildingdepth', 'building_depth', 'bldgdepth', 'bldg_depth'],
  buildingHeight: ['buildingheight', 'building_height', 'bldgheight', 'bldg_height', 'height'],
  buildingStories: ['buildingstories', 'building_stories', 'stories', 'numstories', 'num_stories', 'floors', 'numfloors'],
  firstFloorHeight: ['firstfloorheight', 'first_floor_height', 'firstfloor', 'groundfloorheight', 'ground_floor_height'],
  upperFloorHeight: ['upperfloorheight', 'upper_floor_height', 'upperfloor', 'typicalfloorheight', 'typical_floor_height'],
  maxHeight: ['maxheight', 'max_height', 'maximumheight', 'maximum_height', 'heightlimit', 'height_limit'],
  accessoryWidth: ['accessorywidth', 'accessory_width', 'accwidth', 'acc_width', 'aduwidth', 'adu_width'],
  accessoryDepth: ['accessorydepth', 'accessory_depth', 'accdepth', 'acc_depth', 'adudepth', 'adu_depth'],
  accessoryMaxHeight: ['accessorymaxheight', 'accessory_max_height', 'accmaxheight', 'acc_max_height', 'accessoryheight', 'accessory_height', 'adumaxheight'],
}

/**
 * Auto-match CSV headers to app fields using case-insensitive fuzzy matching.
 * Tries exact normalized match first, then falls back to alias matching.
 * Each app field is only matched once (first match wins).
 *
 * @param {string[]} csvHeaders - Array of CSV column header strings
 * @param {Array} fields - Optional field list to match against (defaults to APP_FIELDS)
 * @returns {{ [csvHeader: string]: string|null }} - Mapping of CSV header -> app field key or null
 */
export function autoMatchHeaders(csvHeaders, fields = APP_FIELDS) {
  const mapping = {}
  const usedFields = new Set()

  for (const header of csvHeaders) {
    mapping[header] = null
  }

  // Pass 1: Try exact normalized match against field keys and labels
  for (const header of csvHeaders) {
    if (mapping[header] !== null) continue
    const normalizedHeader = normalize(header)

    for (const field of fields) {
      if (usedFields.has(field.key)) continue

      // Check against normalized field key
      if (normalizedHeader === normalize(field.key)) {
        mapping[header] = field.key
        usedFields.add(field.key)
        break
      }

      // Check against normalized label
      if (normalizedHeader === normalize(field.label)) {
        mapping[header] = field.key
        usedFields.add(field.key)
        break
      }
    }
  }

  // Pass 2: Try alias matching for remaining unmatched headers (lot fields only)
  if (fields === APP_FIELDS) {
    for (const header of csvHeaders) {
      if (mapping[header] !== null) continue
      const normalizedHeader = normalize(header)

      for (const field of fields) {
        if (usedFields.has(field.key)) continue

        const aliases = FIELD_ALIASES[field.key] || []
        const normalizedAliases = aliases.map(normalize)

        if (normalizedAliases.includes(normalizedHeader)) {
          mapping[header] = field.key
          usedFields.add(field.key)
          break
        }
      }
    }
  }

  return mapping
}

/**
 * Apply a column-index-based field mapping to parsed CSV rows,
 * producing an array of lot data objects ready for store import.
 *
 * Each returned object uses the entity lot system's structure:
 * - lotWidth, lotDepth are top-level
 * - setbacks go under setbacks.principal (front, rear, sideInterior)
 * - building params go under buildings.principal (width, depth, stories, etc.)
 * - accessory params go under buildings.accessory
 * - maxHeight goes under buildings.principal.maxHeight
 *
 * @param {string[][]} rows - CSV data rows (parsed, trimmed)
 * @param {{ [csvHeaderIndex: number]: string }} mapping - Column index -> app field key
 * @returns {Object[]} - Array of lot data objects ready for the entity store
 */
export function applyMapping(rows, mapping) {
  const results = []

  for (const row of rows) {
    // Skip rows that are entirely empty
    if (row.every(cell => cell === '')) continue

    const lotData = {}

    for (const [indexStr, fieldKey] of Object.entries(mapping)) {
      const index = parseInt(indexStr, 10)
      if (fieldKey === null || fieldKey === 'skip') continue
      if (index < 0 || index >= row.length) continue

      const rawValue = row[index]
      if (rawValue === '' || rawValue === undefined) continue

      const numValue = parseFloat(rawValue)
      if (isNaN(numValue)) continue

      // Route values to the correct location in the lot data structure
      applyFieldToLotData(lotData, fieldKey, numValue)
    }

    // Only include rows that have at least one mapped value
    if (Object.keys(lotData).length > 0) {
      results.push(lotData)
    }
  }

  return results
}

/**
 * Apply column-index-based mapping to a single CSV row for district parameters.
 * Returns a flat object of { 'dot.path': value } pairs ready for setDistrictParameter().
 *
 * For 'permitted' fields, interprets truthy string values as boolean.
 * For all other fields, parses as float.
 *
 * @param {string[]} row - Single CSV data row
 * @param {{ [colIndex: number]: string }} mapping - Column index -> district field key
 * @returns {{ [dotPath: string]: number|boolean }}
 */
export function applyDistrictMapping(row, mapping) {
  const result = {}

  for (const [indexStr, fieldKey] of Object.entries(mapping)) {
    const index = parseInt(indexStr, 10)
    if (fieldKey === null || fieldKey === 'skip') continue
    if (index < 0 || index >= row.length) continue

    const rawValue = row[index]
    if (rawValue === '' || rawValue === undefined) continue

    if (fieldKey.startsWith('_')) {
      // String meta field (e.g. _districtName, _districtCode)
      result[fieldKey] = rawValue
    } else if (fieldKey.endsWith('.permitted')) {
      const lower = rawValue.toLowerCase().trim()
      result[fieldKey] = ['true', 'yes', '1', 'y', 'permitted'].includes(lower)
    } else {
      const numValue = parseFloat(rawValue)
      if (!isNaN(numValue)) {
        result[fieldKey] = numValue
      }
    }
  }

  return result
}

/**
 * Route a parsed field value into the correct nested location
 * within a lot data object (matching the createDefaultLot structure).
 *
 * @param {Object} lotData - The lot data object being built
 * @param {string} fieldKey - The APP_FIELDS key
 * @param {number} value - The parsed numeric value
 */
function applyFieldToLotData(lotData, fieldKey, value) {
  switch (fieldKey) {
    // Top-level lot dimensions
    case 'lotWidth':
    case 'lotDepth':
      lotData[fieldKey] = value
      break

    // Setbacks -> setbacks.principal
    case 'setbackFront':
      if (!lotData.setbacks) lotData.setbacks = {}
      if (!lotData.setbacks.principal) lotData.setbacks.principal = {}
      lotData.setbacks.principal.front = value
      break
    case 'setbackRear':
      if (!lotData.setbacks) lotData.setbacks = {}
      if (!lotData.setbacks.principal) lotData.setbacks.principal = {}
      lotData.setbacks.principal.rear = value
      break
    case 'setbackSideLeft':
      if (!lotData.setbacks) lotData.setbacks = {}
      if (!lotData.setbacks.principal) lotData.setbacks.principal = {}
      lotData.setbacks.principal.sideInterior = value
      break
    case 'setbackSideRight':
      if (!lotData.setbacks) lotData.setbacks = {}
      if (!lotData.setbacks.principal) lotData.setbacks.principal = {}
      // Side right maps to sideStreet minimum in the entity model
      // but since the entity model uses min/max for side street, we store as interior
      // For simplicity, we use a second sideInterior-like field
      // The entity lot uses sideInterior for interior side setback
      // sideStreet uses minSideStreet/maxSideStreet
      lotData.setbacks.principal.minSideStreet = value
      break

    // Building dimensions -> buildings.principal
    case 'buildingWidth':
      if (!lotData.buildings) lotData.buildings = {}
      if (!lotData.buildings.principal) lotData.buildings.principal = {}
      lotData.buildings.principal.width = value
      break
    case 'buildingDepth':
      if (!lotData.buildings) lotData.buildings = {}
      if (!lotData.buildings.principal) lotData.buildings.principal = {}
      lotData.buildings.principal.depth = value
      break
    case 'buildingHeight':
    case 'maxHeight':
      if (!lotData.buildings) lotData.buildings = {}
      if (!lotData.buildings.principal) lotData.buildings.principal = {}
      lotData.buildings.principal.maxHeight = value
      break
    case 'buildingStories':
      if (!lotData.buildings) lotData.buildings = {}
      if (!lotData.buildings.principal) lotData.buildings.principal = {}
      lotData.buildings.principal.stories = value
      break
    case 'firstFloorHeight':
      if (!lotData.buildings) lotData.buildings = {}
      if (!lotData.buildings.principal) lotData.buildings.principal = {}
      lotData.buildings.principal.firstFloorHeight = value
      break
    case 'upperFloorHeight':
      if (!lotData.buildings) lotData.buildings = {}
      if (!lotData.buildings.principal) lotData.buildings.principal = {}
      lotData.buildings.principal.upperFloorHeight = value
      break

    // Accessory building -> buildings.accessory
    case 'accessoryWidth':
      if (!lotData.buildings) lotData.buildings = {}
      if (!lotData.buildings.accessory) lotData.buildings.accessory = {}
      lotData.buildings.accessory.width = value
      break
    case 'accessoryDepth':
      if (!lotData.buildings) lotData.buildings = {}
      if (!lotData.buildings.accessory) lotData.buildings.accessory = {}
      lotData.buildings.accessory.depth = value
      break
    case 'accessoryMaxHeight':
      if (!lotData.buildings) lotData.buildings = {}
      if (!lotData.buildings.accessory) lotData.buildings.accessory = {}
      lotData.buildings.accessory.maxHeight = value
      break
  }
}

/**
 * Parse all rows of a district CSV into an array of scenario objects,
 * one per row. Each scenario has a name, code, and districtParameters map.
 *
 * Meta fields (_districtName, _districtCode) are extracted from the mapped
 * values and used as the scenario identity, then removed from districtParameters.
 *
 * @param {string[][]} rows - CSV data rows (parsed, trimmed)
 * @param {{ [colIndex: number]: string }} mapping - Column index -> district field key
 * @returns {Array<{ name: string, code: string, districtParameters: Object }>}
 */
export function parseAllDistrictRows(rows, mapping) {
  const results = []

  rows.forEach((row, i) => {
    // Skip entirely empty rows
    if (row.every(cell => cell === '')) return

    const mapped = applyDistrictMapping(row, mapping)

    // Extract meta fields
    const name = (mapped._districtName || '').trim() || `District ${i + 1}`
    const code = (mapped._districtCode || '').trim()

    // Build districtParameters (dot-path object) without meta keys
    const districtParameters = {}
    for (const [key, value] of Object.entries(mapped)) {
      if (!key.startsWith('_')) {
        districtParameters[key] = value
      }
    }

    if (Object.keys(districtParameters).length > 0) {
      results.push({ name, code, districtParameters })
    }
  })

  return results
}

// ============================================
// XLSX Support
// ============================================

/**
 * Parse an XLSX/XLS file buffer into the same { headers, rows } format as parseCSV.
 * Uses dynamic import to keep xlsx-js-style out of the main bundle.
 *
 * @param {ArrayBuffer} arrayBuffer - File contents as ArrayBuffer
 * @returns {Promise<{ headers: string[], rows: string[][] }>}
 */
export async function parseXLSXToCSV(arrayBuffer) {
  const XLSX = await import('xlsx-js-style')
  const wb = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  if (!ws) return { headers: [], rows: [] }

  // Convert to array-of-arrays, all values as strings
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  if (aoa.length === 0) return { headers: [], rows: [] }

  // Filter out entirely empty rows
  const nonEmpty = aoa.filter(row => row.some(cell => String(cell ?? '').trim() !== ''))
  if (nonEmpty.length === 0) return { headers: [], rows: [] }

  const headers = nonEmpty[0].map(h => String(h ?? '').trim())
  const rows = nonEmpty.slice(1).map(row =>
    row.map(cell => String(cell ?? '').trim())
  )

  return { headers, rows }
}

// ============================================
// Transposed CSV Support
// ============================================

/**
 * Row label → field path mapping for transposed CSVs.
 * Organized by section header (ALL-CAPS row in col A).
 *
 * Field type defaults to 'minMax' (min col → path.min, max col → path.max).
 * Override with { path, type } for special handling:
 *  - 'single': use min col value only → path (no .min/.max)
 *  - 'boolean': Y/N → boolean, min col only → path
 *  - 'accessMinMax': min/max + auto-set permitted=true when any value present
 */
export const TRANSPOSED_ROW_MAP = {
  'LOT DIMENSIONS': {
    'Lot Area': 'lotArea',
    'Lot Coverage': 'lotCoverage',
    'Lot Width': 'lotWidth',
    'Lot Width at Setback': 'lotWidthAtSetback',
    'Lot Depth': 'lotDepth',
    'Width to Depth Ratio (%)': 'widthToDepthRatio',
    'Max. Impervious Surface (%)': 'maxImperviousSurface',
  },
  'SETBACKS — PRINCIPAL STRUCTURE': {
    'Front': 'setbacksPrincipal.front',
    'Rear': 'setbacksPrincipal.rear',
    'Side Interior': 'setbacksPrincipal.sideInterior',
    'Side Street': 'setbacksPrincipal.sideStreet',
    'Dist. Between Buildings': 'setbacksPrincipal.distanceBetweenBuildings',
  },
  'SETBACKS — ACCESSORY STRUCTURE': {
    'Front': 'setbacksAccessory.front',
    'Rear': 'setbacksAccessory.rear',
    'Side Interior': 'setbacksAccessory.sideInterior',
    'Side Street': 'setbacksAccessory.sideStreet',
    'Dist. Between Buildings': 'setbacksAccessory.distanceBetweenBuildings',
  },
  'STRUCTURE DIMENSIONS — PRINCIPAL': {
    'Height (max)': 'structures.principal.height',
    'Stories (max)': 'structures.principal.stories',
    'First Story Height (min)': 'structures.principal.firstStoryHeight',
    'Upper Story Height': 'structures.principal.upperStoryHeight',
  },
  'STRUCTURE DIMENSIONS — ACCESSORY': {
    'Height (max)': 'structures.accessory.height',
    'Stories (max)': 'structures.accessory.stories',
    'First Story Height (min)': 'structures.accessory.firstStoryHeight',
    'Upper Story Height': 'structures.accessory.upperStoryHeight',
  },
  'BUILD-TO ZONE — PRINCIPAL': {
    'Front (%)': { path: 'setbacksPrincipal.btzFront', type: 'single' },
    'Side Street (%)': { path: 'setbacksPrincipal.btzSideStreet', type: 'single' },
  },
  'BUILD-TO ZONE — ACCESSORY': {
    'Front (%)': { path: 'setbacksAccessory.btzFront', type: 'single' },
    'Side Street (%)': { path: 'setbacksAccessory.btzSideStreet', type: 'single' },
  },
  'LOT ACCESS': {
    'Primary Street (Front Street)': { path: 'lotAccess.primaryStreet', type: 'accessMinMax' },
    'Secondary Street (Side Streets)': { path: 'lotAccess.secondaryStreet', type: 'accessMinMax' },
    'Rear Alley': { path: 'lotAccess.rearAlley', type: 'accessMinMax' },
    'Shared Drive': { path: 'lotAccess.sharedDrive', type: 'accessMinMax' },
  },
  'PARKING LOCATIONS': {
    'Front': { path: 'parkingLocations.front.permitted', type: 'boolean' },
    'Side Interior': { path: 'parkingLocations.sideInterior.permitted', type: 'boolean' },
    'Side Street': { path: 'parkingLocations.sideStreet.permitted', type: 'boolean' },
    'Rear': { path: 'parkingLocations.rear.permitted', type: 'boolean' },
  },
  'PARKING SETBACKS': {
    'Front': { path: 'parkingLocations.front.min', type: 'single' },
    'Side Interior': { path: 'parkingLocations.sideInterior.min', type: 'single' },
    'Side Street': { path: 'parkingLocations.sideStreet.min', type: 'single' },
    'Rear': { path: 'parkingLocations.rear.min', type: 'single' },
  },
}

/**
 * Parse a raw transposed cell value into a typed value.
 * @param {string} rawValue
 * @returns {number|boolean|null}
 */
function parseTransposedValue(rawValue) {
  if (rawValue == null) return null
  const trimmed = rawValue.trim()
  if (trimmed === '' || trimmed.toLowerCase() === 'no minimum' || trimmed.toLowerCase() === 'n/a') return null
  if (trimmed === 'Y' || trimmed === 'y') return true
  if (trimmed === 'N' || trimmed === 'n') return false
  // Strip % suffix
  const stripped = trimmed.endsWith('%') ? trimmed.slice(0, -1).trim() : trimmed
  const num = parseFloat(stripped)
  return isNaN(num) ? null : num
}

/**
 * Detect whether a parsed CSV is in transposed format (params as rows, districts as columns).
 * @param {string[]} headers - CSV header row
 * @param {string[][]} rows - CSV data rows
 * @returns {boolean}
 */
export function detectTransposedFormat(headers, rows) {
  if (!headers || headers.length === 0) return false
  // Check if first header is "Parameter"
  if (headers[0].toLowerCase().trim() === 'parameter') return true
  // Check if any early row looks like an ALL-CAPS section header
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i]
    if (!row || row.length === 0) continue
    const firstCell = (row[0] || '').trim()
    if (firstCell.length > 2 && firstCell === firstCell.toUpperCase() && /[A-Z]/.test(firstCell)) {
      // Check remaining cols are empty
      const restEmpty = row.slice(1).every(c => (c || '').trim() === '')
      if (restEmpty) return true
    }
  }
  return false
}

/**
 * Parse a transposed CSV into district scenario objects.
 *
 * Expected layout:
 *   Row 0 (headers): "Parameter", district short names...
 *   Row 1 (rows[0]): "District Full Name", full names...
 *   Row 2 (rows[1]): "", "Min", "Max", ...
 *   Row 3+ (rows[2+]): section headers (ALL-CAPS) and data rows
 *
 * @param {string[]} headers
 * @param {string[][]} rows
 * @returns {Array<{ name: string, code: string, districtParameters: Object }>}
 */
export function parseTransposedCSV(headers, rows) {
  if (!headers || headers.length < 2 || !rows || rows.length < 3) return []

  // Build district column groups from headers
  // headers[1+] are district short names, possibly repeated for min/max
  const districts = []
  const districtColMap = [] // index in headers → { districtIdx, isMin }

  // Determine min/max sub-headers from rows[1]
  const subHeaders = rows[1] || []

  for (let col = 1; col < headers.length; col++) {
    const shortName = (headers[col] || '').trim()
    if (!shortName) continue
    const sub = (subHeaders[col] || '').trim().toLowerCase()
    const isMin = sub === 'min' || sub === '' // default to min if no sub-header
    const isMax = sub === 'max'

    // Find or create district entry
    let districtIdx = districts.findIndex(d => d.code === shortName)
    if (districtIdx === -1) {
      const fullName = (rows[0]?.[col] || '').trim() || shortName
      districts.push({ code: shortName, name: fullName, minCol: null, maxCol: null })
      districtIdx = districts.length - 1
    }

    if (isMax) {
      districts[districtIdx].maxCol = col
    } else {
      // First non-max col is min
      if (districts[districtIdx].minCol === null) {
        districts[districtIdx].minCol = col
      }
    }
  }

  // Initialize result objects
  const results = districts.map(d => ({
    name: d.name,
    code: d.code,
    districtParameters: {},
  }))

  // Walk data rows (starting from index 2, which is rows[2])
  let currentSection = null

  for (let r = 2; r < rows.length; r++) {
    const row = rows[r]
    if (!row) continue
    const firstCell = (row[0] || '').trim()
    if (!firstCell) continue // blank row

    // Check if ALL-CAPS section header
    if (firstCell === firstCell.toUpperCase() && /[A-Z]/.test(firstCell)) {
      const restEmpty = row.slice(1).every(c => (c || '').trim() === '')
      if (restEmpty) {
        // Normalize section: replace various dashes with em-dash for matching
        currentSection = firstCell.replace(/\s*[-–—]\s*/g, ' — ')
        continue
      }
    }

    if (!currentSection) continue
    const sectionMap = TRANSPOSED_ROW_MAP[currentSection]
    if (!sectionMap) continue

    const fieldDef = sectionMap[firstCell]
    if (!fieldDef) continue

    // Resolve field config
    const isString = typeof fieldDef === 'string'
    const basePath = isString ? fieldDef : fieldDef.path
    const fieldType = isString ? 'minMax' : fieldDef.type

    // Apply value to each district
    for (let di = 0; di < districts.length; di++) {
      const d = districts[di]
      const params = results[di].districtParameters
      const minVal = d.minCol !== null ? parseTransposedValue(row[d.minCol]) : null
      const maxVal = d.maxCol !== null ? parseTransposedValue(row[d.maxCol]) : null

      switch (fieldType) {
        case 'minMax':
          if (minVal != null) params[`${basePath}.min`] = minVal
          if (maxVal != null) params[`${basePath}.max`] = maxVal
          break
        case 'single':
          if (minVal != null) params[basePath] = minVal
          else if (maxVal != null) params[basePath] = maxVal
          break
        case 'boolean':
          if (minVal != null) params[basePath] = minVal === true
          break
        case 'accessMinMax':
          if (minVal != null) params[`${basePath}.min`] = minVal
          if (maxVal != null) params[`${basePath}.max`] = maxVal
          if (minVal != null || maxVal != null) params[`${basePath}.permitted`] = true
          break
      }
    }
  }

  // Filter out districts with no params
  return results.filter(r => Object.keys(r.districtParameters).length > 0)
}
