# Claude Briefing - Zoning Comparison App

**Last Updated:** January 2, 2025

## Project Overview

A React Three Fiber application for comparing existing vs proposed zoning code conditions side-by-side. Two 3D models are displayed:
- **Left model (negative X):** Existing zoning conditions
- **Right model (positive X):** Proposed zoning amendments

Built with: React, Vite, Three.js, @react-three/fiber, @react-three/drei, @react-three/postprocessing, Zustand, Tailwind CSS

## Current Architecture

### Key Files
- `src/store/useStore.js` - Zustand store with all state (existing/proposed params, styleSettings, renderSettings, roadModule)
- `src/components/Viewer3D.jsx` - Main 3D canvas, lighting, post-processing, camera controls
- `src/components/SceneContent.jsx` - Building, Lot, SetbackLayer, GroundPlane, MaxHeightPlane components
- `src/components/StyleEditor.jsx` - Two-column UI for styling existing/proposed models independently
- `src/components/Exporter.jsx` - Export to PNG, JPG, SVG, OBJ, GLB, DAE, DXF
- `src/components/ParameterPanel.jsx` - Controls for lot dimensions, setbacks, building size, road module
- `src/components/LotEditor/` - Polygon lot editing system (VertexHandle, EdgeHandle, MidpointHandle, PolygonLot)
- `src/components/RoadModule.jsx` - Road cross-section visualization
- `src/components/Dimension.jsx` - Dimension lines for measurements

### Building Parameters Structure
```javascript
existing/proposed: {
  lotWidth, lotDepth,
  setbackFront, setbackRear, setbackSideLeft, setbackSideRight,
  buildingWidth, buildingDepth,
  buildingStories,      // Number of floors
  firstFloorHeight,     // Height of ground floor (typically taller)
  upperFloorHeight,     // Height of upper floors
  maxHeight,            // Max height plane (regulatory limit)
  buildingX, buildingY, // Building position within lot
  lotGeometry: {        // Polygon editing state
    mode: 'rectangle' | 'polygon',
    editing: boolean,
    vertices: [{id, x, y}] | null
  }
}
```

### Road Module Structure
```javascript
roadModule: {
  enabled: boolean,
  rightOfWay: number,    // Total ROW width
  roadWidth: number,     // Road surface width
  // Optional elements (null = not shown)
  leftParking, rightParking,
  leftVerge, rightVerge,
  leftSidewalk, rightSidewalk,
  leftTransitionZone, rightTransitionZone
}
```

### Style Settings Structure
```javascript
styleSettings: {
  existing: { lotLines, setbacks, lotFill, buildingEdges, buildingFaces, maxHeightPlane },
  proposed: { lotLines, setbacks, lotFill, buildingEdges, buildingFaces, maxHeightPlane },
  ground: { color, opacity, visible },
  grid: { sectionColor, cellColor, sectionThickness, cellThickness }
}
```

## What's Working

### Core Features
1. **Split Style Controls** - Existing and Proposed models styled independently
2. **Transparent PNG Export** - Exports with no background (only ground plane if enabled)
3. **Building fill/edges** - Using meshBasicMaterial with Edges component
4. **Lot fill colors** - Using meshBasicMaterial
5. **Line styles** - Solid/dashed with customizable dash/gap sizes
6. **Color presets** - Default, Blueprint, Contrast, Monochrome
7. **Studio lighting** - Directional light with shadows, fill lights, ambient
8. **Camera controls** - Preset views (ISO, Top, Front, Left, Right), custom saved views

### Recent Additions (Jan 2, 2025)
1. **Gross Floor Area (GFA) Calculation** - Now multiplies building footprint by number of stories
2. **Floor Area Ratio (FAR) Calculation** - Uses total floor area (GFA) divided by lot area
3. **Building Stories System**
   - `buildingStories` - Number of floors
   - `firstFloorHeight` - Ground floor height (typically 12-14')
   - `upperFloorHeight` - Upper floor heights (typically 10')
   - Building renders as stacked floor boxes
4. **Max Height Plane** - Visualizes zoning height limit as translucent plane with dashed outline
5. **Polygon Lot Editing**
   - Convert rectangular lots to editable polygons
   - Drag vertices with perpendicular constraints (maintains 90-degree angles)
   - Split edges to add new vertices
   - Extrude edges perpendicular to themselves
   - Shoelace formula for accurate polygon area calculation
   - Snap to 1' grid
6. **Road Module System**
   - Configurable right-of-way width and road surface width
   - Optional components on each side: parking, verge, sidewalk, transition zone
   - Visual validation (shows remaining space, warns when exceeding ROW)
   - Separate styling for each component
7. **Improved Parameter Panel**
   - Custom labels (e.g., "Front Setback" instead of "setbackFront")
   - Logical ordering of parameters
   - Layer toggles for road module and max height plane
8. **Statistics Panel** - Shows lot size, coverage %, GFA, and FAR for both conditions

## Known Issues / Incomplete Features

### 1. Ambient Occlusion Not Visible
- Tried N8AO and SSAO from @react-three/postprocessing
- Neither shows visible shading on buildings
- May be due to meshBasicMaterial not interacting well with depth-based AO

### 2. Building Shading (Dark Sides)
- meshLambertMaterial responds to lighting BUT breaks transparency/opacity
- meshBasicMaterial shows correct colors/opacity BUT ignores lighting
- **Possible future solutions:**
  - Custom shader combining color with simple directional shading
  - Vertex colors baked based on face normals

### 3. Sun Simulation (Disabled)
- Code exists in `src/components/SunControls.jsx` and `src/hooks/useSunPosition.js`
- Currently not imported/used

## Default Visual Styles

```
Existing:
- All lines: black (#000000)
- Lot lines: width 1.5, solid
- Setbacks: width 1, dashed (dash: 20, gap: 10)
- Building edges: width 1.5
- Lot fill: #D4EAAA (light green), opacity 1.0
- Building mass: #D5D5D5 (light gray), opacity 1.0

Proposed:
- All lines: black (#000000)
- Lot lines: width 2.5, solid
- Setbacks: width 2, dashed (dash: 20, gap: 10)
- Building edges: width 2.5
- Lot fill: #bbd77f (darker green), opacity 1.0
- Building mass: #d7bcff (light purple), opacity 0.7

Ground plane: hidden by default
Max Height Plane: #FF6B6B at 30% opacity with red dashed outline
```

## Render Settings
```javascript
renderSettings: {
  ambientOcclusion: true,
  aoIntensity: 4,
  aoRadius: 2,
  toneMapping: true,
  antialiasing: true,
  contactShadows: true,
  materialRoughness: 0.7,
  materialMetalness: 0.1,
}
```

## Potential Next Steps

1. **Fix AO visibility** - Either make SSAO work or try a different approach
2. **Custom shader for building shading** - Combine flat color with directional shading
3. **Setback visualization for polygon lots** - Currently setbacks only work with rectangles
4. **IFC export** - Utility exists at `src/utils/ifcGenerator.js` but not integrated
5. **More road module features** - Lane markings, crosswalks, etc.

## Commands

```bash
npm run dev    # Start dev server at localhost:5173
npm run build  # Production build
npm run lint   # Run ESLint
```

## Git Status

Repository: https://github.com/C-Rockwell/zoning-comparison-app.git
Branch: main
All changes committed and pushed as of this session.
