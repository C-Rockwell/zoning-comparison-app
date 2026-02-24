# Architectural Roof Design: A Comprehensive Guide for LLM Training in SketchUp

**Author:** Manus AI
**Date:** February 20, 2026
**Purpose:** Training reference for LLM-driven 3D building design in SketchUp

---

## Introduction

This guide provides a comprehensive overview of architectural roof design principles, intended to serve as a foundational resource for training a large language model (LLM) in the automated design of 3D buildings within SketchUp. The design of a roof is a critical architectural element that defines a building's character, influences its performance, and presents unique geometric challenges in 3D modeling. A frequent struggle for automated systems is the correct interpretation of a building's footprint to generate a coherent and structurally sound roof.

This document distills the essential rules, heuristics, and visual language of roof design to address this challenge directly. It is organized around the three most common failure modes observed in LLM-generated roofs: incorrect ridge orientation, wrong placement of hips and valleys, and inappropriate pitch selection. A decision tree, a glossary, and a SketchUp-specific cheat sheet are also included to serve as quick-reference tools during inference.

---

## Part I: Anatomy of a Roof

Before applying any design rules, it is essential to have a precise vocabulary for the components of a roof. Misidentifying these elements is a primary source of modeling errors.

![A labeled 3D diagram showing the primary components of a complex roof including ridges, hips, valleys, gables, eaves, rakes, dormers, and soffits.](images/roof_anatomy.jpeg)
*Figure 1: The anatomical components of a residential roof. Every element has a specific geometric role that must be correctly modeled. [1]*

The following table defines each component and its geometric significance.

| Component | Definition | Geometric Role in SketchUp |
| :--- | :--- | :--- |
| **Ridge** | The horizontal peak at the very top of the roof, where two opposing slopes meet. | A horizontal edge at the highest elevation of the roof model. |
| **Hip** | A sloping external corner where two adjacent roof planes meet. | A diagonal edge running from an external building corner up to the ridge. |
| **Valley** | A sloping internal corner where two adjacent roof planes meet, forming a trough. | A diagonal edge running from an internal (re-entrant) building corner up to a ridge. |
| **Gable** | The triangular portion of an end wall between the edges of a sloping roof. | A vertical triangular face at the end of a gable roof, not a roof plane. |
| **Eave** | The lower edge of the roof that overhangs the wall. | The lowest horizontal edge of a roof plane, typically projecting beyond the wall face. |
| **Rake** | The sloping edge of a gable roof that runs along the inclined sides of the gable. | The diagonal edge of a roof plane at a gable end. |
| **Soffit** | The underside of the eave overhang. | A horizontal face connecting the bottom of the wall to the underside of the eave. |
| **Dormer** | A structural element that projects from the roof plane, typically containing a window. | A small secondary roof form that intersects the main roof plane, creating its own ridges and valleys. |
| **Fascia** | The vertical board that caps the ends of the rafter tails at the eave. | A vertical face along the eave edge. |

---

## Part II: The Three Core Geometric Rules

The following three rules are the foundation of all roof geometry for equal-pitch roofs (where all slopes have the same angle). An LLM must apply these rules in sequence to generate a correct roof from any building footprint.

### Rule 1: Ridge Orientation — The Ridge Follows the Long Axis

The single most important rule in roof design is the orientation of the ridge. It is not a matter of preference; it is a geometric necessity.

> **Rule 1:** The main roof ridge always runs **parallel to the longest dimension** of the building footprint. For a hip roof, the ridge length equals the building length minus the building width (L − W). For a gable roof, the ridge spans the full length of the building.

For a simple rectangular building, this means the ridge is centered over the shorter dimension (the width) and runs along the length. The ridge is always equidistant from both long walls, positioned at exactly half the building's width. [2]

**The Square Building Exception:** When a building's footprint is a perfect square (L = W), the formula `Ridge = L − W` yields zero. This is correct: a square building with a hip roof produces a **pyramid roof** — four triangular planes meeting at a single apex point, with no ridge at all.

