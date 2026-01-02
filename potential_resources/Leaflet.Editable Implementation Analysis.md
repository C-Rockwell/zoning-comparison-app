# Leaflet.Editable Implementation Analysis

## Source
https://github.com/Leaflet/Leaflet.Editable/blob/master/src/Leaflet.Editable.js

## Overview

Leaflet.Editable is a well-architected library that provides polygon/polyline editing capabilities through a system of draggable markers. The implementation patterns here are directly applicable to the zoning comparison app's Three.js/React Three Fiber context.

## Key Classes and Their Roles

### 1. VertexMarker (Lines 497-695)

The VertexMarker class extends L.Marker and represents draggable handles at polygon vertices (corners). This is the core component for vertex manipulation.

**Key Implementation Details:**

```javascript
L.Editable.VertexMarker = L.Marker.extend({
  options: {
    draggable: true,
    className: 'leaflet-div-icon leaflet-vertex-icon',
  },

  initialize: function (latlng, latlngs, editor, options) {
    this.latlng = latlng          // Reference to the actual coordinate
    this.latlngs = latlngs        // Reference to the parent array
    this.editor = editor          // Reference to the editor
    // ... icon setup
    this.latlng.__vertex = this   // Back-reference from coord to marker
  },
})
```

**Event Handling Pattern:**
- `onDrag`: Updates the coordinate in real-time, refreshes geometry, updates adjacent midpoints
- `onDragStart/onDragEnd`: Fires events for external listeners
- `onClick`: Can be used to delete vertex (click without drag)
- `onContextMenu`: Right-click actions

**Neighbor Navigation:**
- `getPrevious()`: Gets the previous vertex marker
- `getNext()`: Gets the next vertex marker
- Uses `__vertex` property on latlng objects for back-references

### 2. MiddleMarker (Lines 704-812)

The MiddleMarker class represents the handles that appear at the midpoint of each edge. Clicking/dragging these creates a new vertex.

**Key Implementation Details:**

```javascript
L.Editable.MiddleMarker = L.Marker.extend({
  options: {
    opacity: 0.5,  // Semi-transparent to distinguish from vertices
    className: 'leaflet-div-icon leaflet-middle-icon',
    draggable: true,
  },

  initialize: function (left, right, latlngs, editor, options) {
    this.left = left    // Reference to left vertex
    this.right = right  // Reference to right vertex
    // Position is computed as midpoint
  },

  computeLatLng: function () {
    // Calculate midpoint between left and right vertices
    const leftPoint = this.editor.map.latLngToContainerPoint(this.left.latlng)
    const rightPoint = this.editor.map.latLngToContainerPoint(this.right.latlng)
    const y = (leftPoint.y + rightPoint.y) / 2
    const x = (leftPoint.x + rightPoint.x) / 2
    return this.editor.map.containerPointToLatLng([x, y])
  },
})
```

**Visibility Logic:**
- Hides automatically when edge is too short (prevents cluttered UI)
- Updates position when vertices move

**Click-to-Add-Vertex:**
```javascript
onMouseDown: function (e) {
  // Insert new vertex at this position
  this.latlngs.splice(this.index(), 0, e.latlng)
  this.editor.refresh()
  // Create new vertex marker and transfer drag to it
  const marker = this.editor.addVertexMarker(e.latlng, this.latlngs)
  // ... transfer drag operation to new marker
  this.delete()  // Remove the middle marker
}
```

### 3. BaseEditor (Lines 819+)

The editor class manages the overall editing state and coordinates between markers.

**Key Methods:**
- `initVertexMarkers()`: Creates all vertex markers for a shape
- `addVertexMarker()`: Adds a single vertex marker
- `addMiddleMarker()`: Adds a middle marker between two vertices
- `refresh()`: Redraws the shape after modifications
- `hasMiddleMarkers()`: Checks if middle markers should be shown

## Architecture Patterns for Three.js Implementation

### Pattern 1: Marker-Coordinate Binding

Leaflet uses a bidirectional reference pattern:
- Marker stores reference to coordinate: `this.latlng = latlng`
- Coordinate stores reference to marker: `this.latlng.__vertex = this`

