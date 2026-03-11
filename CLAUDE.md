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
- Sidebar order: **Scenarios** → Model Setup → Layers → Annotations → **Drawing Layers** → **Drawing Properties** → **Drawing Layer Styles** → District Parameters → Model Parameters → Styles → **Dimensions** → Analytics → Building/Roof → Road Modules → Road Module Styles → Views → Batch Export

## State Structure (useStore.js ~4,000 lines, v30)

**Entity System** (District):
- `entities.lots[lotId]` — lot data with buildings, setbacks (principal + accessory), `importedModel`
- `entityOrder` — lot IDs in display order
- `entityStyles[lotId]` — per-lot styles (17 categories)
- `lotVisibility[lotId]` — per-lot visibility toggles
- `modelSetup` — numLots, streetEdges, streetTypes (S1/S2/S3)
- `districtParameters` — informational zoning data (auto-populates lots via `DISTRICT_TO_LOT_MAP`)
- `scenarios[]` / `activeScenario` — district scenario metadata + active name
- Factory functions: `createDefaultLot()`, `createDefaultLotStyle()`, `createDefaultRoadModule()`, `createDefaultLotVisibility()`

**Other key state**: `viewSettings` (camera, export, batch queue), `layerVisibility` (26+ layers), `dimensionSettings`, `annotationSettings`, `annotationCustomLabels`, `annotationPositions`, `styleSettings`, `roadModule`, `roadModuleStyles` (17 categories: 11 base + 6 alley-specific), `sunSettings`, `moveMode` (transient), `roadModuleStylesSnapshot` (transient), `sceneBounds` (transient, computed by `DistrictSceneContent`)

**Store version 31**: Persist `merge` function patches missing keys on every hydration: `entityStyles`, `lotVisibility`, `viewSettings.layers`, `roadModuleStyles`, `dimensionSettings`, `annotationSettings`, `parkingSetbacks`, `sharedDriveLocation`, `drawingLayers/drawingObjects/drawingDefaults`, `importedModel` fields, `widthToDepthRatio`, `maxImperviousSurface`, accessory BTZ. Merge also reconciles lot `parkingSetbacks` with `districtParameters.parkingLocations`.

**Drawing Editor** (complete, 12 object types):
- State: `drawingLayers`, `drawingLayerOrder`, `activeDrawingLayerId`, `drawingObjects`, `drawingDefaults`
- Transient (excluded from persist/Zundo): `drawingMode`, `textEditState`, `selectedDrawingIds`
- Per-layer style overrides in `drawingLayers[id].defaults`, resolved via `getEffectiveDrawingDefaults(state, layerId)`
- Camera: orbit remapped globally to middle-click, left-click freed for drawing tools
- Toolbar: 14 tools — V=Select, F=Freehand, L=Line, R=Rectangle, P=Polygon, C=Circle, A=Arrow, T=Text, E=Eraser (gated by `activeDrawingLayerId`)
- 12 types: freehand, line, arrow, rectangle, polygon, circle, ellipse, star, octagon, roundedRect, text, leader. All share `{ id, layerId, type, opacity }`. Stroke types add `strokeColor/strokeWidth/lineType`. Fill types add `fillColor/fillOpacity`. See code for per-type geometry fields.
- Key interaction patterns: drag-based tools use pointer capture + camera disable + undo pause/resume with live preview via useRef. Polygon is click-to-place (double-click closes, Escape cancels). Text/Leader use HTML overlay input. Selection uses 3 world unit tolerance + Shift+click multi-select + `pointInPolygon` for fills. Eraser is click-to-delete via `hitTestObject`. Move requires >2 unit threshold, Escape reverts.
- Hit-test utilities in `src/utils/drawingHitTest.js`, geometry in `src/utils/drawingGeometry.js`
- Batch update: `updateDrawingObjects(updates)` takes `{ [id]: partialObj }` map
- Export: SVG via `generateDrawingSVG()`, DXF via `generateDrawingDXF()` in `Exporter.jsx`

