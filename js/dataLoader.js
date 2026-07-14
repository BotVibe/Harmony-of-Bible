class DataLoader {
    constructor() {
        this.books = [];
        this.chapters = [];
        this.arcs = [];
        this.totalVerses = 0;
    }

    async loadData(progressCallback) {
        try {
            progressCallback(10, 'Lade Bücher (books.json)...');
            const booksRes = await fetch('data/books.json');
            if (!booksRes.ok) {
                throw new Error(`Failed to load books.json (${booksRes.status})`);
            }
            this.books = await booksRes.json();

            // Build chapter flat array
            let chapterId = 0;
            let verseOffset = 0;

            this.books.forEach(book => {
                book.chapters.forEach((ch, idx) => {
                    this.chapters.push({
                        id: chapterId,
                        bookId: book.id,
                        bookName: book.name,
                        bookNameDE: book.nameDE,
                        bookNameIT: book.nameIT,
                        bookNameFR: book.nameFR,
                        shortName: book.shortName,
                        chapterNum: ch.chapter,
                        verses: ch.verses,
                        testament: book.testament,
                        group: book.group,
                        verseOffset: verseOffset,
                        arcsCount: 0,
                        connectedArcs: []
                    });
                    chapterId++;
                    verseOffset += ch.verses;
                });
            });
            this.totalVerses = verseOffset;

            progressCallback(40, 'Lade Querverweise (cross_references.txt)...');
            const refsRes = await fetch('data/cross_references.txt');
            if (!refsRes.ok) {
                throw new Error(`Failed to load cross_references.txt (${refsRes.status})`);
            }
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
            throw err;
        }
    }

    static parseRef(refStr) {
        const parts = refStr.split('.');
        if (parts.length >= 2) {
            return {
                bookShort: parts[0],
                chapter: parseInt(parts[1], 10)
            };
        }
        return null;
    }

    static getChapterIndex(ref, chapterLookup) {
        return chapterLookup.get(`${ref.bookShort}.${ref.chapter}`);
    }

    parseCrossReferences(text) {
        const lines = text.split('\n');
        const arcs = [];

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
                const ref1 = DataLoader.parseRef(parts[0]);
                const ref2 = DataLoader.parseRef(parts[1]);

                if (ref1 && ref2) {
                    const ch1Index = DataLoader.getChapterIndex(ref1, chapterLookup);
                    const ch2Index = DataLoader.getChapterIndex(ref2, chapterLookup);

                    if (ch1Index !== undefined && ch2Index !== undefined && ch1Index !== ch2Index) {
                        const start = Math.min(ch1Index, ch2Index);
                        const end = Math.max(ch1Index, ch2Index);
                        const dist = end - start;

                        this.chapters[start].arcsCount++;
                        this.chapters[end].arcsCount++;

                        const arc = {
                            id: idCounter++,
                            source: start,
                            target: end,
                            distance: dist,
                            sourceText: parts[0],
                            targetText: parts[1]
                        };

                        arcs.push(arc);
                        this.chapters[start].connectedArcs.push(arc);
                        this.chapters[end].connectedArcs.push(arc);
                    }
                }
            }
        });

        return arcs;
    }
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataLoader;
} else {
    window.DataLoader = DataLoader;
}
