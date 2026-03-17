/**
 * Generate filled district template from Article 5 extracted data.
 * Output: docs/Article5_Districts.xlsx
 */

import { createRequire } from 'module'

const require = createRequire(import.meta.url)

// District data extracted from Article 5 stripped.docx
// Values: null = blank/n/a/not specified
const districts = [
  { code: 'RHB', name: 'Rural Hub', buildingType: 'All types (principal)' },
  { code: 'NMU', name: 'Neighborhood Mixed-Use', buildingType: 'Mixed-use horizontal' },
  { code: 'MUCC', name: 'Mixed-Use Community Corridor', buildingType: 'Multifamily (9+ units)' },
  { code: 'HC', name: 'Highway Commercial', buildingType: 'All types (principal)' },
  { code: 'BC', name: 'Business and Commercial', buildingType: 'All types (principal)' },
  { code: 'EC', name: 'Employment Campus', buildingType: 'All types (principal)' },
  { code: 'TC', name: 'Town Center', buildingType: 'Mixed-use vertical' },
]

// Data keyed by [districtIndex][paramPath] = { min, max } or single value
// null = not specified / n/a / "No minimum" for lot dimensions
// 0 = "No minimum" for setbacks (means building can be at property line)
const data = {
  // ===== LOT DIMENSIONS =====
  'lotArea': [
    { min: 21780 },       // RHB: 0.5 ac = 21,780 sf
    {},                    // NMU: No minimum
    {},                    // MUCC: No minimum
    {},                    // HC: No minimum
    {},                    // BC: No minimum
    { min: 130680 },       // EC: 3 ac = 130,680 sf
    {},                    // TC: No minimum
  ],
  'lotCoverage': [{},{},{},{},{},{},{}], // Not in doc
  'lotWidth': [
    { min: 100 },  // RHB
    { min: 50 },   // NMU
    { min: 50 },   // MUCC
    { min: 100 },  // HC
    { min: 80 },   // BC
    { min: 100 },  // EC
    { min: 30 },   // TC
  ],
  'lotWidthAtSetback': [{},{},{},{},{},{},{}], // Not in doc
  'lotDepth': [{},{},{},{},{},{},{}], // Not in doc
  'widthToDepthRatio': [
    {},             // RHB: n/a
    { max: 50 },   // NMU: 1:2 → 50% (see notes)
    {},             // MUCC: n/a
    { max: 50 },   // HC: 1:2 → 50% (see notes)
    {},             // BC: n/a
    {},             // EC: n/a
    {},             // TC: n/a
  ],
  'maxImperviousSurface': [
    { max: 45 },   // RHB
    { max: 80 },   // NMU
    { max: 80 },   // MUCC
    { max: 75 },   // HC
    { max: 65 },   // BC
    { max: 70 },   // EC
    { max: 90 },   // TC
  ],

  // ===== SETBACKS — PRINCIPAL STRUCTURE =====
  'setbacksPrincipal.front': [
    { min: 20 },   // RHB
    { min: 5 },    // NMU
    { min: 10 },   // MUCC
    { min: 20 },   // HC
    { min: 25 },   // BC
    { min: 10 },   // EC
    { min: 0 },    // TC
  ],
  'setbacksPrincipal.rear': [
    { min: 10 },   // RHB
    { min: 10 },   // NMU
    { min: 5 },    // MUCC
    { min: 5 },    // HC
    { min: 10 },   // BC
    { min: 15 },   // EC
    { min: 0 },    // TC
  ],
  'setbacksPrincipal.sideInterior': [
    { min: 10 },   // RHB
    { min: 0 },    // NMU: "No minimum" = 0
    { min: 5 },    // MUCC
    { min: 5 },    // HC
    { min: 10 },   // BC
    { min: 12 },   // EC
    { min: 0 },    // TC
  ],
  'setbacksPrincipal.sideStreet': [
    { min: 20 },   // RHB
    { min: 5 },    // NMU
    { min: 0 },    // MUCC: "No minimum" = 0
    { min: 10 },   // HC
    { min: 25 },   // BC
    { min: 10 },   // EC
    { min: 5 },    // TC
  ],
  'setbacksPrincipal.distanceBetweenBuildings': [
    { min: 0 },    // RHB: "No minimum"
    { min: 0 },    // NMU: "No minimum"
    { min: 10 },   // MUCC
    { min: 24 },   // HC
    { min: 24 },   // BC
    { min: 24 },   // EC
    { min: 0 },    // TC
  ],
  'setbacksPrincipal.btzFront': [
    null,           // RHB: n/a (no BTZ)
    50,             // NMU
    60,             // MUCC
    null,           // HC: n/a (no BTZ)
    15,             // BC
    40,             // EC
    70,             // TC
  ],
  'setbacksPrincipal.btzSideStreet': [
    null,           // RHB: n/a
    40,             // NMU
    50,             // MUCC
    null,           // HC: n/a
    10,             // BC
    30,             // EC
    50,             // TC
  ],

  // ===== SETBACKS — ACCESSORY STRUCTURE =====
  'setbacksAccessory.front': [
    { min: 20 },   // RHB
    { min: 10 },   // NMU
    { min: 10 },   // MUCC: copied from principal
    { min: 20 },   // HC
    { min: 25 },   // BC
    { min: 10 },   // EC
    { min: 0 },    // TC
  ],
  'setbacksAccessory.rear': [
    { min: 10 },   // RHB
    { min: 10 },   // NMU
    { min: 5 },    // MUCC: copied from principal
    { min: 5 },    // HC
    { min: 5 },    // BC
    { min: 5 },    // EC
    { min: 0 },    // TC
  ],
  'setbacksAccessory.sideInterior': [
    { min: 10 },   // RHB
    { min: 5 },    // NMU
    { min: 5 },    // MUCC: copied from principal
    { min: 5 },    // HC
    { min: 5 },    // BC
    { min: 5 },    // EC
    { min: 0 },    // TC
  ],
  'setbacksAccessory.sideStreet': [
    { min: 20 },   // RHB
    { min: 10 },   // NMU
    { min: 0 },    // MUCC: copied from principal ("No minimum" = 0)
    { min: 10 },   // HC
    { min: 25 },   // BC
    { min: 10 },   // EC
    { min: 5 },    // TC
  ],
  'setbacksAccessory.distanceBetweenBuildings': [
    { min: 0 },    // RHB: "No minimum"
    { min: 0 },    // NMU: "No minimum"
    { min: 10 },   // MUCC: copied from principal
    { min: 24 },   // HC
    { min: 24 },   // BC
    { min: 24 },   // EC
    { min: 0 },    // TC
  ],
  'setbacksAccessory.btzFront': [
    null,           // RHB: n/a
    null,           // NMU: "None established"
    null,           // MUCC: "None established"
    null,           // HC: n/a
    null,           // BC: "None established"
    null,           // EC: "None established"
    null,           // TC: "None established"
  ],
  'setbacksAccessory.btzSideStreet': [
    null,           // RHB: n/a
    40,             // NMU
    40,             // MUCC
    null,           // HC: n/a
    null,           // BC: "None established"
    null,           // EC: "None established"
    null,           // TC: n/a
  ],

  // ===== STRUCTURE DIMENSIONS — PRINCIPAL =====
  'structures.principal.height': [
    { max: 35 },   // RHB
    { max: 35 },   // NMU
    { max: 60 },   // MUCC
    { max: 60 },   // HC
    { max: 60 },   // BC
    { max: 60 },   // EC
    {},             // TC: "No maximum" — SEE NOTES
  ],
  'structures.principal.stories': [{},{},{},{},{},{},{}], // Not in doc
  'structures.principal.firstStoryHeight': [
    {},             // RHB: n/a
    { min: 12 },   // NMU
    { min: 14 },   // MUCC
    {},             // HC: n/a
    {},             // BC: n/a
    { min: 15 },   // EC
    { min: 15 },   // TC
  ],
  'structures.principal.upperStoryHeight': [{},{},{},{},{},{},{}], // Not in doc

  // ===== STRUCTURE DIMENSIONS — ACCESSORY =====
  'structures.accessory.height': [
    { max: 35 },   // RHB
    { max: 35 },   // NMU
    { max: 25 },   // MUCC
    { max: 25 },   // HC
    { max: 25 },   // BC
    { max: 25 },   // EC
    { max: 25 },   // TC
  ],
  'structures.accessory.stories': [{},{},{},{},{},{},{}], // Not in doc
  'structures.accessory.firstStoryHeight': [
    {},             // RHB: n/a
    {},             // NMU: n/a
    {},             // MUCC: n/a
    {},             // HC: n/a
    {},             // BC: n/a
    {},             // EC: n/a
    { min: 15 },   // TC
  ],
  'structures.accessory.upperStoryHeight': [{},{},{},{},{},{},{}], // Not in doc

  // ===== PARKING LOCATIONS (boolean Y/N) =====
  'parkingLocations.front.permitted': ['Y','N','N','Y','Y','Y','N'],
  'parkingLocations.sideInterior.permitted': ['Y','Y','Y','Y','Y','Y','N'],
  'parkingLocations.sideStreet.permitted': ['Y','N','N','Y','Y','Y','N'],
  'parkingLocations.rear.permitted': ['Y','Y','Y','Y','Y','Y','Y'],

  // ===== PARKING SETBACKS (single value = min setback) =====
  'parkingLocations.front.min': [10, null, null, 5, 25, 15, null],
  'parkingLocations.sideInterior.min': [5, 5, 5, 5, 10, 15, null],
  'parkingLocations.sideStreet.min': [10, null, null, 0, 12, 15, null],
  'parkingLocations.rear.min': [5, 5, 5, 5, 10, 15, 5],
}

