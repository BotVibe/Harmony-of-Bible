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

        this.translations = {
            de: {
                title: 'Die Harmonie der Bibel - 63.779 Querverweise',
                book: 'Buch:',
                allBooks: 'Alle Bücher',
                distance: 'Distanz (Kapitel):',
                allTestaments: 'Alle',
                onlyOT: 'Nur AT',
                onlyNT: 'Nur NT',
                crossTestament: 'AT ↔ NT',
                allGroups: 'Alle Gruppen',
                tora: 'Tora',
                historical: 'Historische Bücher',
                poetic: 'Poetische Bücher',
                prophets: 'Propheten',
                gospels: 'Evangelien',
                letters: 'Briefe',
                revelation: 'Offenbarung',
                searchPlaceholder: 'Suchen (z.B. Joh 3)',
                resetZoom: 'Reset Zoom',
                loading: 'Lade Daten...',
                legendNear: 'Nah',
                legendFar: 'Weit',
                statsTitle: 'Statistiken',
                visibleArcs: 'Sichtbare Bögen',
                topBooksTitle: 'Top 10 Bücher (Verbindungen)',
                testamentDistTitle: 'AT / NT Verteilung',
                chapterDetailsTitle: 'Kapitel Details',
                connectedChaptersTitle: 'Verbundene Kapitel:',
                chapterNotFound: 'Kapitel nicht gefunden.'
            },
            en: {
                title: 'Bible Cross-References',
                book: 'Book:',
                allBooks: 'All Books',
                distance: 'Distance (Chapters):',
                allTestaments: 'All',
                onlyOT: 'OT Only',
                onlyNT: 'NT Only',
                crossTestament: 'OT ↔ NT',
                allGroups: 'All Groups',
                tora: 'Torah',
                historical: 'Historical Books',
                poetic: 'Poetic Books',
                prophets: 'Prophets',
                gospels: 'Gospels',
                letters: 'Epistles',
                revelation: 'Revelation',
                searchPlaceholder: 'Search (e.g. Joh 3)',
                resetZoom: 'Reset Zoom',
                loading: 'Loading data...',
                legendNear: 'Near',
                legendFar: 'Far',
                statsTitle: 'Statistics',
                visibleArcs: 'Visible Arcs',
                topBooksTitle: 'Top 10 Books (Connections)',
                testamentDistTitle: 'OT / NT Distribution',
                chapterDetailsTitle: 'Chapter Details',
                connectedChaptersTitle: 'Connected Chapters:',
                chapterNotFound: 'Chapter not found.'
            },
            it: {
                title: 'Riferimenti Incrociati della Bibbia',
                book: 'Libro:',
                allBooks: 'Tutti i libri',
                distance: 'Distanza (Capitoli):',
                allTestaments: 'Tutti',
                onlyOT: 'Solo AT',
                onlyNT: 'Solo NT',
                crossTestament: 'AT ↔ NT',
                allGroups: 'Tutti i Gruppi',
                tora: 'Torah',
                historical: 'Libri Storici',
                poetic: 'Libri Poetici',
                prophets: 'Profeti',
                gospels: 'Vangeli',
                letters: 'Epistole',
                revelation: 'Apocalisse',
                searchPlaceholder: 'Cerca (es. Giov 3)',
                resetZoom: 'Reimposta Zoom',
                loading: 'Caricamento dati...',
                legendNear: 'Vicino',
                legendFar: 'Lontano',
                statsTitle: 'Statistiche',
                visibleArcs: 'Archi Visibili',
                topBooksTitle: 'I 10 Libri più Connessi',
                testamentDistTitle: 'Distribuzione AT / NT',
                chapterDetailsTitle: 'Dettagli Capitolo',
                connectedChaptersTitle: 'Capitoli Connessi:',
                chapterNotFound: 'Capitolo non trovato.'
            },
            fr: {
                title: 'Références Croisées de la Bible',
                book: 'Livre:',
                allBooks: 'Tous les livres',
                distance: 'Distance (Chapitres):',
                allTestaments: 'Tous',
                onlyOT: 'AT Seulement',
                onlyNT: 'NT Seulement',
                crossTestament: 'AT ↔ NT',
                allGroups: 'Tous les Groupes',
                tora: 'Torah',
                historical: 'Livres Historiques',
                poetic: 'Livres Poétiques',
                prophets: 'Prophètes',
                gospels: 'Évangiles',
                letters: 'Épîtres',
                revelation: 'Apocalypse',
                searchPlaceholder: 'Rechercher (ex. Jean 3)',
                resetZoom: 'Réinitialiser Zoom',
                loading: 'Chargement des données...',
                legendNear: 'Proche',
                legendFar: 'Loin',
                statsTitle: 'Statistiques',
                visibleArcs: 'Arcs Visibles',
                topBooksTitle: 'Top 10 des Livres',
                testamentDistTitle: 'Distribution AT / NT',
                chapterDetailsTitle: 'Détails du Chapitre',
                connectedChaptersTitle: 'Chapitres Connectés:',
                chapterNotFound: 'Chapitre non trouvé.'
            }
        };

        this.updateUIStrings();


        this.init();
    }


    updateUIStrings() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (this.translations[this.lang] && this.translations[this.lang][key]) {
                if (el.tagName === 'TITLE') {
                    document.title = this.translations[this.lang][key];
                } else {
                    el.textContent = this.translations[this.lang][key];
                }
            }
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (this.translations[this.lang] && this.translations[this.lang][key]) {
                el.setAttribute('placeholder', this.translations[this.lang][key]);
            }
        });
    }

    getBookName(book) {
        if (this.lang === 'de') return book.nameDE || book.name;
        if (this.lang === 'it') return book.nameIT || book.name;
        if (this.lang === 'fr') return book.nameFR || book.name;
        return book.name;
    }

    getChapterBookName(ch) {
        if (this.lang === 'de') return ch.bookNameDE || ch.bookName;
        if (this.lang === 'it') return ch.bookNameIT || ch.bookName;
        if (this.lang === 'fr') return ch.bookNameFR || ch.bookName;
        return ch.bookName;
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
            opt.textContent = this.getBookName(b);
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
                    this.showSearchError(this.translations[this.lang].chapterNotFound);
                }
            }
        });

        searchInput.addEventListener('input', () => {
            this.hideSearchError();
        });

        document.getElementById('lang-select').addEventListener('change', (e) => {
            this.lang = e.target.value;
            this.updateUIStrings();

            // Re-populate books
            const bookFilter = document.getElementById('book-filter');
            Array.from(bookFilter.options).forEach((opt, idx) => {
                if (idx > 0) { // Skip "All"
                    opt.textContent = this.getBookName(this.data.books[idx-1]);
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

        const sBookName = this.getChapterBookName(sCh);
        const tBookName = this.getChapterBookName(tCh);

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
        const bookName = this.getChapterBookName(ch);

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

        const bookName = this.getChapterBookName(ch);
        info.textContent = '';
        const strongInfo = document.createElement('strong');
        strongInfo.textContent = `${bookName} ${ch.chapterNum}`;
        info.appendChild(strongInfo);
        info.appendChild(document.createElement('br'));
        info.appendChild(document.createTextNode(`Verse: ${ch.verses}`));
        info.appendChild(document.createElement('br'));
        info.appendChild(document.createTextNode(`Verweise: ${ch.arcsCount}`));

        list.textContent = '';

        // Find all arcs connected to this chapter
        const connectedArcs = this.data.chapters[idx].connectedArcs;

        // Group by target chapter
        connectedArcs.forEach(arc => {
            const targetIdx = arc.source === idx ? arc.target : arc.source;
            const targetCh = this.data.chapters[targetIdx];
            const targetBookName = this.getChapterBookName(targetCh);

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
