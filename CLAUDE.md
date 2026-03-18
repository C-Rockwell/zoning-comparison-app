# CLAUDE.md

## Project Overview

React Three Fiber zoning visualization app with two modules:
1. **Comparison Module** — Side-by-side existing vs. proposed zoning (split-screen 3D)
2. **District Module** — Multi-lot composition (up to 5 lots), principal + accessory buildings, multi-direction roads

Express.js backend for project persistence. See `CODEBASE_NAV.md` for file/function index — consult it BEFORE searching the codebase. For detailed store actions, factory functions, hooks, z-map, and component hierarchy, see `CODEBASE_LIBRARY.md`. Update nav files when making structural changes.

## Commands

```bash
npm run dev              # Start Vite frontend + Express backend
npm run dev:client       # Vite only (port 5173)
npm run dev:server       # Express only (port 3001)
npm run build            # Production build
npm run lint             # ESLint
```

## Tech Stack

React + Vite + Three.js via @react-three/fiber | Zustand + Zundo (undo/redo, 50-step) | Tailwind CSS + CSS variables (`var(--ui-*)`) | Express backend on port 3001 | react-router-dom (HashRouter) | Lucide React icons | xlsx-js-style (dynamic import for XLSX read/write) | **No TypeScript, no tests**

## Architecture

**Comparison Module** (legacy): `Viewer3D` + `ParameterPanel` + `SceneContent`. State: `existing`/`proposed` + `comparisonRoads`.

**District Module** (entity-based): `DistrictViewer` + `DistrictParameterPanel` + `DistrictSceneContent` + `LotEntity`. State: `entities.lots[lotId]` with `buildings: { principal, accessory }` + expanded setbacks. Lot 1 in +X from origin, Lots 2+ in -X. Visibility: `layers.X && lotVisibility[lotId].X`.

**Entity hooks** in `useEntityStore.js`. Factory functions: `createDefaultLot()`, `createDefaultLotStyle()`, `createDefaultRoadModule()`, `createDefaultLotVisibility()`.

**Store** (`useStore.js`, ~4,000 lines, v34): Persist `merge` function patches missing keys on every hydration. Dash param migration: old `dashScale=5` regime auto-converted to `dashScale=1` with scaled-up sizes. See code for full merge logic.

**Scenarios** (`ScenariosSection` in `DistrictParameterPanel.jsx`): Auto-saves active scenario before switching. Re-clicking active scenario triggers save. Duplicate button creates a copy under a new name. Active scenario shown with accent dot indicator. "Save as New" button shown when no scenario is active. **Known bug**: `handleApplyStyleToAll()` has a per-lot merge for `entityStyles`/`lotVisibility` that was intended to prevent lot disappearance across scenarios with different lot counts, but the fix isn't working yet — needs further investigation.

**Saved Views**: Complete visual snapshots via `buildViewSnapshot()` (exported from `DistrictParameterPanel.jsx`) — the single source of truth for what's in a view. Fields: camera position/target/zoom, projection, layers, `entityStyles`, `roadModuleStyles`, `lotVisibility`, `dimensionSettings`, `sunSettings`, `annotationSettings`, `backgroundMode`, `renderSettings`, `lighting`, `annotationCustomLabels`, `annotationPositions`, `drawingLayers` (visibility only). NOT in views: camera zoom/position (auto-fits), parameter values (project-specific), imported 3D models (project-specific), `drawingObjects`/`drawingLayerOrder` (persistent content, not view style). Restore via `applyViewSnapshot()` (exported from `DistrictParameterPanel.jsx`, non-camera state) — used by sidebar load, view import, and batch export. Drawing layers: views only toggle `visible` flag on existing layers, never replace drawing objects. Old views without new fields load fine (`if (saved.X)` guards); old views with full `drawingObjects` data have those fields ignored on load. **Known issue (2026-03-18)**: Some existing project scenarios may have stale drawing/annotation data baked into saved views from before this fix — needs manual re-save per affected view. Also investigate whether `annotationSettings.fontSize` reset on view load is causing road label shrinking. `_cameraControlsRef` (transient) set by `DistrictViewer` for sidebar `ViewsSection` access to camera controls. Both sidebar and canvas overlay REC use `buildViewSnapshot()`. **Cross-project export/import**: Views export as JSON with `sourceLotOrder` for lot-index remapping on import. Import remaps `entityStyles`, `lotVisibility`, and `annotationCustomLabels` lot keys by index. Camera presets preserved but position nulled (auto-fits). Download/Upload buttons in Views `<Section>` `headerRight`.

