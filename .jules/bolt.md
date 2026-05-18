## 2024-05-15 - Spatial Indexing for 60k+ Canvas Elements
**Learning:** Checking hover states against 63,000+ arc hitboxes in `mousemove` events causes significant main-thread blocking, making the UI feel sluggish. An O(n) scan on every mouse movement is an anti-pattern for large canvas visualisations.
**Action:** Implement a 1D spatial index (X-coordinate binning) to quickly narrow down the candidate arcs before doing the expensive mathematical intersection tests.

## 2026-05-13 - Replace Array.find with Map lookup in Stats
**Learning:** Performing a linear `Array.find` on the books array (66 items) inside a loop iterating over 63,779 arcs caused significant overhead in statistics rendering. Using a `Map` for constant-time lookups reduced render time dramatically.
**Action:** Implemented a `bookMap` at the entry point of `StatsCharts.render` and passed it to sub-renderers to ensure efficient O(1) book lookups.
