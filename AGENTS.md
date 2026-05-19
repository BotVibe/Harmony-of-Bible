# Agent Instructions

Welcome, agent! This file contains instructions for working with this repository.

## Project Overview
This repository contains an interactive visualization of 63,779 Bible cross-references. It relies heavily on HTML5 Canvas and Web Workers for performance. The logic is primarily Vanilla JS.

## Code Organization
- `index.html`: The main entry point, containing the layout and UI structure.
- `css/style.css`: Styles for the application, enforcing a dark mode theme (`#0f0f23`).
- `js/app.js`: Application state management, UI event binding, and top-level logic.
- `js/renderer.js`: The core visualization engine. It handles D3 zooming/panning, dynamic styling, and delegating the heavy arc rendering to the background worker. It also contains the math-based hover detection logic (`getArcAtScreenPos`).
- `js/worker.js`: A Web Worker script utilizing `OffscreenCanvas` to render the 63,779 arcs smoothly without blocking the main thread.
- `js/dataLoader.js`: Responsible for fetching and parsing the raw reference string data into workable numeric representations.
- `js/search.js`: Logic for parsing user search input into canonical book/chapter formats.
- `js/stats.js`: Uses D3.js to render the bar and donut charts in the statistics sidebar.
- `data/`: Contains the generated dataset (`books.json` and `cross_references.txt`). The python scripts used to generate these are also in the root directory.
- `tests/`: Contains Node.js unit tests for the core logic components (`dataLoader`, `renderer`, `stats`).

## Development & Testing Rules
1. **Performance is Critical:** When modifying `js/renderer.js` or `js/worker.js`, ensure that you do not introduce logic that blocks the main thread. Loops over the `visibleArcs` array (which can be up to 63,779 items) must be highly optimized.
2. **Serving Files:** The application uses Web Workers and `fetch()`, which fail under `file://` protocol due to CORS. Always spin up a local server to test the UI:
   ```bash
   kill $(lsof -t -i :8000) 2>/dev/null || true
   python3 -m http.server 8000 &
   ```
3. **Visual Verification:** If you modify the UI or rendering logic, you must verify the changes visually. Since you are in a headless environment, write a Playwright script to capture a screenshot of the running app and use `read_image_file` or similar tools to examine the result. Be sure to wait for the canvas to fully render (`await page.waitForTimeout(3000)`) before taking screenshots.
4. **Testing Suite:** Always run the complete suite of tests rather than individual files to ensure no regressions are introduced:
   ```bash
   node tests/dataLoader.test.js && node tests/renderer.test.js && node tests/stats.test.js
   ```
5. **Data Updates:** If the data structure changes, ensure you update `generate_data.py` and run it to regenerate the `books.json` and `cross_references.txt` artifacts.
6. **Documentation Maintenance:** If you make functional or structural changes that affect how the application is built, tested, or run, you must automatically update `README.md` and `AGENTS.md` to reflect those changes.

## Common Tasks
- **Updating the UI Layout:** Edit `index.html` and `css/style.css`.
- **Modifying the Visualization Logic (Arcs/Bars/Zoom):** Edit `js/renderer.js` and `js/worker.js`.
- **Modifying Interaction/Hover logic:** Update `handleMouseMove` in `js/app.js` and the hit-testing logic in `js/renderer.js`.
