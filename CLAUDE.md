# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A React Three Fiber application with two working modules:
1. **Comparison Module** — Side-by-side existing vs. proposed zoning with split-screen 3D view
2. **District Module** — Multi-lot composition with up to 5 lots, principal + accessory buildings, multi-direction roads

Features real-time 3D styling, enhanced dimension annotations (multi-plane, billboard text, angular dimensions), annotation labels (lot/road/building labels with drag-to-reposition), road intersection fillets (curved corner geometry), sun simulation, multi-format export (PNG/JPG/SVG/OBJ/GLB/DAE/DXF/IFC), CSV import, and keyboard shortcuts. Includes an Express.js backend for project persistence with snapshots and layer states.

## Commands

All commands run from `zoning-comparison-app/`.

```bash
npm run dev              # Start both Vite frontend and Express backend concurrently
npm run dev:client       # Start only Vite frontend (port 5173)
npm run dev:server       # Start only Express backend (port 3001)
npm run build            # Production build (outputs to /dist)
npm run lint             # Run ESLint
npm run preview          # Preview production build
```

## Architecture

### Technology Stack
- **Frontend**: React 19 + Vite 7 + Three.js 0.182 via @react-three/fiber 9.4
- **Routing**: react-router-dom 7 with HashRouter
- **3D Utilities**: @react-three/drei (camera, gizmo, grid), @react-three/postprocessing (AO, SMAA)
- **State**: Zustand 5 with Zundo 2.3 (undo/redo, 50-step history)
- **Styling**: Tailwind CSS 3.4 + CSS variables for full theming (`var(--ui-*)` on all components)
- **Icons**: Lucide React
- **Backend**: Express 5 on port 3001 (proxied via Vite dev server)
- **No TypeScript, no tests**

