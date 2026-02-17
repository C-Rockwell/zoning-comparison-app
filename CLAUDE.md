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
│   │   ├── DistrictSceneContent.jsx  # District 3D: multi-lot layout, roads, intersection fills, fillets (~345 lines)
│   │   ├── DistrictParameterPanel.jsx # District sidebar: model setup, params, styles, road styles, annotations (~1,956 lines)
│   │   ├── SharedCanvas.jsx          # Shared R3F Canvas infra: lighting, post-processing (~230 lines)
│   │   ├── LotEntity.jsx             # Single lot entity renderer with annotations (~420 lines)
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
│   ├── store/useStore.js             # Centralized Zustand store (~3,200 lines, v16)
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

**Store version**: 17 (with migration system for backward compat from v1-v16; v15 added entity system, accessory buildings, comparison roads; v16 added annotation system, enhanced dimensions, road intersection fillets; v17 fixed fillOpacity defaults to 1.0 for all road zone and roadWidth styles)

**Undo/redo via Zundo**: tracks existing, proposed, viewSettings, layoutSettings, sunSettings, renderSettings, roadModule, roadModuleStyles, entities, entityOrder, entityStyles, lotVisibility, comparisonRoads, annotationSettings, annotationPositions. Excludes exportRequested flag.

**Entity selector hooks** (`src/hooks/useEntityStore.js`): `useLot(lotId)`, `useLotIds()`, `useActiveLot()`, `useLotStyle(lotId)`, `useBuilding(lotId, type)`, `useRoadModules()`, `useRoadModulesByDirection(direction)`, `useLotVisibility(lotId)`, `useActiveModule()`, `useModelSetup()`, `useDistrictParameters()`, `useEntityCount()`, `getLotData(lotId)` (non-hook)

### Road Module System

RoadModule.jsx accepts a `direction` prop: `'front'` (default), `'left'`, `'right'`, `'rear'`. Direction changes are implemented via group rotation (DIRECTION_ROTATION constant). Also accepts `suppressLeftEnd` / `suppressRightEnd` boolean props to hide end-edge border lines at intersection boundaries (computed per-direction in DistrictSceneContent based on perpendicular road existence). In the District Module, roads stop at lot boundaries; intersection fill rectangles (z=0.04, renderOrder=1) cover the ROW overlap area, and fillet arcs (z=0.05, renderOrder=2) handle curved zone corners. Road Module Styles are editable via `RoadModuleStylesSection` in DistrictParameterPanel using `setRoadModuleStyle(layerType, property, value)`. Fillets generate 4 sub-corners per perpendicular pair using `computeCornerZoneStack(roadA, roadB, corner, styles, sideA, sideB)` from `intersectionGeometry.js`.

Road types with distinct defaults:
- **S1** (Primary Street): ROW 50', road 24' — full zones (parking, verge, sidewalk, transition)
- **S2** (Secondary Street): ROW 40', road 24' — narrower variant
- **S3** (Alley/Rear): ROW 20', road 16' — minimal, no sidewalk/verge

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
- **Model Parameters**: Functional parameters in per-lot columns with collapsible subsections (Lot Dimensions, Setbacks, etc.)

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

## Active Issue: Fillet Arc Line Width Mismatch at Road Intersections

**Status**: UNRESOLVED — needs a fix. Multiple approaches have been tried and failed.

### Problem Description

When two perpendicular roads meet at an intersection in the District Module, the outermost fillet arc boundary line (the curved line where the road surface zone meets the first adjacent zone like parking/verge) should visually match the straight road module edge lines in color, width, and style. The color and style now match correctly (magenta, using `roadWidthStyle`), but **the curved fillet arc lines appear noticeably thicker than the equivalent straight road module edge lines**, despite using the identical `lineWidth` value from the same style object (`roadModuleStyles.roadWidth`).

Additionally, there are **small gaps/artifacts at the junction points** where the curved fillet arc endpoints should seamlessly meet the straight road module edge line endpoints. These appear as tiny bumps or disconnections at the transition from straight to curved.

### Visual Reference

- The straight road module edges are rendered in `RoadModule.jsx` as 2-point `<Line>` segments (p2→p3 and p4→p1 for end edges)
- The curved fillet arcs are rendered in `RoadIntersectionFillet.jsx` as multi-point `<Line>` polylines (13 points after sub-sampling, originally 25 points)
- Both use the same `roadModuleStyles.roadWidth.lineWidth` value (default: 1) and the same `lineScale` multiplier
- The thickness difference is clearly visible when zoomed in — the curves look ~1.5-2x as thick as the straight lines

