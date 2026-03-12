# CODEBASE NAVIGATION REFERENCE

> **Purpose**: Token-saving reference for AI code assistants. Consult this BEFORE searching the codebase. Jump directly to the right file + function instead of scanning.

---

## QUICK LOOKUP: "Where is the code for...?"

| Feature | File(s) | Key Functions/Components |
|---------|---------|--------------------------|
| Lot dimensions | `useStore.js:1542`, `DistrictParameterPanel.jsx` | `updateLotParam(lotId, key, value)` |
| District→lot auto-populate | `useStore.js` (DISTRICT_TO_LOT_MAP), `DistrictParameterPanel.jsx` | `applyDistrictDefaultsToLot()`, `DISTRICT_REF_MAP`, `DistrictRefCell` |
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
| Drawing editor tools | `DrawingEditor/`, `useStore.js:~2700` | 12 types, select/move/resize/vertex edit |
| Drawing hit-testing | `utils/drawingHitTest.js` | `hitTestObject`, `computeObjectBounds`, `computeMoveUpdate` |
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

### Drawing Editor
| File | Lines | Purpose |
|------|-------|---------|
| `src/components/DrawingEditor/index.jsx` | ~58 | Drawing editor entry point, renders objects by layer + selection overlay + capture plane |
| `src/components/DrawingEditor/DrawingCapturePlane.jsx` | ~820 | Pointer event handler for all drawing tools + select tool + drag-to-move |
| `src/components/DrawingEditor/DrawingObjectRenderer.jsx` | ~600 | Renders 12 drawing object types with selection highlighting |
| `src/components/DrawingEditor/DrawingSelectionOverlay.jsx` | ~405 | Bounding box + vertex/resize handles for selected objects |
| `src/components/DrawingEditor/DrawingHandles.jsx` | ~175 | DrawingVertexHandle (sphere) + DrawingResizeHandle (box) components |
| `src/components/DrawingEditor/DrawingToolbar.jsx` | ~200 | Vertical toolbar on left side of canvas (14 tools) |
| `src/components/DrawingEditor/DrawingLayersPanel.jsx` | ~250 | Sidebar panel for managing drawing layers |
| `src/components/DrawingEditor/DrawingTextInput.jsx` | ~80 | HTML overlay for text/leader text entry |
| `src/utils/drawingGeometry.js` | ~130 | Vertex generators (circle, ellipse, star, polygon, rounded rect) + pointInPolygon |
| `src/utils/drawingHitTest.js` | ~200 | Hit-test utilities + computeObjectBounds + computeMoveUpdate |

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


> For detailed store actions, factory functions, hooks, z-map, and component hierarchy, see `CODEBASE_LIBRARY.md`.