![Plan view diagrams comparing a hip roof and a gable roof on a rectangular footprint, showing ridge orientation, length formula, and hip rafter placement.](images/diagram_01_ridge_orientation.png)
*Figure 2: Rule 1 illustrated. Left: A hip roof in plan view, showing the ridge centered over the width and the formula Ridge = L − W. Right: A gable roof in plan view, showing the ridge spanning the full length with gable ends at both short sides. [3]*

---

### Rule 2: The 45-Degree Rule — Hips and Valleys from Corners

Once the ridge orientation is established, the placement of all hip and valley rafters follows a single, powerful geometric principle. This rule is the key to correctly modeling any equal-pitch roof, regardless of the complexity of the footprint.

> **Rule 2:** In plan view, **hip rafters** project inward at **45 degrees** from every **external** (convex) corner of the building footprint. **Valley rafters** project inward at **45 degrees** from every **internal** (concave, or re-entrant) corner. The ridge forms where opposing hip lines meet, always running at 90 degrees to the hip lines.

This rule provides a fully deterministic algorithm: given any building footprint, draw 45-degree lines from every corner, and the entire roof geometry — all ridges, hips, and valleys — is defined.

![Three-panel diagram: Panel A shows a simple rectangle with 45-degree hip lines from all four corners meeting at a central ridge. Panel B shows an L-shaped footprint with hip lines from external corners and a valley line from the internal corner. Panel C is a legend summarizing the rule.](images/diagram_02_45_degree_rule.png)
*Figure 3: Rule 2 illustrated. The 45-degree rule applied to a simple rectangle (Panel A) and an L-shaped footprint (Panel B). Note how the internal corner in Panel B generates a valley rather than a hip. [4]*

**Critical Caveat:** This rule applies **only when all intersecting roof sections have the same pitch**. If two wings of a building have different pitches, the valley angle will deviate from 45 degrees, and the geometry becomes significantly more complex. For LLM training purposes, enforcing a consistent pitch across all roof sections is the recommended simplifying assumption.

---

### Rule 3: The Rectangle Decomposition Method — Complex Footprints

Most real-world buildings are not simple rectangles. L-shapes, T-shapes, and U-shapes are common. The correct approach to roofing these forms is to decompose them into simpler components.

> **Rule 3:** Decompose any complex footprint into a set of overlapping rectangles. Roof each rectangle individually using Rules 1 and 2. Where the roof planes of adjacent rectangles intersect, a **valley** is formed, running from the re-entrant corner at 45 degrees up to the main ridge. The ridge of the subordinate (narrower) wing will terminate where it intersects the roof plane of the dominant (wider) wing.

![Three-step diagram showing an L-shaped footprint being decomposed into two rectangles, then having the 45-degree rule applied to produce ridges, hips, and a valley.](images/diagram_05_complex_footprint.png)
*Figure 4: Rule 3 illustrated. A three-step process for roofing an L-shaped building: identify the footprint, decompose into rectangles, then apply the 45-degree rule to each section. [5]*

**Ridge Height Discrepancy:** When two wings of different widths intersect, their ridges will be at different heights (assuming the same pitch). The narrower wing's ridge will always be lower. The valley rafter is the geometric element that resolves this height difference, running diagonally from the eave intersection point up to where it meets the main roof plane.

---

## Part III: Roof Pitch

Roof pitch is the measure of a roof's steepness, expressed as the ratio of vertical rise to horizontal run, where the run is standardized at 12 inches. A pitch of 6:12 means the roof rises 6 inches for every 12 inches of horizontal distance.

### Calculating Ridge Height from Pitch

The pitch is always determined by the **half-width** of the building (the run), not the full length. This is a common source of confusion.

> **Formula:** `Ridge Height = (Building Width / 2) × (Rise / 12)`
>
> **Example:** A building 30 ft wide with a 6:12 pitch → Ridge Height = 15 × (6/12) = **7.5 ft** above the wall plate.