**Lot Access Arrows**: `LotAccessArrow.jsx` renders flat 2D arrows + shared drive T-junctions. Style props: `scale` (width), `heightScale` (length/height axis), `positionOffsetX`/`positionOffsetY` (additive offsets applied in `LotEntity.jsx` after drag position). Scale range 0.5–15. Shared drive uses separate `sharedDriveArrow` style key with outline controls.

**Lot Access Visibility**: Per-direction layer + lotVisibility keys: `lotAccessFront`, `lotAccessRear`, `lotAccessSideStreet`, `lotAccessSharedDrive`. Style key remains singular `lotAccessArrows` (shared across all directions). Old `lotAccessArrows` visibility key kept in layer defaults for backward compat.

**Imported Models** (v33): Multi-model per lot. `lot.importedModels` (object map by modelId) + `lot.importedModelOrder` (array). Actions take `(lotId, modelId, ...)`. Selection state: `selectedImportedModel: { lotId, modelId }` (transient). Style editing via `ImportedModelStylePopup.jsx` floating panel in `DistrictViewer`. Sidebar (`ModelImportSection`) shows compact model lists — click name to select, style in popup. Edge line widths scale with `exportLineScale` (passed as `lineScale` prop) for WYSIWYG exports — same pattern as all other line components.

**Height Planes**: Use `<shapeGeometry>` from `activeVertices` (not bounding-box `<planeGeometry>`), so planes conform to polygon/L-shaped building footprints. Border uses same vertex loop. Group at `[0, 0, maxHeight + 0.05]` — no XY offset since vertices encode position. `MaxHeightPlaneStandalone` in `LotEntity.jsx` renders height planes independently when the building layer is off — conditions are mutually exclusive with BuildingEditor's own height plane rendering.

**Placement Zone**: `PlacementZone` in `LotEntity.jsx` renders a ground-plane polygon highlighting the area between min and max front/side street setbacks — the zone where a building must be placed. Derives from existing `maxFront`/`maxSideStreet` setback values (no new params). Geometry: front-only strip, side-only strip(s), L-shape, or U-shape (with `THREE.Shape` hole). Fill at z=0.06, outline at z=0.065. Hybrid style key `placementZone` (fill color/opacity + line color/width/dash). Distinct from BTZ planes (vertical facade percentage planes).

**Dimension Positioning**: 4 per-side position sliders in `dimensionSettings`: `frontSetbackDimPosition` / `rearSetbackDimPosition` (X along lot width, 0=left, 1=right) and `leftSetbackDimPosition` / `rightSetbackDimPosition` (Y along lot depth, 0=front, 1=rear). Range -0.5–1.5 (extends beyond lot boundaries). Old `sideSetbackDimYPosition` deprecated but kept; merge inherits left/right from it. Affects SetbackLines, MaxSetbackLines, and ParkingSetbackLines (10 locations in LotEntity.jsx).

**Drawing Editor**: Layer-based 2D drawing system overlaid on the 3D scene. **District module only** — not available in Comparison module. Files in `src/components/DrawingEditor/`. Tools: select, freehand, line, arrow, double arrow, polygon, rectangle, rounded rect, circle, ellipse, octagon, star, text, leader, elbow leader, dimension, eraser. Objects stored in `drawingObjects` (by objectId), organized into `drawingLayers`. `DrawingCapturePlane` handles pointer events + live preview. `DrawingObjectRenderer` dispatches to per-type sub-renderers (module-scope components). `DrawingSelectionOverlay` renders bounding box + type-specific resize/vertex handles. `DrawingPropertiesPanel` shows stroke/fill/text/outline controls for selected objects. `DrawingTextInput` is an HTML overlay for text/leader input. `drawingHitTest.js` has hit-testing + bounding box + move-update logic for all types. `drawingDefaults` in store holds defaults for new objects (stroke, fill, text, arrowHead, elbowLength, etc.) with merge patching for new keys. Drawing dash values use `dashScale=1, dashSize=3, gapSize=2` (world-space feet, matching model dimensions). Double arrow creates `type: 'arrow'` with `arrowHead: 'both'`. Elbow leader creates `type: 'leader'` with `elbow: true, elbowLength: N` — `LeaderCallout.jsx` handles the bent line rendering. Dimension creates `type: 'dimension'` wrapping the existing `Dimension` component with `endMarker: 'arrow'`. LeaderCallout accepts optional `font` prop (URL) passed through to AnnotationText. Drawing text/leader/dimension renderers use `depthTest={false}` so overlays render on top of 3D content. Leader and dimension drawing objects support per-object `outlineWidth`/`outlineColor`. Camera controls disabled via `enabled={!drawingMode}` React prop on `CameraControls` in `SharedCanvas.jsx` — imperative `controls.enabled` toggles in handlers are redundant but harmless.

