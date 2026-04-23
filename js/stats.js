class StatsCharts {
    constructor() {
        this.colors = {
            'OT-OT': '#8b0000',
            'NT-NT': '#00008b',
            'OT-NT': '#8b008b'
        };
    }

    render(data) {
        this.renderDonut(data);
        this.renderTopBooks(data);
        this.renderTopChapters(data);
    }

    renderDonut(data) {
        const container = document.getElementById('donut-chart');
        container.innerHTML = '';
        if (data.arcs.length === 0) return;

        let otOt = 0, ntNt = 0, otNt = 0;
        data.arcs.forEach(arc => {
            const sCh = data.chapters[arc.source];
            const tCh = data.chapters[arc.target];
            const sTest = data.books.find(b => b.id === sCh.bookId).testament;
            const tTest = data.books.find(b => b.id === tCh.bookId).testament;

            if (sTest === 'OT' && tTest === 'OT') otOt++;
            else if (sTest === 'NT' && tTest === 'NT') ntNt++;
            else otNt++;
        });

        const chartData = [
            { label: 'AT↔AT', count: otOt, color: this.colors['OT-OT'] },
            { label: 'NT↔NT', count: ntNt, color: this.colors['NT-NT'] },
            { label: 'AT↔NT', count: otNt, color: this.colors['OT-NT'] }
        ].filter(d => d.count > 0);

        const width = 260, height = 200, radius = Math.min(width, height) / 2;

        const svg = d3.select("#donut-chart")
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", `translate(${width / 2},${height / 2})`);

        const pie = d3.pie().value(d => d.count);
        const arc = d3.arc().innerRadius(radius * 0.5).outerRadius(radius * 0.8);

        const arcs = svg.selectAll("arc")
            .data(pie(chartData))
            .enter()
            .append("g");

        arcs.append("path")
            .attr("d", arc)
            .attr("fill", d => d.data.color)
            .attr("stroke", "#16213e")
            .style("stroke-width", "2px");

        arcs.append("text")
            .attr("transform", d => `translate(${arc.centroid(d)})`)
            .attr("text-anchor", "middle")
            .style("font-size", "10px")
            .style("fill", "white")
            .text(d => d.data.label);
    }

    renderTopBooks(data) {
        const container = document.getElementById('top-books-chart');
        container.innerHTML = '';
        if (data.arcs.length === 0) return;

        const counts = {};
        data.arcs.forEach(arc => {
            const sBook = data.chapters[arc.source].bookId;
            const tBook = data.chapters[arc.target].bookId;
            counts[sBook] = (counts[sBook] || 0) + 1;
            counts[tBook] = (counts[tBook] || 0) + 1;
        });

        const sorted = Object.entries(counts)
            .map(([id, count]) => {
                const b = data.books.find(b => b.id == id);
                return { name: b ? b.shortName : id, count };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        this.renderBarChart(sorted, "#top-books-chart");
    }

    renderTopChapters(data) {
        const container = document.getElementById('top-chapters-chart');
        container.innerHTML = '';
        if (data.arcs.length === 0) return;

        const counts = {};
        data.arcs.forEach(arc => {
            counts[arc.source] = (counts[arc.source] || 0) + 1;
            counts[arc.target] = (counts[arc.target] || 0) + 1;
        });

        const sorted = Object.entries(counts)
            .map(([idx, count]) => {
                const c = data.chapters[idx];
                return { name: `${c.bookName} ${c.chapterNum}`, count };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        this.renderBarChart(sorted, "#top-chapters-chart");
    }

    renderBarChart(data, selector) {
        const margin = {top: 10, right: 10, bottom: 20, left: 60},
              width = 260 - margin.left - margin.right,
              height = 150 - margin.top - margin.bottom;

        const svg = d3.select(selector)
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const x = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.count)])
            .range([0, width]);

        const y = d3.scaleBand()
            .range([0, height])
            .domain(data.map(d => d.name))
            .padding(.1);

        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).ticks(3))
            .selectAll("text")
            .style("fill", "#ccc");

        svg.append("g")
            .call(d3.axisLeft(y))
            .selectAll("text")
            .style("fill", "#ccc");

        svg.selectAll(".domain, .tick line")
            .style("stroke", "#444");

        svg.selectAll("myRect")
            .data(data)
            .enter()
            .append("rect")
            .attr("x", x(0) )
            .attr("y", d => y(d.name) )
            .attr("width", d => x(d.count) )
            .attr("height", y.bandwidth() )
            .attr("fill", "#69b3a2");
    }
}
