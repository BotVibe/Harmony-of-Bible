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


        const langSelect = document.getElementById('lang-select');
        this.lang = langSelect ? langSelect.value : 'de'; // Default language

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
                resetZoom: 'Zoom zurücksetzen',
                resetSelection: 'Auswahl aufheben',
                dataSource: 'Datenquelle',
                viewArc: 'Bögen (Arc)',
                viewMatrix: 'Matrix (Heatmap)',
                viewChord: 'Chord (Kreis)',
                viewMap: 'Karte (Geo)',
                loading: 'Lade Daten...',
                legendNear: 'Nah',
                legendFar: 'Weit',
                statsTitle: 'Statistiken',
                visibleArcs: 'Sichtbare Bögen',
                topBooksTitle: 'Top 10 Bücher (Verbindungen)',
                testamentDistTitle: 'AT / NT Verteilung',
                chapterDetailsTitle: 'Kapitel Details',
                connectedChaptersTitle: 'Verbundene Kapitel:',
                chapterNotFound: 'Kapitel nicht gefunden.',
                chartsTitle: 'Diagramme',
                topChaptersTitle: 'Top 10 Kapitel',
                searchAria: 'Kapitel suchen',
                langLabel: 'Sprache',
                viewModeLabel: 'Ansicht',
                groupLabel: 'Gruppe',
                sidebarToggleLabel: 'Statistik-Seitenleiste umschalten',
                canvasLabel: 'Visualisierung der Bibel-Querverweise'
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
                resetSelection: 'Reset Selection',
                dataSource: 'Data Source',
                viewArc: 'Arcs',
                viewMatrix: 'Matrix (Heatmap)',
                viewChord: 'Chord (Circle)',
                viewMap: 'Map (Geo)',
                loading: 'Loading data...',
                legendNear: 'Near',
                legendFar: 'Far',
                statsTitle: 'Statistics',
                visibleArcs: 'Visible Arcs',
                topBooksTitle: 'Top 10 Books (Connections)',
                testamentDistTitle: 'OT / NT Distribution',
                chapterDetailsTitle: 'Chapter Details',
                connectedChaptersTitle: 'Connected Chapters:',
                chapterNotFound: 'Chapter not found.',
                chartsTitle: 'Charts',
                topChaptersTitle: 'Top 10 Chapters',
                searchAria: 'Search chapters',
                langLabel: 'Language',
                viewModeLabel: 'View',
                groupLabel: 'Group',
                sidebarToggleLabel: 'Toggle statistics sidebar',
                canvasLabel: 'Bible cross-reference visualization'
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
                resetSelection: 'Reimposta Selezione',
                dataSource: 'Fonte Dati',
                viewArc: 'Archi',
                viewMatrix: 'Matrice (Heatmap)',
                viewChord: 'Corda (Cerchio)',
                viewMap: 'Mappa (Geo)',
                loading: 'Caricamento dati...',
                legendNear: 'Vicino',
                legendFar: 'Lontano',
                statsTitle: 'Statistiche',
                visibleArcs: 'Archi Visibili',
                topBooksTitle: 'I 10 Libri più Connessi',
                testamentDistTitle: 'Distribuzione AT / NT',
                chapterDetailsTitle: 'Dettagli Capitolo',
                connectedChaptersTitle: 'Capitoli Connessi:',
                chapterNotFound: 'Capitolo non trovato.',
                chartsTitle: 'Grafici',
                topChaptersTitle: 'Top 10 Capitoli',
                searchAria: 'Cerca capitoli',
                langLabel: 'Lingua',
                viewModeLabel: 'Vista',
                groupLabel: 'Gruppo',
                sidebarToggleLabel: 'Attiva/disattiva barra laterale',
                canvasLabel: 'Visualizzazione dei riferimenti incrociati della Bibbia'
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
                resetSelection: 'Réinitialiser Sélection',
                dataSource: 'Source de Données',
                viewArc: 'Arcs',
                viewMatrix: 'Matrice (Heatmap)',
                viewChord: 'Corde (Cercle)',
                viewMap: 'Carte (Géo)',
                loading: 'Chargement des données...',
                legendNear: 'Proche',
                legendFar: 'Loin',
                statsTitle: 'Statistiques',
                visibleArcs: 'Arcs Visibles',
                topBooksTitle: 'Top 10 des Livres',
                testamentDistTitle: 'Distribution AT / NT',
                chapterDetailsTitle: 'Détails du Chapitre',
                connectedChaptersTitle: 'Chapitres Connectés:',
                chapterNotFound: 'Chapitre non trouvé.',
                chartsTitle: 'Graphiques',
                topChaptersTitle: 'Top 10 Chapitres',
                searchAria: 'Rechercher des chapitres',
                langLabel: 'Langue',
                viewModeLabel: 'Vue',
                groupLabel: 'Groupe',
                sidebarToggleLabel: 'Basculer le panneau latéral',
                canvasLabel: 'Visualisation des références croisées de la Bible'
            }
        };

        this.chapterTextAbort = null;
        this.distanceFilterTimer = null;

        this.updateUIStrings();


                document.getElementById('reset-selection').addEventListener('click', () => {
            if (!this.renderer) return;
            this.renderer.setPinnedChapter(null);
            this.renderer.setHoveredChapter(null);
            this.renderer.setHoveredArc(null);
            this.hideTooltip();
            document.getElementById('chapter-details').classList.add('hidden');
            if(document.querySelector('#acc-stats')) {
                document.querySelector('#acc-stats .accordion-body').classList.remove('hidden');
                document.querySelector('#acc-details .accordion-body').classList.add('hidden');
                const statsHeader = document.getElementById('acc-stats-header');
                const detailsHeader = document.getElementById('acc-details-header');
                if (statsHeader) statsHeader.setAttribute('aria-expanded', 'true');
                if (detailsHeader) detailsHeader.setAttribute('aria-expanded', 'false');
            }
        });

        document.getElementById('update-data').addEventListener('click', () => {
            window.open('https://github.com/openbibleinfo/CrossReferences', '_blank');
        });

        const vms = document.getElementById('view-mode-select');
        if(vms) { vms.addEventListener('change', (e) => {
            if (this.renderer) { this.renderer.setViewMode(e.target.value); }
        });}

        const accStats = document.getElementById('acc-stats-header');
        if(accStats) {
            accStats.addEventListener('click', () => {
                this.toggleAccordion('acc-stats');
            });
        }
        const accDetails = document.getElementById('acc-details-header');
        if(accDetails) {
            accDetails.addEventListener('click', () => {
                this.toggleAccordion('acc-details');
            });
        }

        this.init();
    }

    toggleAccordion(itemId) {
        const item = document.getElementById(itemId);
        if (!item) return;
        const body = item.querySelector('.accordion-body');
        const header = item.querySelector('.accordion-header');
        if (!body || !header) return;
        const willHide = !body.classList.contains('hidden');
        body.classList.toggle('hidden');
        header.setAttribute('aria-expanded', willHide ? 'false' : 'true');
    }

    updateUIStrings() {
        document.documentElement.lang = this.lang;

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

        document.querySelectorAll('[data-i18n-aria]').forEach(el => {
            const key = el.getAttribute('data-i18n-aria');
            if (this.translations[this.lang] && this.translations[this.lang][key]) {
                el.setAttribute('aria-label', this.translations[this.lang][key]);
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
            this.loadingOverlay.setAttribute('aria-busy', 'false');

            // Initialize components
            this.renderer = new Renderer('viz-canvas', this.data);
            this.search = new Search(this.data);
            this.stats = new StatsCharts();

            this.setupUI();
            this.setupInteractivity();
            this.updateStats(true); // immediate initial render

        } catch (err) {
            console.error(err);
            this.loadingText.textContent = 'Fehler beim Laden der Daten.';
            this.loadingOverlay.setAttribute('aria-busy', 'false');
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
            e.target.setAttribute('aria-valuenow', e.target.value);
            // Debounce O(N) refilter while dragging the distance slider
            clearTimeout(this.distanceFilterTimer);
            this.distanceFilterTimer = setTimeout(() => {
                this.updateFilters({ distance: parseInt(e.target.value, 10) });
            }, 100);
        });
        distFilter.addEventListener('change', (e) => {
            clearTimeout(this.distanceFilterTimer);
            distValue.textContent = e.target.value;
            e.target.setAttribute('aria-valuenow', e.target.value);
            this.updateFilters({ distance: parseInt(e.target.value, 10) });
        });

        const testButtons = document.querySelectorAll('#testament-filters button');
        testButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                testButtons.forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-pressed', 'false');
                });
                e.currentTarget.classList.add('active');
                e.currentTarget.setAttribute('aria-pressed', 'true');
                this.updateFilters({ testament: e.currentTarget.dataset.filter });
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

        const runSearch = () => {
            const searchInput = document.getElementById('search-input');
            const chapterIdx = this.search.parseQuery(searchInput.value);
            if (chapterIdx !== null) {
                this.renderer.setPinnedChapter(chapterIdx);
                this.updateSidebarForChapter(chapterIdx);
                this.centerOnChapter(chapterIdx);
                if (this.sidebar.classList.contains('collapsed')) {
                    this.sidebar.classList.remove('collapsed');
                    this.sidebarToggle.textContent = '▶';
                    this.sidebarToggle.setAttribute('aria-expanded', 'true');
                }
                this.hideSearchError();
            } else {
                this.showSearchError(this.translations[this.lang].chapterNotFound);
            }
        };

        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') runSearch();
        });

        const searchBtn = document.getElementById('search-btn');
        if (searchBtn) searchBtn.addEventListener('click', runSearch);

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
            const collapsed = this.sidebar.classList.contains('collapsed');
            this.sidebarToggle.textContent = collapsed ? '◀' : '▶';
            this.sidebarToggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        });
    }

    updateFilters(filters) {
        const count = this.renderer.setFilters(filters);
        document.getElementById('stat-visible-arcs').textContent = count.toLocaleString();
        this.updateStats(false);
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

            let chapterIdx = null;

            if (this.renderer.viewMode === "map") {
                this.renderer.setHoveredChapter(null);
                this.renderer.setHoveredArc(null);
                this.hideTooltip();
                return;
            } else if (this.renderer.viewMode === "matrix") {
                chapterIdx = this.renderer.getChapterAtScreenPosMatrix(mouseX, mouseY);
            } else if (this.renderer.viewMode === "chord") {
                chapterIdx = this.renderer.getChapterAtScreenPosChord(mouseX, mouseY);
            } else {
                // Arc view
                const isBottomArea = mouseY > this.renderer.height - 80;
                if (isBottomArea) {
                    chapterIdx = this.renderer.getChapterAtScreenPos(mouseX);
                }
            }

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
                        this.sidebarToggle.setAttribute('aria-expanded', 'true');
                    }
                }
            }
        });
    }

    handleMouseMove(e) {
        const rect = this.renderer.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (this.renderer.viewMode === "map") {
            this.renderer.setHoveredChapter(null);
            this.renderer.setHoveredArc(null);
            this.hideTooltip();
            return;
        }

        let chapterIdx = null;
        let hoveredArc = null;

        if (this.renderer.viewMode === "matrix") {
            chapterIdx = this.renderer.getChapterAtScreenPosMatrix(mouseX, mouseY);
            if (chapterIdx === null) {
                hoveredArc = this.renderer.getArcAtScreenPosMatrix(mouseX, mouseY);
            }
        } else if (this.renderer.viewMode === "chord") {
            chapterIdx = this.renderer.getChapterAtScreenPosChord(mouseX, mouseY);
            if (chapterIdx === null) {
                hoveredArc = this.renderer.getArcAtScreenPosChord(mouseX, mouseY);
            }
        } else {
            // Arc view
            const isBottomArea = mouseY > this.renderer.height - 80;
            if (isBottomArea) {
                chapterIdx = this.renderer.getChapterAtScreenPos(mouseX);
            } else {
                hoveredArc = this.renderer.getArcAtScreenPos(mouseX, mouseY);
            }
        }

        if (chapterIdx !== null) {
            this.renderer.setHoveredArc(null);
            if (chapterIdx !== null) {
                this.renderer.setHoveredChapter(chapterIdx);
                this.showChapterTooltip(chapterIdx, e.clientX, e.clientY);
                return;
            }
        } else if (hoveredArc !== null) {
            this.renderer.setHoveredChapter(null);
            this.renderer.setHoveredArc(hoveredArc);
            this.showArcTooltip(hoveredArc, e.clientX, e.clientY);
            return;
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

    updateStats(immediate = false) {
        const arcs = this.renderer ? this.renderer.visibleArcs : this.data.arcs;
        document.getElementById('stat-visible-arcs').textContent = arcs.length.toLocaleString();
        // Charts reflect the active filter set
        this.stats.render({ books: this.data.books, chapters: this.data.chapters, arcs }, immediate);
    }

    showSearchError(message) {
        this.searchError.textContent = message;
        this.searchError.classList.remove('hidden');
    }

    hideSearchError() {
        this.searchError.classList.add('hidden');
    }

    centerOnChapter(idx) {
        if (!this.renderer || !this.renderer.chapterPositions.length) return;

        const canvasWidth = this.renderer.width;
        const canvasHeight = this.renderer.height;
        const numChapters = this.renderer.chapterPositions.length;
        const k = this.renderer.transform.k;

        let tx = 0, ty = 0;

        if (this.renderer.viewMode === 'matrix') {
            const padding = 40;
            const size = Math.min(canvasWidth, canvasHeight) - padding * 2;
            const cellSize = size / numChapters;
            const offsetX = (canvasWidth - size) / 2;
            const offsetY = (canvasHeight - size) / 2;

            // Center on the diagonal cell for this chapter
            const cellX = offsetX + idx * cellSize;
            const cellY = offsetY + idx * cellSize;
            tx = -cellX * k + canvasWidth / 2;
            ty = -cellY * k + canvasHeight / 2;
        } else if (this.renderer.viewMode === 'chord') {
            const centerX = canvasWidth / 2;
            const centerY = canvasHeight / 2;
            const radius = Math.min(canvasWidth, canvasHeight) / 2 - 60;
            const angleStep = (Math.PI * 2) / numChapters;
            const angle = idx * angleStep - Math.PI / 2;

            // Center on the edge of the chord ring for this chapter
            const px = centerX + Math.cos(angle) * radius;
            const py = centerY + Math.sin(angle) * radius;
            tx = -px * k + canvasWidth / 2;
            ty = -py * k + canvasHeight / 2;
        } else {
            // Default Arc View
            const pos = this.renderer.chapterPositions[idx];
            tx = -pos.centerX * k + canvasWidth / 2;
            ty = 0; // Don't translate Y in arc view to keep bottom bar visible
        }

        d3.select('#viz-canvas').transition().duration(750).call(
            this.zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(k)
        );
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
                this.centerOnChapter(targetIdx);
            });
            list.appendChild(li);
        });

        details.classList.remove('hidden');
        const accStatsBody = document.querySelector('#acc-stats .accordion-body');
        if (accStatsBody) accStatsBody.classList.add('hidden');
        const accDetailsBody = document.querySelector('#acc-details .accordion-body');
        if (accDetailsBody) accDetailsBody.classList.remove('hidden');

        const textBox = document.getElementById('chapter-text');
        if (textBox) {
            textBox.textContent = 'Loading text...';
            const shortName = ch.shortName;
            if (window.BibleAPI) {
                if (this.chapterTextAbort) {
                    this.chapterTextAbort.abort();
                }
                this.chapterTextAbort = new AbortController();
                const signal = this.chapterTextAbort.signal;
                window.BibleAPI.fetchChapterText(shortName, ch.chapterNum, this.lang, signal).then(text => {
                    if (signal.aborted) return;
                    if (text) {
                        textBox.textContent = text;
                    } else {
                        textBox.textContent = 'Text not available for this translation.';
                    }
                }).catch(err => {
                    if (err && err.name === 'AbortError') return;
                    textBox.textContent = 'Text not available for this translation.';
                });
            }
        }
    }
}

// Start App
window.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