### Key Directories
```
zoning-comparison-app/
├── src/
│   ├── components/
│   │   ├── Viewer3D.jsx              # Comparison 3D canvas, controls, export panel (~449 lines)
│   │   ├── SceneContent.jsx          # Comparison 3D rendering: lots, buildings, roads, annotations, fillets (~816 lines)
│   │   ├── ParameterPanel.jsx        # Comparison sidebar: params, inline styles, layers, annotations (~1,750 lines)
│   │   ├── Exporter.jsx              # Multi-format export engine, module-aware IFC (~435 lines)
│   │   ├── ProjectManager.jsx        # Project CRUD, module switcher, Home button (~446 lines)
│   │   ├── StateManager.jsx          # Views (snapshots) + layer states UI (~309 lines)
│   │   ├── RoadModule.jsx            # Parametric road with direction prop (front/left/right/rear)
│   │   ├── Dimension.jsx             # Enhanced dimension lines: multi-plane, billboard, backgrounds (~230 lines)
│   │   ├── CameraHandler.jsx         # Camera preset handling (91 lines)
│   │   ├── SunControls.jsx           # Sun simulation UI (260 lines)
│   │   ├── StartScreen.jsx           # App entry: Sandbox / New Project / Open Existing (~380 lines)
│   │   ├── DistrictViewer.jsx        # District 3D viewer with SharedCanvas (~200 lines)
│   │   ├── DistrictSceneContent.jsx  # District 3D: multi-lot layout, roads, intersection fills, fillets, S3 T-junctions (~460 lines)
│   │   ├── DistrictParameterPanel.jsx # District sidebar: model setup, params, styles, road styles, annotations (~2,000 lines)
│   │   ├── SharedCanvas.jsx          # Shared R3F Canvas infra: lighting, post-processing (~230 lines)
│   │   ├── LotEntity.jsx             # Single lot entity renderer with annotations (~480 lines)
│   │   ├── ImportWizard.jsx          # 3-step CSV import wizard with field mapping (~710 lines)
│   │   ├── AnnotationText.jsx        # Shared text component: billboard/follow-line/fixed modes (~130 lines)
│   │   ├── DraggableLabel.jsx        # Drag-to-reposition label with leader lines (~155 lines)
│   │   ├── LotAnnotations.jsx        # Lot/setback/building annotation labels (~210 lines)
│   │   ├── RoadAnnotations.jsx       # Road name and zone annotation labels (~230 lines)
│   │   ├── RoadIntersectionFillet.jsx # Curved corner geometry at road intersections (~100 lines)
│   │   ├── LeaderCallout.jsx         # Leader line with arrow pointing to feature (~100 lines)
│   │   ├── AngularDimension.jsx      # Arc dimension for angles/pitch (~145 lines)
│   │   ├── LotEditor/               # Polygon lot vertex editing (index + PolygonLot + handles)
│   │   ├── BuildingEditor/           # Polygon building editing + roof rendering
│   │   │   ├── index.jsx            # Orchestrator: rect/polygon floors, handles, dimensions
│   │   │   ├── HeightHandle.jsx     # Draggable sphere for vertical height adjustment
│   │   │   ├── PolygonBuilding.jsx  # ExtrudeGeometry per-floor renderer
│   │   │   └── RoofMesh.jsx         # Roof geometry renderer (shed/gabled/hipped)
│   │   └── ui/                       # Reusable UI atoms
│   │       ├── Section.jsx           # Collapsible section wrapper
│   │       ├── ColorPicker.jsx       # Color input with ring overlay
│   │       ├── SliderInput.jsx       # Range + number input combo
│   │       └── LineStyleSelector.jsx # Solid/dashed line style toggle
│   ├── store/useStore.js             # Centralized Zustand store (~3,200 lines, v18)
│   ├── services/api.js               # REST API client for backend (151 lines)
│   ├── hooks/
│   │   ├── useSunPosition.js         # SunCalc-based sun position hook (122 lines)
│   │   ├── useEntityStore.js         # Entity system selector hooks (146 lines)
│   │   ├── useAutoSave.js            # Periodic auto-save hook
│   │   └── useKeyboardShortcuts.js   # Cmd+Z/S/Shift+Z global shortcuts
│   ├── utils/
│   │   ├── ifcGenerator.js           # IFC4 BIM generator: generateIFC + generateDistrictIFC
│   │   ├── roofGeometry.js           # Roof geometry computation (shed/gabled/hipped)
│   │   ├── importParser.js           # CSV parser + field mapping + auto-match (~372 lines)
│   │   ├── formatUnits.js            # Unit formatting: feet, feet-inches, meters (~35 lines)
│   │   ├── dimensionLayout.js        # Auto-stacking parallel dimensions (~95 lines)
│   │   └── intersectionGeometry.js   # Road corner fillet arc geometry (~267 lines)
│   ├── App.jsx                       # Root: routing, theme, toast, auto-save, keyboard shortcuts
│   └── main.jsx                      # React entry point with HashRouter
├── server/
│   ├── index.js                      # Express setup, CORS, 50MB limit
│   └── routes/
│       ├── config.js                 # GET/PUT projects directory config
│       ├── projects.js               # Project CRUD with folder structure
│       ├── exports.js                # Save/list/delete exported files
│       ├── snapshots.js              # Full state snapshots
│       └── layer-states.js           # Style-only snapshots
├── _archive/                         # Old briefing/research docs (reference only)
├── DEVELOPMENT_STRATEGY.md           # Original roadmap (largely completed)
├── package.json
├── vite.config.js                    # React plugin + /api proxy to :3001
├── tailwind.config.js
├── eslint.config.js
└── launch-zoning-app.command         # macOS convenience launcher
```

### Two Module Architecture

**Comparison Module** (legacy, fully functional):
- Route: `/app` with `activeModule === 'comparison'`
- Components: `Viewer3D` + `ParameterPanel` + `SceneContent`
- State: `existing` / `proposed` objects with accessory buildings + comparison roads
- Inline style controls (StyleEditor.jsx removed, all controls now in ParameterPanel)

**District Module** (new, entity-based):
- Route: `/app` with `activeModule === 'district'`
- Components: `DistrictViewer` + `DistrictParameterPanel` + `DistrictSceneContent` + `LotEntity`
- State: `entities.lots[lotId]` with up to 5 lots, each having principal + accessory buildings
- Multi-direction roads: front/left/right/rear with S1/S2/S3 types, roads extend to connect at corners
- Lot layout: Lot 1 extends in positive X from origin (0,0 = front-left corner), Lots 2+ extend in negative X
- Layer visibility: global layer toggles (Layers panel) override per-lot visibility (`layers.X && visibility.X`)
- MODEL PARAMETERS subsections are collapsible with chevron toggle

### State Structure (useStore.js)

