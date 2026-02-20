# CLAUDE.md

## Project Overview

React Three Fiber zoning visualization app with two modules:
1. **Comparison Module** — Side-by-side existing vs. proposed zoning (split-screen 3D)
2. **District Module** — Multi-lot composition (up to 5 lots), principal + accessory buildings, multi-direction roads

Express.js backend for project persistence. See `CODEBASE_NAV.md` for file/function/action index — consult it BEFORE searching the codebase. Update it when making structural changes.

## Commands

```bash
npm run dev              # Start Vite frontend + Express backend
npm run dev:client       # Vite only (port 5173)
npm run dev:server       # Express only (port 3001)
npm run build            # Production build
npm run lint             # ESLint
```

## Tech Stack

React 19 + Vite 7 + Three.js 0.182 via @react-three/fiber 9.4 | Zustand 5 + Zundo 2.3 (undo/redo, 50-step) | Tailwind CSS 3.4 + CSS variables (`var(--ui-*)`) | Express 5 backend on port 3001 | react-router-dom 7 (HashRouter) | Lucide React icons | **No TypeScript, no tests**

## Two Module Architecture

**Comparison Module** (legacy): Route `/app` + `activeModule === 'comparison'`
- Components: `Viewer3D` + `ParameterPanel` + `SceneContent`
- State: `existing` / `proposed` objects + `comparisonRoads`

**District Module** (entity-based): Route `/app` + `activeModule === 'district'`
- Components: `DistrictViewer` + `DistrictParameterPanel` + `DistrictSceneContent` + `LotEntity`
- State: `entities.lots[lotId]` — each lot has `buildings: { principal, accessory }` + expanded setbacks
- Lot layout: Lot 1 in +X from origin (0,0 = front-left corner), Lots 2+ in -X
- Visibility: `layers.X && lotVisibility[lotId].X` (global layers override per-lot)
- Sidebar order: **Scenarios** → Model Setup → Layers → Annotations → District Parameters → Model Parameters → Styles → **Dimensions** → Analytics → Building/Roof → Road Modules → Road Module Styles → Views → Batch Export

## State Structure (useStore.js ~3,700 lines, v24)

**Entity System** (District):
- `entities.lots[lotId]` — lot data with buildings, setbacks (principal + accessory)
- `entityOrder` — lot IDs in display order
- `entityStyles[lotId]` — per-lot styles (12 categories)
- `lotVisibility[lotId]` — per-lot visibility toggles
- `modelSetup` — numLots, streetEdges, streetTypes (S1/S2/S3)
- `districtParameters` — informational zoning data (not visualized)
- `scenarios[]` / `activeScenario` — list of district scenario metadata + active name (loaded from backend per project)
- Factory functions: `createDefaultLot()`, `createDefaultLotStyle()`, `createDefaultRoadModule()`, `createDefaultLotVisibility()`

**Other key state**: `viewSettings` (camera, export, batch queue), `layerVisibility` (26+ layers), `dimensionSettings`, `annotationSettings`, `annotationCustomLabels`, `annotationPositions`, `styleSettings`, `roadModule`, `roadModuleStyles` (17 categories: 11 base + 6 alley-specific), `sunSettings`, `moveMode` (transient, excluded from persist/Zundo), `roadModuleStylesSnapshot` (transient — global style toggle revert)

**Store version 24**: Migrations v1–v23. Persist `merge` function patches missing `entityStyles`, `lotVisibility`,
`viewSettings.layers`, `roadModuleStyles`, `dimensionSettings`, and `annotationSettings` keys on every hydration.

**Undo/redo**: Tracks entities, entityOrder, entityStyles, lotVisibility, existing, proposed, viewSettings, sunSettings, roadModule, roadModuleStyles, comparisonRoads, annotationSettings, annotationCustomLabels, annotationPositions. Excludes export flags.

**Entity hooks** (`useEntityStore.js`): `useLot(lotId)`, `useLotIds()`, `useActiveLot()`, `useActiveLotId()`, `useLotStyle(lotId)`, `useBuilding(lotId, type)`, `useRoadModules()`, `useLotVisibility(lotId)`, `useActiveModule()`, `useModelSetup()`, `useDistrictParameters()`, `useEntityCount()`, `getLotData(lotId)` (non-hook)

## Import Patterns

```javascript
import { useStore, DIMENSION_FONT_OPTIONS } from './store/useStore'
import { useLot, useLotIds, useActiveLot } from '../hooks/useEntityStore'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
const { undo, redo } = useStore.temporal.getState()
```

## Dimension System

`dimensionSettings` lives at `viewSettings.styleSettings.dimensionSettings`. Full field list:

- **Lines**: `lineColor`, `lineWidth`, `extensionLineColor` (null = inherit), `extensionLineStyle` ('dashed'|'solid'), `extensionWidth`
- **Markers**: `endMarker` ('tick'|'arrow'|'dot'), `markerColor` (null = inherit), `markerScale` (multiplier)
- **Text**: `textColor`, `fontSize`, `fontFamily` (resolved to URL via `DIMENSION_FONT_OPTIONS`), `outlineColor`, `outlineWidth`, `textMode` ('follow-line'|'billboard'), `textBackground` {enabled, color, opacity, padding}
- **Positioning**: `setbackDimOffset` (default 5), `lotDimOffset` (default 15), `unitFormat`, `autoStack`, `stackGap`
- **Vertical mode**: `verticalMode` (false=XY plan, true=Z upward), `verticalOffset`
- **Custom labels**: `customLabels.{lotWidth|lotDepth|setbackFront|setbackRear|setbackLeft|setbackRight|buildingHeight|principalMaxHeight|accessoryMaxHeight}` — each `{mode:'value'|'custom', text:''}`

`DIMENSION_FONT_OPTIONS` exported from `useStore.js` — array of `{label, url}` for 6 Google Fonts.
Store actions: `setDimensionSetting(key, value)`, `setCustomLabel(key, mode, text)`.
UI: `ParameterPanel.jsx` (Comparison) and `DimensionStylesSection` in `DistrictParameterPanel.jsx` (District).
Offsets in `LotEntity.jsx` read from `dimensionSettings` (no longer hardcoded).

## Conventions (CRITICAL)

### Numeric & Rendering Guards
- **`??` not `||`** for numeric fallbacks — respects explicit `0`
- **`!= null && > 0`** guard before rendering any geometry/dimension
- **Opacity defaults to 1.0** — sub-1.0 causes Three.js transparent sorting issues
- **`transparent={opacity < 1}`** + **`depthWrite={opacity >= 0.95}`** — never hardcode `transparent={true}`

### Zustand Patterns
- **`useShallow`** when selecting objects from store — prevents infinite re-renders
- **Undo batching**: `pause()` on pointer down, `resume()` on pointer up for all drags
- **4-place update** for new style/visibility/layer keys: `createDefaultLotStyle()`, `createDefaultLotVisibility()`, `viewSettings.layers`, persist `merge` function

### renderOrder Map
Road zones=0, intersection fill=1, alley fill=1, fillet fills=2, fillet lines=3, building faces=4, roof=4, BTZ planes=5, max height plane=6, move handle=8, height handle ring=9, sphere=10. **Note**: `renderOrder` doesn't work reliably on drei `<Line>` — use z-offset separation instead.

### Z-Layer Map (Lot Geometry)
Lot fill (z=0.02) → lot lines (0.03) → min setbacks (0.1) → accessory setbacks (0.11) → max setbacks (0.12) → lot access arrows (0.15) → BTZ planes (vertical)

### Street-Aware Setbacks
`streetSides` prop (from `DistrictSceneContent` via `modelSetup.streetEdges`) determines which lot sides face streets. Street-facing sides use `minSideStreet`/`maxSideStreet`; interior sides use `sideInterior`. Critical for corner lots.

### Road Intersection System
Roads stop at lot boundaries. Intersection fills use notched `THREE.Shape` geometry (z=0.04, renderOrder=1) with concave quarter-circle cutouts matching fillet outer radii — prevents z-fighting with fillet arcs. Utilities in `intersectionGeometry.js`: `computeFilletOuterRadius()` returns total zone depth, `createNotchedRectShape()` creates centered shape with per-corner notch radii. Fillet arcs (z=0.05, renderOrder=2) handle curved corners with arc lines at z=0.055. End-edge lines suppressed via `suppressLeftEnd`/`suppressRightEnd` on RoadModule.

**S3 (Alley) T-Junctions**: When S3 meets non-S3, fillets/fills suppressed. Non-S3 road extends through S3 ROW. Small alley fill rects connect alley pavement to cross-street (z=0.077). Alley fills use independent `alleyIntersectionFill` style (with `?? intersectionFill` fallback). All S3 road geometry raised by z=0.042ft (0.5 inches) to prevent z-fighting with perpendicular roads.

**Alley-Specific Styles**: 6 keys (`alleyRoadWidth`, `alleyRightOfWay`, `alleyVerge`, `alleyParking`, `alleySidewalk`, `alleyTransitionZone`) — all default `null` (use regular style). When set, `RoadModule.jsx` merges alley overrides onto base styles: `{ ...baseStyle, ...alleyOverride }`. Alley keys are symmetric (same style for both sides of alley). Global style actions update alley keys only when non-null.

**Road types**: S1 (Primary, ROW 50', road 24'), S2 (Secondary, ROW 40', road 24'), S3 (Alley, ROW 20', road 16')