**Undo/redo**: Tracks entities, entityOrder, entityStyles, lotVisibility, existing, proposed, viewSettings, sunSettings, roadModule, roadModuleStyles, comparisonRoads, annotationSettings, annotationCustomLabels, annotationPositions, drawingLayers, drawingLayerOrder, drawingObjects. Excludes export flags, drawingMode, selectedDrawingIds, textEditState, drawingDefaults.

**Entity hooks** (`useEntityStore.js`): `useLot(lotId)`, `useLotIds()`, `useActiveLot()`, `useActiveLotId()`, `useLotStyle(lotId)`, `useBuilding(lotId, type)`, `useRoadModules()`, `useLotVisibility(lotId)`, `useActiveModule()`, `useModelSetup()`, `useDistrictParameters()`, `useEntityCount()`, `getLotData(lotId)` (non-hook)

## Import Patterns

```javascript
import { useStore, DIMENSION_FONT_OPTIONS } from './store/useStore'
import { useLot, useLotIds, useActiveLot } from '../hooks/useEntityStore'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
const { undo, redo } = useStore.temporal.getState()
```

## District → Lot Auto-Population

`DISTRICT_TO_LOT_MAP` in `useStore.js`: 30+ mappings from district parameter dot-paths to lot property setters. `applyDistrictDefaultsToLot(lot, dp)` iterates all mappings.

**Triggers**: `setDistrictParameter(path, value)` auto-sets corresponding lot fields across all lots. `addLot()` applies district defaults to new lots.

**Model Parameters UI** (`DistrictParameterPanel.jsx`): `DISTRICT_REF_MAP` maps `(sectionTitle, rowLabel)` → district value. `DistrictRefCell` shows pink (`#FF1493`) reference cells. `ParamCell`/`CheckCell` color-coded pink when matching district defaults.

## Dimension System

`dimensionSettings` lives at `viewSettings.styleSettings.dimensionSettings`. Key concepts:
- Lines, markers, text styling (color, width, font, outline, background)
- Text positioning: `textPerpOffset`, `textAnchorY` for width dims; independent depth dim settings (`textModeDepth`, `textPerpOffsetDepth`, `textAnchorYDepth`)
- Positioning offsets: `setbackDimOffset`, `lotDimOffset`, `lotDepthDimOffset` (independent), `lotDepthDimSide`
- Custom labels: `customLabels.{lotWidth|lotDepth|setbackFront|...}` — each `{mode:'value'|'custom', text:''}`
- Arrow end markers: `Dimension.jsx` uses `THREE.Quaternion.setFromUnitVectors(+X, dimDir)` for correct 3D orientation
- `DIMENSION_FONT_OPTIONS` exported from `useStore.js` — array of `{label, url}` for 6 Google Fonts

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
- **`=== undefined`** for existence checks in merge patching (not `!value` which catches `0`, `false`, `''`)

### renderOrder Map
Road zones=0, intersection fill=1, alley fill=1, fillet fills=2, fillet lines=3, building faces=4, roof=4, BTZ planes=5, max height plane=6, move handle=8, height handle ring=9, sphere=10. **Note**: `renderOrder` doesn't work reliably on drei `<Line>` — use z-offset separation instead.

### Z-Layer Map (Lot Geometry)
Lot fill + setback fill (z=0.02, non-overlapping via `LotFillFrame` hole cutout) → lot lines (0.03) → setback fill outline (0.07) → min setbacks (0.1) → accessory setbacks (0.11) → max setbacks (0.12) → parking setbacks (0.13) → lot access arrows (0.15) → BTZ planes (vertical)

### Street-Aware Setbacks
`streetSides` prop (from `DistrictSceneContent` via `modelSetup.streetEdges`) determines which lot sides face streets. Street-facing sides use `minSideStreet`/`maxSideStreet`; interior sides use `sideInterior`. Critical for corner lots.

### Road Intersection System
Roads stop at lot boundaries. Intersection fills use notched `THREE.Shape` geometry (z=0.04, renderOrder=1) with concave quarter-circle cutouts. Utilities in `intersectionGeometry.js`. Fillet arcs at z=0.05. End-edge lines suppressed via `suppressLeftEnd`/`suppressRightEnd`.

