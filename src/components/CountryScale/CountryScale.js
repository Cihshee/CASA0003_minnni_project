// Color scheme for the visualization
const palette = {
  exports: "#65bceb",
  imports: "#ff8827",
  balance: "#f1f1f1",
  timeline: "#ffffff" 
};

// Chart dimensions and margins
const W_box = 2900;
const H_box = 1450;

const margin = { top: 120, right: 20, bottom: 60, left: 210 };
const width  = W_box - margin.left - margin.right;
const height = H_box - margin.top  - margin.bottom;

// Initialize SVG and tooltip
const svg = d3.select("#scroll-chart")
  .attr("viewBox", `0 0 ${W_box} ${H_box}`)
  .attr("preserveAspectRatio", "xMidYMid meet")
  .classed("svg-content-responsive", true);

const tooltip = d3.select("body")
  .append("div")
    .attr("class", "tooltip");
 
const g = svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

 
const parseDate = d3.timeParse("%Y %b");
const parseTimelineDate = d3.timeParse("%Y-%m");


const scroller = scrollama();


// Timeline events data
const timelineDates = [
  { date: "2016-06", label: "Brexit Referendum" },
  { date: "2017-03", label: "Article 50 Triggered" },
  { date: "2019-10", label: "Withdrawal Agreement" },
  { date: "2020-01", label: "UK Leaves EU" },
  { date: "2021-01", label: "Trade Agreement" }
];

