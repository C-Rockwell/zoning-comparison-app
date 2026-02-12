# Strategic Plan: From Lot Comparison Tool → Neighborhood Development Build-Out Engine

## The Paradigm Shift

The app currently thinks like this:

```
Project → { existing_condition, proposed_condition }
           each with ONE lot, ONE building box, ONE road segment
```

The target paradigm is:

```
Scenario → { street_network, block[] }
Block    → { lot[] }
Lot      → { geometry, setbacks, building_model, zoning_params }
Street   → { segments[], intersections[] }
```

This isn't an incremental feature addition — it's an architectural evolution from a **comparison tool** into a **composition engine**. The existing/proposed comparison can still exist, but at the *scenario level*: "here's the existing neighborhood vs. the proposed development."

---

## What the Image Demands (vs. What Exists Today)

| Capability | Current State | Target State |
|---|---|---|
| Lots | 2 fixed conditions, hardcoded as `existing`/`proposed` | N lots in spatial arrangement, shared property lines |
| Buildings | Procedural box extrusion (BoxGeometry per story) | Imported 3D architectural models (GLTF/GLB) placed on lots |
| Streets | Single linear road module, one side of lot | Connected street network with intersections, curb returns |
| Layout | Side-by-side split screen | Overhead neighborhood view with selectable entities |
| Scale | ~1 lot visible | ~6-20+ lots in block formation |
| Annotations | Per-condition dimensions | Per-lot zoning callouts (setbacks, height, property lines) |
| Store | 1367 lines, 149+ hardcoded `existing`/`proposed` refs | Entity collection system with dynamic CRUD |

---

## Critical Architectural Decisions (Must Resolve Before Coding)

These are the decisions that, if made wrong, will require reworking everything:

### 1. Street-First vs. Lot-First Composition

The reference image suggests a **street-first** model — streets define the public infrastructure, blocks are the voids between streets, lots subdivide blocks. This matches how real development works.

**Recommendation:** Street-first. Users define a street network → the system identifies blocks → users subdivide blocks into lots → buildings are placed on lots.

### 2. Entity Architecture Pattern

The current `state[model]` pattern (where `model` is `'existing'` or `'proposed'`) actually scales to N entities — but the store initialization, serialization, style settings, and UI all assume exactly 2. Two options:

- **Option A: Keyed Object** — `lots: { [id]: lotData }` — Fast lookup, simple updates
- **Option B: Array with IDs** — `lots: [{ id, ...lotData }]` — Preserves order, easier to iterate

**Recommendation:** Keyed object (`Map`-like) for lots, streets, and buildings. A separate `layout` array defines rendering order and spatial relationships.

### 3. The Existing/Proposed Question at Scale

Does "existing vs. proposed" mean comparing two *entire neighborhoods*, or comparing *individual lots* within one neighborhood?

**Recommendation:** Support both. A "scenario" is a complete development layout. Users can have two scenarios open for comparison (the current split-view, but at neighborhood scale). Within a single scenario, lots can be tagged with phases (existing, proposed phase 1, proposed phase 2).

### 4. Model Import Scope

Do imported 3D models replace the box building entirely, or do they coexist?

**Recommendation:** Both. The "building" entity on a lot has a `type` field: `'parametric'` (current box system) or `'model'` (imported GLTF). This preserves backward compatibility and lets users work at different fidelity levels.

---

## Agent Team Work Decomposition

7 workstreams organized in 4 phases, with clear dependencies:

---

### PHASE 1: Foundation (Sequential — Everything Depends On This)

#### Workstream 1: Entity Store Architecture

**The single most critical workstream.** Everything else blocks on this.

**Scope:**
- Redesign `useStore.js` from fixed `existing`/`proposed` objects to an entity collection system
- New top-level state shape:
  ```
  entities: {
    lots: { [id]: { geometry, setbacks, building, zoning, position, streetFrontage } },
    streets: { [id]: { segments, width, row, layers, style } },
    buildings: { [id]: { type, modelUrl, params, lotId, position, rotation } }
  }
  layout: {
    blocks: [{ id, lotIds[], boundaryStreetIds[] }],
    sceneBounds: { ... }
  }
  activeSelection: { type, id }
  ```