**Legacy Comparison Module state**: Two parallel condition objects (`existing` and `proposed`), each with:
- Lot dimensions, polygon geometry (vertices, mode: rectangle/polygon)
- Building dimensions, position (X/Y), stories (firstFloorHeight, upperFloorHeight, buildingStories)
- Building polygon geometry (mode: rectangle/polygon, vertices), selection state
- Accessory building: accessoryWidth/Depth/Stories/Height/Roof/BuildingGeometry + 11 dedicated actions
- Roof settings (type: flat/shed/gabled/hipped, ridgeDirection, shedDirection, overrideHeight)
- Setbacks (front, rear, left, right)
- Max height plane settings
- **comparisonRoads**: `{ left: { enabled, type, rightOfWay, roadWidth, ... }, right: {...}, rear: {...} }`

**Entity System (District Module)** — coexists with legacy state:
- **entities**: `{ lots: { [lotId]: lotData }, roadModules: { [roadId]: roadData } }`
- **entityOrder**: Array of lot IDs in display order (up to 5)
- **entityStyles**: `{ [lotId]: styleData }` — per-lot style settings
- **lotVisibility**: `{ [lotId]: { lotLines, setbacks, buildings, ... } }` — per-lot visibility toggles
- **modelSetup**: numLots, streetEdges (front/left/right/rear), streetTypes (S1/S2/S3)
- **districtParameters**: Informational/reference zoning data (not visualized)
- Each lot has `buildings: { principal: {...}, accessory: {...} }` with independent params/roof/geometry
- Each lot has expanded setbacks: `{ principal: { front, maxFront, btzFront, ... }, accessory: { ... } }`
- Factory functions exported: `createDefaultLot()`, `createDefaultLotStyle()`, `createDefaultRoadModule()`, `createDefaultLotVisibility()`

Additional top-level state:
- **activeModule**: `'comparison'` | `'district'`
- **autoSave**: `{ enabled, intervalMs, lastSavedAt, isDirty }` — with `setAutoSaveEnabled`, `markDirty`, `markSaved` actions
- **viewSettings**: camera mode, projection (ortho/perspective), export format/resolution
- **layerVisibility**: 23+ toggleable layers (lotLines, setbacks, buildings, roof, grid, roadModule, origin, ground, roadIntersections, annotationLabels, labelLotNames, labelLotEdges, labelSetbacks, labelRoadNames, labelRoadZones, labelBuildings, etc.) — global layers act as master override via `&&` with per-lot visibility
- **dimensionSettings**: text/line colors, font, custom labels per dimension, textMode (follow-line/billboard), textBackground, autoStack, unitFormat
- **annotationSettings**: textRotation (billboard/fixed), fontSize, colors, background, leader line settings, unitFormat
- **annotationPositions**: `{ [annotationId]: [x,y,z] | null }` — persisted custom label positions for dragged annotations
- **styleSettings**: per-condition colors/opacity/line styles with per-side overrides
- **roadModule**: shared front road parameters + per-zone left/right styles
- **roadModuleStyles**: 10 style categories for road zone colors/widths/opacity
- **sunSettings**: lat/long, date, time, animation, intensity
- **Project state**: currentProject, projects list, snapshots, layerStates

**Store version**: 18 (with migration system for backward compat from v1-v17; v15 added entity system, accessory buildings, comparison roads; v16 added annotation system, enhanced dimensions, road intersection fillets; v17 fixed fillOpacity defaults to 1.0 for all road zone and roadWidth styles; v18 added max setback lines with independent style/visibility/layer toggles)

**Undo/redo via Zundo**: tracks existing, proposed, viewSettings, layoutSettings, sunSettings, renderSettings, roadModule, roadModuleStyles, entities, entityOrder, entityStyles, lotVisibility, comparisonRoads, annotationSettings, annotationPositions. Excludes exportRequested flag.

**Entity selector hooks** (`src/hooks/useEntityStore.js`): `useLot(lotId)`, `useLotIds()`, `useActiveLot()`, `useLotStyle(lotId)`, `useBuilding(lotId, type)`, `useRoadModules()`, `useRoadModulesByDirection(direction)`, `useLotVisibility(lotId)`, `useActiveModule()`, `useModelSetup()`, `useDistrictParameters()`, `useEntityCount()`, `getLotData(lotId)` (non-hook)

