# Pre-Built Road Scenario Exploration Report

## Date: Feb 16, 2026

## Context

Explored replacing the current individual road module system with "pre-built road scenarios" using solid geometries based on Cartesian points. The goal: eliminate overlapping/connecting lines at road intersections by computing unified polygon geometries per zone type.

---

## Current Architecture Summary

### How Roads Work Today

**Road Data Structure** (from `useStore.js`):
- Each road module contains independent parameters for front/rear (and separate left/right directions in district mode)
- Key properties per road:
  - `direction`: 'front' | 'left' | 'right' | 'rear'
  - `type`: 'S1' (50' ROW, 24' road) | 'S2' (40' ROW, 24' road) | 'S3' (20' ROW, 16' road)
  - `rightOfWay`, `roadWidth`, `leftParking`, `rightParking`, `leftVerge`, `rightVerge`, `leftSidewalk`, `rightSidewalk`, `leftTransitionZone`, `rightTransitionZone`
- All zones have independent left/right sizing

**Rendering Pipeline** (RoadModule.jsx):
1. Individual zone rectangles: Each layer rendered as a separate `<mesh>` + border lines
2. Z-offset layering: Zones offset at 0.01 + (index * 0.001)
3. Right-of-way boundary lines: 2 polylines
4. Border line suppression: `suppressLeftEnd` and `suppressRightEnd` props

**Road Positioning** (DistrictSceneContent.jsx):
- Lots extend along X-axis; roads extend along Y-axis (perpendicular)
- Road modules positioned at lot corners and rotated
- Each road's span extends across all lots at that edge

**Intersection System** (DistrictSceneContent.jsx + intersectionGeometry.js):
- Intersection fill rectangles (z=0.04, renderOrder=1)
- Fillet arcs (z=0.05, fills; z=0.055, lines; renderOrder=2/3)
- `computeCornerZoneStack()` generates 4 annular arc sectors per intersection
- 24 segments per arc (25 points)

**Current visual artifacts**:
- Multiple overlapping lines at zone boundaries
- Line width mismatch between straight road edges and curved arc lines
- Junction gaps/bumps at straight-to-curve transitions

---

## Unified Polygon Approach

### Feasibility: 9/10 — Highly Viable

Instead of rendering each zone as a separate rectangle + fillet arc, compute the **complete road corridor (including all corners) as ONE closed polygon per zone type**.

#### Example: Current vs Unified

```
Current approach (per intersection):
- 4 roads x zone rectangles + 4 border lines each
- 4 fillet arcs (one per corner) with inner + outer arc lines
= 100+ separate geometry objects

Unified approach:
- 1 closed polygon per zone type (straight edges + quarter-circle arcs)
= 12-16 objects total
```

### Pseudocode: Computing a Unified Zone Polygon

```javascript
function computeUnifiedZonePolygon(lotBounds, enabledRoads, zoneType) {
  const points = [];

  // For each enabled road direction, trace straight segment along zone outer edge
  // At corners where two roads meet, insert quarter-circle arc of radius = zone depth

  // FRONT edge
  if (enabledRoads.front) {
    const depth = zoneDepths.front[zoneType];
    points.push([xMin, 0], [xMax, 0], [xMax, -depth], [xMin, -depth]);
  }

  // FRONT-RIGHT corner arc
  if (enabledRoads.front && enabledRoads.right) {
    addQuarterArcPoints([xMax, 0], radius, points);
  }

  // RIGHT edge, REAR edge, LEFT edge... similar
  // Close polygon

  return points; // Single closed polygon
}
```

### Detailed Geometry: Sidewalk Zone for Front + Left + Right Roads

