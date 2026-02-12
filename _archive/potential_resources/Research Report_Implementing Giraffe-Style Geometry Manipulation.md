# Research Report: Implementing Giraffe-Style Geometry Manipulation

**Date:** December 23, 2025  
**Author:** Manus AI

## 1. Executive Summary for Non-Technical Stakeholders

This report details the research into the interactive geometry manipulation features seen in **Giraffe.build**, specifically the "push/pull" handles that allow users to intuitively reshape polygons. Our investigation confirms that this is a highly effective and user-friendly interface for architectural and zoning applications.

We have successfully identified the core concepts and technical patterns required to implement a similar system in your zoning comparison application. The key takeaway is that this functionality is entirely achievable within your existing technology stack (React Three Fiber).

In simple terms, the system works by creating three types of interactive handles on a shape:

1.  **Corner Handles (Control Points):** Allow you to drag and move the corners of a shape.
2.  **Midpoint Handles:** Appear in the middle of each side and let you add new corners to make the shape more complex.
3.  **Push/Pull Handles (Extruding Edges):** These are the arrows on each side. They allow you to grab a whole edge and move it inwards or outwards, with the rest of the shape adjusting automatically. This is the feature you highlighted in the screenshot.

We have prepared a detailed technical guide for your development team to build this feature. It involves creating these handles as interactive 3D objects and programming the logic for how they modify the shape when dragged.

## 2. Analysis of Giraffe.build's Public Documentation

While the source code for Giraffe.build is proprietary and not publicly available, their help documentation provides a clear explanation of their geometry editing tools [1]. This allows us to deconstruct the functionality from a user's perspective.

| Handle Type | Visual Representation | Interaction | Purpose |
| :--- | :--- | :--- | :--- |
| **Control Point** | Small white circle with a red outline at each vertex (corner). | Drag to move the vertex. Click to delete the vertex. | Modify the fundamental shape of the polygon. |
| **Midpoint** | Transparent red dot at the center of each edge. | Click to add a new Control Point. | Increase the complexity and vertex count of the polygon. |
| **Extruding Edge** | Small arrow handles on either side of a Midpoint. | Drag to move the entire edge parallel to its original position. | "Push" or "pull" a side of the polygon, intuitively resizing it. |

This terminology and interaction model is a proven, user-friendly standard in many CAD and design applications.

## 3. Technical Deep Dive: Open-Source Implementation Patterns

To understand the underlying code architecture, we analyzed a popular open-source library, **`Leaflet.Editable`** [2], which implements similar (though not identical) functionality for 2D maps. The patterns used in this library are directly transferable to a 3D environment like React Three Fiber.

The key architectural concepts are:

*   **Separation of Concerns:** The library uses distinct classes for different types of handles (`VertexMarker`, `MiddleMarker`) and a manager class (`PathEditor`) to orchestrate them.
*   **Marker-Coordinate Binding:** Each handle (marker) maintains a direct reference to the coordinate it controls, and the coordinate data structure often contains a back-reference to its handle. This allows for efficient, two-way updates.
*   **Event-Driven Architecture:** All interactions (drag, click, etc.) are handled through a robust event system. For example, dragging a `VertexMarker` fires an `onDrag` event, which updates the coordinate and triggers a redraw of the main polygon.
*   **Dynamic Handle Generation:** Midpoint handles are dynamically created, destroyed, and repositioned as the main vertices are moved.

### How a Midpoint Becomes a Vertex

The most critical interaction pattern we analyzed is how a `MiddleMarker` (midpoint handle) transforms into a `VertexMarker` (corner handle) upon being dragged. The sequence is as follows:

1.  The user initiates a drag on a `MiddleMarker`.
2.  On `mousedown`, the system immediately inserts a *new vertex* into the polygon's data array at that position.
3.  A new `VertexMarker` is created for this new vertex.
4.  The drag-and-drop control is seamlessly transferred from the temporary `MiddleMarker` to the new, permanent `VertexMarker`.
5.  The original `MiddleMarker` is destroyed.

This provides a smooth and intuitive user experience, making it feel as though the user is pulling a new corner out of an existing edge.

## 4. Proposed Implementation for the Zoning App

Based on this research, we can build a fully featured, Giraffe-style editor within your existing React Three Fiber application. The approach does not require adding major new dependencies.

### Conceptual Code Structure

We recommend creating a hierarchy of React components:

```jsx
<EditablePolygon shape={polygonData}>
  {/* Render the main polygon mesh */}
  <PolygonMesh vertices={polygonData.vertices} />

  {/* Render handles for each vertex */}
  {polygonData.vertices.map((vertex, index) => (
    <VertexHandle key={index} vertex={vertex} onDrag={handleVertexDrag} />
  ))}

  {/* Render handles for each edge midpoint */}
  {polygonData.edges.map((edge, index) => (
    <MidpointHandle key={index} edge={edge} onDragStart={handleMidpointDragStart} />
  ))}

  {/* Render PUSH/PULL handles for each edge */}
  {polygonData.edges.map((edge, index) => (
    <EdgeExtrusionHandle key={index} edge={edge} onDrag={handleEdgeExtrusion} />
  ))}
</EditablePolygon>
```

### Core Logic for Edge Extrusion (Push/Pull)

The "push/pull" functionality is the most complex part. It is not present in `Leaflet.Editable` but can be custom-built. The logic for an `EdgeExtrusionHandle` drag event would be:

1.  **Determine Edge Normal:** Calculate the 2D vector that is perpendicular (normal) to the edge being dragged.
2.  **Project Drag Motion:** Project the user's mouse movement onto the edge normal vector. This ensures the edge only moves perfectly perpendicular to itself, preventing shearing or rotation.
3.  **Update Vertices:** Add the projected movement vector to the positions of the two vertices that define the edge.
4.  **Update State:** Commit the new vertex positions to the Zustand store.
5.  **Re-render:** React Three Fiber will automatically re-render the polygon mesh and all handles based on the updated state.

This creates the desired "push/pull" effect where an entire side of the polygon moves as a single unit.

## 5. Conclusion and Recommendations

Implementing a Giraffe-style geometry manipulation system is a high-impact feature that will dramatically improve the usability and intuitiveness of the zoning comparison application. The research indicates that this is not only feasible but can be built cleanly upon your existing architecture.

**We recommend the following phased implementation:**

1.  **Phase 1 (Core Vertex Editing):** Implement `VertexHandle` components to allow basic dragging of corners.
2.  **Phase 2 (Edge Subdivision):** Implement `MidpointHandle` components to allow users to add new vertices.
3.  **Phase 3 (Push/Pull):** Implement the `EdgeExtrusionHandle` components with the projection and vertex update logic described above.

This approach will deliver value incrementally and allow the development team to build and test the system step-by-step.

---

### References

[1] Giraffe Help Center. "Control Points, Midpoints, Edges and Extruding." [https://help.giraffe.build/en/articles/11815413-control-points-midpoints-edges-and-extruding](https://help.giraffe.build/en/articles/11815413-control-points-midpoints-edges-and-extruding)

[2] Leaflet.Editable GitHub Repository. [https://github.com/Leaflet/Leaflet.Editable](https://github.com/Leaflet/Leaflet.Editable)