// Diagram Key mappings (shared across all districts, from figure references)
const diagramKeys = {
  'lotArea': 'C',
  'lotWidth': 'A',
  'widthToDepthRatio': 'A/B',
  'setbacksPrincipal.front': 'A',
  'setbacksPrincipal.rear': 'B',
  'setbacksPrincipal.sideInterior': 'C',
  'setbacksPrincipal.sideStreet': 'D',
  'setbacksPrincipal.distanceBetweenBuildings': 'E',
  'setbacksPrincipal.btzFront': 'F',
  'setbacksPrincipal.btzSideStreet': 'G',
  'setbacksAccessory.front': 'A',
  'setbacksAccessory.rear': 'B',
  'setbacksAccessory.sideInterior': 'C',
  'setbacksAccessory.sideStreet': 'D',
  'setbacksAccessory.distanceBetweenBuildings': 'E',
  'setbacksAccessory.btzFront': 'F',
  'setbacksAccessory.btzSideStreet': 'G',
  'structures.principal.height': 'A',
  'structures.principal.firstStoryHeight': 'B',
  'structures.accessory.height': 'C',
  'structures.accessory.firstStoryHeight': 'D',
  'parkingLocations.front.permitted': 'A',
  'parkingLocations.sideInterior.permitted': 'B',
  'parkingLocations.sideStreet.permitted': 'C',
  'parkingLocations.rear.permitted': 'D',
  'parkingLocations.front.min': 'A',
  'parkingLocations.sideInterior.min': 'B',
  'parkingLocations.sideStreet.min': 'C',
  'parkingLocations.rear.min': 'D',
}

