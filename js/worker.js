importScripts('shared.js');

self.onmessage = function(e) {
    const { type, payload } = e.data;

    if (type === 'INIT') {
        self.canvas = payload.canvas;
        self.ctx = self.canvas.getContext('2d', { alpha: false });
        self.data = payload.data;
        self.bgDark = '#0f0f23';
        self.visibleIndices = null; // null => all arcs
        self.chapterPositions = [];
        self.dpr = 1;
        return;
    }

    if (type === 'SET_VISIBLE') {
        self.visibleIndices = payload.indices; // Uint32Array or null for all
        return;
    }

    if (type === 'UPDATE_LAYOUT') {
        self.chapterPositions = payload.chapterPositions;
        // Precompute arc geometry on resident arc objects
        if (self.data && self.data.arcs && self.chapterPositions && self.chapterPositions.length) {
            for (let i = 0; i < self.data.arcs.length; i++) {
                const arc = self.data.arcs[i];
                const p1 = self.chapterPositions[arc.source].centerX;
                const p2 = self.chapterPositions[arc.target].centerX;
                arc.midX = (p1 + p2) / 2;
                arc.rX = Math.abs(p2 - p1) / 2;
            }
        }
        return;
    }

    if (type !== 'RENDER') return;

    const { width, height, transform, hoveredChapter, pinnedChapter, hoveredArc, viewMode, dpr } = payload;
    const chapterPositions = self.chapterPositions;
    const arcs = self.data ? self.data.arcs : [];
    const devicePixelRatio = dpr || 1;

    self.canvas.width = Math.max(1, Math.floor(width * devicePixelRatio));
    self.canvas.height = Math.max(1, Math.floor(height * devicePixelRatio));
    self.ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

    self.ctx.fillStyle = self.bgDark;
    self.ctx.fillRect(0, 0, width, height);

    function forEachVisible(fn) {
        if (self.visibleIndices) {
            for (let i = 0; i < self.visibleIndices.length; i++) {
                fn(arcs[self.visibleIndices[i]]);
            }
        } else {
            for (let i = 0; i < arcs.length; i++) {
                fn(arcs[i]);
            }
        }
    }

    if (viewMode === 'map') {
        self.ctx.save();
        self.ctx.translate(transform.x, transform.y);
        self.ctx.scale(transform.k, transform.k);
        const cx = width / 2;
        const cy = height / 2;
        self.ctx.fillStyle = '#223344';
        self.ctx.fillRect(-width, -height, width * 3, height * 3);
        self.ctx.fillStyle = '#112211';
        self.ctx.beginPath();
        self.ctx.moveTo(cx - 200, cy + 200);
        self.ctx.lineTo(cx - 150, cy);
        self.ctx.lineTo(cx - 50, cy - 100);
        self.ctx.lineTo(cx + 100, cy - 120);
        self.ctx.lineTo(cx + 300, cy + 50);
        self.ctx.lineTo(cx + 300, cy + 300);
        self.ctx.lineTo(cx - 200, cy + 300);
        self.ctx.fill();
        self.ctx.fillStyle = '#e94560';
        self.ctx.beginPath();
        self.ctx.arc(cx - 80, cy + 20, 5 / transform.k, 0, Math.PI * 2);
        self.ctx.fill();
        self.ctx.fillStyle = '#ffffff';
        self.ctx.font = `${12 / transform.k}px Arial`;
        self.ctx.fillText('Jerusalem (Mock)', cx - 70, cy + 25);
        self.ctx.fillStyle = 'rgba(255,255,255,0.7)';
        self.ctx.font = `${16 / transform.k}px Arial`;
        self.ctx.fillText('Geo-Daten nicht lokal verfügbar.', cx - 150, cy - 150);
        self.ctx.restore();
        return;
    }

    if (viewMode !== 'map' && (!chapterPositions || chapterPositions.length === 0)) return;

    if (viewMode === 'matrix') {
        self.ctx.save();
        const numChapters = chapterPositions.length;
        const padding = 40;
        const size = Math.min(width, height) - padding * 2;
        const cellSize = size / numChapters;
        const offsetX = (width - size) / 2;
        const offsetY = (height - size) / 2;
        self.ctx.translate(transform.x, transform.y);
        self.ctx.scale(transform.k, transform.k);
        self.ctx.fillStyle = '#16213e';
        self.ctx.fillRect(offsetX, offsetY, size, size);
        self.ctx.strokeStyle = '#2a2a4e';
        self.ctx.lineWidth = 1 / transform.k;
        self.ctx.strokeRect(offsetX, offsetY, size, size);
        const focusChapter = pinnedChapter !== null ? pinnedChapter : hoveredChapter;

        forEachVisible(arc => {
            const sx = offsetX + arc.source * cellSize;
            const sy = offsetY + arc.target * cellSize;
            const isArcFocus = (focusChapter !== null && (arc.source === focusChapter || arc.target === focusChapter)) ||
                (hoveredArc !== null && hoveredArc.source === arc.source && hoveredArc.target === arc.target);
            self.ctx.fillStyle = getArcColor(arc.distance) + '1.0)';
            let currentCellSize = cellSize;
            if (isArcFocus) {
                self.ctx.fillStyle = '#ffffff';
                currentCellSize = cellSize * 2;
            } else {
                currentCellSize = Math.max(cellSize, 1 / transform.k);
            }
            self.ctx.fillRect(sx, sy, currentCellSize, currentCellSize);
            self.ctx.fillRect(offsetX + arc.target * cellSize, offsetY + arc.source * cellSize, currentCellSize, currentCellSize);
        });
        self.ctx.restore();
        return;
    }

    if (viewMode === 'chord') {
        self.ctx.save();
        self.ctx.translate(transform.x, transform.y);
        self.ctx.scale(transform.k, transform.k);
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 60;
        const numChapters = chapterPositions.length;
        const angleStep = (Math.PI * 2) / numChapters;
        const focusChapter = pinnedChapter !== null ? pinnedChapter : hoveredChapter;
        const isHovering = focusChapter !== null || hoveredArc !== null;
        const coords = new Float32Array(numChapters * 2);
        for (let i = 0; i < numChapters; i++) {
            const angle = i * angleStep - Math.PI / 2;
            coords[i * 2] = centerX + Math.cos(angle) * radius;
            coords[i * 2 + 1] = centerY + Math.sin(angle) * radius;
        }
        self.ctx.lineWidth = 0.5 / transform.k;
        let baseAlpha = 0.1;
        if (transform.k > 2) baseAlpha = 0.3;
        forEachVisible(arc => {
            const isArcFocus = (focusChapter !== null && (arc.source === focusChapter || arc.target === focusChapter)) ||
                (hoveredArc !== null && hoveredArc.source === arc.source && hoveredArc.target === arc.target);
            if (isHovering && !isArcFocus) {
                self.ctx.strokeStyle = getArcColor(arc.distance) + '0.02)';
            } else if (isArcFocus) {
                self.ctx.strokeStyle = getArcColor(arc.distance) + '1.0)';
                self.ctx.lineWidth = 1.5 / transform.k;
            } else {
                self.ctx.strokeStyle = getArcColor(arc.distance) + baseAlpha + ')';
            }
            const sx = coords[arc.source * 2];
            const sy = coords[arc.source * 2 + 1];
            const tx = coords[arc.target * 2];
            const ty = coords[arc.target * 2 + 1];
            self.ctx.beginPath();
            self.ctx.moveTo(sx, sy);
            self.ctx.quadraticCurveTo(centerX, centerY, tx, ty);
            self.ctx.stroke();
            if (isArcFocus) {
                self.ctx.lineWidth = Math.max(0.5 / transform.k, 0.1);
            }
        });
        self.ctx.lineWidth = 5 / transform.k;
        let lastBookId = -1;
        let bookColorToggle = false;
        for (let i = 0; i < numChapters; i++) {
            const ch = self.data.chapters[i];
            if (ch.bookId !== lastBookId) {
                bookColorToggle = !bookColorToggle;
                lastBookId = ch.bookId;
            }
            self.ctx.strokeStyle = bookColorToggle ? '#444455' : '#222233';
            if (i === focusChapter) {
                self.ctx.strokeStyle = '#e94560';
            }
            const angle1 = i * angleStep - Math.PI / 2;
            const angle2 = (i + 1) * angleStep - Math.PI / 2;
            self.ctx.beginPath();
            self.ctx.arc(centerX, centerY, radius + 5 / transform.k, angle1, angle2);
            self.ctx.stroke();
        }
        self.ctx.restore();
        return;
    }

    // Default: arc view
    self.ctx.save();
    self.ctx.translate(transform.x, 0);
    self.ctx.scale(transform.k, transform.k);

    const k = transform.k;
    const bottomY = (height - 80) / k;
    const screenMinX = -transform.x / k;
    const screenMaxX = (width - transform.x) / k;
    const focusChapter = pinnedChapter !== null ? pinnedChapter : hoveredChapter;
    const isHovering = focusChapter !== null || hoveredArc !== null;

    let baseAlpha = 0.15;
    if (k > 5) baseAlpha = 0.3;
    if (k > 10) baseAlpha = 0.5;

    self.ctx.lineWidth = Math.max(0.5 / k, 0.1);

    forEachVisible(arc => {
        const midX = arc.midX;
        const rX = arc.rX;

        if (midX + rX < screenMinX || midX - rX > screenMaxX) {
            return;
        }

        const isArcFocus = (focusChapter !== null && (arc.source === focusChapter || arc.target === focusChapter)) ||
            (hoveredArc !== null && hoveredArc.source === arc.source && hoveredArc.target === arc.target);

        if (isHovering && !isArcFocus) {
            self.ctx.strokeStyle = getArcColor(arc.distance) + '0.02)';
        } else if (isArcFocus) {
            self.ctx.strokeStyle = getArcColor(arc.distance) + '1.0)';
            self.ctx.lineWidth = (focusChapter !== null ? 1.5 : 2.0) / k;
        } else {
            self.ctx.strokeStyle = getArcColor(arc.distance) + baseAlpha + ')';
        }

        self.ctx.beginPath();
        self.ctx.arc(midX, bottomY, rX, Math.PI, 0);
        self.ctx.stroke();

        if (isArcFocus) {
            self.ctx.lineWidth = Math.max(0.5 / k, 0.1);
        }
    });

    let lastBookId = -1;
    let bookColorToggle = false;
    const maxBarHeight = 60 / k;
    const barLight = '#444455';
    const barDark = '#222233';

    self.data.chapters.forEach((ch, idx) => {
        const pos = chapterPositions[idx];

        if (pos.x + pos.width < screenMinX || pos.x > screenMaxX) {
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

        if (idx === 0 || (ch.shortName === 'Matt' && ch.chapterNum === 1)) {
            self.ctx.fillStyle = '#ffffff';
        } else {
            self.ctx.fillStyle = bookColorToggle ? barLight : barDark;
        }

        if (idx === focusChapter) {
            self.ctx.fillStyle = '#e94560';
        }

        const h = (ch.verses / 176) * maxBarHeight;
        let drawWidth = pos.width;
        if (drawWidth * k < 1) {
            drawWidth = 1 / k;
        }

        self.ctx.fillRect(pos.x, bottomY, drawWidth, h);

        if (k > 5 && ch.chapterNum === 1) {
            self.ctx.save();
            self.ctx.fillStyle = '#ffffff';
            const fontSize = Math.max(10 / k, 2);
            self.ctx.font = `${fontSize}px sans-serif`;
            self.ctx.translate(pos.x, bottomY + h + (5 / k));
            self.ctx.rotate(Math.PI / 4);
            self.ctx.fillText(ch.shortName, 0, 0);
            self.ctx.restore();
        }
    });

    self.ctx.restore();
};
