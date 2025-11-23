//getting data file 
const DATA_FILE = "shopping_behavior_updated.csv";

//dimensions 
const MARGIN = { top: 30, right: 120, bottom: 50, left: 70 };
const WIDTH = 600 - MARGIN.left - MARGIN.right;
const HEIGHT = 400 - MARGIN.top - MARGIN.bottom;

// age groups for filtering
const AGE_GROUPS = [
    '0-10', '11-20', '21-30', '31-40', '41-50', '51-60', '61-70', '71+'
];

// for Massachusetts data
let MAdata = [];

//group ages into age groups
function getAgeGroup(age) {
    if (age <= 10) return '0-10';
    if (age <= 20) return '11-20';
    if (age <= 30) return '21-30';
    if (age <= 40) return '31-40';
    if (age <= 50) return '41-50';
    if (age <= 60) return '51-60';
    if (age <= 70) return '61-70';
    else return '71+'; 
}


function aggregateData(data, keys) {
    const ageGroup = 'AgeGroup'; 

    // Aggregate both PurchaseAmount (amount) and count (count)
    const aggregatedMap = d3.rollup(
        data,
        v => ({
            amount: d3.sum(v, d => d.PurchaseAmount),
            count: v.length 
        }), 
        d => d.Gender, 
        d => d[ageGroup] 
    );

    // change map to array  
    const arrayData = Array.from(aggregatedMap, ([gender, seriesMap]) => {
        const row = { Gender: gender };
        let totalAmount = 0;
        let totalCount = 0;
        
        // get purchasing totals and counts for each age group
        keys.forEach(key => {
            // Store an object {amount, count} for the stacked key
            const result = seriesMap.get(key) || { amount: 0, count: 0 };
            row[key] = result;
            
            totalAmount += result.amount;
            totalCount += result.count;
        });

        row.TotalPurchase = totalAmount; // Used for Y-scale
        row.TotalCount = totalCount; // Used for label
        return row;
    })

    return { 
        arrayData, 
        stackKeys: keys, 
        genders: arrayData.map(d => d.Gender) 
    };
}


function loadAndStoreData(filePath) {
    return d3.csv(filePath, d => {
        const age = +d.Age;
        return {
            Location: d.Location,
            Gender: d.Gender,
            Age: age,
            AgeGroup: getAgeGroup(age),
            PurchaseAmount: +d["Purchase Amount (USD)"]
        };
    }).then(rawData => {
        MAdata = rawData.filter(d => d.Location === 'Massachusetts');
    });
}


//radio buttons for age group filtering
function initializeFilter() {
    const filterOptions = ['All', ...AGE_GROUPS];
    const filterContainer = d3.select("#age-filter-controls");

    filterContainer.html('<div style="font-weight: bold; margin-bottom: 5px;">Filter by Age Group:</div>');
    
    const radioGroup = filterContainer.append('div')
        .attr('class', 'radio-group');

    const radioItems = radioGroup.selectAll(".radio-item")
        .data(filterOptions)
        .enter()
        .append("div")
        .attr("class", "radio-item");

    radioItems.append("input")
        .attr("type", "radio")
        .attr("name", "ageFilter")
        .attr("id", d => `radio-${d}`)
        .attr("value", d => d)
        .property("checked", d => d === 'All') 
        .on("change", function(event) {
            filterAndRender(event.target.value);
        });

    radioItems.append("label")
        .attr("for", d => `radio-${d}`)
        .style("margin-left", "3px")
        .text(d => d);

    filterAndRender('All');
}


function filterAndRender(selectedAgeGroup) {
    d3.select("#d3-viz").selectAll("*").remove();

    let dataToAggregate = MAdata;
    let stackKeysToUse;

    if (selectedAgeGroup === 'All') {
        // Create a 'Total' group for all records
        dataToAggregate = MAdata.map(d => ({ ...d, AgeGroup: 'Total' }));
        stackKeysToUse = ['Total']; 
    } else {
        // Filter by the selected age group
        dataToAggregate = MAdata.filter(d => d.AgeGroup === selectedAgeGroup);
        stackKeysToUse = [selectedAgeGroup]; 
    }
    
    // Aggregate and prepare the data structure
    const processedData = aggregateData(dataToAggregate, stackKeysToUse);

    if (processedData.arrayData.length > 0) {
        renderChart(processedData);
    } else {
         d3.select("#d3-viz").append("p").text(`No data for Massachusetts in the '${selectedAgeGroup}' group.`);
    }
}
 function renderChart({ arrayData, stackKeys, genders }) {
    
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
        .domain([0, maxPurchaseAmount * 1.05])
        .range([HEIGHT, 0]);

    // Colors for Age Group
    const colorScale = d3.scaleOrdinal()
        .domain(AGE_GROUPS) 
        .range(d3.schemeCategory10); 

    // Update the value accessor to get the 'amount' property (from the previous change)
    const stackGenerator = d3.stack()
        .keys(stackKeys)
        .value((d, key) => d[key].amount); 

    const stackedData = stackGenerator(arrayData);

    // D3 formatter for currency (e.g., $15K)
    const currencyFormat = d3.format("$,.0f"); 


    // X Axis (Gender)
    svg.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", `translate(0,${HEIGHT})`)
        .call(d3.axisBottom(xScale))
        // Add X-axis label
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

    
    const layer = svg.selectAll(".layer")
        .data(stackedData)
        .enter()
        .append("g")
        .attr("class", "layer")
        // Set the fill color: default grey-blue for 'Total', or the specific Age Group's color
        .attr("fill", d => d.key === 'Total' ? '#4e79a7' : colorScale(d.key)); 

    // bars
    layer.selectAll("rect")
        .data(d => d)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => xScale(d.data.Gender))
        .attr("y", d => yScale(d[1]))
        .attr("height", d => yScale(d[0]) - yScale(d[1]))
        .attr("width", xScale.bandwidth());

    // **REVISED CODE:** Add text labels for the Purchase Amount
    svg.selectAll(".bar-label")
        .data(stackedData.flat())
        .enter()
        .append("text")
        .attr("class", "bar-label")
        .attr("x", d => xScale(d.data.Gender) + xScale.bandwidth() / 2)
        // Position the text slightly above the top of the bar
        .attr("y", d => yScale(d[1]) - 5) 
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("fill", "#000") 
        // Use d[1] (the top y-value of the bar) and format it as currency
        .text(d => currencyFormat(d[1])); 
}
function initialize() {
    loadAndStoreData(DATA_FILE).then(() => {
        initializeFilter(); 
    });
}

initialize();