//getting data file 
const DATA_FILE = "shopping_behavior_updated.csv";

//dimensions for both charts
const MARGIN = { top: 30, right: 20, bottom: 50, left: 70 };
const CHART_WIDTH = 350 - MARGIN.left - MARGIN.right;
const CHART_HEIGHT = 400 - MARGIN.top - MARGIN.bottom;
const CHART_GAP = 40; // Gap between charts

// for Massachusetts data
let MAdata = [];
let minAge, maxAge;
let selectedGender = null; // Track selected gender for linking

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
        renderCharts(processedData, dataToAggregate, maxAgeFilter);
    } else {
        d3.select("#d3-viz").append("p")
            .style('text-align', 'center')
            .style('margin-top', '50px')
            .text(`No data for Massachusetts for ages up to ${maxAgeFilter}.`);
    }
}

function renderCharts({ arrayData, genders }, filteredData, maxAgeFilter) {
    // Create container for both charts
    const container = d3.select("#d3-viz")
        .append("div")
        .style("display", "flex")
        .style("justify-content", "center")
        .style("gap", `${CHART_GAP}px`)
        .style("align-items", "flex-start");

    // Render bar chart (left)
    renderBarChart(container, arrayData, genders, filteredData);
    
    // Render histogram (right)
    renderHistogram(container, filteredData, genders);
}

