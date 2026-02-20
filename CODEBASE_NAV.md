# CODEBASE NAVIGATION REFERENCE

> **Purpose**: Token-saving reference for AI code assistants. Consult this BEFORE searching the codebase. Jump directly to the right file + function instead of scanning.

---

## QUICK LOOKUP: "Where is the code for...?"

| Feature | File(s) | Key Functions/Components |
|---------|---------|--------------------------|
| Lot dimensions | `useStore.js:1542`, `DistrictParameterPanel.jsx` | `updateLotParam(lotId, key, value)` |
| Setback lines (min) | `LotEntity.jsx` (SetbackLines component) | Renders per-side at z=0.1 |
| Setback lines (max) | `LotEntity.jsx` (MaxSetbackLines component) | Renders per-side at z=0.12 |
| Setback lines (accessory) | `LotEntity.jsx` (AccessorySetbackLines component) | Renders per-side at z=0.11 |
| Building editing | `BuildingEditor/index.jsx`, `useStore.js:1037` | `enableBuildingPolygonMode`, `updateBuildingVertex` |
| Building height handle | `BuildingEditor/HeightHandle.jsx` | `setBuildingTotalHeight()` |
| Building position | `useStore.js:757` | `setBuildingPosition(model, newX, newY)` |
| Roof types | `utils/roofGeometry.js`, `BuildingEditor/RoofMesh.jsx` | `generateRoofGeometry(w, d, roofData)` |
| Road zones | `RoadModule.jsx` | Per-zone fill + lines, direction rotation |
| Road intersections | `DistrictSceneContent.jsx`, `intersectionGeometry.js` | Fill rects, `computeCornerZoneStack()` |
| Road fillets (arcs) | `RoadIntersectionFillet.jsx`, `intersectionGeometry.js` | Arc sector geometry |
| S3 alley T-junctions | `DistrictSceneContent.jsx:~280-380` | Road extension + alley fill rects |
| Multi-lot layout | `DistrictSceneContent.jsx`, `LotEntity.jsx` | Lot positioning, streetSides |
| Dimension lines | `Dimension.jsx` | Billboard/follow-line text, backgrounds |
| Angular dimensions | `AngularDimension.jsx` | Roof pitch arcs |
| Annotation labels | `LotAnnotations.jsx`, `RoadAnnotations.jsx` | Per-category label rendering |
| Draggable labels | `DraggableLabel.jsx` | Drag + leader lines + position persistence |
| Lot access arrows | `LotAccessArrow.jsx` | Draggable 2D arrows, bidirectional |
| BTZ planes | `LotEntity.jsx` (BTZPlanes component) | Vertical planes on building faces |
| Camera presets | `CameraHandler.jsx` | 5 slots + standard views |
| Export engine | `Exporter.jsx` | PNG/JPG/SVG/OBJ/GLB/DAE/DXF/IFC |
| IFC generation | `utils/ifcGenerator.js` | `generateIFC()`, `generateDistrictIFC()` |
| CSV import | `ImportWizard.jsx`, `utils/importParser.js` | 3-step wizard, auto-field-matching |
| Auto-save | `hooks/useAutoSave.js`, `useStore.js` | `markDirty()`, `markSaved()` |
| Undo/Redo | `useStore.js` (Zundo), `hooks/useKeyboardShortcuts.js` | `useStore.temporal.getState().undo()` |
| Per-lot styling | `DistrictParameterPanel.jsx`, `useStore.js:2147` | `setEntityStyle(lotId, category, prop, val)` |
| Global layers | `useStore.js:2275`, `viewSettings.layers` | `toggleLayer(layer)`, 26+ keys |
| Per-lot visibility | `useStore.js:2203` | `setLotVisibility(lotId, key, value)` |
| Sun simulation | `SunControls.jsx`, `hooks/useSunPosition.js` | Sun position + directional light |
| Move mode (M key) | `useStore.js`, `useKeyboardShortcuts.js`, `BuildingEditor/index.jsx`, `LotAccessArrow.jsx` | `enterMoveMode`, 3-phase move |
| Delete/regenerate buildings | `useStore.js`, `useKeyboardShortcuts.js`, `DistrictParameterPanel.jsx` | `deleteEntityBuilding`, `regenerateEntityBuilding` |
| Styles section | `DistrictParameterPanel.jsx` (StylesSection) | 12 labeled rows, accordion, per-lot styles |
| Road module global styles | `DistrictParameterPanel.jsx`, `useStore.js` | `setAllRoadZoneColor`, `setAllRoadZoneOpacity` |
| Projects CRUD | `ProjectManager.jsx`, `services/api.js` | REST endpoints on port 3001 |
| Snapshots | `StateManager.jsx`, `useStore.js:2666` | `getSnapshotData()`, `applySnapshot()` |
| Theme system | `App.jsx`, CSS variables `var(--ui-*)` | `setUiTheme('standard'|'modern')` |
| Road module styles | `DistrictParameterPanel.jsx` | `setRoadModuleStyle(layerType, prop, val)` |
| Polygon lot editing | `LotEditor/`, `useStore.js:789` | `enablePolygonMode`, vertex/edge/extrude ops |
| Comparison roads | `useStore.js` (comparisonRoads), `SceneContent.jsx` | Left/right/rear roads for comparison module |
| Unit formatting | `utils/formatUnits.js` | `formatDimension(value, 'feet'|'feet-inches'|'meters')` |
| Dimension stacking | `utils/dimensionLayout.js` | `computeDimensionOffsets(dims, gap)` |