![Cross-section diagram of a building showing the relationship between building width, run (half-width), pitch, and ridge height, with the formula annotated.](images/diagram_06_ridge_height.png)
*Figure 5: The ridge height calculation. The run is always half the building width, and the ridge height is derived from the run multiplied by the pitch ratio. [6]*

### Pitch Categories and Their Applications

![A diagram showing five roof pitch categories from flat to very steep, with triangular profiles drawn to scale and labeled with pitch notation, degree equivalents, and material notes.](images/diagram_03_pitch_categories.png)
*Figure 6: The five categories of roof pitch, drawn to scale. The conventional slope range (4:12 – 9:12) is the most common in residential construction. [7]*

The following table provides a detailed breakdown of pitch categories and their practical implications.

| Category | Pitch Range | Degrees | Roofing Materials | Typical Use Cases |
| :--- | :--- | :--- | :--- | :--- |
| **Flat** | 0:12 – 2:12 | 0° – 9.5° | Membrane (TPO, EPDM, BUR) only. Minimum 1/4" per foot slope required for drainage. | Modern/contemporary architecture, commercial buildings, arid climates. |
| **Low Slope** | 2:12 – 4:12 | 9.5° – 18.4° | Roll roofing, modified bitumen. Standard asphalt shingles not recommended. | Mid-century modern, some Ranch styles. |
| **Conventional** | 4:12 – 9:12 | 18.4° – 36.9° | All standard materials: asphalt shingles, metal, wood shake, tile. | The default for most residential construction in North America. |
| **Steep** | 9:12 – 12:12 | 36.9° – 45° | All materials; excellent performance. Not walkable without staging. | Tudor, Victorian, Cape Cod, high-snowfall regions. |
| **Very Steep** | 12:12+ | 45°+ | Slate, metal, specialty materials. Requires specialized installation. | A-Frame, traditional New England, Alpine styles. |

### Rules for Selecting Pitch

Pitch selection is governed by four primary factors, which should be evaluated in this order of priority:

1. **Climate:** Heavy snow regions require 6:12 or steeper to shed load. Arid regions can use flat or low-slope roofs. Hurricane zones prefer 4:12 to 6:12 (steeper roofs create more wind uplift).
2. **Roofing Material:** The material chosen has a minimum required slope. Using a material below its minimum slope will result in leaks and void warranties. The standard minimum for asphalt shingles is 4:12.
3. **Architectural Style:** The style of the building strongly implies a pitch range (see Part IV).
4. **Cost:** Steeper roofs require more material, more complex framing, and more labor. They are substantially more expensive than low-slope alternatives.

---

## Part IV: Gable vs. Hip — The Primary Design Decision

The choice between a gable end and a hip end is the most visible stylistic decision in roof design. It is driven by a combination of climate, cost, and architectural convention.

![Side-by-side 3D perspective diagrams comparing a gable roof and a hip roof, with labeled components and a pros/cons list for each.](images/diagram_04_gable_vs_hip.png)
*Figure 7: A direct comparison of the gable roof and the hip roof, showing their key structural differences and respective advantages and disadvantages. [8]*

### Comparison Table: Gable vs. Hip

| Feature | Gable Roof | Hip Roof |
| :--- | :--- | :--- |
| **End Wall** | Vertical triangular gable wall | No vertical end; all sides slope |
| **Wind Resistance** | Poor to Fair (gable end is vulnerable) | Excellent (aerodynamic on all sides) |
| **Construction Cost** | Lower | Higher (more complex framing) |
| **Attic Space** | More usable space | Less, more cramped |
| **Ventilation** | Excellent (gable vents easy to install) | Good to Fair (requires soffit/ridge vents) |
| **Eave Overhang** | On long sides only | On all four sides |
| **Water Shedding** | Good | Excellent |
| **Typical Styles** | Colonial, Tudor, Craftsman, Farmhouse | Mediterranean, Ranch, Modern |

### Hybrid Forms

