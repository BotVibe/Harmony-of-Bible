/**
 * Shared color helpers used by the main-thread renderer and the OffscreenCanvas worker.
 * Loaded via <script> on the page and importScripts() in the worker.
 */
(function (root) {
    const colorCache = new Map();

    function getArcColor(distance) {
        if (typeof distance !== 'number' || isNaN(distance)) {
            return 'hsla(0, 0%, 50%, ';
        }

        const validDistance = Math.max(0, distance);

        if (colorCache.has(validDistance)) {
            return colorCache.get(validDistance);
        }

        const norm = Math.min(validDistance / 1189, 1);

        let hue;
        if (norm < 0.1) {
            hue = 270 - (norm / 0.1) * 30;
        } else if (norm < 0.4) {
            hue = 240 - ((norm - 0.1) / 0.3) * 180;
        } else {
            hue = 60 - ((norm - 0.4) / 0.6) * 60;
        }

        const colorStr = `hsla(${hue}, 100%, 50%, `;
        colorCache.set(validDistance, colorStr);
        return colorStr;
    }

    root.getArcColor = getArcColor;
    root.__arcColorCache = colorCache;
})(typeof self !== 'undefined' ? self : globalThis);
