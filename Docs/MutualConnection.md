Here is the complete, updated **Design, Technical, and Handoff Document** (combining the original `MutualConnection.md` with all the breakthroughs we achieved leading up to the new v14.4 Golden Baseline). 

You can save this as `surrounding.io.v14.4_Handoff.md`. It contains the complete architectural rules, the technical walkthroughs of our hardest bug fixes, and a comprehensive changelog.

***

# 📄 PROJECT HAND-OFF DOC: surrounding.io (v14.4 Golden Baseline)
**Slogan:** "Mutual connections discovery by DMs"
**Stack:** HTML5, CSS3 (CSS Variables for Theming), Vanilla JavaScript, D3.js (v7)
**Architecture:** Single-file monolithic build (Client-side rendering)

## 1. Core Concept & Visual Language
`surrounding.io` is a high-density, interactive social cartography tool. It visualizes a user's professional and personal network as a physics-based spatial graph. 
*   **The User ("Me"):** A permanent, fixed White Dot exactly in the center. Nodes are gravitationally pulled to touch this dot, but are mathematically barred from overlapping it.
*   **Nodes (Contacts):** Node size correlates to "Communication Weight" (chat history volume). Heavier nodes sit closer to the user. 
*   **Lines (Links):** Thickness and glow intensity scale with Weight.
*   **Cyberpunk Aesthetics:** Ultra-glassmorphism UI (`~0.15-0.25` opacity). Mutual network connections feature an intense, glowing "Cyberpunk" aesthetic (`shadowBlur: 25`), deliberately preserved across both Dark and Light themes.

## 2. Strict Business Logic (The Non-Negotiables)
*   **Connected Components (Groups):** Any colored group MUST be a mathematically connected component. All nodes within a specific colored circle must share at least one *mutual* path to another node in that exact same circle. 
*   **The "Singles" Group (Red):** Nodes with **ZERO** mutual connections are strictly categorized as "Singles" (`#f43f5e`). 
*   **The Merge Event (Bridge):** When a node from Group 3 connects to Group 2, they merge.
    *   *Data Layer:* The structural data merge (re-assigning group IDs) happens **instantly** to protect UI closures and click-events. 
    *   *Visual Layer:* The nodes visually tween their colors over 2.5 seconds (e.g., Yellow + Green = Blue) while they drift together.

