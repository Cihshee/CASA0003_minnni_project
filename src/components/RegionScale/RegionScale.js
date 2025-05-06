const heatmapColors = [
    "#2166ac", "#338ec4", "#92c5de", "#cae2ee",
    "#fee5d9", "#fcbba1", "#fb6a4a", "#de2d26"
];
const heatmapBounds = [-25000, -1500, -500, -100, 0, 150, 200, 800, 10500];


let currentYear = 2016;

window.addEventListener('load', initializeHeatmap);

function initializeHeatmap() {
  const container = document.getElementById('heatmap-container');
  if (!container) return;
  container.innerHTML = '';


  const yearSelector = document.createElement('div');
  yearSelector.className = 'year-selector';
  container.appendChild(yearSelector);


  const yearDisplay = document.createElement('div');
  yearDisplay.style.fontSize = '20px'; 
  yearDisplay.innerHTML = `
    <span>Current Year: </span>
    <span id="current-year" style="font-weight:bold;color:#fcbba1;">
      ${currentYear}
    </span>
  `;
  yearSelector.appendChild(yearDisplay);


  const btnWrap = document.createElement('div');
  btnWrap.id = 'year-buttons';
  btnWrap.style.display = 'flex';
  btnWrap.style.justifyContent = 'center';
  btnWrap.style.flexWrap = 'wrap';
  btnWrap.style.gap = '5px';
  btnWrap.style.marginTop = '8px';
  yearSelector.appendChild(btnWrap);


  const svgContainer = document.createElement('div');
  svgContainer.id = 'heatmap-svg';
  container.appendChild(svgContainer);


  loadData();
}

function loadData() {
  const svgContainer = document.getElementById('heatmap-svg');
  svgContainer.innerHTML = '<div class="loading">Loading data, please wait…</div>';

  d3.csv('data/region_trade_20country.csv')
    .then(data => {
      data.forEach(d => {
        d.Year = +d.Year;
        d.Trade_Balance_m = +d.Trade_Balance_m;
        d.Imports_m = +d.Imports_m;
        d.Exports_m = +d.Exports_m;
      });

      const years = Array.from(new Set(data.map(d => d.Year))).sort();
      const regions = Array.from(new Set(data.map(d => d.Region)));
      const countries = Array.from(new Set(data.map(d => d.Country20)));

      createYearButtons(years, data, regions, countries);
      renderHeatmap(data, regions, countries, currentYear);
      setupScrollListener(years, data, regions, countries);
    })
    .catch(err => {
      svgContainer.innerHTML = `<div class="error">Error loading data: ${err.message}</div>`;
    });
}

function createYearButtons(years, data, regions, countries) {
  const wrap = document.getElementById('year-buttons');
  wrap.innerHTML = '';
  years.forEach(y => {
    const btn = document.createElement('button');
    btn.textContent = y;
    btn.className = (y === currentYear ? 'year-button active' : 'year-button');
    btn.addEventListener('click', () => {
      currentYear = y;
      updateYearDisplay();
      renderHeatmap(data, regions, countries, y);
    });
    wrap.appendChild(btn);
  });
}

function updateYearDisplay() {
  document.querySelectorAll('.year-button').forEach(btn => {
    btn.classList.toggle('active', +btn.textContent === currentYear);
  });
  document.getElementById('current-year').textContent = currentYear;
}

function setupScrollListener(years, data, regions, countries) {
  window.addEventListener('scroll', () => {
    const sec = document.querySelector('.region-scale-section');
    if (!sec) return;
    const rect = sec.getBoundingClientRect();
    const vh = window.innerHeight;
    if (rect.top < vh && rect.bottom > 0) {
      const progress = (vh - rect.top) / (vh + rect.height);
      const idx = Math.min(
        years.length - 1,
        Math.floor(Math.max(0, Math.min(1, progress)) * years.length)
      );
      const newY = years[idx];
      if (newY !== currentYear) {
        currentYear = newY;
        updateYearDisplay();
        renderHeatmap(data, regions, countries, newY);
      }
    }
  });
}

function renderHeatmap(data, regions, countries, year) {
  const container = d3.select('#heatmap-svg');
  container.html('');

  const yearData = data.filter(d => d.Year === year);
  if (yearData.length === 0) {
    container.html('<div class="error">No data for this year</div>');
    return;
  }


  const lookup = {};
  yearData.forEach(d => {
    lookup[`${d.Region}-${d.Country20}`] = {
      balance: d.Trade_Balance_m,
      imports: d.Imports_m,
      exports: d.Exports_m
    };
  });


  const margin = { top: 40, right: 160, bottom: 120, left: 150 };
  const totalW = Math.min(container.node().clientWidth, 900);
  const width = totalW - margin.left - margin.right;
  const height = 520 - margin.top - margin.bottom;


  const svg = container.append('svg')
    .attr('width', totalW)
    .attr('height', height + margin.top + margin.bottom)
    .style('overflow', 'visible')
    .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);


  const xScale = d3.scaleBand().domain(countries).range([0, width]).padding(0.1);
  const yScale = d3.scaleBand().domain(regions).range([0, height]).padding(0.1);
  const colorScale = d3.scaleThreshold()
    .domain(heatmapBounds.slice(1, -1))
    .range(heatmapColors);


  let tooltip = d3.select('body').select('.tooltip');
  if (tooltip.empty()) {
    tooltip = d3.select('body')
      .append('div')
      .attr('class', 'tooltip');
  }


  regions.forEach(region => {
    countries.forEach(country => {
      const stat = lookup[`${region}-${country}`] || { balance: 0, imports: 0, exports: 0 };
      svg.append('rect')
        .attr('x', xScale(country))
        .attr('y', yScale(region))
        .attr('width', xScale.bandwidth())
        .attr('height', yScale.bandwidth())
        .attr('fill', colorScale(stat.balance))
        .on('mouseover', (event) => {
          tooltip
            .style('opacity', 0.9)
            .html(`
              <strong>${region} - ${country}</strong><br/>
              Trade Balance: £${stat.balance.toLocaleString()} million<br/>
              Imports: £${stat.imports.toLocaleString()} million<br/>
              Exports: £${stat.exports.toLocaleString()} million
            `)
            .style('left', `${event.pageX + 10}px`)
            .style('top', `${event.pageY - 28}px`);
        })
        .on('mouseout', () => {
          tooltip.style('opacity', 0);
        });
    });
  });


  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(xScale))
    .selectAll('text')
      .attr('transform', 'rotate(-65)')
      .style('text-anchor', 'end');
  svg.append('g').call(d3.axisLeft(yScale));

  const legend = svg.append('g')
    .attr('class', 'legend')
    .attr('transform', `translate(${width + 20}, 0)`);

  legend.append('text')
    .attr('x', 0).attr('y', 0)
    .text('£ Million');

  const legendItems = legend.selectAll('.legend-item')
    .data(heatmapColors)
    .enter()
    .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => `translate(0, ${6 + i * 24})`);

  legendItems.append('rect')
    .attr('width', 16)
    .attr('height', 16)
    .style('fill', d => d);

  legendItems.append('text')
    .attr('x', 20)
    .attr('y', 12)
    .text((d, i) => {
      return `${heatmapBounds[i]} to ${heatmapBounds[i + 1]}`;
    });
}