---

## FILE INDEX WITH LINE COUNTS

### Entry Points
| File | Lines | Purpose |
|------|-------|---------|
| `src/main.jsx` | 13 | React entry, HashRouter |
| `src/App.jsx` | 93 | Routes: `/` → StartScreen, `/app` → MainLayout |

### State Management
| File | Lines | Purpose |
|------|-------|---------|
| `src/store/useStore.js` | ~3,653 | Zustand store: ALL state + 100+ actions + migrations v1-v22 |
| `src/hooks/useEntityStore.js` | ~145 | Memoized selectors: `useLot`, `useLotIds`, `useActiveLot`, etc. |
| `src/hooks/useAutoSave.js` | ~45 | Periodic save when dirty |
| `src/hooks/useKeyboardShortcuts.js` | ~114 | Cmd+Z/Y/S, M (move), Delete, Escape shortcuts |
| `src/hooks/useSunPosition.js` | ~121 | SunCalc sun position + 12 city presets |

### Services
| File | Lines | Purpose |
|------|-------|---------|
| `src/services/api.js` | 150 | REST client for all backend endpoints |

### Utilities
| File | Lines | Purpose |
|------|-------|---------|
| `src/utils/ifcGenerator.js` | 755 | IFC4 BIM file generation |
| `src/utils/importParser.js` | ~502 | CSV parsing + field mapping + district params |
| `src/utils/roofGeometry.js` | 301 | Roof mesh generation (flat/shed/gabled/hipped) |
| `src/utils/intersectionGeometry.js` | 266 | Road fillet arc computation |
| `src/utils/dimensionLayout.js` | 95 | Auto-stacking parallel dimensions |
| `src/utils/formatUnits.js` | 36 | ft / ft-in / meters formatting |

### 3D Rendering Components
| File | Lines | Purpose |
|------|-------|---------|
| `src/components/SceneContent.jsx` | ~833 | Comparison Module 3D scene (lots, buildings, roads) |
| `src/components/LotEntity.jsx` | ~786 | District lot renderer (setbacks, buildings, BTZ, arrows) |
| `src/components/DistrictSceneContent.jsx` | ~615 | District multi-lot orchestrator (roads, intersections, fillets) |
| `src/components/Viewer3D.jsx` | ~449 | Comparison canvas container |
| `src/components/RoadModule.jsx` | ~343 | Parametric road with zones (S1/S2/S3) |
| `src/components/SharedCanvas.jsx` | ~316 | Shared R3F Canvas (lighting, sun/studio toggle, post-processing) |
| `src/components/DistrictViewer.jsx` | ~203 | District canvas container |
| `src/components/RoadIntersectionFillet.jsx` | ~122 | Curved corner arcs |
| `src/components/LotAccessArrow.jsx` | ~321 | Draggable access direction arrows |

### Parameter Panels
| File | Lines | Purpose |
|------|-------|---------|
| `src/components/DistrictParameterPanel.jsx` | ~2,359 | District sidebar (model setup, per-lot params, styles section, road styles) |
| `src/components/ParameterPanel.jsx` | ~1,809 | Comparison sidebar (existing/proposed params, styles) |