### Root Cause

Three.js `Line2` / drei's `<Line>` renders thick lines using screen-space geometry shaders. Multi-point polylines generate miter geometry at each segment join, which causes cumulative visual thickening compared to simple 2-point straight lines. This is an inherent Line2 rendering characteristic, not a bug in our code. The more points in the polyline, the thicker it appears.

### What Has Been Tried (and Failed)

1. **Sub-sampling arc points** (`RoadIntersectionFillet.jsx` lines 72-75): Reduced outermost arc from 25 points to 13 by filtering every other point. Result: still visibly thicker than straight lines, and may have introduced additional junction artifacts.

2. **Straight intersection edge lines through fill rect center** (removed from `DistrictSceneContent.jsx`): Added 4 straight line segments forming a rectangle in the center of each intersection. Result: incorrect approach — user wanted the *curved fillet boundary lines* to match, not new straight lines in the center.

3. **Render arc as many 2-point segments instead of one polyline** (`09f120f`, `src/components/RoadIntersectionFillet.jsx`): Replaced one multi-point `<Line>` with many tiny 2-point `<Line>` segments for the outer arc to remove Line2 join/miter thickening. Result: did not resolve visual mismatch/gap artifacts to acceptable level.

4. **Pivot to unified pre-built road network preview (feature flagged)** (`882a781`, `src/components/UnifiedRoadNetwork.jsx`, `src/components/DistrictSceneContent.jsx`, `src/store/useStore.js`, `src/components/DistrictParameterPanel.jsx`): Introduced fixed road scenario renderer and universal styling controls to reduce per-side complexity. Result: architectural pivot worked, but did not solve the critical front/right intersection geometry target.

5. **UI simplification for unified mode** (`f271d0e`, `src/components/DistrictParameterPanel.jsx`): Hid per-direction road module controls and exposed only universal road-network styling in unified mode. Result: UX simplification only; geometry issue remained unresolved.

6. **Fix for missing left/right/rear roads in unified mode** (`841f861`, `src/components/DistrictSceneContent.jsx`, `src/components/DistrictParameterPanel.jsx`): Corrected edge-enable logic so fixed scenario roads render in all directions. Result: rendering completeness fixed, but corner termination geometry still incorrect.

7. **Front-right intersection geometry iteration 1 (curb-depth constrained fillets)** (`bc02e5c`, `src/components/UnifiedRoadNetwork.jsx`): Limited corner fillet extents to curb-return depth. Result: still produced incorrect corner behavior relative to target diagram.

8. **Front-right intersection geometry iteration 2 (targeted overlay strips + arcs + throat)** (`48b3b1f`, `src/components/UnifiedRoadNetwork.jsx`): Added explicit front-right overlay geometry pieces. Result: still incorrect visual termination and transition behavior.

9. **Front-right intersection geometry iteration 3 (disable base front-right auto-rounding)** (`226b8e0`, `src/components/UnifiedRoadNetwork.jsx`): Suppressed inherited corner rounding in that quadrant to avoid double-curvature interference. Result: still not matching required shape/terminations.

10. **Front-right intersection geometry iteration 4 (quadrant repaint before overlay)** (`e140787`, `src/components/UnifiedRoadNetwork.jsx`): Repainted front-right area before reconstructing return elements. Result: introduced/left artifacts and still failed to match expected intersection.

11. **Front-right intersection geometry iteration 5 (repaint depth reduced 50 -> 13)** (`4b5ec48`, `src/components/UnifiedRoadNetwork.jsx`): Narrowed repaint scope to curb-return zone. Result: still did not produce required corner termination.

12. **Front-right intersection geometry iteration 6 (recenter return arcs)** (`13baaec`, `src/components/UnifiedRoadNetwork.jsx`): Shifted arc center assumptions toward coordinate-driven offsets. Result: mismatch persisted.

13. **Front-right intersection geometry iteration 7 (explicit strip/arc reconstruction)** (`a28c375`, `src/components/UnifiedRoadNetwork.jsx`): Rebuilt the front-right block from explicit linear strips plus return elements. Result: still incorrect against provided coordinate diagram.

