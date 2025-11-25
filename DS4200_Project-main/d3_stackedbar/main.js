//getting data file 
const DATA_FILE = "shopping_behavior_updated.csv";

//dimensions 
const MARGIN = { top: 30, right: 120, bottom: 50, left: 70 };
const WIDTH = 600 - MARGIN.left - MARGIN.right;
const HEIGHT = 400 - MARGIN.top - MARGIN.bottom;

// for Massachusetts data
let MAdata = [];
let minAge, maxAge;

function loadAndStoreData(filePath) {
    return d3.csv(filePath, d => {
        const age = +d.Age;
        return {
            Location: d.Location,
            Gender: d.Gender,
            Age: age,
            PurchaseAmount: +d["Purchase Amount (USD)"]
        };
    }).then(rawData => {
        MAdata = rawData.filter(d => d.Location === 'Massachusetts');
        // Get age range from data
        minAge = d3.min(MAdata, d => d.Age);
        maxAge = d3.max(MAdata, d => d.Age);
    });
}


// Continuous age slider
function initializeFilter() {
    const filterContainer = d3.select("#age-filter-controls");
    filterContainer.html('');
    
    const sliderContainer = filterContainer.append('div')
        .attr('class', 'slider-container')
        .style('margin', '15px auto')
        .style('max-width', '400px')
        .style('padding', '10px');

    const label = sliderContainer.append('div')
        .attr('class', 'slider-label')
        .style('font-weight', 'bold')
        .style('margin-bottom', '8px')
        .style('text-align', 'center')
        .style('font-size', '13px')
        .text('Ages: All');

    const sliderWrapper = sliderContainer.append('div')
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('gap', '8px');

    sliderWrapper.append('span')
        .style('font-size', '11px')
        .style('color', '#666')
        .style('min-width', '30px')
        .text('All');

    const slider = sliderWrapper.append('input')
        .attr('type', 'range')
        .attr('min', minAge)
        .attr('max', maxAge)
        .attr('value', maxAge)
        .attr('step', 1)
        .style('flex', '1')
        .style('cursor', 'pointer')
        .style('height', '6px')
        .on('input', function() {
            const selectedMaxAge = +this.value;
            if (selectedMaxAge === maxAge) {
                label.text('Ages: All');
            } else {
                label.text(`Ages: ${minAge}-${selectedMaxAge}`);
            }
            filterAndRender(selectedMaxAge);
        });

    sliderWrapper.append('span')
        .style('font-size', '11px')
        .style('color', '#666')
        .style('min-width', '30px')
        .style('text-align', 'right')
        .text(maxAge);

    filterAndRender(maxAge);
}


function aggregateData(data) {
    const aggregatedMap = d3.rollup(
        data,
        v => ({
            amount: d3.sum(v, d => d.PurchaseAmount),
            count: v.length 
        }), 
        d => d.Gender
    );

    const arrayData = Array.from(aggregatedMap, ([gender, result]) => ({
        Gender: gender,
        TotalPurchase: result.amount,
        TotalCount: result.count
    }));

    return { 
        arrayData,
        genders: arrayData.map(d => d.Gender) 
    };
}


function filterAndRender(maxAgeFilter) {
    d3.select("#d3-viz").selectAll("*").remove();

    const dataToAggregate = MAdata.filter(d => d.Age <= maxAgeFilter);
    
    const processedData = aggregateData(dataToAggregate);

    if (processedData.arrayData.length > 0) {
        renderChart(processedData, maxAgeFilter);
    } else {
        d3.select("#d3-viz").append("p")
            .style('text-align', 'center')
            .style('margin-top', '50px')
            .text(`No data for Massachusetts for ages up to ${maxAgeFilter}.`);
    }
}

function renderChart({ arrayData, genders }, maxAgeFilter) {
    
    //SVG container
    const svg = d3.select("#d3-viz")
        .append("svg")
        .attr("width", WIDTH + MARGIN.left + MARGIN.right)
        .attr("height", HEIGHT + MARGIN.top + MARGIN.bottom)
        .append("g")
        .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    // X scale for Gender
    const xScale = d3.scaleBand()
        .domain(genders)
        .range([0, WIDTH])
        .padding(0.3);

    // Y scale for Purchase Amount
    const maxPurchaseAmount = d3.max(arrayData, d => d.TotalPurchase);
    const yScale = d3.scaleLinear()
        .domain([0, maxPurchaseAmount * 1.1])
        .range([HEIGHT, 0]);

    // Color
    const barColor = '#4ea758ff';

    // D3 formatter for currency
    const currencyFormat = d3.format("$,.0f"); 

    // X Axis (Gender)
    svg.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", `translate(0,${HEIGHT})`)
        .call(d3.axisBottom(xScale))
        .append("text")
        .attr("fill", "#000")
        .attr("x", WIDTH / 2)
        .attr("y", 40)
        .text("Gender");

    // Y Axis (Purchase Amount)
    svg.append("g")
        .attr("class", "axis axis--y")
        .call(d3.axisLeft(yScale).ticks(5).tickFormat(d3.format("~s")))
        .append("text")
        .attr("fill", "#000")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", "-5em") 
        .attr("text-anchor", "end")
        .text("Total Purchase Amount (USD)");

    // Draw bars
    svg.selectAll(".bar")
        .data(arrayData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => xScale(d.Gender))
        .attr("y", d => yScale(d.TotalPurchase))
        .attr("height", d => HEIGHT - yScale(d.TotalPurchase))
        .attr("width", xScale.bandwidth())
        .attr("fill", barColor);

    // Add text labels for the Purchase Amount
    svg.selectAll(".bar-label")
        .data(arrayData)
        .enter()
        .append("text")
        .attr("class", "bar-label")
        .attr("x", d => xScale(d.Gender) + xScale.bandwidth() / 2)
        .attr("y", d => yScale(d.TotalPurchase) - 5) 
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("fill", "#000") 
        .text(d => currencyFormat(d.TotalPurchase)); 
}

function initialize() {
    loadAndStoreData(DATA_FILE).then(() => {
        initializeFilter(); 
    });
}

initialize();