# Claude Briefing - Zoning Comparison App

**Last Updated:** January 21, 2025

## Project Overview

A React Three Fiber application for comparing existing vs proposed zoning code conditions side-by-side. Two 3D models are displayed:
- **Left model (negative X):** Existing zoning conditions
- **Right model (positive X):** Proposed zoning amendments

Built with: React, Vite, Three.js, @react-three/fiber, @react-three/drei, Zustand, Tailwind CSS, **Express (backend)**

## Architecture

### Frontend (React + Vite)
- `src/store/useStore.js` - Zustand store (all state, ~1300 lines)
- `src/components/Viewer3D.jsx` - Main 3D canvas, lighting, camera
- `src/components/SceneContent.jsx` - Building, Lot, SetbackLayer, MaxHeightPlane
- `src/components/ParameterPanel.jsx` - Left sidebar with controls
- `src/components/StyleEditor.jsx` - Right sidebar for styling
- `src/components/Exporter.jsx` - Export to PNG, JPG, SVG, OBJ, GLB, DAE, DXF, IFC
- `src/components/ProjectManager.jsx` - Header bar with project controls
- `src/components/StateManager.jsx` - Snapshots & Layer States panel (in ParameterPanel)
- `src/components/LotEditor/` - Polygon lot editing system
- `src/components/RoadModule.jsx` - Road cross-section visualization
- `src/services/api.js` - API client for backend

### Backend (Express on port 3001)
- `server/index.js` - Express server entry point
- `server/routes/config.js` - Projects directory configuration
- `server/routes/projects.js` - Project CRUD
- `server/routes/exports.js` - Save export files to project folders
- `server/routes/snapshots.js` - Full state + camera snapshots
- `server/routes/layer-states.js` - Style-only layer states

### Config Files
- `vite.config.js` - Has proxy for `/api` → `http://localhost:3001`
- `package.json` - Has `"dev": "concurrently \"vite\" \"node server/index.js\""`
- `~/.zoning-app-config.json` - Stores user's projects directory path

### macOS App Launcher

- `launch-zoning-app.command` - Shell script to launch app (double-click in Finder)
- `~/Desktop/ZoningApp.app` - macOS application bundle for easy launching
- Both options start the dev servers and open browser automatically

## Project Management System (NEW)

### Project Folder Structure
```
[User-Selected Projects Directory]/
  └── Project Name/
      ├── project.json           # Project metadata + saved state
      ├── images/                # PNG, JPG, SVG exports (auto-saved with timestamps)
      ├── models/                # OBJ, GLB, DAE, DXF, IFC exports
      ├── snapshots/             # Full state + camera position
      └── layer-states/          # Styles/visibility only (no camera)
```

### Two Save Types
1. **Snapshots** - Saves everything: parameters, styles, camera position
2. **Layer States** - Saves only styles/visibility (camera stays where it is)

### How It Works
1. On first run, user chooses projects directory (quick-select buttons or custom path with `~` support)
2. User creates a project → folder structure is created
3. Exports automatically save to project's images/ or models/ folder with timestamps
4. Snapshots/Layer States saved via panel in ParameterPanel sidebar
5. Manual project save stores full state to project.json

### API Endpoints
```
GET/PUT  /api/config                    - Projects directory
GET/POST /api/projects                  - List/Create projects
GET/PUT/DELETE /api/projects/:id        - Get/Update/Delete project
POST     /api/projects/:id/exports      - Save export file
GET/POST /api/projects/:id/snapshots    - List/Save snapshots
GET/POST /api/projects/:id/layer-states - List/Save layer states
```

## Building Parameters
```javascript
existing/proposed: {
  lotWidth, lotDepth,
  setbackFront, setbackRear, setbackSideLeft, setbackSideRight,
  buildingWidth, buildingDepth,
  buildingStories, firstFloorHeight, upperFloorHeight,
  maxHeight,            // Max height plane
  buildingX, buildingY, // Building position
  lotGeometry: { mode, editing, vertices }  // Polygon editing
}
```

## Store State for Projects
```javascript
// Project management state (in useStore.js)
projectConfig: { projectsDirectory, isConfigured }
currentProject: { id, name, path, createdAt, modifiedAt }
projects: []
snapshots: []
layerStates: []
cameraState: { position, target, zoom, fov }

// Key actions
setProjectConfig, setCurrentProject, setProjects
getSnapshotData, getLayerStateData
applySnapshot, applyLayerState
getProjectState, applyProjectState
```

## Road Module
```javascript
roadModule: {
  enabled, rightOfWay, roadWidth,
  leftParking, rightParking,
  leftVerge, rightVerge,
  leftSidewalk, rightSidewalk,
  leftTransitionZone, rightTransitionZone
}
```

