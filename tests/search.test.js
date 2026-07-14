/**
 * Unit tests for Search.parseQuery
 */
const Search = require('../js/search.js');

function assert(condition, message) {
    if (!condition) {
        console.error(`❌ FAILED: ${message}`);
        process.exitCode = 1;
        return false;
    }
    console.log(`✅ PASSED: ${message}`);
    return true;
}

function testSearch() {
    console.log('--- Search.parseQuery Unit Tests ---');

    const data = {
        books: [
            { name: 'Genesis', nameDE: '1. Mose', nameIT: 'Genesi', nameFR: 'Genèse', shortName: 'Gen' },
            { name: 'John', nameDE: 'Johannes', nameIT: 'Giovanni', nameFR: 'Jean', shortName: 'Joh' }
        ],
        chapters: [
            { shortName: 'Gen', chapterNum: 1 },
            { shortName: 'Gen', chapterNum: 2 },
            { shortName: 'Joh', chapterNum: 1 },
            { shortName: 'Joh', chapterNum: 3 }
        ]
    };

    const search = new Search(data);

    assert(search.parseQuery('Gen 1') === 0, 'English short + chapter');
    assert(search.parseQuery('Johannes 3') === 3, 'German full name + chapter');
    assert(search.parseQuery('Jean 3') === 3, 'French full name + chapter');
    assert(search.parseQuery('Giovanni') === 2, 'Italian book-only returns first chapter');
    assert(search.parseQuery('') === null, 'Empty query');
    assert(search.parseQuery('NotABook 1') === null, 'Unknown book');
    assert(search.parseQuery('Gen 99') === null, 'Missing chapter');
}

testSearch();
if (!process.exitCode) {
    console.log('\nAll Search tests passed.');
}
