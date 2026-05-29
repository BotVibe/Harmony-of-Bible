const workerColorCache = new Map();

self.onmessage = function(e) {
    const { type, payload } = e.data;

    if (type === 'INIT') {
        self.canvas = payload.canvas;
        self.ctx = self.canvas.getContext('2d', { alpha: false });
        self.data = payload.data;
        self.bgDark = '#0f0f23';
    } else if (type === 'RENDER') {
        const { width, height, transform, visibleArcs, chapterPositions, hoveredChapter, pinnedChapter, hoveredArc, viewMode } = payload;

        self.canvas.width = width;
        self.canvas.height = height;

        self.ctx.fillStyle = self.bgDark;
        self.ctx.fillRect(0, 0, width, height);

        if (viewMode !== 'map' && (!chapterPositions || chapterPositions.length === 0)) return;
        if (viewMode === 'map') {
            self.ctx.save();
            self.ctx.translate(transform.x, transform.y);
            self.ctx.scale(transform.k, transform.k);
            const cx = width / 2; const cy = height / 2;
            self.ctx.fillStyle = '#223344'; self.ctx.fillRect(-width, -height, width*3, height*3);
            self.ctx.fillStyle = '#112211'; self.ctx.beginPath(); self.ctx.moveTo(cx - 200, cy + 200); self.ctx.lineTo(cx - 150, cy); self.ctx.lineTo(cx - 50, cy - 100); self.ctx.lineTo(cx + 100, cy - 120); self.ctx.lineTo(cx + 300, cy + 50); self.ctx.lineTo(cx + 300, cy + 300); self.ctx.lineTo(cx - 200, cy + 300); self.ctx.fill();
            self.ctx.fillStyle = '#e94560'; self.ctx.beginPath(); self.ctx.arc(cx - 80, cy + 20, 5/transform.k, 0, Math.PI*2); self.ctx.fill();
            self.ctx.fillStyle = '#ffffff'; self.ctx.font = `${12/transform.k}px Arial`; self.ctx.fillText("Jerusalem (Mock)", cx - 70, cy + 25);
            self.ctx.fillStyle = 'rgba(255,255,255,0.7)'; self.ctx.font = `${16/transform.k}px Arial`; self.ctx.fillText("Geo-Daten nicht lokal verfügbar.", cx - 150, cy - 150);
            self.ctx.restore();
            return;
        }

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
            self.ctx.fillStyle = '#16213e'; self.ctx.fillRect(offsetX, offsetY, size, size);
            self.ctx.strokeStyle = '#2a2a4e'; self.ctx.lineWidth = 1 / transform.k; self.ctx.strokeRect(offsetX, offsetY, size, size);
            const focusChapter = pinnedChapter !== null ? pinnedChapter : hoveredChapter;

            function getArcColor(distance) {
                if (typeof distance !== 'number' || isNaN(distance)) return 'hsla(0, 0%, 50%, ';
                const validDistance = Math.max(0, distance);
                if (workerColorCache.has(validDistance)) return workerColorCache.get(validDistance);
                const norm = Math.min(validDistance / 1189, 1);
                let hue;
                if (norm < 0.1) hue = 270 - (norm / 0.1) * 30;
                else if (norm < 0.4) hue = 240 - ((norm - 0.1) / 0.3) * 180;
                else hue = 60 - ((norm - 0.4) / 0.6) * 60;
                const colorStr = `hsla(${hue}, 100%, 50%, `;
                workerColorCache.set(validDistance, colorStr);
                return colorStr;
            }
            visibleArcs.forEach(arc => {
                const sx = offsetX + arc.source * cellSize;
                const sy = offsetY + arc.target * cellSize;
                const isArcFocus = (focusChapter !== null && (arc.source === focusChapter || arc.target === focusChapter)) || (hoveredArc !== null && hoveredArc.source === arc.source && hoveredArc.target === arc.target);
                self.ctx.fillStyle = getArcColor(arc.distance) + '1.0)';
                let currentCellSize = cellSize;
                if (isArcFocus) { self.ctx.fillStyle = '#ffffff'; currentCellSize = cellSize * 2; } else { currentCellSize = Math.max(cellSize, 1 / transform.k); }
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
            const centerX = width / 2; const centerY = height / 2;
            const radius = Math.min(width, height) / 2 - 60;
            const numChapters = chapterPositions.length;
            const angleStep = (Math.PI * 2) / numChapters;
            const focusChapter = pinnedChapter !== null ? pinnedChapter : hoveredChapter;
            const isHovering = focusChapter !== null || hoveredArc !== null;
            const coords = new Float32Array(numChapters * 2);
            for(let i=0; i<numChapters; i++) {
                const angle = i * angleStep - Math.PI / 2;
                coords[i*2] = centerX + Math.cos(angle) * radius;
                coords[i*2+1] = centerY + Math.sin(angle) * radius;
            }
            function getArcColor(distance) {
                if (typeof distance !== 'number' || isNaN(distance)) return 'hsla(0, 0%, 50%, ';
                const validDistance = Math.max(0, distance);
                if (workerColorCache.has(validDistance)) return workerColorCache.get(validDistance);
                const norm = Math.min(validDistance / 1189, 1);
                let hue;
                if (norm < 0.1) hue = 270 - (norm / 0.1) * 30;
                else if (norm < 0.4) hue = 240 - ((norm - 0.1) / 0.3) * 180;
                else hue = 60 - ((norm - 0.4) / 0.6) * 60;
                const colorStr = `hsla(${hue}, 100%, 50%, `;
                workerColorCache.set(validDistance, colorStr);
                return colorStr;
            }
            self.ctx.lineWidth = 0.5 / transform.k;
            let baseAlpha = 0.1;
            if (transform.k > 2) baseAlpha = 0.3;
            visibleArcs.forEach(arc => {
                const isArcFocus = (focusChapter !== null && (arc.source === focusChapter || arc.target === focusChapter)) || (hoveredArc !== null && hoveredArc.source === arc.source && hoveredArc.target === arc.target);
                if (isHovering && !isArcFocus) {
                    self.ctx.strokeStyle = getArcColor(arc.distance) + '0.02)';
                } else if (isArcFocus) {
                    self.ctx.strokeStyle = getArcColor(arc.distance) + '1.0)';
                    self.ctx.lineWidth = 1.5 / transform.k;
                } else {
                    self.ctx.strokeStyle = getArcColor(arc.distance) + baseAlpha + ')';
                }
                const sx = coords[arc.source*2]; const sy = coords[arc.source*2+1];
                const tx = coords[arc.target*2]; const ty = coords[arc.target*2+1];
                self.ctx.beginPath(); self.ctx.moveTo(sx, sy); self.ctx.quadraticCurveTo(centerX, centerY, tx, ty); self.ctx.stroke();
                if (isArcFocus) { self.ctx.lineWidth = Math.max(0.5 / transform.k, 0.1); }
            });
            self.ctx.lineWidth = 5 / transform.k;
            let lastBookId = -1; let bookColorToggle = false;
            for (let i = 0; i < numChapters; i++) {
                const ch = self.data.chapters[i];
                if (ch.bookId !== lastBookId) { bookColorToggle = !bookColorToggle; lastBookId = ch.bookId; }
                self.ctx.strokeStyle = bookColorToggle ? '#444455' : '#222233';
                if (i === focusChapter) { self.ctx.strokeStyle = '#e94560'; }
                const angle1 = i * angleStep - Math.PI / 2; const angle2 = (i + 1) * angleStep - Math.PI / 2;
                self.ctx.beginPath(); self.ctx.arc(centerX, centerY, radius + 5/transform.k, angle1, angle2); self.ctx.stroke();
            }
            self.ctx.restore();
            return;
        }

        self.ctx.save();
        self.ctx.translate(transform.x, 0);
        self.ctx.scale(transform.k, transform.k);

        const k = transform.k;
        const bottomY = (height - 80) / k;

        // Viewport culling boundaries
        const screenMinX = -transform.x / k;
        const screenMaxX = (width - transform.x) / k;

        const focusChapter = pinnedChapter !== null ? pinnedChapter : hoveredChapter;
        const isHovering = focusChapter !== null || hoveredArc !== null;

        let baseAlpha = 0.15;
        if (k > 5) baseAlpha = 0.3;
        if (k > 10) baseAlpha = 0.5;

        self.ctx.lineWidth = Math.max(0.5 / k, 0.1);

        // Helper function for color
        function getArcColor(distance) {
            if (typeof distance !== 'number' || isNaN(distance)) {
                return 'hsla(0, 0%, 50%, ';
            }
            const validDistance = Math.max(0, distance);
            if (workerColorCache.has(validDistance)) {
                return workerColorCache.get(validDistance);
            }

            const norm = Math.min(validDistance / 1189, 1);
            let hue;
            if (norm < 0.1) hue = 270 - (norm / 0.1) * 30;
            else if (norm < 0.4) hue = 240 - ((norm - 0.1) / 0.3) * 180;
            else hue = 60 - ((norm - 0.4) / 0.6) * 60;
            const colorStr = `hsla(${hue}, 100%, 50%, `;
            workerColorCache.set(validDistance, colorStr);
            return colorStr;
        }

        // Hoist invariant calculations out of the hot loop
        const maxR = (chapterPositions[chapterPositions.length-1].centerX - chapterPositions[0].centerX) / 2;

        visibleArcs.forEach(arc => {
            const midX = arc.midX;
            const rX = arc.rX;

            // Viewport culling check
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

        // 2. Draw Chapter Bars
        let lastBookId = -1;
        let bookColorToggle = false;
        const maxBarHeight = 60 / k;
        const barLight = '#444455';
        const barDark = '#222233';

        self.data.chapters.forEach((ch, idx) => {
            const pos = chapterPositions[idx];

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
                self.ctx.fillStyle = '#ffffff'; // Gen and Matt
            } else {
                self.ctx.fillStyle = bookColorToggle ? barLight : barDark;
            }

            // Highlight hovered/pinned chapter
            if (idx === focusChapter) {
                self.ctx.fillStyle = '#e94560';
            }

            // Bar height proportional to verses
            // max verses in a chapter is Ps 119 (176 verses)
            const h = (ch.verses / 176) * maxBarHeight;

            // Prevent bar from getting too wide/narrow visually
            let drawWidth = pos.width;
            if (drawWidth * k < 1) {
                drawWidth = 1 / k; // Min 1px wide on screen
            }

            self.ctx.fillRect(pos.x, bottomY, drawWidth, h);

            // Labels at high zoom
            if (k > 5 && ch.chapterNum === 1) {
                self.ctx.save();
                self.ctx.fillStyle = '#ffffff';
                // Adjust font size inversely to zoom to keep it readable but not huge
                const fontSize = Math.max(10 / k, 2);
                self.ctx.font = `${fontSize}px sans-serif`;
                self.ctx.translate(pos.x, bottomY + h + (5/k));
                self.ctx.rotate(Math.PI / 4);
                self.ctx.fillText(ch.shortName, 0, 0);
                self.ctx.restore();
            }
        });

        self.ctx.restore();
    }
};