### Dimensions & Annotations
| File | Lines | Purpose |
|------|-------|---------|
| `src/components/LotAnnotations.jsx` | ~250 | Lot/setback/building labels |
| `src/components/RoadAnnotations.jsx` | ~232 | Road name + zone labels |
| `src/components/Dimension.jsx` | ~240 | Dimension line with text + background; supports markerColor/Scale, extensionLineColor/Style, fontFamily, verticalMode |
| `src/components/DraggableLabel.jsx` | ~171 | Drag-to-reposition with leader line |
| `src/components/AngularDimension.jsx` | ~154 | Arc dimension for angles |
| `src/components/AnnotationText.jsx` | ~143 | Shared text renderer (billboard/follow-line/fixed) |
| `src/components/LeaderCallout.jsx` | ~98 | Leader line with arrow |

### Building/Lot Editors
| File | Lines | Purpose |
|------|-------|---------|
| `src/components/BuildingEditor/index.jsx` | ~504 | Building polygon editor orchestrator |
| `src/components/BuildingEditor/HeightHandle.jsx` | ~106 | Draggable height sphere |
| `src/components/BuildingEditor/PolygonBuilding.jsx` | ~80 | Building polygon renderer |
| `src/components/BuildingEditor/RoofMesh.jsx` | ~67 | Roof geometry renderer |
| `src/components/LotEditor/index.jsx` | ~112 | Lot polygon editor wrapper |
| `src/components/LotEditor/PolygonLot.jsx` | ~106 | Lot polygon + handles |
| `src/components/LotEditor/VertexHandle.jsx` | ~99 | Draggable vertex sphere |
| `src/components/LotEditor/EdgeHandle.jsx` | ~147 | Edge manipulation handle |
| `src/components/LotEditor/MidpointHandle.jsx` | ~51 | Edge split click target |

### Project Management
| File | Lines | Purpose |
|------|-------|---------|
| `src/components/ProjectManager.jsx` | ~450 | Top navbar, project CRUD, module switcher, sun controls |
| `src/components/StartScreen.jsx` | ~438 | Entry: Sandbox / New / Open |
| `src/components/Exporter.jsx` | ~554 | Multi-format export + batch ZIP engine |
| `src/components/StateManager.jsx` | ~320 | Snapshots + layer states UI |
| `src/components/ImportWizard.jsx` | ~822 | CSV import wizard (lots + district params) |
| `src/components/CameraHandler.jsx` | ~91 | Camera presets |
| `src/components/SunControls.jsx` | ~139 | Sun controls dropdown (rotation, angle, intensity, shadows) |

### UI Atoms
| File | Lines | Purpose |
|------|-------|---------|
| `src/components/ui/Section.jsx` | 41 | Collapsible section |
| `src/components/ui/SliderInput.jsx` | 40 | Range + number combo |
| `src/components/ui/ColorPicker.jsx` | 27 | Color picker |
| `src/components/ui/LineStyleSelector.jsx` | 51 | Solid/dashed toggle |

### Server
| File | Lines | Purpose |
|------|-------|---------|
| `server/index.js` | 74 | Express setup, CORS, port 3001 |
| `server/routes/config.js` | 55 | GET/PUT projects directory |
| `server/routes/projects.js` | 191 | Project CRUD (creates snapshots/, layer-states/, scenarios/ on new project) |
| `server/routes/exports.js` | 161 | Export file management |
| `server/routes/snapshots.js` | 152 | Full-state snapshots |
| `server/routes/layer-states.js` | 152 | Style-only snapshots |
| `server/routes/scenarios.js` | ~145 | District scenario CRUD (auto-creates scenarios/ folder for legacy projects) |

---

## STORE ACTIONS INDEX (useStore.js)

### Comparison Module — Lot
| Action | ~Line | Signature |
|--------|-------|-----------|
| `updateExisting` | 755 | `(key, value)` |
| `updateProposed` | 756 | `(key, value)` |
| `enablePolygonMode` | 789 | `(model)` — rect → polygon |
| `setPolygonEditing` | 828 | `(model, editing)` |
| `commitPolygonChanges` | 843 | `(model)` |
| `resetToRectangle` | 863 | `(model)` |
| `updateVertex` | 880 | `(model, vertexIndex, newX, newY)` |
| `splitEdge` | 913 | `(model, edgeIndex)` |
| `extrudeEdge` | 952 | `(model, edgeIndex, distance)` |
| `deleteVertex` | 999 | `(model, vertexIndex)` |