Several hybrid forms combine the advantages of both types and are commonly encountered in residential design.

- **Dutch Gable (Hip-Gable):** A hip roof with a small gable (gablet) at the top of each hip. This provides the wind resistance of a hip roof while allowing for a vent or window in the gablet. It is a common feature in Craftsman and Colonial Revival architecture.
- **Jerkinhead (Clipped Gable):** A gable roof with the top peak "clipped" into a small hip. This is primarily an aesthetic choice that softens the gable's appearance and provides minor wind resistance improvement.
- **Cross-Gabled / Cross-Hipped:** When a building has an L- or T-shaped footprint, the roof is formed by two intersecting roof sections. A cross-gabled roof uses two perpendicular gable roofs; a cross-hipped roof uses two intersecting hip roofs.

![A comprehensive visual glossary of 20 common roof types, including Open Gable, Box Gable, Hip, Jerkinhead, Dutch Gable, Cross Hipped, Gambrel, Mansard, Saltbox, Flat, and others.](images/roof_types_comprehensive.jpg)
*Figure 8: A visual glossary of 20 common residential roof forms. [9]*

---

## Part V: Architectural Style and Roof Selection

The type and pitch of a roof are defining characteristics of an architectural style. Adhering to these conventions is essential for generating a building that is aesthetically coherent. The following table provides a heuristic mapping of common American architectural styles to their characteristic roof types and pitches. [10]

| Architectural Style | Dominant Roof Type(s) | Typical Pitch | Key Roof Features |
| :--- | :--- | :--- | :--- |
| **Colonial** | Gable | 8:12 – 12:12 | Symmetrical, simple gable; may have dormers. |
| **Cape Cod** | Steep Gable with Dormers | 10:12 – 12:12 | 1.5-story profile; dormers essential for upper floor light. |
| **Craftsman / Bungalow** | Low-Pitch Gable or Hip | 4:12 – 6:12 | Wide eaves with exposed rafter tails; front porch with a separate low-pitch roof. |
| **Tudor** | Steeply Pitched Multi-Gable | 10:12 – 14:12 | Multiple cross-gables; decorative half-timbering; prominent chimneys. |
| **Ranch** | Low-Pitch Gable or Hip | 3:12 – 5:12 | Single story; long, low profile; often L- or U-shaped footprint. |
| **Mediterranean / Spanish** | Low-Pitch Hip | 4:12 – 6:12 | Red clay tile; stucco walls; consistent eave on all sides. |
| **Modern / Contemporary** | Flat or Shed (Monopitch) | 0:12 – 2:12 | Clean geometric lines; parapets common on flat roofs. |
| **Victorian** | Complex Multi-Gable, Turrets | 8:12 – 12:12 | Asymmetrical; multiple intersecting gables; decorative trim. |
| **Farmhouse** | Gable, often with Dormers | 6:12 – 9:12 | Simple, functional; wrap-around porch with a separate shed or hip roof. |
| **A-Frame** | Very Steep Gable (roof = walls) | 16:12+ | The roof planes extend to the ground; no separate wall on the gable ends. |
| **Gambrel / Dutch Colonial** | Gambrel | Lower: 9:12+, Upper: 3:12–4:12 | Two-slope profile on each side; maximizes attic/loft space. |
| **Mansard / French** | Mansard | Lower: Very Steep, Upper: Nearly Flat | Provides a full extra story of living space within the roof volume. |
| **Saltbox** | Asymmetrical Gable | Front: 6:12–8:12, Rear: 3:12–4:12 | One slope is longer and shallower than the other; colonial origin. |

---

## Part VI: The Roof Type Decision Tree

The following decision tree provides a heuristic guide for selecting the appropriate roof type given a set of design inputs. It is intended to be used as a quick-reference algorithm during inference.