**Three.js Equivalent:**
```javascript
// In React Three Fiber
function VertexHandle({ vertex, index, onDrag }) {
  const meshRef = useRef()
  
  // Store back-reference
  useEffect(() => {
    vertex.__handle = meshRef.current
  }, [vertex])
  
  return (
    <mesh
      ref={meshRef}
      position={[vertex.x, vertex.y, vertex.z]}
      onPointerDown={(e) => { /* start drag */ }}
    >
      <sphereGeometry args={[0.1, 16, 16]} />
      <meshBasicMaterial color="red" />
    </mesh>
  )
}
```

### Pattern 2: Real-time Geometry Updates

During drag, Leaflet updates the coordinate and refreshes:
```javascript
onDrag: function (e) {
  this.latlng.update(latlng)  // Update coordinate
  this.editor.refresh()        // Redraw shape
  if (this.middleMarker) this.middleMarker.updateLatLng()  // Update adjacent midpoints
}
```

**Three.js Equivalent:**
```javascript
const handleDrag = useCallback((newPosition) => {
  // Update vertex in store
  updateVertex(index, newPosition)
  // Geometry will auto-update via React state
}, [index])
```

### Pattern 3: Neighbor Chain

Vertices maintain references to neighbors for efficient updates:
```javascript
getPrevious() { return this.latlngs[index - 1].__vertex }
getNext() { return this.latlngs[index + 1].__vertex }
```

### Pattern 4: Editor Layer Separation

Leaflet keeps edit handles on a separate layer from the actual geometry:
```javascript
this.editor.editLayer.addLayer(this)  // Handles on edit layer
```

**Three.js Equivalent:**
Use separate groups or render order:
```jsx
<group name="geometry">
  {/* Actual building/lot meshes */}
</group>
<group name="editHandles" renderOrder={1}>
  {/* Vertex and edge handles */}
</group>
```

## Applying to Giraffe-style Edge Extrusion

Giraffe's edge extrusion (push/pull arrows) is NOT in Leaflet.Editable but can be built using similar patterns:

### Edge Extrusion Handle Implementation Concept

```javascript
// EdgeExtrusionHandle - similar to MiddleMarker but with directional drag
class EdgeExtrusionHandle {
  constructor(leftVertex, rightVertex, direction) {
    this.left = leftVertex
    this.right = rightVertex
    this.direction = direction  // 'inward' or 'outward'
    
    // Position at midpoint, offset perpendicular to edge
    this.position = this.computePosition()
  }
  
  computePosition() {
    const mid = midpoint(this.left, this.right)
    const perpendicular = this.computePerpendicular()
    const offset = this.direction === 'outward' ? 0.5 : -0.5
    return mid.add(perpendicular.scale(offset))
  }
  
  computePerpendicular() {
    const edge = this.right.subtract(this.left)
    // Rotate 90 degrees to get perpendicular
    return new Vector(-edge.y, edge.x).normalize()
  }
  
  onDrag(delta) {
    // Project drag onto perpendicular direction
    const perpendicular = this.computePerpendicular()
    const projectedDelta = delta.dot(perpendicular)
    
    // Move both vertices of this edge
    const movement = perpendicular.scale(projectedDelta)
    this.left.add(movement)
    this.right.add(movement)
    
    // Refresh geometry
    this.editor.refresh()
  }
}
```

## Key Takeaways for Zoning App

1. **Marker Classes**: Create separate React components for VertexHandle, MidpointHandle, and EdgeExtrusionHandle

2. **State Management**: Store vertices in Zustand, with handles reading from and updating the store

3. **Event System**: Use R3F's built-in pointer events (onPointerDown, onPointerMove, onPointerUp)

4. **Geometry Refresh**: React's state-driven rendering handles this automatically

5. **Visual Hierarchy**: Use different colors/sizes for vertex vs midpoint vs extrusion handles

6. **Constraint System**: For edge extrusion, constrain movement to perpendicular direction

## CSS Classes Used by Leaflet.Editable

```css
.leaflet-vertex-icon {
  /* Vertex marker styling */
}

.leaflet-middle-icon {
  /* Midpoint marker styling - typically smaller/transparent */
}
```

In Three.js, equivalent visual differentiation through:
- Geometry size (spheres vs smaller spheres)
- Material color/opacity
- Shape (spheres for vertices, arrows for extrusion)
