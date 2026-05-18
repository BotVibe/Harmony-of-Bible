const DataLoader = require('../js/dataLoader.js');

function testParseCrossReferences() {
    console.log('--- parseCrossReferences Unit Tests ---');

    const dl = new DataLoader();

    // Mock chapters setup
    dl.chapters = [
        { shortName: 'Gen', chapterNum: 1, arcsCount: 0, connectedArcs: [] }, // index 0
        { shortName: 'Gen', chapterNum: 2, arcsCount: 0, connectedArcs: [] }, // index 1
        { shortName: 'Exo', chapterNum: 1, arcsCount: 0, connectedArcs: [] }, // index 2
    ];

    const input = `
Gen.1.1 Exo.1.5
Gen.2.4 Gen.2.5
InvalidFormat Exo.1.2
Gen.3.1 Exo.1.2

Gen.1.10 Gen.2.2 Extra Data
`;

    const arcs = dl.parseCrossReferences(input);
    let allPassed = true;

    function assert(condition, message) {
        if (!condition) {
            console.error(`❌ FAILED: ${message}`);
            allPassed = false;
        } else {
            console.log(`✅ PASSED: ${message}`);
        }
    }

    // Expected valid arcs:
    // 1. Gen.1.1 Exo.1.5 -> src: Gen.1 (0), tgt: Exo.1 (2)
    // 2. Gen.2.4 Gen.2.5 -> ignored (same chapter)
    // 3. InvalidFormat Exo.1.2 -> ignored (invalid format)
    // 4. Gen.3.1 Exo.1.2 -> ignored (unknown chapter Gen.3)
    // 5. [empty line] -> ignored
    // 6. Gen.1.10 Gen.2.2 Extra Data -> src: Gen.1 (0), tgt: Gen.2 (1)

    assert(arcs.length === 2, `Should parse exactly 2 arcs, got ${arcs.length}`);

    if (arcs.length === 2) {
        // First arc: Gen.1.1 to Exo.1.5 (indices 0 and 2)
        assert(arcs[0].source === 0, `First arc source should be 0, got ${arcs[0].source}`);
        assert(arcs[0].target === 2, `First arc target should be 2, got ${arcs[0].target}`);
        assert(arcs[0].distance === 2, `First arc distance should be 2, got ${arcs[0].distance}`);
        assert(arcs[0].sourceText === 'Gen.1.1', `First arc sourceText should be Gen.1.1, got ${arcs[0].sourceText}`);
        assert(arcs[0].targetText === 'Exo.1.5', `First arc targetText should be Exo.1.5, got ${arcs[0].targetText}`);

        // Second arc: Gen.1.10 to Gen.2.2 (indices 0 and 1)
        assert(arcs[1].source === 0, `Second arc source should be 0, got ${arcs[1].source}`);
        assert(arcs[1].target === 1, `Second arc target should be 1, got ${arcs[1].target}`);
        assert(arcs[1].distance === 1, `Second arc distance should be 1, got ${arcs[1].distance}`);
    }

    // Verify side-effects on chapters array
    assert(dl.chapters[0].arcsCount === 2, `Gen.1 should have 2 arcsCount, got ${dl.chapters[0].arcsCount}`);
    assert(dl.chapters[1].arcsCount === 1, `Gen.2 should have 1 arcsCount, got ${dl.chapters[1].arcsCount}`);
    assert(dl.chapters[2].arcsCount === 1, `Exo.1 should have 1 arcsCount, got ${dl.chapters[2].arcsCount}`);

    assert(dl.chapters[0].connectedArcs.length === 2, `Gen.1 connectedArcs should have 2 elements, got ${dl.chapters[0].connectedArcs.length}`);
    assert(dl.chapters[1].connectedArcs.length === 1, `Gen.2 connectedArcs should have 1 element, got ${dl.chapters[1].connectedArcs.length}`);

    if (!allPassed) {
        process.exit(1);
    }
}

testParseCrossReferences();