### Road Module System

RoadModule.jsx accepts a `direction` prop: `'front'` (default), `'left'`, `'right'`, `'rear'`. Direction changes are implemented via group rotation (DIRECTION_ROTATION constant). Also accepts `suppressLeftEnd` / `suppressRightEnd` boolean props to hide end-edge border lines at intersection boundaries (computed per-direction in DistrictSceneContent based on perpendicular road existence). In the District Module, roads stop at lot boundaries; intersection fill rectangles (z=0.04, renderOrder=1) cover the ROW overlap area, and fillet arcs (z=0.05, renderOrder=2) handle curved zone corners. Road Module Styles are editable via `RoadModuleStylesSection` in DistrictParameterPanel using `setRoadModuleStyle(layerType, property, value)`. Fillets generate 4 sub-corners per perpendicular pair using `computeCornerZoneStack(roadA, roadB, corner, styles, sideA, sideB)` from `intersectionGeometry.js`.

**S3 (Alley) T-Junction Behavior**: When an S3 road intersects a non-S3 road, fillets and intersection fill rects are suppressed (alleys meet cross-streets at 90-degree angles with no curb returns). Non-S3 roads extend their span through perpendicular S3 road ROW so their zone bands continue through the alley area. Small alley fill rects (width = perpendicular road's `(ROW - roadWidth) / 2` = sidewalk+verge inset) connect alley pavement to the cross-street at each corner. Suppress-end logic: non-S3 roads keep end lines at S3 corners; S3 roads suppress ends at cross-streets.

Road types with distinct defaults:
- **S1** (Primary Street): ROW 50', road 24' — full zones (parking, verge, sidewalk, transition)
- **S2** (Secondary Street): ROW 40', road 24' — narrower variant
- **S3** (Alley/Rear): ROW 20', road 16' — minimal, no sidewalk/verge. At intersections with S1/S2 roads, uses T-junction behavior (no fillets, road extension through alley area)

### Backend API

Config stored at `~/.zoning-app-config.json`. Projects saved as folders:
```
{projectsDir}/{project-id}/
├── project.json       # { name, createdAt, modifiedAt, state }
├── images/            # PNG/JPG exports
├── models/            # OBJ/GLB/DAE/DXF/IFC exports
├── snapshots/         # Full state + camera JSON files
└── layer-states/      # Style-only JSON files
```

Key endpoints:
- `GET /api/health` - Health check
- `GET/PUT /api/config` - Projects directory path
- `GET/POST/PUT/DELETE /api/projects/:id` - Project CRUD
- `GET/POST/DELETE /api/projects/:id/exports/:filename` - Export files
- `GET/POST/DELETE /api/projects/:id/snapshots/:name` - Full state snapshots
- `GET/POST/DELETE /api/projects/:id/layer-states/:name` - Style-only snapshots

### Import Patterns
```javascript
import { useStore } from './store/useStore'
const value = useStore(state => state.value)

// Entity hooks (for District Module)
import { useLot, useLotIds, useActiveLot } from '../hooks/useEntityStore'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { GizmoHelper, CameraControls } from '@react-three/drei'

import * as api from './services/api'

// Undo/redo via Zundo temporal middleware
const { undo, redo } = useStore.temporal.getState()
```

## Key Features

### Comparison Module
- **Dual Condition Comparison**: Side-by-side existing vs. proposed zoning with split-screen 3D view
- **Accessory Buildings**: Each condition has principal + accessory building with independent params/roof
- **Multi-Direction Roads**: Front road + optional left/right/rear comparison roads (S1/S2/S3)
- **Inline Style Controls**: All style controls integrated into ParameterPanel (no floating StyleEditor)
- **Per-Parameter Visibility**: Eye-icon toggles for each parameter row

### District Module
- **Multi-Lot Layout**: Up to 5 lots — Lot 1 in positive X from origin, Lots 2+ in negative X. Origin (0,0) = front-left corner of Lot 1
- **Per-Lot Buildings**: Principal + accessory buildings per lot with separate dimensions/roof
- **Multi-Direction Roads**: Front/left/right/rear roads with S1/S2/S3 types per edge, roads extend to connect at corners
- **Per-Lot Styles**: Independent style settings per lot with "Apply to all" option
- **District Parameters**: Informational/reference fields (zoning data, not visualized in 3D)
- **Model Parameters**: Functional parameters in per-lot columns with collapsible subsections (Lot Dimensions, Setbacks Principal/Accessory, Structures Principal/Accessory with width/depth/stories/heights, Lot Access, Parking, Parking Setbacks)

### Shared Features
- **Polygon Lot Editing**: Vertex manipulation, edge splitting/extrusion, perpendicular constraints, Shoelace area calc
- **Building Polygon Editing**: Direct-manipulation footprint reshaping with vertex/edge/midpoint handles
- **Height Handle**: Draggable sphere at building top for vertical height adjustment
- **Roof System**: Flat/shed/gabled/hipped massing roofs, auto-conform peak to max height, pitch calculation
- **Building Stories System**: Separate first floor and upper floor heights, configurable story count
- **Road Module**: Configurable ROW, road width, parking, verge, sidewalk, transition zones with left/right differentiation
- **Road Intersection Fillets**: Curved corner geometry where perpendicular roads meet. Each intersection generates **4 sub-corners** (lot corner, far-A, far-B, far corner) using toward-lot and away-from-lot zone sides (`sideA`/`sideB` params). Per-zone arc rendering (transition, sidewalk, verge, parking) with annular arc sectors via THREE.Shape `absarc()`. Fillets render at z=0.05 (fills) with arc border lines at z=0.055 (zOffset+0.005) to ensure lines render above fills in the transparent pass. Arc lines use renderOrder=3 (above fill renderOrder=2). Road module end-edge lines are suppressed at intersection boundaries via `suppressLeftEnd`/`suppressRightEnd` props. Angle quadrant mapping uses flipA (front↔rear) and flipB (left↔right) for correct arc direction per sub-corner. Works in both District and Comparison modules.
- **Enhanced Dimensions**: Multi-plane support (XY/XZ/YZ/auto), billboard text mode (camera-facing), text backgrounds with configurable color/opacity, unit formatting (feet/feet-inches/meters), auto-stacking parallel dimensions, angular dimensions for roof pitch
- **Annotation Labels**: Draggable text labels for lots (name, edges, setbacks), buildings (principal/accessory), roads (name, zone labels). Per-category visibility toggles, leader lines when displaced, position persistence via annotationPositions state, reset functionality. Components: AnnotationText (shared text renderer), DraggableLabel (drag wrapper), LotAnnotations, RoadAnnotations, LeaderCallout
- **Sun Simulation**: SunCalc-powered directional light with 12 city presets, date/time control, animation mode
- **Multi-Format Export**: PNG, JPG, SVG (raster/vector), OBJ, GLB, DAE, DXF, IFC (BIM). IFC is module-aware (uses `generateDistrictIFC` for district, `generateIFC` for comparison)
- **CSV Import**: 3-step wizard with auto-matching CSV headers to app fields, preview, and batch lot creation
- **WYSIWYG Export**: Lines scale proportionally at any export resolution
- **Custom Dimension Labels**: Replace numeric values with arbitrary text
- **Camera Presets**: 5 saved view slots + standard views (top, front, side, iso)
- **Undo/Redo**: 50-step history via Zundo middleware + Cmd/Ctrl+Z/Shift+Z keyboard shortcuts
- **Keyboard Shortcuts**: Cmd+Z (undo), Cmd+Shift+Z (redo), Cmd+S (save project)
- **Auto-Save**: Configurable periodic save when project is open and changes are dirty
- **Project Management**: Save/load projects, full-state views (snapshots), style-only layer states
- **Project Setup**: Start screen with Sandbox/New Project/Open Existing, module selection, district count
- **Calculated Metrics**: Lot area, building coverage %, GFA, FAR (auto-calculated)
- **Theme System**: Standard (dark gray + blue) and modern (black + cyan neon) UI themes via CSS variables (`var(--ui-*)`). All sidebar components use inline styles with CSS variables — no hardcoded Tailwind color classes. Custom CSS utility classes in `index.css` handle hover/focus/accent/placeholder/scrollbar pseudo-states (`hover-bg-secondary`, `focus-ring-accent-1`, `accent-theme`, etc.)

## Conventions

- **Material opacity defaults to 1.0 (100%)**: All `fillOpacity`, `lineOpacity`, and material `opacity` values must default to 1.0 unless the user explicitly requests transparency. Sub-1.0 defaults cause color mismatches between overlapping geometry layers and complicate z-ordering with Three.js transparent object sorting.
- **renderOrder for layered geometry**: When multiple transparent/overlapping meshes exist at different z-offsets, use Three.js `renderOrder` prop to control draw sequence (not just z-position). Road zones = 0, intersection fill = 1, fillet arc fills = 2, fillet arc lines = 3. **Note**: `renderOrder` does NOT reliably work on drei `<Line>` (Line2) components for transparent sorting — use z-offset separation instead (e.g., arc lines at zOffset+0.005 above fills).
- **Road intersection system**: Roads stop at lot boundaries (no ROW extensions). Intersection fill rectangles (z=0.04, renderOrder=1) cover the ROW overlap area with conditional `transparent`/`depthWrite` based on fillOpacity (opaque when >= 0.95, ensuring correct render pass ordering). Fillet arcs (z=0.05, renderOrder=2) handle curved zone corners with arc border lines at z=0.055. Road module zone end-edge lines are suppressed at intersection boundaries via `suppressLeftEnd`/`suppressRightEnd` props on RoadModule (direction-to-end mapping computed in DistrictSceneContent). Road Module Style Editor in DistrictParameterPanel allows customizing all zone colors.
- **S3 (alley) T-junctions**: When an S3 road meets a non-S3 road at a corner, fillets and intersection fill rects are suppressed. Instead, the non-S3 road extends its span through the S3 road's ROW so its zone bands (sidewalk, verge, pavement) continue through the alley area. Small alley fill rectangles (z=0.03, width = perpendicular road's sidewalk+verge inset) connect the alley pavement to the cross-street at each corner. **Known limitation**: the cross-street sidewalk is not yet rendered on top of the alley fill rects (future TODO).
- **Parameter-to-rendering integrity**: Every piece of visible geometry MUST correspond to a parameter the user can see and edit. If a parameter field is null/empty/cleared, the corresponding geometry must NOT render. Use `!= null && > 0` guards before rendering any line or dimension. Use `??` (nullish coalescing) instead of `||` for building prop fallbacks so that explicit `0` values are respected.
- **Street-aware setback rendering**: `SetbackLines` and annotation labels use `streetSides` to determine which sides face streets. Street-facing sides use `minSideStreet`; interior sides use `sideInterior`. This is critical for corner lots where one side faces a street — that side's setback is a side street setback, not a side interior setback. The `streetSides` prop is computed in `DistrictSceneContent.jsx` from `modelSetup.streetEdges`.

