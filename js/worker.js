const workerColorCache = new Map();

self.onmessage = function(e) {
    const { type, payload } = e.data;

    if (type === 'INIT') {
        self.canvas = payload.canvas;
        self.ctx = self.canvas.getContext('2d', { alpha: false });
        self.data = payload.data;
        self.bgDark = '#0f0f23';
    } else if (type === 'RENDER') {
        const { width, height, transform, visibleArcs, chapterPositions, hoveredChapter, pinnedChapter, hoveredArc } = payload;

        self.canvas.width = width;
        self.canvas.height = height;

        self.ctx.fillStyle = self.bgDark;
        self.ctx.fillRect(0, 0, width, height);

        if (!chapterPositions || chapterPositions.length === 0) return;

        self.ctx.save();
        self.ctx.translate(transform.x, transform.y);
        self.ctx.scale(transform.k, transform.k);

        const k = transform.k;
        const bottomY = height - 40;

        // Viewport culling boundaries
        const screenMinX = -transform.x / transform.k;
        const screenMaxX = (width - transform.x) / transform.k;

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
        const rYFactor = (bottomY - 20) / maxR;

        visibleArcs.forEach(arc => {
            const p1 = chapterPositions[arc.source].centerX;
            const p2 = chapterPositions[arc.target].centerX;

            const midX = (p1 + p2) / 2;
            const rX = Math.abs(p2 - p1) / 2;

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

            const rY = rX * rYFactor;

            self.ctx.beginPath();
            self.ctx.ellipse(midX, bottomY, rX, Math.max(rY, 1), 0, Math.PI, 0);
            self.ctx.stroke();

            if (isArcFocus) {
                self.ctx.lineWidth = Math.max(0.5 / k, 0.1);
            }
        });

        // 2. Draw Chapter Bars
        let lastBookId = -1;
        let bookColorToggle = false;
        const maxBarHeight = 30;
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
