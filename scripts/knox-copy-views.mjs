#!/usr/bin/env node
/**
 * Copy full-snapshot saved views from Knox_Light_Industrial → KNOX
 *
 * Knox_Light_Industrial has 5 full views (layers, styles, visibility, dims, etc.)
 * while KNOX only has camera-only stubs. This remaps lot IDs and overwrites.
 */

const API = 'http://localhost:3001/api'

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

async function main() {
  console.log('=== Copy Saved Views: Knox_Light_Industrial → KNOX ===\n')

  // Step 1: Read source views
  console.log('Step 1: Reading Knox_Light_Industrial...')
  const source = await api('/projects/Knox_Light_Industrial')
  const srcState = source.state
  if (!srcState) throw new Error('Knox_Light_Industrial has no state!')

  const srcViews = srcState.savedViews ?? srcState.viewSettings?.savedViews
  if (!srcViews) throw new Error('Knox_Light_Industrial has no saved views!')
  const viewCount = Object.keys(srcViews).length
  console.log(`  Found ${viewCount} saved views`)

  // Identify source lot IDs from view data
  const srcLotIds = new Set()
  for (const view of Object.values(srcViews)) {
    if (!view) continue
    if (view.entityStyles) Object.keys(view.entityStyles).forEach(k => srcLotIds.add(k))
    if (view.lotVisibility) Object.keys(view.lotVisibility).forEach(k => srcLotIds.add(k))
  }
  console.log(`  Source lot IDs in views: ${[...srcLotIds].join(', ')}`)

  // Step 2: Read KNOX to get its lot ID
  console.log('\nStep 2: Reading KNOX project...')
  const knox = await api('/projects/KNOX')
  const knoxState = knox.state
  if (!knoxState) throw new Error('KNOX has no state!')

  const knoxLotId = (knoxState.entityOrder || Object.keys(knoxState.entities?.lots || {}))[0]
  if (!knoxLotId) throw new Error('KNOX has no lots!')
  console.log(`  KNOX lot ID: ${knoxLotId}`)

  // Determine primary source lot (the one that maps to KNOX's single lot)
  // Use entityOrder from source if available, otherwise pick the first one found in views
  const srcEntityOrder = srcState.entityOrder || Object.keys(srcState.entities?.lots || {})
  const primarySrcLotId = srcEntityOrder[0]
  console.log(`  Primary source lot: ${primarySrcLotId}`)

  // Step 3: Remap lot IDs in views
  console.log('\nStep 3: Remapping lot IDs...')
  const remappedViews = deepClone(srcViews)

  for (const [slot, view] of Object.entries(remappedViews)) {
    if (!view) continue

    // Remap entityStyles
    if (view.entityStyles) {
      const newStyles = {}
      for (const [lotId, style] of Object.entries(view.entityStyles)) {
        if (lotId === primarySrcLotId) {
          newStyles[knoxLotId] = style
        }
        // Drop other source lot IDs (KNOX only has 1 lot)
      }
      view.entityStyles = newStyles
    }

    // Remap lotVisibility
    if (view.lotVisibility) {
      const newVis = {}
      for (const [lotId, vis] of Object.entries(view.lotVisibility)) {
        if (lotId === primarySrcLotId) {
          newVis[knoxLotId] = vis
        }
      }
      view.lotVisibility = newVis
    }

    // Remap annotationCustomLabels (keys may contain lot IDs)
    if (view.annotationCustomLabels) {
      const newLabels = {}
      for (const [key, val] of Object.entries(view.annotationCustomLabels)) {
        const remapped = key.replace(primarySrcLotId, knoxLotId)
        newLabels[remapped] = val
      }
      view.annotationCustomLabels = newLabels
    }

    // Remap annotationPositions (keys may contain lot IDs)
    if (view.annotationPositions) {
      const newPos = {}
      for (const [key, val] of Object.entries(view.annotationPositions)) {
        const remapped = key.replace(primarySrcLotId, knoxLotId)
        newPos[remapped] = val
      }
      view.annotationPositions = newPos
    }

    console.log(`  View ${slot}: ${view.name ?? '(unnamed)'} — remapped`)
  }

  // Step 4: Merge into KNOX state and PUT
  console.log('\nStep 4: Updating KNOX project...')
  knoxState.savedViews = remappedViews

  await api('/projects/KNOX', {
    method: 'PUT',
    body: JSON.stringify({ state: knoxState }),
  })
  console.log('  PUT successful')

  // Step 5: Verify
  console.log('\nStep 5: Verification...')
  const updated = await api('/projects/KNOX')
  const updatedViews = updated.state?.savedViews
  const updatedCount = updatedViews ? Object.keys(updatedViews).length : 0
  console.log(`  Saved views: ${updatedCount} (expected: ${viewCount})`)
  console.log(`  ${updatedCount === viewCount ? 'PASS' : 'FAIL'}: view count`)

  // Check that views have full snapshot data (not just camera)
  let fullSnapshotCount = 0
  for (const [slot, view] of Object.entries(updatedViews || {})) {
    if (view?.layers || view?.entityStyles || view?.dimensionSettings) {
      fullSnapshotCount++
    }
  }
  console.log(`  Full-snapshot views: ${fullSnapshotCount}/${updatedCount}`)
  console.log(`  ${fullSnapshotCount === updatedCount ? 'PASS' : 'FAIL'}: all views are full snapshots`)

  // Check lot ID remapping
  let correctLotId = true
  for (const view of Object.values(updatedViews || {})) {
    if (!view) continue
    if (view.entityStyles && !view.entityStyles[knoxLotId]) correctLotId = false
    if (view.lotVisibility && !view.lotVisibility[knoxLotId]) correctLotId = false
  }
  console.log(`  ${correctLotId ? 'PASS' : 'FAIL'}: lot IDs remapped to ${knoxLotId}`)

  console.log('\n=== DONE ===')
}

main().catch(err => {
  console.error('FATAL:', err.message)
  process.exit(1)
})
