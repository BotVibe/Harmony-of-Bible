class BibleAPI {
    static async fetchChapterText(bookName, chapterNum, lang) {
        const translations = { 'de': 'luther1912', 'en': 'web', 'fr': 'ls1910', 'it': 'diodati' };
        let trans = translations[lang] || 'web';
        try {
            const response = await fetch(`https://bible-api.com/${encodeURIComponent(bookName + ' ' + chapterNum)}?translation=${trans}`);
            if (!response.ok) {
                if (trans !== 'web') {
                    const fallbackResponse = await fetch(`https://bible-api.com/${encodeURIComponent(bookName + ' ' + chapterNum)}?translation=web`);
                    if (fallbackResponse.ok) {
                        const data = await fallbackResponse.json();
                        return data.text;
                    }
                }
                return null;
            }
            const data = await response.json();
            return data.text;
        } catch (e) {
            return null;
        }
    }
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BibleAPI;
} else {
    window.BibleAPI = BibleAPI;
}
