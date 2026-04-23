class DataLoader {
    constructor() {
        this.books = [];
        this.chapters = [];
        this.arcs = [];
        this.totalVerses = 0;
        this.bookShortMap = {};
    }

    async loadData(progressCallback) {
        try {
            progressCallback(10, 'Lade Bücher (books.json)...');
            const booksRes = await fetch('data/books.json');
            this.books = await booksRes.json();

            // Build chapter flat array
            let chapterId = 0;
            let verseOffset = 0;

            this.books.forEach(book => {
                this.bookShortMap[book.shortName] = book.id;
                book.chapters.forEach((ch, idx) => {
                    this.chapters.push({
                        id: chapterId,
                        bookId: book.id,
                        bookName: book.name,
                        bookNameDE: book.nameDE,
                        shortName: book.shortName,
                        chapterNum: ch.chapter,
                        verses: ch.verses,
                        testament: book.testament,
                        group: book.group,
                        verseOffset: verseOffset,
                        arcsCount: 0
                    });
                    chapterId++;
                    verseOffset += ch.verses;
                });
            });
            this.totalVerses = verseOffset;

            progressCallback(40, 'Lade Querverweise (cross_references.txt)...');
            const refsRes = await fetch('data/cross_references.txt');
            const refsText = await refsRes.text();

            progressCallback(70, 'Parse Querverweise...');
            this.arcs = this.parseCrossReferences(refsText);

            progressCallback(100, 'Abgeschlossen!');
            return {
                books: this.books,
                chapters: this.chapters,
                arcs: this.arcs,
                totalVerses: this.totalVerses
            };
        } catch (err) {
            console.error('Error loading data:', err);
            throw err;
        }
    }

    parseCrossReferences(text) {
        const lines = text.split('\n');
        const arcs = [];

        // Helper to parse ref like "Gen.1.1" -> {book, chapter, verse}
        const parseRef = (refStr) => {
            const parts = refStr.split('.');
            if (parts.length >= 2) {
                return {
                    bookShort: parts[0],
                    chapter: parseInt(parts[1], 10)
                };
            }
            return null;
        };

        // Helper to find chapter index
        const getChapterIndex = (parsedRef) => {
            if (!parsedRef) return -1;
            // Find the chapter in our flat array
            // This could be optimized with a lookup map
            for (let i = 0; i < this.chapters.length; i++) {
                const ch = this.chapters[i];
                if (ch.shortName === parsedRef.bookShort && ch.chapterNum === parsedRef.chapter) {
                    return i;
                }
            }
            return -1;
        };

        // Optimize lookup by creating a map "BookShort.Chapter" -> chapterIndex
        const chapterLookup = new Map();
        this.chapters.forEach((ch, idx) => {
            chapterLookup.set(`${ch.shortName}.${ch.chapterNum}`, idx);
        });

        let idCounter = 0;

        lines.forEach(line => {
            if (!line.trim()) return;
            const parts = line.trim().split(' ');
            if (parts.length >= 2) {
                const ref1 = parseRef(parts[0]);
                const ref2 = parseRef(parts[1]);

                if (ref1 && ref2) {
                    const ch1Index = chapterLookup.get(`${ref1.bookShort}.${ref1.chapter}`);
                    const ch2Index = chapterLookup.get(`${ref2.bookShort}.${ref2.chapter}`);

                    if (ch1Index !== undefined && ch2Index !== undefined && ch1Index !== ch2Index) {
                        const start = Math.min(ch1Index, ch2Index);
                        const end = Math.max(ch1Index, ch2Index);
                        const dist = end - start;

                        this.chapters[start].arcsCount++;
                        this.chapters[end].arcsCount++;

                        arcs.push({
                            id: idCounter++,
                            source: start,
                            target: end,
                            distance: dist,
                            sourceText: parts[0],
                            targetText: parts[1]
                        });
                    }
                }
            }
        });

        return arcs;
    }
}
window.DataLoader = DataLoader;