### Setback Line Rendering (District Module)

**`SetbackLines`** component in `LotEntity.jsx` renders individual min setback lines. Each of the 4 sides (front, rear, left, right) only renders if its value is `!= null && > 0`. Street-facing sides use `minSideStreet` from `setbacks.principal`; interior sides use `sideInterior`. The `streetSides` prop (passed from `DistrictSceneContent` → `LotEntity` → `SetbackLines`) determines which sides face streets. Dimension annotations are also per-side conditional.

**`SetbackLayer`** in `SceneContent.jsx` (Comparison Module) follows the same conditional pattern — each side only renders when its setback value is `!= null && > 0`.

### Max Setback Lines (added v18)

**Status**: IMPLEMENTED — working correctly.

Max setback lines visualize `maxFront` and `maxSideStreet` from `setbacks.principal` as individual dashed lines in the 3D scene (NOT a closed rectangle — only sides with values get lines).

**Components & files**:

- `MaxSetbackLines` component in `LotEntity.jsx` — renders individual lines at z=0.12, with `!= null && > 0` guards
- `streetSides` prop computed in `DistrictSceneContent.jsx` — auto-detects which lot sides face streets from `modelSetup.streetEdges` (Lot 1 right edge → right road, last lot left edge → left road, interior lots → no street sides)
- `maxSetbacks` style in `createDefaultLotStyle()` — own style category with shorter dash pattern (dashSize=0.5, gapSize=0.3) vs min setbacks (1/0.5)
- `maxSetbacks` visibility in `createDefaultLotVisibility()` — per-lot toggle, defaults to `true`
- `maxSetbacks` + `labelMaxSetbacks` layer toggles in `viewSettings.layers`
- `visKey: 'maxSetbacks'` on the "Max. Front" and "Max. Side, Street" model parameter rows
- Max setback annotation labels in `LotAnnotations.jsx` — "Max. Front Setback", "Max. Side Setback"
- Style category "Max Setbacks" in `DistrictParameterPanel.jsx` styleCategories

