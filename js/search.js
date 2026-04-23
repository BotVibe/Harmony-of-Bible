class Search {
    constructor(data) {
        this.data = data;
        this.booksMap = {};

        // Build search map for fast lookup
        data.books.forEach(b => {
            this.booksMap[b.name.toLowerCase()] = b.shortName;
            this.booksMap[b.nameDE.toLowerCase()] = b.shortName;
            this.booksMap[b.shortName.toLowerCase()] = b.shortName;
        });
    }

    parseQuery(query) {
        query = query.trim().toLowerCase();
        if (!query) return null;

        // Try to match "Book Chapter" or "Book"
        // e.g. "Joh 3" or "Johannes 3" or "Gen 1"
        const match = query.match(/^([1-3]?\s*[a-zäöüß]+)\s*(\d+)?/i);
        if (match) {
            let bookStr = match[1].replace(/\s+/g, '').toLowerCase();
            let chapterStr = match[2];

            // Normalize book name
            // Some manual fallbacks might be needed for variations
            let shortName = this.booksMap[bookStr];

            // Try fuzzy matching if not found
            if (!shortName) {
                for (let key in this.booksMap) {
                    if (key.startsWith(bookStr)) {
                        shortName = this.booksMap[key];
                        break;
                    }
                }
            }

            if (shortName) {
                let targetChapterIdx = -1;

                // Find chapter index
                for (let i = 0; i < this.data.chapters.length; i++) {
                    const ch = this.data.chapters[i];
                    if (ch.shortName.toLowerCase() === shortName.toLowerCase()) {
                        // If chapter specified, match it. Else just return the first chapter of the book
                        if (chapterStr) {
                            if (ch.chapterNum === parseInt(chapterStr)) {
                                targetChapterIdx = i;
                                break;
                            }
                        } else {
                            targetChapterIdx = i;
                            break;
                        }
                    }
                }

                if (targetChapterIdx !== -1) {
                    return targetChapterIdx;
                }
            }
        }
        return null;
    }
}
window.Search = Search;
