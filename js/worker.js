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
            const norm = Math.min(validDistance / 1189, 1);
            let hue;
            if (norm < 0.1) hue = 270 - (norm / 0.1) * 30;
            else if (norm < 0.4) hue = 240 - ((norm - 0.1) / 0.3) * 180;
            else hue = 60 - ((norm - 0.4) / 0.6) * 60;
            return `hsla(${hue}, 100%, 50%, `;
        }

        visibleArcs.forEach(arc => {
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

            const p1 = chapterPositions[arc.source].centerX;
            const p2 = chapterPositions[arc.target].centerX;

            const midX = (p1 + p2) / 2;
            const rX = Math.abs(p2 - p1) / 2;
            const maxR = (chapterPositions[chapterPositions.length-1].centerX - chapterPositions[0].centerX) / 2;
            const rY = (rX / maxR) * (bottomY - 20);

            self.ctx.beginPath();
            self.ctx.ellipse(midX, bottomY, rX, Math.max(rY, 1), 0, Math.PI, 0);
            self.ctx.stroke();

            if (isArcFocus) {
                self.ctx.lineWidth = Math.max(0.5 / k, 0.1);
            }
        });

        self.ctx.restore();
    }
};
