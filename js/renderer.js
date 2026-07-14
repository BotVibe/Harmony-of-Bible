class Renderer {
    constructor(canvasId, data) {
        this.canvas = document.getElementById(canvasId);
        this.data = data;

        // Attempt to use OffscreenCanvas for arc rendering background layer
        this.useWorker = typeof this.canvas.transferControlToOffscreen === 'function';
        if (this.useWorker) {
            // We use a secondary background canvas for worker
            this.bgCanvas = document.createElement('canvas');
            this.bgCanvas.style.position = 'absolute';
            this.bgCanvas.style.top = '0';
            this.bgCanvas.style.left = '0';
            this.bgCanvas.style.width = '100%';
            this.bgCanvas.style.height = '100%';
            this.bgCanvas.style.zIndex = '0';
            this.canvas.parentElement.insertBefore(this.bgCanvas, this.canvas);
            this.canvas.style.position = 'relative';
            this.canvas.style.zIndex = '1';
            // Foreground must be transparent so the worker layer is visible.
            // Do not call getContext with alpha:false first — attributes are locked on first call.
            this.ctx = this.canvas.getContext('2d', { alpha: true });

            const offscreen = this.bgCanvas.transferControlToOffscreen();
            this.worker = new Worker('js/worker.js');
            this.worker.onerror = (err) => {
                console.error('Worker error:', err.message, err.filename, err.lineno);
            };
            this.worker.onmessage = (e) => {
                if (e.data && e.data.type === 'ERROR') {
                    console.error('Worker runtime error:', e.data.message, e.data.stack);
                }
            };
            this.worker.postMessage({
                type: 'INIT',
                payload: { canvas: offscreen, data: this.data }
            }, [offscreen]);
        } else {
            this.ctx = this.canvas.getContext('2d', { alpha: false });
        }

        // State
        this.width = 0;
        this.height = 0;
        this.transform = d3.zoomIdentity;
        this.viewMode = 'arc';

        // Colors
        this.bgDark = '#0f0f23';
        this.barLight = '#444455';
        this.barDark = '#222233';
        this.barATNT = '#ffffff'; // Genesis & Matt

        // Interaction
        this.hoveredChapter = null;
        this.hoveredArc = null;
        this.pinnedChapter = null;

        // Filters
        this.filters = {
            book: 'all',
            distance: 1189,
            testament: 'all',
            group: 'all'
        };

        // Caches
        this.chapterPositions = [];
        this.visibleArcs = [];
        this.visibleArcIds = new Set();
        this.matrixArcLookup = new Map(); // "min_max" -> arc for O(1) matrix hit-testing
        this.chordSpatialIndex = null;

        this.renderPending = false;

        this.init();
    }

    requestRender() {
        if (!this.renderPending) {
            this.renderPending = true;
            window.requestAnimationFrame(() => {
                this.renderPending = false;
                this.render();
            });
        }
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.calculatePositions();
        this.applyFilters();
    }

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;

        // Handle high DPI displays — reset transform so repeated resize does not compound scale
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = Math.max(1, Math.floor(this.width * dpr));
        this.canvas.height = Math.max(1, Math.floor(this.height * dpr));
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        this.calculatePositions();
        this.requestRender();
    }

    setTransform(transform) {
        this.transform = transform;
        this.requestRender();
    }

    setViewMode(mode) {
        if (this.viewMode !== mode) {
            this.viewMode = mode;
            if (this.ctx) {
                this.ctx.clearRect(0, 0, this.width, this.height);
            }
            this.requestRender();
        }
    }

    /** Lightweight payload — arcs live in the worker; only send interaction/view state each frame. */
    postWorkerRender(viewMode) {
        if (!this.useWorker) return;
        const hoveredArc = this.hoveredArc
            ? { source: this.hoveredArc.source, target: this.hoveredArc.target }
            : null;
        this.worker.postMessage({
            type: 'RENDER',
            payload: {
                width: this.width,
                height: this.height,
                dpr: window.devicePixelRatio || 1,
                transform: this.transform,
                hoveredChapter: this.hoveredChapter,
                pinnedChapter: this.pinnedChapter,
                hoveredArc,
                viewMode: viewMode || this.viewMode
            }
        });
    }

    syncWorkerLayout() {
        if (!this.useWorker) return;
        this.worker.postMessage({
            type: 'UPDATE_LAYOUT',
            payload: { chapterPositions: this.chapterPositions }
        });
    }

    syncWorkerVisible() {
        if (!this.useWorker) return;
        const indices = new Uint32Array(this.visibleArcs.length);
        for (let i = 0; i < this.visibleArcs.length; i++) {
            indices[i] = this.visibleArcs[i].id;
        }
        this.worker.postMessage({
            type: 'SET_VISIBLE',
            payload: { indices }
        });
    }

    setFilters(filters) {
        this.filters = { ...this.filters, ...filters };
        this.applyFilters();
        this.requestRender();
        return this.visibleArcs.length;
    }

    setHoveredChapter(idx) {
        if (this.hoveredChapter !== idx) {
            this.hoveredChapter = idx;
            this.requestRender();
        }
    }

    setHoveredArc(arc) {
        if (this.hoveredArc !== arc) {
            this.hoveredArc = arc;
            this.requestRender();
        }
    }

    setPinnedChapter(idx) {
        this.pinnedChapter = idx;
        this.requestRender();
    }

    calculatePositions() {
        if (!this.data.totalVerses || this.width === 0) return;

        // Leave some padding on sides
        const padding = 20;
        const availableWidth = this.width - padding * 2;

        // Calculate X position for each chapter
        let currentX = padding;
        const totalV = this.data.totalVerses;

        this.chapterPositions = this.data.chapters.map((ch, idx) => {
            const width = (ch.verses / totalV) * availableWidth;
            const pos = {
                x: currentX,
                width: width,
                centerX: currentX + width / 2
            };
            currentX += width;
            return pos;
        });

        // Pre-calculate static geometry for all arcs
        if (this.data.arcs) {
            this.data.arcs.forEach(arc => {
                const p1 = this.chapterPositions[arc.source].centerX;
                const p2 = this.chapterPositions[arc.target].centerX;
                arc.midX = (p1 + p2) / 2;
                arc.rX = Math.abs(p2 - p1) / 2;
            });
        }
        this.syncWorkerLayout();
        this.buildChordSpatialIndex();
    }

    applyFilters() {
        this.visibleArcs = this.data.arcs.filter(arc => {
            // Distance filter
            if (arc.distance > this.filters.distance) return false;

            const sourceCh = this.data.chapters[arc.source];
            const targetCh = this.data.chapters[arc.target];

            // Testament filter
            if (this.filters.testament === 'ot') {
                if (sourceCh.testament !== 'OT' || targetCh.testament !== 'OT') return false;
            } else if (this.filters.testament === 'nt') {
                if (sourceCh.testament !== 'NT' || targetCh.testament !== 'NT') return false;
            } else if (this.filters.testament === 'cross') {
                if (sourceCh.testament === targetCh.testament) return false;
            }

            // Book filter
            if (this.filters.book !== 'all') {
                const bookId = parseInt(this.filters.book);
                if (sourceCh.bookId !== bookId && targetCh.bookId !== bookId) return false;
            }

            // Group filter
            if (this.filters.group !== 'all') {
                if (sourceCh.group !== this.filters.group && targetCh.group !== this.filters.group) return false;
            }

            return true;
        });

        this.visibleArcIds = new Set(this.visibleArcs.map(a => a.id));
        this.matrixArcLookup.clear();
        for (let i = 0; i < this.visibleArcs.length; i++) {
            const arc = this.visibleArcs[i];
            const key = arc.source < arc.target
                ? arc.source + '_' + arc.target
                : arc.target + '_' + arc.source;
            this.matrixArcLookup.set(key, arc);
        }

        this.buildSpatialIndex();
        this.buildChordSpatialIndex();
        this.syncWorkerVisible();
    }

    buildSpatialIndex() {
        if (!this.visibleArcs || !this.chapterPositions || this.chapterPositions.length === 0) return;

        const GRID_SIZE = 50;
        this.arcSpatialIndex = Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE }, () => []));

        const maxR = (this.chapterPositions[this.chapterPositions.length-1].centerX - this.chapterPositions[0].centerX) / 2;
        this.spatialMaxR = maxR;

        this.visibleArcs.forEach(arc => {
            const midX = arc.midX;
            const rX = arc.rX;

            let binX = Math.floor((midX / this.width) * GRID_SIZE);
            if (binX < 0) binX = 0;
            if (binX >= GRID_SIZE) binX = GRID_SIZE - 1;

            let binY = Math.floor((rX / maxR) * GRID_SIZE);
            if (binY < 0) binY = 0;
            if (binY >= GRID_SIZE) binY = GRID_SIZE - 1;

            this.arcSpatialIndex[binX][binY].push(arc);
        });
    }

    /**
     * Sample quadratic chord curves into a coarse grid so hover doesn't scan all visible arcs.
     */
    buildChordSpatialIndex() {
        if (!this.visibleArcs || !this.width || !this.height) {
            this.chordSpatialIndex = null;
            return;
        }

        const GRID = 40;
        this.chordSpatialIndex = Array.from({ length: GRID }, () => Array.from({ length: GRID }, () => []));
        this.chordGridSize = GRID;

        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const radius = Math.min(this.width, this.height) / 2 - 60;
        const numChapters = this.chapterPositions.length;
        if (!numChapters) return;

        const angleStep = (Math.PI * 2) / numChapters;
        const coords = new Float32Array(numChapters * 2);
        for (let i = 0; i < numChapters; i++) {
            const angle = i * angleStep - Math.PI / 2;
            coords[i * 2] = centerX + Math.cos(angle) * radius;
            coords[i * 2 + 1] = centerY + Math.sin(angle) * radius;
        }
        this.chordCoords = coords;
        this.chordCenterX = centerX;
        this.chordCenterY = centerY;
        this.chordRadius = radius;

        for (let i = 0; i < this.visibleArcs.length; i++) {
            const arc = this.visibleArcs[i];
            const sx = coords[arc.source * 2];
            const sy = coords[arc.source * 2 + 1];
            const tx = coords[arc.target * 2];
            const ty = coords[arc.target * 2 + 1];

            for (let t = 0; t <= 1; t += 0.1) {
                const px = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * centerX + t * t * tx;
                const py = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * centerY + t * t * ty;
                let gx = Math.floor((px / this.width) * GRID);
                let gy = Math.floor((py / this.height) * GRID);
                if (gx < 0) gx = 0;
                if (gy < 0) gy = 0;
                if (gx >= GRID) gx = GRID - 1;
                if (gy >= GRID) gy = GRID - 1;
                const cell = this.chordSpatialIndex[gx][gy];
                if (cell[cell.length - 1] !== arc) cell.push(arc);
            }
        }
    }

    static getBinYBounds(worldX, binX, binWidth, binHeight, D2, rxTolerance, GRID_SIZE) {
        const m0 = binX * binWidth;
        const m1 = m0 + binWidth;

        let closestMidX = worldX;
        if (worldX < m0) closestMidX = m0;
        else if (worldX > m1) closestMidX = m1;

        const farthestMidX = Math.abs(worldX - m0) > Math.abs(worldX - m1) ? m0 : m1;

        const idealRxMin = Math.sqrt((closestMidX - worldX) ** 2 + D2);
        const idealRxMax = Math.sqrt((farthestMidX - worldX) ** 2 + D2);

        const minRx = idealRxMin - rxTolerance;
        const maxRx = idealRxMax + rxTolerance;

        let startBinY = Math.floor(minRx / binHeight) - 1;
        let endBinY = Math.floor(maxRx / binHeight) + 1;

        if (startBinY < 0) startBinY = 0;
        if (endBinY >= GRID_SIZE) endBinY = GRID_SIZE - 1;

        if (startBinY > GRID_SIZE - 1 || endBinY < 0) return null;

        return { startBinY, endBinY };
    }

    static getArcDistanceToPoint(worldX, worldY, p1, p2, maxR, bottomY, threshold) {
        const midX = (p1 + p2) / 2;
        const rX = Math.abs(p2 - p1) / 2;

        if (worldX < midX - rX - threshold || worldX > midX + rX + threshold) return null;
        if (worldY < bottomY - rX - threshold) return null;

        const dx = worldX - midX;
        const dy = worldY - bottomY;
        const distFromCenter = Math.sqrt(dx * dx + dy * dy);

        const distDiff = Math.abs(distFromCenter - rX);

        if (distDiff < threshold) {
            return distDiff;
        }
        return null;
    }

    static getArcColor(distance) {
        if (typeof getArcColor === 'function') {
            return getArcColor(distance);
        }
        // Node/test fallback when shared.js is not loaded via importScripts
        if (typeof distance !== 'number' || isNaN(distance)) {
            return 'hsla(0, 0%, 50%, ';
        }
        const validDistance = Math.max(0, distance);
        const norm = Math.min(validDistance / 1189, 1);
        let hue;
        if (norm < 0.1) hue = 270 - (norm / 0.1) * 30;
        else if (norm < 0.4) hue = 240 - ((norm - 0.1) / 0.3) * 180;
        else hue = 60 - ((norm - 0.4) / 0.6) * 60;
        return `hsla(${hue}, 100%, 50%, `;
    }

    render() {
        // Clear background
        if (!this.useWorker) {
            this.ctx.fillStyle = this.bgDark;
            this.ctx.fillRect(0, 0, this.width, this.height);
        } else {
            this.ctx.clearRect(0, 0, this.width, this.height);
        }

        if (this.chapterPositions.length === 0) return;
        if (this.viewMode === 'matrix') { this.renderMatrix(); return; }
        if (this.viewMode === 'chord') { this.renderChord(); return; }
        if (this.viewMode === 'map') { this.renderMap(); return; }

        this.ctx.save();

        // Apply transform
        this.ctx.translate(this.transform.x, 0);
        this.ctx.scale(this.transform.k, this.transform.k);

        const k = this.transform.k;

        // Base line / X-axis config
        const bottomY = (this.height - 80) / this.transform.k;
        const maxBarHeight = 60 / k; // Max height for a chapter bar

        // Viewport culling boundaries
        const screenMinX = -this.transform.x / k;
        const screenMaxX = (this.width - this.transform.x) / k;

        // 1. Draw Arcs
        const focusChapter = this.pinnedChapter !== null ? this.pinnedChapter : this.hoveredChapter;
        const isHovering = focusChapter !== null || this.hoveredArc !== null;

        if (this.useWorker) {
            this.postWorkerRender('arc');
        } else {
            // LOD Check
            // If high zoom, we can render thicker lines, lower alpha
            let baseAlpha = 0.15;
            if (k > 5) baseAlpha = 0.3;
            if (k > 10) baseAlpha = 0.5;

            this.ctx.lineWidth = 0.5 / k; // keep line width somewhat constant in screen space
            if (this.ctx.lineWidth < 0.1) this.ctx.lineWidth = 0.1;

            // Instead of squeezing arcs based on max height, keep them strictly circular.
            // A circle has rY = rX. Because the canvas is scaled uniformly by k,
            // drawing a circle in world space (rY = rX) means it stays a circle in screen space.

            this.visibleArcs.forEach(arc => {
                const midX = arc.midX;
                const rX = arc.rX;

                // Viewport culling check
                if (midX + rX < screenMinX || midX - rX > screenMaxX) {
                    return;
                }

                const isArcFocus = (focusChapter !== null && (arc.source === focusChapter || arc.target === focusChapter)) ||
                                   (this.hoveredArc === arc);

                if (isHovering && !isArcFocus) {
                    // Dim non-focused arcs
                    this.ctx.strokeStyle = Renderer.getArcColor(arc.distance) + '0.02)';
                } else if (isArcFocus) {
                    this.ctx.strokeStyle = Renderer.getArcColor(arc.distance) + '1.0)';
                    this.ctx.lineWidth = (focusChapter !== null ? 1.5 : 2.0) / k;
                } else {
                    this.ctx.strokeStyle = Renderer.getArcColor(arc.distance) + baseAlpha + ')';
                }

                // Draw as perfect semi-circle
                this.ctx.beginPath();
                this.ctx.arc(midX, bottomY, rX, Math.PI, 0);
                this.ctx.stroke();

                // Reset line width if changed
                if (isArcFocus) {
                    this.ctx.lineWidth = Math.max(0.5 / k, 0.1);
                }
            });
        }

        if (!this.useWorker) {
            // 2. Draw Chapter Bars
            let lastBookId = -1;
            let bookColorToggle = false;

            this.data.chapters.forEach((ch, idx) => {
                const pos = this.chapterPositions[idx];

                // Check visibility before doing anything
                if (pos.x + pos.width < screenMinX || pos.x > screenMaxX) {
                    // We still need to keep track of book color toggle
                    if (ch.bookId !== lastBookId) {
                        bookColorToggle = !bookColorToggle;
                        lastBookId = ch.bookId;
                    }
                    return;
                }

                if (ch.bookId !== lastBookId) {
                    bookColorToggle = !bookColorToggle;
                    lastBookId = ch.bookId;
                }

                // Bar color
                if (idx === 0 || ch.shortName === 'Matt' && ch.chapterNum === 1) {
                    this.ctx.fillStyle = '#ffffff'; // Gen and Matt
                } else {
                    this.ctx.fillStyle = bookColorToggle ? this.barLight : this.barDark;
                }

                // Highlight hovered/pinned chapter
                if (idx === focusChapter) {
                    this.ctx.fillStyle = '#e94560';
                }

                // Bar height proportional to verses
                // max verses in a chapter is Ps 119 (176 verses)
                const h = (ch.verses / 176) * maxBarHeight;

                // Prevent bar from getting too wide/narrow visually
                let drawWidth = pos.width;
                if (drawWidth * k < 1) {
                    drawWidth = 1 / k; // Min 1px wide on screen
                }

                this.ctx.fillRect(pos.x, bottomY, drawWidth, h);

                // Labels at high zoom
                if (k > 5 && ch.chapterNum === 1) {
                    this.ctx.save();
                    this.ctx.fillStyle = '#ffffff';
                    // Adjust font size inversely to zoom to keep it readable but not huge
                    const fontSize = Math.max(10 / k, 2);
                    this.ctx.font = `${fontSize}px sans-serif`;
                    this.ctx.translate(pos.x, bottomY + h + (5/k));
                    this.ctx.rotate(Math.PI / 4);
                    this.ctx.fillText(ch.shortName, 0, 0);
                    this.ctx.restore();
                }
            });
        }

        this.ctx.restore();
    }

    // Find chapter index from screen coordinate X
    getChapterAtScreenPos(mouseX) {
        if (!this.chapterPositions.length) return null;

        // Transform screen X to world X
        const worldX = (mouseX - this.transform.x) / this.transform.k;

        // Binary search or simple loop
        for (let i = 0; i < this.chapterPositions.length; i++) {
            const p = this.chapterPositions[i];
            if (worldX >= p.x && worldX <= p.x + p.width) {
                return i;
            }
        }
        return null;
    }

    getArcAtScreenPos(mouseX, mouseY) {
        if (!this.visibleArcs || this.visibleArcs.length === 0 || !this.chapterPositions || this.chapterPositions.length === 0) return null;
        if (!this.arcSpatialIndex) return null;

        const worldX = (mouseX - this.transform.x) / this.transform.k;
        const worldY = mouseY / this.transform.k;

        const bottomY = (this.height - 80) / this.transform.k;
        if (worldY > bottomY) return null;

        const maxR = this.spatialMaxR || (this.chapterPositions[this.chapterPositions.length-1].centerX - this.chapterPositions[0].centerX) / 2;
        const threshold = 5 / this.transform.k;

        const dy = worldY - bottomY;
        // Since arcs are now circles, D2 is just dy^2
        const D2 = dy * dy;

        const GRID_SIZE = 50;
        const binWidth = this.width / GRID_SIZE;
        const binHeight = maxR / GRID_SIZE;

        const rxTolerance = threshold + 2; // +2 for safety

        let closestArc = null;
        let minDistance = Infinity;

        // Iterate over X bins to find matching Y bins
        for (let binX = 0; binX < GRID_SIZE; binX++) {
            const bounds = Renderer.getBinYBounds(worldX, binX, binWidth, binHeight, D2, rxTolerance, GRID_SIZE);
            if (!bounds) continue;

            for (let binY = bounds.startBinY; binY <= bounds.endBinY; binY++) {
                const arcsInBin = this.arcSpatialIndex[binX][binY];
                if (!arcsInBin) continue;

                // Process arcs exactly as before to find the closest match
                for (let i = arcsInBin.length - 1; i >= 0; i--) {
                    const arc = arcsInBin[i];
                    const p1 = this.chapterPositions[arc.source].centerX;
                    const p2 = this.chapterPositions[arc.target].centerX;

                    const approxPixelDist = Renderer.getArcDistanceToPoint(worldX, worldY, p1, p2, maxR, bottomY, threshold);

                    if (approxPixelDist !== null && approxPixelDist < minDistance) {
                        minDistance = approxPixelDist;
                        closestArc = arc;
                    }
                }
            }
        }

        return closestArc;
    }
    getChapterAtScreenPosMatrix(mouseX, mouseY) {
        if (!this.chapterPositions.length) return null;
        const worldX = (mouseX - this.transform.x) / this.transform.k;
        const worldY = (mouseY - this.transform.y) / this.transform.k;

        const numChapters = this.chapterPositions.length;
        const padding = 40;
        const size = Math.min(this.width, this.height) - padding * 2;
        const cellSize = size / numChapters;
        const offsetX = (this.width - size) / 2;
        const offsetY = (this.height - size) / 2;

        const isXAxis = worldY > offsetY - 20 && worldY < offsetY;
        const isYAxis = worldX > offsetX - 20 && worldX < offsetX;

        if (isXAxis && worldX >= offsetX && worldX <= offsetX + size) {
            return Math.floor((worldX - offsetX) / cellSize);
        }
        if (isYAxis && worldY >= offsetY && worldY <= offsetY + size) {
            return Math.floor((worldY - offsetY) / cellSize);
        }

        if (worldX >= offsetX && worldX <= offsetX + size && worldY >= offsetY && worldY <= offsetY + size) {
            const col = Math.floor((worldX - offsetX) / cellSize);
            const row = Math.floor((worldY - offsetY) / cellSize);
            if (col === row) return col;
        }

        return null;
    }

    getArcAtScreenPosMatrix(mouseX, mouseY) {
        if (!this.matrixArcLookup || this.matrixArcLookup.size === 0) return null;
        const worldX = (mouseX - this.transform.x) / this.transform.k;
        const worldY = (mouseY - this.transform.y) / this.transform.k;

        const numChapters = this.chapterPositions.length;
        const padding = 40;
        const size = Math.min(this.width, this.height) - padding * 2;
        const cellSize = size / numChapters;
        const offsetX = (this.width - size) / 2;
        const offsetY = (this.height - size) / 2;

        if (worldX >= offsetX && worldX <= offsetX + size && worldY >= offsetY && worldY <= offsetY + size) {
            const col = Math.floor((worldX - offsetX) / cellSize);
            const row = Math.floor((worldY - offsetY) / cellSize);
            if (col === row) return null;
            const key = col < row ? col + '_' + row : row + '_' + col;
            return this.matrixArcLookup.get(key) || null;
        }
        return null;
    }

    getChapterAtScreenPosChord(mouseX, mouseY) {
        if (!this.chapterPositions.length) return null;
        const worldX = (mouseX - this.transform.x) / this.transform.k;
        const worldY = (mouseY - this.transform.y) / this.transform.k;

        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const radius = Math.min(this.width, this.height) / 2 - 60;

        const dx = worldX - centerX;
        const dy = worldY - centerY;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist >= radius && dist <= radius + 20) {
            let angle = Math.atan2(dy, dx) + Math.PI / 2;
            if (angle < 0) angle += Math.PI * 2;

            const numChapters = this.chapterPositions.length;
            const angleStep = (Math.PI * 2) / numChapters;
            const chapterIdx = Math.floor(angle / angleStep);

            if (chapterIdx >= 0 && chapterIdx < numChapters) {
                return chapterIdx;
            }
        }

        return null;
    }

    getArcAtScreenPosChord(mouseX, mouseY) {
        if (!this.visibleArcs || this.visibleArcs.length === 0) return null;
        const worldX = (mouseX - this.transform.x) / this.transform.k;
        const worldY = (mouseY - this.transform.y) / this.transform.k;

        const centerX = this.chordCenterX != null ? this.chordCenterX : this.width / 2;
        const centerY = this.chordCenterY != null ? this.chordCenterY : this.height / 2;
        const radius = this.chordRadius != null ? this.chordRadius : (Math.min(this.width, this.height) / 2 - 60);

        const dx = worldX - centerX;
        const dy = worldY - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist >= radius) return null;

        let closestArc = null;
        let minDistance = 10 / this.transform.k;

        const coords = this.chordCoords;
        if (!coords) return null;

        // Collect candidate arcs from spatial index neighborhood
        const candidates = [];
        const seen = new Set();
        if (this.chordSpatialIndex) {
            const GRID = this.chordGridSize;
            let gx = Math.floor((worldX / this.width) * GRID);
            let gy = Math.floor((worldY / this.height) * GRID);
            if (gx < 0) gx = 0;
            if (gy < 0) gy = 0;
            if (gx >= GRID) gx = GRID - 1;
            if (gy >= GRID) gy = GRID - 1;

            for (let x = Math.max(0, gx - 1); x <= Math.min(GRID - 1, gx + 1); x++) {
                for (let y = Math.max(0, gy - 1); y <= Math.min(GRID - 1, gy + 1); y++) {
                    const cell = this.chordSpatialIndex[x][y];
                    for (let i = 0; i < cell.length; i++) {
                        const arc = cell[i];
                        if (!seen.has(arc.id)) {
                            seen.add(arc.id);
                            candidates.push(arc);
                        }
                    }
                }
            }
        } else {
            for (let i = 0; i < this.visibleArcs.length; i++) candidates.push(this.visibleArcs[i]);
        }

        for (let i = 0; i < candidates.length; i++) {
            const arc = candidates[i];
            const sx = coords[arc.source * 2];
            const sy = coords[arc.source * 2 + 1];
            const tx = coords[arc.target * 2];
            const ty = coords[arc.target * 2 + 1];

            const minX = Math.min(sx, tx, centerX) - minDistance;
            const maxX = Math.max(sx, tx, centerX) + minDistance;
            const minY = Math.min(sy, ty, centerY) - minDistance;
            const maxY = Math.max(sy, ty, centerY) + minDistance;

            if (worldX < minX || worldX > maxX || worldY < minY || worldY > maxY) continue;

            for (let t = 0; t <= 1; t += 0.125) {
                const px = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * centerX + t * t * tx;
                const py = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * centerY + t * t * ty;
                const distToCurve = Math.sqrt((px - worldX) ** 2 + (py - worldY) ** 2);
                if (distToCurve < minDistance) {
                    minDistance = distToCurve;
                    closestArc = arc;
                }
            }
        }

        return closestArc;
    }

    static geoLocations = [
        { name: "Jerusalem", x: 0, y: 0, books: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44] },
        { name: "Rome", x: -250, y: -150, books: [45, 55, 56, 57] },
        { name: "Corinth", x: -180, y: -100, books: [46, 47] },
        { name: "Galatia", x: -80, y: -120, books: [48] },
        { name: "Ephesus", x: -120, y: -90, books: [49, 54, 62, 63, 64] },
        { name: "Philippi", x: -160, y: -130, books: [50] },
        { name: "Colossae", x: -100, y: -80, books: [51] },
        { name: "Thessalonica", x: -170, y: -120, books: [52, 53] },
        { name: "Babylon", x: 150, y: 20, books: [24, 25, 26, 27, 60] },
        { name: "Patmos", x: -140, y: -70, books: [66] },
        { name: "Egypt (Sinai)", x: -50, y: 80, books: [2] }
    ];

    renderMap() {
        if (this.useWorker) { this.postWorkerRender('map'); return; }
        if (!this.ctx) return;
        this.ctx.save();
        this.ctx.translate(this.transform.x, this.transform.y);
        this.ctx.scale(this.transform.k, this.transform.k);

        const cx = this.width / 2;
        const cy = this.height / 2;

        this.ctx.fillStyle = '#223344';
        this.ctx.fillRect(-this.width, -this.height, this.width*3, this.height*3);

        this.ctx.fillStyle = '#112211';
        this.ctx.beginPath();
        this.ctx.moveTo(cx - 350, cy - 200);
        this.ctx.lineTo(cx - 100, cy - 250);
        this.ctx.lineTo(cx + 200, cy - 100);
        this.ctx.lineTo(cx + 250, cy + 150);
        this.ctx.lineTo(cx - 50, cy + 200);
        this.ctx.lineTo(cx - 300, cy + 150);
        this.ctx.fill();

        this.ctx.fillStyle = '#223344';
        this.ctx.beginPath();
        this.ctx.moveTo(cx - 300, cy - 50);
        this.ctx.lineTo(cx - 100, cy - 50);
        this.ctx.lineTo(cx - 50, cy + 50);
        this.ctx.lineTo(cx - 200, cy + 80);
        this.ctx.fill();

        const focusChapter = this.pinnedChapter !== null ? this.pinnedChapter : this.hoveredChapter;
        let activeBookId = -1;
        if (focusChapter !== null && this.data && this.data.chapters && this.data.chapters[focusChapter]) {
            activeBookId = this.data.chapters[focusChapter].bookId;
        }

        Renderer.geoLocations.forEach(loc => {
            const locX = cx + loc.x;
            const locY = cy + loc.y;

            const isActive = activeBookId !== -1 && loc.books.includes(activeBookId);

            this.ctx.fillStyle = isActive ? '#e94560' : '#88aaaa';
            this.ctx.beginPath();
            this.ctx.arc(locX, locY, (isActive ? 8 : 4) / this.transform.k, 0, Math.PI*2);
            this.ctx.fill();

            this.ctx.fillStyle = isActive ? '#ffffff' : '#aaaaaa';
            this.ctx.font = `${(isActive ? 16 : 12)/this.transform.k}px Arial`;
            this.ctx.fillText(loc.name, locX + 10/this.transform.k, locY + 4/this.transform.k);

            if (isActive) {
                this.ctx.strokeStyle = '#e94560';
                this.ctx.lineWidth = 1 / this.transform.k;
                this.ctx.beginPath();
                this.ctx.arc(locX, locY, 15 / this.transform.k, 0, Math.PI*2);
                this.ctx.stroke();
            }
        });

        if (this.hoveredArc && this.data && this.data.chapters) {
            const sourceBookId = this.data.chapters[this.hoveredArc.source].bookId;
            const targetBookId = this.data.chapters[this.hoveredArc.target].bookId;

            const sourceLoc = Renderer.geoLocations.find(l => l.books.includes(sourceBookId));
            const targetLoc = Renderer.geoLocations.find(l => l.books.includes(targetBookId));

            if (sourceLoc && targetLoc && sourceLoc !== targetLoc) {
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 2 / this.transform.k;
                this.ctx.setLineDash([5 / this.transform.k, 5 / this.transform.k]);
                this.ctx.beginPath();
                this.ctx.moveTo(cx + sourceLoc.x, cy + sourceLoc.y);
                this.ctx.lineTo(cx + targetLoc.x, cy + targetLoc.y);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
        }

        this.ctx.fillStyle = 'rgba(255,255,255,0.7)';
        this.ctx.font = `${14/this.transform.k}px Arial`;
        this.ctx.fillText("Einfache abstrakte Karte. Wähle ein Kapitel um verknüpfte Orte zu markieren.", cx - 200, cy + 250);
        this.ctx.restore();
    }
    renderMatrix() {
        if (this.useWorker) { this.postWorkerRender('matrix'); return; }
        if (!this.ctx) return;
        this.ctx.save();
        const numChapters = this.chapterPositions.length; const padding = 40; const size = Math.min(this.width, this.height) - padding * 2; const cellSize = size / numChapters;
        const offsetX = (this.width - size) / 2; const offsetY = (this.height - size) / 2;
        this.ctx.translate(this.transform.x, this.transform.y); this.ctx.scale(this.transform.k, this.transform.k);
        this.ctx.fillStyle = '#16213e'; this.ctx.fillRect(offsetX, offsetY, size, size);
        this.ctx.strokeStyle = '#2a2a4e'; this.ctx.lineWidth = 1 / this.transform.k; this.ctx.strokeRect(offsetX, offsetY, size, size);
        const focusChapter = this.pinnedChapter !== null ? this.pinnedChapter : this.hoveredChapter;
        this.visibleArcs.forEach(arc => {
            const sx = offsetX + arc.source * cellSize; const sy = offsetY + arc.target * cellSize;
            const isArcFocus = (focusChapter !== null && (arc.source === focusChapter || arc.target === focusChapter)) || (this.hoveredArc === arc);
            this.ctx.fillStyle = Renderer.getArcColor(arc.distance) + '1.0)';
            let currentCellSize = cellSize;
            if (isArcFocus) { this.ctx.fillStyle = '#ffffff'; currentCellSize = cellSize * 2; } else { currentCellSize = Math.max(cellSize, 1 / this.transform.k); }
            this.ctx.fillRect(sx, sy, currentCellSize, currentCellSize); this.ctx.fillRect(offsetX + arc.target * cellSize, offsetY + arc.source * cellSize, currentCellSize, currentCellSize);
        });
        this.ctx.restore();
    }
    renderChord() {
        if (this.useWorker) { this.postWorkerRender('chord'); return; }
        if (!this.ctx) return;
        this.ctx.save();
        this.ctx.translate(this.transform.x, this.transform.y); this.ctx.scale(this.transform.k, this.transform.k);
        const centerX = this.width / 2; const centerY = this.height / 2; const radius = Math.min(this.width, this.height) / 2 - 60;
        const numChapters = this.chapterPositions.length; const angleStep = (Math.PI * 2) / numChapters;
        const focusChapter = this.pinnedChapter !== null ? this.pinnedChapter : this.hoveredChapter; const isHovering = focusChapter !== null || this.hoveredArc !== null;
        const coords = new Float32Array(numChapters * 2);
        for(let i=0; i<numChapters; i++) { const angle = i * angleStep - Math.PI / 2; coords[i*2] = centerX + Math.cos(angle) * radius; coords[i*2+1] = centerY + Math.sin(angle) * radius; }
        this.ctx.lineWidth = 0.5 / this.transform.k; let baseAlpha = 0.1; if (this.transform.k > 2) baseAlpha = 0.3;
        this.visibleArcs.forEach(arc => {
            const isArcFocus = (focusChapter !== null && (arc.source === focusChapter || arc.target === focusChapter)) || (this.hoveredArc === arc);
            if (isHovering && !isArcFocus) { this.ctx.strokeStyle = Renderer.getArcColor(arc.distance) + '0.02)'; } else if (isArcFocus) { this.ctx.strokeStyle = Renderer.getArcColor(arc.distance) + '1.0)'; this.ctx.lineWidth = 1.5 / this.transform.k; } else { this.ctx.strokeStyle = Renderer.getArcColor(arc.distance) + baseAlpha + ')'; }
            const sx = coords[arc.source*2]; const sy = coords[arc.source*2+1]; const tx = coords[arc.target*2]; const ty = coords[arc.target*2+1];
            this.ctx.beginPath(); this.ctx.moveTo(sx, sy); this.ctx.quadraticCurveTo(centerX, centerY, tx, ty); this.ctx.stroke();
            if (isArcFocus) { this.ctx.lineWidth = Math.max(0.5 / this.transform.k, 0.1); }
        });
        this.ctx.lineWidth = 5 / this.transform.k; let lastBookId = -1; let bookColorToggle = false;
        for (let i = 0; i < numChapters; i++) {
            const ch = this.data.chapters[i];
            if (ch.bookId !== lastBookId) { bookColorToggle = !bookColorToggle; lastBookId = ch.bookId; }
            this.ctx.strokeStyle = bookColorToggle ? this.barLight : this.barDark; if (i === focusChapter) { this.ctx.strokeStyle = '#e94560'; }
            const angle1 = i * angleStep - Math.PI / 2; const angle2 = (i + 1) * angleStep - Math.PI / 2;
            this.ctx.beginPath(); this.ctx.arc(centerX, centerY, radius + 5/this.transform.k, angle1, angle2); this.ctx.stroke();
        }
        this.ctx.restore();
    }
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Renderer;
} else {
    window.Renderer = Renderer;
}