### Move Mode (M Key, District Only)
AutoCAD-style 3-phase: selectObject → selectBase (pause undo, disable camera) → moving (capture plane at z=200 handles placement). `BuildingEditor` handles phases 1-2, `MoveModeCapturePlane` in `DistrictSceneContent` handles phase 3. Transient state excluded from persist/Zundo.

### Other Conventions
- **N8AO**: `aoIntensity: 0.8`, `aoRadius: 0.3` — higher values cause artifacts at fillet corners
- **Shadow camera**: `target-position={[0, 50, 0]}` centers frustum on ground plane (y=50)
- **Lot access arrow bounds**: Validated against lot bounds + 20ft margin; stale positions fall back to defaults
- **Edge extrude**: Sends DELTA per pointer move (not cumulative) — additive displacement
- **CameraControls**: `dollySpeed={0.25}`, `smoothTime={0.35}`
- **Building style split** (v22): `principalBuildingEdges`/`Faces` and `accessoryBuildingEdges`/`Faces` — wired with `??` fallback to `buildingEdges`/`buildingFaces`
- **NEVER define components inside render functions** — causes React to unmount/remount on every render, triggering render loops and locking the app. Always define at module level. Use `DimSubSection`/`DimDivider` in `DistrictParameterPanel.jsx` as the correct pattern.
- **NEVER put `return null` before hooks** — all `useState`, `useRef`, `useMemo`, `useCallback`, `useThree`, `useStore` etc. must come BEFORE any early return. Putting `if (!visible) return null` above hooks causes "Rendered more hooks than during the previous render" crash (white screen). Fixed in: `DraggableLabel.jsx`, `AnnotationText.jsx`, `RoadAnnotations.jsx`, `RoadModule.jsx`.

## Style Categories (12)
Lot Lines, Setbacks, Accessory Setbacks, Max Setbacks, BTZ Planes, Lot Access Arrows, Principal Building Edges/Faces, Accessory Building Edges/Faces, Roof, Max Height Plane

## Backend API

Config at `~/.zoning-app-config.json`. Projects at `{projectsDir}/{id}/` with `project.json`, `images/`, `models/`, `snapshots/`, `layer-states/`, `scenarios/`.

Endpoints: `/api/health`, `/api/config` (GET/PUT), `/api/projects/:id` (CRUD), `/api/projects/:id/exports/:filename`, `/api/projects/:id/snapshots/:name`, `/api/projects/:id/layer-states/:name`, `/api/projects/:id/scenarios/:name`, `/api/style-presets` (list/save/load/delete — stored in `{projectsDir}/style-presets/`)

## Untested Features

- **Scenarios System** (runtime-tested): Multi-district configurations per project. Each scenario = full model state JSON stored in `{projectId}/scenarios/`. `ScenariosSection` in `DistrictParameterPanel.jsx` — dropdown to switch districts, Save/New/Delete, "Styles → All" button, **Import CSV button** (opens same ImportWizard as District Parameters). No hardcoded scenario count limit. `server/routes/scenarios.js` mirrors snapshots route. Store: `scenarios[]`, `activeScenario`, `setScenarios`, `setActiveScenario`. API: `listScenarios`, `saveScenario`, `loadScenario`, `deleteScenario` in `api.js`.
- **Style Presets** (built, not runtime-tested): Save/load named style presets (entityStyles + roadModuleStyles) via backend. `StylesSection` in `DistrictParameterPanel.jsx`. Actions: `getStylePresetData`, `applyStylePreset`. API: `saveStylePreset`, `loadStylePreset`, `listStylePresets`, `deleteStylePreset` in `api.js`.
- **District CSV Batch Import** (runtime-tested): `parseAllDistrictRows()` in `importParser.js` — processes all rows (not just row 0). `_districtName`/`_districtCode` meta fields in `DISTRICT_FIELDS`. ImportWizard creates one scenario per CSV row when a project is open; falls back to single-district store import if no project. Accessible from both ScenariosSection and DistrictParametersSection headers.
- **Batch Export**: Queue saved views × camera angles → ZIP download. Uses `exportQueue`/`isBatchExporting` in viewSettings, JSZip in Exporter.jsx, BatchExportSection in DistrictParameterPanel.
- **Road Module Styles Overhaul** (4 changes, builds but not runtime-tested):
  - Global style toggle: checkbox enables/disables global Color/Opacity/Line Width controls; snapshot stored in Zustand (`roadModuleStylesSnapshot`, transient) for revert on toggle-off or Reset
  - Alley-specific zone styles: 6 new `roadModuleStyles` keys with `null` defaults, merge-based resolution in `RoadModule.jsx`, "Alley Zones" UI section in panel
  - S3 z-offset: alley road groups raised z=0.042, alley fill rects z=0.077 (was 0.035)
  - Collapsible defaults: all zone sections start collapsed, Left/Right Side group toggles, Expand All / Collapse All button

