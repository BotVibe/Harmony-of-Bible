const StatsCharts = require('../js/stats.js');

function testRenderDonut() {
    console.log('--- renderDonut Unit Tests ---');

    // Mock DOM
    global.document = {
        getElementById: (id) => ({
            textContent: '',
            innerHTML: ''
        })
    };

    // Mock D3 to capture chartData
    global.capturedChartData = null;
    global.d3 = {
        select: () => {
            const chain = {
                append: () => chain,
                attr: () => chain,
                style: () => chain,
                selectAll: () => chain,
                data: (d) => chain,
                enter: () => chain,
                text: () => chain
            };
            return chain;
        },
        pie: () => {
            const pieFn = (data) => {
                global.capturedChartData = data;
                return [];
            };
            pieFn.value = () => pieFn;
            return pieFn;
        },
        arc: () => {
            const arcFn = () => {};
            arcFn.innerRadius = () => arcFn;
            arcFn.outerRadius = () => arcFn;
            arcFn.centroid = () => [0, 0];
            return arcFn;
        }
    };

    const stats = new StatsCharts();

    const data = {
        arcs: [
            { source: 0, target: 1 }, // OT -> OT
            { source: 2, target: 3 }, // NT -> NT
            { source: 0, target: 2 }  // OT -> NT
        ],
        chapters: [
            { bookId: 1 }, // 0
            { bookId: 1 }, // 1
            { bookId: 40 }, // 2
            { bookId: 40 }  // 3
        ],
        books: [
            { id: 1, testament: 'OT' },
            { id: 40, testament: 'NT' }
        ]
    };

    const bookMap = new Map([
        [1, { testament: 'OT' }],
        [40, { testament: 'NT' }]
    ]);

    stats.renderDonut(data, bookMap);

    let allPassed = true;

    function assert(condition, message) {
        if (!condition) {
            console.error(`❌ FAILED: ${message}`);
            allPassed = false;
        } else {
            console.log(`✅ PASSED: ${message}`);
        }
    }

    assert(global.capturedChartData !== null, 'chartData should be captured');

    if (global.capturedChartData) {
        assert(global.capturedChartData.length === 3, `Expected 3 chart segments, got ${global.capturedChartData.length}`);

        const otOt = global.capturedChartData.find(d => d.label === 'AT↔AT');
        const ntNt = global.capturedChartData.find(d => d.label === 'NT↔NT');
        const otNt = global.capturedChartData.find(d => d.label === 'AT↔NT');

        assert(otOt && otOt.count === 1, 'Expected 1 OT-OT arc');
        assert(ntNt && ntNt.count === 1, 'Expected 1 NT-NT arc');
        assert(otNt && otNt.count === 1, 'Expected 1 OT-NT arc');
    }

    if (!allPassed) {
        process.exit(1);
    }
}

testRenderDonut();

function testRenderDonutEmptyData() {
    console.log('\n--- renderDonut Empty Data Test ---');
    global.capturedChartData = null; // reset

    const stats = new StatsCharts();
    const data = { arcs: [] };
    const bookMap = new Map();

    stats.renderDonut(data, bookMap);

    let allPassed = true;
    function assert(condition, message) {
        if (!condition) {
            console.error(`❌ FAILED: ${message}`);
            allPassed = false;
        } else {
            console.log(`✅ PASSED: ${message}`);
        }
    }

    assert(global.capturedChartData === null, 'chartData should remain null when arcs are empty');

    if (!allPassed) {
        process.exit(1);
    }
}

testRenderDonutEmptyData();

function testRenderDonutFilteredData() {
    console.log('\n--- renderDonut Filtered Data Test ---');
    global.capturedChartData = null; // reset

    const stats = new StatsCharts();
    const data = {
        arcs: [
            { source: 0, target: 1 }, // OT -> OT
            { source: 0, target: 1 }  // OT -> OT
        ],
        chapters: [
            { bookId: 1 }, // 0
            { bookId: 1 }  // 1
        ],
        books: [
            { id: 1, testament: 'OT' }
        ]
    };
    const bookMap = new Map([
        [1, { testament: 'OT' }]
    ]);

    stats.renderDonut(data, bookMap);

    let allPassed = true;
    function assert(condition, message) {
        if (!condition) {
            console.error(`❌ FAILED: ${message}`);
            allPassed = false;
        } else {
            console.log(`✅ PASSED: ${message}`);
        }
    }

    assert(global.capturedChartData !== null, 'chartData should be captured');

    if (global.capturedChartData) {
        assert(global.capturedChartData.length === 1, `Expected 1 chart segment, got ${global.capturedChartData.length}`);

        const otOt = global.capturedChartData.find(d => d.label === 'AT↔AT');
        assert(otOt && otOt.count === 2, 'Expected 2 OT-OT arcs');
    }

    if (!allPassed) {
        process.exit(1);
    }
}

testRenderDonutFilteredData();