// Section/parameter layout matching TRANSPOSED_ROW_MAP
const sections = [
  {
    header: 'LOT DIMENSIONS',
    params: [
      { label: 'Lot Area', path: 'lotArea', type: 'minMax' },
      { label: 'Lot Coverage', path: 'lotCoverage', type: 'minMax' },
      { label: 'Lot Width', path: 'lotWidth', type: 'minMax' },
      { label: 'Lot Width at Setback', path: 'lotWidthAtSetback', type: 'minMax' },
      { label: 'Lot Depth', path: 'lotDepth', type: 'minMax' },
      { label: 'Width to Depth Ratio (%)', path: 'widthToDepthRatio', type: 'minMax' },
      { label: 'Max. Impervious Surface (%)', path: 'maxImperviousSurface', type: 'minMax' },
    ],
  },
  {
    header: 'SETBACKS — PRINCIPAL STRUCTURE',
    params: [
      { label: 'Front', path: 'setbacksPrincipal.front', type: 'minMax' },
      { label: 'Rear', path: 'setbacksPrincipal.rear', type: 'minMax' },
      { label: 'Side Interior', path: 'setbacksPrincipal.sideInterior', type: 'minMax' },
      { label: 'Side Street', path: 'setbacksPrincipal.sideStreet', type: 'minMax' },
      { label: 'Dist. Between Buildings', path: 'setbacksPrincipal.distanceBetweenBuildings', type: 'minMax' },
      { label: 'BTZ - Front (%)', path: 'setbacksPrincipal.btzFront', type: 'single' },
      { label: 'BTZ - Side Street (%)', path: 'setbacksPrincipal.btzSideStreet', type: 'single' },
    ],
  },
  {
    header: 'SETBACKS — ACCESSORY STRUCTURE',
    params: [
      { label: 'Front', path: 'setbacksAccessory.front', type: 'minMax' },
      { label: 'Rear', path: 'setbacksAccessory.rear', type: 'minMax' },
      { label: 'Side Interior', path: 'setbacksAccessory.sideInterior', type: 'minMax' },
      { label: 'Side Street', path: 'setbacksAccessory.sideStreet', type: 'minMax' },
      { label: 'Dist. Between Buildings', path: 'setbacksAccessory.distanceBetweenBuildings', type: 'minMax' },
      { label: 'BTZ - Front (%)', path: 'setbacksAccessory.btzFront', type: 'single' },
      { label: 'BTZ - Side Street (%)', path: 'setbacksAccessory.btzSideStreet', type: 'single' },
    ],
  },
  {
    header: 'STRUCTURE DIMENSIONS — PRINCIPAL',
    params: [
      { label: 'Height (max)', path: 'structures.principal.height', type: 'minMax' },
      { label: 'Stories (max)', path: 'structures.principal.stories', type: 'minMax' },
      { label: 'First Story Height (min)', path: 'structures.principal.firstStoryHeight', type: 'minMax' },
      { label: 'Upper Story Height', path: 'structures.principal.upperStoryHeight', type: 'minMax' },
    ],
  },
  {
    header: 'STRUCTURE DIMENSIONS — ACCESSORY',
    params: [
      { label: 'Height (max)', path: 'structures.accessory.height', type: 'minMax' },
      { label: 'Stories (max)', path: 'structures.accessory.stories', type: 'minMax' },
      { label: 'First Story Height (min)', path: 'structures.accessory.firstStoryHeight', type: 'minMax' },
      { label: 'Upper Story Height', path: 'structures.accessory.upperStoryHeight', type: 'minMax' },
    ],
  },
  {
    header: 'PARKING LOCATIONS',
    params: [
      { label: 'Front', path: 'parkingLocations.front.permitted', type: 'boolean' },
      { label: 'Side Interior', path: 'parkingLocations.sideInterior.permitted', type: 'boolean' },
      { label: 'Side Street', path: 'parkingLocations.sideStreet.permitted', type: 'boolean' },
      { label: 'Rear', path: 'parkingLocations.rear.permitted', type: 'boolean' },
    ],
  },
  {
    header: 'PARKING SETBACKS',
    params: [
      { label: 'Front', path: 'parkingLocations.front.min', type: 'single' },
      { label: 'Side Interior', path: 'parkingLocations.sideInterior.min', type: 'single' },
      { label: 'Side Street', path: 'parkingLocations.sideStreet.min', type: 'single' },
      { label: 'Rear', path: 'parkingLocations.rear.min', type: 'single' },
    ],
  },
]