### Comparison Module — Building
| Action | ~Line | Signature |
|--------|-------|-----------|
| `selectBuilding` | 1026 | `(model, selected)` |
| `deselectAllBuildings` | 1031 | `()` |
| `enableBuildingPolygonMode` | 1037 | `(model)` |
| `updateBuildingVertex` | 1058 | `(model, vertexIndex, newX, newY)` |
| `splitBuildingEdge` | 1078 | `(model, edgeIndex)` |
| `extrudeBuildingEdge` | 1104 | `(model, edgeIndex, distance)` |
| `deleteBuildingVertex` | 1140 | `(model, vertexIndex)` |
| `resetBuildingToRectangle` | 1158 | `(model)` |
| `setBuildingTotalHeight` | 1180 | `(model, newTotalHeight)` |
| `setBuildingPosition` | 757 | `(model, newX, newY)` |
| `setRoofSetting` | 1197 | `(model, key, value)` |

### Comparison Module — Accessory Building
| Action | ~Line | Signature |
|--------|-------|-----------|
| `selectAccessoryBuilding` | 1209 | `(model, selected)` |
| `setAccessoryBuildingPosition` | 1220 | `(model, newX, newY)` |
| `enableAccessoryBuildingPolygonMode` | 1246 | `(model)` |
| `updateAccessoryBuildingVertex` | 1267 | `(model, vertexIndex, newX, newY)` |
| `splitAccessoryBuildingEdge` | 1287 | `(model, edgeIndex)` |
| `extrudeAccessoryBuildingEdge` | 1313 | `(model, edgeIndex, distance)` |
| `deleteAccessoryBuildingVertex` | 1349 | `(model, vertexIndex)` |
| `resetAccessoryBuildingToRectangle` | 1367 | `(model)` |
| `setAccessoryBuildingTotalHeight` | 1389 | `(model, newTotalHeight)` |
| `setAccessoryRoofSetting` | 1403 | `(model, key, value)` |

### District Module — Lots
| Action | ~Line | Signature |
|--------|-------|-----------|
| `setActiveModule` | 1414 | `(module)` |
| `setModelSetup` | 1417 | `(key, value)` |
| `setStreetEdge` | 1420 | `(edge, enabled)` — stash/restore roads |
| `setStreetType` | 1458 | `(edge, type)` — S1/S2/S3 |
| `setDistrictParameter` | 1466 | `(path, value)` |
| `addLot` | 1480 | `(initialData)` |
| `removeLot` | 1497 | `(lotId)` |
| `duplicateLot` | 1513 | `(lotId)` |
| `updateLotParam` | 1542 | `(lotId, key, value)` |
| `updateLotSetback` | 1556 | `(lotId, buildingType, key, value)` |
| `updateBuildingParam` | 1580 | `(lotId, buildingType, key, value)` |
| `setEntityRoofSetting` | 1604 | `(lotId, buildingType, key, value)` |
| `setEntityBuildingTotalHeight` | 1631 | `(lotId, buildingType, newTotalHeight)` |
| `deleteEntityBuilding` | ~1610 | `(lotId, buildingType)` — reset to zero dims |
| `regenerateEntityBuilding` | ~1630 | `(lotId, buildingType)` — restore defaults |
| `selectEntity` | 1662 | `(lotId)` |
| `deselectEntity` | 1663 | `()` |

### District Module — Building Selection & Editing
| Action | ~Line | Signature |
|--------|-------|-----------|
| `selectEntityBuilding` | 1664 | `(lotId, buildingType)` |
| `deselectAllEntityBuildings` | 1700 | `()` |
| `setEntityBuildingPosition` | 1724 | `(lotId, buildingType, newX, newY)` |

### District Module — Lot Polygon
| Action | ~Line | Signature |
|--------|-------|-----------|
| `enableEntityPolygonMode` | 1756 | `(lotId)` |
| `setEntityPolygonEditing` | 1782 | `(lotId, editing)` |
| `updateEntityVertex` | 1799 | `(lotId, vertexIndex, newX, newY)` |
| `splitEntityEdge` | 1822 | `(lotId, edgeIndex)` |
| `extrudeEntityEdge` | 1842 | `(lotId, edgeIndex, distance)` |
| `deleteEntityVertex` | 1870 | `(lotId, vertexIndex)` |
| `commitEntityPolygonChanges` | 1886 | `(lotId)` |
| `resetEntityToRectangle` | 1901 | `(lotId)` |

