class App {
    constructor() {
        this.dataLoader = new DataLoader();
        this.data = null;
        this.renderer = null;
        this.search = null;

        // UI Elements
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.loadingText = document.getElementById('loading-text');
        this.tooltip = document.getElementById('tooltip');
        this.sidebarToggle = document.getElementById('sidebar-toggle');
        this.sidebar = document.getElementById('sidebar');
        this.searchError = document.getElementById('search-error');

        this.lang = 'de'; // Default language

        this.init();
    }

    async init() {
        try {
            this.data = await this.dataLoader.loadData((progress, text) => {
                this.loadingText.textContent = `${text} (${progress}%)`;
            });

            this.loadingOverlay.classList.add('hidden');

            // Initialize components
            this.renderer = new Renderer('viz-canvas', this.data);
            this.search = new Search(this.data);
        this.stats = new StatsCharts();

            this.setupUI();
            this.setupInteractivity();
            this.updateStats();

        } catch (err) {
            console.error(err);
            this.loadingText.textContent = 'Fehler beim Laden der Daten.';
        }
    }

    setupUI() {
        // Populate book filter
        const bookFilter = document.getElementById('book-filter');
        this.data.books.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.id;
            opt.textContent = this.lang === 'de' ? b.nameDE : b.name;
            bookFilter.appendChild(opt);
        });

        // Setup filter listeners
        bookFilter.addEventListener('change', (e) => {
            this.updateFilters({ book: e.target.value });
        });

        const distFilter = document.getElementById('distance-filter');
        const distValue = document.getElementById('distance-value');
        distFilter.addEventListener('input', (e) => {
            distValue.textContent = e.target.value;
            this.updateFilters({ distance: parseInt(e.target.value) });
        });

        const testButtons = document.querySelectorAll('#testament-filters button');
        testButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                testButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.updateFilters({ testament: e.target.dataset.filter });
            });
        });

        document.getElementById('group-filter').addEventListener('change', (e) => {
            this.updateFilters({ group: e.target.value });
        });

        document.getElementById('reset-zoom').addEventListener('click', () => {
            d3.select('#viz-canvas').transition().duration(750).call(
                this.zoom.transform, d3.zoomIdentity
            );
        });

        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                const chapterIdx = this.search.parseQuery(e.target.value);
                if (chapterIdx !== null) {
                    this.renderer.setPinnedChapter(chapterIdx);
                    this.updateSidebarForChapter(chapterIdx);
                    if (this.sidebar.classList.contains('collapsed')) {
                        this.sidebar.classList.remove('collapsed');
                        this.sidebarToggle.textContent = '▶';
                    }
                    this.hideSearchError();
                } else {
                    this.showSearchError(this.lang === 'de' ? 'Kapitel nicht gefunden.' : 'Chapter not found.');
                }
            }
        });

        searchInput.addEventListener('input', () => {
            this.hideSearchError();
        });

        document.getElementById('lang-toggle').addEventListener('click', (e) => {
            this.lang = this.lang === 'de' ? 'en' : 'de';
            e.target.textContent = this.lang.toUpperCase();
            // Re-populate books
            Array.from(bookFilter.options).forEach((opt, idx) => {
                if (idx > 0) { // Skip "All"
                    opt.textContent = this.lang === 'de' ? this.data.books[idx-1].nameDE : this.data.books[idx-1].name;
                }
            });
            this.renderer.render(); // Re-render to update labels if implemented
            if (this.renderer.pinnedChapter !== null) {
                this.updateSidebarForChapter(this.renderer.pinnedChapter);
            }
            this.hideSearchError();
        });

        this.sidebarToggle.addEventListener('click', () => {
            this.sidebar.classList.toggle('collapsed');
            this.sidebarToggle.textContent = this.sidebar.classList.contains('collapsed') ? '◀' : '▶';
        });
    }

    updateFilters(filters) {
        const count = this.renderer.setFilters(filters);
        document.getElementById('stat-visible-arcs').textContent = count.toLocaleString();
    }

    setupInteractivity() {
        const canvas = d3.select('#viz-canvas');

        // D3 Zoom behavior
        this.zoom = d3.zoom()
            .scaleExtent([1, 20])
            .translateExtent([[0, 0], [this.renderer.width, this.renderer.height]])
            .on('zoom', (e) => {
                this.renderer.setTransform(e.transform);
                this.hideTooltip();
            });

        canvas.call(this.zoom);

        // Mouse move for hover (debounce slightly with requestAnimationFrame)
        let isTicking = false;
        canvas.on('mousemove', (e) => {
            if (!isTicking) {
                window.requestAnimationFrame(() => {
                    this.handleMouseMove(e);
                    isTicking = false;
                });
                isTicking = true;
            }
        });

        canvas.on('mouseout', () => {
            this.renderer.setHoveredChapter(null);
            this.hideTooltip();
        });

        canvas.on('click', (e) => {
            const rect = this.renderer.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Check if clicked in bottom area (bars)
            const isBottomArea = mouseY > this.renderer.height - 80;
            if (isBottomArea) {
                const chapterIdx = this.renderer.getChapterAtScreenPos(mouseX);
                if (chapterIdx !== null) {
                    if (this.renderer.pinnedChapter === chapterIdx) {
                        this.renderer.setPinnedChapter(null);
                        document.getElementById('chapter-details').classList.add('hidden');
                    } else {
                        this.renderer.setPinnedChapter(chapterIdx);
                        this.updateSidebarForChapter(chapterIdx);
                        if (this.sidebar.classList.contains('collapsed')) {
                            this.sidebar.classList.remove('collapsed');
                            this.sidebarToggle.textContent = '▶';
                        }
                    }
                }
            }
        });
    }

    handleMouseMove(e) {
        const rect = this.renderer.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const isBottomArea = mouseY > this.renderer.height - 80;

        if (isBottomArea) {
            this.renderer.setHoveredArc(null);
            const chapterIdx = this.renderer.getChapterAtScreenPos(mouseX);
            if (chapterIdx !== null) {
                this.renderer.setHoveredChapter(chapterIdx);
                this.showChapterTooltip(chapterIdx, e.clientX, e.clientY);
                return;
            }
        } else {
            this.renderer.setHoveredChapter(null);
            const hoveredArc = this.renderer.getArcAtScreenPos(mouseX, mouseY);
            if (hoveredArc) {
                this.renderer.setHoveredArc(hoveredArc);
                this.showArcTooltip(hoveredArc, e.clientX, e.clientY);
                return;
            }
        }

        this.renderer.setHoveredChapter(null);
        this.renderer.setHoveredArc(null);
        this.hideTooltip();
    }

    showArcTooltip(arc, x, y) {
        const sCh = this.data.chapters[arc.source];
        const tCh = this.data.chapters[arc.target];

        const sBookName = this.lang === 'de' ? sCh.bookNameDE : sCh.bookName;
        const tBookName = this.lang === 'de' ? tCh.bookNameDE : tCh.bookName;

        this.tooltip.textContent = '';
        const strong = document.createElement('strong');
        strong.textContent = `${sBookName} ${sCh.chapterNum} ↔ ${tBookName} ${tCh.chapterNum}`;
        this.tooltip.appendChild(strong);
        this.tooltip.appendChild(document.createElement('br'));
        this.tooltip.appendChild(document.createTextNode(`Distanz: ${arc.distance} Kapitel`));
        this.tooltip.style.left = x + 'px';
        this.tooltip.style.top = (y - 50) + 'px';
        this.tooltip.classList.remove('hidden');
    }

    showChapterTooltip(idx, x, y) {
        const ch = this.data.chapters[idx];
        const bookName = this.lang === 'de' ? ch.bookNameDE : ch.bookName;

        this.tooltip.textContent = '';
        const strong = document.createElement('strong');
        strong.textContent = `${bookName} ${ch.chapterNum}`;
        this.tooltip.appendChild(strong);
        this.tooltip.appendChild(document.createElement('br'));
        this.tooltip.appendChild(document.createTextNode(`Verse: ${ch.verses}`));
        this.tooltip.appendChild(document.createElement('br'));
        this.tooltip.appendChild(document.createTextNode(`Querverweise: ${ch.arcsCount}`));
        this.tooltip.style.left = x + 'px';
        this.tooltip.style.top = y - 20 + 'px';
        this.tooltip.classList.remove('hidden');
    }

    hideTooltip() {
        this.tooltip.classList.add('hidden');
    }

    updateStats() {
        document.getElementById('stat-visible-arcs').textContent = this.data.arcs.length.toLocaleString();
        this.stats.render(this.data);
    }

    showSearchError(message) {
        this.searchError.textContent = message;
        this.searchError.classList.remove('hidden');
    }

    hideSearchError() {
        this.searchError.classList.add('hidden');
    }

    updateSidebarForChapter(idx) {
        const ch = this.data.chapters[idx];
        const details = document.getElementById('chapter-details');
        const info = document.getElementById('chapter-info');
        const list = document.getElementById('chapter-links-list');

        const bookName = this.lang === 'de' ? ch.bookNameDE : ch.bookName;
        info.textContent = '';
        const strongInfo = document.createElement('strong');
        strongInfo.textContent = `${bookName} ${ch.chapterNum}`;
        info.appendChild(strongInfo);
        info.appendChild(document.createElement('br'));
        info.appendChild(document.createTextNode(`Verse: ${ch.verses}`));
        info.appendChild(document.createElement('br'));
        info.appendChild(document.createTextNode(`Verweise: ${ch.arcsCount}`));

        list.innerHTML = '';

        // Find all arcs connected to this chapter
        const connectedArcs = this.data.arcs.filter(a => a.source === idx || a.target === idx);

        // Group by target chapter
        connectedArcs.forEach(arc => {
            const targetIdx = arc.source === idx ? arc.target : arc.source;
            const targetCh = this.data.chapters[targetIdx];
            const targetBookName = this.lang === 'de' ? targetCh.bookNameDE : targetCh.bookName;

            const li = document.createElement('li');
            li.textContent = `↔ ${targetBookName} ${targetCh.chapterNum}`;
            li.addEventListener('click', () => {
                this.renderer.setPinnedChapter(targetIdx);
                this.updateSidebarForChapter(targetIdx);
                // Try to center the selected chapter
                const pos = this.renderer.chapterPositions[targetIdx];
                const x = -pos.centerX * this.renderer.transform.k + this.renderer.width / 2;
                d3.select('#viz-canvas').transition().duration(750).call(
                    this.zoom.transform, d3.zoomIdentity.translate(x, 0).scale(this.renderer.transform.k)
                );
            });
            list.appendChild(li);
        });

        details.classList.remove('hidden');
    }
}

// Start App
window.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