## 3. Physics & Spatial Geometry
The D3 `forceSimulation` behaves as a strict atmospheric sandbox:
*   **Hemispheric Partitioning:** Standard social groups act like helium balloons, pushed to the upper half of the screen using calculated radial angles.
*   **Singles Geometry (The Glass Ceiling):** The Red "Singles" group is locked to **True South** (6 o'clock). They have extremely short link distances, and feature a strict `Y-Axis Clamp` in the physics tick preventing them from ever floating North of the center dot.
*   **The User Forcefield:** Global `forceCollide` limits are kept small so nodes pack tightly and visually *touch* the center, but a strict distance-check in the `tick` loop mathematically pushes them out if they cross the 1-pixel boundary of the White Dot.
*   **Density Scaling (68 vs 168):** When exceeding 100 nodes, the physics engine dynamically increases friction (`velocityDecay: 0.35`) and halves electrical repulsion (`forceManyBody`) so the massive node web settles gracefully instead of violently vibrating.

## 4. Interaction States (X-Ray & Selection)
*   **X-Ray / Path Tracing / Legend Selection:** Highlights selected nodes/groups and dims the rest.
*   **Strict Dimming Opacities:** 
    *   When unselected, standard avatar groups gracefully dim to exactly **50%** (`0.5`) of their calculated base alpha.
    *   Singles (Red nodes/lines) dim heavily to exactly **25%** (`0.25`). 
*   **Light Theme Tracing:** Selected direct-paths in Light Theme render as clean, vector Dark Grey (`#444`) without muddy shadows, while the mutual webs retain their bright neon shadows.

## 5. UI/UX Architecture
*   **Water-Dot Collapsible Cards:** UI panels shrink into a `44px` circular "dot". The ⦿ click-trigger remains perfectly absolute (anchored properly via flex/right-pins) so the user can rapid-fire click without the button shifting under their mouse.
*   **Legend Blade:** Clickable colored squares that expand to show a scrollable member directory. Handled dynamically so structural merges don't break the click closures.
*   **Reactive Chat Engine:** Features a context-aware AI. Typing in the UI appends a message, waits for a simulated typing delay (`800-2000ms`), and returns a procedurally hashed narrative response based on the node's sector (Work, Family, Church, etc.).

---

## 6. Technical Walkthroughs (The Hard Fixes)
*DO NOT REGRESS THESE BEHAVIORS IN FUTURE BUILDS.*

**A. The Elastic Drag & Left-Tilt Bug**
*   *Cause:* Setting `fx = null` on `drag.end` caused the Northern group gravities to rip the User node off-center, stretching the red lines.
*   *Fix:* Unanchoring triggers a `d3.transition().tween` that elastically animates `fx/fy` exactly back to `innerWidth / 2` and `innerHeight / 2.3`.

**B. The Light Mode FPS Speed-Up**
*   *Cause:* Dark mode used heavy Canvas `shadowBlur` (dropping FPS to 30), while Light mode turned shadows off (running at 60 FPS). Because D3's physics calculates per drawn frame, Light mode physically simulated twice as fast.
*   *Fix:* Normalized rendering overhead by ensuring `shadowBlur` is processed symmetrically across both themes, perfectly equalizing frame rates and visual physics speed.

**C. The Legend Merge-Closure Staleness**
*   *Cause:* Clicking a Legend group after a merge triggered old memory arrays because the `click` closure held the pre-merge node list, causing crashes.
*   *Fix:* Merges now execute structural data mutations instantly on tick 0. The Legend click event was rewritten to strictly re-filter `App.Config.nodes` dynamically *inside* the click execution, bypassing closure staleness entirely.

**D. The Density Toggle Memory Leak**
*   *Cause:* Redrawing 168 nodes over 68 nodes caused invisible duplicate simulations overlapping in memory, destroying performance.
*   *Fix:* Density switching completely halts the engine (`App.Engine.stop()`), clears memory timers, wipes the canvas `clearRect`, and re-initializes `App.init()` from scratch.

---

## 7. Official Changelog (v12.1 ➔ v14.4 Golden Baseline)

### ✨ Enhancements & Feature Upgrades
*   **Cyberpunk Neon Rendering:** Upgraded Canvas path rendering to support intense `shadowBlur: 25` on mutual connections, bringing vibrant neon webbing to both Dark and Light themes.
*   **Density Settling Algorithm:** Added the `isDense` dynamic flag. When switching to 168 nodes, friction is raised and repulsion is dropped to force large webs to settle gracefully instead of indefinitely vibrating.
*   **AI Chat Engine:** Overhauled history generation to use modulus hashing (`(node.id * 7) % length`) preventing repetitive message looping. Added realistic typing delays and context-aware responses based on user groups.
*   **Refined Opacity Matrix:** Rebuilt the dimming engine. Singles now hold at a strict 25% opacity during X-Ray/Selections, while standard groups dim to 50%.
*   **Seamless Group Handover:** If the user is actively viewing a group's directory (Group 3) when a system merge event happens, the UI seamlessly hot-swaps them to view the new merged entity (Group 2) without interrupting their session.

### 🐛 Critical Bug Fixes
*   **User Forcefield (Anti-Overlap):** Fixed a bug where increasing global collision radius broke the visual "magnetic touch" of the center dot. Built a custom `tick` distance-check that allows nodes to pull completely flush to the center dot, but mathematically bounces them out if they cross the 1-pixel threshold.
*   **Singles Geometry Clamp (Glass Ceiling):** Prevented the Red Singles group from creeping upward by injecting a hard Y-coordinate clamp. They are now strictly confined beneath the center dot's equator.
*   **Legend Staleness:** Fixed a major logic regression where clicking legend cards post-merge broke due to stale arrays in memory.
*   **Event Strip Anchoring:** Fixed absolute CSS pinning on the bottom-center Event Strip so collapsing it to a `44px` dot no longer shifts the ⦿ trigger location.
*   **FPS Physics Normalization:** Solved the "Light mode moves faster" bug by equalizing Canvas GPU overhead across all CSS themes.
*   **Light Theme Legibility:** Fixed muddy grey shadows appearing on selected direct paths during Light Mode; they now render as sharp, solid `#444` vectors.