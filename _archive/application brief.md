# Vector-based 3D Modeler & Diagram Exporter Application Brief

## Primary use case
Users will use the tool to illustrate various graphic comparisons between “lots” or parcels of various land uses pertaining to a city’s existing code, then compare the configuration to a new set of dimensional rules as proposed in an update of the city’s zoning code (side-by-side comparison of old vs. new).

## Platform
- Standalone application **or** HTML with variables stored in a Google Sheet or other database

## Core functionality

### Vector-based modeling
- Vector-based modeling of simple “configurable”, “layer-based” geometries (lines, planes, and solids) based on a Cartesian Coordinate System (X, Y, Z axis)

### Configurable options
“Configurable” meaning the user will have the options to select:

- **Lines**
  - Line types (dashed, solid, etc.)
  - Line widths
  - Line colors
  - Transparency % of lines
  - Line heights (vertical relationship to a Cartesian plane)

- **Planes**
  - Plane placement and dimensions
  - Plane colors, line thickness, transparency, etc.

- **Solids**
  - Solid dimensions and placement with editable line types, widths, colors, transparency, etc.
  - Solid (fill or the planes that make up the solid) with editable color, patterns, and transparency

### Layer-based organization
“Layer-based” meaning each parameter or groups of parameters are assigned to a “layer” that the user can turn on or off for the purposes of viewing the outcome and exporting.

Examples:
- Right-of-way
- Lot lines (aka parcel boundaries)
- Setback lines
- Primary building
- Accessory building

### Annotation
- Annotation capabilities such as dimensions, leader lines, and other text (all configurable)

### Real-time viewer
- Real-time “viewer” in which the user can see the model being built with associated parameters

### Export capabilities
- Ability to export the configured 3D model to various outputs such as `.dwg`, `.dxf`, `.obj`, `.skp`, etc.
- Ability to export raster or vector “views” of the model with configurable viewpoints such as:
  - front
  - side
  - top
  - axonometric
  - isometric
  - perspective  
  ...and at various resolutions

## UI/UX
- Invisible table-like parameters (one on each row) with 2 columns (existing and proposed)
- User inputs values according to the individual parameters for each column, but some parameter rows may default to “not applicable”
- Parameter rules tied to Google Sheet database
- “Style” adjustments per most parameters (line color, width, transparency, etc.) perhaps appear in a separate pop-up interface (or other) at the click of a button
- A dynamic visual or “View” window above the parameters illustrates the various parameters as the user inputs them and is updated in real time
- “Save” function
- “Export” function
- “View” controls
- Annotation controls

## Basic Methodology Principles
- **Z-Up Coordinate System**: The application uses a standard architectural coordinate system:
  - **X Axis**: East/West
  - **Y Axis**: North/South
  - **Z Axis**: Height (Elevation)
- **Origin**: `0,0,0` is the center of the lot.
- **Orientation**: North is the +Y Axis (Top of screen in "Top View").
- **Dual-Camera Navigation**:
  - **Perspective**: For realistic "fly-through" views.
  - **Orthographic**: For technical "Parallel Projection" (Isometric, Elevations).