- Migrate all 8 polygon editing actions (`enablePolygonMode`, `updateVertex`, `splitEdge`, `extrudeEdge`, `deleteVertex`, etc.) — these already use `state[model]` pattern, so the refactor is clean
- Migrate style settings from `styleSettings.existing`/`.proposed` to per-entity styles with shared defaults
- Store version migration from v13 → v14 (backward compatibility for existing projects)
- Undo/redo with Zundo needs to handle multi-entity batch operations
- CRUD actions: `addLot()`, `removeLot()`, `duplicateLot()`, `addStreet()`, etc.

**Why it must be first:** The store is referenced in every single component. The current 149+ references to `existing`/`proposed` must be refactored before any other workstream can function.

**Estimated complexity:** High. ~1367 lines of store + every component that reads from it.

---

### PHASE 2: Core Systems (Parallelizable — 3 Independent Workstreams)

These three workstreams can be developed simultaneously by separate agents because they touch different parts of the system and have clean interfaces with the entity store.

#### Workstream 2: Street Network Engine

**A completely new system — no existing code to refactor, only the single-segment RoadModule to learn from.**

**Scope:**
- **Graph data structure** for the street network:
  ```
  Street: { id, nodes: [nodeId, nodeId], width, ROW, layers{} }
  Node: { id, position: {x, y}, type: 'endpoint' | 'intersection' | 'dead-end' }
  Intersection: { nodeId, connectedStreetIds[], geometry: curb-return-data }
  ```
- **Street segment geometry renderer** — extend the current `RoadModule.jsx` patterns (layer stacking for parking/verge/sidewalk) to work along arbitrary segment vectors, not just the X-axis
- **Intersection geometry generation** — curb returns (quarter-circle fillets), crosswalk areas, the complex geometry where two ROWs meet at 90 degrees
- **Street-to-lot relationship** — streets define the "front" of lots. A lot's `streetFrontage` property references which street segment it faces. Corner lots reference two streets
- **Street editing UI** — click to place nodes, drag to create segments, snap to grid

**Key insight from current code:** The existing `RoadModule.jsx` (312 lines) uses an excellent algorithmic layer-stacking pattern in `useMemo`. The left/right layer system (parking → verge → sidewalk → transition zone) is already parametric and loops with `.map()`. This pattern can be lifted and applied to arbitrary-direction segments.

**Interface with Store:** Reads/writes to `entities.streets` and `entities.nodes`. Emits intersection data for the renderer.

#### Workstream 3: 3D Model Import Pipeline

**Mostly independent of everything else — can be developed against the current app and plugged into the new architecture later.**