**S3 (Alley) T-Junctions**: When S3 meets non-S3, fillets/fills suppressed. Non-S3 road extends through S3 ROW. Alley fill rects at z=0.077. All S3 geometry raised z=0.042ft to prevent z-fighting.

**Alley-Specific Styles**: 6 keys (`alleyRoadWidth`, `alleyRightOfWay`, `alleyVerge`, `alleyParking`, `alleySidewalk`, `alleyTransitionZone`) — default `null` (use regular style). `RoadModule.jsx` merges alley overrides: `{ ...baseStyle, ...alleyOverride }`.

**Road types**: S1 (Primary, ROW 50', road 24'), S2 (Secondary, ROW 40', road 24'), S3 (Alley, ROW 20', road 16')

### Move Mode (M Key, District Only)
AutoCAD-style 3-phase: selectObject → selectBase → moving. `BuildingEditor` handles phases 1-2, `MoveModeCapturePlane` handles phase 3. Transient state excluded from persist/Zundo.

### Other Conventions
- **No ContactShadows** — fundamentally Y-up, causes z-fighting in Z-up scenes
- **PostProcessing before GizmoHelper** — must render BEFORE conditional gimbal in `SharedCanvas.jsx` / `Viewer3D.jsx`
- **N8AO**: `aoIntensity: 0.8`, `aoRadius: 0.3` — higher values cause artifacts at fillet corners
- **Shadow camera**: `target-position={[0, 50, 0]}` centers frustum on ground plane
- **CameraControls**: `dollySpeed={0.25}`, `smoothTime={0.35}`. Left=NONE (drawing), middle=ROTATE, right=TRUCK, wheel=DOLLY
- **Dynamic Camera Fitting**: Standardized views (Top, Front, Left, Right, ISO) dynamically fit the model. `DistrictSceneContent` publishes `sceneBounds` (minX/maxX/minY/maxY/maxZ) to store. `CameraHandler` computes `fitZoom(worldW, worldH)` = `min(canvasW/worldW, canvasH/worldH) * 0.85`. Camera targets center on model (`cx, cy, cz`), ISO direction vector `(200, -150, 200)` stays constant. `computeTotalHeight` exported from `LotEntity.jsx`.
- **Building style split** (v22): `principalBuildingEdges`/`Faces` and `accessoryBuildingEdges`/`Faces` with `??` fallback
- **Building layer split** (v25): `layers.principalBuildings` / `layers.accessoryBuildings` with `?? layers.buildings` fallback. Same pattern for label and dimension height layers.
- **MoveHandle**: Hover-reveal (opacity 0 → 0.9). Building MoveHandle renders outside selection block. Imported model MoveHandle always renders when layer visible.
- **EdgeHandle normal**: Outward-pointing — `{ x: dy/len, y: -dx/len }` (CW rotation)
- **NEVER define components inside render functions** — causes unmount/remount render loops. Always define at module level.
- **NEVER put `return null` before hooks** — all hooks must come BEFORE any early return to avoid "Rendered more hooks" crash.
- **RoadModule `RoadPolygon`**: Defined at module scope. Accepts `lineScale` as explicit prop.

## Style Categories (17)
Lot Lines, Setback Fill, Setbacks, Accessory Setbacks, Max Setbacks, Parking Setbacks, BTZ Planes, Lot Access Arrows, **Shared Drive Arrow**, Principal Building Edges/Faces, Accessory Building Edges/Faces, Roof, Max Height Plane, Imported Model Faces/Edges

## Backend API

Config at `~/.zoning-app-config.json`. Projects at `{projectsDir}/{id}/` with `project.json`, `images/`, `models/`, `snapshots/`, `layer-states/`, `scenarios/`.

Endpoints: `/api/health`, `/api/config` (GET/PUT), `/api/projects/:id` (CRUD), `/api/projects/:id/exports/:filename`, `/api/projects/:id/snapshots/:name`, `/api/projects/:id/layer-states/:name`, `/api/projects/:id/scenarios/:name`, `/api/style-presets` (list/save/load/delete), `/api/drawing-presets` (list/save/load/delete)