![A flowchart decision tree starting from "Building Footprint Identified" and branching through questions about climate, wind, architectural style, and footprint complexity to arrive at the correct roof type.](images/diagram_07_decision_tree.png)
*Figure 9: The Roof Type Decision Tree. This flowchart provides a step-by-step heuristic for selecting the correct roof type based on climate, style, and footprint. [11]*

---

## Part VII: SketchUp-Specific Cheat Sheet

The following rules are specifically tailored to the challenges of modeling roofs in SketchUp and address the most common errors made by automated systems.

### Critical Formulas

| Calculation | Formula | Example (30 ft wide, 6:12 pitch) |
| :--- | :--- | :--- |
| **Run (Half-Width)** | `Run = Building Width / 2` | `Run = 30 / 2 = 15 ft` |
| **Ridge Height** | `Height = Run × (Rise / 12)` | `Height = 15 × (6/12) = 7.5 ft` |
| **Hip Ridge Length** | `Ridge = Building Length − Building Width` | `Ridge = 50 − 30 = 20 ft` |
| **Gable Ridge Length** | `Ridge = Building Length` | `Ridge = 50 ft` |
| **Square Building** | `Ridge = L − W = 0` → **Pyramid Roof** | No ridge; single apex point. |

### The Hip Rafter in 3D

A hip rafter runs at 45 degrees in plan view, but its actual 3D angle (the dihedral angle) is different from the main slope. This is why the hip rafter appears to have a different angle in elevation than the main roof planes. In SketchUp, this is handled automatically when the geometry is constructed correctly from the plan view using the 45-degree rule.

### Step-by-Step Workflow for SketchUp

1. **Draw the building footprint** as a flat face at the wall plate height.
2. **Identify all corners:** Mark external corners (hips) and internal corners (valleys).
3. **Draw 45-degree lines** from every corner inward in plan view. These define the hip and valley rafter lines.
4. **Find ridge endpoints:** The point where two opposing 45-degree hip lines meet is the end of the ridge. Connect these points to form the ridge line.
5. **Push/Pull or use the Roof plugin** to extrude the roof planes up to the ridge height (calculated using the formula above).
6. **For complex footprints:** Decompose into rectangles first, complete each section's ridge and hips, then use "Intersect Faces" to trim the intersecting planes and form the valleys.
7. **Add overhangs:** Offset the eave edges outward by the desired overhang depth (typically 12–24 inches for residential).

### Common Errors and Corrections

| Error | Cause | Correction |
| :--- | :--- | :--- |
| Ridge runs along the **short** axis | Confusion about which dimension is "longest" | Always orient the ridge parallel to the **longest** wall. |
| Ridge is **too long** or **too short** | Using building length instead of `L − W` | Hip ridge = `Length − Width`. Gable ridge = `Length`. |
| Hips at **wrong angle** | Not using 45-degree rule | Draw hip lines at exactly 45° from each external corner in plan view. |
| **Valley missing** on L-shaped building | Treating the whole footprint as one rectangle | Identify the re-entrant corner; draw a 45° valley line inward from it. |
| **Inconsistent pitch** on intersecting wings | Applying different pitches to different sections | All intersecting roof sections must share the same pitch for the 45° rule to hold. |
| **Ridge height wrong** | Using full width instead of half-width for run | Run = Width / 2. Height = Run × (Rise / 12). |
| **Pyramid on rectangular building** | Setting ridge length to zero on a non-square building | Pyramid only occurs when L = W. For rectangles, ridge = L − W. |

---

## Part VIII: Reference Images

The following reference images provide additional visual context for the roof types and principles described in this guide.

![A chart showing roof pitch angles from 0/12 to 15/12, with each pitch drawn to scale and its degree equivalent labeled.](images/roof_pitch_chart.jpg)
*Figure 10: A comprehensive roof pitch chart showing all common pitch ratios from 0:12 to 15:12 and their degree equivalents. [12]*

![A plan view diagram of a hip roof on an L-shaped footprint, with ridge, hips, valleys, eaves, and a dormer all labeled.](images/hip_roof_plan_view.png)
*Figure 11: A plan view of a complex hip roof showing the labeled positions of ridges, hips, valleys, eaves, and a dormer. [13]*

