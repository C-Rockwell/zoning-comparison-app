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
 * @returns {{ [csvHeader: string]: string|null }} - Mapping of CSV header -> app field key or null
 */
export function autoMatchHeaders(csvHeaders) {
  const mapping = {}
  const usedFields = new Set()

  for (const header of csvHeaders) {
    mapping[header] = null
  }

  // Pass 1: Try exact normalized match against field keys and labels
  for (const header of csvHeaders) {
    if (mapping[header] !== null) continue
    const normalizedHeader = normalize(header)

    for (const field of APP_FIELDS) {
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

  // Pass 2: Try alias matching for remaining unmatched headers
  for (const header of csvHeaders) {
    if (mapping[header] !== null) continue
    const normalizedHeader = normalize(header)

    for (const field of APP_FIELDS) {
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