### Building Dimension Parameters (District Module)

Both Structures Principal and Structures Accessory sections in `DistrictParameterPanel.jsx` expose full building parameters:

- **Principal**: Height (computed, read-only), Width (ft), Depth (ft), Stories, First Story Height, Upper Floor Height, Show Roof, Show Max Height Plane
- **Accessory**: Height (computed, read-only), Width (ft), Depth (ft), Stories, First Story Height, Upper Floor Height, Show Roof, Show Max Height Plane

All editable fields use `updateBuildingParam(lotId, buildingType, key, value)`. Building rendering in `LotEntity.jsx` uses `??` (nullish coalescing) for fallback values to ensure `0` is treated as a valid user-entered value.

## Road Intersection System — WORKING (All 4 Directions)

**Status**: COMPLETE — All 4 road directions (front/left/right/rear) render correctly with the original fillet-based system. S3 (alley) T-junctions are fully supported.

### Road Rendering Architecture

Roads are rendered as separate per-direction `RoadModule` components, with `RoadIntersectionFillet` handling curved corners where perpendicular roads meet. Intersection fill rectangles cover the ROW overlap area between roads.

- **`RoadModule.jsx`** — Uses drei's `<Line>` (Line2) for all straight edge lines and ROW boundary lines. `lineWidth` wired from `roadModuleStyles` per zone. `lineScale` multiplier from `exportLineScale`. Accepts `suppressLeftEnd`/`suppressRightEnd` props to hide end-edge border lines at intersection boundaries.
- **`RoadIntersectionFillet.jsx`** — Uses `<Line segments>` (LineSegments2) with `toSegmentPairs()` helper for arc border lines. Annular arc sector fills via THREE.Shape `absarc()`.
- **`DistrictSceneContent.jsx`** — Computes intersection fill rects, fillet sub-corners, end-edge suppression, S3 T-junction road extensions, and alley fill rects.
- **`intersectionGeometry.js`** — `computeCornerZoneStack()` generates 4 sub-corners per perpendicular road pair.
- **`useStore.js`** — `setAllRoadLineWidths(width)` action for universal line width control.
- **`DistrictParameterPanel.jsx`** — "All Lines > Line Width" universal slider + per-zone style editing.