## Key Features
- Split style controls for existing/proposed models
- Polygon lot editing with perpendicular constraints
- Building stories with separate floor heights
- Max height plane visualization
- Road module with configurable components
- GFA/FAR calculations
- Multiple export formats (PNG, JPG, SVG, OBJ, GLB, DAE, DXF, IFC)
- Camera presets and saved views
- Undo/redo (Zundo middleware)

## Recent Features (January 2025)

### Toast Notifications
- Added toast notification system for export feedback
- Shows success/error messages when exports complete
- Component in `src/App.jsx`, state in `useStore.js` (`toast`, `showToast`, `hideToast`)
- Animation defined in `src/index.css` (`.animate-slide-in`)

### Custom Dimension Labels
- Users can replace numeric dimension values with custom text labels (e.g., "A", "B")
- Located in StyleEditor under "CUSTOM DIMENSION LABELS" section
- Universal labels apply to both existing and proposed models
- Can leave custom label blank to show only dimension lines without text
- Settings stored in `dimensionSettings.customLabels`:
  ```javascript
  customLabels: {
    lotWidth: { mode: 'value', text: '' },    // 'value' = numeric, 'custom' = custom text
    lotDepth: { mode: 'value', text: '' },
    setbackFront: { mode: 'value', text: '' },
    setbackRear: { mode: 'value', text: '' },
    setbackLeft: { mode: 'value', text: '' },
    setbackRight: { mode: 'value', text: '' },
    buildingHeight: { mode: 'value', text: '' },
  }
  ```
- Helper function `resolveDimensionLabel()` in SceneContent.jsx

### WYSIWYG Export Line Scaling
**Purpose:** Make exported images look identical to the viewer at any resolution.

**Problem:** Three.js Line widths are in screen pixels, not world units. When exporting at higher resolutions (e.g., 8K), lines appear thinner relative to the scene.

**Solution Implemented:**
1. Calculate scale factor: `lineScaleFactor = exportWidth / viewportWidth`
2. Store in `viewSettings.exportLineScale` (via `setExportLineScale` action)
3. Pass `lineScale={exportLineScale}` prop through all geometry components
4. Multiply line widths by `lineScale` before rendering

**Files Modified:**
- `src/store/useStore.js` - Added `exportLineScale` state and `setExportLineScale` action
- `src/components/Exporter.jsx` - Calculates and sets scale factor before render, uses `requestAnimationFrame` to wait for React update
- `src/components/SceneContent.jsx` - Subscribes to `exportLineScale`, passes to all components
- `src/components/Dimension.jsx` - Uses **dampened scale** (`pow(lineScale, 0.15)`) for WYSIWYG proportions
- `src/components/LotEditor/index.jsx` & `PolygonLot.jsx` - Accept and use `lineScale`
- `src/components/RoadModule.jsx` - Accept and use `lineScale`

**Current Scaling Behavior:**
- **Lot lines, setbacks, building edges, road module:** Full `lineScale` (e.g., 4x at 8K)
- **Dimension lines, ticks, arrows, dots:** Dampened `pow(lineScale, 0.15)` (e.g., ~1.23x at 4x scale)

**Key Code Locations:**
```javascript
// Exporter.jsx - Scale calculation
const viewportWidth = originalSize.x
const lineScaleFactor = width / viewportWidth
setExportLineScale(lineScaleFactor)

// Dimension.jsx - Dampened scale (0.15 exponent found through testing)
const dampenedScale = Math.pow(lineScale, 0.15)
const lineWidth = baseLineWidth * dampenedScale
const markerScale = Math.max(1.5, baseLineWidth * 0.8) * dampenedScale
```

**Tested Exponents (for ~4x scale factor at 8K export):**
- 0.85: Too thick
- 0.65, 0.55, 0.5, 0.45, 0.35, 0.25: Still too large
- **0.15: Acceptable WYSIWYG match** ✓

## Known Issues
1. **AO not visible** - meshBasicMaterial doesn't interact with depth-based AO
2. **Building shading** - meshBasicMaterial ignores lighting
3. **Setbacks for polygons** - Only works with rectangular lots

## Commands

```bash
npm run dev          # Start Vite + Express (both servers)
npm run dev:client   # Just Vite (frontend only)
npm run dev:server   # Just Express (backend only)
npm run build        # Production build
npm run lint         # ESLint
```

## Quick Start

**Option A - Desktop App (Recommended):**
1. Double-click `ZoningApp.app` on Desktop (or `launch-zoning-app.command`)
2. First time: Right-click → "Open" to bypass macOS security
3. App opens Terminal + browser automatically

**Option B - Terminal:**
1. `npm run dev` - Starts both servers
2. Open http://localhost:5173

**Then:**

1. On first run, choose projects folder (~/Documents/ZoningProjects recommended)
2. Create a project → adjust parameters → save snapshots/layer states
3. Exports auto-save to project folder when project is open

## Git Status
Repository: https://github.com/C-Rockwell/zoning-comparison-app.git
Branch: main
