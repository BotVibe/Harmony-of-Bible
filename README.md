# Bible Cross-References Visualization

An interactive, high-performance web application visualizing the 63,779 cross-references in the Bible as a stunning arc diagram. This project is inspired by the original static visualization by Chris Harrison and Christoph Römhild (2007) and makes it fully interactive and explorable.

## Features

- **Interactive Arc Diagram:** Visualizes 63,779 cross-references as colored arcs bridging chapters of the Bible.
- **High Performance:** Utilizes HTML5 Canvas, `OffscreenCanvas`, and Web Workers for smooth rendering and zooming even with massive datasets. Level-of-Detail (LOD) rendering ensures crisp visuals at any zoom level.
- **Explorable:** Pan and zoom across the chapters using mouse controls.
- **Dynamic Filtering:** Filter by book, testament (Old Testament, New Testament, Cross-Testament), biblical groups (Tora, Prophets, Gospels, etc.), and distance.
- **Hover Detection:** Hover over any chapter or arc to reveal rich tooltip information, utilizing custom mathematical spatial indexing for precision without heavy quadtree overhead.
- **Statistics & Analytics:** D3.js powered sidebar charts detailing the Top 10 interconnected books and chapters, plus an AT/NT distribution donut chart.
- **Bilingual Support:** Switch between German and English book names.

## Architecture & Tech Stack

- **Frontend Core:** Vanilla JavaScript, HTML5, CSS3. No heavy frameworks (React, Vue, etc.) to keep the bundle small and performance maximal.
- **Visualization:** `Canvas API` (foreground and background worker layers) + `D3.js v7` (for zooming, panning, and sidebar SVG charts).
- **Data Generation:** Python scripts parse standard KJV cross-reference datasets into optimized JSON/txt formats.

## How to Run Locally

Since the application uses Web Workers and fetches data asynchronously, it must be served over an HTTP server.

1. Clone the repository.
2. Start a local server:
   ```bash
   python3 -m http.server 8000
   ```
   *or using Node:*
   ```bash
   npx serve .
   ```
3. Open your browser and navigate to `http://localhost:8000`.

## Testing

The project includes a Node.js unit test suite for the core visualization logic.

To run the unit tests:
```bash
node tests/renderer.test.js
```

## Deployment

The application is automatically deployed to GitHub Pages via GitHub Actions whenever changes are pushed or merged into the `main` branch.

## Data Structure

The application expects data in the `/data` folder:
- `books.json`: Metadata for all 66 books, including chapter and verse counts.
- `cross_references.txt`: A normalized dataset mapping source verses to target verses.

## Acknowledgements

- Original concept by Chris Harrison & Pastor Christoph Römhild.
- Open-source KJV cross-reference datasets.
