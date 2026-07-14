# Bible Cross-References Visualization

An interactive, high-performance web application visualizing the 63,779 cross-references in the Bible as colored arcs (plus matrix, chord, and map views). Inspired by the original static visualization by Chris Harrison and Christoph Römhild (2007).

## Features

- **Interactive Arc Diagram:** Visualizes 63,779 cross-references as colored arcs bridging chapters of the Bible.
- **Alternate Views:** Matrix heatmap, chord diagram, and a lightweight geo overview.
- **High Performance:** HTML5 Canvas, `OffscreenCanvas`, and Web Workers. Arc data is loaded once into the worker; each frame only sends transform and hover state (not the full arc list). Spatial indexes keep matrix/chord hover responsive.
- **Explorable:** Pan and zoom across the chapters using mouse controls.
- **Dynamic Filtering:** Filter by book, testament (OT, NT, cross-testament), biblical groups, and distance. Sidebar statistics update to match the active filter set.
- **Hover Detection:** Tooltips for chapters and arcs, with spatial indexing for arc hit-testing.
- **Statistics & Analytics:** D3.js sidebar charts (Top 10 books/chapters, AT/NT donut) plus chapter text via [bible-api.com](https://bible-api.com).
- **Multilingual UI:** German, English, Italian, and French UI strings (book-name coverage depends on `books.json` fields).

## Architecture & Tech Stack

- **Frontend Core:** Vanilla JavaScript, HTML5, CSS3. No bundler.
- **Shared helpers:** `js/shared.js` (arc color) is used by the main thread and imported into the worker via `importScripts`.
- **Visualization:** Canvas API + D3.js v7 (zoom/pan and sidebar SVG charts).
- **Supporting modules:** `js/api.js` (chapter text), `js/search.js`, `js/stats.js`, `js/dataLoader.js`.
- **Data Generation:** `generate_data.py` produces `data/books.json` and `data/cross_references.txt`. Legacy helpers (`parse_data.py`, `parse_books.py`, `parse_to_63k.py`) may exist from earlier pipeline steps.

## How to Run Locally

Web Workers and `fetch()` require HTTP (not `file://`).

```bash
npm start
# or: python3 -m http.server 8000
```

Open `http://localhost:8000`.

## Testing

```bash
npm test
# or:
node tests/dataLoader.test.js && node tests/renderer.test.js && node tests/stats.test.js && node tests/search.test.js
```

Visual checks in headless environments use Playwright (`test_hover.js` / ad-hoc screenshots).

## Deployment

GitHub Pages via GitHub Actions on pushes to `main`.

## Data Structure

- `data/books.json`: Metadata for all 66 books (chapters, verses, names).
- `data/cross_references.txt`: Normalized source→target reference pairs.

## Acknowledgements

- Original concept by Chris Harrison & Pastor Christoph Römhild.
- Open-source KJV cross-reference datasets.
