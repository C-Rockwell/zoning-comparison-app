# Claude Briefing - Zoning Comparison App

**Last Updated:** December 18, 2024

## Project Overview

A React Three Fiber application for comparing existing vs proposed zoning code conditions side-by-side. Two 3D models are displayed:
- **Left model (negative X):** Existing zoning conditions
- **Right model (positive X):** Proposed zoning amendments

Built with: React, Vite, Three.js, @react-three/fiber, @react-three/drei, @react-three/postprocessing, Zustand, Tailwind CSS

## Current Architecture

### Key Files
- `src/store/useStore.js` - Zustand store with all state (existing/proposed params, styleSettings, renderSettings)
- `src/components/Viewer3D.jsx` - Main 3D canvas, lighting, post-processing, camera controls
- `src/components/SceneContent.jsx` - Building, Lot, SetbackLayer, GroundPlane components
- `src/components/StyleEditor.jsx` - Two-column UI for styling existing/proposed models independently
- `src/components/Exporter.jsx` - Export to PNG, JPG, SVG, OBJ, GLB, DAE, DXF
- `src/components/ParameterPanel.jsx` - Controls for lot dimensions, setbacks, building size

### Style Settings Structure
```javascript
styleSettings: {
  existing: { lotLines, setbacks, lotFill, buildingEdges, buildingFaces },
  proposed: { lotLines, setbacks, lotFill, buildingEdges, buildingFaces },
  ground: { color, opacity, visible }
}
```

## What's Working

1. **Split Style Controls** - Existing and Proposed models can be styled independently
2. **Transparent PNG Export** - Exports with no background (only ground plane if enabled)
3. **Building fill colors** - Using meshBasicMaterial, works with any opacity
4. **Lot fill colors** - Using meshBasicMaterial, works correctly
5. **Building edges** - Using @react-three/drei Edges component
6. **Line styles** - Solid/dashed with customizable dash/gap sizes
7. **Color presets** - Default, Blueprint, Contrast, Monochrome
8. **Studio lighting** - Directional light with shadows, fill lights, ambient
9. **Camera controls** - Preset views (ISO, Top, Front, Left, Right), custom saved views

## Known Issues / Incomplete Features

### 1. Ambient Occlusion Not Visible
- Tried N8AO and SSAO from @react-three/postprocessing
- Neither shows visible shading on buildings
- May be due to meshBasicMaterial not interacting well with depth-based AO
- **Current state:** SSAO is enabled but not producing visible results

### 2. Building Shading (Dark Sides)
- User wants buildings to show darker colors on shaded sides
- meshLambertMaterial responds to lighting BUT breaks transparency/opacity
- meshBasicMaterial shows correct colors/opacity BUT ignores lighting
- **Attempted solutions that failed:**
  - Hybrid approach (two overlapping meshes) - broke edges
  - Emissive boost for transparent materials - made everything invisible
- **Possible future solutions:**
  - Custom shader that combines color with simple directional shading
  - Vertex colors baked based on face normals
  - Accept that AO provides enough depth cues

### 3. Sun Simulation (Removed)
- Was implemented but didn't work well
- Code still exists in `src/components/SunControls.jsx` and `src/hooks/useSunPosition.js`
- Currently not imported/used in Viewer3D.jsx
- Could be re-enabled later if desired

## Default Visual Styles (Per User Spec)

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
```

## Render Settings (in store)
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

## Next Steps (When Resuming)

1. **Fix AO visibility** - Either make SSAO work or try a different approach for depth/shading
2. **Consider custom shader** - For building faces that combines flat color with simple directional shading
3. **Test export quality** - Verify PNG exports look good at various resolutions
4. **Potential UI improvements** - The StyleEditor panel could be more compact

## Commands

```bash
npm run dev    # Start dev server at localhost:5173
npm run build  # Production build
```

## Git Status

All changes committed and pushed to `origin/main` as of this session.
Repository: https://github.com/C-Rockwell/zoning-comparison-app.git
