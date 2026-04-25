## 2024-05-15 - Spatial Indexing for 60k+ Canvas Elements
**Learning:** Checking hover states against 63,000+ arc hitboxes in `mousemove` events causes significant main-thread blocking, making the UI feel sluggish. An O(n) scan on every mouse movement is an anti-pattern for large canvas visualisations.
**Action:** Implement a 1D spatial index (X-coordinate binning) to quickly narrow down the candidate arcs before doing the expensive mathematical intersection tests.
