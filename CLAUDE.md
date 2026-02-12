# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A React Three Fiber application for comparing existing vs. proposed zoning code conditions with 3D visualization. Features split-screen views, real-time styling, dimension annotations, sun simulation, and multi-format export capabilities. Includes an Express.js backend for project persistence with snapshots and layer states.

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
- **3D Utilities**: @react-three/drei (camera, gizmo, grid), @react-three/postprocessing (AO, SMAA)
- **State**: Zustand 5 with Zundo 2.3 (undo/redo, 50-step history)
- **Styling**: Tailwind CSS 3.4
- **Icons**: Lucide React
- **Backend**: Express 5 on port 3001 (proxied via Vite dev server)
- **No TypeScript, no tests**

### Key Directories
```
zoning-comparison-app/
├── src/
│   ├── components/              # React components (~4,600 lines total)
│   │   ├── Viewer3D.jsx         # Main 3D canvas, controls, export panel (447 lines)
│   │   ├── SceneContent.jsx     # All 3D geometry rendering (631 lines)
│   │   ├── ParameterPanel.jsx   # Left sidebar: zoning params, layer toggles (470 lines)
│   │   ├── StyleEditor.jsx      # Right sidebar: colors, lines, opacity (1,122 lines)
│   │   ├── Exporter.jsx         # Multi-format export engine (435 lines)
│   │   ├── ProjectManager.jsx   # Project CRUD, directory setup (398 lines)
│   │   ├── StateManager.jsx     # Snapshots + layer states UI (309 lines)
│   │   ├── RoadModule.jsx       # Parametric road zone rendering (311 lines)
│   │   ├── Dimension.jsx        # Generic dimension annotation lines (149 lines)
│   │   ├── CameraHandler.jsx    # Camera preset handling (91 lines)
│   │   ├── SunControls.jsx      # Sun simulation UI (260 lines)
│   │   └── LotEditor/           # Polygon vertex editing (index + PolygonLot)
│   ├── store/useStore.js        # Centralized Zustand store (1,367 lines)
│   ├── services/api.js          # REST API client for backend (151 lines)
│   ├── hooks/useSunPosition.js  # SunCalc-based sun position hook (122 lines)
│   ├── utils/ifcGenerator.js    # IFC4 BIM format generator
│   ├── App.jsx                  # Root: theme system, toast notifications, layout
│   └── main.jsx                 # React entry point
├── server/
│   ├── index.js                 # Express setup, CORS, 50MB limit (71 lines)
│   └── routes/
│       ├── config.js            # GET/PUT projects directory config
│       ├── projects.js          # Project CRUD with folder structure
│       ├── exports.js           # Save/list/delete exported files
│       ├── snapshots.js         # Full state snapshots
│       └── layer-states.js      # Style-only snapshots
├── _archive/                    # Old briefing/research docs (reference only)
├── DEVELOPMENT_STRATEGY.md      # Roadmap: neighborhood build-out feature
├── package.json
├── vite.config.js               # React plugin + /api proxy to :3001
├── tailwind.config.js
├── eslint.config.js
└── launch-zoning-app.command    # macOS convenience launcher
```

### State Structure (useStore.js)

The store manages two parallel condition objects (`existing` and `proposed`), each with:
- Lot dimensions, polygon geometry (vertices, mode: rectangle/polygon)
- Building dimensions, position (X/Y), stories (firstFloorHeight, upperFloorHeight, buildingStories)
- Setbacks (front, rear, left, right)
- Max height plane settings

Additional top-level state:
- **viewSettings**: camera mode, projection (ortho/perspective), export format/resolution
- **layerVisibility**: 14 toggleable layers (lotLines, setbacks, buildings, grid, roadModule, etc.)
- **dimensionSettings**: text/line colors, font, custom labels per dimension
- **styleSettings**: per-condition colors/opacity/line styles with per-side overrides
- **roadModule**: shared road parameters + per-zone left/right styles
- **sunSettings**: lat/long, date, time, animation, intensity
- **Project state**: currentProject, projects list, snapshots, layerStates

**Store version**: 13 (with migration system for backward compat from earlier versions)

**Undo/redo via Zundo**: tracks existing, proposed, viewSettings, layoutSettings, sunSettings, renderSettings, roadModule, roadModuleStyles. Excludes exportRequested flag.

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

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { GizmoHelper, CameraControls } from '@react-three/drei'

import * as api from './services/api'
```

## Key Features

- **Dual Condition Comparison**: Side-by-side existing vs. proposed zoning with split-screen 3D view
- **Polygon Lot Editing**: Vertex manipulation, edge splitting/extrusion, perpendicular constraints, Shoelace area calc
- **Building Stories System**: Separate first floor and upper floor heights, configurable story count
- **Road Module**: Configurable ROW, road width, parking, verge, sidewalk, transition zones with left/right differentiation
- **Sun Simulation**: SunCalc-powered directional light with 12 city presets, date/time control, animation mode
- **Multi-Format Export**: PNG, JPG, SVG (raster/vector), OBJ, GLB, DAE, DXF, IFC (BIM)
- **WYSIWYG Export**: Lines scale proportionally at any export resolution
- **Custom Dimension Labels**: Replace numeric values with arbitrary text
- **Camera Presets**: 5 saved view slots + standard views (top, front, side, iso)
- **Undo/Redo**: 50-step history via Zundo middleware
- **Project Management**: Save/load projects, full-state snapshots, style-only layer states
- **Calculated Metrics**: Lot area, building coverage %, GFA, FAR (auto-calculated)
- **Theme System**: Standard and modern UI themes via CSS variables

## Known Limitations

- Materials use `meshBasicMaterial` (no lighting/AO interaction)
- Setback visualization only works with rectangular lots, not polygon lots
- Store hardcodes exactly 2 conditions (`existing`/`proposed`) — referenced 149+ times across components
- Scene renders only 1 lot pair (not multiple blocks/streets)
- Road module is linear X-axis aligned (not arbitrary-direction streets)
- No 3D model import (planned in DEVELOPMENT_STRATEGY.md)
- No test suite
- StyleEditor (1,122 lines) and store (1,367 lines) are candidates for refactoring

## Future Direction

See `DEVELOPMENT_STRATEGY.md` for the roadmap to evolve from a 2-condition comparison tool into a neighborhood-scale composition engine. The critical path is:
1. Entity Store Architecture (refactor store from 2 conditions to N entities)
2. Street Network Engine + 3D Model Import + Multi-Lot Layout (parallelizable)
3. Scene Renderer Overhaul + UI Redesign
4. Annotations at Scale + Performance Optimization

## Git

- **Remote**: https://github.com/C-Rockwell/zoning-comparison-app.git
- **Branch**: main
- **Latest commit**: `0ca3fb3` — Express backend, multi-format export, project management