![A plan view diagram of a T-shaped building footprint showing the 45-90 rule applied, with all hips, valleys, and ridges labeled.](images/roof_plan_45_rule.png)
*Figure 12: The 45-90 Rule applied to a T-shaped building footprint, showing how all roof geometry is derived from 45-degree corner lines. [14]*

---

## Conclusion

This guide has established a clear, rule-based framework for architectural roof design that is directly applicable to LLM-driven 3D modeling in SketchUp. The three core geometric rules — ridge orientation, the 45-degree rule for hips and valleys, and the rectangle decomposition method for complex footprints — provide a deterministic algorithm for generating correct roof geometry from any building footprint. These geometric rules, combined with the heuristic tables for pitch selection and architectural style matching, equip a model with the knowledge to produce roofs that are not only geometrically correct but also contextually and stylistically appropriate.

The most important principle to internalize is this: **a roof is a direct geometric consequence of its footprint and pitch**. Given these two inputs and the rules above, every ridge, hip, and valley can be derived algorithmically. There is no guesswork involved in a correctly designed roof.

---

## References

[1] American Eagle Roofing. (n.d.). *Understanding the Anatomy of a Roof*. Retrieved from https://www.aeroof.com

[2] Dunn Lumber. (2023, January 30). *Framing a Hip Roof: How To Calculate the Ridge Length on a Hip Roof*. Retrieved from https://www.dunnlumber.com/blog/post/framing-a-hip-roof-how-to-calculate-the-ridge-length-on-a-hip-roof

[3] Manus AI. (2026). *Diagram 1: Ridge Orientation Rule*. Original diagram generated for this guide.

[4] Manus AI. (2026). *Diagram 2: The 45-Degree Rule*. Original diagram generated for this guide.

[5] Manus AI. (2026). *Diagram 5: Complex Footprint Decomposition*. Original diagram generated for this guide.

[6] Manus AI. (2026). *Diagram 6: Ridge Height Calculation*. Original diagram generated for this guide.

[7] Manus AI. (2026). *Diagram 3: Roof Pitch Categories*. Original diagram generated for this guide.

[8] Manus AI. (2026). *Diagram 4: Gable vs. Hip Roof Comparison*. Original diagram generated for this guide.

[9] Homedit. (n.d.). *15 Common Roof Types and Styles for Your Home*. Retrieved from https://www.homedit.com/roof-types/

[10] IKO. (n.d.). *Roof Types, Shapes and Styles of Residential Roofs*. Retrieved from https://www.iko.com/blog/roof-types-shapes-and-styles-of-residential-roofs/

[11] Manus AI. (2026). *Diagram 7: Roof Type Decision Tree*. Original diagram generated for this guide.

[12] Pally Roofing. (n.d.). *Roof Pitch Diagram Chart*. Retrieved from https://www.pallyroofing.com

[13] Roofs Tampa. (n.d.). *Hip Roof Plan View Diagram*. Retrieved from https://roofstampa.com

[14] Quif Studio. (n.d.). *Episode 5: Creating Roof Plans — The 45-90 Rule*. Retrieved from https://www.quifstudio.com

[15] Third-i Studio. (n.d.). *How to draw a hip roof plan: instruction tutorial from basic to complex step by step*. Retrieved from http://www.thirdistudio.com.au/Roof-How_to_draw_a_hip_roof.html

[16] Fine Homebuilding. (2012, March 20). *Model and Measure Part Two: Hip Roof Framing Demystified by Modeling in SketchUp*. Retrieved from https://www.finehomebuilding.com/project-guides/framing/model-measure-hip-roof-framing-de-mystified-by-modeling-in-sketchup

[17] GreenBuildingAdvisor. (2011, December 9). *Martin's Ten Rules of Roof Design*. Retrieved from https://www.greenbuildingadvisor.com/article/martins-ten-rules-of-roof-design
