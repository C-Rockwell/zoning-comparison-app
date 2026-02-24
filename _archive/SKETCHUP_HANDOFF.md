# SketchUp Ruby Port — Developer Handoff Document

## Table of Contents

1. [Application Overview](#1-application-overview)
2. [Coordinate System & Units](#2-coordinate-system--units)
3. [Data Model (State Structure)](#3-data-model-state-structure)
4. [Lot System](#4-lot-system)
5. [Setback System](#5-setback-system)
6. [Building System](#6-building-system)
7. [Dimension System](#7-dimension-system)
8. [Annotation & Label System](#8-annotation--label-system)
9. [Road Module System](#9-road-module-system)
10. [Road Intersection & Fillet System](#10-road-intersection--fillet-system)
11. [Style System (12 Categories)](#11-style-system-12-categories)
12. [Layer & Visibility System](#12-layer--visibility-system)
13. [District Parameters (Zoning Data)](#13-district-parameters-zoning-data)
14. [Scenarios & Persistence](#14-scenarios--persistence)
15. [Camera & Views](#15-camera--views)
16. [Export System](#16-export-system)
17. [Interaction System (Move, Edge Extrude)](#17-interaction-system)
18. [Lighting & Rendering](#18-lighting--rendering)
19. [CSV Import System](#19-csv-import-system)
20. [SketchUp-Specific Mapping Notes](#20-sketchup-specific-mapping-notes)

---

## 1. Application Overview

This is a **zoning visualization tool** for urban planners and architects. It creates 3D models of multi-lot zoning districts showing:

- Rectangular lots with configurable dimensions
- Principal and accessory buildings with per-story heights
- Setback zones (minimum, maximum, and accessory)
- Build-To Zone (BTZ) planes
- Dimensioned annotations (lot width/depth, setbacks, building height)
- Multi-direction road modules with configurable zone cross-sections
- Road intersections with curved fillet corners
- Max height planes
- Lot access arrows
- Draggable text annotations with leader lines

The app has two modules:
1. **Comparison Module** — Side-by-side existing vs. proposed zoning (single lot)
2. **District Module** — Multi-lot composition (up to 5 lots in a row), multiple road directions, principal + accessory buildings per lot

**The SketchUp port should focus on the District Module** as it is the more complete and actively-used system.

---

## 2. Coordinate System & Units

### Units
- All measurements are in **feet** (imperial)
- Angles in **radians** internally
- Display formats: `feet` (e.g., "75'"), `feet-inches` (e.g., "6'-3\""), or `meters`

### Coordinate Axes
- **X axis** — Left/Right (lot width direction)
- **Y axis** — Front/Rear (lot depth direction)
- **Z axis** — Vertical (building height direction)
- **Up vector** — +Z

### Origin
- `(0, 0, 0)` is the **front-left corner of Lot 1**
- Front edge of all lots is at Y = 0
- Lot 1 extends in +X direction
- Lots 2–5 extend in -X direction from origin

### Lot Layout Algorithm
```
Lot 1 (index 0):  offset = 0         → occupies X: [0, lotWidth1]
Lot 2 (index 1):  offset = -lotWidth2 → occupies X: [-lotWidth2, 0]
Lot 3 (index 2):  offset = -(lotWidth2 + lotWidth3) → continues in -X
...and so on
```

Each lot's internal coordinate system is **centered** — the lot's local `(0,0)` is at the geometric center. The lot group is positioned at:
```
position = [offset + lotWidth/2, lotDepth/2, 0]
```

### Vertex Positions (Lot Corners, Centered Coordinates)
```
p1 = [-w/2, -d/2, 0.03]  → Front-Left
p2 = [+w/2, -d/2, 0.03]  → Front-Right
p3 = [+w/2, +d/2, 0.03]  → Rear-Right
p4 = [-w/2, +d/2, 0.03]  → Rear-Left
```

---

## 3. Data Model (State Structure)

### 3.1 Entity System (One Per Lot)

Each lot is stored as `entities.lots[lotId]`:

```ruby
{
  lotWidth: 75,              # feet
  lotDepth: 125,             # feet

  setbacks: {
    principal: {
      front: 20,
      rear: 10,
      sideInterior: 5,
      minSideStreet: 10,     # only used on corner lots
      maxFront: 40,          # max setback line
      maxSideStreet: 25,     # max setback on street side
      btzFront: 70,          # Build-To Zone percentage (0-100)
      btzSideStreet: 50,
    },
    accessory: {
      front: 30,
      rear: 5,
      sideInterior: 5,
      sideStreet: 10,
    }
  },

  buildings: {
    principal: {
      width: 40,
      depth: 60,
      x: 0,                  # offset from lot center
      y: 0,
      stories: 3,
      firstFloorHeight: 12,  # feet
      upperFloorHeight: 10,
      maxHeight: 45,          # not used — see districtParameters
    },
    accessory: {
      width: 20,
      depth: 15,
      x: 0,
      y: 15,                 # offset toward rear
      stories: 1,
      firstFloorHeight: 10,
      upperFloorHeight: 10,
      maxHeight: 15,
    }
  },

  lotGeometry: {
    mode: 'rectangle',       # or 'polygon'
    editing: false,
    vertices: null            # array of {x,y} if polygon mode
  },

  lotAccess: {
    front: true,
    rear: false,
    sideStreet: false,
    sideInterior: false,
  },

  parking: {
    front: false,
    sideInterior: false,
    sideStreet: false,
    rear: false,
  },

  roof: {
    type: 'flat',            # 'flat' | 'shed' | 'gabled' | 'hipped'
    overrideHeight: false,
    ridgeHeight: null,
    ridgeDirection: 'x',     # for gabled/hipped
    shedDirection: '+y',     # for shed
  }
}
```

### 3.2 Building Height Calculation

```ruby
def compute_total_height(building)
  return 0 if building.nil?
  stories = building[:stories] || 1
  first_floor = building[:firstFloorHeight] || 12
  upper_floor = building[:upperFloorHeight] || 10
  return 0 if stories <= 0
  return first_floor if stories == 1
  first_floor + (stories - 1) * upper_floor
end
```

### 3.3 Entity Order & Display

- `entityOrder` — Array of lot IDs in display order: `["lot-1", "lot-2", ...]`
- `activeEntityId` — Currently selected lot (for editing)
- `selectedBuildingType` — `'principal'` or `'accessory'` or `nil`

### 3.4 Model Setup

```ruby
modelSetup = {
  numLots: 3,
  streetEdges: {
    front: true,    # always enabled
    left: false,
    right: true,    # makes rightmost lot a corner lot
    rear: false,
  },
  streetTypes: {
    front: 'S1',    # Primary Street
    left: 'S1',
    right: 'S2',    # Secondary Street
    rear: 'S3',     # Alley
  }
}
```

---

## 4. Lot System

### 4.1 Lot Geometry

Each lot is a rectangle (polygon mode exists but is secondary). The lot renders:

1. **Lot fill** — A flat plane at z=0.02
   - Color, opacity configurable per-lot
   - Can be hidden via visibility toggle

2. **Lot lines** — 4 line segments at z=0.03
   - Each side can have independent style overrides (color, width, dashed)
   - Sides: `front` (p1→p2), `right` (p2→p3), `rear` (p3→p4), `left` (p4→p1)

### 4.2 Z-Layer Map (Ground Plane Elements)

| Element | Z Position |
|---------|-----------|
| Lot fill plane | 0.02 |
| Lot lines | 0.03 |
| Road ROW lines | 0.03 |
| Intersection fill | 0.04 |
| S3 alley road groups | +0.042 offset |
| Fillet zone fills | 0.05 + i×0.001 |
| Fillet arc lines | 0.055 |
| Alley fill rects | 0.077 |
| Min setback lines | 0.1 |
| Accessory setback lines | 0.11 |
| Max setback lines | 0.12 |
| Lot access arrows | 0.15 |

---

## 5. Setback System

### 5.1 Principal (Minimum) Setbacks

Lines drawn inside the lot boundary at z=0.1, inset by the setback distance from each edge.

**Street-aware logic** (critical for corner lots):
```ruby
# Left side of lot
left_setback = street_sides[:left] ? min_side_street : side_interior

# Right side of lot
right_setback = street_sides[:right] ? min_side_street : side_interior
```

Corner lots (where `streetSides.left` or `streetSides.right` is true) use `minSideStreet` instead of `sideInterior` for the street-facing side.

Setback vertex positions (in lot-centered coordinates):
```
y1 = -lotDepth/2 + front     # front setback line
y2 = +lotDepth/2 - rear      # rear setback line
x1 = -lotWidth/2 + leftValue  # left setback line
x2 = +lotWidth/2 - rightValue # right setback line
```

### 5.2 Accessory Setbacks

Same pattern as principal setbacks but at z=0.11. Uses `accessory` setback values. Street-facing sides use `sideStreet` instead of `sideInterior`.

### 5.3 Maximum Setbacks

Lines at z=0.12. Only rendered when `maxFront` or `maxSideStreet` has a positive value.

**L-corner behavior**: On corner lots, the max front line and max side street line form an L-shape. The max front line is clipped at the max side street position (the two lines share a corner point).

### 5.4 Setback Dimensions

Each setback side gets a dimension annotation measuring from the lot edge to the setback line, positioned at the midpoint of that side. Offset from the line = `setbackDimOffset` (default 5 feet).

---

## 6. Building System

### 6.1 Building Rendering

Buildings are rendered as stacked box geometry (one box per floor):

```ruby
floors = []
z_bottom = 0

# First floor
floors << { height: firstFloorHeight, z_center: firstFloorHeight / 2.0 }
z_bottom = firstFloorHeight

# Upper floors
(stories - 1).times do |i|
  floors << {
    height: upperFloorHeight,
    z_center: z_bottom + upperFloorHeight / 2.0
  }
  z_bottom += upperFloorHeight
end
```

Each floor is a `BoxGeometry(width, depth, floor_height)` positioned at `[building_x, building_y, floor_z_center]`.

### 6.2 Building Position

Buildings are positioned relative to lot center:
- `building.x` — X offset from lot center (default 0)
- `building.y` — Y offset from lot center (default 0)

In the annotation coordinate system (front-left origin), building position is:
```ruby
annotation_x = building_x + lotWidth/2 - buildingWidth/2
annotation_y = building_y + lotDepth/2 - buildingDepth/2
```

### 6.3 Principal vs Accessory Buildings

| Property | Principal | Accessory |
|----------|-----------|-----------|
| Default first floor height | 12 ft | 10 ft |
| Default upper floor height | 10 ft | 10 ft |
| Default stories | 2 | 1 |
| Style keys | `principalBuildingEdges/Faces` | `accessoryBuildingEdges/Faces` |
| Layer keys | `principalBuildings` | `accessoryBuildings` |
| Height dim layer | `dimensionsHeightPrincipal` | `dimensionsHeightAccessory` |
| Render condition | Always (if stories > 0) | Only if `accessory.width > 0` |

### 6.4 Building Edges

Building edges are rendered using Three.js `Edges` helper with a threshold of 15 degrees — edges between faces with an angle greater than 15 degrees are highlighted. In SketchUp, this maps to the natural edge display.

### 6.5 Roof Types

| Type | Description | Parameters |
|------|-------------|------------|
| `flat` | No visible roof mesh | — |
| `shed` | Single slope | `shedDirection`: `+x`, `-x`, `+y`, `-y` |
| `gabled` | Two-slope ridge | `ridgeDirection`: `x` or `y` |
| `hipped` | Four-slope pyramid | `ridgeDirection`: `x` or `y` |

Ridge height can be auto-calculated or manually overridden via `overrideHeight` + `ridgeHeight`.

### 6.6 Max Height Plane

A semi-transparent horizontal plane rendered at the zoning max height:
- Position: Building center XY, Z = maxHeight + 0.05
- Size: Building footprint dimensions
- Includes a line rectangle outline around the perimeter
- Source of truth: `districtParameters.structures.{principal|accessory}.height.max`
- Only renders when `maxHeight > 0`

### 6.7 Build-To Zone (BTZ) Planes

Vertical planes on building facades indicating the required build-to zone:

**BTZ Front Plane:**
- Width = `btzFront / 100 * buildingWidth` (percentage of building frontage)
- Height = `firstFloorHeight` (first floor only)
- Positioned on the building's front face, left-aligned
- Slightly offset (0.1ft) toward the street for visibility

**BTZ Side Street Plane:**
- Width = `btzSideStreet / 100 * buildingDepth`
- Only shown on street-facing sides (`streetSides.left` or `streetSides.right`)
- Left-aligned from the front corner of the side face

### 6.8 Height Dimensions

Building height dimensions are rendered vertically using the Dimension component:

```ruby
# Start at ground level, end at building top, at rear-right corner
dim_start = [cx + w/2, cy + d/2, 0]
dim_end = [cx + w/2, cy + d/2, total_building_height]

# offset=-10 pushes dim OUTSIDE the building (outward from rear-right corner)
# plane='XZ' required for pure-Z direction vectors
# textMode='billboard' keeps text readable from any camera angle
```

**Max height dimension** uses `offset=-20` (further outside than building height dim at -10) to avoid overlap.

---

## 7. Dimension System

### 7.1 Dimension Component Overview

The `Dimension` component draws a complete dimension annotation consisting of:
1. **Main line** — connecting start to end (offset perpendicular from measured points)
2. **End markers** — tick marks, arrows, or dots at each end
3. **Extension lines** — from the original measured points to the offset main line
4. **Text label** — measurement value (or custom text)

### 7.2 Props

| Prop | Default | Description |
|------|---------|-------------|
| `start` | required | `[x,y,z]` — first measured point |
| `end` | required | `[x,y,z]` — second measured point |
| `label` | nil | Text to display (e.g., "75'") |
| `offset` | 0 | Perpendicular displacement distance (feet) |
| `color` | "black" | Fallback color |
| `visible` | true | Show/hide toggle |
| `flipText` | false | Inverts text side (above↔below line) |
| `settings` | {} | Full dimensionSettings object |
| `lineScale` | 1 | Export-aware line thickness multiplier |
| `plane` | 'XY' | Perpendicular computation plane |
| `textMode` | nil | Override: 'follow-line' or 'billboard' |

### 7.3 Perpendicular Vector Computation

The perpendicular direction determines where the dimension line offsets to and where extension lines/ticks extend:

| Plane | Perpendicular Formula | Use Case |
|-------|----------------------|----------|
| `XY` (default) | `(-uy, ux, 0)` | Plan view (top-down) |
| `XZ` | `(-uz, 0, ux)` | Front elevation / height dims |
| `YZ` | `(0, -uz, uy)` | Side elevation |
| `auto` | Detects dominant axis | Adaptive |
| `verticalMode=true` | `(0, 0, 1)` | Dims float upward in Z |

Where `(ux, uy, uz)` is the unit direction vector from start to end.

### 7.4 Offset Mechanics

1. Compute perpendicular vector `(px, py, pz)`
2. Offset displacement: `ox = px * offset, oy = py * offset, oz = pz * offset`
3. Displaced start: `s = start + (ox, oy, oz)`
4. Displaced end: `e = end + (ox, oy, oz)`
5. Main line runs from `s` to `e`
6. Extension lines connect original `start→s` and `end→e` (only if `|offset| > 0.1`)

### 7.5 End Marker Types

| Type | Description |
|------|-------------|
| `tick` | Short perpendicular line segments at each end. Size = `1 × markerScale`. |
| `dot` | Small sphere at each end. Radius = `0.3 × markerScale`. |
| `arrow` | Cone pointing inward toward measurement. Uses quaternion-based 3D rotation for correct orientation in any plane. Length = `1 × markerScale`, radius = `0.4 × markerScale`. |

**Arrow 3D rotation** (critical for height dimensions):
```ruby
# Reference axis: +X (cone tip direction after inner rotation)
# Forward direction: unit vector from start to end
# Backward direction: unit vector from end to start
# Quaternion: shortest rotation from +X to desired direction
# Convert to Euler angles for the group rotation
```

### 7.6 Text Positioning

1. **Midpoint** of the offset main line = `(mx, my, mz)`
2. **textPerpOffset** — additional perpendicular displacement from midpoint (feet)
3. **textAnchorY** — vertical anchor of text relative to its position:
   - `'bottom'` = text sits above the line
   - `'center'` = text centered on the line
   - `'top'` = text hangs below the line
4. **flipText** — inverts the anchor mapping

### 7.7 Text Modes

| Mode | Behavior |
|------|----------|
| `follow-line` | Text rotated to align with dimension line direction. Auto-flipped to stay readable. |
| `billboard` | Text always faces the camera. Used for depth dims and height dims. |

### 7.8 Dimension Settings (Complete Field List)

```ruby
dimensionSettings = {
  # Lines
  lineColor: '#000000',
  lineWidth: 1,
  extensionLineColor: nil,          # nil = inherit from lineColor
  extensionLineStyle: 'dashed',     # 'dashed' | 'solid'
  extensionWidth: 0.5,              # multiplier on lineWidth

  # Markers
  endMarker: 'tick',                # 'tick' | 'arrow' | 'dot'
  markerColor: nil,                 # nil = inherit from lineColor
  markerScale: 1.0,

  # Text
  textColor: '#000000',
  fontSize: 2,
  fontFamily: 'Inter',
  outlineColor: '#ffffff',
  outlineWidth: 0.1,
  textMode: 'follow-line',          # default for width dims
  textBackground: {
    enabled: false,
    color: '#ffffff',
    opacity: 0.85,
    padding: 0.3,
  },

  # Width dim text positioning
  textPerpOffset: 0,
  textAnchorY: 'bottom',

  # Depth dim text (independent controls)
  textModeDepth: 'billboard',       # depth dims default to billboard
  textPerpOffsetDepth: 0,
  textAnchorYDepth: 'center',

  # Dimension offsets from lot
  setbackDimOffset: 5,              # setback dim offset
  lotDimOffset: 15,                 # lot width dim offset
  lotDepthDimOffset: 15,            # lot depth dim offset (independent)
  lotDepthDimSide: 'right',         # 'right' | 'left'

  # Vertical mode
  verticalMode: false,
  verticalOffset: 20,               # height above ground in vertical mode

  # Units
  unitFormat: 'feet',               # 'feet' | 'feet-inches' | 'meters'

  # Custom labels
  customLabels: {
    lotWidth:            { mode: 'value', text: '' },
    lotDepth:            { mode: 'value', text: '' },
    setbackFront:        { mode: 'value', text: '' },
    setbackRear:         { mode: 'value', text: '' },
    setbackLeft:         { mode: 'value', text: '' },
    setbackRight:        { mode: 'value', text: '' },
    buildingHeight:      { mode: 'value', text: '' },
    principalMaxHeight:  { mode: 'value', text: '' },
    accessoryMaxHeight:  { mode: 'value', text: '' },
  }
}
```

### 7.9 Where Dimensions Are Placed

| Dimension | Start → End | Offset | Plane |
|-----------|-------------|--------|-------|
| Lot width | p1 → p2 (front edge) | -(lotDimOffset) in plan; +verticalOffset in vertical mode | XY |
| Lot depth (right side) | p3 → p2 (right edge) | +(lotDepthDimOffset) | XY |
| Lot depth (left side) | p4 → p1 (left edge) | -(lotDepthDimOffset) | XY |
| Front setback | lot front → setback front (at x=0) | setbackDimOffset | XY |
| Rear setback | lot rear → setback rear (at x=0) | setbackDimOffset | XY |
| Left setback | lot left → setback left (at y=0) | setbackDimOffset | XY |
| Right setback | lot right → setback right (at y=0) | setbackDimOffset | XY |
| Building height | rear-right corner z=0 → z=totalHeight | -10 (outward) | XZ |
| Max height | rear-right corner z=0 → z=maxHeight | -20 (outward) | XZ |
| Footprint edges | edge start → edge end | -3 (inside building) | XY |

---

## 8. Annotation & Label System

### 8.1 Label Types

All labels use the `DraggableLabel` component which renders 3D text with optional leader lines.

| Label Category | Layer Gate | Count Per Lot |
|---------------|------------|---------------|
| Lot name | `labelLotNames` | 1 |
| Lot edge labels | `labelLotEdges` | 4 (front, rear, interior, street) |
| Setback labels | `labelSetbacks` | Up to 4 |
| Max setback labels | `labelMaxSetbacks` | Up to 3 |
| Building labels (principal) | `labelPrincipalBuildings` | 1 |
| Building labels (accessory) | `labelAccessoryBuildings` | 1 |
| Road name | `labelRoadNames` | 1 per road |
| Road zone labels | `labelRoadZones` | Variable per road |

Master toggle: `annotationLabels` (gates all labels)

### 8.2 Leader Lines

Leader lines connect a label to its anchor point. Visibility rule:
- **Show** when the label is >0.5 feet from its anchor point (Euclidean distance)
- Lot edge labels always show leaders (default position is 3ft from edge)
- Setback/zone labels only show leaders after dragging (default position = anchor position)

### 8.3 Custom Labels

Labels support custom text overrides via `annotationCustomLabels`:
- Road labels keyed as `roadFront`, `roadRight`, `roadRear`, `roadLeft`
- Lot labels keyed as `lot-{lotId}-name`
- Each entry: `{ mode: 'default'|'custom', text: '' }`

### 8.4 Annotation Settings

```ruby
annotationSettings = {
  textRotation: 'billboard',       # 'billboard' | 'fixed'
  fontSize: 1.5,
  fontFamily: nil,                 # nil = default; or font label string
  textColor: '#000000',
  outlineColor: '#ffffff',
  outlineWidth: 0.15,
  backgroundColor: '#ffffff',
  backgroundOpacity: 0.85,
  backgroundEnabled: true,
  leaderLineColor: '#666666',
  leaderLineWidth: 1,
  leaderLineDashed: false,
  unitFormat: 'feet',
}
```

### 8.5 Label Positions (Front-Left Origin Coordinates)

| Label | Default Position | Anchor Point |
|-------|-----------------|--------------|
| Lot name | `[w/2, d/2, 0.2]` | `[w/2, d/2, 0]` |
| Front edge | `[w/2, -3, 0.15]` | `[w/2, 0, 0]` |
| Rear edge | `[w/2, d+3, 0.15]` | `[w/2, d, 0]` |
| Interior edge | `[-3, d/2, 0.15]` | `[0, d/2, 0]` |
| Street edge | `[w+3, d/2, 0.15]` | `[w, d/2, 0]` |
| Setback (front) | `[w/2, sb/2, 0.15]` | Same as default |
| Building (principal) | `[cx+bw/2+5, cy, totalH+5]` | `[cx, cy, totalH+2]` |

---

## 9. Road Module System

### 9.1 Road Types

| Type | Name | Right-of-Way | Road Width |
|------|------|-------------|------------|
| S1 | Primary Street | 50 ft | 24 ft |
| S2 | Secondary Street | 40 ft | 24 ft |
| S3 | Alley | 20 ft | 16 ft |

### 9.2 Road Cross-Section Structure

A road module is a cross-section perpendicular to the road direction:

```
Lot Front Edge (Y=0)
├── Transition Zone (right)
├── Sidewalk (right)
├── Verge (right)
├── Parking (right)
├── ROAD SURFACE (centered in ROW)
├── Parking (left)
├── Verge (left)
├── Sidewalk (left)
├── Transition Zone (left)
ROW Outer Edge (Y = -rightOfWay)
```

"Right" side = toward the lot (top). "Left" side = away from the lot (bottom). Each zone is optional (null = not present).

### 9.3 Road Module Data

```ruby
road_module = {
  type: 'S1',
  direction: 'front',        # 'front' | 'left' | 'right' | 'rear'
  rightOfWay: 50,
  roadWidth: 24,
  leftParking: nil,           # null = not enabled; number = depth in feet
  rightParking: 8,
  leftVerge: nil,
  rightVerge: 5,
  leftSidewalk: nil,
  rightSidewalk: 6,
  leftTransitionZone: nil,
  rightTransitionZone: nil,
}
```

### 9.4 Road Direction & Rotation

Roads are built in canonical "front" orientation (road runs along X, zones stack in -Y). Then rotated:

| Direction | Rotation (Z-axis) |
|-----------|-------------------|
| front | 0 |
| left | -π/2 (90° CW) |
| right | +π/2 (90° CCW) |
| rear | π (180°) |

### 9.5 Road Span & Positioning

| Direction | Span Width | Position |
|-----------|-----------|----------|
| front | total lot row width | Left edge of leftmost lot, Y=0 |
| rear | total lot row width | Right edge of rightmost lot, Y=maxLotDepth |
| left | max lot depth | Left edge of leftmost lot |
| right | max lot depth | Right edge of rightmost lot |

### 9.6 S3 Alley Special Handling

- **Z-offset**: All S3 road geometry raised by z=0.042 to prevent z-fighting with perpendicular roads
- **Style overrides**: 6 alley-specific style keys (all default `null`). When non-null, properties are merged over the base style
- **T-junctions**: When S3 meets non-S3, fillets/fills are suppressed. The non-S3 road extends through the S3 ROW

### 9.7 End-Line Suppression

At road intersections, the short end-edge lines of the road rectangle are suppressed to prevent doubled lines. Each road has `suppressLeftEnd` and `suppressRightEnd` booleans. At non-S3 corners, both perpendicular road ends are suppressed. At S3 corners, only the S3 road's ends are suppressed.

---

## 10. Road Intersection & Fillet System

### 10.1 Intersection Fill

At each corner where two perpendicular roads meet, a rectangular fill area is rendered. The fill uses a **notched rectangle shape** — a rectangle with concave quarter-circle cutouts at each inner sub-corner to avoid overlapping with fillet arcs.

- Position: z=0.04
- Color: `intersectionFill.fillColor` (default `#666666`)
- S3 corners are excluded (no intersection fill)

### 10.2 Fillet Corners

Each intersection corner has 4 sub-corners, each with curved zone arcs:

| Sub-Corner | Start Angle | End Angle |
|-----------|-------------|-----------|
| front-left | π | 3π/2 |
| front-right | 3π/2 | 2π |
| rear-left | π/2 | π |
| rear-right | 0 | π/2 |

### 10.3 Fillet Zone Stacking

Zones from both perpendicular roads are merged. When both roads have the same zone type, the depth is **averaged**. The merged zones stack as concentric arc sectors (annular wedges) from the corner point outward.

Order (inside to outside): Parking → Verge → Sidewalk → Transition Zone

Each arc sector is an annular shape between inner and outer radii. Lines are drawn along the arc boundaries.

### 10.4 Alley Fill Rectangles

At S3 corners, small connector rectangles bridge the alley pavement to the cross-street:
- Width: perpendicular road's sidewalk + verge depth
- Height: S3 road width
- Position: z=0.077

---

## 11. Style System (12 Categories)

Each lot has independent styles in `entityStyles[lotId]`. There are 12 style categories:

### 11.1 Line Styles (6 categories)

Used for: Lot Lines, Setbacks, Accessory Setbacks, Max Setbacks, Principal Building Edges, Accessory Building Edges

```ruby
line_style = {
  color: '#000000',
  width: 1.5,
  dashed: false,
  dashSize: 0.5,          # only for lot lines/setbacks
  gapSize: 0.2,
  dashScale: 1,
  opacity: 1.0,
  visible: true,           # only for building edges
  overrides: {              # only for lot lines/setbacks
    front:  { enabled: false, color: '#000000', width: 1, dashed: false },
    rear:   { enabled: false, color: '#000000', width: 1, dashed: false },
    left:   { enabled: false, color: '#000000', width: 1, dashed: false },
    right:  { enabled: false, color: '#000000', width: 1, dashed: false },
  }
}
```

### 11.2 Mesh Styles (4 categories)

Used for: BTZ Planes, Lot Access Arrows, Principal Building Faces, Accessory Building Faces

```ruby
mesh_style = {
  color: '#D5D5D5',
  opacity: 1.0,
}
```

### 11.3 Hybrid Style (1 category)

Used for: Max Height Plane

```ruby
max_height_style = {
  color: '#FF6B6B',        # fill color
  opacity: 0.3,
  lineColor: '#FF0000',    # outline color
  lineWidth: 2,
  lineDashed: true,
}
```

### 11.4 Roof Style (1 category)

```ruby
roof_style = {
  roofFaces: { color: '#B8A088', opacity: 0.85 },
  roofEdges: { color: '#000000', width: 1.5, visible: true, opacity: 1.0 },
}
```

### 11.5 Default Colors by Category

| Category | Default Color |
|----------|--------------|
| Lot Lines | `#000000` (black) |
| Setbacks (principal) | `#000000` (black, dashed) |
| Accessory Setbacks | `#2196F3` (blue, dashed) |
| Max Setbacks | `#000000` (black, dashed) |
| BTZ Planes | `#AA00FF` (purple) |
| Lot Access Arrows | `#FF00FF` (magenta) |
| Principal Building Edges | `#000000` (black) |
| Principal Building Faces | `#D5D5D5` (light gray) |
| Accessory Building Edges | `#666666` (dark gray) |
| Accessory Building Faces | `#B0B0B0` (medium gray) |
| Roof | `#B8A088` (tan) |
| Max Height Plane | `#FF6B6B` fill / `#FF0000` outline |

### 11.6 Road Module Styles (17 categories)

```ruby
roadModuleStyles = {
  # ROW border lines
  rightOfWay: { color: '#000000', width: 1, dashed: true, opacity: 1.0 },

  # Road surface
  roadWidth: {
    lineColor: '#000000', lineWidth: 1, lineDashed: false, lineOpacity: 1.0,
    fillColor: '#666666', fillOpacity: 1.0
  },

  # Left-side zones (each has line + fill properties)
  leftParking:        { lineColor: '#000000', lineWidth: 1, fillColor: '#888888', fillOpacity: 1.0 },
  leftVerge:          { lineColor: '#000000', lineWidth: 1, fillColor: '#c4a77d', fillOpacity: 1.0 },
  leftSidewalk:       { lineColor: '#000000', lineWidth: 1, fillColor: '#90EE90', fillOpacity: 1.0 },
  leftTransitionZone: { lineColor: '#000000', lineWidth: 1, fillColor: '#98D8AA', fillOpacity: 1.0 },

  # Right-side zones (same structure)
  rightParking:        { fillColor: '#888888' },
  rightVerge:          { fillColor: '#c4a77d' },
  rightSidewalk:       { fillColor: '#90EE90' },
  rightTransitionZone: { fillColor: '#98D8AA' },

  # Intersection fills
  intersectionFill:      { fillColor: '#666666', fillOpacity: 1.0 },
  alleyIntersectionFill: { fillColor: '#666666', fillOpacity: 1.0 },

  # Alley overrides (nil = use base style)
  alleyRoadWidth: nil,
  alleyRightOfWay: nil,
  alleyVerge: nil,
  alleyParking: nil,
  alleySidewalk: nil,
  alleyTransitionZone: nil,
}
```

### 11.7 Style Presets

Styles can be saved and loaded as named presets (stored on the backend). A preset includes both `entityStyles` (per-lot) and `roadModuleStyles`.

---

## 12. Layer & Visibility System

### 12.1 Dual-Layer Architecture

Visibility uses a two-level system:
1. **Global layers** (`viewSettings.layers`) — master toggles
2. **Per-lot visibility** (`lotVisibility[lotId]`) — per-lot overrides

An element is visible only when **both** are true:
```ruby
visible = layers[key] && lot_visibility[lot_id][key]
```

### 12.2 All Layer Keys (26 total)

#### Visual Aids
| Key | Default | Description |
|-----|---------|-------------|
| `grid` | true | Adaptive ground grid |
| `origin` | true | Red sphere at origin |
| `ground` | false | Ground plane |
| `axes` | false | XYZ axes helper |
| `gimbal` | true | Navigation gimbal (bottom-right) |

#### Lots & Setbacks
| Key | Default | Description |
|-----|---------|-------------|
| `lotLines` | true | Lot boundary lines |
| `setbacks` | true | Principal setback lines |
| `accessorySetbacks` | true | Accessory setback lines |
| `maxSetbacks` | true | Maximum setback lines |
| `lotAccessArrows` | true | Lot access direction arrows |
| `labelLotEdges` | true | Lot edge dimension labels |

#### Structures
| Key | Default | Description |
|-----|---------|-------------|
| `btzPlanes` | true | Build-To Zone vertical planes |
| `principalBuildings` | true | Principal building geometry |
| `accessoryBuildings` | true | Accessory building geometry |
| `roof` | true | Roof geometry |
| `maxHeightPlane` | true | Max height horizontal planes |

#### Roads
| Key | Default | Description |
|-----|---------|-------------|
| `roadModule` | true | Road zone geometry |
| `roadIntersections` | true | Intersection fills + fillets |
| `labelRoadZones` | true | Road zone name labels |

#### Annotations & Dimensions
| Key | Default | Description |
|-----|---------|-------------|
| `annotationLabels` | false | Master toggle for all labels |
| `labelLotNames` | true | Lot name labels |
| `labelSetbacks` | true | Setback value labels |
| `labelMaxSetbacks` | true | Max setback value labels |
| `labelRoadNames` | true | Road name labels |
| `labelPrincipalBuildings` | true | Principal building labels |
| `labelAccessoryBuildings` | true | Accessory building labels |
| `dimensionsLotWidth` | true | Lot width dimension lines |
| `dimensionsLotDepth` | true | Lot depth dimension lines |
| `dimensionsSetbacks` | true | Setback dimension lines |
| `dimensionsHeightPrincipal` | true | Principal building height dims |
| `dimensionsHeightAccessory` | true | Accessory building height dims |

### 12.3 Per-Lot Visibility Keys

```ruby
lot_visibility = {
  lotLines: true,
  setbacks: true,
  maxSetbacks: true,
  accessorySetbacks: true,
  buildings: true,
  accessoryBuilding: true,
  btzPlanes: true,
  lotAccessArrows: true,
  maxHeightPlanePrincipal: true,
  maxHeightPlaneAccessory: true,
}
```

---

## 13. District Parameters (Zoning Data)

These are **informational reference values** (not directly visualized in 3D). They represent the zoning code constraints. The only exception is `structures.{type}.height.max` which drives the max height plane/dimension.

### 13.1 Full Structure

```ruby
districtParameters = {
  # Lot dimensional requirements
  lotArea:           { min: nil, max: nil },   # square feet
  lotCoverage:       { min: nil, max: nil },   # percentage
  lotWidth:          { min: nil, max: nil },   # feet
  lotWidthAtSetback: { min: nil, max: nil },
  lotDepth:          { min: nil, max: nil },

  # Principal setback requirements
  setbacksPrincipal: {
    front:       { min: nil, max: nil },
    rear:        { min: nil, max: nil },
    sideInterior: { min: nil, max: nil },
    sideStreet:  { min: nil, max: nil },
    btzFront: nil,                        # percentage
    btzSideStreet: nil,
    distanceBetweenBuildings: { min: nil, max: nil },
  },

  # Accessory setback requirements
  setbacksAccessory: {
    front:       { min: nil, max: nil },
    rear:        { min: nil, max: nil },
    sideInterior: { min: nil, max: nil },
    sideStreet:  { min: nil, max: nil },
    distanceBetweenBuildings: { min: nil, max: nil },
  },

  # Structure requirements (drives max height plane!)
  structures: {
    principal: {
      height:          { min: nil, max: nil },  # max → maxHeightPlane
      stories:         { min: nil, max: nil },
      firstStoryHeight: { min: nil, max: nil },
      upperStoryHeight: { min: nil, max: nil },
    },
    accessory: {
      height:          { min: nil, max: nil },
      stories:         { min: nil, max: nil },
      firstStoryHeight: { min: nil, max: nil },
      upperStoryHeight: { min: nil, max: nil },
    },
  },

  # Lot access (arrows)
  lotAccess: {
    primaryStreet:   { permitted: false, min: nil, max: nil },
    secondaryStreet: { permitted: false, min: nil, max: nil },
    rearAlley:       { permitted: false, min: nil, max: nil },
    sharedDrive:     { permitted: false, min: nil, max: nil },
  },

  # Parking locations
  parkingLocations: {
    front:        { permitted: false, min: nil, max: nil },
    sideInterior: { permitted: false, min: nil, max: nil },
    sideStreet:   { permitted: false, min: nil, max: nil },
    rear:         { permitted: false, min: nil, max: nil },
  },
}
```

---

## 14. Scenarios & Persistence

### 14.1 Scenarios

Each scenario is a complete snapshot of the district model state. Stored as JSON files on the backend:
```
{projectsDir}/{projectId}/scenarios/{scenarioName}.json
```

Scenarios support:
- Save current state as named scenario
- Load a named scenario
- Switch between scenarios
- Delete scenarios
- Batch import from CSV (one scenario per CSV row)

### 14.2 Projects

Projects are stored in a configurable directory:
```
{projectsDir}/{projectId}/
├── project.json
├── images/
├── models/
├── snapshots/
├── layer-states/
└── scenarios/
```

### 14.3 Undo/Redo

50-step undo history tracking all model state changes. Export-related flags are excluded from undo tracking. Drag operations are batched (pause on pointer down, resume on pointer up) so each drag = 1 undo step.

---

## 15. Camera & Views

### 15.1 Standard Views

| View | Description |
|------|-------------|
| `iso` | Isometric 3D view |
| `top` | Plan/top-down view |
| `front` | Front elevation |
| `left` | Left side view |
| `right` | Right side view |

### 15.2 Projection Modes

| Mode | Description |
|------|-------------|
| `orthographic` | Parallel projection (2D-like) |
| `perspective` | Perspective projection (3D) |

### 15.3 Custom Views

5 numbered view slots that save camera position, target, and zoom. Can be recorded and recalled.

---

## 16. Export System

### 16.1 Single Export

Formats: OBJ, GLB, DAE, DXF, IFC (3D models), PNG, JPG, SVG (images)

Resolutions: 720p, 1080p, 4K, 8K, 16K, 1080×1080 Square, A4 Landscape

### 16.2 Batch Export

Queue multiple saved views × camera angles, exported as a ZIP file. Uses a queue system with sequential processing.

---

## 17. Interaction System

### 17.1 Move Mode (M Key)

AutoCAD-style 3-phase movement:
1. **selectObject** — Click a building to select it as move target (green highlight)
2. **selectBase** — Click to set the base/reference point
3. **moving** — Move cursor to destination, click to place

Uses a large capture plane at z=200 for pointer events during the moving phase.

### 17.2 Edge Extrude (Building Editing)

Edge handles on building edges allow perpendicular drag to resize:
- Outward-pointing arrow (CW normal: `{ x: dy/len, y: -dx/len }`)
- Sends incremental delta per pointer move (not cumulative)
- 0.5ft minimum threshold before firing
- Automatically promotes rectangle building to polygon mode

### 17.3 Move Handle

4-directional crosshair gizmo for direct building drag:
- Position: Ground plane, 3ft in front of building front edge
- Sends absolute position (not delta)
- Free 2D movement in XY plane

### 17.4 Lot Access Arrows

Draggable arrows indicating lot access points. Four directions: front, rear, sideStreet, sideInterior. Positions stored in `annotationPositions` and validated against lot bounds + 20ft margin.

---

## 18. Lighting & Rendering

### 18.1 Studio Lighting (Default)

- Key directional light (shadows, 4096×4096 shadow map)
- Fill light (cool blue, opposite side)
- Rim/back light (warm)
- Ambient light (intensity 0.3)
- Hemisphere light (sky white, ground gray)

### 18.2 Sun Lighting (Optional)

- Single directional light from azimuth/altitude
- Configurable intensity, shadow enable
- Ambient and hemisphere lights

### 18.3 Post-Processing

- N8AO ambient occlusion (intensity 0.8, radius 0.3)
- ACES Filmic tone mapping
- SMAA anti-aliasing
- Outline effect for selection hover

---

## 19. CSV Import System

### 19.1 Lot-Level Import (16 fields)

Maps CSV columns to lot parameters:
- Lot dimensions (width, depth)
- Setbacks (front, rear, sideLeft, sideRight)
- Building (width, depth, height, stories, floor heights, maxHeight)
- Accessory (width, depth, maxHeight)

### 19.2 District-Level Import (66 fields)

Maps CSV columns to `districtParameters` using dot-path notation. Supports batch import — each CSV row becomes a separate scenario.

Special meta fields:
- `_districtName` — scenario name
- `_districtCode` — scenario code

---

## 20. SketchUp-Specific Mapping Notes

### 20.1 Coordinate System Translation

The web app uses:
- +X = right, +Y = depth (front to rear), +Z = up

SketchUp uses:
- +X = right (red), +Y = into screen (green), +Z = up (blue)

**The Y axis mapping is the same** (both use Y for depth/green axis). Z is up in both. No axis remapping needed.

### 20.2 Units

The web app uses feet internally. SketchUp can work in any unit, but set the model to **Architectural (feet/inches)** for consistency.

### 20.3 Geometry Mapping

| Web App Element | SketchUp Equivalent |
|----------------|---------------------|
| Lot fill (plane) | Face on ground plane |
| Lot lines | Edges on ground plane |
| Setback lines | Edges (possibly on separate layer) |
| Building floors | Box groups (push/pull faces) |
| Building edges | SketchUp edges (automatic) |
| BTZ planes | Vertical face groups |
| Max height plane | Horizontal face group |
| Road zones | Face groups on ground plane |
| Fillet arcs | Arc + face groups |
| Dimensions | SketchUp Dimension entities |
| Text labels | SketchUp Text entities |
| Leader lines | SketchUp leader entities |

### 20.4 Layer/Tag Mapping

SketchUp's "Tags" (formerly "Layers") map directly to the layer system:

Create one SketchUp Tag per layer key:
```ruby
tags_to_create = [
  'Lot Lines', 'Setbacks', 'Accessory Setbacks', 'Max Setbacks',
  'BTZ Planes', 'Lot Access Arrows',
  'Principal Buildings', 'Accessory Buildings',
  'Roof', 'Max Height Plane',
  'Road Module', 'Road Intersections',
  'Dimensions - Lot Width', 'Dimensions - Lot Depth',
  'Dimensions - Setbacks', 'Dimensions - Height (Principal)',
  'Dimensions - Height (Accessory)',
  'Labels - Lot Names', 'Labels - Lot Edges',
  'Labels - Setbacks', 'Labels - Buildings',
  'Labels - Road Names', 'Labels - Road Zones',
]
```

### 20.5 Style Mapping

| Web App Style Property | SketchUp Equivalent |
|-----------------------|---------------------|
| `color` | Material color |
| `opacity` | Material alpha |
| `lineWidth` | Edge width (limited in SU) |
| `dashed` | Dashed line style |
| Per-side style overrides | Per-edge material/style |

### 20.6 Per-Lot Groups

Each lot should be a SketchUp Group or ComponentInstance positioned at the lot offset. This enables per-lot visibility toggling via SketchUp's tag system.

### 20.7 Road Modules as Groups

Each road module should be a Group, rotated to the correct direction. Road zones within should be sub-groups with appropriate tags for visibility control.

### 20.8 Dimension Entities

SketchUp has native `Sketchup::DimensionLinear` entities. Use these for:
- Lot width/depth dimensions
- Setback dimensions
- Building height dimensions

For custom label text, use `dimension.text = custom_text` instead of the default measured value.

### 20.9 Suggested Ruby Module Structure

```ruby
module ZoningVisualization
  # Data model
  class District
    attr_accessor :lots, :road_modules, :parameters, :settings
  end

  class Lot
    attr_accessor :width, :depth, :setbacks, :buildings, :styles, :visibility
  end

  class Building
    attr_accessor :width, :depth, :x, :y, :stories, :first_floor_height,
                  :upper_floor_height, :roof, :building_type
  end

  class RoadModule
    attr_accessor :type, :direction, :right_of_way, :road_width, :zones
  end

  # Geometry builders
  module LotBuilder        # Creates lot geometry
  module SetbackBuilder    # Creates setback lines
  module BuildingBuilder   # Creates building boxes
  module DimensionBuilder  # Creates dimension entities
  module RoadBuilder       # Creates road zones
  module IntersectionBuilder # Creates fillet/intersection geometry
  module AnnotationBuilder # Creates text labels

  # UI
  class ParameterDialog    # HTML dialog for settings
  class LayerManager       # Tag management
  class StyleManager       # Material/style management
end
```

### 20.10 UI Considerations

The web app has a rich sidebar panel. In SketchUp, this would map to:
- **HTML Dialog** (or HtmlDialog) for the parameter panel
- **Toolbar** for common actions (add lot, toggle views)
- **Context menu** entries for building/lot operations
- **Inspector panel** for style editing

### 20.11 Data Persistence

The web app uses localStorage + Express.js backend. In SketchUp:
- Store state in `model.attribute_dictionary` for per-model persistence
- Use `Sketchup.write_default` / `Sketchup.read_default` for app-wide preferences
- Export/import JSON files for scenario management

---

## Appendix A: Analytics Computations

| Metric | Formula |
|--------|---------|
| Lot Area | `lotWidth × lotDepth` (or polygon area) |
| Building Footprint | `buildingWidth × buildingDepth` (for each building) |
| Coverage | `(totalFootprint / lotArea) × 100` |
| GFA (Gross Floor Area) | `footprint × stories` (for each building) |
| FAR (Floor Area Ratio) | `totalGFA / lotArea` |

## Appendix B: Font Options

| Font | Format |
|------|--------|
| Inter | .woff |
| Roboto | .ttf |
| Lato | .woff |
| Montserrat | .ttf |
| Oswald | .ttf |
| Source Sans 3 | .ttf |

In SketchUp, use system fonts or the SketchUp text API's built-in font selection.

## Appendix C: Render Order / Z-Fighting Prevention

The web app uses z-offsets and render order to prevent z-fighting. In SketchUp, similar issues can be addressed with:
- Small z-offsets for coplanar geometry (same approach)
- Placing coplanar faces on separate groups
- Using SketchUp's native face rendering order

## Appendix D: Complete State Defaults Summary

See Section 3 (Data Model), Section 7.8 (Dimension Settings), Section 8.4 (Annotation Settings), Section 11 (Style System), and Section 12 (Layer System) for all default values.
