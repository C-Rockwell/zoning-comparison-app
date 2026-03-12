# CLAUDE.md

## Project Overview

React Three Fiber zoning visualization app with two modules:
1. **Comparison Module** — Side-by-side existing vs. proposed zoning (split-screen 3D)
2. **District Module** — Multi-lot composition (up to 5 lots), principal + accessory buildings, multi-direction roads

Express.js backend for project persistence. See `CODEBASE_NAV.md` for file/function index — consult it BEFORE searching the codebase. For detailed store actions, factory functions, hooks, z-map, and component hierarchy, see `CODEBASE_LIBRARY.md`. Update nav files when making structural changes.

## Commands

```bash
npm run dev              # Start Vite frontend + Express backend
npm run dev:client       # Vite only (port 5173)
npm run dev:server       # Express only (port 3001)
npm run build            # Production build
npm run lint             # ESLint
```

## Tech Stack

React + Vite + Three.js via @react-three/fiber | Zustand + Zundo (undo/redo, 50-step) | Tailwind CSS + CSS variables (`var(--ui-*)`) | Express backend on port 3001 | react-router-dom (HashRouter) | Lucide React icons | **No TypeScript, no tests**

## Architecture

**Comparison Module** (legacy): `Viewer3D` + `ParameterPanel` + `SceneContent`. State: `existing`/`proposed` + `comparisonRoads`.

**District Module** (entity-based): `DistrictViewer` + `DistrictParameterPanel` + `DistrictSceneContent` + `LotEntity`. State: `entities.lots[lotId]` with `buildings: { principal, accessory }` + expanded setbacks. Lot 1 in +X from origin, Lots 2+ in -X. Visibility: `layers.X && lotVisibility[lotId].X`.

**Entity hooks** in `useEntityStore.js`. Factory functions: `createDefaultLot()`, `createDefaultLotStyle()`, `createDefaultRoadModule()`, `createDefaultLotVisibility()`.

**Store** (`useStore.js`, ~4,000 lines, v34): Persist `merge` function patches missing keys on every hydration. Dash param migration: old `dashScale=5` regime auto-converted to `dashScale=1` with scaled-up sizes. See code for full merge logic.

**Scenarios** (`ScenariosSection` in `DistrictParameterPanel.jsx`): Auto-saves active scenario before switching. Re-clicking active scenario triggers save. Duplicate button creates a copy under a new name. Active scenario shown with accent dot indicator. "Save as New" button shown when no scenario is active.

**Saved Views**: Store camera position/target/zoom + projection + layers. `_cameraControlsRef` (transient) set by `DistrictViewer` for sidebar `ViewsSection` access to camera controls.

**Imported Models** (v33): Multi-model per lot. `lot.importedModels` (object map by modelId) + `lot.importedModelOrder` (array). Actions take `(lotId, modelId, ...)`. Selection state: `selectedImportedModel: { lotId, modelId }` (transient). Style editing via `ImportedModelStylePopup.jsx` floating panel in `DistrictViewer`. Sidebar (`ModelImportSection`) shows compact model lists — click name to select, style in popup.


## Conventions (CRITICAL)

### Numeric & Rendering Guards
- **`??` not `||`** for numeric fallbacks — respects explicit `0`
- **`!= null && > 0`** guard before rendering any geometry/dimension
- **Opacity defaults to 1.0** — sub-1.0 causes Three.js transparent sorting issues
- **`transparent={opacity < 1}`** + **`depthWrite={opacity >= 0.95}`** — never hardcode `transparent={true}`

### Zustand Patterns
- **`useShallow`** when selecting objects from store — prevents infinite re-renders
- **Undo batching**: `pause()` on pointer down, `resume()` on pointer up for all drags
- **4-place update** for new style/visibility/layer keys: `createDefaultLotStyle()`, `createDefaultLotVisibility()`, `viewSettings.layers`, persist `merge` function
- **`=== undefined`** for existence checks in merge patching (not `!value` which catches `0`, `false`, `''`)

### React + Three.js Rules
- **NEVER define components inside render functions** — causes unmount/remount render loops
- **NEVER put `return null` before hooks** — all hooks must come BEFORE any early return
- **No ContactShadows** — Y-up assumption causes z-fighting in Z-up scenes
- **PostProcessing before GizmoHelper** in `SharedCanvas.jsx` / `Viewer3D.jsx`
- **`renderOrder` doesn't work on drei `<Line>`** — use z-offset separation instead
- **Line dash values are world-space feet** — `dashScale=1`, `dashSize`/`gapSize` in feet (e.g., `dashSize: 3, gapSize: 2` = 3ft dash, 2ft gap). Custom sliders: 0.5–20ft. RoadModule `<Line>` must pass `dashScale` prop.
- **Google Fonts**: Troika-three-text does NOT support woff2 — always use `.woff` or `.ttf`
- **MoveHandle**: `depthTest={false}` + `renderOrder={8}` at `zPosition={1}`. Visibility via `parentHovered` prop. Drag plane uses `opacity={0}` (not `visible={false}`, which blocks raycasting).
- **Dimension verticalMode text rotation**: Uses quaternion composition (`alignToLine * standUp`) not raw Euler angles — handles both X-axis and Y-axis dimension lines correctly.

### Street-Aware Setbacks
`streetSides` prop determines which lot sides face streets. Street-facing sides use `minSideStreet`/`maxSideStreet`; interior sides use `sideInterior`. Critical for corner lots. Dimension custom labels use semantic keys `setbackSideStreet`/`setbackSideInterior` (not positional left/right) — each lot resolves per-side based on `streetSides`.

### Road System
Roads stop at lot boundaries. Intersection fills use notched geometry with quarter-circle cutouts (`intersectionGeometry.js`). S3 (Alley) T-junctions: fillets/fills suppressed when meeting non-S3. Road types: S1 (Primary, ROW 50'), S2 (Secondary, ROW 40'), S3 (Alley, ROW 20'). Alley-specific style keys default `null` (fall back to regular style).

## Git

- **Branches**: `main` only

## User Shortcuts

- **/PUCP** — Update CLAUDE.md, commit all changes, push to GitHub.
