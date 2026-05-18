const Renderer = require('../js/renderer.js');

/**
 * Unit tests for Renderer.getArcColor
 */
function testGetArcColor() {
    const testCases = [
        { distance: 0, expected: 'hsla(270, 100%, 50%, ' },
        { distance: 118.9, expected: 'hsla(240, 100%, 50%, ' }, // 10%
        { distance: 297.25, expected: 'hsla(150, 100%, 50%, ' }, // 25% -> (25-10)/30 * 180 = 90; 240-90=150
        { distance: 475.6, expected: 'hsla(60, 100%, 50%, ' }, // 40%
        { distance: 832.3, expected: 'hsla(30, 100%, 50%, ' }, // 70% -> (70-40)/60 * 60 = 30; 60-30=30
        { distance: 1189, expected: 'hsla(0, 100%, 50%, ' }, // 100%
        { distance: 2000, expected: 'hsla(0, 100%, 50%, ' }, // > 100%
    ];

    let allPassed = true;
    console.log('--- getArcColor Unit Tests ---');

    testCases.forEach(tc => {
        const actual = Renderer.getArcColor(tc.distance);

        // Handle floating point precision for the hue
        const match = actual.match(/hsla\(([\d.]+), 100%, 50%, /);
        const expectedMatch = tc.expected.match(/hsla\(([\d.]+), 100%, 50%, /);

        let pass = false;
        if (match && expectedMatch) {
            const hue = parseFloat(match[1]);
            const expectedHue = parseFloat(expectedMatch[1]);
            pass = Math.abs(hue - expectedHue) < 0.0001;
        }

        if (!pass) {
            console.error(`❌ FAILED: distance ${tc.distance}`);
            console.error(`   Expected: "${tc.expected}"`);
            console.error(`   Actual:   "${actual}"`);
            allPassed = false;
        } else {
            console.log(`✅ PASSED: distance ${tc.distance} -> ${actual}`);
        }
    });

    if (!allPassed) {
        process.exit(1);
    }
}

/**
 * Tests for Renderer.getArcAtScreenPos spatial indexing
 */
function testSpatialIndex() {
    console.log('\n--- Spatial Index Tests ---');
    const mockData = {
        totalVerses: 100,
        chapters: [
            { verses: 50, bookId: 1, shortName: 'Gen', chapterNum: 1 },
            { verses: 50, bookId: 1, shortName: 'Gen', chapterNum: 2 }
        ],
        arcs: [
            { source: 0, target: 1, distance: 1 }
        ]
    };

    // We need to mock document and d3 for the constructor
    global.document = {
        getElementById: () => ({
            getContext: () => ({
                scale: () => {},
                fillRect: () => {},
                clearRect: () => {},
                save: () => {},
                restore: () => {},
                translate: () => {},
                beginPath: () => {},
                ellipse: () => {},
                stroke: () => {}
            }),
            parentElement: { getBoundingClientRect: () => ({ width: 1000, height: 500 }), insertBefore: () => {} },
            style: {}
        }),
        createElement: () => ({
            getContext: () => ({}),
            style: {},
            transferControlToOffscreen: () => ({})
        })
    };
    global.window = { addEventListener: () => {} };
    global.d3 = { zoomIdentity: { x: 0, y: 0, k: 1 } };
    global.Worker = class { postMessage() {} };

    const renderer = new Renderer('canvas', mockData);

    // Override resize to fixed values
    renderer.width = 1000;
    renderer.height = 500;
    renderer.calculatePositions();
    renderer.applyFilters(); // This calls buildSpatialIndex

    if (renderer.arcSpatialIndex && renderer.arcSpatialIndex.length === 50) {
        console.log('✅ PASSED: arcSpatialIndex initialized');
    } else {
        console.error('❌ FAILED: arcSpatialIndex not properly initialized');
        process.exit(1);
    }
}

testGetArcColor();
testSpatialIndex();
