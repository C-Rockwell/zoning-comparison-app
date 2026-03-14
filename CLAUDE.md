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

**Saved Views**: Comprehensive state snapshots — camera position/target/zoom, projection, layers, plus `entityStyles`, `roadModuleStyles`, `lotVisibility`, `dimensionSettings`, `sunSettings`, `annotationSettings`. Custom names per slot (editable inline). Old views without new fields load fine (`if (saved.X)` guards). `_cameraControlsRef` (transient) set by `DistrictViewer` for sidebar `ViewsSection` access to camera controls. Both sidebar and canvas overlay REC save the full snapshot.

**Lot Access Arrows**: `LotAccessArrow.jsx` renders flat 2D arrows + shared drive T-junctions. Style props: `scale` (width), `heightScale` (length/height axis), `positionOffsetX`/`positionOffsetY` (additive offsets applied in `LotEntity.jsx` after drag position). Scale range 0.5–15. Shared drive uses separate `sharedDriveArrow` style key with outline controls.

**Lot Access Visibility**: Per-direction layer + lotVisibility keys: `lotAccessFront`, `lotAccessRear`, `lotAccessSideStreet`, `lotAccessSharedDrive`. Style key remains singular `lotAccessArrows` (shared across all directions). Old `lotAccessArrows` visibility key kept in layer defaults for backward compat.

**Imported Models** (v33): Multi-model per lot. `lot.importedModels` (object map by modelId) + `lot.importedModelOrder` (array). Actions take `(lotId, modelId, ...)`. Selection state: `selectedImportedModel: { lotId, modelId }` (transient). Style editing via `ImportedModelStylePopup.jsx` floating panel in `DistrictViewer`. Sidebar (`ModelImportSection`) shows compact model lists — click name to select, style in popup. Edge line widths scale with `exportLineScale` (passed as `lineScale` prop) for WYSIWYG exports — same pattern as all other line components.

**Height Planes**: Use `<shapeGeometry>` from `activeVertices` (not bounding-box `<planeGeometry>`), so planes conform to polygon/L-shaped building footprints. Border uses same vertex loop. Group at `[0, 0, maxHeight + 0.05]` — no XY offset since vertices encode position. `MaxHeightPlaneStandalone` in `LotEntity.jsx` renders height planes independently when the building layer is off — conditions are mutually exclusive with BuildingEditor's own height plane rendering.

**Placement Zone**: `PlacementZone` in `LotEntity.jsx` renders a ground-plane polygon highlighting the area between min and max front/side street setbacks — the zone where a building must be placed. Derives from existing `maxFront`/`maxSideStreet` setback values (no new params). Geometry: front-only strip, side-only strip(s), L-shape, or U-shape (with `THREE.Shape` hole). Fill at z=0.06, outline at z=0.065. Hybrid style key `placementZone` (fill color/opacity + line color/width/dash). Distinct from BTZ planes (vertical facade percentage planes).

**Dimension Positioning**: Side setback dimensions use `sideSetbackDimYPosition` (0=front, 0.5=center, 1=rear) in `dimensionSettings` to control where left/right dims render along lot depth. Applies to both regular and parking setback side dims.

**Import Wizard** (`ImportWizard.jsx`): 3-step modal (upload → mapping → preview/import). Accepts CSV and Excel (.xlsx/.xls). Transposed format (params as rows, districts as columns) auto-detected and skips to step 3. `TRANSPOSED_ROW_MAP` in `importParser.js` is the single source of truth for parameter layout — used by both parser and template generator. `templateGenerator.js` builds a styled .xlsx template via dynamic `import('xlsx-js-style')` to keep it out of the main bundle. `parseXLSXToCSV()` converts Excel to the same `{ headers, rows }` format as CSV, so all downstream detection/parsing is shared.

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
- **Dashed line export fix (DO NOT DELETE — hard-won fix)**: drei's `<Line>` resets `LineMaterial.resolution` to viewport size via `onBeforeRender` on every render call. During export, the GL buffer is export-sized but resolution stays at viewport size → dashed lines render as twisted 3D ribbons. Fix: `freezeLineResolution()` in `Exporter.jsx` temporarily replaces `onBeforeRender` on all Line2 instances to force export resolution during capture, then restores original callbacks after. Both tiled and non-tiled paths use this. **If dashed lines ever look wrong in exports again, check that `onBeforeRender` replacement is still happening — simply setting `material.resolution` before render does NOT work because drei overrides it during `gl.render()`.**

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

### Road System
Roads stop at lot boundaries. Intersection fills use notched geometry with quarter-circle cutouts (`intersectionGeometry.js`). S3 (Alley) T-junctions: fillets/fills suppressed when meeting non-S3. Road types: S1 (Primary, ROW 50'), S2 (Secondary, ROW 40'), S3 (Alley, ROW 20'). Alley-specific style keys default `null` (fall back to regular style).

## Git

- **Branches**: `main` only

## User Shortcuts

- **/PUCP** — Update CLAUDE.md, commit all changes, push to GitHub.
