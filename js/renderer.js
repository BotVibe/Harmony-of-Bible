class Renderer {
    constructor(canvasId, data) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d', { alpha: false });
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
            // Make foreground canvas transparent
            this.ctx = this.canvas.getContext('2d');

            const offscreen = this.bgCanvas.transferControlToOffscreen();
            this.worker = new Worker('js/worker.js');
            this.worker.postMessage({
                type: 'INIT',
                payload: { canvas: offscreen, data: this.data }
            }, [offscreen]);
        }

        // State
        this.width = 0;
        this.height = 0;
        this.transform = d3.zoomIdentity;

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
        this.arcPaths = []; // For spatial indexing

        this.init();
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

        // Handle high DPI displays
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.ctx.scale(dpr, dpr);

        this.calculatePositions();
        this.render();
    }

    setTransform(transform) {
        this.transform = transform;
        this.render();
    }

    setFilters(filters) {
        this.filters = { ...this.filters, ...filters };
        this.applyFilters();
        this.render();
        return this.visibleArcs.length;
    }

    setHoveredChapter(idx) {
        if (this.hoveredChapter !== idx) {
            this.hoveredChapter = idx;
            this.render();
        }
    }

    setHoveredArc(arc) {
        if (this.hoveredArc !== arc) {
            this.hoveredArc = arc;
            this.render();
        }
    }

    setPinnedChapter(idx) {
        this.pinnedChapter = idx;
        this.render();
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
        this.buildSpatialIndex();
    }

    buildSpatialIndex() {
        if (!this.visibleArcs || !this.chapterPositions || this.chapterPositions.length === 0) return;

        const GRID_SIZE = 50;
        this.arcSpatialIndex = Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE }, () => []));

        const maxR = (this.chapterPositions[this.chapterPositions.length-1].centerX - this.chapterPositions[0].centerX) / 2;
        this.spatialMaxR = maxR;

        this.visibleArcs.forEach(arc => {
            const p1 = this.chapterPositions[arc.source].centerX;
            const p2 = this.chapterPositions[arc.target].centerX;

            const midX = (p1 + p2) / 2;
            const rX = Math.abs(p2 - p1) / 2;

            let binX = Math.floor((midX / this.width) * GRID_SIZE);
            if (binX < 0) binX = 0;
            if (binX >= GRID_SIZE) binX = GRID_SIZE - 1;

            let binY = Math.floor((rX / maxR) * GRID_SIZE);
            if (binY < 0) binY = 0;
            if (binY >= GRID_SIZE) binY = GRID_SIZE - 1;

            this.arcSpatialIndex[binX][binY].push(arc);
        });
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
        const rY = Math.max((rX / maxR) * (bottomY - 20), 1);

        if (worldX < midX - rX - threshold || worldX > midX + rX + threshold) return null;
        if (worldY < bottomY - rY - threshold) return null;

        const arcDx = (worldX - midX) / rX;
        const arcDy = (worldY - bottomY) / rY;
        const distFromCenter = Math.sqrt(arcDx * arcDx + arcDy * arcDy);

        const normDist = Math.abs(distFromCenter - 1);
        const approxPixelDist = normDist * Math.min(rX, rY);

        if (approxPixelDist < threshold) {
            return approxPixelDist;
        }
        return null;
    }

    static colorCache = new Map();

    static getArcColor(distance) {
        if (typeof distance !== 'number' || isNaN(distance)) {
            return 'hsla(0, 0%, 50%, ';
        }

        // Normalised distance 0 - 1189, handle negative distances
        const validDistance = Math.max(0, distance);

        if (Renderer.colorCache.has(validDistance)) {
            return Renderer.colorCache.get(validDistance);
        }

        const norm = Math.min(validDistance / 1189, 1);

        // HSL from 270 (Purple) to 0 (Red)
        // 0-10% -> 270 to 240 (Purple to Blue)
        // 10-40% -> 240 to 120 (Blue to Green) to 60 (Yellow)
        // 40-100% -> 60 to 0 (Yellow to Red)

        let hue;
        if (norm < 0.1) {
            // 0 -> 270, 0.1 -> 240
            hue = 270 - (norm / 0.1) * 30;
        } else if (norm < 0.4) {
            // 0.1 -> 240, 0.4 -> 60
            hue = 240 - ((norm - 0.1) / 0.3) * 180;
        } else {
            // 0.4 -> 60, 1.0 -> 0
            hue = 60 - ((norm - 0.4) / 0.6) * 60;
        }

        const colorStr = `hsla(${hue}, 100%, 50%, `;
        Renderer.colorCache.set(validDistance, colorStr);
        return colorStr;
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

        this.ctx.save();

        // Apply transform
        this.ctx.translate(this.transform.x, this.transform.y);
        this.ctx.scale(this.transform.k, this.transform.k);

        const k = this.transform.k;

        // Base line / X-axis config
        const bottomY = this.height - 40;
        const maxBarHeight = 30; // Max height for a chapter bar

        // Viewport culling boundaries
        const screenMinX = -this.transform.x / this.transform.k;
        const screenMaxX = (this.width - this.transform.x) / this.transform.k;

        // 1. Draw Arcs
        const focusChapter = this.pinnedChapter !== null ? this.pinnedChapter : this.hoveredChapter;
        const isHovering = focusChapter !== null || this.hoveredArc !== null;

        if (this.useWorker) {
            this.worker.postMessage({
                type: 'RENDER',
                payload: {
                    width: this.width,
                    height: this.height,
                    transform: this.transform,
                    visibleArcs: this.visibleArcs,
                    chapterPositions: this.chapterPositions,
                    hoveredChapter: this.hoveredChapter,
                    pinnedChapter: this.pinnedChapter,
                    hoveredArc: this.hoveredArc
                }
            });
        } else {
            // LOD Check
            // If high zoom, we can render thicker lines, lower alpha
            let baseAlpha = 0.15;
            if (k > 5) baseAlpha = 0.3;
            if (k > 10) baseAlpha = 0.5;

            this.ctx.lineWidth = 0.5 / k; // keep line width somewhat constant in screen space
            if (this.ctx.lineWidth < 0.1) this.ctx.lineWidth = 0.1;

            // Hoist invariant calculations out of the hot loop
            const maxR = (this.chapterPositions[this.chapterPositions.length-1].centerX - this.chapterPositions[0].centerX) / 2;
            const rYFactor = (bottomY - 20) / maxR;

            this.visibleArcs.forEach(arc => {
                const p1 = this.chapterPositions[arc.source].centerX;
                const p2 = this.chapterPositions[arc.target].centerX;

                const midX = (p1 + p2) / 2;
                const rX = Math.abs(p2 - p1) / 2;

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

                // Arc height depends on distance, max height is ~70% of available space above axis
                const rY = rX * rYFactor;

                this.ctx.beginPath();
                this.ctx.ellipse(midX, bottomY, rX, Math.max(rY, 1), 0, Math.PI, 0);
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
        const worldY = (mouseY - this.transform.y) / this.transform.k;

        const bottomY = this.height - 40;
        if (worldY > bottomY) return null;

        const maxR = this.spatialMaxR || (this.chapterPositions[this.chapterPositions.length-1].centerX - this.chapterPositions[0].centerX) / 2;
        const C = (bottomY - 20) / maxR;
        const threshold = 5 / this.transform.k;

        const dy = worldY - bottomY;
        const D2 = (dy / C) * (dy / C);

        const GRID_SIZE = 50;
        const binWidth = this.width / GRID_SIZE;
        const binHeight = maxR / GRID_SIZE;

        const rxTolerance = threshold / Math.min(1, C) + 2; // +2 for safety

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
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Renderer;
} else {
    window.Renderer = Renderer;
}
