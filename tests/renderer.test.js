require('../js/shared.js');
const Renderer = require('../js/renderer.js');

// Mock requestAnimationFrame for tests
global.window = global.window || {};
global.window.requestAnimationFrame = (callback) => setTimeout(callback, 0);

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
                setTransform: () => {},
                fillRect: () => {},
                clearRect: () => {},
                save: () => {},
                restore: () => {},
                translate: () => {},
                beginPath: () => {},
                ellipse: () => {}, arc: () => {},
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
    global.window = {
        addEventListener: () => {},
        requestAnimationFrame: (cb) => setTimeout(cb, 0)
    };
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
                setTransform: () => {},
                fillRect: () => {},
                clearRect: () => {},
                save: () => {},
                restore: () => {},
                translate: () => {},
                beginPath: () => {},
                ellipse: () => {}, arc: () => {},
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
    global.window = {
        addEventListener: () => {},
        requestAnimationFrame: (cb) => setTimeout(cb, 0)
    };
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


/**
 * Tests for Renderer.getArcAtScreenPos
 */
function testGetArcAtScreenPos() {
    console.log('\n--- getArcAtScreenPos Unit Tests ---');

    global.document = {
        getElementById: () => ({
            getContext: () => ({
                scale: () => {},
                setTransform: () => {},
                fillRect: () => {},
                clearRect: () => {},
                save: () => {},
                restore: () => {},
                translate: () => {},
                beginPath: () => {},
                ellipse: () => {}, arc: () => {},
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
    global.window = {
        addEventListener: () => {},
        requestAnimationFrame: (cb) => setTimeout(cb, 0)
    };
    global.d3 = { zoomIdentity: { x: 0, y: 0, k: 1 } };
    global.Worker = class { postMessage() {} };

    const mockData = {
        totalVerses: 100,
        chapters: [],
        arcs: []
    };
    const renderer = new Renderer('canvas', mockData);

    // Setup initial state
    renderer.width = 1000;
    renderer.height = 500;
    renderer.transform = { x: 0, y: 0, k: 1 };

    let allPassed = true;

    const assertTest = (condition, successMsg, failMsg) => {
        if (condition) {
            console.log(`✅ PASSED: ${successMsg}`);
        } else {
            console.error(`❌ FAILED: ${failMsg}`);
            allPassed = false;
        }
    };

    // Early exits
    assertTest(renderer.getArcAtScreenPos(100, 100) === null,
        'returned null for missing visibleArcs',
        'did not return null for missing visibleArcs');

    renderer.visibleArcs = [];
    assertTest(renderer.getArcAtScreenPos(100, 100) === null,
        'returned null for empty visibleArcs',
        'did not return null for empty visibleArcs');

    renderer.visibleArcs = [{ source: 0, target: 1 }];
    renderer.chapterPositions = null;
    assertTest(renderer.getArcAtScreenPos(100, 100) === null,
        'returned null for missing chapterPositions',
        'did not return null for missing chapterPositions');

    renderer.chapterPositions = [{ centerX: 100 }, { centerX: 200 }];
    renderer.arcSpatialIndex = null;
    assertTest(renderer.getArcAtScreenPos(100, 100) === null,
        'returned null for missing arcSpatialIndex',
        'did not return null for missing arcSpatialIndex');

    renderer.arcSpatialIndex = Array(50).fill().map(() => Array(50).fill([]));

    // Out of bounds Y
    assertTest(renderer.getArcAtScreenPos(150, 480) === null, // bottomY = 500 - 40 = 460
        'returned null for Y out of bounds',
        'did not return null for Y out of bounds');

    // Missing bounds (empty bin bounds check)
    // By passing an X far out of range, getBinYBounds returns null, continuing the loop
    assertTest(renderer.getArcAtScreenPos(10000, 250) === null,
        'returned null when bin bounds are empty',
        'did not return null when bin bounds are empty');



    // Mock the static method to assert closest logic based on distance
    const originalGetArcDistanceToPoint = Renderer.getArcDistanceToPoint;
    Renderer.getArcDistanceToPoint = (worldX, worldY, p1, p2, maxR, bottomY, threshold) => {
        // Return simulated distances so we can test the minDistance logic accurately
        if (p1 === 100 && p2 === 200) return 0; // arc1 distance
        if (p1 === 100 && p2 === 300) return 2; // arc2 distance
        return null;
    };

    // Setup real indexing environment
    const arc1 = { source: 0, target: 1, distance: 10 };
    const arc2 = { source: 0, target: 2, distance: 20 };
    renderer.chapterPositions = [{ centerX: 100 }, { centerX: 200 }, { centerX: 300 }];

    // Simulate real bin structure
    renderer.spatialMaxR = 500;

    renderer.arcSpatialIndex[7] = [];
    // Place both arcs in the same bin
    renderer.arcSpatialIndex[7][39] = [arc2, arc1];

    // We adjust the test values to ensure that D2 calculations and bin selection are valid
    // for the new circular arcs (where rY = rX).
    // bottomY = (500 - 80) / 1 = 420. worldY = 20, so dy = 20 - 420 = -400.
    // idealRxMin = ~400. binHeight = 500/50 = 10. binY = 400 / 10 = 40 (so 39-41).

    renderer.transform = { x: 0, y: 0, k: 1 };

    const hitArc = renderer.getArcAtScreenPos(150, 20);
    assertTest(hitArc === arc1,
        'returned correct closest arc on positive hit',
        'did not return correct closest arc on positive hit');

    // Test with transform (zoom and pan)
    renderer.transform = { x: 50, y: -10, k: 2 };

    // transform.k = 2, transform.x = 50, transform.y = -10
    // mouseX = 350, mouseY = 30
    // worldX = (350 - 50) / 2 = 150
    // worldY = 30 / 2 = 15
    // bottomY = 420 / 2 = 210
    // dy = 15 - 210 = -195
    // idealRxMin = ~195. binHeight = 500/50 = 10. binY = 195/10 = 19.

    renderer.arcSpatialIndex[7][19] = [arc2, arc1];

    const transformedHitArc = renderer.getArcAtScreenPos(350, 30);
    assertTest(transformedHitArc === arc1,
        'returned correct arc when zoomed and panned',
        'did not return correct arc when zoomed and panned');

    // Restore static method
    Renderer.getArcDistanceToPoint = originalGetArcDistanceToPoint;

    if (!allPassed) {
        process.exit(1);
    }
}

testGetArcColor();
testSpatialIndex();
testGetBinYBounds();
testGetChapterAtScreenPos();
testGetArcDistanceToPoint();
testGetArcAtScreenPos();