### District Module — Building Polygon
| Action | ~Line | Signature |
|--------|-------|-----------|
| `enableEntityBuildingPolygonMode` | 1917 | `(lotId, buildingType)` |
| `updateEntityBuildingVertex` | 1949 | `(lotId, buildingType, vertexIndex, newX, newY)` |
| `splitEntityBuildingEdge` | 1980 | `(lotId, buildingType, edgeIndex)` |
| `extrudeEntityBuildingEdge` | 2008 | `(lotId, buildingType, edgeIndex, distance)` |
| `deleteEntityBuildingVertex` | 2044 | `(lotId, buildingType, vertexIndex)` |
| `resetEntityBuildingToRectangle` | 2068 | `(lotId, buildingType)` |

### District Module — Roads
| Action | ~Line | Signature |
|--------|-------|-----------|
| `addEntityRoadModule` | 2092 | `(direction, type)` |
| `removeEntityRoadModule` | 2103 | `(roadId)` |
| `updateEntityRoadModule` | 2110 | `(roadId, key, value)` |
| `changeEntityRoadModuleType` | 2124 | `(roadId, newType)` |

### District Module — Styling & Visibility
| Action | ~Line | Signature |
|--------|-------|-----------|
| `setEntityStyle` | 2147 | `(lotId, category, property, value)` |
| `setEntityStyleOverride` | 2164 | `(lotId, category, side, key, value)` |
| `applyStyleToAllLots` | 2186 | `(category, property, value)` |
| `setLotVisibility` | 2203 | `(lotId, key, value)` |
| `setAllRoadZoneColor` | ~2525 | `(color)` — update all road zone colors |
| `setAllRoadZoneOpacity` | ~2545 | `(opacity)` — update all road zone opacities |

### View, Style & Render
| Action | ~Line | Signature |
|--------|-------|-----------|
| `toggleViewMode` | 2214 | `()` — split ↔ overlay |
| `setCameraView` | 2215 | `(view)` |
| `setProjection` | 2222 | `(projection)` |
| `toggleLayer` | 2275 | `(layer)` |
| `setLayer` | 2225 | `(layer, value)` |
| `setStyle` | 2233 | `(model, category, property, value)` |
| `setExportFormat` | 2276 | `(format)` |
| `triggerExport` | 2291 | `()` |
| `setExportLineScale` | 2297 | `(scale)` |
| `setRenderSetting` | 2569 | `(key, value)` |
| `setLighting` | 2576 | `(key, value)` |

### Dimensions & Annotations
| Action | ~Line | Signature |
|--------|-------|-----------|
| `setDimensionSetting` | 2319 | `(key, value)` |
| `setCustomLabel` | 2349 | `(dimensionKey, mode, text)` |
| `setAnnotationSetting` | 2332 | `(key, value)` |
| `setAnnotationPosition` | 2335 | `(annotationId, position)` |
| `resetAnnotationPositions` | 2338 | `()` |

### Sun
| Action | ~Line | Signature |
|--------|-------|-----------|
| `setSunSetting` | 2301 | `(key, value)` |
| `toggleSun` | 2304 | `()` |
| `setSunTime` | 2307 | `(time)` |
| `setSunDate` | 2310 | `(date)` |
| `setSunLocation` | 2313 | `(latitude, longitude)` |

### Project Management
| Action | ~Line | Signature |
|--------|-------|-----------|
| `setCurrentProject` | 2650 | `(project)` |
| `clearCurrentProject` | 2652 | `()` |
| `getSnapshotData` | 2666 | `()` → snapshot object |
| `applySnapshot` | 2711 | `(snapshotData)` |
| `getLayerStateData` | 2698 | `()` → style-only object |
| `applyLayerState` | 2750 | `(layerStateData)` |
| `getProjectState` | 2761 | `()` → full serialized state |
| `applyProjectState` | 2787 | `(projectState)` |

### Move Mode (District Module)