```
Input:
  lotBounds = { xMin: -50, xMax: 0, yMin: 0, yMax: 100 }
  enabledRoads = { front: true, left: true, right: true, rear: false }
  sidewalkDepth = 6'

Result: Single closed polygon tracing:
  1. Front outer edge: [xMin, -6] → [xMax, -6]
  2. Quarter arc at front-right corner (radius 6')
  3. Right outer edge: [xMax+6, 0] → [xMax+6, 100]
  4. Straight connection across top (no rear road)
  5. Left outer edge: [xMin-6, 100] → [xMin-6, 0]
  6. Quarter arc at front-left corner (radius 6')
  7. Close back to start
```

---

## Pros vs Current System

| Aspect | Current System | Unified Polygon |
|--------|---|---|
| Zone per direction | Separate rectangles | Single outline polygon |
| Fillets | Separate arc shapes per zone | Arc points in unified outline |
| Border lines | 4 lines per zone + fillet arcs | Single polyline |
| Geometry count | 100+ objects per intersection | 12-16 objects total |
| Line width consistency | Curved != straight (ongoing issue) | Resolved (single polyline) |
| State complexity | roadModules[roadId] (detailed) | roadNetworkConfig (simplified) |
| Rendering performance | ~100+ draw calls | ~12-16 draw calls |
| Per-direction zone sizing | Full support (left != right) | Shared or per-scenario |

### Key Benefits
- Eliminates ALL line junction artifacts (single continuous polyline)
- ~12-16 draw calls instead of 100+ per intersection
- No need for `suppressLeftEnd`/`suppressRightEnd`, no separate fillet component
- Simpler code and state

### Key Tradeoffs
- Per-direction zone sizing variability would be lost (or need averaging at corners)
- Works best for rectangular lots (polygon lots need fallback)
- Current left/right parking asymmetry per road would be lost
- Cannot mix road types per direction (all roads share same dimensions)

---

## Store/State Changes

### Simplified Unified State

```javascript
{
  roadNetworkConfig: {
    roadType: 'S1',
    sharedZoneDimensions: {
      roadWidth: 24,
      parking: null,
      verge: 6,
      sidewalk: 6,
      transition: null,
    },
    cornerRadii: { parking: 0.01, verge: 0.01, sidewalk: 0.01, transition: 0.01 },
  },
  roadNetworkLayout: {
    front: { enabled: true },
    left: { enabled: true },
    right: { enabled: false },
    rear: { enabled: false },
  },
  roadModuleStyles: {
    roadWidth: { ... },
    parking: { ... },
    verge: { ... },
    sidewalk: { ... },
  },
}
```

---

## Potential Blockers

1. **Lot geometry**: Works for rectangular lots only; polygon lots need fallback
2. **Zone depth mismatches at corners**: Needs strategy (average, max, or pick one)
3. **Comparison Module compatibility**: Legacy `comparisonRoads` state needs migration
4. **Export format**: IFC export iterates per direction; would need decomposition
5. **Undo/redo**: Zundo middleware would need updated state shape tracking

---

## Recommended Implementation Strategy

### Phase 1: Non-Breaking Parallel Implementation
1. Create `src/utils/unifiedRoadGeometry.js` — polygon computation
2. Create `src/components/UnifiedRoadModule.jsx` — parallel to RoadModule.jsx
3. Add debug toggle to switch rendering modes
4. Validate outputs match via side-by-side PNG export

### Phase 2: State Simplification (Optional)
- Replace per-road `entities.roadModules[roadId]` with shared `roadNetworkConfig`
- Update store migrations

### Phase 3: Full Migration
- Replace RoadModule.jsx usage with UnifiedRoadModule.jsx
- Remove fillet arc system (RoadIntersectionFillet.jsx, intersectionGeometry.js)
- Simplify DistrictSceneContent.jsx intersection logic

---

## Road Configuration Combinations

Current valid configurations (any subset of { front, left, right, rear }):
- Single front road: front=S1 only
- Front + rear: front=S1, rear=S3 (alley)
- All 4 roads: front=S1, left=S2, right=S2, rear=S3
- L-shape: front=S1, right=S2 only
- T-shape: front=S1, left=S2, right=S2 only

Unified approach handles all enabled/disabled combinations.
