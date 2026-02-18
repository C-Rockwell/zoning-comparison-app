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
- Sidebar order: Model Setup → Layers → Annotations → District Parameters → Model Parameters → Styles → Analytics → Building/Roof → Road Modules → Road Module Styles → Views → Batch Export

## State Structure (useStore.js ~3,700 lines, v24)

**Entity System** (District):
- `entities.lots[lotId]` — lot data with buildings, setbacks (principal + accessory)
- `entityOrder` — lot IDs in display order
- `entityStyles[lotId]` — per-lot styles (12 categories)
- `lotVisibility[lotId]` — per-lot visibility toggles
- `modelSetup` — numLots, streetEdges, streetTypes (S1/S2/S3)
- `districtParameters` — informational zoning data (not visualized)
- Factory functions: `createDefaultLot()`, `createDefaultLotStyle()`, `createDefaultRoadModule()`, `createDefaultLotVisibility()`

**Other key state**: `viewSettings` (camera, export, batch queue), `layerVisibility` (26+ layers), `dimensionSettings`, `annotationSettings`, `annotationPositions`, `styleSettings`, `roadModule`, `roadModuleStyles` (11 categories), `sunSettings`, `moveMode` (transient, excluded from persist/Zundo)

**Store version 24**: Migrations v1–v23. Persist `merge` function patches missing `entityStyles`, `lotVisibility`, `viewSettings.layers`, `roadModuleStyles` keys on every hydration.

**Undo/redo**: Tracks entities, entityOrder, entityStyles, lotVisibility, existing, proposed, viewSettings, sunSettings, roadModule, roadModuleStyles, comparisonRoads, annotationSettings, annotationPositions. Excludes export flags.

**Entity hooks** (`useEntityStore.js`): `useLot(lotId)`, `useLotIds()`, `useActiveLot()`, `useLotStyle(lotId)`, `useBuilding(lotId, type)`, `useRoadModules()`, `useLotVisibility(lotId)`, `useActiveModule()`, `useModelSetup()`, `useDistrictParameters()`, `getLotData(lotId)` (non-hook)

## Import Patterns

```javascript
import { useStore } from './store/useStore'
import { useLot, useLotIds, useActiveLot } from '../hooks/useEntityStore'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
const { undo, redo } = useStore.temporal.getState()
```

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
Road zones=0, intersection fill=1, alley fill=1, fillet fills=2, fillet lines=3, building faces=4, roof=4, BTZ planes=5, max height plane=6, height handle ring=9, sphere=10. **Note**: `renderOrder` doesn't work reliably on drei `<Line>` — use z-offset separation instead.

### Z-Layer Map (Lot Geometry)
Lot fill (z=0.02) → lot lines (0.03) → min setbacks (0.1) → accessory setbacks (0.11) → max setbacks (0.12) → lot access arrows (0.15) → BTZ planes (vertical)

### Street-Aware Setbacks
`streetSides` prop (from `DistrictSceneContent` via `modelSetup.streetEdges`) determines which lot sides face streets. Street-facing sides use `minSideStreet`/`maxSideStreet`; interior sides use `sideInterior`. Critical for corner lots.

### Road Intersection System
Roads stop at lot boundaries. Intersection fills use notched `THREE.Shape` geometry (z=0.04, renderOrder=1) with concave quarter-circle cutouts matching fillet outer radii — prevents z-fighting with fillet arcs. Utilities in `intersectionGeometry.js`: `computeFilletOuterRadius()` returns total zone depth, `createNotchedRectShape()` creates centered shape with per-corner notch radii. Fillet arcs (z=0.05, renderOrder=2) handle curved corners with arc lines at z=0.055. End-edge lines suppressed via `suppressLeftEnd`/`suppressRightEnd` on RoadModule.

**S3 (Alley) T-Junctions**: When S3 meets non-S3, fillets/fills suppressed. Non-S3 road extends through S3 ROW. Small alley fill rects connect alley pavement to cross-street. Alley fills use independent `alleyIntersectionFill` style (with `?? intersectionFill` fallback).

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

## Style Categories (12)
Lot Lines, Setbacks, Accessory Setbacks, Max Setbacks, BTZ Planes, Lot Access Arrows, Principal Building Edges/Faces, Accessory Building Edges/Faces, Roof, Max Height Plane

## Backend API

Config at `~/.zoning-app-config.json`. Projects at `{projectsDir}/{id}/` with `project.json`, `images/`, `models/`, `snapshots/`, `layer-states/`.

Endpoints: `/api/health`, `/api/config` (GET/PUT), `/api/projects/:id` (CRUD), `/api/projects/:id/exports/:filename`, `/api/projects/:id/snapshots/:name`, `/api/projects/:id/layer-states/:name`

## Untested Features

- **Batch Export**: Queue saved views × camera angles → ZIP download. Uses `exportQueue`/`isBatchExporting` in viewSettings, JSZip in Exporter.jsx, BatchExportSection in DistrictParameterPanel.
- **District Parameter CSV Import**: Auto-detects lot vs district CSV. `DISTRICT_FIELDS` in importParser.js (~67 fields). ImportWizard with `importType` toggle.

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