// LOT ACCESS section skipped — doc says "Access standards are still under development" for all districts

async function generate() {
  const XLSXModule = await import('xlsx-js-style')
  const XLSX = XLSXModule.default || XLSXModule
  const districtCount = districts.length
  const totalCols = 2 + districtCount * 2 // Diagram Key + Parameter + district min/max pairs

  const rows = []

  // Row 0: Header
  const headerRow = ['Diagram Key', 'Parameter']
  for (const d of districts) headerRow.push(d.code, d.code)
  rows.push(headerRow)

  // Row 1: Full names
  const nameRow = ['', 'District Full Name']
  for (const d of districts) nameRow.push(d.name, '')
  rows.push(nameRow)

  // Row 2: Min/Max sub-headers
  const subRow = ['', '']
  for (let i = 0; i < districtCount; i++) subRow.push('Min', 'Max')
  rows.push(subRow)

  // Data sections
  for (const section of sections) {
    // Blank separator
    rows.push(Array(totalCols).fill(''))
    // Section header (in parameter column only)
    const sectionRow = Array(totalCols).fill('')
    sectionRow[1] = section.header
    rows.push(sectionRow)

    for (const param of section.params) {
      const row = Array(totalCols).fill('')
      row[0] = diagramKeys[param.path] || ''
      row[1] = param.label

      const values = data[param.path]
      if (!values) {
        rows.push(row)
        continue
      }

      for (let di = 0; di < districtCount; di++) {
        const minCol = 2 + di * 2
        const maxCol = 3 + di * 2
        const val = values[di]

        if (param.type === 'boolean') {
          // Y/N string in min col
          if (val != null) row[minCol] = val
        } else if (param.type === 'single') {
          // Single numeric value in min col
          if (val != null) row[minCol] = val
        } else {
          // minMax object
          if (val && typeof val === 'object') {
            if (val.min != null) row[minCol] = val.min
            if (val.max != null) row[maxCol] = val.max
          }
        }
      }

      rows.push(row)
    }
  }

  // Add building types as a note section at the bottom
  rows.push(Array(totalCols).fill(''))
  const noteHeader = Array(totalCols).fill('')
  noteHeader[1] = 'BUILDING TYPES (for reference — not imported)'
  rows.push(noteHeader)
  const typeRow = Array(totalCols).fill('')
  typeRow[1] = 'Principal Building Type'
  for (let di = 0; di < districtCount; di++) {
    typeRow[2 + di * 2] = districts[di].buildingType
  }
  rows.push(typeRow)

  // Build worksheet
  const ws = XLSX.utils.aoa_to_sheet(rows)

  // Styling
  const sectionFill = { fgColor: { rgb: 'E8EDF3' } }
  const sectionFont = { bold: true, sz: 11 }
  const headerFont = { bold: true, sz: 11 }
  const subHeaderFont = { bold: true, sz: 10 }
  const centerAlign = { horizontal: 'center' }
  const noteFill = { fgColor: { rgb: 'FFF2CC' } }
  const noteFont = { bold: true, sz: 10, color: { rgb: '7F6000' } }

  // Style header row (row 0)
  for (let c = 0; c < headerRow.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c })
    if (ws[addr]) ws[addr].s = { font: headerFont }
  }

  // Style sub-header row (row 2)
  for (let c = 2; c < subRow.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: 2, c })
    if (ws[addr]) ws[addr].s = { font: subHeaderFont, alignment: centerAlign }
  }

  // Style section header rows and note rows
  let rowIdx = 3
  for (const section of sections) {
    rowIdx++ // blank
    for (let c = 0; c < totalCols; c++) {
      const addr = XLSX.utils.encode_cell({ r: rowIdx, c })
      if (!ws[addr]) ws[addr] = { t: 's', v: '' }
      ws[addr].s = { fill: sectionFill, ...(c === 1 ? { font: sectionFont } : {}) }
    }
    rowIdx++ // section header
    rowIdx += section.params.length
  }

  // Style the building types note section
  const noteRowIdx = rows.length - 2
  for (let c = 0; c < totalCols; c++) {
    const addr = XLSX.utils.encode_cell({ r: noteRowIdx, c })
    if (!ws[addr]) ws[addr] = { t: 's', v: '' }
    ws[addr].s = { fill: noteFill, font: noteFont }
  }

  // Column widths
  const cols = [{ wch: 12 }, { wch: 35 }]
  for (let c = 0; c < districtCount * 2; c++) cols.push({ wch: 14 })
  ws['!cols'] = cols

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Article 5 Districts')
  XLSX.writeFile(wb, 'docs/Article5_Districts.xlsx')
  console.log('Generated docs/Article5_Districts.xlsx')
}

generate().catch(console.error)
