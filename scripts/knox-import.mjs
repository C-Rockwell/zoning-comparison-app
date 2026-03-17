#!/usr/bin/env node
/**
 * KNOX Integration — Clone-and-Stamp from KNOX-LI
 *
 * Parses docs/Knox District Parameters.xlsx, clones styling from the working
 * KNOX-LI project, then stamps each district by swapping districtParameters.
 * KNOX-LI is READ-ONLY — only GETs, never writes.
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const API = 'http://localhost:3001/api'

// ============================================
// Helpers
// ============================================

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// ============================================
// Step 1: Parse the Knox Spreadsheet
// ============================================

async function parseKnoxSpreadsheet() {
  // Dynamic import xlsx-js-style for XLSX parsing
  const xlsxMod = await import('xlsx-js-style')
  const XLSX = xlsxMod.default || xlsxMod

  const xlsxPath = resolve(ROOT, 'docs', 'Knox District Parameters.xlsx')
  const buffer = readFileSync(xlsxPath)
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  if (!ws) throw new Error('No worksheet found')

  // Convert to array-of-arrays
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  const nonEmpty = aoa.filter(row => row.some(cell => String(cell ?? '').trim() !== ''))
  if (nonEmpty.length === 0) throw new Error('Spreadsheet is empty')

  const headers = nonEmpty[0].map(h => String(h ?? '').trim())
  const rows = nonEmpty.slice(1).map(row => row.map(cell => String(cell ?? '').trim()))

  return { headers, rows }
}

// ============================================
// Transposed Parser (mirrors importParser.js)
// ============================================

const TRANSPOSED_ROW_MAP = {
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

const FIELD_PATH_TO_CUSTOM_LABEL = {
  'lotArea': 'lotArea',
  'lotCoverage': 'lotCoverage',
  'lotWidth': 'lotWidth',
  'lotWidthAtSetback': 'lotWidthAtSetback',
  'lotDepth': 'lotDepth',
  'widthToDepthRatio': 'widthToDepthRatio',
  'maxImperviousSurface': 'maxImperviousSurface',
  'setbacksPrincipal.front': 'setbackFront',
  'setbacksPrincipal.rear': 'setbackRear',
  'setbacksPrincipal.sideInterior': 'setbackSideInterior',
  'setbacksPrincipal.sideStreet': 'setbackSideStreet',
  'setbacksPrincipal.distanceBetweenBuildings': 'distBetweenBuildingsPrincipal',
  'setbacksAccessory.front': 'setbackFrontAccessory',
  'setbacksAccessory.rear': 'setbackRearAccessory',
  'setbacksAccessory.sideInterior': 'setbackSideInteriorAccessory',
  'setbacksAccessory.sideStreet': 'setbackSideStreetAccessory',
  'setbacksAccessory.distanceBetweenBuildings': 'distBetweenBuildingsAccessory',
  'structures.principal.height': 'principalMaxHeight',
  'structures.principal.stories': 'principalMaxStories',
  'structures.principal.firstStoryHeight': 'firstFloorHeight',
  'structures.principal.upperStoryHeight': 'principalUpperStoryHeight',
  'structures.accessory.height': 'accessoryMaxHeight',
  'structures.accessory.stories': 'accessoryMaxStories',
  'structures.accessory.firstStoryHeight': 'accessoryFirstFloorHeight',
  'structures.accessory.upperStoryHeight': 'accessoryUpperStoryHeight',
  'setbacksPrincipal.btzFront': 'btzFrontPrincipal',
  'setbacksPrincipal.btzSideStreet': 'btzSideStreetPrincipal',
  'setbacksAccessory.btzFront': 'btzFrontAccessory',
  'setbacksAccessory.btzSideStreet': 'btzSideStreetAccessory',
  'lotAccess.primaryStreet': 'lotAccessPrimaryStreet',
  'lotAccess.secondaryStreet': 'lotAccessSecondaryStreet',
  'lotAccess.rearAlley': 'lotAccessRearAlley',
  'lotAccess.sharedDrive': 'lotAccessSharedDrive',
  'parkingLocations.front.permitted': 'parkingLocationFront',
  'parkingLocations.sideInterior.permitted': 'parkingLocationSideInterior',
  'parkingLocations.sideStreet.permitted': 'parkingLocationSideStreet',
  'parkingLocations.rear.permitted': 'parkingLocationRear',
  'parkingLocations.front.min': 'parkingSetbackFront',
  'parkingLocations.sideInterior.min': 'parkingSetbackSideInterior',
  'parkingLocations.sideStreet.min': 'parkingSetbackSideStreet',
  'parkingLocations.rear.min': 'parkingSetbackRear',
}

function parseTransposedValue(rawValue) {
  if (rawValue == null) return null
  const trimmed = rawValue.trim()
  if (trimmed === '' || trimmed.toLowerCase() === 'no minimum' || trimmed.toLowerCase() === 'n/a') return null
  if (trimmed === 'Y' || trimmed === 'y') return true
  if (trimmed === 'N' || trimmed === 'n') return false
  const stripped = trimmed.endsWith('%') ? trimmed.slice(0, -1).trim() : trimmed
  const num = parseFloat(stripped)
  return isNaN(num) ? null : num
}

function parseTransposedCSV(headers, rows) {
  if (!headers || headers.length < 2 || !rows || rows.length < 3) return []

  const firstHeader = headers[0].toLowerCase().trim()
  const hasDiagramKeyCol = firstHeader === 'diagram key' || firstHeader === 'custom labels'
  const paramCol = hasDiagramKeyCol ? 1 : 0
  const districtStartCol = paramCol + 1

  const districts = []
  const subHeaders = rows[1] || []

  for (let col = districtStartCol; col < headers.length; col++) {
    const shortName = (headers[col] || '').trim()
    if (!shortName) continue
    const sub = (subHeaders[col] || '').trim().toLowerCase()
    const isMax = sub === 'max'

    let districtIdx = districts.findIndex(d => d.code === shortName)
    if (districtIdx === -1) {
      const fullName = (rows[0]?.[col] || '').trim() || shortName
      districts.push({ code: shortName, name: fullName, minCol: null, maxCol: null })
      districtIdx = districts.length - 1
    }

    if (isMax) {
      districts[districtIdx].maxCol = col
    } else {
      if (districts[districtIdx].minCol === null) {
        districts[districtIdx].minCol = col
      }
    }
  }

  const results = districts.map(d => ({
    name: d.name,
    code: d.code,
    districtParameters: {},
  }))

  const diagramKeys = {}
  let currentSection = null

  for (let r = 2; r < rows.length; r++) {
    const row = rows[r]
    if (!row) continue
    const paramCell = (row[paramCol] || '').trim()
    if (!paramCell) continue

    if (paramCell === paramCell.toUpperCase() && /[A-Z]/.test(paramCell)) {
      const restEmpty = row.slice(paramCol + 1).every(c => (c || '').trim() === '')
      if (restEmpty) {
        currentSection = paramCell.replace(/\s*[-–—]\s*/g, ' — ')
        continue
      }
    }

    if (!currentSection) continue
    const sectionMap = TRANSPOSED_ROW_MAP[currentSection]
    if (!sectionMap) continue

    const fieldDef = sectionMap[paramCell]
    if (!fieldDef) continue

    const isString = typeof fieldDef === 'string'
    const basePath = isString ? fieldDef : fieldDef.path
    const fieldType = isString ? 'minMax' : fieldDef.type

    if (hasDiagramKeyCol) {
      const diagramKey = (row[0] || '').trim()
      if (diagramKey) {
        const customLabelKey = FIELD_PATH_TO_CUSTOM_LABEL[basePath]
        if (customLabelKey) {
          diagramKeys[customLabelKey] = diagramKey
        }
      }
    }

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

  const hasDiagramKeys = Object.keys(diagramKeys).length > 0
  const filtered = results.filter(r => Object.keys(r.districtParameters).length > 0)
  if (hasDiagramKeys) {
    for (const result of filtered) {
      result.diagramKeys = diagramKeys
    }
  }
  return filtered
}