**Style Presets**: Three preset systems for saving/loading named style configurations:
- **Label Presets** (`/api/label-presets`): Custom label text. Store: `activeLabelPresetName`.
- **Dimension Presets** (`/api/dimension-presets`): Dimension style settings (colors, line widths, text size, offsets) — excludes `customLabels`. Store: `getDimensionPresetData()`/`applyDimensionPreset()`, `activeDimensionPresetName`.
- **Annotation Presets** (`/api/annotation-presets`): Annotation style settings (`annotationSettings`). Store: `getAnnotationPresetData()`/`applyAnnotationPreset()`, `activeAnnotationPresetName`.

All three use the same Express route pattern (`server/routes/{type}-presets.js`) with JSON file storage in `data/{type}-presets/`. UI sections in `DistrictParameterPanel.jsx` follow identical save/load/delete/rename dropdown pattern. Active preset name tracked in store and shown in dropdown; clears on manual style edit.

**Import Wizard** (`ImportWizard.jsx`): 3-step modal (upload → mapping → preview/import). Accepts CSV and Excel (.xlsx/.xls). Transposed format (params as rows, districts as columns) auto-detected and skips to step 3. `TRANSPOSED_ROW_MAP` in `importParser.js` is the single source of truth for parameter layout — used by both parser and template generator. BTZ fields are inlined under their setback sections (e.g., "BTZ - Front (%)" under "SETBACKS — PRINCIPAL"). Old templates with separate "BUILD-TO ZONE" sections still parse correctly via `TRANSPOSED_SECTION_ALIASES`. `templateGenerator.js` builds a styled .xlsx template via dynamic `import('xlsx-js-style')` to keep it out of the main bundle. `parseXLSXToCSV()` converts Excel to the same `{ headers, rows }` format as CSV, so all downstream detection/parsing is shared.

## Conventions (CRITICAL)

### Numeric & Rendering Guards
- **`??` not `||`** for numeric fallbacks — respects explicit `0`
- **`!= null && > 0`** guard before rendering any geometry/dimension
- **Opacity defaults to 1.0** — sub-1.0 causes Three.js transparent sorting issues
- **`transparent={opacity < 1}`** + **`depthWrite={opacity >= 0.95}`** — never hardcode `transparent={true}`

### Zustand Patterns
- **`useShallow`** when selecting objects from store — prevents infinite re-renders
- **Undo batching**: `pause()` on pointer down, `resume()` on pointer up for all drags
- **4-place update** for new style/visibility/layer keys: `createDefaultLotStyle()`, `createDefaultLotVisibility()`, `viewSettings.layers`, persist `merge` function. For custom labels: also add to initial `customLabels` object + `customLabelDefaults` in merge
- **`=== undefined`** for existence checks in merge patching (not `!value` which catches `0`, `false`, `''`)

