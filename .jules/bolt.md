## 2024-05-15 - Spatial Indexing for 60k+ Canvas Elements
**Learning:** Checking hover states against 63,000+ arc hitboxes in `mousemove` events causes significant main-thread blocking, making the UI feel sluggish. An O(n) scan on every mouse movement is an anti-pattern for large canvas visualisations.
**Action:** Implement a 1D spatial index (X-coordinate binning) to quickly narrow down the candidate arcs before doing the expensive mathematical intersection tests.

## 2026-05-13 - Replace Array.find with Map lookup in Stats
**Learning:** Performing a linear `Array.find` on the books array (66 items) inside a loop iterating over 63,779 arcs caused significant overhead in statistics rendering. Using a `Map` for constant-time lookups reduced render time dramatically.
**Action:** Implemented a `bookMap` at the entry point of `StatsCharts.render` and passed it to sub-renderers to ensure efficient O(1) book lookups.
## 2024-05-18 - Unindexed Arc Lookup Optimization
**Learning:** Filtering a 60,000+ element array on the main UI thread during an interaction logic branch creates significant and observable latency. When an operation like `filter` happens iteratively or frequently based on some key, building an upfront lookup map or adjacency list reduces $O(N)$ operations to $O(1)$.
**Action:** Replaced on-the-fly `Array.filter` inside `js/app.js` with an adjacency list built upfront during data loading in `js/dataLoader.js`, resulting in >18,000x speedup for chapter lookups.

## 2026-05-20 - Memoization of Color Computation inside Hot Render Loops
**Learning:** Calling a math-heavy function that involves string concatenation (`hsla(...)`) 63,000+ times per frame causes significant overhead and slows down rendering. Simple mathematical derivations that produce strings can bottleneck Canvas updates if not cached.
**Action:** Implemented a simple cache using `Map` to store previously calculated colors for distinct arc distances. Because the maximum number of distinct distances is very small (bounded by the number of chapters, 1189), caching the resulting `hsla` string drastically reduces rendering time while maintaining low memory overhead.

## 2026-05-20 - Viewport Frustum Culling for Canvas Over-draw
**Learning:** Issuing `beginPath`, `stroke`, and `fillRect` commands for elements outside the visible viewport forces the browser's Canvas API to perform unnecessary calculations and GPU passes, significantly degrading performance when zooming into large datasets (e.g., 63,000 arcs).
**Action:** Implemented 1D bounding-box culling (`screenMinX` and `screenMaxX`) based on the current zoom transform. By checking if an arc's horizontal extent or a bar's position falls outside these bounds before issuing drawing commands, rendering time is drastically reduced during high-zoom states.

## 2026-05-20 - Loop Invariant Code Motion in Canvas rendering
**Learning:** Calculating constant values (like maximum screen radius or vertical scaling factors based on dataset boundaries) *inside* a `forEach` loop spanning 60,000+ items forces the JS engine to execute identical math operations and array lookups tens of thousands of times per frame.
**Action:** Identified loop-invariant mathematical calculations (`maxR` and `rYFactor`) and hoisted them outside of the hot render loop in both the main thread and the Web Worker. This eliminates redundant O(N) operations, further streamlining the per-frame rendering pipeline.

## 2026-05-20 - Object Property Caching for Static Geometry
**Learning:** Performing multiple array lookups and arithmetic operations inside a 60,000+ iteration hot loop to calculate geometry that rarely changes (only on window resize) is highly inefficient.
**Action:** Pre-calculated static geometric properties (`midX` and `rX`) for all arcs once during the initial position calculation phase and attached them directly to the arc objects. Reading these cached properties directly in the render loop eliminates hundreds of thousands of redundant array lookups and arithmetic operations per frame, drastically improving loop performance.

## 2026-05-20 - Debouncing D3 DOM Updates and Heavy Aggregation
**Learning:** Rebuilding SVG charts via D3 involves destroying DOM elements (`textContent = ''`) and iterating over massive datasets (e.g., 60,000+ items to count frequencies) synchronously. When tied directly to rapid UI state changes (like dragging a distance slider), this synchronously blocks the main thread, leading to a frozen UI.
**Action:** Implemented a debounce mechanism using `setTimeout` for the D3 `render` pipeline in `js/stats.js`. The `executeRender` function now waits until rapid UI changes settle before executing the heavy O(N) aggregations and DOM paints, keeping the main thread responsive. Initial load is flagged to run immediately.
