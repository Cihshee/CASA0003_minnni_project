const palette = {
  exports: "#94bed9",
  imports: "#ff9466",
  balance: "#f1f1f1",
  timeline: "#ffffff" 
};

const W_box = 1100;
const H_box = 520;

const margin = { top: 60, right: 30, bottom: 30, left: 90 };
const width  = W_box - margin.left - margin.right;
const height = H_box - margin.top  - margin.bottom;


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


const timelineDates = [
  { date: "2016-06", label: "Brexit Referendum" },
  { date: "2017-03", label: "Article 50 Triggered" },
  { date: "2019-10", label: "Withdrawal Agreement" },
  { date: "2020-01", label: "UK Leaves EU" },
  { date: "2021-01", label: "Trade Agreement" }
];


d3.csv("public/data/eu_trade.csv").then(data => {
  data.forEach(d => {
    d.month         = parseDate(d.month);
    d.exports       = +d.exports;
    d.imports       = +d.imports;
    d.trade_balance = +d.trade_balance;
  });
 
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
  .call(d3.axisBottom(x))
  .selectAll("text")
    .style("font-size", "20px");  

g.append("g")
  .call(d3.axisLeft(y).tickFormat(d3.format(",d")))
  .selectAll("text")
    .style("font-size", "20px");


g.append("line")
    .attr("x1", 0)
    .attr("x2", width)
    .attr("y1", y(0))
    .attr("y2", y(0))
    .attr("stroke", "#f1f1f1") 
    .attr("stroke-width", 1); 

g.append("text")
    .attr("x", -margin.left + 10) 
    .attr("y", -margin.top/2 - 10)   
    .attr("fill", "#f1f1f1")
    .style("font-size", "20px") 
    .style("text-anchor", "start") 
    .text("£ million");

  g.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", palette.exports)
    .attr("stroke-width", 4)
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
      .attr("r", 4)                     
      .attr("fill", palette.exports)
      .attr("fill-opacity", 0)        
      .attr("stroke", "none")
    .on("mouseover", (event, d) => {
      d3.select(event.currentTarget)
        .attr("fill-opacity", 1)
        .attr("stroke-opacity", 1)
        .attr("r", 6);  
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
        .attr("r", 4);
      tooltip.style("opacity", 0);
    });
 

  g.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", palette.imports)
    .attr("stroke-width", 4)
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
      .attr("r", 4)
      .attr("fill", palette.imports)
      .attr("fill-opacity", 0)
      .attr("stroke", "none")
    .on("mouseover", (event, d) => {
      d3.select(event.currentTarget)
        .attr("fill-opacity", 1)
        .attr("stroke-opacity", 1)
        .attr("r", 6);
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
        .attr("r", 4);
      tooltip.style("opacity", 0);
    });


  g.selectAll(".bar")
    .data(data)
    .join("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.month) - 2)
        .attr("width", 7)
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
    .attr("y", 270) 
    .attr("fill", "#f1f1f1") 
    .style("font-size", "20px")
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
        .attr("stroke-width", 4) 
        .attr("stroke-dasharray", "8,8") 
        .attr("opacity", 0);
    }
    return null;
  }


  const timelineMarkers = {};
  timelineDates.forEach(item => {
    timelineMarkers[item.date] = createTimelineMarker(item.date);
  });


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

// 在文档加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
  // 获取所有CountryScale步骤
  const countrySteps = document.querySelectorAll('.country-chart-section .step');
  
  // 为每个步骤设置正确的时间轴标记位置
  countrySteps.forEach(step => {
    const marker = step.querySelector('.country-timeline-marker');
    const dateElement = step.querySelector('.country-step-date');
    
    if (marker && dateElement) {
      // 获取日期元素的位置
      const dateRect = dateElement.getBoundingClientRect();
      
      // 计算日期元素中心点相对于步骤顶部的位置
      const dateTop = dateElement.offsetTop;
      const dateHeight = dateElement.offsetHeight;
      const dateCenter = dateTop + (dateHeight / 2);
      
      // 设置标记位置，与日期中心点对齐
      marker.style.top = dateCenter + 'px';
    }
  });
});

// 当窗口大小改变时，重新计算位置
window.addEventListener('resize', function() {
  // 获取所有CountryScale步骤
  const countrySteps = document.querySelectorAll('.country-chart-section .step');
  
  // 为每个步骤重新设置正确的时间轴标记位置
  countrySteps.forEach(step => {
    const marker = step.querySelector('.country-timeline-marker');
    const dateElement = step.querySelector('.country-step-date');
    
    if (marker && dateElement) {
      // 计算日期元素中心点相对于步骤顶部的位置
      const dateTop = dateElement.offsetTop;
      const dateHeight = dateElement.offsetHeight;
      const dateCenter = dateTop + (dateHeight / 2);
      
      // 设置标记位置，与日期中心点对齐
      marker.style.top = dateCenter + 'px';
    }
  });
});