### Export System
- **Reactive `exportSettings` subscription** in viewer components — use `useStore(s => s.viewSettings.exportSettings)`, never `getState()` for controlled `<select>` values
- **`gl.setSize(w, h, false)` for export capture** — `false` prevents CSS update which would trigger R3F's ResizeObserver to race the capture. Restore call uses `true` to re-sync CSS.
- **Batch export applies full view snapshots**: Queue items carry the full `snapshot` object. `Exporter.jsx` calls `applyViewSnapshot()` per item (layers, entityStyles, lotVisibility, customLabels, dimensionSettings, etc.), then restores pre-export state via `buildViewSnapshot()`/`applyViewSnapshot()` after all items complete.
- **Export naming**: Single exports: `{scenario}_{date}.{ext}`. Batch ZIP files: `{scenario}_{viewname}_{camera}_{date}.{ext}`. Batch ZIP archive: `{scenario}_batch_{date}.zip`. `sanitizeFilename()` strips non-alphanumeric chars. Helpers in `Exporter.jsx` (`buildSingleExportName`, `sanitizeFilename`) and `DistrictParameterPanel.jsx` (`buildExportLabel`, `sanitizeExportName`). Constants `CAMERA_VIEWS`, `RESOLUTION_PRESETS`, `sanitizeExportName`, `buildExportLabel` are exported from `DistrictParameterPanel.jsx`.
- **Mass export** (`MassExportModal.jsx`): Exports multiple scenarios as one ZIP per scenario. Modal UI in `BatchExportSection` with scenario checkboxes, view+camera grid, format/resolution. Store state: `massExportActive`, `massExportPlan`, `massExportProgress`, `massExportOriginalScenario`, `massExportOriginalSnapshot` (all transient — excluded from persist/Zundo, reset on hydration). Actions: `startMassExport(plan)`, `advanceMassExport()`, `completeMassExport()`, `cancelMassExport()`. Orchestrator `useEffect` in `Exporter.jsx` loads scenarios sequentially via `api.loadScenario()`, feeds views into existing batch queue, waits for ZIP download, then advances. On completion, restores original scenario + snapshot. Batch completion skips view-restore when mass export is active.
- **Dashed line export fix (DO NOT DELETE — hard-won fix, two layers)**:
  - **Layer 1 — `onBeforeRender` override**: drei's `<Line>` resets `LineMaterial.resolution` to viewport size via `onBeforeRender` on every render call. During export, the GL buffer is export-sized but resolution stays at viewport size → dashed lines render as twisted 3D ribbons. Fix: `freezeLineResolution()` in `Exporter.jsx` temporarily replaces `onBeforeRender` on all Line2 instances to force export resolution during capture, then restores original callbacks after. Simply setting `material.resolution` before render does NOT work because drei overrides it during `gl.render()`.
  - **Layer 2 — per-tile resolution in `renderTiled()`**: `LineMaterial`'s vertex shader uses `resolution.x / resolution.y` for aspect-ratio correction of line perpendicular offsets. When tiling (8K), each tile renders to a tile-sized viewport (e.g., 4096×4096 = 1:1 aspect) but if resolution is frozen to the full export dimensions (7680×4320 = 16:9 aspect), the shader applies 16:9 correction to 1:1 pixels → **perpendicular direction skews → parallelogram dashes**. Fix: `freezeLineResolution()` returns `{ setResolution(w, h), restore() }` using a shared `Vector2`. The tiled path calls `lineFreeze.setResolution(tileW, tileH)` before each tile render so the shader's aspect ratio matches the actual tile viewport. This only affects resolutions that trigger tiling (currently 8K where `width > 4096 || height > 4096`).
  - **If dashed lines ever look wrong in exports again**: (1) Check that `onBeforeRender` replacement is still happening in `freezeLineResolution`. (2) Check that tiled renders pass tile dimensions (not full export dimensions) to `setResolution`. (3) Verify `TILE_SIZE` constant at top of `Exporter.jsx`.

### React + Three.js Rules
- **NEVER define components inside render functions** — causes unmount/remount render loops
- **NEVER put `return null` before hooks** — all hooks must come BEFORE any early return
- **No ContactShadows** — Y-up assumption causes z-fighting in Z-up scenes
- **PostProcessing before GizmoHelper** in `SharedCanvas.jsx` / `Viewer3D.jsx`
- **`renderOrder` doesn't work on drei `<Line>`** — use z-offset separation instead
- **Line dash values are world-space feet** — `dashScale=1`, `dashSize`/`gapSize` in feet (e.g., `dashSize: 3, gapSize: 2` = 3ft dash, 2ft gap). Custom sliders: 0.5–20ft. RoadModule `<Line>` must pass `dashScale` prop.
- **Google Fonts**: Troika-three-text does NOT support woff2 — always use `.woff` or `.ttf`
- **MoveHandle**: `depthTest={false}` + `renderOrder={8}` at `zPosition={1}`. Visibility via `parentHovered` prop. Drag plane uses `opacity={0}` (not `visible={false}`, which blocks raycasting).
- **Dimension verticalMode text rotation**: Uses quaternion composition (`alignToLine * standUp`) not raw Euler angles — handles both X-axis and Y-axis dimension lines correctly.

### Street-Aware Setbacks
`streetSides` prop determines which lot sides face streets. Street-facing sides use `minSideStreet`/`maxSideStreet`; interior sides use `sideInterior`. Critical for corner lots. Dimension custom labels use semantic keys `setbackSideStreet`/`setbackSideInterior` (not positional left/right) — each lot resolves per-side based on `streetSides`. Parking setback dims use independent `parkingSetback*` label keys; max setback dims use `setbackMaxFront`/`setbackMaxSideStreet`.