| Action | ~Line | Signature |
|--------|-------|-----------|
| `enterMoveMode` | ~2560 | `()` — activate selectObject phase |
| `exitMoveMode` | ~2570 | `()` — clear all move state |
| `setMoveTarget` | ~2580 | `(type, lotId, buildingType\|direction)` |
| `setMoveBasePoint` | ~2590 | `(point)` — [x, y] base reference |

### Scenarios

| Action | ~Line | Signature |
|--------|-------|-----------|
| `setScenarios` | ~2900 | `(list)` — set metadata list from API |
| `setActiveScenario` | ~2901 | `(name)` — set active district name |

### Auto-Save & UI
| Action | ~Line | Signature |
|--------|-------|-----------|
| `setAutoSaveEnabled` | 2625 | `(enabled)` |
| `markDirty` | 2626 | `()` |
| `markSaved` | 2627 | `()` |
| `showToast` | 2631 | `(message, type)` |

---

## EXPORTED FACTORY FUNCTIONS (useStore.js)

| Function | ~Line | Returns |
|----------|-------|---------|
| `createDefaultLot(overrides)` | 114 | Complete lot object with setbacks, buildings, geometry |
| `createDefaultLotStyle(overrides)` | 156 | Style settings (colors, widths, opacity per category) |
| `createDefaultRoadModule(direction, type, overrides)` | 204 | Road params (S1/S2/S3 with ROW/width defaults) |
| `createDefaultLotVisibility()` | 225 | Per-lot visibility toggles (all default true) |
| `rectToVertices(width, depth, centerX, centerY)` | 14 | 4 polygon vertices from rect params |
| `verticesToBoundingRect(vertices)` | 26 | { width, depth, centerX, centerY } |
| `calculatePolygonArea(vertices)` | 43 | Area via Shoelace formula |

---

## ENTITY SELECTOR HOOKS (useEntityStore.js)

| Hook | Returns |
|------|---------|
| `useLot(lotId)` | Lot data object |
| `useLotIds()` | string[] of lot IDs in order |
| `useActiveLotId()` | Active lot ID or null |
| `useActiveLot()` | Active lot data or null |
| `useLotStyle(lotId)` | Per-lot style object |
| `useBuilding(lotId, buildingType)` | principal/accessory building data |
| `useRoadModules()` | All road modules { id: data } |
| `useRoadModulesByDirection(dir)` | Roads filtered by direction |
| `useLotVisibility(lotId)` | Per-lot visibility flags |
| `useActiveModule()` | 'comparison' or 'district' |
| `useModelSetup()` | { numLots, streetEdges, streetTypes } |
| `useDistrictParameters()` | Reference zoning data |
| `useEntityCount()` | Number of lots |
| `getLotData(lotId)` | **Non-hook**: direct store access |

---

## LAYER VISIBILITY KEYS (viewSettings.layers)

Global toggles (26+): `lotLines`, `setbacks`, `maxSetbacks`, `accessorySetbacks`, `buildings`, `roof`, `grid`, `roadModule`, `origin`, `ground`, `roadIntersections`, `annotationLabels`, `labelLotNames`, `labelLotEdges`, `labelSetbacks`, `labelMaxSetbacks`, `labelRoadNames`, `labelRoadZones`, `labelBuildings`, `btzPlanes`, `lotAccessArrows`, `dimensions`, `maxHeightPlane`, `accessoryBuildings`

Per-lot visibility (lotVisibility[lotId]): `lotLines`, `setbacks`, `maxSetbacks`, `accessorySetbacks`, `buildings`, `roof`, `btzPlanes`, `lotAccessArrows`, `maxHeightPlane`

**Visibility formula**: `layers.X && lotVisibility[lotId].X` (both must be true)

---

## Z-LAYER MAP

| Geometry | Z-offset | renderOrder |
|----------|----------|-------------|
| Ground plane | 0.0 | — |
| Lot fill | 0.02 | — |
| Lot lines / alley fill rects | 0.03 | — |
| Road intersection fill rects | 0.04 | 1 |
| Fillet arc fills | 0.05 | 2 |
| Fillet arc border lines | 0.055 | 3 |
| Min setback lines | 0.1 | — |
| Accessory setback lines | 0.11 | — |
| Max setback lines | 0.12 | — |
| Lot access arrows | 0.15 | — |
| BTZ planes | vertical (0 → firstFloorHeight) | — |