14. **Front-right intersection geometry iteration 8 (restore far-side front strips)** (`1c96086`, `src/components/UnifiedRoadNetwork.jsx`): Reintroduced missing front-side strip pieces after explicit reconstruction. Result: still failed target geometry.

15. **Front-right intersection geometry iteration 9 (re-anchor return centers at corner points)** (`3dbef77`, `src/components/UnifiedRoadNetwork.jsx`): Re-based arc centers at corner anchors. Result: still not matching expected intersection.

16. **Front-right intersection geometry iteration 10 (model as T-intersection without vertical side carry-through)** (`e25d99b`, `src/components/UnifiedRoadNetwork.jsx`): Changed front-right block logic to T-style handling. Result: still reported incorrect by user.

### Additional Validation Notes (Current State)

- `npm run build` passes on branch `codex-fix`.
- `npm run lint` fails due to many pre-existing repo-wide lint issues not introduced by these changes.
- Local automated screenshot verification was attempted but constrained by environment:
  - Playwright package download was blocked by network restrictions.
  - macOS `screencapture -x` command failed in this execution environment.
  - Direct browser automation verification could therefore not be completed reliably.

### Files Involved

- **`src/components/RoadIntersectionFillet.jsx`** (~107 lines) — Renders curved fillet arcs. The outermost zone's outer arc line currently uses `roadWidthStyle` for color/width/dash/opacity (lines 66-89). Sub-sampling is applied to outermost arc points (lines 72-75).
- **`src/components/RoadModule.jsx`** (~347 lines) — Renders road module zones. The `RoadPolygon` inner component renders border lines as 2-point `<Line>` segments (lines 205-248). End-edge lines can be suppressed via `suppressLeftEnd`/`suppressRightEnd`.
- **`src/components/DistrictSceneContent.jsx`** (~427 lines) — Orchestrates road modules, intersection fill rects, and fillet arcs. Passes `roadWidthStyle={roadModuleStyles.roadWidth}` to `RoadIntersectionFillet`.
- **`src/utils/intersectionGeometry.js`** (~267 lines) — `computeCornerZoneStack()` generates arc geometry. `getArcPoints()` generates points along arcs (default 24 segments = 25 points). Arc line points are placed at `zOffset + 0.005` above fills.
- **`src/store/useStore.js`** (~3,200 lines) — `roadModuleStyles.roadWidth` default: `{ lineColor: '#000000', lineWidth: 1, lineDashed: false, lineOpacity: 1.0, fillColor: '#666666', fillOpacity: 1.0 }`

### Possible Approaches Not Yet Tried

- **LineWidth correction factor**: Multiply the `lineWidth` for curved arc lines by a reduction factor (e.g., 0.6-0.7x) to visually compensate for miter thickening
- **Fewer arc segments**: Reduce arc resolution further (e.g., 6-8 segments instead of 12) — but risks making curves look faceted
- **Alternative rendering**: Replace `<Line>` (Line2) with standard `THREE.Line` (1px hairline) for the outermost arc, or use `<mesh>` with tube/ribbon geometry
- **Custom line rendering**: Build arc lines from individual 2-point `<Line>` segments (no miter joins) instead of a single polyline
- **BufferGeometry line**: Use raw `THREE.BufferGeometry` + `THREE.LineBasicMaterial` instead of drei's `<Line>` to avoid Line2 miter behavior entirely

### Key Constraint

The fix must make the outermost fillet arc boundary lines appear the **same visual thickness** as the straight 2-point road module edge lines when using the same `lineWidth` value. The curve must remain smooth (no visible faceting). Junction points where curves meet straight lines should have no visible gaps or artifacts.

## Known Limitations

- Setback visualization only works with rectangular lots, not polygon lots
- No 3D model import
- No test suite
- Store is ~3,200 lines — large but functional; entity system, annotation system, and legacy state coexist
- ImportWizard supports CSV only (no Excel/XLSX — would need external library)
- District Module lots are positioned in a simple row layout (no arbitrary placement)
- Road intersection fillet arc lines rely on z-offset separation (not renderOrder) for visibility above fills; transparent sorting edge cases may still occur with non-default opacity values
- Comparison Module road intersections don't yet have end-edge suppression (District Module only)
- See "Active Issue" section above for fillet arc line width mismatch details

## Git

- **Remote**: https://github.com/C-Rockwell/zoning-comparison-app.git
- **Branch**: main
