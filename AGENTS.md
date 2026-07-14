# Agent Instructions

Welcome, agent! This file contains instructions for working with this repository.

## Project Overview
This repository contains an interactive visualization of 63,779 Bible cross-references. It relies heavily on HTML5 Canvas and Web Workers for performance. The logic is primarily Vanilla JS. Views: arc, matrix, chord, and map. UI languages: DE / EN / IT / FR.

## Code Organization
- `index.html`: The main entry point, containing the layout and UI structure.
- `css/style.css`: Styles for the application, enforcing a dark mode theme (`#0f0f23`). Layout uses a flex column so the control panel never overlaps the canvas when it wraps.
- `js/app.js`: Application state management, UI event binding, i18n, filters, tooltips, sidebar.
- `js/shared.js`: Shared helpers (`getArcColor`) for main thread + worker (`importScripts`).
- `js/renderer.js`: Visualization engine: D3 zoom, filters, spatial indexes (arc/matrix/chord), hit-testing, worker messaging (`INIT` / `UPDATE_LAYOUT` / `SET_VISIBLE` / `RENDER`).
- `js/worker.js`: OffscreenCanvas worker. Holds resident arc data; `RENDER` payloads are lightweight (transform + hover/pin state).
- `js/dataLoader.js`: Fetches and parses `books.json` + `cross_references.txt`.
- `js/search.js`: Parses user search input into chapter indexes (EN/DE/IT/FR names when present).
- `js/stats.js`: D3 bar/donut charts; expects the filtered `arcs` array when charts should match filters.
- `js/api.js`: Fetches chapter text from bible-api.com (supports `AbortSignal`).
- `data/`: Generated dataset (`books.json`, `cross_references.txt`). Prefer regenerating via `generate_data.py`.
- `tests/`: Node unit tests (`dataLoader`, `renderer`, `stats`, `search`).

## Development & Testing Rules
1. **Performance is Critical:** When modifying `js/renderer.js` or `js/worker.js`, do not block the main thread. Do not re-clone `visibleArcs` to the worker every frame — send indices on filter change and lightweight `RENDER` payloads. Loops over large arc arrays must stay highly optimized.
2. **Serving Files:** The application uses Web Workers and `fetch()`, which fail under `file://` protocol due to CORS. Always spin up a local server to test the UI:
   ```bash
   kill $(lsof -t -i :8000) 2>/dev/null || true
   npm start
   # or: python3 -m http.server 8000 &
   ```
3. **Visual Verification:** If you modify the UI or rendering logic, you must verify the changes visually. Since you are in a headless environment, write a Playwright script to capture a screenshot of the running app and use `read_image_file` or similar tools to examine the result. Be sure to wait for the canvas to fully render (`await page.waitForTimeout(3000)`) before taking screenshots.
4. **Testing Suite:** Always run the complete suite of tests rather than individual files to ensure no regressions are introduced:
   ```bash
   npm test
   # or:
   node tests/dataLoader.test.js && node tests/renderer.test.js && node tests/stats.test.js && node tests/search.test.js
   ```
5. **Data Updates:** If the data structure changes, ensure you update `generate_data.py` and run it to regenerate the `books.json` and `cross_references.txt` artifacts.
6. **Documentation Maintenance:** If you make functional or structural changes that affect how the application is built, tested, or run, you must automatically update `README.md` and `AGENTS.md` to reflect those changes.

## Common Tasks
- **Updating the UI Layout:** Edit `index.html` and `css/style.css`.
- **Modifying the Visualization Logic (Arcs/Bars/Zoom):** Edit `js/renderer.js` and `js/worker.js` (and `js/shared.js` for shared draw helpers).
- **Modifying Interaction/Hover logic:** Update `handleMouseMove` in `js/app.js` and the hit-testing logic in `js/renderer.js`.