## Feature Status

**Working**: Scenarios, CSV Batch Import (columnar + transposed format), IFC Model Import (v30), Lot Geometry Manipulation (vertex drag/edge extrude/midpoint split), Drawing Editor (all phases), Drawing Layer Style Library (save/load/apply presets), Shared Drive Arrow (independent styles + front/rear placement), Accessory BTZ Planes (v31), W:D Ratio + Impervious Surface district fields (v31), Dynamic Camera Fitting (standardized views auto-fit to model size)

**Not runtime-tested**: Style Presets (save/load), Batch Export (queue views × angles → ZIP)

## Notes

- **Google Fonts**: `DIMENSION_FONT_OPTIONS` uses gstatic.com URLs. **Troika-three-text does NOT support woff2** — always use `.woff` or `.ttf`. If fonts go blank, re-fetch via Google Fonts v1 API: `https://fonts.googleapis.com/css?family=FontName:400`
- **Height dimensions**: `BuildingEditor/index.jsx` renders with `plane="XZ"` + `textMode="billboard"` — required for pure-Z direction vectors
- **Max height source of truth**: From `districtParameters.structures.{principal|accessory}.height.max` (not per-lot). Defaults to `0` when unset. Layer keys: `dimensionsHeightPrincipal`/`dimensionsHeightAccessory` (fallback `dimensionsHeight`)
- **Layers panel**: 5 collapsible subsections in `LayersSection`, all default collapsed. Groups defined as `LAYER_GROUPS` at module scope.
- **Empty viewport after localStorage clear**: `entityOrder = []` — go to Model Setup → set Number of Lots ≥ 1
- **Annotation system**: `annotationCustomLabels` stores per-road-direction and per-lot custom labels. Leader visibility: shows when label is >0.5 units from `anchorPoint`
- **IFC Import**: `web-ifc@0.0.77` WASM → manual Three.js mesh building. Files: `src/utils/ifcLoader.js`, `src/components/ImportedModelMesh.jsx`. Auto-centers, meters→feet, Y-up→Z-up.
- **Lot geometry editing**: Vertex drag, edge extrude, midpoint split. Files: `src/components/LotEditor/`. 4-vertex rectangles use perpendicular constraint; 5+ vertices allow free drag.

## Roof Geometry

Files: `src/utils/roofGeometry.js` (geometry), `src/components/BuildingEditor/RoofMesh.jsx` (rendering).

Architecture: Roof sits on `totalBuildingHeight` = `baseZ`. No bottom face (z-fight avoidance). All generators emit correctly-wound CCW triangles. `RoofMesh.jsx` uses `FrontSide` + `flatShading`.

Types: **Hip** (ridge along longer dim, inset by shorterDim/2), **Gable** (ridge at full length, hardcoded CCW triangles), **Shed** (varying Z top face + flat baseZ bottom ring). Non-rectangular polygons fall back to centroid pyramid.

**Pitch Ratio Input**: Shows when roof type ≠ 'flat'. Back-calculates `ridgeHeight = totalHeight + (pitchValue / 12) * halfSpan`.

**If gable roof faces go missing**: Check vertex ordering from `roofVertices`, `FrontSide` vs `DoubleSide`, and whether `ridgeZ <= baseZ`.

## Known Limitations

- Setback visualization: rectangular lots only (not polygon)
- Lots positioned in simple row layout (no arbitrary placement)
- Fillet arc lines may appear slightly thicker than straight edges (drei Line2 artifact)
- Comparison Module road intersections lack end-edge suppression

## Git

- **Remote**: https://github.com/C-Rockwell/zoning-comparison-app.git
- **Branches**: `main` only (all branches merged and cleaned up Mar 2026)

## Desktop Launcher

`ZoningApp.app` on the Desktop — double-click to start dev servers and open `http://localhost:5173`.

## User Shortcuts

- **/PUCP** — Update CLAUDE.md, commit all changes, push to GitHub.