## Notes

- **Google Fonts URLs**: `DIMENSION_FONT_OPTIONS` in `useStore.js` uses direct gstatic.com URLs. **Troika-three-text does NOT support woff2** — always use `.woff` or `.ttf` format. Current URLs: Inter v12 (woff), Roboto v51 (ttf), Lato v24 (woff), Montserrat v31 (ttf), Oswald v57 (ttf), Source Sans 3 v19 (ttf). If fonts go blank, re-fetch TTF URLs via Google Fonts v1 API: `https://fonts.googleapis.com/css?family=FontName:400` (returns older non-woff2 format) and update the array.
- **Height dimensions**: `BuildingEditor/index.jsx` renders height dims with `plane="XZ"` and `textMode="billboard"` — required for pure-Z direction vectors. Default `plane="XY"` produces a zero perpendicular for Z-only dims, making ticks/extension lines invisible. Billboard text always faces camera at mid-height.
- **Max height source of truth**: `principalMaxHeight` / `accessoryMaxHeight` in `LotEntity.jsx` come from `districtParameters.structures.{principal|accessory}.height.max` (not per-lot `building.maxHeight`). Defaults to `0` when unset, hiding the max height plane and dimension — set District Parameters → Structures to visualize. Max height dim (`offset=20`) alongside building height dim (`offset=10`) when `layers.dimensionsHeight` on and `maxHeight > 0`. Custom labels: `principalMaxHeight`, `accessoryMaxHeight` in `dimensionSettings.customLabels`.
- **Layers panel**: 5 collapsible subsections in `LayersSection` (`DistrictParameterPanel.jsx`), all default collapsed. Groups defined at module scope as `LAYER_GROUPS`. Order: VISUAL AIDS (grid/origin/ground/axes/gimbal) → LOTS & SETBACKS (lotLines/setbacks/accessorySetbacks/maxSetbacks/lotAccessArrows/labelLotEdges) → STRUCTURES (btzPlanes/buildings/roof/maxHeightPlane) → ROADS (roadModule/roadIntersections/labelRoadZones) → ANNOTATION (annotationLabels + indented sub-labels + dim keys).
- **Empty viewport after localStorage clear**: `entityOrder = []` on fresh state — no lots exist. Go to Model Setup → set Number of Lots ≥ 1.
- **Annotation system**: `annotationSettings` has `fontFamily` (label from `DIMENSION_FONT_OPTIONS`, null = browser default), `outlineColor`, `outlineWidth`, plus original text/background/leader fields. `annotationCustomLabels` stores per-road-direction and per-lot custom labels (`{ mode: 'default'|'custom', text: '' }`). Road labels keyed as `roadFront`/`roadRight`/`roadRear`/`roadLeft`; lot labels as `lot-{lotId}-name`. Font label resolved to URL via `DIMENSION_FONT_OPTIONS.find()` in `LotAnnotations.jsx` / `RoadAnnotations.jsx`. `RoadAnnotations` accepts `direction` prop for custom label lookup. UI: `AnnotationSettingsSection` in `DistrictParameterPanel.jsx`. Actions: `setAnnotationSetting`, `setAnnotationCustomLabel`. **Leader visibility**: `DraggableLabel` shows leader when label is >0.5 units from `anchorPoint` (distance check, not custom-vs-default). Lot edge labels (anchor on edge, label 3ft outside lot) always show leaders; lot name / road name / setback labels (anchor ≈ default) only show after dragging.
- **Gimbal/PostProcessing order**: `<PostProcessing />` must render BEFORE the conditional gimbal `<GizmoHelper>` in `SharedCanvas.jsx` and `Viewer3D.jsx`. If PostProcessing comes after, toggling gimbal causes AO/tone mapping to shift (perceived lighting change).
- **RoadModule `RoadPolygon`**: Defined at module scope (not inside `RoadModule` render). Accepts `lineScale` as an explicit prop.

---

## Known Limitations

- Setback visualization: rectangular lots only (not polygon)
- No 3D model import, no test suite
- Lots positioned in simple row layout (no arbitrary placement)
- Fillet arc lines may appear slightly thicker than straight edges (drei Line2 artifact)
- Comparison Module road intersections lack end-edge suppression
- `origin/codex-fix` branch: abandoned unified polygon approach — do not use

## Git

- **Remote**: https://github.com/C-Rockwell/zoning-comparison-app.git
- **Branches**: `gemini-fix` (active), `main` (stable)

## User Shortcuts

- **/PUCP** — Update CLAUDE.md, commit all changes, push to GitHub.
