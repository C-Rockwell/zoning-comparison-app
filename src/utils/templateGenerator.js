/**
 * Excel Template Generator for District Parameter Import
 *
 * Generates a styled .xlsx template matching the transposed CSV layout
 * (parameters as rows, districts as columns with Min/Max sub-headers).
 * Column A is "Diagram Key" for per-section letter labels.
 */

import { TRANSPOSED_ROW_MAP } from './importParser'

/**
 * Download a pre-formatted .xlsx template for district parameter import.
 *
 * @param {number} districtCount - Number of district column groups (default 2)
 */
export async function downloadDistrictTemplate(districtCount = 2) {
  const XLSX = await import('xlsx-js-style')

  const rows = []
  const totalCols = 2 + districtCount * 2 // Diagram Key + Parameter + district cols

  // -- Row 0: Header row ("Diagram Key", "Parameter" + district code placeholders with Min/Max) --
  const headerRow = ['Diagram Key', 'Parameter']
  for (let d = 1; d <= districtCount; d++) {
    headerRow.push(`District ${d}`, `District ${d}`)
  }
  rows.push(headerRow)

  // -- Row 1: Full name row --
  const nameRow = ['', 'District Full Name']
  for (let d = 1; d <= districtCount; d++) {
    nameRow.push('', '')
  }
  rows.push(nameRow)

  // -- Row 2: Min/Max sub-headers --
  const subHeaderRow = ['', '']
  for (let d = 1; d <= districtCount; d++) {
    subHeaderRow.push('Min', 'Max')
  }
  rows.push(subHeaderRow)

  // -- Data rows by section --
  const sections = Object.keys(TRANSPOSED_ROW_MAP)
  for (const section of sections) {
    // Blank separator row
    const blankRow = Array(totalCols).fill('')
    rows.push(blankRow)

    // Section header row (ALL-CAPS, only in col B)
    const sectionRow = ['', section, ...Array(districtCount * 2).fill('')]
    rows.push(sectionRow)

    // Parameter rows (Diagram Key in col A left empty for user to fill)
    const params = TRANSPOSED_ROW_MAP[section]
    for (const paramLabel of Object.keys(params)) {
      const paramRow = ['', paramLabel, ...Array(districtCount * 2).fill('')]
      rows.push(paramRow)
    }
  }

  // Build worksheet from rows
  const ws = XLSX.utils.aoa_to_sheet(rows)

  // -- Styling --
  const sectionFill = { fgColor: { rgb: 'E8EDF3' } }
  const sectionFont = { bold: true, sz: 11 }
  const headerFont = { bold: true, sz: 11 }
  const subHeaderFont = { bold: true, sz: 10 }
  const centerAlign = { horizontal: 'center' }

  // Style header row (row 0)
  for (let c = 0; c < headerRow.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c })
    if (ws[addr]) ws[addr].s = { font: headerFont }
  }

  // Style sub-header row (row 2) — center Min/Max
  for (let c = 2; c < subHeaderRow.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: 2, c })
    if (ws[addr]) ws[addr].s = { font: subHeaderFont, alignment: centerAlign }
  }

  // Style section header rows
  let rowIdx = 3 // start after first 3 rows
  for (const section of sections) {
    rowIdx++ // blank separator
    // Section header row — style col B (parameter col)
    const addr = XLSX.utils.encode_cell({ r: rowIdx, c: 1 })
    if (ws[addr]) {
      ws[addr].s = { font: sectionFont, fill: sectionFill }
    }
    // Apply fill across all columns for section row
    for (let c = 0; c < totalCols; c++) {
      const cellAddr = XLSX.utils.encode_cell({ r: rowIdx, c })
      if (!ws[cellAddr]) ws[cellAddr] = { t: 's', v: '' }
      ws[cellAddr].s = { fill: sectionFill, ...(c === 1 ? { font: sectionFont } : {}) }
    }
    rowIdx++ // section header
    rowIdx += Object.keys(TRANSPOSED_ROW_MAP[section]).length // param rows
  }

  // Column widths: A=12 (Diagram Key), B=35 (Parameter), rest=14
  const cols = [{ wch: 12 }, { wch: 35 }]
  for (let c = 0; c < districtCount * 2; c++) {
    cols.push({ wch: 14 })
  }
  ws['!cols'] = cols

  // Create workbook and trigger download
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'District Template')
  XLSX.writeFile(wb, 'district-template.xlsx')
}