// Load and process trade data
d3.csv("public/data/eu_trade.csv").then(data => {
  // Process data and create scales
  data.forEach(d => {
    d.month         = parseDate(d.month);
    d.exports       = +d.exports;
    d.imports       = +d.imports;
    d.trade_balance = +d.trade_balance;
  });

  // Create scales for x and y axes
  const x = d3.scaleTime()
    .domain(d3.extent(data, d => d.month))
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([
      d3.min(data, d => Math.min(d.exports, d.imports, d.trade_balance)),
      d3.max(data, d => Math.max(d.exports, d.imports))
    ])
    .nice()
    .range([height, 0]);

g.append("g")
  .attr("transform", `translate(0,${height})`)
  .call(d3.axisBottom(x).tickPadding(15))
  .selectAll("text")
    .style("font-size", "50px");

g.selectAll("g")
  .filter(function() {
    return this.getAttribute("transform") === `translate(0,${height})`;
  })
  .select(".domain")
  .style("stroke-width", "4px")
  .style("stroke", "#f1f1f1");

g.append("g")
  .call(d3.axisLeft(y).tickFormat(d3.format(",d")).tickPadding(15))
  .selectAll("text")
    .style("font-size", "50px");

g.selectAll("g")
  .filter(function() {
    return !this.getAttribute("transform");
  })
  .select(".domain")
  .style("stroke-width", "4px")
  .style("stroke", "#f1f1f1");

g.append("line")
    .attr("x1", 0)
    .attr("x2", width)
    .attr("y1", y(0))
    .attr("y2", y(0))
    .attr("stroke", "#f1f1f1") 
    .attr("stroke-width", 6); 

g.append("text")
    .attr("x", -margin.left + 10) 
    .attr("y", -margin.top/2 - 10)   
    .attr("fill", "#f1f1f1")
    .style("font-size", "50px") 
    .style("text-anchor", "start") 
    .text("£ million");

  // Draw exports line and points
  g.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", palette.exports)
    .attr("stroke-width", 10)
    .attr("d", d3.line()
      .x(d => x(d.month))
      .y(d => y(d.exports))
    );


  g.selectAll(".dot-exports")
    .data(data)
    .join("circle")
      .attr("class", "dot-exports")
      .attr("cx", d => x(d.month))
      .attr("cy", d => y(d.exports))
      .attr("r", 6)                     
      .attr("fill", palette.exports)
      .attr("fill-opacity", 0)        
      .attr("stroke", "none")
    .on("mouseover", (event, d) => {
      d3.select(event.currentTarget)
        .attr("fill-opacity", 1)
        .attr("stroke-opacity", 1)
        .attr("r", 18);  
      tooltip
        .html(
          `<strong>${d3.timeFormat("%B %Y")(d.month)}</strong><br/>` +
          `Exports (£m): ${d.exports.toLocaleString()}`
        )
        .style("left",  `${event.pageX + 10}px`)
        .style("top",   `${event.pageY - 28}px`)
        .style("opacity", 1);
    })
    .on("mouseout", (event) => {
      d3.select(event.currentTarget)
        .attr("fill-opacity", 0)
        .attr("stroke-opacity", 0)
        .attr("r", 6);
      tooltip.style("opacity", 0);
    });
 

  // Draw imports line and points
  g.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", palette.imports)
    .attr("stroke-width", 10)
    .attr("d", d3.line()
      .x(d => x(d.month))
      .y(d => y(d.imports))
    );


  g.selectAll(".dot-imports")
    .data(data)
    .join("circle")
      .attr("class", "dot-imports")
      .attr("cx", d => x(d.month))
      .attr("cy", d => y(d.imports))
      .attr("r", 6)
      .attr("fill", palette.imports)
      .attr("fill-opacity", 0)
      .attr("stroke", "none")
    .on("mouseover", (event, d) => {
      d3.select(event.currentTarget)
        .attr("fill-opacity", 1)
        .attr("stroke-opacity", 1)
        .attr("r", 18);
      tooltip
        .html(
          `<strong>${d3.timeFormat("%B %Y")(d.month)}</strong><br/>` +
          `Imports (£m): ${d.imports.toLocaleString()}`
        )
        .style("left",  `${event.pageX + 10}px`)
        .style("top",   `${event.pageY - 28}px`)
        .style("opacity", 1);
    })
    .on("mouseout", (event) => {
      d3.select(event.currentTarget)
        .attr("fill-opacity", 0)
        .attr("stroke-opacity", 0)
        .attr("r", 6);
      tooltip.style("opacity", 0);
    });


  // Draw trade balance bars
  g.selectAll(".bar")
    .data(data)
    .join("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.month) - 3)
        .attr("width", 16)
        .attr("y", d => y(Math.max(0, d.trade_balance)))
        .attr("height", d => Math.abs(y(d.trade_balance) - y(0)))
        .attr("fill", d => d.trade_balance >= 0 ? palette.balance : d3.color(palette.balance).darker(1))
        .attr("fill-opacity", 0.8)
    .on("mouseover", (event, d) => {
        d3.select(event.currentTarget)
        .attr("fill-opacity", 1);
        tooltip
        .html(
            `<strong>${d3.timeFormat("%B %Y")(d.month)}</strong><br/>` +
            `Balance (£m): ${d.trade_balance.toLocaleString()}`
        )
        .style("left",  `${event.pageX + 10}px`)
        .style("top",   `${event.pageY - 28}px`)
        .style("opacity", 1);
    })
    .on("mouseout", (event) => {
        d3.select(event.currentTarget)
        .attr("fill-opacity", 0.8);
        tooltip.style("opacity", 0);
    });

g.append("text")
    .attr("x", width - 5) 
    .attr("y", 800) 
    .attr("fill", "#f1f1f1") 
    .style("font-size", "50px")
    .style("text-anchor", "end") 
    .text("Trade Balance");

  const timelineGroup = g.append("g")
    .attr("class", "timeline-group")
    .attr("z-index", 5); 


  function createTimelineMarker(date) {
    const parsedDate = parseTimelineDate(date);
    if (parsedDate >= x.domain()[0] && parsedDate <= x.domain()[1]) {
      const xPos = x(parsedDate);
      
      return timelineGroup.append("line")
        .attr("class", "timeline-marker")
        .attr("x1", xPos)
        .attr("x2", xPos)
        .attr("y1", 0)
        .attr("y2", height)
        .attr("stroke", palette.timeline)
        .attr("stroke-width", 10)
        .attr("stroke-dasharray", "12,12")
        .attr("opacity", 0);
    }
    return null;
  }


  const timelineMarkers = {};
  timelineDates.forEach(item => {
    timelineMarkers[item.date] = createTimelineMarker(item.date);
  });


  // Setup scrollytelling interaction
  scroller
    .setup({
      step: '.step',
      offset: 0.6, 
      debug: false,
      progress: true 
    })
    .onStepEnter(response => {
      timelineGroup.selectAll(".timeline-marker").attr("opacity", 0);
      
      d3.selectAll('.step').classed('is-active', false);
      d3.select(response.element).classed('is-active', true);
      
      const currentDate = d3.select(response.element).attr("data-date");
      if (currentDate && timelineMarkers[currentDate]) {
        timelineMarkers[currentDate].attr("opacity", 1);
      }
      
      d3.selectAll('.timeline-dot, .timeline-connector').style('opacity', 0.4);
      d3.select(response.element).select('.timeline-dot').style('opacity', 1);
      d3.select(response.element).select('.timeline-connector').style('opacity', 1);
      
      const isSummaryStep = d3.select(response.element).attr("data-summary") === "true";
      if (isSummaryStep) {
        d3.select("#chart-summary").classed("hidden", false);
      } else {
        d3.select("#chart-summary").classed("hidden", true);
      }
    })
    .onStepExit(response => {
      if (response.direction === "up") {
        const currentDate = d3.select(response.element).attr("data-date");
        if (currentDate && timelineMarkers[currentDate]) {
          timelineMarkers[currentDate].attr("opacity", 0);
        }
      }
    });

  // Handle responsive layout
  function handleResize() {
    const isMobile = window.innerWidth < 768;
    
    if (isMobile) {
    } else {
    }
    
    scroller.resize();
  }

  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', handleResize);

  handleResize();
});

// Position timeline markers on load and resize
document.addEventListener('DOMContentLoaded', function() {
  const countrySteps = document.querySelectorAll('.country-chart-section .step');
  
  countrySteps.forEach(step => {
    const marker = step.querySelector('.country-timeline-marker');
    const dateElement = step.querySelector('.country-step-date');
    
    if (marker && dateElement) {
      const dateRect = dateElement.getBoundingClientRect();
      
      const dateTop = dateElement.offsetTop;
      const dateHeight = dateElement.offsetHeight;
      const dateCenter = dateTop + (dateHeight / 2);
      
      marker.style.top = dateCenter + 'px';
    }
  });
});


window.addEventListener('resize', function() {
  const countrySteps = document.querySelectorAll('.country-chart-section .step');
  
  countrySteps.forEach(step => {
    const marker = step.querySelector('.country-timeline-marker');
    const dateElement = step.querySelector('.country-step-date');
    
    if (marker && dateElement) {
      const dateTop = dateElement.offsetTop;
      const dateHeight = dateElement.offsetHeight;
      const dateCenter = dateTop + (dateHeight / 2);
      
      marker.style.top = dateCenter + 'px';
    }
  });
});