### Previous Exploration: Unified Polygon Approach (ABANDONED)

A unified polygon approach was explored on the `origin/codex-fix` branch (15 commits) to replace per-road rendering with single closed polygons per zone type. This approach **did not work** — it could not reliably handle all corner cases. The original fillet-based system was retained and refined instead. Leftover untracked files (`UnifiedRoadNetwork.jsx`, `unifiedRoadGeometry.js`) and exploration report (`docs/pre-built-road-scenario-exploration.md`) remain as reference but are NOT part of the active codebase.

### Known Cosmetic Issue

Fillet arc border lines may appear slightly thicker than straight road edges due to how drei's Line2 renders multi-point curves vs 2-point straight lines. This is a minor visual artifact that does not affect functionality.

## Known Limitations

- Setback visualization only works with rectangular lots, not polygon lots
- No 3D model import
- No test suite
- Store is ~3,200 lines — large but functional; entity system, annotation system, and legacy state coexist
- ImportWizard supports CSV only (no Excel/XLSX — would need external library)
- District Module lots are positioned in a simple row layout (no arbitrary placement)
- Road intersection fillet arc lines rely on z-offset separation (not renderOrder) for visibility above fills; transparent sorting edge cases may still occur with non-default opacity values
- Comparison Module road intersections don't yet have end-edge suppression (District Module only)
- Fillet arc border lines may appear slightly thicker than straight road edges (cosmetic; drei Line2 multi-point curve rendering artifact)

## Git

- **Remote**: https://github.com/C-Rockwell/zoning-comparison-app.git
- **Branches**: `gemini-fix` (active development), `main` (stable)
- **Abandoned branch**: `origin/codex-fix` (failed unified road polygon approach, 15 commits — do not use)
