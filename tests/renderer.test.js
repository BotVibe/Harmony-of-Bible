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

        // Edge cases and error conditions
        { distance: -50, expected: 'hsla(270, 100%, 50%, ' }, // Negative numbers treated as 0
        { distance: NaN, expected: 'hsla(0, 0%, 50%, ' },
        { distance: undefined, expected: 'hsla(0, 0%, 50%, ' },
        { distance: null, expected: 'hsla(0, 0%, 50%, ' },
        { distance: '100', expected: 'hsla(0, 0%, 50%, ' }, // String instead of number
        { distance: {}, expected: 'hsla(0, 0%, 50%, ' }, // Object
    ];

    let allPassed = true;
    console.log('--- getArcColor Unit Tests ---');

    testCases.forEach(tc => {
        const actual = Renderer.getArcColor(tc.distance);

        let pass = false;

        // Handle exact matches (like fallback colors)
        if (actual === tc.expected) {
            pass = true;
        } else {
            // Handle floating point precision for the hue
            const match = actual.match(/hsla\(([\d.]+), 100%, 50%, /);
            const expectedMatch = tc.expected.match(/hsla\(([\d.]+), 100%, 50%, /);

            if (match && expectedMatch) {
                const hue = parseFloat(match[1]);
                const expectedHue = parseFloat(expectedMatch[1]);
                pass = Math.abs(hue - expectedHue) < 0.0001;
            }
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

/**
 * Tests for Renderer.getBinYBounds
 */
function testGetBinYBounds() {
    console.log('\n--- getBinYBounds Unit Tests ---');

    // worldX, binX, binWidth, binHeight, D2, rxTolerance, GRID_SIZE
    const bounds = Renderer.getBinYBounds(100, 0, 10, 10, 0, 5, 50);

    if (bounds && typeof bounds.startBinY === 'number' && typeof bounds.endBinY === 'number') {
        console.log(`✅ PASSED: returned valid bounds {startBinY: ${bounds.startBinY}, endBinY: ${bounds.endBinY}}`);
    } else {
        console.error('❌ FAILED: returned invalid bounds');
        process.exit(1);
    }
}


/**
 * Tests for Renderer.getChapterAtScreenPos
 */
function testGetChapterAtScreenPos() {
    console.log('\n--- getChapterAtScreenPos Unit Tests ---');

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

    const mockData = {
        totalVerses: 100,
        chapters: [],
        arcs: []
    };
    const renderer = new Renderer('canvas', mockData);

    let allPassed = true;

    // Test 1: Empty chapterPositions
    renderer.chapterPositions = [];
    if (renderer.getChapterAtScreenPos(100) === null) {
        console.log('✅ PASSED: returned null for empty chapterPositions');
    } else {
        console.error('❌ FAILED: did not return null for empty chapterPositions');
        allPassed = false;
    }

    // Mock chapter positions for further tests
    renderer.chapterPositions = [
        { x: 10, width: 20 },  // chapter 0: 10 to 30
        { x: 40, width: 20 },  // chapter 1: 40 to 60
        { x: 70, width: 20 }   // chapter 2: 70 to 90
    ];

    // Test 2: Exact match (k=1, x=0)
    renderer.transform = { x: 0, k: 1, y: 0 };
    if (renderer.getChapterAtScreenPos(15) === 0 && renderer.getChapterAtScreenPos(50) === 1) {
        console.log('✅ PASSED: returned correct index for exact match without transform');
    } else {
        console.error('❌ FAILED: incorrect index for exact match without transform');
        allPassed = false;
    }

    // Test 3: Out of bounds
    if (renderer.getChapterAtScreenPos(5) === null && renderer.getChapterAtScreenPos(35) === null && renderer.getChapterAtScreenPos(100) === null) {
        console.log('✅ PASSED: returned null for out of bounds points');
    } else {
        console.error('❌ FAILED: did not return null for out of bounds points');
        allPassed = false;
    }

    // Test 4: With zoom and pan
    // Pan right by 100, scale by 2
    // worldX = (mouseX - transform.x) / transform.k
    // mouseX = worldX * transform.k + transform.x
    // To hit chapter 1 (worldX = 50): mouseX = 50 * 2 + 100 = 200
    renderer.transform = { x: 100, k: 2, y: 0 };
    if (renderer.getChapterAtScreenPos(200) === 1) {
        console.log('✅ PASSED: returned correct index with zoom and pan');
    } else {
        console.error('❌ FAILED: incorrect index with zoom and pan');
        allPassed = false;
    }

    if (!allPassed) {
        process.exit(1);
    }
}

/**
 * Tests for Renderer.getArcDistanceToPoint
 */
function testGetArcDistanceToPoint() {
    console.log('\n--- getArcDistanceToPoint Unit Tests ---');

    // Exact match
    // worldX, worldY, p1, p2, maxR, bottomY, threshold
    let dist = Renderer.getArcDistanceToPoint(150, 480, 100, 200, 100, 500, 50);
    if (dist !== null && dist < 50) {
        console.log(`✅ PASSED: returned valid distance for point on arc (${dist})`);
    } else {
        console.error('❌ FAILED: did not return expected distance for point on arc');
        process.exit(1);
    }

    // Out of bounds
    dist = Renderer.getArcDistanceToPoint(0, 0, 100, 200, 100, 500, 5);
    if (dist === null) {
        console.log(`✅ PASSED: returned null for point far away`);
    } else {
        console.error('❌ FAILED: returned distance for point far away');
        process.exit(1);
    }
}

testGetArcColor();
testSpatialIndex();
testGetBinYBounds();
testGetChapterAtScreenPos();
testGetArcDistanceToPoint();