function renderBarChart(container, arrayData, genders, filteredData) {
    const chartDiv = container.append("div");
    
    // Add title
    chartDiv.append("div")
        .style("text-align", "center")
        .style("font-weight", "bold")
        .style("margin-bottom", "10px")
        .style("font-size", "12px")
        .text("Click a bar to see detailed distribution");

    const svg = chartDiv
        .append("svg")
        .attr("width", CHART_WIDTH + MARGIN.left + MARGIN.right)
        .attr("height", CHART_HEIGHT + MARGIN.top + MARGIN.bottom)
        .append("g")
        .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    // X scale for Gender
    const xScale = d3.scaleBand()
        .domain(genders)
        .range([0, CHART_WIDTH])
        .padding(0.3);

    // Y scale for Purchase Amount
    const maxPurchaseAmount = d3.max(arrayData, d => d.TotalPurchase);
    const yScale = d3.scaleLinear()
        .domain([0, maxPurchaseAmount * 1.1])
        .range([CHART_HEIGHT, 0]);

    // Color scale
    const getGenderColor = (gender) => {
    if (gender === 'Male') return '#4169E1';      // blue
    if (gender === 'Female') return '#FF69B4';    // pink
    return '#9370DB';                              // purple (for all genders)
};

    const currencyFormat = d3.format("$,.0f"); 

    // X Axis
    svg.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", `translate(0,${CHART_HEIGHT})`)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .style("font-size", "11px");

    svg.select(".axis--x")
        .append("text")
        .attr("fill", "#000")
        .attr("x", CHART_WIDTH / 2)
        .attr("y", 40)
        .style("font-size", "12px")
        .text("Gender");

    // Y Axis
    svg.append("g")
        .attr("class", "axis axis--y")
        .call(d3.axisLeft(yScale).ticks(5).tickFormat(d3.format("~s")))
        .selectAll("text")
        .style("font-size", "11px");

    svg.select(".axis--y")
        .append("text")
        .attr("fill", "#000")
        .attr("transform", "rotate(-90)")
        .attr("y", -50)
        .attr("x", -CHART_HEIGHT / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Total Purchase Amount (USD)");

    // Draw bars with click interaction
    const bars = svg.selectAll(".bar")
        .data(arrayData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => xScale(d.Gender))
        .attr("y", d => yScale(d.TotalPurchase))
        .attr("height", d => CHART_HEIGHT - yScale(d.TotalPurchase))
        .attr("width", xScale.bandwidth())
        .attr("fill", d => getGenderColor(d.Gender))
        .attr("opacity", 0.8)
        .style("cursor", "pointer")
        .on("click", function(event, d) {
            // Toggle selection
            if (selectedGender === d.Gender) {
                selectedGender = null;
            } else {
                selectedGender = d.Gender;
            }
            
            // Update bar appearances
            bars.attr("opacity", barData => {
                if (selectedGender === null) return 0.8;
                return barData.Gender === selectedGender ? 1 : 0.3;
            })
            .attr("stroke", barData => barData.Gender === selectedGender ? "#000" : "none")
            .attr("stroke-width", 2);
            
            // Update histogram
            updateHistogram(filteredData, genders);
        })
        .on("mouseover", function(event, d) {
            d3.select(this).attr("opacity", 1);
            
            // Show tooltip
            const tooltip = d3.select("body").append("div")
                .attr("class", "tooltip")
                .style("position", "absolute")
                .style("background", "white")
                .style("color", "black")
                .style("padding", "8px")
                .style("box-shadow", "0px 0px 6px rgba(0,0,0,0.2)")
                .style("border-radius", "4px")
                .style("font-size", "12px")
                .style("pointer-events", "none")
                .style("z-index", "1000")
                .html(`
                    <strong>${d.Gender}</strong><br/>
                    Total: ${currencyFormat(d.TotalPurchase)}<br/>
                    Count: ${d.TotalCount} purchases
                `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function(event, d) {
            if (selectedGender === null || d.Gender === selectedGender) {
                d3.select(this).attr("opacity", selectedGender === d.Gender ? 1 : 0.8);
            } else {
                d3.select(this).attr("opacity", 0.3);
            }
            d3.selectAll(".tooltip").remove();
        });

    // Add text labels
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

function renderHistogram(container, filteredData, genders) {
    const chartDiv = container.append("div")
        .attr("id", "histogram-container");
    
    // Add title
    chartDiv.append("div")
        .attr("id", "histogram-title")
        .style("text-align", "center")
        .style("font-weight", "bold")
        .style("margin-bottom", "10px")
        .style("font-size", "12px")
        .text(selectedGender ? `Distribution: ${selectedGender}` : "Distribution: All Genders");

    const svg = chartDiv
        .append("svg")
        .attr("id", "histogram-svg")
        .attr("width", CHART_WIDTH + MARGIN.left + MARGIN.right)
        .attr("height", CHART_HEIGHT + MARGIN.top + MARGIN.bottom)
        .append("g")
        .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    updateHistogram(filteredData, genders);
}

function updateHistogram(filteredData) {
    // Filter data based on selection
    const dataToShow = selectedGender 
        ? filteredData.filter(d => d.Gender === selectedGender)
        : filteredData;

    // Update title
    d3.select("#histogram-title")
        .text(selectedGender ? `Distribution: ${selectedGender}` : "Distribution: All Genders");

    const svg = d3.select("#histogram-svg g");
    svg.selectAll("*").remove();

    // Create histogram bins
    const xExtent = d3.extent(dataToShow, d => d.PurchaseAmount);
    const xScale = d3.scaleLinear()
        .domain([0, 100])
        .range([0, CHART_WIDTH]);

    const histogram = d3.histogram()
        .domain(xScale.domain())
        .thresholds(xScale.ticks(20))
        .value(d => d.PurchaseAmount);

    const bins = histogram(dataToShow);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(bins, d => d.length)])
        .range([CHART_HEIGHT, 0]);

    // Color scale
    const getGenderColor = (gender) => {
    if (gender === 'Male') return '#4169E1';      // blue
    if (gender === 'Female') return '#FF69B4';    // pink
    return '#9370DB';                              // purple (for all genders)
};

    // X Axis
    svg.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", `translate(0,${CHART_HEIGHT})`)
        .call(d3.axisBottom(xScale).ticks(5))
        .selectAll("text")
        .style("font-size", "11px");

    svg.select(".axis--x")
        .append("text")
        .attr("fill", "#000")
        .attr("x", CHART_WIDTH / 2)
        .attr("y", 40)
        .style("font-size", "12px")
        .text("Purchase Amount (USD)");

    // Y Axis
    svg.append("g")
        .attr("class", "axis axis--y")
        .call(d3.axisLeft(yScale).ticks(5))
        .selectAll("text")
        .style("font-size", "11px");

    svg.select(".axis--y")
        .append("text")
        .attr("fill", "#000")
        .attr("transform", "rotate(-90)")
        .attr("y", -50)
        .attr("x", -CHART_HEIGHT / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Number of Purchases");

    // Draw histogram bars
    svg.selectAll(".hist-bar")
        .data(bins)
        .enter()
        .append("rect")
        .attr("class", "hist-bar")
        .attr("x", d => xScale(d.x0) + 1)
        .attr("y", d => yScale(d.length))
        .attr("width", d => Math.max(0, xScale(d.x1) - xScale(d.x0) - 2))
        .attr("height", d => CHART_HEIGHT - yScale(d.length))
        .attr("fill", selectedGender ? getGenderColor(selectedGender) : "#9370DB")
        .attr("opacity", 0.7)
        .on("mouseover", function(event, d) {
            d3.select(this).attr("opacity", 1);
            
            const tooltip = d3.select("body").append("div")
                .attr("class", "tooltip")
                .style("position", "absolute")
                .style("background", "white")
                .style("color", "black")
                .style("padding", "8px")
                .style("box-shadow", "0px 0px 6px rgba(0,0,0,0.2)")
                .style("border-radius", "4px")
                .style("font-size", "12px")
                .style("pointer-events", "none")
                .style("z-index", "1000")
                .html(`
                    Range: $${Math.round(d.x0)}-$${Math.round(d.x1)}<br/>
                    Count: ${d.length} purchases
                `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).attr("opacity", 0.7);
            d3.selectAll(".tooltip").remove();
        });

    
}

function initialize() {
    loadAndStoreData(DATA_FILE).then(() => {
        initializeFilter(); 
    });
}

initialize();