// ============================================
// District Parameters Builder
// ============================================

function createDefaultDistrictParameters() {
  return {
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
  }
}

function buildNestedDistrictParams(dotPathMap) {
  const base = createDefaultDistrictParameters()
  for (const [dotPath, value] of Object.entries(dotPathMap)) {
    const keys = dotPath.split('.')
    let obj = base
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) obj[keys[i]] = {}
      obj = obj[keys[i]]
    }
    obj[keys[keys.length - 1]] = value
  }
  return base
}

// ============================================
// Main
// ============================================

async function main() {
  console.log('=== KNOX Clone-and-Stamp ===\n')

  // ── Step 1: Parse spreadsheet ──
  console.log('Step 1: Parsing Knox spreadsheet...')
  const { headers, rows } = await parseKnoxSpreadsheet()
  console.log(`  Headers: ${headers.length} columns, Rows: ${rows.length}`)

  const districts = parseTransposedCSV(headers, rows)
  console.log(`  Parsed ${districts.length} districts:`)
  for (const d of districts) {
    const paramCount = Object.keys(d.districtParameters).length
    console.log(`    ${d.code} — ${d.name} (${paramCount} params)`)
  }
  if (districts.length === 0) throw new Error('No districts parsed!')

  // ── Step 2: Read KNOX-LI state (read-only) ──
  console.log('\nStep 2: Reading KNOX-LI project state...')
  const knoxLi = await api('/projects/KNOX-LI')
  const src = knoxLi.state
  if (!src) throw new Error('KNOX-LI has no state!')

  // Find the first lot in KNOX-LI
  const srcLotIds = src.entityOrder || Object.keys(src.entities?.lots || {})
  if (srcLotIds.length === 0) throw new Error('KNOX-LI has no lots!')
  const srcLotId = srcLotIds[0]
  console.log(`  Source lot: ${srcLotId}`)
  console.log(`  Source lot fill color: ${src.entityStyles?.[srcLotId]?.lotFill?.color ?? 'MISSING'}`)
  console.log(`  Source roadModule enabled: ${src.roadModule?.enabled}`)

  // ── Step 3: Build reference snapshot ──
  console.log('\nStep 3: Building reference snapshot...')
  const newLotId = `lot-${Date.now()}-0`

  // Clone the source lot's entity data, stripping imported models
  const srcLot = deepClone(src.entities.lots[srcLotId])
  srcLot.importedModels = {}
  srcLot.importedModelOrder = []

  // Clone styles and visibility under new lot ID
  const newEntityStyles = { [newLotId]: deepClone(src.entityStyles[srcLotId]) }
  const newLotVisibility = { [newLotId]: deepClone(src.lotVisibility[srcLotId]) }

  // Build reference snapshot matching getSnapshotData() format exactly
  const referenceSnapshot = {
    existing: deepClone(src.existing),
    proposed: deepClone(src.proposed),
    viewSettings: {
      mode: src.viewSettings?.mode ?? 'district',
      projection: src.viewSettings?.projection ?? 'orthographic',
      backgroundMode: src.viewSettings?.backgroundMode ?? 'dark',
      layers: deepClone(src.viewSettings?.layers),
      styleSettings: deepClone(src.viewSettings?.styleSettings),
      lighting: deepClone(src.viewSettings?.lighting),
    },
    camera: null,
    roadModule: deepClone(src.roadModule),
    roadModuleStyles: deepClone(src.roadModuleStyles),
    comparisonRoads: deepClone(src.comparisonRoads),
    renderSettings: deepClone(src.renderSettings),
    sunSettings: deepClone(src.sunSettings),
    layoutSettings: deepClone(src.layoutSettings),
    entities: {
      lots: { [newLotId]: srcLot },
      roadModules: deepClone(src.entities?.roadModules ?? {}),
    },
    entityOrder: [newLotId],
    entityStyles: newEntityStyles,
    lotVisibility: newLotVisibility,
    activeModule: 'district',
    modelSetup: {
      numLots: 1,
      streetEdges: deepClone(src.modelSetup?.streetEdges ?? { front: true, left: false, right: false, rear: false }),
      streetTypes: deepClone(src.modelSetup?.streetTypes ?? { front: 'S1', left: 'S1', right: 'S2', rear: 'S3' }),
    },
    districtParameters: null, // placeholder — stamped per district
    drawingLayers: deepClone(src.drawingLayers ?? {}),
    drawingLayerOrder: deepClone(src.drawingLayerOrder ?? []),
    drawingObjects: deepClone(src.drawingObjects ?? {}),
  }

  console.log(`  New lot ID: ${newLotId}`)
  console.log(`  Cloned fill color: ${newEntityStyles[newLotId]?.lotFill?.color}`)

  // ── Step 4: Create/Reset KNOX project ──
  console.log('\nStep 4: Creating KNOX project...')
  let projectId
  try {
    const project = await api('/projects', {
      method: 'POST',
      body: JSON.stringify({ name: 'KNOX' }),
    })
    projectId = project.id
    console.log(`  Created project: ${projectId}`)
  } catch (err) {
    if (err.message.includes('already exists')) {
      projectId = 'KNOX'
      console.log(`  Project already exists, clearing scenarios...`)
      const existing = await api(`/projects/${projectId}/scenarios`)
      for (const s of existing) {
        await api(`/projects/${projectId}/scenarios/${encodeURIComponent(s.filename)}`, { method: 'DELETE' })
      }
      console.log(`  Cleared ${existing.length} existing scenarios`)
    } else {
      throw err
    }
  }

  // ── Step 5: Stamp 18 districts ──
  console.log('\nStep 5: Stamping district scenarios...')

  for (let i = 0; i < districts.length; i++) {
    const district = districts[i]
    const nestedParams = buildNestedDistrictParams(district.districtParameters)

    // Deep-clone reference and swap districtParameters
    const snapshot = deepClone(referenceSnapshot)
    snapshot.districtParameters = nestedParams

    const scenarioName = district.code
      ? `${district.code} - ${district.name}`
      : district.name

    await api(`/projects/${projectId}/scenarios`, {
      method: 'POST',
      body: JSON.stringify({ name: scenarioName, code: district.code, ...snapshot }),
    })
    console.log(`  [${i + 1}/${districts.length}] ${scenarioName}`)
  }

  // ── Step 6: Set project state ──
  console.log('\nStep 6: Setting project state...')

  const projectState = deepClone(referenceSnapshot)
  projectState.districtParameters = buildNestedDistrictParams(districts[0].districtParameters)

  // Copy savedViews from KNOX-LI (top-level, not inside viewSettings)
  const srcSavedViews = src.savedViews ?? src.viewSettings?.savedViews ?? null
  if (srcSavedViews) {
    const remappedViews = deepClone(srcSavedViews)
    // Remap lot IDs from KNOX-LI's srcLotId to our newLotId
    for (const [slot, view] of Object.entries(remappedViews)) {
      if (!view) continue
      if (view.entityStyles && view.entityStyles[srcLotId]) {
        view.entityStyles[newLotId] = view.entityStyles[srcLotId]
        delete view.entityStyles[srcLotId]
      }
      if (view.lotVisibility && view.lotVisibility[srcLotId]) {
        view.lotVisibility[newLotId] = view.lotVisibility[srcLotId]
        delete view.lotVisibility[srcLotId]
      }
      if (view.annotationCustomLabels) {
        const newLabels = {}
        for (const [key, val] of Object.entries(view.annotationCustomLabels)) {
          const lotMatch = key.match(/^lot-(.+?)-(.+)$/)
          if (lotMatch && lotMatch[1] === srcLotId) {
            newLabels[`lot-${newLotId}-${lotMatch[2]}`] = val
          } else {
            newLabels[key] = val
          }
        }
        view.annotationCustomLabels = newLabels
      }
    }
    projectState.savedViews = remappedViews
    console.log(`  Copied ${Object.keys(srcSavedViews).length} saved views from KNOX-LI (lot IDs remapped)`)
  } else {
    console.log('  WARNING: No saved views found in KNOX-LI')
  }

  await api(`/projects/${projectId}`, {
    method: 'PUT',
    body: JSON.stringify({ state: projectState }),
  })
  console.log('  Project state saved')

  // ── Step 7: Verification ──
  console.log('\nStep 7: Verification...')

  const scenarios = await api(`/projects/${projectId}/scenarios`)
  console.log(`  Scenarios: ${scenarios.length} (expected: ${districts.length})`)
  console.log(`  ${scenarios.length === districts.length ? 'PASS' : 'FAIL'}: scenario count`)

  // Spot-check first scenario for non-default styling
  if (scenarios.length > 0) {
    const first = await api(`/projects/${projectId}/scenarios/${encodeURIComponent(scenarios[0].filename)}`)
    const firstLotStyle = first.entityStyles?.[newLotId]
    const fillColor = firstLotStyle?.lotFill?.color ?? 'MISSING'
    const isDefault = fillColor === '#E5E5E5'
    console.log(`  Lot fill color: ${fillColor} ${isDefault ? '(DEFAULT — BAD!)' : '(styled — GOOD)'}`)
    console.log(`  ${!isDefault ? 'PASS' : 'FAIL'}: non-default styling`)

    const hasRoad = first.roadModule?.enabled === true
    console.log(`  Road enabled: ${hasRoad}`)
    console.log(`  ${hasRoad ? 'PASS' : 'FAIL'}: road module`)

    const hasParams = first.districtParameters != null
    console.log(`  District params: ${hasParams ? 'present' : 'MISSING'}`)
    console.log(`  ${hasParams ? 'PASS' : 'FAIL'}: district parameters`)
  }

  // Check views
  const updatedProject = await api(`/projects/${projectId}`)
  const savedViews = updatedProject.state?.savedViews ?? updatedProject.state?.viewSettings?.savedViews
  const viewCount = savedViews ? Object.keys(savedViews).length : 0
  console.log(`  Saved views: ${viewCount}`)
  console.log(`  ${viewCount > 0 ? 'PASS' : 'FAIL'}: saved views`)

  console.log('\n=== DONE ===')
}

main().catch(err => {
  console.error('FATAL:', err.message)
  process.exit(1)
})