**Per-Side Interior Overrides** (townhome support): Optional `sideInteriorLeft` and `sideInteriorRight` fields in `setbacks.principal`, `setbacks.accessory`, and `parkingSetbacks`. Default `null` — falls back to `sideInterior`. When non-null, overrides `sideInterior` for that specific side via `(sideInteriorLeft ?? sideInterior)` pattern. Used in 8 locations in `LotEntity.jsx` (`computeSetbackInner`, `SetbackFillOutline`, `SetbackLines`, `MaxSetbackLines`, `AccessorySetbackLines`, `PlacementZone`, `ParkingSetbackLines`, `LotAnnotations`). UI rows "Side, Int. Left (ft)" / "Side, Int. Right (ft)" in `DistrictParameterPanel.jsx`. Merge function patches missing keys to `null`.

### Road System
Roads stop at lot boundaries. Intersection fills use notched geometry with quarter-circle cutouts (`intersectionGeometry.js`). S3 (Alley) T-junctions: fillets/fills suppressed when meeting non-S3. Road types: S1 (Primary, ROW 50'), S2 (Secondary, ROW 40'), S3 (Alley, ROW 20'). Alley-specific style keys default `null` (fall back to regular style).

## Active Task: KNOX Integration Test

**Goal**: Test the full import pipeline with all 18 Knox districts + cross-project view import.

**Status (2026-03-16)**: Scripts run and pass automated verification, but **saved views do not work in the app**. Two attempts made:
1. `scripts/knox-import.mjs` — Clone-and-stamp from KNOX-LI (camera-only views). Views copied but were only camera position — no layer/style/visibility changes applied.
2. `scripts/knox-copy-views.mjs` — Copied full-snapshot views from Knox_Light_Industrial (which has proper LOT/SETBACKS/HEIGHT/ACCESS/PARKING views with layers, entityStyles, lotVisibility, dimensionSettings, etc.), remapped lot IDs. Script passes all checks but views still don't work in-app.

**Root cause unknown** — needs investigation. Likely candidates: (a) `applyViewSnapshot()` in the app may not handle the view format the scripts produce, (b) lot ID remapping may be incomplete (missing keys beyond entityStyles/lotVisibility/annotationCustomLabels/annotationPositions), (c) the view slot keys (1-5) may not match what the app expects, (d) savedViews may need to live inside `viewSettings` not at state root depending on app version.

**Scripts**:
- `scripts/knox-import.mjs` — Clone-and-stamp: reads KNOX-LI, clones styling, stamps 18 districts by swapping `districtParameters`. All scenarios share one lot ID.
- `scripts/knox-copy-views.mjs` — Copies 5 full-snapshot saved views from Knox_Light_Industrial → KNOX with lot ID remapping.

**What knox-import.mjs does**:
1. Parses `docs/Knox District Parameters.xlsx` using mirrored `TRANSPOSED_ROW_MAP` logic (18 districts)
2. `GET /api/projects/KNOX-LI` — reads first lot's `entityStyles`, `lotVisibility`, `roadModule`, `roadModuleStyles`, `viewSettings`, `renderSettings`, `sunSettings`, etc.
3. Builds reference snapshot matching `getSnapshotData()` format (1 lot, stripped `importedModels`)
4. Creates/resets KNOX project, stamps 18 scenarios (deep-clone snapshot + swap `districtParameters`)
5. Sets project state with first district's params

**Next steps to debug saved views**:
- Inspect `applyViewSnapshot()` in `DistrictParameterPanel.jsx` to see what keys it reads from a view
- Compare a working view (saved interactively in-app) vs script-generated view structure
- Check if `savedViews` location (state root vs `viewSettings.savedViews`) matters
- Verify the view slot keys match (numeric "1"-"5" vs other format)

**Key design decisions**:
- 1 lot per scenario (not 2) — KNOX-LI is single-lot composition
- Stable shared lot ID across all 18 scenarios — `applySnapshot()` restores `entityStyles[lotId]`
- Styles cloned from KNOX-LI project state (not its scenarios, which have defaults)

**Key reference**: KNOX-LI project at `/Users/oliverseabolt/Documents/ZoningProjects/KNOX-LI/`. Knox_Light_Industrial has the working full-snapshot views. Knox spreadsheet section headers match `TRANSPOSED_ROW_MAP` in `src/utils/importParser.js`. `importParser.js` recognizes "Custom Labels" column header (Knox spreadsheet uses this instead of "Diagram Key").

## Git

- **Branches**: `main` only

## User Shortcuts

- **/PUCP** — Update CLAUDE.md, commit all changes, push to GitHub.