---

## COMPONENT HIERARCHY

### Comparison Module
```
App.jsx → MainLayout
  ├── ProjectManager.jsx (navbar)
  ├── Viewer3D.jsx (canvas)
  │   └── SharedCanvas.jsx
  │       └── SceneContent.jsx
  │           ├── RectLot / PolygonLot (lot fill + lines)
  │           ├── SetbackLayer (setback lines)
  │           ├── BuildingEditor (principal + accessory)
  │           ├── RoofMesh
  │           ├── Dimension / AngularDimension
  │           ├── LotAnnotations / RoadAnnotations
  │           ├── RoadModule (front + comparison roads)
  │           └── RoadIntersectionFillet
  ├── ParameterPanel.jsx (sidebar)
  │   ├── Existing/Proposed parameter sections
  │   ├── StyleEditor (inline)
  │   ├── Layers, Annotations, Dimensions, Sun, Export
  └── Exporter.jsx (export engine)
```

### District Module
```
App.jsx → MainLayout
  ├── ProjectManager.jsx (navbar)
  ├── DistrictViewer.jsx (canvas + SunControls)
  │   └── SharedCanvas.jsx
  │       └── DistrictSceneContent.jsx (+MoveModeCapturePlane)
  │           ├── LotEntity.jsx (per lot ×5)
  │           │   ├── RectLot / PolygonLot
  │           │   ├── SetbackLines / MaxSetbackLines / AccessorySetbackLines
  │           │   ├── BuildingEditor (principal + accessory)
  │           │   ├── BTZPlanes
  │           │   ├── LotAccessArrow
  │           │   ├── LotAnnotations
  │           │   └── Dimension
  │           ├── RoadModule (×4 directions)
  │           ├── RoadIntersectionFillet (×N corners)
  │           └── RoadAnnotations
  ├── DistrictParameterPanel.jsx (sidebar)
  │   ├── Model Setup (lots, streets, road types)
  │   ├── Model Parameters Table (per-lot columns)
  │   ├── Styles Section (12 categories, accordion)
  │   ├── Road Modules, Road Styles (global + collapsible zones)
  │   ├── Layers, Annotations, Dimensions
  └── Exporter.jsx
```

---

## BACKEND API ENDPOINTS

| Method | Endpoint | Handler File |
|--------|----------|-------------|
| GET | `/api/health` | `server/index.js` |
| GET/PUT | `/api/config` | `server/routes/config.js` |
| GET/POST | `/api/projects` | `server/routes/projects.js` |
| GET/PUT/DELETE | `/api/projects/:id` | `server/routes/projects.js` |
| GET/POST/DELETE | `/api/projects/:id/exports/:filename` | `server/routes/exports.js` |
| GET/POST/DELETE | `/api/projects/:id/snapshots/:name` | `server/routes/snapshots.js` |
| GET/POST/DELETE | `/api/projects/:id/layer-states/:name` | `server/routes/layer-states.js` |

---

## STORE MIGRATION VERSIONS

| Version | What Changed |
|---------|-------------|
| v15 | Entity system, accessory buildings, comparison roads |
| v16 | Annotation system, enhanced dimensions, road intersection fillets |
| v17 | Fixed fillOpacity defaults to 1.0 for road zone + roadWidth styles |
| v18 | Max setback lines with independent style/visibility/layer toggles |
| v19 | Internal |
| v20 | BTZ planes, accessory setback lines, lot access arrows, new style categories |
| v21 | Backfill migration for v20 keys added after version bump |
| v22 | Principal/accessory building style variants (principalBuildingEdges/Faces, accessoryBuildingEdges/Faces) |

---

## CONVENTIONS CHEAT SHEET

- **Opacity default**: Always 1.0 (100%) — sub-1.0 causes color mismatch
- **Null guards**: `!= null && > 0` before rendering any geometry
- **Fallbacks**: Use `??` not `||` for numeric props (respects explicit `0`)
- **Visibility**: `layers.X && lotVisibility[lotId].X` — both must be true
- **Street-aware setbacks**: `streetSides` prop determines side street vs interior
- **renderOrder**: Road zones=0, intersection fill=1, fillet fills=2, fillet lines=3
- **Material**: `transparent={opacity < 1}`, `depthWrite={opacity >= 0.95}`
