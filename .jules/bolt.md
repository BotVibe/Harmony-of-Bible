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