**Scope:**
- **GLTF/GLB/OBJ loader** — Three.js already has `GLTFLoader`, `OBJLoader` in `three-stdlib` (already a dependency). Need async loading with progress indicators, error handling for malformed files
- **Model library system** — a catalog of imported models stored in the project directory. Each entry: `{ id, name, filePath, thumbnail, boundingBox, defaultScale }`
- **Placement controls** — scale, rotation, Y-offset (for models whose origin isn't at ground level). Snap building to lot center or allow free positioning within setback envelope
- **Material handling** — imported models bring their own materials (PBR, textured). The current scene uses `meshStandardMaterial` already, so PBR models will integrate naturally
- **Performance foundations** — model caching (load once, instance many), bounding box computation for LOD decisions, optional wireframe/simplified view at distance
- **Thumbnail generation** — render a small preview of each model for the library browser UI

**Key dependency note:** The current `Exporter.jsx` already uses `GLTFExporter` and `OBJExporter` from `three-stdlib`. The import direction uses the corresponding loaders from the same library. No new dependencies needed.

**Interface with Store:** Writes to `entities.buildings`. Each building references a `modelId` from the library and a `lotId` for placement.

#### Workstream 4: Multi-Lot Layout Engine

**The lot composition logic — duplication, adjacency, block formation.**

**Scope:**
- **Lot placement relative to streets** — given a street segment, place N lots along it with configurable widths and depths
- **Lot duplication** — take one configured lot (with its setbacks, building, zoning params) and stamp it M times along a street, each offset by the lot width
- **Shared property lines** — adjacent lots share edges. When lot A's right side is lot B's left side, the property line renders once
- **Corner lot handling** — lots at street intersections have two street frontages, affecting front/side setback interpretation
- **Block auto-subdivision** — given a block boundary (defined by surrounding streets), subdivide it into a row of lots facing each street, with configurable rear-line depth
- **Lot templates** — save a lot configuration as a reusable template. "Single-family 50x100 with 25' front setback" → apply to 12 lots at once

**Key insight from current code:** The polygon lot system is beautifully architected for this. The `lotGeometry.vertices` array with perpendicular constraints, the `splitEdge`/`extrudeEdge` operations — all of this works per-lot and scales to N lots with no changes to the vertex logic itself.

**Interface with Store:** Reads street data from `entities.streets`, writes lot entities to `entities.lots`, establishes adjacency relationships in `layout.blocks`.

---

### PHASE 3: Integration (Depends on Phase 1 + Phase 2 Results)

#### Workstream 5: Scene Renderer & Interaction Overhaul

**Transform SceneContent from hardcoded 2-group rendering to dynamic entity-driven scene.**

**Scope:**
- **Dynamic entity rendering** — replace the current 180 lines of hardcoded existing/proposed groups with:
  ```jsx
  {Object.values(lots).map(lot => (
    <LotGroup key={lot.id} lot={lot} selected={selection.id === lot.id}>
      <Lot ... />
      <SetbackLayer ... />
      {lot.building.type === 'parametric' ? <Building ... /> : <ImportedModel ... />}
    </LotGroup>
  ))}
  {Object.values(streets).map(street => (
    <StreetSegment key={street.id} street={street} />
  ))}
  {intersections.map(ix => <Intersection key={ix.id} ... />)}
  ```
- **Entity selection system** — raycasting on click to identify which lot/street/building was clicked. Highlight selected entity. Double-click to enter editing mode
- **Camera system upgrade** — zoom-to-fit for selected lot, zoom-to-fit-all, minimap or bird's-eye inset
- **Per-lot ground treatment** — green lawn per lot with distinct boundaries
- **Performance** — frustum culling, LOD for imported models

**Key insight:** The current Building, SetbackLayer, and RoadModule components are already well-parameterized — they take props and render. The refactor here is structural (how components are instantiated) not algorithmic (how they compute geometry).

#### Workstream 6: UI/UX Redesign

**The interaction model changes fundamentally from "configure two conditions side-by-side" to "compose a neighborhood and inspect individual lots."**

**Scope:**
- **Entity inspector panel** — replaces the current ParameterPanel's 3-column layout. When a lot is selected, show its parameters. When a street is selected, show street parameters. When nothing is selected, show scene-level controls
- **Lot template panel** — browse/create/apply lot templates for rapid block population
- **Street editor toolbar** — tools for drawing street segments, setting intersections, adjusting ROW
- **Model library browser** — grid of imported model thumbnails with drag-to-place or click-to-assign
- **Block operations toolbar** — select a block → auto-subdivide, apply template to all lots, adjust lot widths uniformly
- **Scenario comparison** — the existing/proposed split-view at the scenario level (two complete neighborhood layouts side by side)
- **Property line labels** — shared property lines labeled, toggled per-lot or globally

**Key challenge:** The current `ParameterPanel.jsx` is deeply hardcoded to show existing vs. proposed side-by-side. This is a near-complete rewrite, not a refactor.

---

### PHASE 4: Polish & Scale (Depends on Phase 3)

#### Workstream 7: Annotation, Export & Performance at Scale

**Making the neighborhood-scale output production-ready.**

**Scope:**
- **Per-lot annotations** — labeled dimensions on individual lots (Front Yard Depth, Side Yard Depth, Rear Yard Depth, Maximum Height, Lot Width). The current `Dimension` component is already generic — it just needs to be instantiated per-lot with correct world-space coordinates
- **Cross-lot annotations** — property lines that span multiple lots, block boundary callouts, street names
- **Selective export** — export one lot, one block, or the entire neighborhood
- **Export at resolution** — verify WYSIWYG line scaling works at 10x the geometry count without memory issues
- **Performance profiling** — with 20 lots + GLTF models, shadow maps, and post-processing all need profiling. May need instancing for repeated models, shadow map adjustments, or quality presets
- **IFC/DXF export at scale** — the current `ifcGenerator.js` handles a single building. Multi-building IFC export maps well to IFC's site/building/story hierarchy

---

## Dependency Graph

```
Phase 1                Phase 2                   Phase 3              Phase 4

                    ┌─────────────────┐
                    │  WS2: Street    │──────┐
                    │  Network Engine │      │
                    └─────────────────┘      │
                                             │
┌──────────────┐    ┌─────────────────┐    ┌─▼──────────────┐    ┌────────────────┐
│ WS1: Entity  │───>│  WS4: Multi-Lot │───>│ WS5: Scene     │───>│ WS7: Annotate  │
│ Store Arch   │    │  Layout Engine  │    │ Renderer       │    │ Export & Perf  │
└──────┬───────┘    └─────────────────┘    └─┬──────────────┘    └────────────────┘
       │                                     │
       │            ┌─────────────────┐    ┌─▼──────────────┐
       └───────────>│  WS3: 3D Model  │───>│ WS6: UI/UX     │
                    │  Import Pipeline│    │ Redesign       │
                    └─────────────────┘    └────────────────┘
```

**Critical path:** WS1 → WS4 → WS5 → WS7

**Parallel opportunities:**
- WS2 + WS3 + WS4 can all develop simultaneously after WS1
- WS5 + WS6 can develop simultaneously once their inputs are ready
- WS3 (model import) can actually start before WS1 finishes since it's largely independent

---

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Store refactor breaks everything | **Critical** | Build WS1 with a compatibility shim — old `existing`/`proposed` accessors delegate to new entity system. Migrate components incrementally, not all at once |
| Performance collapse with 20+ lots + GLTF models | **High** | Establish performance budget early. Profile with 20 box-geometry lots before adding model import. Set triangle count limits per model. Add LOD from the start in WS3 |
| Street intersection geometry is geometrically complex | **Medium** | Start with 90-degree intersections only. Curved streets and acute angles are future scope |
| Undo/redo at scale becomes expensive | **Medium** | Zundo's 50-item limit already helps. Consider structural sharing (immer-style) for entity collections to avoid deep-cloning 20 lot objects on every mutation |
| Backward compatibility with existing projects | **Medium** | Store migration v13→v14 converts old projects to new format. Old `existing` becomes lot[0], `proposed` becomes lot[1], road module becomes street[0]. Test migration exhaustively |
| UI complexity explosion | **High** | Phase the UI. Start with "power user" mode (keyboard shortcuts, minimal panels). Iterate toward the polished multi-panel layout |

---

## Agent Team Composition (When Ready to Build)

For maximum parallelism with Claude Code agent teams:

| Agent | Role | Phase | Files Touched |
|---|---|---|---|
| **store-architect** | Entity store redesign + migration | Phase 1 | `useStore.js`, all component store imports |
| **street-engineer** | Street network graph + geometry | Phase 2 | New `StreetNetwork.jsx`, `Intersection.jsx`, extend `RoadModule.jsx` |
| **model-importer** | GLTF loader + library + placement | Phase 2 | New `ModelLoader.js`, `ModelLibrary.jsx`, `ImportedBuilding.jsx` |
| **lot-compositor** | Multi-lot layout + duplication + adjacency | Phase 2 | New `LotLayout.js`, `BlockSubdivision.js`, extend polygon system |
| **scene-renderer** | Dynamic rendering + selection + camera | Phase 3 | `SceneContent.jsx`, `Viewer3D.jsx` |
| **ui-designer** | New panels, editors, workflows | Phase 3 | `ParameterPanel.jsx`, `StyleEditor.jsx`, new panels |
| **polish-engineer** | Annotations at scale + export + perf | Phase 4 | `Dimension.jsx`, `Exporter.jsx`, perf profiling |

Phase 2 agents (street, model, lot) work in parallel. Phase 3 agents (scene, ui) work in parallel after Phase 2.

---

## Current Architecture Strengths to Preserve

- **Polygon editing system** — perpendicular constraints, vertex/edge operations all scale to N lots already
- **Road module layer stacking** — parametric pattern in `useMemo` with `.map()` rendering is excellent
- **Dimension component** — completely generic, works with arbitrary geometry
- **WYSIWYG export scaling** — line widths scale proportionally at any resolution
- **Z-up convention** — matches architectural drawings, keep this
- **meshStandardMaterial** — PBR-ready for imported model integration

## The Bottom Line

The current architecture is surprisingly well-prepared in some areas (polygon editing scales, road module is parametric, geometry components are decoupled) but has a **hard wall** at the store and scene rendering level where exactly-2-conditions is baked in. The store refactor (Workstream 1) is the single gating item. Once that's done, three parallel tracks open up — and the pieces snap together because the underlying geometry components were already designed with parameterization in mind.

The reference image isn't just "more lots" — it's a shift from **parameter comparison** to **spatial composition**. That's the lens every architectural decision should be evaluated through.
