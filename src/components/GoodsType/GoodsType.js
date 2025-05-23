// import Chart from 'chart.js/auto';

console.log('GoodsType.js loaded');

(function() {
  const csvPath = 'https://raw.githubusercontent.com/Cihshee/CASA0003_minnni_project/main/public/data/Goodstype_full_summary_data_merged.csv'; // 改为GitHub在线链接
  const flowTypes = [
    'EU - Exports',
    'EU - Imports',
    'Non EU - Exports',
    'Non EU - Imports'
  ];
  const years = Array.from({length: 2024-2016+1}, (_,i)=>2016+i);
  const sitcLabels = [
    '0 Food & live animals',
    '1 Beverages & tobacco',
    '2 Crude materials',
    '3 Mineral fuels, lubricants & related materials',
    '4 Animal & vegetable oils, fats & waxes',
    '5 Chemicals & related products',
    '6 Manufactured goods classified chiefly by material',
    '7 Machinery & transport equipment',
    '8 Miscellaneous manufactured articles',
    "9 Commodities/transactions not class'd elsewhere in SITC"
  ];
  
  const sitcConciseDescriptions = [
    'Trade in food and live animals is a vital part of the UK\'s global and EU trade, covering meat, dairy, cereals, and more. Post-Brexit, related trade policies and tariffs have changed significantly.',
    'Beverages and tobacco include alcoholic drinks, soft drinks, and tobacco products. The UK exports a large share of beverages to the EU, and Brexit has affected export procedures.',
    'Crude materials include wood, rubber, fibers, and more. The UK plays an important role in global raw materials trade, and Brexit has led to supply chain adjustments.',
    'Mineral fuels, lubricants, and related materials are key to the UK\'s energy imports and exports. Brexit has affected energy market flows.',
    'Animal and vegetable oils, fats, and waxes are widely used in food and industry. Trade barriers have increased post-Brexit.',
    'Chemicals and related products include pharmaceuticals and chemical raw materials. Brexit has impacted regulation and trade policy.',
    'Manufactured goods classified chiefly by material include metals, building materials, and more. Brexit has brought changes in tariffs and standards.',
    'Machinery and transport equipment are a pillar of UK exports. Brexit has affected supply chains and export markets.',
    'Miscellaneous manufactured articles include toys, furniture, clothing, and more. Market access and certification processes have changed post-Brexit.',
    "Covers scrap metal recycling, second-hand markets, and other miscellaneous transactions."
  ];
  
  const sitcDetailedDescriptions = [
    'The impact of Brexit on trade in food and live animals has been relatively limited. Post-Brexit, despite significant changes in related trade policies and tariffs, the overall trade volume has remained relatively stable, with imports slightly higher than exports.',
    'Influenced by the pandemic and political factors, trade in beverages and tobacco between the UK and the EU (such as France, Ireland, and Italy) has shown significant characteristics: import volumes continue to rise, while export volumes have notably decreased, reflecting the structural challenges faced by domestic industries and external competitive pressures.',
    'Since 2018, profound impacts from the global trade war and supply chain disruptions have led to significant fluctuations in the export market and trade volume of crude materials, inedible, except fuels. Particularly in the EU market, the trade experienced considerable volatility from 2018 to 2020, reflecting a deep adjustment in international trade patterns.',
    'The war in Ukraine in 2022 led to significant fluctuations in UK-Russia trade, culminating in a trade suspension in 2023. The energy market has rapidly restructured amid geopolitical tensions, with Brexit further influencing trade flows and market dynamics. Both EU and Non-EU trade have been significantly affected, but are stabilising, highlighting the political sensitivity of the energy sector.',
    'Trade in animal and vegetable oils, fats, and waxes is relatively small in scale and shows moderate fluctuations. The impact of global supply chains has been limited; however, the increase in trade barriers post-Brexit has made trading processes more complex.',
    'Trade in chemicals and related products, not elsewhere classified, has remained relatively stable, exhibiting basic stability in both EU and Non-EU markets.',
    'Between 2020 and 2022, the manufacturing supply chain underwent deep restructuring due to the dual impacts of Brexit and the COVID-19 pandemic. Trade with the EU experienced significant fluctuations, while free trade agreements have opened new market opportunities with Non-EU partners such as Canada and India.',
    'As the area most severely impacted post-Brexit, machinery and transport equipment has faced dual challenges from the pandemic and supply chain bottlenecks. From 2019 to 2022, both import and export volumes with EU and Non-EU countries exhibited sharp fluctuations. However, since 2023, trade with Non-EU regions has begun to recover slowly, demonstrating the resilience of the industry.',
    'Trade in miscellaneous manufactured articles has been relatively stable. The primary impact of Brexit has been on market access and certification processes. Although this has increased operational difficulties for businesses, overall fluctuations remain small, reflecting the adaptability of the consumer goods sector.',
    "Since commodities not classified elsewhere cover a wide variety of types, this category has experienced the greatest trade fluctuations. It reflects the increasing complexity of global trade and the deep-seated uncertainties brought about by Brexit."
  ];
  
  // Global state object
  const state = {
    currentType: 0,
    currentFlow: flowTypes[0],
    currentYear: years[0],
    allData: [],
    currentMap: null,
    showingSummary: true,
    selectedCountry: null,
    selectedFeatureId: null,
    currentSitcData: null,
    trendChart: null,
    countriesChart: null,
    hoveredFeatureId: null,
    popup: null,
    dataLoaded: false,
    preloadedData: null
  };

  const dataCache = new Map();

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
  }

  function parseCSV(text) {
    console.log('Parsing CSV...');
    const lines = text.split('\n').filter(l=>l.trim());
    const headers = lines[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    const data = lines.slice(1).map(line => {
      const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, '').trim());
      const obj = {};
      headers.forEach((h,i)=>obj[h.trim()] = (values[i]||'').replace(/"/g,'').trim());
      return obj;
    }).filter(row => row[headers[0]]);
    console.log('Parsed rows:', data.length, data.slice(0,2));
    return {headers, data};
  }

  function getValue(row, flowtype, year) {
    const col = `${flowtype} ${year} (Value (£))`;
    return Number(row[col]?.replace(/,/g,'') || 0);
  }

  function formatToMillions(value, forAxis = false) {
    if (forAxis) {
      return `${Math.round(value / 1000000)}M`;
    }
    return `${(value / 1000000).toFixed(1)}M`;
  }

  function drawChart(ctx, dataRows, flowtype, onAnimEnd) {
    function interpolatePoints(data) {
      const interpolatedData = [];
      const interpolationPoints = 30;
      
      for (let i = 0; i < data.length - 1; i++) {
        const start = data[i];
        const end = data[i + 1];
        interpolatedData.push(start);
        
        for (let j = 1; j < interpolationPoints; j++) {
          const fraction = j / interpolationPoints;
          const value = start + (end - start) * fraction;
          interpolatedData.push(value);
        }
      }
      interpolatedData.push(data[data.length - 1]);
      return interpolatedData;
    }

    const interpolatedYears = [];
    for (let i = 0; i < years.length - 1; i++) {
      interpolatedYears.push(years[i]);
      for (let j = 1; j < 30; j++) {
        interpolatedYears.push(years[i]);
      }
    }
    interpolatedYears.push(years[years.length - 1]);

    const datasets = dataRows.map((row, idx) => {
      const originalData = years.map(year => getValue(row, flowtype, year));
      const interpolatedData = interpolatePoints(originalData);
      
      return {
        label: row['SitcCommodityHierarchy - SITC1'],
        data: interpolatedData,
        borderColor: `hsl(${idx*40%360},70%,60%)`,
        backgroundColor: 'transparent',
        tension: 0.3,
        pointRadius: (ctx) => {
          const index = ctx.dataIndex;
          return index % 30 === 0 ? 3 : 0;
        },
        borderWidth: 2,
        pointBorderWidth: 2,
        pointHoverRadius: 5,
        pointHoverBorderWidth: 2,
        pointHitRadius: 10
      };
    });

    if (!ctx) {
      console.error('No canvas context!');
      return;
    }

    const totalDuration = 3500;
    const delayBetweenPoints = totalDuration / interpolatedYears.length;
    
    const animation = {
      x: {
        type: 'number',
        easing: 'linear',
        duration: delayBetweenPoints,
        from: NaN,
        delay(ctx) {
          if (ctx.type !== 'data' || ctx.xStarted) {
            return 0;
          }
          ctx.xStarted = true;
          return ctx.index * delayBetweenPoints;
        }
      },
      y: {
        type: 'number',
        easing: 'linear',
        duration: delayBetweenPoints,
        from: (ctx) => ctx.index === 0 ? ctx.chart.scales.y.getPixelForValue(0) : ctx.chart.getDatasetMeta(ctx.datasetIndex).data[ctx.index - 1].y,
        delay(ctx) {
          if (ctx.type !== 'data' || ctx.yStarted) {
            return 0;
          }
          ctx.yStarted = true;
          return ctx.index * delayBetweenPoints;
        }
      }
    };

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: interpolatedYears,
        datasets
      },
      options: {
        responsive: true,
        animation: {
          ...animation,
          onProgress: function() { chart.draw(); }
        },
        maintainAspectRatio: false,
        layout: { padding: { right: 100 } },
        interaction: {
          intersect: false,
          mode: 'nearest'
        },
        plugins: {
          legend: { display: false },
          title: { display: false },
          tooltip: {
            enabled: true,
            mode: 'nearest',
            intersect: false,
            callbacks: {
              title: function(context) {
                const yearIndex = Math.floor(context[0].dataIndex / 30);
                return years[yearIndex];
              },
              label: function(context) {
                if (context.dataIndex % 30 === 0) {
                  return `${context.dataset.label}: £${formatToMillions(context.parsed.y)}`;
                }
                return null;
              }
            }
          }
        },
        scales: {
          x: { 
            ticks: { 
              color: '#fff',
              font: {
                size: 22,
                weight: 'bold',
                family: 'Orbitron, Montserrat, Arial, sans-serif',
                lineHeight: 1.2,
                style: 'normal',
              },
              callback: function(value, index) {
                if (index % 30 === 0) {
                  const yearIndex = index / 30;
                  return years[yearIndex];
                }
                return '';
              },
              maxRotation: 0,
              autoSkip: false,
              padding: 18,
            }, 
            grid: { color: 'rgba(255,255,255,0.08)' }
          },
          y: { 
            ticks: { 
              color: '#fff',
              callback: function(value) {
                return '£' + formatToMillions(value, true);
              }
            }, 
            grid: { color: 'rgba(255,255,255,0.08)' }
          }
        }
      },
      plugins: [
        {
          id: 'yearLabelGradient',
          afterDraw(chart) {
            const xAxis = chart.scales.x;
            const yAxis = chart.scales.y;
            if (!xAxis || !yAxis) return;
            const ctx = chart.ctx;
            ctx.save();
            for (let i = 0; i < years.length; i++) {
              const index = i * 30;
              const label = years[i];
              const x = xAxis.getPixelForValue(index);
              ctx.save();
              ctx.beginPath();
              ctx.setLineDash([4, 6]);
              ctx.strokeStyle = 'rgba(255,255,255,0.18)';
              ctx.lineWidth = 1.2;
              ctx.moveTo(x, yAxis.top - 10);
              ctx.lineTo(x, yAxis.bottom + 20);
              ctx.stroke();
              ctx.setLineDash([]);
              ctx.restore();
              const y = xAxis.bottom + 28;
              ctx.save();
              ctx.font = 'bold 22px Orbitron, Montserrat, Arial, sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.globalCompositeOperation = 'source-over';
              ctx.fillStyle = '#181c23';
              ctx.fillRect(x-20, y-16, 40, 32);
              ctx.restore();
              const grad = ctx.createLinearGradient(x - 20, y, x + 20, y);
              grad.addColorStop(0, '#4fc3f7');
              grad.addColorStop(1, '#7c4dff');
              ctx.font = 'bold 22px Orbitron, Montserrat, Arial, sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.shadowColor = 'rgba(33,150,243,0.18)';
              ctx.shadowBlur = 8;
              ctx.fillStyle = grad;
              ctx.fillText(label, x, y);
              ctx.shadowBlur = 0;
            }
            ctx.restore();

            const anim = chart._animations && Object.values(chart._animations)[0];
            let animProgress = 1;
            if (anim && anim._duration > 0) {
              animProgress = Math.min(1, anim._elapsed / anim._duration);
            }
            const metaArr = chart.getSortedVisibleDatasetMetas();
            metaArr.forEach((meta, dIdx) => {
              if (!meta || !meta._dataset || !meta._dataset.data || !meta._dataset.data.length) return;
              const dataArr = meta._dataset.data;
              const totalPoints = dataArr.length;
              let floatIndex = animProgress * (totalPoints - 1);
              if (floatIndex < 0) floatIndex = 0;
              if (floatIndex > totalPoints - 1) floatIndex = totalPoints - 1;
              const leftIdx = Math.floor(floatIndex);
              const rightIdx = Math.min(leftIdx + 1, totalPoints - 1);
              const frac = floatIndex - leftIdx;
              const x0 = xAxis.getPixelForValue(leftIdx);
              const x1 = xAxis.getPixelForValue(rightIdx);
              const px = x0 + (x1 - x0) * frac;
              const v0 = dataArr[leftIdx];
              const v1 = dataArr[rightIdx];
              const value = v0 + (v1 - v0) * frac;
              const py = yAxis.getPixelForValue(value);
              ctx.save();
              ctx.beginPath();
              ctx.arc(px, py, 8, 0, 2 * Math.PI);
              ctx.shadowColor = meta._dataset.borderColor || '#fff';
              ctx.shadowBlur = 16;
              ctx.fillStyle = meta._dataset.borderColor || '#fff';
              ctx.globalAlpha = 0.85;
              ctx.fill();
              ctx.shadowBlur = 0;
              ctx.globalAlpha = 1;
              ctx.beginPath();
              ctx.arc(px, py, 4.2, 0, 2 * Math.PI);
              ctx.fillStyle = '#fff';
              ctx.fill();
              ctx.restore();
              ctx.save();
              ctx.font = 'bold 13px Arial, sans-serif';
              ctx.textAlign = 'left';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = meta._dataset.borderColor || '#fff';
              ctx.shadowColor = '#222';
              ctx.shadowBlur = 4;
              let valStr = formatToMillions(value);
              ctx.fillText(valStr, px + 14, py);
              ctx.restore();
            });
          }
        }
      ]
    });

    if (onAnimEnd) {
      setTimeout(onAnimEnd, 2000);
    }
    return chart;
  }

  // Legend items and colors (should match chart datasets)
  const legendItems = [
    { label: '0 Food & live animals', color: '#d9534f', icon: '0-Food-and-live-animals.png' },
    { label: '1 Beverages & tobacco', color: '#f0ad4e', icon: '1-Beverages-and-tobacco.png' },
    { label: '2 Crude materials, inedible, except fuels', color: '#bada55', icon: '2-Crude-materials.png' },
    { label: '3 Mineral fuels, lubricants & related materials', color: '#5cb85c', icon: '3-Mineral-fuels-lubricants-and-related-materials.png' },
    { label: '4 Animal & vegetable oils, fats & waxes', color: '#5bc0de', icon: '4-Animal-and-vegetable-oils-fats-and-waxes.png' },
    { label: '5 Chemicals & related products, nes', color: '#428bca', icon: '5-Chemicals-and-related-products.png' },
    { label: '6 Manufactured goods classified chiefly by material', color: '#6f42c1', icon: '6-Manufactured-goods-classified-chiefly-by-material.png' },
    { label: '7 Machinery & transport equipment', color: '#ab47bc', icon: '7-Machinery-and-transport-equipment.png' },
    { label: '8 Miscellaneous manufactured articles', color: '#ffd600', icon: '8-Miscellaneous-manufactured-articles.png' },
    { label: "9 Commodities/transactions not class'd elsewhere in SITC", color: '#b0b0b0', icon: '' }
  ];
  function renderLegend() {
    const legend = document.getElementById('goods-summary-legend');
    
    legend.innerHTML = '<div class="goods-summary-legend-grid"></div>';
    const grid = legend.querySelector('.goods-summary-legend-grid');
    
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px 24px; 
      max-width: 900px;
      margin: 0 auto;
      padding: 6px; 
      margin-top: -30px; 
    `;
    
    legendItems.forEach((item, idx) => {
      const legendItem = document.createElement('div');
      legendItem.className = 'goods-summary-legend-item';
      legendItem.setAttribute('data-sitc', idx);
      
      legendItem.style.cssText = `
        display: flex;
        align-items: center;
        padding: 2px 5px;
        border-radius: 6px;
        transition: background-color 0.3s;
        cursor: pointer;
      `;
      
      legendItem.addEventListener('mouseenter', () => {
        legendItem.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
      });
      legendItem.addEventListener('mouseleave', () => {
        legendItem.style.backgroundColor = 'transparent';
      });
      
      const iconContainer = document.createElement('div');
      iconContainer.className = 'summary-sitc-icon-container';
      iconContainer.style.cssText = `
        width: 28px; 
        height: 28px; 
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 6px; 
        position: relative;
      `;
      
      if (idx < 9 && item.icon) {
        const icon = document.createElement('img');
        icon.src = `https://raw.githubusercontent.com/Cihshee/CASA0003_minnni_project/main/public/goods-icons/${item.icon}`;
        icon.alt = `SITC ${idx}`;
        icon.className = 'summary-sitc-icon';
        icon.style.cssText = `
          width: 24px; 
          height: 24px; 
          object-fit: contain;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
        `;
        iconContainer.appendChild(icon);
      }
      
      const colorIndicator = document.createElement('span');
      if (idx === 9) {
        colorIndicator.innerHTML = `
          <svg width="22" height="8" style="vertical-align:middle;margin-right:4px;">
            <line x1="2" y1="4" x2="20" y2="4" stroke="${item.color}" stroke-width="3" stroke-dasharray="3,4"/>
          </svg>
        `;
      } else {
        colorIndicator.className = 'goods-summary-legend-color';
        colorIndicator.style.cssText = `
          display: inline-block;
          width: 10px; 
          height: 10px; 
          border-radius: 50%;
          background: ${item.color};
          margin-right: 5px; 
        `;
      }
      
      const label = document.createElement('span');
      label.textContent = item.label;
      label.style.cssText = `
        font-size: 12px; 
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      `;
      
      if (idx < 9) {
        legendItem.appendChild(iconContainer);
      }
      legendItem.appendChild(colorIndicator);
      legendItem.appendChild(label);
      
      grid.appendChild(legendItem);
    });
  }
  renderLegend();

  function setIconBarActive(idx) {
    document.querySelectorAll('.goods-type-icon-btn').forEach((btn, i) => {
      btn.setAttribute('data-selected', i === idx ? 'true' : 'false');
    });
  }

  function updateCurrentIcon(index) {
    // Update all icons in both summary and detail views
    document.querySelectorAll('.goods-type-icon-btn').forEach(icon => {
      const typeIndex = parseInt(icon.getAttribute('data-type'));
      icon.setAttribute('data-selected', typeIndex === index ? 'true' : 'false');
      // Remove any lingering active class to avoid conflicts
      icon.classList.remove('active');
    });
  }

  function renderSummaryCharts(data) {
    const chartContainer = document.getElementById('goods-summary-charts');
    if (!chartContainer) return;
    chartContainer.innerHTML = '';

    const centerWrap = document.createElement('div');
    centerWrap.className = 'summary-center-wrap';
    centerWrap.style.display = 'flex';
    centerWrap.style.flexDirection = 'column';
    centerWrap.style.alignItems = 'center';
    centerWrap.style.justifyContent = 'center';
    chartContainer.appendChild(centerWrap);

    const width = 900;
    const height = 420;
    const margin = { top: 40, right: 220, bottom: 70, left: 80 };
    const svgW = width + margin.left + margin.right;
    const svgH = height + margin.top + margin.bottom;

    const flexWrap = document.createElement('div');
    flexWrap.className = 'summary-flex-wrap';
    flexWrap.style.display = 'flex';
    flexWrap.style.flexDirection = 'row';
    flexWrap.style.alignItems = 'center';
    flexWrap.style.justifyContent = 'center';
    flexWrap.style.gap = '0px';
    flexWrap.style.maxWidth = '1200px';
    flexWrap.style.margin = '0 auto';
    centerWrap.appendChild(flexWrap);

    const svgDiv = document.createElement('div');
    svgDiv.className = 'summary-chart-area';
    svgDiv.style.position = 'relative';
    svgDiv.style.width = 'max-content';
    svgDiv.style.display = 'flex';
    svgDiv.style.justifyContent = 'center';
    svgDiv.style.alignItems = 'center';
    svgDiv.style.maxWidth = '1200px';
    svgDiv.style.margin = '0 auto';
    flexWrap.appendChild(svgDiv);

    const descDiv = document.createElement('div');
    descDiv.className = 'summary-desc-area';
    descDiv.style.display = 'none';
    flexWrap.appendChild(descDiv);
  
    const btnsDiv = document.createElement('div');
    btnsDiv.className = 'summary-explore-btns';
    btnsDiv.style.display = 'flex';
    btnsDiv.style.flexDirection = 'column';
    btnsDiv.style.alignItems = 'center';
    btnsDiv.style.marginTop = '15px';
    btnsDiv.style.opacity = '0';
    btnsDiv.style.transform = 'translateY(30px)';
    btnsDiv.innerHTML = `
      <div class="summary-btn-row" style="display:flex; gap:16px; margin-bottom:6px;">
        <button class="summary-explore-btn" data-flow="EU - Exports" data-idx="0">UK Export <span class="arrow">⟶</span><br>EU</button>
        <button class="summary-explore-btn" data-flow="EU - Imports" data-idx="1">UK Import <span class="arrow">⟵</span><br>EU</button>
        <button class="summary-explore-btn" data-flow="Non EU - Exports" data-idx="2">UK Export <span class="arrow">⟶</span><br>Non-EU</button>
        <button class="summary-explore-btn" data-flow="Non EU - Imports" data-idx="3">UK Import <span class="arrow">⟵</span><br>Non-EU</button>
      </div>
    `;
    centerWrap.appendChild(btnsDiv);

    const svg = d3.select(svgDiv)
      .append('svg')
      .attr('width', svgW)
      .attr('height', svgH)
      .attr('class', 'd3-summary-svg')
      .style('display', 'block');

    let hoverDot = d3.select(svgDiv).select('.d3-hover-dot');
    if (hoverDot.empty()) {
      hoverDot = svg.append('circle')
        .attr('class', 'd3-hover-dot')
        .attr('r', 0)
        .style('pointer-events', 'none');
    }
    let tooltipDiv = d3.select(svgDiv).select('.d3-tooltip');
    if (tooltipDiv.empty()) {
      tooltipDiv = d3.select(svgDiv)
        .append('div')
        .attr('class', 'd3-tooltip')
        .style('position', 'absolute')
        .style('pointer-events', 'none')
        .style('background', 'rgba(30,30,30,0.97)')
        .style('color', '#fff')
        .style('padding', '7px 12px 6px 12px')
        .style('border-radius', '8px')
        .style('font-size', '13px')
        .style('font-family', 'Montserrat,Arial,sans-serif')
        .style('box-shadow', '0 2px 8px #0005')
        .style('line-height', '1.5')
        .style('z-index', 10)
        .style('display', 'none');
    }

    const years = Array.from({length: 2024-2016+1}, (_,i)=>2016+i);
    const flowTypes = [
      'EU - Exports',
      'EU - Imports',
      'Non EU - Exports',
      'Non EU - Imports'
    ];
    let currentFlow = flowTypes[0];
    let animDuration = 5000;

    const lineColors = [
      '#d9534f', '#f0ad4e', '#bada55', '#5cb85c', '#5bc0de', '#428bca', '#6f42c1', '#ab47bc', '#ffd600', '#b0b0b0'
    ];

    function getLineData(flowType) {
      return data.slice(0, 10).map((row, idx) => {
        return {
          name: row['SitcCommodityHierarchy - SITC1'] || `SITC ${idx}`,
          color: lineColors[idx % lineColors.length],
          values: years.map(year => ({
            year,
            value: getValue(row, flowType, year)
          }))
        };
      });
    }

    function drawD3Chart(flowType) {
      svg.selectAll('*').remove();
      tooltipDiv.style('display', 'none');
      const lineData = getLineData(flowType);
      const x = d3.scalePoint()
        .domain(years)
        .range([margin.left, margin.left + width]);
      const y = d3.scaleLinear()
        .domain([0, d3.max(lineData, d => d3.max(d.values, v => v.value)) * 1.08])
        .range([margin.top + height, margin.top]);

      svg.append('g')
        .attr('transform', `translate(0,${margin.top + height})`)
        .call(d3.axisBottom(x)
          .tickFormat(d => d)
          .tickSize(0)
        )
        .selectAll('text')
        .attr('font-size', 22)
        .attr('font-family', 'Orbitron, Montserrat, Arial, sans-serif')
        .attr('font-weight', 'bold')
        .attr('fill', '#fff')
        .attr('dy', '1.5em');

      svg.append('g')
        .attr('transform', `translate(${margin.left},0)`)
        .call(d3.axisLeft(y)
          .tickFormat(d => '£' + formatToMillions(d, true))
        )
        .selectAll('text')
        .attr('fill', '#fff')
        .attr('font-size', 15);

      years.forEach(year => {
        svg.append('line')
          .attr('x1', x(year)).attr('x2', x(year))
          .attr('y1', y.range()[0] - 10)
          .attr('y2', y.range()[1] + 20)
          .attr('stroke', '#fff')
          .attr('stroke-width', 1.2)
          .attr('stroke-dasharray', '4,6')
          .attr('opacity', 0.18);
      });

      const totalFrames = 300;
      let frame = 0;
      function animate() {
        svg.selectAll('.d3-line').remove();
        svg.selectAll('.d3-dot').remove();
        svg.selectAll('.d3-value').remove();
        svg.selectAll('.d3-highlight-2022').remove();
        svg.selectAll('.d3-annotation-2022').remove();
        svg.selectAll('.d3-highlight-2020').remove();
        svg.selectAll('.d3-annotation-2020').remove();
        lineData.forEach((line, idx) => {
          const floatIndex = (frame / totalFrames) * (years.length - 1);
          const leftIdx = Math.floor(floatIndex);
          const rightIdx = Math.min(leftIdx + 1, years.length - 1);
          const frac = floatIndex - leftIdx;
          const pts = line.values.slice(0, leftIdx + 1).map(d => [x(d.year), y(d.value)]);
          if (rightIdx > leftIdx) {
            const y0 = line.values[leftIdx].value;
            const y1 = line.values[rightIdx].value;
            const v = y0 + (y1 - y0) * frac;
            const px = x(years[leftIdx]) + (x(years[rightIdx]) - x(years[leftIdx])) * frac;
            pts.push([px, y(v)]);
          }
          const lineGen = d3.line().curve(d3.curveMonotoneX);
          svg.append('path')
            .attr('class', 'd3-line')
            .attr('d', lineGen(pts))
            .attr('stroke', line.color)
            .attr('stroke-width', 2.5)
            .attr('fill', 'none')
            .attr('stroke-dasharray', idx === 9 ? '5,6' : null);
          const [dotX, dotY] = pts[pts.length-1];
          svg.append('circle')
            .attr('class', 'd3-dot')
            .attr('cx', dotX)
            .attr('cy', dotY)
            .attr('r', 8)
            .attr('fill', line.color)
            .attr('filter', 'url(#d3-glow)');
          svg.append('circle')
            .attr('class', 'd3-dot')
            .attr('cx', dotX)
            .attr('cy', dotY)
            .attr('r', 4.2)
            .attr('fill', '#fff');
          const v = (rightIdx > leftIdx)
            ? line.values[leftIdx].value + (line.values[rightIdx].value - line.values[leftIdx].value) * frac
            : line.values[years.length-1].value;
          svg.append('text')
            .attr('class', 'd3-value')
            .attr('x', dotX + 14)
            .attr('y', dotY)
            .attr('fill', line.color)
            .attr('font-size', 13)
            .attr('font-weight', 700)
            .attr('alignment-baseline', 'middle')
            .attr('font-family', 'Arial, sans-serif')
            .attr('filter', 'url(#d3-shadow)')
            .text(formatToMillions(v));

          // --- Highlight 2022 high point for Mineral fuels (idx 3) ---
          if (currentFlow === 'EU - Exports' && idx === 3) {
            // 2022 annotation
            const year2022Idx = years.indexOf(2022);
            const frame2022 = Math.round((year2022Idx / (years.length - 1)) * totalFrames);
            if (frame >= frame2022) {
              const pt2022 = line.values[year2022Idx];
              const cx = x(pt2022.year);
              const cy = y(pt2022.value);
              svg.append('circle')
                .attr('class', 'd3-highlight-2022')
                .attr('cx', cx)
                .attr('cy', cy)
                .attr('r', 18)
                .attr('stroke', '#fff')
                .attr('stroke-width', 3)
                .attr('fill', 'none')
                .attr('stroke-dasharray', '6,6')
                .attr('filter', 'url(#d3-glow)');
              // 2022 annotation fade/scale slower
              const annProgress = Math.max(0, Math.min(1, (frame - frame2022) / 60));
              const annOpacity = annProgress;
              const annScale = 0.92 + 0.08 * annProgress;
              svg.append('foreignObject')
                .attr('class', 'd3-annotation-2022')
                .attr('x', cx + 30)
                .attr('y', cy - 38)
                .attr('width', 340)
                .attr('height', 110)
                .style('opacity', annOpacity)
                .style('transform', `scale(${annScale})`)
                .style('transition', 'opacity 0.7s, transform 0.7s')
                .html(`<div style=\"background:rgba(30,30,30,0.92);color:#fff;padding:14px 20px 10px 20px;border-radius:12px;font-size:15px;font-family:Montserrat,Arial,sans-serif;box-shadow:0 2px 12px #0006;line-height:1.6;max-width:320px;word-break:break-word;\">\n                  <b>2022 High Point:</b><br>Energy exports spiked after Brexit and the Russia-Ukraine war, then normalized as the market stabilised.<br><a href=\"https://www.ons.gov.uk/economy/nationalaccounts/balanceofpayments/articles/uktradeingoodsyearinreview/2023\" target=\"_blank\" style=\"color:#4fc3f7;text-decoration:underline;display:inline-block;margin-top:6px;font-size:13px;\">Source: ONS</a>\n                </div>`);
            }
          }
          // --- Highlight 2020 low point for Machinery & transport equipment (idx 7) ---
          if (currentFlow === 'EU - Exports' && idx === 7) {
            const year2020Idx = years.indexOf(2020);
            const frame2020 = Math.round((year2020Idx / (years.length - 1)) * totalFrames);
            if (frame >= frame2020) {
              const pt2020 = line.values[year2020Idx];
              const cx = x(pt2020.year);
              const cy = y(pt2020.value);
              svg.append('circle')
                .attr('class', 'd3-highlight-2020')
                .attr('cx', cx)
                .attr('cy', cy)
                .attr('r', 18)
                .attr('stroke', '#fff')
                .attr('stroke-width', 3)
                .attr('fill', 'none')
                .attr('stroke-dasharray', '6,6')
                .attr('filter', 'url(#d3-glow)');
              // 2020 annotation fade/scale
              const annProgress = Math.max(0, Math.min(1, (frame - frame2020) / 60));
              const annOpacity = annProgress;
              const annScale = 0.92 + 0.08 * annProgress;
              svg.append('foreignObject')
                .attr('class', 'd3-annotation-2020')
                .attr('x', cx - 350)
                .attr('y', cy - 48)
                .attr('width', 340)
                .attr('height', 70)
                .style('opacity', annOpacity)
                .style('transform', `scale(${annScale})`)
                .style('transition', 'opacity 0.7s, transform 0.7s')
                .html(`<div style=\"background:rgba(30,30,30,0.92);color:#fff;padding:14px 20px 10px 20px;border-radius:12px;font-size:15px;font-family:Montserrat,Arial,sans-serif;box-shadow:0 2px 12px #0006;line-height:1.6;max-width:320px;word-break:break-word;\"><b>2020:</b> The pandemic caused a temporary decline in some exports.</div>`);
            }
          }
           // 'EU - Imports'/2021/07  
           if (currentFlow === 'EU - Imports' && idx === 7) {
            const year2021Idx = years.indexOf(2021);
            const frame2021 = Math.round((year2021Idx / (years.length - 1)) * totalFrames);
            if (frame >= frame2021) {
              const pt2021 = line.values[year2021Idx];
              const cx = x(pt2021.year);
              const cy = y(pt2021.value);
              
              const uniqueId = 'import-2021-highlight';
              
              svg.selectAll(`.${uniqueId}`).remove();
              
              svg.append('circle')
                .attr('class', `d3-highlight-2021 ${uniqueId}`)
                .attr('cx', cx)
                .attr('cy', cy)
                .attr('r', 18)
                .attr('stroke', '#fff')
                .attr('stroke-width', 3)
                .attr('fill', 'none')
                .attr('stroke-dasharray', '6,6')
                .attr('filter', 'url(#d3-glow)');
              
              const annProgress = Math.max(0, Math.min(1, (frame - frame2021) / 60));
              const annOpacity = annProgress;
              const annScale = 0.92 + 0.08 * annProgress;
              
              svg.append('foreignObject')
                .attr('class', `d3-annotation-2021 ${uniqueId}`)
                .attr('x', cx + 20)
                .attr('y', cy - 48)
                .attr('width', 340)
                .attr('height', 99)
                .style('opacity', annOpacity)
                .style('transform', `scale(${annScale})`)
                .style('transition', 'opacity 0.7s, transform 0.7s')
                .html(`<div style=\"background:rgba(30,30,30,0.92);color:#fff;padding:14px 20px 10px 20px;border-radius:12px;font-size:15px;font-family:Montserrat,Arial,sans-serif;box-shadow:0 2px 12px #0006;line-height:1.6;max-width:320px;word-break:break-word;\"><b>2021:</b> Global supply chain disruptions, the electric vehicle transition and Brexit are intertwined with political situation.</div>`);
            }
          }
           // 'Non EU - Exports'/2020/09  
          if (currentFlow === 'Non EU - Exports' && idx === 9) {
            const year2020Idx = years.indexOf(2020);
            const frame2020 = Math.round((year2020Idx / (years.length - 1)) * totalFrames);
            if (frame >= frame2020) {
              const pt2020 = line.values[year2020Idx];
              const cx = x(pt2020.year);
              const cy = y(pt2020.value);
              
              const uniqueId = 'export-2020-highlight';
              
              svg.selectAll(`.${uniqueId}`).remove();
              
              svg.append('circle')
                .attr('class', `d3-highlight-2020 ${uniqueId}`)
                .attr('cx', cx)
                .attr('cy', cy)
                .attr('r', 18)
                .attr('stroke', '#fff')
                .attr('stroke-width', 3)
                .attr('fill', 'none')
                .attr('stroke-dasharray', '6,6')
                .attr('filter', 'url(#d3-glow)');
              
              const annProgress = Math.max(0, Math.min(1, (frame - frame2020) / 60));
              const annOpacity = annProgress;
              const annScale = 0.92 + 0.08 * annProgress;
              
              svg.append('foreignObject')
                .attr('class', `d3-annotation-2020 ${uniqueId}`)
                .attr('x', cx + 20)
                .attr('y', cy - 48)
                .attr('width', 340)
                .attr('height', 95)
                .style('opacity', annOpacity)
                .style('transform', `scale(${annScale})`)
                .style('transition', 'opacity 0.7s, transform 0.7s')
                .html(`<div style=\"background:rgba(30,30,30,0.92);color:#fff;padding:14px 20px 10px 20px;border-radius:12px;font-size:15px;font-family:Montserrat,Arial,sans-serif;box-shadow:0 2px 12px #0006;line-height:1.6;max-width:320px;word-break:break-word;\"><b>2020:</b> Brexit and COVID-19 disruptions triggered a surge in unclassified trade commodities.</div>`);
            }
          } 
          // 'Non EU - Imports'/2018/09  
          if (currentFlow === 'Non EU - Imports' && idx === 9) {
            const year2018Idx = years.indexOf(2018);
            const frame2018 = Math.round((year2018Idx / (years.length - 1)) * totalFrames);
            if (frame >= frame2018) {
              const pt2018 = line.values[year2018Idx];
              const cx = x(pt2018.year);
              const cy = y(pt2018.value);
              const uniqueId = 'import-2018-highlight';
              
              svg.selectAll(`.${uniqueId}`).remove();
              
              svg.append('circle')
                .attr('class', `d3-highlight-2018 ${uniqueId}`)
                .attr('cx', cx)
                .attr('cy', cy)
                .attr('r', 18)
                .attr('stroke', '#fff')
                .attr('stroke-width', 3)
                .attr('fill', 'none')
                .attr('stroke-dasharray', '6,6')
                .attr('filter', 'url(#d3-glow)');
              
              const annProgress = Math.max(0, Math.min(1, (frame - frame2018) / 60));
              const annOpacity = annProgress;
              const annScale = 0.92 + 0.08 * annProgress;
              
              svg.append('foreignObject')
                .attr('class', `d3-annotation-2018 ${uniqueId}`)
                .attr('x', cx + 20)
                .attr('y', cy - 48)
                .attr('width', 340)
                .attr('height', 70)
                .style('opacity', annOpacity)
                .style('transform', `scale(${annScale})`)
                .style('transition', 'opacity 0.7s, transform 0.7s')
                .html(`<div style=\"background:rgba(30,30,30,0.92);color:#fff;padding:14px 20px 10px 20px;border-radius:12px;font-size:15px;font-family:Montserrat,Arial,sans-serif;box-shadow:0 2px 12px #0006;line-height:1.6;max-width:320px;word-break:break-word;\"><b>2018:</b> Global trade war uncertainties reshape global commerce.</div>`);
            }
          }   
          // 'Non EU - Imports'/2022/03  
          if (currentFlow === 'Non EU - Imports' && idx === 3) {
            const year2022Idx = years.indexOf(2022);
            const frame2022 = Math.round((year2022Idx / (years.length - 1)) * totalFrames);
            if (frame >= frame2022) {
              const pt2022 = line.values[year2022Idx];
              const cx = x(pt2022.year);
              const cy = y(pt2022.value);
              
              const uniqueId = 'import-2022-highlight';
              svg.selectAll(`.${uniqueId}`).remove();
              
              // Highlight circle
              svg.append('circle')
                .attr('class', `d3-highlight-2022 ${uniqueId}`)
                .attr('cx', cx)
                .attr('cy', cy)
                .attr('r', 18)
                .attr('stroke', '#fff')
                .attr('stroke-width', 3)
                .attr('fill', 'none')
                .attr('stroke-dasharray', '6,6')
                .attr('filter', 'url(#d3-glow)');
              
              const annProgress = Math.max(0, Math.min(1, (frame - frame2022) / 60));
              const annOpacity = annProgress;
              const annScale = 0.92 + 0.08 * annProgress;
              
              svg.append('foreignObject')
                .attr('class', `d3-annotation-2022 ${uniqueId}`)
                .attr('x', cx + 20)
                .attr('y', cy - 14)
                .attr('width', 340)
                .attr('height', 90)
                .style('opacity', annOpacity)
                .style('transform', `scale(${annScale})`)
                .style('transition', 'opacity 0.7s, transform 0.7s')
                .html(`<div style=\"background:rgba(30,30,30,0.92);color:#fff;padding:14px 20px 10px 20px;border-radius:12px;font-size:15px;font-family:Montserrat,Arial,sans-serif;box-shadow:0 2px 12px #0006;line-height:1.6;max-width:320px;word-break:break-word;\"><b>2022:</b> Due to the Russia-Ukraine conflict, energy imports underwent rapid restructuring amid geopolitical tensions.</div>`);
            }
          }
        });

        if (frame < totalFrames) {
          frame++;
          requestAnimationFrame(animate);
        } else {
          if (!btnsDiv.classList.contains('shown')) {
            let promptDiv = btnsDiv.querySelector('.summary-explore-prompt');
            if (!promptDiv) {
              promptDiv = document.createElement('div');
              promptDiv.className = 'summary-explore-prompt';
              promptDiv.textContent = 'Click the buttons below to explore more flow types.';
              promptDiv.style.cssText = 'color:#fff;font-size:16px;font-weight:500;margin-bottom:12px;opacity:0;transform:translateY(18px);transition:opacity 0.7s,transform 0.7s;text-align:center;';
              btnsDiv.insertBefore(promptDiv, btnsDiv.firstChild);
            }
            promptDiv.style.display = 'block';
          setTimeout(() => {
              promptDiv.style.opacity = '1';
              promptDiv.style.transform = 'translateY(0)';
            }, 800);
            btnsDiv.style.display = 'flex';
            btnsDiv.style.opacity = '0';
            btnsDiv.style.transform = 'translateY(30px)';
            setTimeout(() => {
              btnsDiv.style.transition = 'opacity 0.7s, transform 0.7s';
              btnsDiv.style.opacity = '1';
              btnsDiv.style.transform = 'translateY(0)';
            }, 500);
            btnsDiv.classList.add('shown');
          }

          if (descDiv) descDiv.innerHTML = '';
        }
      }
      svg.append('defs').html(`
        <filter id="d3-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="d3-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="#222"/>
        </filter>
      `);
      animate();

      svg.on('mousemove', function(event) {
        const [mx, my] = d3.pointer(event, this);
        const hoverDot = svg.select('.d3-hover-dot');
        if (mx < margin.left || mx > margin.left + width || my < margin.top || my > margin.top + height) {
          tooltipDiv.style('display', 'none');
          hoverDot.attr('r', 0);
          return;
        }
        const xVals = years.map(y => x(y));
        let minDist = Infinity, nearestYearIdx = 0;
        xVals.forEach((px, i) => {
          const dist = Math.abs(mx - px);
          if (dist < minDist) {
            minDist = dist;
            nearestYearIdx = i;
          }
        });
        const year = years[nearestYearIdx];
        const lineDataAtYear = getLineData(flowType).map((d, idx) => ({
          name: d.name,
          color: d.color,
          value: d.values[nearestYearIdx].value,
          idx
        }));
        let minYDist = Infinity, nearestLine = null;
        lineDataAtYear.forEach(d => {
          const py = y(d.value);
          const dist = Math.abs(my - py);
          if (dist < minYDist) {
            minYDist = dist;
            nearestLine = d;
          }
        });
        if (!nearestLine) {
          tooltipDiv.style('display', 'none');
          hoverDot.attr('r', 0);
          return;
        }
        tooltipDiv.html(
          `<div style=\"font-size:14px;font-weight:700;color:#4fc3f7;margin-bottom:2px;\">${year}</div>`+
          `<div style=\"margin-bottom:2px;\"><span style=\"color:${nearestLine.color};font-weight:700;\">${nearestLine.name}</span></div>`+
          `<div>Value: <span style=\"color:${nearestLine.color};font-weight:700;\">£${formatToMillions(nearestLine.value)}</span></div>`
        );
        const svgRect = svgDiv.getBoundingClientRect();
        tooltipDiv.style('left', (mx + 40) + 'px')
          .style('top', (my - 20) + 'px')
          .style('display', 'block');
        const px = x(year);
        const py = y(nearestLine.value);
        hoverDot
          .attr('cx', px)
          .attr('cy', py)
          .attr('r', 5)
          .attr('fill', nearestLine.color)
          .attr('stroke', '#fff')
          .attr('stroke-width', 2)
          .attr('opacity', 0.95);
      })
      .on('mouseleave', function() {
        tooltipDiv.style('display', 'none');
        svg.select('.d3-hover-dot').attr('r', 0);
      });
    }
    
    drawD3Chart(currentFlow);

    btnsDiv.querySelectorAll('.summary-explore-btn').forEach((btn, idx) => {
      if (idx === 0) btn.classList.add('active');
      btn.onclick = () => {
        currentFlow = btn.getAttribute('data-flow');
        btnsDiv.querySelectorAll('.summary-explore-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        descDiv.querySelectorAll('.summary-desc-text').forEach(el => {
          el.style.opacity = '0';
          el.style.transform = 'translateY(30px)';
        });
        setTimeout(() => {
          drawD3Chart(currentFlow);
        }, 150);
      };
    });

    let chartAnimated = false;
    function triggerChartAnimation() {
      if (!chartAnimated) {
        drawD3Chart(currentFlow);
        chartAnimated = true;
      }
    }
    const chartObserver = new window.IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          triggerChartAnimation();
          obs.disconnect();
        }
      });
    }, { threshold: 0.18 });
    chartObserver.observe(svgDiv);
  }

  const animationState = {
    isPlaying: false,
    speed: 1,
    intervalId: null
  };

  function renderDetail() {
    const detailSection = document.getElementById('goods-type-detail-container');
    if (!detailSection) return;
    
    detailSection.style.opacity = '0';
    detailSection.style.transform = 'translateY(20px)';
    detailSection.style.transition = 'all 0.8s ease';
    
    detailSection.innerHTML = `
        <div class="goods-type-detail-controls">
            <div class="year-control">
                <div class="year-slider">
                    <div class="year-dots">
                        ${years.map(year => `
                            <div class="year-dot${year === state.currentYear ? ' active' : ''}" data-year="${year}">
                                <span class="dot"></span>
                                <span class="year-label">${year}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div class="year-line">
                        <div class="year-progress" style="width: ${((state.currentYear - 2016) / (2024 - 2016)) * 100}%"></div>
                    </div>
                </div>
                <div class="timeline-controls">
                    <button class="timeline-play-btn" title="Play/Pause">
                        <span class="play-icon">⏸</span>
                    </button>
                    <select class="timeline-speed">
                        <option value="1">1x</option>
                        <option value="2">2x</option>
                        <option value="4">4x</option>
                    </select>
                </div>
                <div id="goods-year-label" class="current-year">${state.currentYear}</div>
            </div>
            <div class="flow-type-buttons">
                ${flowTypes.map(f=>`<button class="flow-type-btn${f === state.currentFlow ? ' active' : ''}" data-flow="${f}">${f}</button>`).join('')}
            </div>
        </div>
        <div class="goods-detail-main-flex">
            <div class="goods-detail-top">
                <div class="goods-type-detail-map" id="goods-map"></div>
                <div class="goods-detail-side">
                    <div class="goods-type-detail-desc" id="goods-type-detail-desc"></div>
                    <div class="goods-type-detail-charts">
                        <div class="goods-type-top-countries">
                            <h3>Top Trading Partners</h3>
                            <div id="goods-countries-chart-container">
                                <canvas id="goods-countries-chart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="goods-timeline-chart">
                <div id="country-trend-container">
                    <div class="no-country-selected">Click a country to view its trade trend</div>
                    <canvas id="country-trend-chart"></canvas>
                </div>
            </div>
        </div>
    `;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          detailSection.style.opacity = '1';
          detailSection.style.transform = 'translateY(0)';
          
          setTimeout(() => {
            createMapboxMapWhenVisible();
            initializeCharts();
          }, 400);

          observer.disconnect();
        }
      });
    }, { threshold: 0.1 });

    observer.observe(detailSection);

    bindDetailEvents();
  }

  function bindDetailEvents() {
    document.querySelectorAll('.flow-type-btn').forEach(btn => {
      btn.onclick = e => {
        document.querySelectorAll('.flow-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.currentFlow = btn.dataset.flow;

        if (state.currentFlow.includes('Non EU')) {
          animateMapTo(state.currentMap, MAP_VIEWS.world);
        } else {
          animateMapTo(state.currentMap, MAP_VIEWS.europe);
        }
        
        updateVisualizationsExceptTrend();
      };
    });

    document.querySelectorAll('.year-dot').forEach(dot => {
      dot.onclick = e => {
        const year = +e.currentTarget.dataset.year;
        updateYear(year);
      };
    });

    const playBtn = document.querySelector('.timeline-play-btn');
    if (playBtn) {
      playBtn.onclick = () => {
        if (animationState.isPlaying) {
          stopTimelineAnimation();
          playBtn.querySelector('.play-icon').textContent = '▶';
        } else {
          startTimelineAnimation();
          playBtn.querySelector('.play-icon').textContent = '⏸';
        }
      };
    }

    const speedSelect = document.querySelector('.timeline-speed');
    if (speedSelect) {
      speedSelect.onchange = (e) => {
        animationState.speed = Number(e.target.value);
        if (animationState.isPlaying) {
          stopTimelineAnimation();
          startTimelineAnimation();
        }
      };
    }
  }

  function startTimelineAnimation() {
    if (animationState.intervalId) {
        clearInterval(animationState.intervalId);
    }

    animationState.isPlaying = true;
    const interval = 2000 / animationState.speed; 

    // Update play button UI
    const playBtn = document.querySelector('.timeline-play-btn');
    if (playBtn && playBtn.querySelector('.play-icon')) {
        playBtn.querySelector('.play-icon').textContent = '⏸';
    }

    const animate = async () => {
        if (!animationState.isPlaying) return;

        let nextYear = state.currentYear + 1;
        if (nextYear > 2024) {
            nextYear = 2016;
        }

        await updateYear(nextYear);
        animationState.intervalId = setTimeout(animate, interval);
    };

    animate();
  }

  function stopTimelineAnimation() {
    if (animationState.intervalId) {
        clearInterval(animationState.intervalId);
    }
    animationState.isPlaying = false;
    animationState.intervalId = null;

    // Update play button UI
    const playBtn = document.querySelector('.timeline-play-btn');
    if (playBtn && playBtn.querySelector('.play-icon')) {
        playBtn.querySelector('.play-icon').textContent = '▶';
    }
  }

  function updateYear(value) {
    state.currentYear = +value;
    
    requestAnimationFrame(() => {
        document.getElementById('goods-year-label').textContent = value;
        
        document.querySelectorAll('.year-dot').forEach(dot => {
            dot.classList.toggle('active', +dot.dataset.year === state.currentYear);
        });
        document.querySelector('.year-progress').style.width = 
            `${((state.currentYear - 2016) / (2024 - 2016)) * 100}%`;
    });

    return new Promise((resolve) => {
        updateVisualizationsExceptTrend().then(resolve);
    });
  }

  async function updateVisualizationsExceptTrend() {
    try {
        const sitcData = await loadSitcData(state.currentType);
        if (!sitcData) throw new Error('Failed to load SITC data');

        lastLoadedData = sitcData;
        
        await Promise.all([
            updateMapData(sitcData),
            new Promise(resolve => {
                requestAnimationFrame(() => {
                    updateCountriesChart(sitcData);
                    resolve();
                });
            })
        ]);

    } catch (error) {
        console.error('Error updating visualizations:', error);
    }
  }

  // Add geoData variable and loading
  let geoData = null;
  let isUpdating = false;

  // Load GeoJSON data
  async function loadGeoData() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/Cihshee/CASA0003_minnni_project/main/public/data/countries.geojson');
        if (!response.ok) throw new Error('Failed to load GeoJSON data');
        geoData = await response.json();
        return true;
    } catch (error) {
        console.error('Error loading GeoJSON:', error);
        return false;
    }
  }

  // Add these constants near the top of the file, after other constants
  const MAP_VIEWS = {
    world: {
      center: [0, 20],
      zoom: 1.5
    },
    europe: {
      center: [10, 50],
      zoom: 3.0
    }
  };

  const COLOR_SCHEME = {
    'EU - Exports': {
      border: 'rgb(25, 118, 210)',
      background: 'rgba(25, 118, 210, 0.2)',
      map: 'rgba(25, 118, 210, 1)'
    },
    'EU - Imports': {
      border: 'rgb(66, 165, 245)',
      background: 'rgba(66, 165, 245, 0.2)',
      map: 'rgba(66, 165, 245, 1)'
    },
    'Non EU - Exports': {
      border: 'rgb(211, 47, 47)',
      background: 'rgba(211, 47, 47, 0.2)',
      map: 'rgba(211, 47, 47, 1)'
    },
    'Non EU - Imports': {
      border: 'rgb(244, 67, 54)',
      background: 'rgba(244, 67, 54, 0.2)',
      map: 'rgba(244, 67, 54, 1)'
    }
  };

  // Add this function before createMapboxMapWhenVisible
  function animateMapTo(map, view, duration = 2500) {
    if (!map) return;
    map.flyTo({
      center: view.center,
      zoom: view.zoom,
      duration: duration,
      essential: true
    });
  }

  const UK_COORDINATES = {
    lng: -2.5,
    lat: 54
  };

  function createParabolicCurve(startX, startY, endX, endY) {
    const controlX = (startX + endX) / 2;
    const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
    const controlY = Math.min(startY, endY) - distance * 0.3;
    
    return `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;
  }

  // Modify the map initialization in createMapboxMapWhenVisible
  async function createMapboxMapWhenVisible() {
    const mapDiv = document.getElementById('goods-map');
    if (!mapDiv) return;
    
    const rect = mapDiv.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10 || mapDiv.offsetParent === null) {
        requestAnimationFrame(createMapboxMapWhenVisible);
        return;
    }

    // Load GeoJSON data if not loaded
    if (!geoData) {
        const loaded = await loadGeoData();
        if (!loaded) {
            mapDiv.innerHTML = '<div class="map-error">Failed to load map data</div>';
            return;
        }
    }

    if (window.currentMapInstance) {
        window.currentMapInstance.remove();
        window.currentMapInstance = null;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;
    try {
        // Clear the map container
        mapDiv.innerHTML = '';
        
        mapDiv.style.display = 'block';
        mapDiv.style.height = '100%';
        mapDiv.style.width = '100%';
        mapDiv.style.minHeight = '400px';
        mapDiv.style.position = 'relative';
        mapDiv.style.overflow = 'hidden';
        mapDiv.style.marginLeft = '70px';
        
        createSitcIconBar();
        
        window.currentMapInstance = new mapboxgl.Map({
            container: 'goods-map',
            style: MAPBOX_STYLE,
            center: MAP_VIEWS.world.center,
            zoom: MAP_VIEWS.world.zoom,
            attributionControl: false,
            maxZoom: 8,
            minZoom: 1.5,
            renderWorldCopies: false
        });

        state.currentMap = window.currentMapInstance;
        
        const loadingStyles = document.createElement('style');
        loadingStyles.textContent = `
            .mapboxgl-missing-css {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 10px 20px;
                border-radius: 4px;
                z-index: 1000;
                animation: fadeOutMessage 0.5s ease-out 2s forwards;
                pointer-events: none;
            }
            
            @keyframes fadeOutMessage {
                from {
                    opacity: 1;
                    transform: translate(-50%, -50%);
                }
                to {
                    opacity: 0;
                    transform: translate(-50%, -60%);
                }
            }

            .mapboxgl-map .mapboxgl-canvas-container {
                opacity: 1; 
            }
            
            .mapboxgl-map .mapboxgl-ctrl-group button,
            .mapboxgl-map .mapboxgl-ctrl-attrib {
                display: none !important;
            }
            
            #goods-map {
                position: relative;
                overflow: hidden;
                display: block !important;
                height: 100% !important;
                width: 100% !important;
            }
            
            #goods-map svg path, #goods-map svg circle {
                stroke-width: 2px;
                vector-effect: non-scaling-stroke;
            }
            
            #goods-map svg rect {
                width: 100% !important; 
                height: 100% !important;
                x: 0 !important;
                y: 0 !important;
            }
        `;
        document.head.appendChild(loadingStyles);
        
        state.currentMap.on('style.load', () => {
            const errorMessages = document.querySelectorAll('.mapboxgl-missing-css');
            errorMessages.forEach(msg => {
                msg.style.animation = 'fadeOutMessage 0.5s ease-out forwards';
                msg.addEventListener('animationend', () => {
                    msg.remove();
                });
            });

            // Initial animation from world to Europe
            setTimeout(() => {
                animateMapTo(state.currentMap, MAP_VIEWS.europe);
            }, 1000);
            
            if (state.currentMap.loaded() && state.currentMap.isStyleLoaded()) {
                updateVisualizationsExceptTrend();
                
                state.currentMap.resize();
                console.log("Map style loaded and visualization updated");
            } else {
                state.currentMap.once('load', () => {
                    updateVisualizationsExceptTrend();
                    
                    state.currentMap.resize();
                    console.log("Map loaded and visualization updated");
                });
            }
        });

        state.currentMap.once('load', () => {
            console.log("Mapbox map loaded successfully");
            
            const mapCanvas = document.querySelector('.mapboxgl-canvas');
            if (mapCanvas) {
                mapCanvas.style.display = 'block';
            }
            
            setTimeout(() => {
                state.currentMap.resize();
            }, 100);
        });
        
        setTimeout(() => {
            const svgRects = document.querySelectorAll('#goods-map svg rect');
            svgRects.forEach(rect => {
                if (rect.getAttribute('width') && parseFloat(rect.getAttribute('width')) < 0) {
                    rect.setAttribute('width', '100%');
                }
                if (rect.getAttribute('height') && parseFloat(rect.getAttribute('height')) < 0) {
                    rect.setAttribute('height', '100%');
                }
                if (rect.getAttribute('x') && parseFloat(rect.getAttribute('x')) < 0) {
                    rect.setAttribute('x', '0');
                }
                if (rect.getAttribute('y') && parseFloat(rect.getAttribute('y')) < 0) {
                    rect.setAttribute('y', '0');
                }
            });
        }, 500);

        const svgContainer = document.createElement('div');
        svgContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1;
        `;
        svgContainer.innerHTML = `
            <svg width="100%" height="100%" style="position: absolute; top: 0; left: 0;">
                <defs>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>
                <path id="curve-path" fill="none"/>
                <circle id="moving-dot" r="3"/>
            </svg>
        `;
        mapDiv.appendChild(svgContainer);

        state.currentMap.on('mousemove', 'country-fills', (e) => {
            if (!e.features.length) return;
            
            const feature = e.features[0];
            if (!feature || !feature.geometry) return;

            if (state.hoveredFeatureId !== null) {
                try {
                    state.currentMap.setFeatureState(
                        { source: 'countries', id: state.hoveredFeatureId },
                        { hover: false }
                    );
                } catch (err) {
                    console.warn('Error clearing hover state:', err);
                }
            }

            state.hoveredFeatureId = feature.id;
            try {
                state.currentMap.setFeatureState(
                    { source: 'countries', id: state.hoveredFeatureId },
                    { hover: true }
                );
            } catch (err) {
                console.warn('Error setting hover state:', err);
            }

            try {
                const bounds = new mapboxgl.LngLatBounds();
                if (feature.geometry.type === 'Polygon') {
                    feature.geometry.coordinates[0].forEach(coord => {
                        bounds.extend(coord);
                    });
                } else if (feature.geometry.type === 'MultiPolygon') {
                    let maxArea = 0;
                    let mainPolygon = feature.geometry.coordinates[0];
                    
                    feature.geometry.coordinates.forEach(polygon => {
                        let area = 0;
                        polygon[0].forEach((coord, i) => {
                            const j = (i + 1) % polygon[0].length;
                            area += coord[0] * polygon[0][j][1] - polygon[0][j][0] * coord[1];
                        });
                        area = Math.abs(area / 2);
                        
                        if (area > maxArea) {
                            maxArea = area;
                            mainPolygon = polygon;
                        }
                    });
                    
                    mainPolygon[0].forEach(coord => {
                        bounds.extend(coord);
                    });
                }

                const center = bounds.getCenter();
                if (!center || isNaN(center.lng) || isNaN(center.lat)) return;

                if (center.lng < -180 || center.lng > 180 || center.lat < -90 || center.lat > 90) return;

                const countryPoint = state.currentMap.project(center);
                const ukPoint = state.currentMap.project(UK_COORDINATES);

                if (!countryPoint || !ukPoint || 
                    isNaN(countryPoint.x) || isNaN(countryPoint.y) ||
                    isNaN(ukPoint.x) || isNaN(ukPoint.y)) return;

                let svgContainer = document.querySelector('.curve-animation-container');
                if (!svgContainer) {
                    svgContainer = document.createElement('div');
                    svgContainer.className = 'curve-animation-container';
                    svgContainer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;';
                    svgContainer.innerHTML = `
                        <svg width="100%" height="100%" style="position:absolute;top:0;left:0;">
                            <defs>
                                <filter id="glow">
                                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                                    <feMerge>
                                        <feMergeNode in="coloredBlur"/>
                                        <feMergeNode in="SourceGraphic"/>
                                    </feMerge>
                                </filter>
                            </defs>
                            <path id="curve-path" fill="none"/>
                            <circle id="moving-dot" r="3"/>
                        </svg>
                    `;
                    document.getElementById('goods-map').appendChild(svgContainer);
                }

                const curve = createParabolicCurve(
                    countryPoint.x, countryPoint.y,
                    ukPoint.x, ukPoint.y
                );

                const svg = svgContainer.querySelector('svg');
                const path = svg.querySelector('#curve-path');
                const dot = svg.querySelector('#moving-dot');

                path.setAttribute('d', curve);
                path.setAttribute('stroke', 'rgba(255, 255, 255, 0.6)');
                path.setAttribute('stroke-width', '1.5');
                path.setAttribute('stroke-dasharray', '4,4');
                path.style.animation = 'dash 1s linear infinite';

                dot.setAttribute('fill', 'rgba(255, 255, 255, 0.8)');
                dot.setAttribute('r', '3');
                dot.setAttribute('filter', 'url(#glow)');
                dot.style.offsetPath = `path("${curve}")`;
                dot.style.offsetRotate = '0deg';
                dot.style.animation = 'moveAlongPath 2s linear infinite';

                const animStyle = document.createElement('style');
                animStyle.textContent = `
                    @keyframes dash {
                        to {
                            stroke-dashoffset: -12;
                        }
                    }
                    @keyframes moveAlongPath {
                        from {
                            motion-offset: 0%;
                            offset-distance: 0%;
                        }
                        to {
                            motion-offset: 100%;
                            offset-distance: 100%;
                        }
                    }
                    #moving-dot {
                        offset-path: path("${curve}");
                        animation: moveAlongPath 2s linear infinite;
                    }
                    .curve-animation-container {
                        pointer-events: none;
                        z-index: 10;
                    }
                    .map-popup {
                        z-index: 11;
                    }
                `;
                document.head.appendChild(animStyle);

                if (!state.popup) {
                    state.popup = new mapboxgl.Popup({
                        closeButton: false,
                        closeOnClick: false,
                        className: 'map-popup'
                    });
                }

                const value = feature.properties.value;
                try {
                    state.popup
                        .setLngLat(e.lngLat)
                        .setHTML(`
                            <div class="map-popup-content">
                                <h4>${feature.properties.name}</h4>
                                <p>£${formatToMillions(value)}</p>
                            </div>
                        `)
                        .addTo(state.currentMap);
                } catch (err) {
                    console.warn('Error showing popup:', err);
                }
            } catch (err) {
                console.warn('Error creating curve animation:', err);
            }
        });

        state.currentMap.on('mouseleave', 'country-fills', () => {
            if (state.hoveredFeatureId !== null) {
                try {
                    state.currentMap.setFeatureState(
                        { source: 'countries', id: state.hoveredFeatureId },
                        { hover: false }
                    );
                } catch (err) {
                    console.warn('Error clearing hover state:', err);
                }
            }
            state.hoveredFeatureId = null;

            const path = document.querySelector('#curve-path');
            const dot = document.querySelector('#moving-dot');
            if (path) path.setAttribute('stroke', 'none');
            if (dot) dot.setAttribute('fill', 'none');

            if (state.popup) {
                try {
                    state.popup.remove();
                } catch (err) {
                    console.warn('Error removing popup:', err);
                }
            }
        });

        state.currentMap.on('load', () => {
            console.log('Map fully loaded, checking animation state');
        });

        state.currentMap.on('mousemove', 'country-fills', (e) => {
            if (e.features.length > 0) {
                const feature = e.features[0];
                
                if (state.hoveredFeatureId !== null) {
                    try {
                        state.currentMap.setFeatureState(
                            { source: 'countries', id: state.hoveredFeatureId },
                            { hover: false }
                        );
                    } catch (err) {
                        console.warn('Error clearing hover state:', err);
                    }
                }
                
                state.hoveredFeatureId = feature.id;
                try {
                    state.currentMap.setFeatureState(
                        { source: 'countries', id: state.hoveredFeatureId },
                        { hover: true }
                    );
                } catch (err) {
                    console.warn('Error setting hover state:', err);
                }

                if (!state.popup) {
                    state.popup = new mapboxgl.Popup({
                        closeButton: false,
                        closeOnClick: false,
                        className: 'map-popup'
                    });
                }

                const value = feature.properties.value;
                try {
                    state.popup
                        .setLngLat(e.lngLat)
                        .setHTML(`
                            <div class="map-popup-content">
                                <h4>${feature.properties.name}</h4>
                                <p>£${formatToMillions(value)}</p>
                            </div>
                        `)
                        .addTo(state.currentMap);
                } catch (err) {
                    console.warn('Error showing popup:', err);
                }
            }
        });

        state.currentMap.on('mouseleave', 'country-fills', () => {
            if (state.hoveredFeatureId !== null) {
                try {
                    state.currentMap.setFeatureState(
                        { source: 'countries', id: state.hoveredFeatureId },
                        { hover: false }
                    );
                } catch (err) {
                    console.warn('Error clearing hover state:', err);
                }
            }
            state.hoveredFeatureId = null;
            
            if (state.popup) {
                try {
                    state.popup.remove();
                } catch (err) {
                    console.warn('Error removing popup:', err);
                }
            }
        });

        state.currentMap.on('click', 'country-fills', (e) => {
            if (e.features.length > 0) {
                const feature = e.features[0];
                state.selectedCountry = feature.properties.name;
                
                if (state.selectedFeatureId !== null) {
                    try {
                        state.currentMap.setFeatureState(
                            { source: 'countries', id: state.selectedFeatureId },
                            { selected: false }
                        );
                    } catch (err) {
                        console.warn('Error clearing selected state:', err);
                    }
                }
                
                state.selectedFeatureId = feature.id;
                try {
                    state.currentMap.setFeatureState(
                        { source: 'countries', id: state.selectedFeatureId },
                        { selected: true }
                    );
                } catch (err) {
                    console.warn('Error setting selected state:', err);
                }
                
                updateTrendChart(state.currentSitcData);
            }
        });

    } catch (err) {
        console.error('Mapbox地图初始化异常', err);
        mapDiv.innerHTML = '<div class="map-error">Failed to initialize map</div>';
    }
  }

  let countriesChart = null;
  let trendChart = null;
  let selectedCountry = null;
  
  function initializeCharts() {
    const container = document.getElementById('country-trend-container');
    if (container) {
        container.innerHTML = `
            <div class="no-country-selected">Click a country on the map to view its trend</div>
            <canvas id="country-trend-chart" style="display: none;"></canvas>
        `;
    }
    
    countriesChart = null;
    trendChart = null;
    selectedCountry = null;
    
    initializeCountriesChart();
    initializeTrendChart();
  }

  function initializeCountriesChart() {
    const ctx = document.getElementById('goods-countries-chart');
    if (!ctx) return;
    
    if (countriesChart) {
        countriesChart.destroy();
    }
    
    countriesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: 'rgba(53, 122, 189, 0.8)',
                borderColor: 'rgba(53, 122, 189, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#fff'
                    }
                },
                y: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#fff'
                    }
                }
            }
        }
    });
  }

  function initializeTrendChart() {
    const ctx = document.getElementById('country-trend-chart');
    const container = document.getElementById('country-trend-container');
    if (!ctx || !container) return;
    
    container.innerHTML = `
        <div class="no-country-selected">Click a country on the map to view its trade trend</div>
        <canvas id="country-trend-chart" style="display: none;"></canvas>
    `;
    
    const canvas = document.getElementById('country-trend-chart');
    
    if (state.trendChart) {
        state.trendChart.destroy();
    }
    
    state.trendChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: years,
            datasets: flowTypes.map(flowType => ({
                label: flowType,
                data: [],
                borderColor: COLOR_SCHEME[flowType].border,
                backgroundColor: COLOR_SCHEME[flowType].background,
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1500,
                easing: 'easeOutQuart'
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#fff',
                        padding: 10,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: £${formatToMillions(context.parsed.y)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#fff'
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#fff',
                        callback: function(value) {
                            return '£' + formatToMillions(value, true);
                        }
                    },
                    beginAtZero: true
                }
            }
        }
    });
  }

  function updateTrendChart(sitcData) {
    if (!state.trendChart || !state.selectedCountry) return;

    const canvas = document.getElementById('country-trend-chart');
    const noCountryMessage = document.querySelector('.no-country-selected');
    
    const cleanCountryName = (name) => {
        if (name.includes('\u9983') || name.includes('\u657b') || name.includes('\u9e7f')) {
            return 'Confidential Country';
        }
        if (name === 'United States of America') {
            return 'United States';
        }
        return name;
    };

    const cleanedSelectedCountry = cleanCountryName(state.selectedCountry);
    
    if (canvas) {
        canvas.style.display = 'block';
        canvas.classList.add('trend-chart-animation');
        noCountryMessage.style.display = 'none';
    }

    const datasets = flowTypes.map((flowType, index) => {
        const data = years.map(year => {
            const yearData = sitcData.data.find(d => d.year === year && d.flow_type === flowType);
            if (!yearData) return 0;
            
            const countryInfo = yearData.countries.find(c => cleanCountryName(c.Country) === cleanedSelectedCountry);
            return countryInfo ? Number(countryInfo['Value (￡)']) : 0;
        });

        return {
            ...state.trendChart.data.datasets[index],
            data: data
        };
    });

    state.trendChart.data.datasets = datasets;
    state.trendChart.options.plugins.title = {
        display: true,
        text: `${cleanedSelectedCountry} - ${sitcData.sitc_type}`,
        color: '#fff',
        font: {
            size: 16,
            weight: 'normal'
        }
    };

    state.trendChart.options.animation = {
        duration: 1500,
        easing: 'easeOutQuart'
    };
    state.trendChart.update();

    setTimeout(() => {
        if (canvas) {
            canvas.classList.remove('trend-chart-animation');
        }
    }, 1200);
  }

  let lastLoadedData = null;

  async function updateMapData(sitcData) {
    if (!state.currentMap) return;
    state.currentSitcData = sitcData; 
    
    const mapDiv = document.querySelector('.goods-type-detail-map');
    if (!mapDiv) return;
    
    mapDiv.classList.add('updating');
    let isUpdating = true;

    try {
        const cleanCountryName = (name) => {
            if (name.includes('\u9983') || name.includes('\u657b') || name.includes('\u9e7f')) {
                return 'Confidential Country';
            }
            if (name === 'United States of America') {
                return 'United States';
            }
            return name;
        };

        const currentData = sitcData.data.find(d => 
            d.year === state.currentYear && 
            d.flow_type === state.currentFlow
        );
        
        if (!currentData || !currentData.countries || currentData.countries.length === 0) {
            console.warn(`No data available for year ${state.currentYear} and flow type ${state.currentFlow}`);
            if (state.currentMap.getSource('countries')) {
                state.currentMap.getSource('countries').setData({
                    type: 'FeatureCollection',
                    features: geoData.features.map(feature => ({
                        ...feature,
                        properties: {
                            ...feature.properties,
                            value: 0,
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }))
                });
            }
            return;
        }
        
        const countryValues = {};
        currentData.countries.forEach(item => {
            const cleanedName = cleanCountryName(item.Country);
            countryValues[cleanedName] = Number(item['Value (￡)']);
        });
        
        const values = Object.values(countryValues).filter(v => v > 0);
        if (values.length === 0) {
            console.warn('No valid trade values found for the current selection');
            return;
        }
        
        const maxValue = Math.max(...values);
        const minValue = Math.min(...values);
        
        const getMapColor = (value, maxValue, minValue) => {
            if (value <= 0) return 'rgba(0, 0, 0, 0.1)';
            
            const normalizedValue = Math.pow(
                (Math.log(value + 1) - Math.log(minValue + 1)) / 
                (Math.log(maxValue + 1) - Math.log(minValue + 1)),
                0.5
            );
            
            const baseColor = state.currentFlow.includes('Non EU') ? 
                COLOR_SCHEME['Non EU - Exports'].map :
                COLOR_SCHEME['EU - Exports'].map;
            
            const alpha = 0.3 + normalizedValue * 0.7;
            
            const hslColor = state.currentFlow.includes('Non EU') ?
                `hsla(0, ${60 + normalizedValue * 40}%, ${40 + normalizedValue * 30}%, ${alpha})` :
                `hsla(210, ${60 + normalizedValue * 40}%, ${40 + normalizedValue * 30}%, ${alpha})`;
                
            return hslColor;
        };

        const updatedFeatures = geoData.features.map((feature, index) => ({
            ...feature,
            id: index,
            properties: {
                ...feature.properties,
                value: countryValues[feature.properties.name] || 0,
                color: getMapColor(
                    countryValues[feature.properties.name] || 0,
                    maxValue,
                    minValue
                )
            }
        }));
        
        if (state.currentMap.getSource('countries')) {
            state.currentMap.getSource('countries').setData({
                type: 'FeatureCollection',
                features: updatedFeatures
            });
        } else {
            state.currentMap.addSource('countries', {
                type: 'geojson',
                generateId: true,
                data: {
                    type: 'FeatureCollection',
                    features: updatedFeatures
                }
            });

            state.popup = new mapboxgl.Popup({
                closeButton: false,
                closeOnClick: false,
                className: 'map-popup'
            });

            state.currentMap.addLayer({
                id: 'country-fills',
                type: 'fill',
                source: 'countries',
                paint: {
                    'fill-color': ['get', 'color'],
                    'fill-opacity': [
                        'case',
                        ['boolean', ['feature-state', 'hover'], false],
                        0.9,
                        ['boolean', ['feature-state', 'selected'], false],
                        0.95,
                        0.85
                    ]
                }
            });

            state.currentMap.addLayer({
                id: 'country-borders',
                type: 'line',
                source: 'countries',
                paint: {
                    'line-color': '#ffffff',
                    'line-width': [
                        'case',
                        ['boolean', ['feature-state', 'selected'], false],
                        2.5,
                        ['boolean', ['feature-state', 'hover'], false],
                        1.5,
                        0.5
                    ],
                    'line-opacity': 0.8
                }
            });

            state.currentMap.on('mousemove', 'country-fills', (e) => {
                if (e.features.length > 0) {
                    const feature = e.features[0];
                    
                    if (state.hoveredFeatureId !== null) {
                        try {
                            state.currentMap.setFeatureState(
                                { source: 'countries', id: state.hoveredFeatureId },
                                { hover: false }
                            );
                        } catch (err) {
                            console.warn('Error clearing hover state:', err);
                        }
                    }
                    
                    state.hoveredFeatureId = feature.id;
                    try {
                        state.currentMap.setFeatureState(
                            { source: 'countries', id: state.hoveredFeatureId },
                            { hover: true }
                        );
                    } catch (err) {
                        console.warn('Error setting hover state:', err);
                    }

                    if (!state.popup) {
                        state.popup = new mapboxgl.Popup({
                            closeButton: false,
                            closeOnClick: false,
                            className: 'map-popup'
                        });
                    }

                    const value = feature.properties.value;
                    try {
                        state.popup
                            .setLngLat(e.lngLat)
                            .setHTML(`
                                <div class="map-popup-content">
                                    <h4>${feature.properties.name}</h4>
                                    <p>£${formatToMillions(value)}</p>
                                </div>
                            `)
                            .addTo(state.currentMap);
                    } catch (err) {
                        console.warn('Error showing popup:', err);
                    }
                }
            });

            state.currentMap.on('mouseleave', 'country-fills', () => {
                if (state.hoveredFeatureId !== null) {
                    try {
                        state.currentMap.setFeatureState(
                            { source: 'countries', id: state.hoveredFeatureId },
                            { hover: false }
                        );
                    } catch (err) {
                        console.warn('Error clearing hover state:', err);
                    }
                }
                state.hoveredFeatureId = null;
                
                if (state.popup) {
                    try {
                        state.popup.remove();
                    } catch (err) {
                        console.warn('Error removing popup:', err);
                    }
                }
            });

            state.currentMap.on('click', 'country-fills', (e) => {
                if (e.features.length > 0) {
                    const feature = e.features[0];
                    state.selectedCountry = feature.properties.name;
                    
                    if (state.selectedFeatureId !== null) {
                        try {
                            state.currentMap.setFeatureState(
                                { source: 'countries', id: state.selectedFeatureId },
                                { selected: false }
                            );
                        } catch (err) {
                            console.warn('Error clearing selected state:', err);
                        }
                    }
                    
                    state.selectedFeatureId = feature.id;
                    try {
                        state.currentMap.setFeatureState(
                            { source: 'countries', id: state.selectedFeatureId },
                            { selected: true }
                        );
                    } catch (err) {
                        console.warn('Error setting selected state:', err);
                    }
                    
                    updateTrendChart(state.currentSitcData);
                }
            });
        }
        
    } catch (error) {
        console.error('Error updating map:', error);
        if (mapDiv) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'map-error';
            errorDiv.textContent = error.message || 'Failed to update map data';
            mapDiv.appendChild(errorDiv);
        }
    } finally {
        isUpdating = false;
        if (mapDiv) {
            mapDiv.classList.remove('updating');
        }
    }
  }

  function updateCountriesChart(sitcData) {
    if (!countriesChart) return;
    
    const currentYearData = sitcData.data.find(d => 
        d.year === state.currentYear && 
        d.flow_type === state.currentFlow
    );

    if (!currentYearData) return;

    const cleanCountryName = (name) => {
        if (name.includes('\u9983') || name.includes('\u657b') || name.includes('\u9e7f')) {
            return 'Confidential Country';
        }
        if (name === 'United States of America') {
            return 'United States';
        }
        return name;
    };

    const topCountries = currentYearData.countries
        .sort((a, b) => Number(b['Value (￡)']) - Number(a['Value (￡)']))
        .slice(0, 10)
        .map(c => ({
            ...c,
            Country: cleanCountryName(c.Country)
        }));

    const baseColor = state.currentFlow.includes('Non EU') ? 
        COLOR_SCHEME['Non EU - Exports'] :
        COLOR_SCHEME['EU - Exports'];

    countriesChart.data.labels = topCountries.map(c => c.Country);
    countriesChart.data.datasets[0].data = topCountries.map(c => Number(c['Value (￡)']));
    countriesChart.data.datasets[0].backgroundColor = baseColor.background;
    countriesChart.data.datasets[0].borderColor = baseColor.border;

    countriesChart.options.plugins.tooltip = {
        callbacks: {
            label: function(context) {
                return `£${formatToMillions(context.raw)}`;
            }
        }
    };
    countriesChart.options.scales.x.ticks = {
        callback: function(value) {
            return '£' + formatToMillions(value, true);
        },
        color: '#fff'
    };
    
    countriesChart.update('none');
  }

  async function loadSitcData(sitcIndex) {
    const sitcFiles = [
      'sitc_0.json', // 0 Food & live animals
      'sitc_1.json', // 1 Beverages & tobacco 
      'sitc_2.json', // 2 Crude materials
      'sitc_3.json', // 3 Mineral fuels
      'sitc_4.json', // 4 Animal & vegetable oils
      'sitc_5.json', // 5 Chemicals & related products
      'sitc_6.json', // 6 Manufactured goods
      'sitc_7.json', // 7 Machinery & transport
      'sitc_8.json'  // 8 Miscellaneous manufactured articles
    ];
    
    const fileName = sitcFiles[sitcIndex];
    if (!fileName) {
      console.error(`Invalid SITC index: ${sitcIndex}`);
      return null;
    }
    
    const cacheKey = fileName;
    
    if (window.sitcDataCache?.[cacheKey]) {
        return window.sitcDataCache[cacheKey];
    }
    
    try {
        const response = await fetch(`https://raw.githubusercontent.com/Cihshee/CASA0003_minnni_project/main/public/data/split/${fileName}`);
        if (!response.ok) throw new Error(`Failed to load ${fileName}`);
        
        const data = await response.json();
        
        const hasData = data.data.some(d => d.countries && d.countries.length > 0);
        if (!hasData) {
            console.error(`SITC ${sitcIndex} (${data.sitc_type}) data is empty. Please check the data file.`);
            const descElement = document.getElementById('goods-type-detail-desc');
            if (descElement) {
                descElement.innerHTML = `
                    <div class="error-message" style="color: #ff6b6b; padding: 10px; background: rgba(255,107,107,0.1); border-radius: 4px;">
                        <p>No data available for ${data.sitc_type}.</p>
                        <p>Please check the data file: ${fileName}</p>
                    </div>
                `;
            }
            return null;
        }
        
        if (!window.sitcDataCache) window.sitcDataCache = {};
        window.sitcDataCache[cacheKey] = data;
        
        const maxCacheSize = 3;
        const cacheKeys = Object.keys(window.sitcDataCache);
        if (cacheKeys.length > maxCacheSize) {
            delete window.sitcDataCache[cacheKeys[0]];
        }
        
        return data;
    } catch (error) {
        console.error(`Error loading ${fileName}:`, error);
        return null;
    }
  }

  function preloadNextSitcData() {
    const nextType = (state.currentType + 1) % sitcLabels.length;
    loadSitcData(nextType).catch(() => {});
  }

  function bindIconBarEvents() {
    const allIcons = document.querySelectorAll('.goods-type-icon-btn');

    allIcons.forEach(btn => {
      const typeIndex = parseInt(btn.getAttribute('data-type'));
      btn.setAttribute('title', sitcLabels[typeIndex]);
      
      btn.onclick = async () => {
        if (state.currentType === typeIndex) return;
        
        const oldType = state.currentType;
        state.currentType = typeIndex;
        
        allIcons.forEach(icon => {
          const iconTypeIndex = parseInt(icon.getAttribute('data-type'));
          const isSelected = iconTypeIndex === typeIndex;
          icon.setAttribute('data-selected', isSelected ? 'true' : 'false');
          icon.style.backgroundColor = isSelected ? 'rgb(33, 150, 243)' : '#1e2832';
        });
        
        try {
          // Store current animation state
          const wasPlaying = animationState.isPlaying;
          const currentSpeed = animationState.speed;
          
          // Pause animation temporarily during data loading
          if (wasPlaying) {
            stopTimelineAnimation();
          }
          
          const descElement = document.getElementById('goods-type-detail-desc');
          if (descElement) {
            descElement.textContent = sitcDetailedDescriptions[typeIndex];
          }

          const sitcData = await loadSitcData(typeIndex);
          if (!sitcData) throw new Error(`Failed to load SITC ${typeIndex} data`);
          
          state.currentSitcData = sitcData;
          
          await Promise.all([
            updateMapData(sitcData),
            updateCountriesChart(sitcData)
          ]);
          
          if (state.selectedCountry) {
            const canvas = document.getElementById('country-trend-chart');
            if (canvas) {
              canvas.style.display = 'block';
              updateTrendChart(sitcData);
            }
          }
          
          // Resume animation if it was playing before
          if (wasPlaying) {
            // Short delay to ensure UI is updated
            setTimeout(() => {
              animationState.speed = currentSpeed;
              startTimelineAnimation();
            }, 500);
          }
          
          preloadNextSitcData();
          
        } catch (error) {
          console.error('Failed to update visualizations:', error);
          state.currentType = oldType;
          allIcons.forEach(icon => {
            const iconTypeIndex = parseInt(icon.getAttribute('data-type'));
            const isSelected = iconTypeIndex === oldType;
            icon.setAttribute('data-selected', isSelected ? 'true' : 'false');
            icon.style.backgroundColor = isSelected ? 'rgb(33, 150, 243)' : '#1e2832';
          });
        }
      };
    });

    allIcons.forEach(icon => {
      const iconTypeIndex = parseInt(icon.getAttribute('data-type'));
      const isSelected = iconTypeIndex === state.currentType;
      icon.setAttribute('data-selected', isSelected ? 'true' : 'false');
      icon.style.backgroundColor = isSelected ? 'rgb(33, 150, 243)' : '#1e2832';
    });
  }

  async function initialize() {
    try {
        const response = await fetch(csvPath);
        const csvText = await response.text();
        const {data} = parseCSV(csvText);
        state.allData = data;
        renderGoodsTypeIntro();
        renderLegend();
        renderSummaryCharts(data);
        state.currentType = 0;
        state.currentFlow = flowTypes[0];
        state.currentYear = years[0];

        renderDetail();
        bindIconBarEvents();
        
        setupScrollObserver();
        
        preloadSitcData();
    } catch (error) {
        console.error('Initialization failed:', error);
    }
  }
  

  async function preloadSitcData() {
    try {
        const initialData = await loadSitcData(0);
        if (initialData) {
            state.preloadedData = initialData;
        }
    } catch (error) {
        console.error('Preload data failed:', error);
    }
  }
  
  function setupScrollObserver() {
    window.sitcAnimationTriggered = window.sitcAnimationTriggered || false;
    window.sitcIconsMovedToSummary = window.sitcIconsMovedToSummary || false;
    
    const introObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !window.sitcAnimationTriggered) {
                const rect = entry.target.getBoundingClientRect();
                if (rect.top < 150 && rect.top > -20) {
                setTimeout(() => {
                    console.log('Triggering first phase animation: intro to summary');
                    window.sitcAnimationTriggered = true;
                    triggerSITCIconsAnimation();
                }, 100);
                }
              }
        });
    }, { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9], rootMargin: "-10px 0px 0px 0px" });
    
    const sitcIconsRow = document.querySelector('#goods-type-intro .sitc-icons-row');
    if (sitcIconsRow) {
        introObserver.observe(sitcIconsRow);
    }
    
    const detailObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !state.dataLoaded) {
                state.dataLoaded = true;
                
                loadInitialData();
                
                if (!window.sitcAnimationTriggered) {
                    setTimeout(() => {
                        console.log('Triggering first phase animation (backup): intro to summary');
                        window.sitcAnimationTriggered = true;
                        triggerSITCIconsAnimation();
                    }, 800);
                }
                
                detailObserver.disconnect();
            }
        });
    }, { threshold: 0.4 });
    
    const detailContainer = document.getElementById('goods-type-detail-container');
    if (detailContainer) {
        detailObserver.observe(detailContainer);
    }
  }
  
  async function loadInitialData() {
    try {
        let sitcData;
        
        if (state.preloadedData) {
            sitcData = state.preloadedData;
            console.log('Using preloaded data for initial display');
        } else {
            sitcData = await loadSitcData(0);
            if (!sitcData) throw new Error('Failed to load initial data');
        }
        
        state.currentSitcData = sitcData;
        
        updateCurrentIcon(0);
        
        const descElement = document.getElementById('goods-type-detail-desc');
        if (descElement) {
            descElement.textContent = sitcDescriptions[0];
        }
        
        await Promise.all([
            updateMapData(sitcData),
            updateCountriesChart(sitcData)
        ]);
        
        preloadNextSitcData();

        // Auto-start the timeline animation after data is loaded
        setTimeout(() => {
            startTimelineAnimation();
            // Play button UI is now updated in startTimelineAnimation function
        }, 1000); // Short delay to ensure everything is rendered
    } catch (error) {
        console.error('Failed to load initial data:', error);
    }
  }

  initialize();

  const MAPBOX_TOKEN = 'pk.eyJ1IjoieWl4aW5nLWxpIiwiYSI6ImNtN3FtNWh6YjA0ancybnM4aGxjZnlheTEifQ.sKwaoIMQR65VQmYDbnu2MQ';
  const MAPBOX_STYLE = 'mapbox://styles/yixing-li/cmaa8uo1j00j001sgc3051vxu';

  const style = document.createElement('style');
  style.textContent = `
      .goods-type-icon-btn {
          background-color: #1e2832 !important;
          border: 2px solid rgba(255, 255, 255, 0.2) !important;
          transition: all 0.3s ease !important;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 0;
          outline: none;
          margin-left: -10px !important;
      }

      .goods-type-icons-row {
          padding-left: 0 !important;
          margin-left: -100px !important;
          z-index: 100;
      }

      #goods-type-detail-container {
          padding-left: 0 !important;
          margin-left: -100px !important;
      }

      .goods-type-icon-btn::before {
          content: attr(title);
          position: absolute;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          white-space: nowrap;
          visibility: hidden;
          opacity: 0;
          transition: opacity 0.3s ease;
          left: 120%;
          top: 50%;
          transform: translateY(-50%);
          z-index: 1000;
      }

      .goods-type-icon-btn:hover::before {
          visibility: visible;
          opacity: 1;
      }

      .goods-type-icon-btn[data-selected="true"] {
          background-color: rgb(33, 150, 243) !important;
          border-color: rgb(33, 150, 243) !important;
          box-shadow: 0 0 15px rgba(33, 150, 243, 0.5) !important;
          transform: translateX(5px) !important;
      }

      .goods-type-icon-btn:hover {
          background-color: rgba(33, 150, 243, 0.2) !important;
          border-color: rgba(33, 150, 243, 0.5) !important;
      }

      .goods-type-detail-map {
          position: relative;
          z-index: 1;
          margin-left: -20px !important;
          padding-left: 0 !important;
          width: 78% !important;
      }

      .mapboxgl-canvas {
          cursor: pointer !important;
      }

      .mapboxgl-canvas-container {
          z-index: 2;
      }

      .trend-chart-animation {
          animation: fadeInSlideUp 1.2s ease-out;
      }

      @keyframes fadeInSlideUp {
          0% {
              opacity: 0;
              transform: translateY(20px);
          }
          100% {
              opacity: 1;
              transform: translateY(0);
          }
      }

      .goods-type-section {
          margin-bottom: 120px !important;
          padding-bottom: 50px !important;
      }

      .goods-summary-chart-block {
          margin: 0 auto !important;
          max-width: 1000px !important;
          position: relative !important;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
      }

      .goods-summary-chart-canvas {
          width: 900px !important;
          height: 420px !important;
          min-height: 420px !important;
          max-height: 420px !important;
          display: block;
          margin: 0 auto;
          background: transparent;
          box-sizing: border-box;
          margin-bottom: 32px;
      }

      .summary-explore-btns {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: 24px;
          transition: opacity 0.5s;
      }

      .summary-btn-row {
          display: flex;
          gap: 18px;
          margin-bottom: 8px;
      }

      .summary-explore-btn {
          background: transparent;
          border: 2px solid #3776b6;
          color: #fff;
          padding: 12px 32px;
          border-radius: 18px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(.4,1.4,.6,1);
          font-size: 14px;
          margin: 0 2px;
          font-weight: 500;
          box-shadow: none;
          letter-spacing: 0.2px;
          outline: none;
          position: relative;
          text-align: center;
          line-height: 1.3;
          white-space: normal;
      }

      .summary-explore-btn .arrow {
          font-size: 18px;
          vertical-align: middle;
          margin: 0 2px;
          font-family: inherit;
          font-weight: 600;
          display: inline-block;
      }

      .summary-explore-btn[data-selected="true"], .summary-explore-btn.active {
          background: #3776b6;
          color: #fff;
          border-color: #3776b6;
          box-shadow: 0 2px 8px rgba(33,150,243,0.08);
          z-index: 1;
      }

      .summary-explore-btn:hover {
          background: #3776b6;
          color: #fff;
          border-color: #3776b6;
          transform: translateY(-2px) scale(1.04);
      }

      .goods-summary-chart-title {
          text-align: center;
          margin-bottom: 20px;
          font-size: 22px;
          color: white;
          font-weight: 600;
          letter-spacing: 0.5px;
      }

      .summary-flex-wrap {
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: flex-start;
        gap: 16px;
        margin: 0 auto;
        max-width: 1300px;
        width: 100%;
      }
      .summary-chart-area {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        min-width: 920px;
        max-width: 920px;
      }
      .summary-desc-area {
        min-width: 260px;
        max-width: 320px;
        background: none;
        padding: 32px 0 24px 0px;
        color: #fff;
        font-size: 17px;
        line-height: 1.7;
        box-shadow: none;
        margin-top: 32px;
        margin-left: 0;
        min-height: 220px;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        justify-content: flex-start;
        position: relative;
        text-align: left;
      }
      .summary-desc-text {
        color: #fff;
        font-size: 17px;
        font-weight: 500;
        letter-spacing: 0.1px;
        line-height: 1.7;
        word-break: break-word;
        margin-bottom: 18px;
        text-align: left;
        transition: opacity 0.7s, transform 0.7s;
        will-change: opacity, transform;
      }
      .chartjs-render-monitor text {
        letter-spacing: 2px !important;
      }

      .goods-type-detail-map {
          min-width: 1000px !important;
          min-height: 600px !important;
          width: 80% !important;
          height: 600px !important;
      }

      @media (max-width: 900px) {
          .goods-type-detail-map {
              width: 100vw !important;
              min-width: 0 !important;
              height: 420px !important;
              min-height: 320px !important;
              max-height: 470px !important;
          }
      }
  `;
  document.head.appendChild(style);

  function renderGoodsTypeIntro() {
    if (document.getElementById('goods-type-intro')) return;
    const mainWrap = document.querySelector('.goods-type-section') || document.body;
    const introDiv = document.createElement('div');
    introDiv.id = 'goods-type-intro';
    introDiv.style.cssText = 'max-width:1200px;min-height:480px;margin:0 auto 96px auto;padding:0 0 18px 0;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;z-index:1;';
    const introText = document.createElement('div');
    introText.className = 'goods-type-intro-text';
    introText.innerHTML = `
      <div class=\"goods-type-transition-text fadein-block\" style=\"font-size:1.1em !important;color:#fff;margin-bottom:64px;max-width:1000px;margin-left:auto;margin-right:auto;text-align:center;line-height:1.6;\">Beyond fluctuations in trade volumes with specific countries and regions, Brexit has had complex effects on particular types of goods. From the SITC 1 classification perspective...</div>
      
      <div class=\"fadein-block\" style=\"width:100%;margin-bottom:24px;\">  
        <h1 style=\"font-size:1.8em;font-weight:700;margin-bottom:40px;color:#fff;letter-spacing:1.2px;text-align:center;text-transform:uppercase;padding:10px 0;line-height:1.4;text-shadow:0 2px 10px rgba(33,150,243,0.3);\">Brexit's Impact on Trade by <span style=\"color:rgba(79, 195, 247, 0.75);\">SITC Product Categories</span></h1>
        <h2 style=\"font-size:1.2em;font-weight:600;margin-bottom:18px;color:rgba(79, 195, 247, 0.75);letter-spacing:1px;text-align:center;border-bottom:1px solid rgba(79, 195, 247, 0.25);padding-bottom:10px;display:inline-block;margin-left:auto;margin-right:auto;\">SITC1 Introduction</h2>
        <div style=\"font-size:1.05em;max-width:1000px;margin:0 auto 20px auto;line-height:1.6;color:#fff;\">
          The Standard International Trade Classification (SITC) is a United Nations system designed to classify traded products to enable international comparison of trade data. SITC1 is the first-level broader classification, dividing goods into 10 main categories based on material type, use, and processing stage.
        </div>
        <div style=\"max-width:1000px;margin:0 auto 0 auto;font-size:0.92em;font-style:italic;color:rgba(255,255,255,0.38);line-height:1.5;text-align:center;\">
          Source: <a href=\"https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Glossary:Standard_international_trade_classification_(SITC)\" target=\"_blank\" style=\"color:#4fc3f7;text-decoration:underline;\">Eurostat, 'Standard international trade classification (SITC)'</a>
        </div>
      </div>
      
      <div class=\"sitc-icons-row fadein-block\" style=\"margin:50px auto 40px auto;\">
        <button class=\"sitc-icon-btn\" data-sitc=\"0\" title=\"Food & live animals\"><img src=\"https://raw.githubusercontent.com/Cihshee/CASA0003_minnni_project/main/public/goods-icons/0-Food-and-live-animals.png\" alt=\"Food & live animals\"></button>
        <button class=\"sitc-icon-btn\" data-sitc=\"1\" title=\"Beverages & tobacco\"><img src=\"https://raw.githubusercontent.com/Cihshee/CASA0003_minnni_project/main/public/goods-icons/1-Beverages-and-tobacco.png\" alt=\"Beverages & tobacco\"></button>
        <button class=\"sitc-icon-btn\" data-sitc=\"2\" title=\"Crude materials\"><img src=\"https://raw.githubusercontent.com/Cihshee/CASA0003_minnni_project/main/public/goods-icons/2-Crude-materials.png\" alt=\"Crude materials\"></button>
        <button class=\"sitc-icon-btn\" data-sitc=\"3\" title=\"Mineral fuels\"><img src=\"https://raw.githubusercontent.com/Cihshee/CASA0003_minnni_project/main/public/goods-icons/3-Mineral-fuels-lubricants-and-related-materials.png\" alt=\"Mineral fuels\"></button>
        <button class=\"sitc-icon-btn\" data-sitc=\"4\" title=\"Animal & vegetable oils\"><img src=\"https://raw.githubusercontent.com/Cihshee/CASA0003_minnni_project/main/public/goods-icons/4-Animal-and-vegetable-oils-fats-and-waxes.png\" alt=\"Animal & vegetable oils\"></button>
        <button class=\"sitc-icon-btn\" data-sitc=\"5\" title=\"Chemicals\"><img src=\"https://raw.githubusercontent.com/Cihshee/CASA0003_minnni_project/main/public/goods-icons/5-Chemicals-and-related-products.png\" alt=\"Chemicals\"></button>
        <button class=\"sitc-icon-btn\" data-sitc=\"6\" title=\"Manufactured goods\"><img src=\"https://raw.githubusercontent.com/Cihshee/CASA0003_minnni_project/main/public/goods-icons/6-Manufactured-goods-classified-chiefly-by-material.png\" alt=\"Manufactured goods\"></button>
        <button class=\"sitc-icon-btn\" data-sitc=\"7\" title=\"Machinery & transport\"><img src=\"https://raw.githubusercontent.com/Cihshee/CASA0003_minnni_project/main/public/goods-icons/7-Machinery-and-transport-equipment.png\" alt=\"Machinery & transport\"></button>
        <button class=\"sitc-icon-btn\" data-sitc=\"8\" title=\"Miscellaneous articles\"><img src=\"https://raw.githubusercontent.com/Cihshee/CASA0003_minnni_project/main/public/goods-icons/8-Miscellaneous-manufactured-articles.png\" alt=\"Miscellaneous manufactured articles\"></button>
      </div>
    `;
    introDiv.appendChild(introText);
    const carousel = document.createElement('div');
    carousel.className = 'goods-type-carousel fadein-block';
    carousel.style.cssText = 'display:flex;gap:0;justify-content:center;align-items:flex-end;margin-bottom:38px;overflow-x:auto;max-width:100%;';
    const descDiv = document.createElement('div');
    descDiv.className = 'goods-type-desc fadein-block';
    descDiv.style.cssText = 'min-height:90px;text-align:center;max-width:700px;margin:0 auto 0 auto;font-size:1.05em;color:#fff;line-height:1.7;transition:all 0.5s;';
    let selected = 0;
    function updateDesc(idx) {
      descDiv.innerHTML = `<h4 style=\"font-size:1.05em;font-weight:700;margin-bottom:8px;letter-spacing:1px;color:#4fc3f7;\">${sitcLabels[idx]}</h4><div style=\"font-size:1.05em;font-weight:400;color:#fff;\">${sitcDescriptions[idx]}</div>`;
      Array.from(carousel.children).forEach((el, i) => {
        if (i === idx) {
          el.classList.add('active');
          el.classList.remove('dimmed');
          el.style.width = '400px';
          el.style.zIndex = 2;
          el.querySelector('img').style.filter = 'none';
          el.style.boxShadow = '0 8px 32px #4fc3f7aa';
        } else {
          el.classList.remove('active');
          el.classList.add('dimmed');
          el.style.width = '130px';
          el.style.zIndex = 1;
          el.querySelector('img').style.filter = 'grayscale(0.7) brightness(0.8)';
          el.style.boxShadow = 'none';
        }
      });
    }
    for (let i = 0; i < 10; i++) {
      const card = document.createElement('div');
      card.className = 'goods-type-card';
      card.style.cssText = `width:130px;height:350px;overflow:hidden;cursor:pointer;transition:width 0.55s cubic-bezier(.28,-0.03,0,.99),box-shadow 0.3s;display:flex;align-items:center;justify-content:center;background:#232b36;position:relative;border:none;`;
      card.innerHTML = `<span class=\"goods-type-card-num\" style=\"font-size:1.05em;\">${i}</span><img src=\"https://raw.githubusercontent.com/Cihshee/CASA0003_minnni_project/main/public/goods-icons/${i}-pic.jpg\" alt=\"type${i}\" style=\"width:100%;height:100%;object-fit:cover;display:block;filter:grayscale(0.7) brightness(0.8);transition:filter 0.45s;\">`;
      card.onmouseenter = () => { selected = i; updateDesc(i); };
      card.onclick = () => { selected = i; updateDesc(i); };
      carousel.appendChild(card);
    }
    introDiv.appendChild(carousel);
    introDiv.appendChild(descDiv);
    mainWrap.parentNode.insertBefore(introDiv, mainWrap);
    function updateDesc(index) {
      const descDiv = document.querySelector('.goods-type-desc');
      if (descDiv) {
        descDiv.textContent = sitcConciseDescriptions[index];
      }
    }
    updateDesc(0);
    const style = document.createElement('style');
    style.textContent = `
      #goods-type-intro {box-sizing:border-box;}
      .goods-type-intro-text {margin-top:48px;margin-bottom:18px;text-align:center;}
      .goods-type-carousel::-webkit-scrollbar {display:none;}
      .goods-type-card {
        margin: 0;
        box-shadow: none;
        filter: none;
        width: 130px !important;
        transition: all 0.3s ease-in-out;
      }
      .goods-type-card img {
        filter: grayscale(0.7) brightness(0.8);
        transition: all 0.3s ease-in-out;
      }
      .goods-type-card:hover {
        width: 300px !important;
        z-index: 2;
      }
      .goods-type-card.active {
        width: 400px !important;
        box-shadow: 0 8px 32px #4fc3f7aa;
      }
      .goods-type-card.active img {
        filter: none;
      }
      .goods-type-card.dimmed img {
        filter: grayscale(0.7) brightness(0.8);
      }
      .goods-type-card:not(.active):hover img {
        filter: grayscale(0.3) brightness(0.95);
      }
      .goods-type-card:first-child {border-top-left-radius:38px;border-bottom-left-radius:38px;}
      .goods-type-card:last-child {border-top-right-radius:38px;border-bottom-right-radius:38px;}
      .goods-type-desc h4 {color:#4fc3f7;letter-spacing:1px;}
      .goods-type-card-num {font-size:1.05em !important;}
      
      /* SITC Icons Row in intro page */
      #goods-type-intro .sitc-icons-row {
        display: flex;
        justify-content: center;
        gap: 20px;
        flex-wrap: wrap;
        margin: 2rem auto;
        max-width: 900px;
      }
      
      #goods-type-intro .sitc-icon-btn {
        background-color: transparent;
        border: none;
        transition: all 0.5s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        padding: 0;
        outline: none;
        position: relative;
        animation: float 2.5s ease-in-out infinite;
      }
      
      /* Create floating animation with random delay for each icon */
      #goods-type-intro .sitc-icon-btn:nth-child(1) { animation-delay: 0s; }
      #goods-type-intro .sitc-icon-btn:nth-child(2) { animation-delay: 0.28s; }
      #goods-type-intro .sitc-icon-btn:nth-child(3) { animation-delay: 0.56s; }
      #goods-type-intro .sitc-icon-btn:nth-child(4) { animation-delay: 0.84s; }
      #goods-type-intro .sitc-icon-btn:nth-child(5) { animation-delay: 1.12s; }
      #goods-type-intro .sitc-icon-btn:nth-child(6) { animation-delay: 1.4s; }
      #goods-type-intro .sitc-icon-btn:nth-child(7) { animation-delay: 1.68s; }
      #goods-type-intro .sitc-icon-btn:nth-child(8) { animation-delay: 1.96s; }
      #goods-type-intro .sitc-icon-btn:nth-child(9) { animation-delay: 2.24s; }
      
      @keyframes float {
        0% {
          transform: translateY(0);
          filter: drop-shadow(0 5px 15px rgba(33, 150, 243, 0.2));
        }
        50% {
          transform: translateY(-6px);
          filter: drop-shadow(0 15px 15px rgba(33, 150, 243, 0.3));
        }
        100% {
          transform: translateY(0);
          filter: drop-shadow(0 5px 15px rgba(33, 150, 243, 0.2));
        }
      }
      
      #goods-type-intro .sitc-icon-btn:hover {
        transform: translateY(-5px) scale(1.15);
        filter: drop-shadow(0 15px 15px rgba(33, 150, 243, 0.5));
        animation-play-state: paused;
      }
      
      #goods-type-intro .sitc-icon-btn:hover::after {
        content: attr(title);
        position: absolute;
        top: -40px;
        left: 50%;
        transform: translateX(-50%);
        background-color: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
        z-index: 100;
      }
      
      #goods-type-intro .sitc-icon-btn img {
        width: 55px;
        height: 55px;
        object-fit: contain;
        transition: all 0.3s ease;
        filter: drop-shadow(0 5px 5px rgba(0, 0, 0, 0.3));
      }
      
      #goods-type-intro .sitc-icon-btn:hover img {
        filter: drop-shadow(0 5px 10px rgba(33, 150, 243, 0.7));
      }
      
      /* Media query for mobile devices */
      @media (max-width: 768px) {
        #goods-type-intro .sitc-icons-row {
          gap: 15px;
        }
        
        #goods-type-intro .sitc-icon-btn img {
          width: 40px;
          height: 40px;
        }
        
        .goods-type-card {width:150px !important;height:70px;}
        .goods-type-card.active {width:260px !important;}
        .goods-type-intro-text h2 {font-size:1.3em;}
        .goods-type-desc {font-size:16px;}
      }
      
      .fadein-block {opacity:0;transform:translateY(40px);transition:opacity 0.6s cubic-bezier(.4,0,.2,1),transform 0.6s cubic-bezier(.4,0,.2,1);}
      .fadein-block.visible {opacity:1;transform:translateY(0);}
    `;
    document.head.appendChild(style);
    const numStyle = document.createElement('style');
    numStyle.textContent = `
      .goods-type-card-num {
        position: absolute;
        left: 10px;
        top: 10px;
        background: rgba(0,0,0,0.38);
        color: #fff;
        font-size: 1.05em;
        font-weight: 400;
        border-radius: 8px;
        padding: 2px 8px;
        z-index: 3;
        pointer-events: none;
        letter-spacing: 1px;
      }
    `;
    document.head.appendChild(numStyle);
    setTimeout(()=>{
      const fadeBlocks = introDiv.querySelectorAll('.fadein-block');
      const stagger = 0.28;
      const fastStagger = 0.18;
      fadeBlocks.forEach((el, i) => {
        if (i === 3 || i === 4) {
          el.style.transitionDelay = (2*stagger + fastStagger) + 's';
        } else {
          el.style.transitionDelay = (i*stagger) + 's';
        }
      });
      // IntersectionObserver
      const observer = new window.IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            obs.unobserve(entry.target);
          }
        });
      }, {threshold: 0.12});
      fadeBlocks.forEach(el => observer.observe(el));
      
      const sitcIcons = introDiv.querySelectorAll('.sitc-icon-btn');
      sitcIcons.forEach(icon => {
        icon.addEventListener('click', function() {
          const sitcIndex = parseInt(this.getAttribute('data-sitc'));
          updateDesc(sitcIndex);
          scrollToCard(sitcIndex);
        });
      });
    }, 100);
  }

  let autoScrollTimer = null;
  let autoScrollPaused = false;
  let autoScrollResumeTimer = null;
  
  function scrollToCard(idx) {
    const carousel = document.querySelector('.goods-type-carousel');
    if (!carousel) return;
    
    const card = carousel.children[idx];
    if (card && card.scrollIntoView) {
      try {
        card.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'});
      } catch(e) {
        card.scrollIntoView();
      }
    }
  }

  function startAutoScroll() {
    const carousel = document.querySelector('.goods-type-carousel');
    if (!carousel) return;
    
    let selected = 0;
    if (autoScrollTimer) clearInterval(autoScrollTimer);
    autoScrollTimer = setInterval(() => {
      if (!autoScrollPaused) {
        selected = (selected + 1) % 10;
        updateDescFromOutside(selected);
        scrollToCard(selected);
      }
    }, 2800);
  }
  
  function updateDescFromOutside(idx) {
    const carousel = document.querySelector('.goods-type-carousel');
    const descDiv = document.querySelector('.goods-type-desc');
    if (!carousel || !descDiv) return;
    
    descDiv.innerHTML = `<h4 style="font-size:1.05em;font-weight:700;margin-bottom:8px;letter-spacing:1px;color:#4fc3f7;">${sitcLabels[idx]}</h4><div style="font-size:1.05em;font-weight:400;color:#fff;">${sitcDescriptions[idx]}</div>`;
    Array.from(carousel.children).forEach((el, i) => {
      if (i === idx) {
        el.classList.add('active');
        el.classList.remove('dimmed');
        el.style.width = '400px';
        el.style.zIndex = 2;
        el.querySelector('img').style.filter = 'none';
        el.style.boxShadow = '0 8px 32px #4fc3f7aa';
      } else {
        el.classList.remove('active');
        el.classList.add('dimmed');
        el.style.width = '130px';
        el.style.zIndex = 1;
        el.querySelector('img').style.filter = 'grayscale(0.7) brightness(0.8)';
        el.style.boxShadow = 'none';
      }
    });
  }
  
  function pauseAutoScroll(tempPause = true) {
    autoScrollPaused = true;
    if (autoScrollResumeTimer) clearTimeout(autoScrollResumeTimer);
    if (tempPause) {
      autoScrollResumeTimer = setTimeout(() => {
        autoScrollPaused = false;
      }, 10000);
    }
  }

  function stopAutoScroll() {
    if (autoScrollTimer) clearInterval(autoScrollTimer);
    autoScrollTimer = null;
    autoScrollPaused = true;
  }

  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
      const carousel = document.querySelector('.goods-type-carousel');
      if (carousel) {
        carousel.addEventListener('mouseenter', () => pauseAutoScroll());
        carousel.addEventListener('mouseleave', () => pauseAutoScroll(false));
        Array.from(carousel.children).forEach((card, idx) => {
          card.addEventListener('mouseenter', () => { pauseAutoScroll(); });
          card.addEventListener('click', () => { 
            pauseAutoScroll(); 
            scrollToCard(idx); 
          });
        });
        
        startAutoScroll();
      }
    }, 1000);
  });

  function triggerSITCIconsAnimation() {
    const introIcons = document.querySelectorAll('#goods-type-intro .sitc-icon-btn');
    if (!introIcons || introIcons.length === 0) return;
    
    /*
    const phaseIndicator = document.createElement('div');
    phaseIndicator.className = 'animation-phase-indicator';
    phaseIndicator.textContent = 'Moving icons to summary';
    phaseIndicator.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(33, 150, 243, 0.4); 
      color: #ffffff;
      padding: 15px 25px; 
      border-radius: 20px;
      font-size: 16px;
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.5s ease;
      pointer-events: none;
      text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    `;
    document.body.appendChild(phaseIndicator);
    
    
    setTimeout(() => {
      phaseIndicator.style.opacity = '1';
      
      
      setTimeout(() => {
        phaseIndicator.style.opacity = '0';
        setTimeout(() => phaseIndicator.remove(), 500);
      }, 1500);
    }, 10);
    */
    
    const flyingIconsContainer = document.createElement('div');
    flyingIconsContainer.className = 'flying-sitc-icons-container';
    flyingIconsContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
    `;
    document.body.appendChild(flyingIconsContainer);
    
    window.sitcIconsMovedToSummary = false;
    
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    const summaryLegendIcons = document.querySelectorAll('.goods-summary-legend-item');
    
    if (!summaryLegendIcons || summaryLegendIcons.length === 0) {
      console.warn('Summary legend items not found, using default animation');
      performDefaultAnimation();
      return;
    }
    
    const flyingIcons = [];
    const iconTargets = [];
    
    const updateIconPositions = () => {
      flyingIcons.forEach((icon, idx) => {
        if (icon.style.opacity !== '0') {
          const target = iconTargets[idx];
          if (target && target.summaryTarget) {
            const summaryTarget = target.summaryTarget;
            const summaryIconContainer = summaryTarget.querySelector('.summary-sitc-icon-container');
            const summaryIcon = summaryTarget.querySelector('.summary-sitc-icon');
            
            let updatedRect;
            if (summaryIcon) {
              updatedRect = summaryIcon.getBoundingClientRect();
            } else if (summaryIconContainer) {
              updatedRect = summaryIconContainer.getBoundingClientRect();
            } else {
              updatedRect = summaryTarget.getBoundingClientRect();
            }
            
            if (icon.classList.contains('near-target')) {
              const iconSize = Math.min(updatedRect.width, updatedRect.height);
              icon.style.top = `${updatedRect.top + (updatedRect.height - iconSize) / 2}px`;
              icon.style.left = `${updatedRect.left + (updatedRect.width - iconSize) / 2}px`;
            }
          }
        }
      });
    };
    
    window.addEventListener('scroll', debounce(updateIconPositions, 10), { passive: true });
    
    introIcons.forEach((icon, index) => {
      if (index >= 9) return;
      
      const iconRect = icon.getBoundingClientRect();
      const img = icon.querySelector('img');
      if (!img) return;
      
      const flyingIcon = document.createElement('div');
      flyingIcon.className = 'flying-sitc-icon';
      flyingIcon.setAttribute('data-sitc-index', index);
      flyingIcon.innerHTML = `<img src="${img.src}" alt="${img.alt}">`;
      flyingIcon.style.cssText = `
        position: absolute;
        top: ${iconRect.top}px;
        left: ${iconRect.left}px;
        width: ${iconRect.width}px;
        height: ${iconRect.height}px;
        z-index: 10000;
        pointer-events: none;
        transition: all 0s;
        opacity: 0;
        filter: drop-shadow(0 0 5px rgba(33, 150, 243, 0.3));
      `;
      flyingIconsContainer.appendChild(flyingIcon);
      flyingIcons.push(flyingIcon);
      
      const summaryTarget = summaryLegendIcons[index];
      iconTargets.push({ 
        summaryTarget,
        originalIconRect: iconRect 
      });
      
      const startDelay = index * 100;
      
      setTimeout(() => {
        flyingIcon.style.opacity = '1';
        
        if (!summaryTarget) return;
        
        const summaryIconContainer = summaryTarget.querySelector('.summary-sitc-icon-container');
        const summaryIcon = summaryTarget.querySelector('.summary-sitc-icon');
        let targetRect;
        if (summaryIcon) {
          targetRect = summaryIcon.getBoundingClientRect();
        } else if (summaryIconContainer) {
          targetRect = summaryIconContainer.getBoundingClientRect();
        } else {
          targetRect = summaryTarget.getBoundingClientRect();
        }
        
        const midPoint1X = iconRect.left + (targetRect.left - iconRect.left) * 0.4;
        const midPoint1Y = iconRect.top + (targetRect.top - iconRect.top) * 0.4;
        
        const midPoint2X = iconRect.left + (targetRect.left - iconRect.left) * 0.7;
        const midPoint2Y = iconRect.top + (targetRect.top - iconRect.top) * 0.7;
        
        const scale = 0.8 + Math.random() * 0.15;
        
        setTimeout(() => {
          flyingIcon.style.transition = `all 0.7s cubic-bezier(0.2, 0.1, 0.2, 0.3)`;
          flyingIcon.style.top = `${midPoint1Y}px`;
          flyingIcon.style.left = `${midPoint1X}px`;
          flyingIcon.style.transform = `scale(${scale}) rotate(${Math.random() * 4 - 2}deg)`;
          
          setTimeout(() => {
            flyingIcon.style.transition = `all 0.7s cubic-bezier(0.4, 0.1, 0.4, 0.5)`;
            flyingIcon.style.top = `${midPoint2Y}px`;
            flyingIcon.style.left = `${midPoint2X}px`;
            flyingIcon.style.transform = `scale(${scale}) rotate(${Math.random() * 2 - 1}deg)`;
            
            setTimeout(() => {
              flyingIcon.classList.add('near-target');
              
              flyingIcon.style.transition = `all 0.7s cubic-bezier(0.2, 0.8, 0.2, 0.5)`;
              const updatedRect = summaryIcon ? 
                summaryIcon.getBoundingClientRect() : 
                (summaryIconContainer ? 
                  summaryIconContainer.getBoundingClientRect() : 
                  summaryTarget.getBoundingClientRect());
              
              const iconSize = Math.min(updatedRect.width, updatedRect.height);
              flyingIcon.style.width = `${iconSize}px`;
              flyingIcon.style.height = `${iconSize}px`;
              
              flyingIcon.style.top = `${updatedRect.top + (updatedRect.height - iconSize) / 2}px`;
              flyingIcon.style.left = `${updatedRect.left + (updatedRect.width - iconSize) / 2}px`;
              flyingIcon.style.transform = 'scale(1) rotate(0deg)';
              
              setTimeout(() => {
                const summaryIcon = summaryTarget.querySelector('.summary-sitc-icon');
                if (summaryIcon) {
                  summaryIcon.style.filter = 'drop-shadow(0 0 8px rgba(33, 150, 243, 0.7))';
                  summaryIcon.style.transform = 'scale(1.08)';
                  summaryIcon.style.transition = 'all 0.4s ease-out';
                  
                  setTimeout(() => {
                    summaryIcon.style.filter = '';
                    summaryIcon.style.transform = '';
                  }, 800);
                }
                
                flyingIcon.style.opacity = '0';
                
                if (index === 8) {
                  setTimeout(() => {
                    console.log('First phase animation completed, icons moved to summary');
                    window.sitcIconsMovedToSummary = true;
                    
                    window.removeEventListener('scroll', updateIconPositions);
                    
                    flyingIcons.length = 0;
                    iconTargets.length = 0;
                    
                    setTimeout(() => {
                      if (flyingIconsContainer && flyingIconsContainer.parentNode) {
                        flyingIconsContainer.parentNode.removeChild(flyingIconsContainer);
                      }
                    }, 1000);
                  }, 500);
                }
              }, 1000);
            }, 700);
          }, 700);
        }, 200);
      }, startDelay);
    });
    
    
    function performDefaultAnimation() {
      const mapArea = document.getElementById('goods-type-detail-container');
      const mapAreaRect = mapArea ? mapArea.getBoundingClientRect() : { top: windowHeight * 0.7, left: 0, right: windowWidth };
      
      const pathPoints = [];
      
      pathPoints.push({ x: windowWidth * 0.2, y: windowHeight * 0.1 + Math.random() * 50 });
      pathPoints.push({ x: windowWidth * 0.5, y: windowHeight * 0.13 + Math.random() * 50 });
      pathPoints.push({ x: windowWidth * 0.8, y: windowHeight * 0.15 + Math.random() * 50 });
      
      pathPoints.push({ x: windowWidth * 0.3, y: windowHeight * 0.3 + Math.random() * 50 });
      pathPoints.push({ x: windowWidth * 0.6, y: windowHeight * 0.33 + Math.random() * 50 });
      pathPoints.push({ x: windowWidth * 0.9, y: windowHeight * 0.35 + Math.random() * 50 });
      
      pathPoints.push({ x: windowWidth * 0.2, y: mapAreaRect.top - 100 + Math.random() * 50 });
      pathPoints.push({ x: windowWidth * 0.5, y: mapAreaRect.top - 80 + Math.random() * 50 });
      pathPoints.push({ x: windowWidth * 0.8, y: mapAreaRect.top - 60 + Math.random() * 50 });
      
      pathPoints.push({ x: windowWidth * 0.3, y: mapAreaRect.top + 50 + Math.random() * 50 });
      pathPoints.push({ x: windowWidth * 0.6, y: mapAreaRect.top + 70 + Math.random() * 50 });
      pathPoints.push({ x: windowWidth * 0.2, y: mapAreaRect.top + 100 + Math.random() * 50 });
      
      introIcons.forEach((icon, index) => {
        if (index >= 9) return;
        
        const iconRect = icon.getBoundingClientRect();
        const img = icon.querySelector('img');
        if (!img) return;
        
        const flyingIcon = document.createElement('div');
        flyingIcon.className = 'flying-sitc-icon';
        flyingIcon.innerHTML = `<img src="${img.src}" alt="${img.alt}">`;
        flyingIcon.style.cssText = `
          position: absolute;
          top: ${iconRect.top}px;
          left: ${iconRect.left}px;
          width: ${iconRect.width}px;
          height: ${iconRect.height}px;
          z-index: 10000;
          pointer-events: none;
          transition: all 0s;
          opacity: 0;
          filter: drop-shadow(0 0 5px rgba(33, 150, 243, 0.3));
        `;
        flyingIconsContainer.appendChild(flyingIcon);
        
        const baseDelay = index * 180;
        const randomDelay = Math.random() * 200;
        const startDelay = baseDelay + randomDelay;
        
        setTimeout(() => {
          flyingIcon.style.opacity = '1';
          
          const firstSegmentIdx = Math.floor(Math.random() * 3); // 0-2
          const secondSegmentIdx = 3 + Math.floor(Math.random() * 3); // 3-5
          const thirdSegmentIdx = 6 + Math.floor(Math.random() * 6); // 6-11
          
          const pathIndexes = [firstSegmentIdx, secondSegmentIdx, thirdSegmentIdx];
          
          const totalAnimationTime = 2500 + Math.random() * 800;
          const segmentTime = totalAnimationTime / 3;
          
          setTimeout(() => {
            const pathPoint = pathPoints[pathIndexes[0]];
            const offsetX = (Math.random() - 0.5) * 100;
            const offsetY = (Math.random() - 0.5) * 40;
            
            const scale = 0.6 + Math.random() * 0.2;
            
            flyingIcon.style.transition = `all ${segmentTime/1000}s cubic-bezier(0.25, 0.1, 0.25, 1)`;
            flyingIcon.style.top = `${pathPoint.y + offsetY}px`;
            flyingIcon.style.left = `${pathPoint.x + offsetX}px`;
            flyingIcon.style.transform = `scale(${scale}) rotate(${Math.random() * 20 - 10}deg)`;
            
            setTimeout(() => {
              const nextPoint = pathPoints[pathIndexes[1]];
              const nextOffsetX = (Math.random() - 0.5) * 80;
              const nextOffsetY = (Math.random() - 0.5) * 30;
              
              flyingIcon.style.transition = `all ${segmentTime/1000}s cubic-bezier(0.4, 0.1, 0.4, 1)`;
              flyingIcon.style.top = `${nextPoint.y + nextOffsetY}px`;
              flyingIcon.style.left = `${nextPoint.x + nextOffsetX}px`;
              
              setTimeout(() => {
                const lastPoint = pathPoints[pathIndexes[2]];
                const lastOffsetX = (Math.random() - 0.5) * 50;
                const lastOffsetY = (Math.random() - 0.5) * 20;
                
                flyingIcon.style.transition = `all ${segmentTime/1000}s cubic-bezier(0.4, 0.2, 0.4, 1)`;
                flyingIcon.style.top = `${lastPoint.y + lastOffsetY}px`;
                flyingIcon.style.left = `${lastPoint.x + lastOffsetX}px`;
                
                setTimeout(() => {
                  const targetIconSelector = `.goods-type-icon-btn[data-type="${index}"]`;
                  const targetIcons = document.querySelectorAll(targetIconSelector);
                  
                  let targetIcon = null;
                  for (let i = 0; i < targetIcons.length; i++) {
                    const rect = targetIcons[i].getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0 && !targetIcons[i].closest('#goods-type-intro')) {
                      targetIcon = targetIcons[i];
                      break;
                    }
                  }
                  
                  if (targetIcon) {
                    const targetRect = targetIcon.getBoundingClientRect();
                    
                    flyingIcon.style.transition = 'all 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)';
                    flyingIcon.style.top = `${targetRect.top}px`;
                    flyingIcon.style.left = `${targetRect.left}px`;
                    flyingIcon.style.width = `${targetRect.width}px`;
                    flyingIcon.style.height = `${targetRect.height}px`;
                    flyingIcon.style.transform = 'scale(1) rotate(0deg)';
                    
                    setTimeout(() => {
                      const glowEffect = document.createElement('div');
                      glowEffect.className = 'sitc-icon-glow-effect';
                      glowEffect.style.cssText = `
                        position: absolute;
                        top: ${targetRect.top - 3}px;
                        left: ${targetRect.left - 3}px;
                        width: ${targetRect.width + 6}px;
                        height: ${targetRect.height + 6}px;
                        border-radius: 8px;
                        background: radial-gradient(circle, rgba(33, 150, 243, 0.6) 0%, rgba(33, 150, 243, 0) 70%);
                        z-index: 9990;
                        pointer-events: none;
                        opacity: 0;
                        transform: scale(0.5);
                        transition: all 0.3s ease-out;
                      `;
                      document.body.appendChild(glowEffect);
                      
                      setTimeout(() => {
                        glowEffect.style.opacity = '1';
                        glowEffect.style.transform = 'scale(1.3)';
                        
                        setTimeout(() => {
                          glowEffect.style.opacity = '0';
                          setTimeout(() => glowEffect.remove(), 300);
                        }, 300);
                      }, 50);
                      
                      targetIcon.style.animation = 'sitcIconPulse 0.6s ease-in-out';
                      
                      setTimeout(() => {
                        flyingIcon.style.opacity = '0';
                        setTimeout(() => {
                          flyingIcon.remove();
                          if (flyingIconsContainer.children.length === 0) {
                            flyingIconsContainer.remove();
                          }
                        }, 200);
                      }, 600);
                    }, 800);
                  } else {
                    flyingIcon.style.opacity = '0';
                    setTimeout(() => flyingIcon.remove(), 500);
                  }
                }, segmentTime);
              }, segmentTime);
            }, segmentTime);
          }, 100);
        }, startDelay);
      });
    }
    
    const style = document.createElement('style');
    style.textContent = `
      .flying-sitc-icon img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        transform-origin: center center;
      }
      
      @keyframes sitcIconPulse {
        0% { transform: scale(1); filter: brightness(1); }
        50% { transform: scale(1.15); filter: brightness(1.3); }
        100% { transform: scale(1); filter: brightness(1); }
      }
    `;
    document.head.appendChild(style);
  }
  
  function createSitcIconBar() {
    if (document.querySelector('.goods-type-icons-row')) return;
    
    const iconBar = document.createElement('div');
    iconBar.className = 'goods-type-icons-row';
    iconBar.style.cssText = `
      position: absolute;
      left: -88px; 
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 1000;
      background: none;
      pointer-events: auto;
    `;
    
    const iconFiles = [
      '0-Food-and-live-animals.png',
      '1-Beverages-and-tobacco.png',
      '2-Crude-materials.png',
      '3-Mineral-fuels-lubricants-and-related-materials.png',
      '4-Animal-and-vegetable-oils-fats-and-waxes.png',
      '5-Chemicals-and-related-products.png',
      '6-Manufactured-goods-classified-chiefly-by-material.png',
      '7-Machinery-and-transport-equipment.png',
      '8-Miscellaneous-manufactured-articles.png'
    ];
    
    for (let i = 0; i < 9; i++) {
      const iconBtn = document.createElement('button');
      iconBtn.className = 'goods-type-icon-btn';
      iconBtn.setAttribute('data-type', i);
      iconBtn.setAttribute('data-selected', i === state.currentType ? 'true' : 'false');
      iconBtn.setAttribute('title', sitcLabels[i]);
      iconBtn.innerHTML = `<img src="https://raw.githubusercontent.com/Cihshee/CASA0003_minnni_project/main/public/goods-icons/${iconFiles[i]}" alt="${sitcLabels[i]}">`;
      
      iconBtn.style.cssText = `
        width: 42px;
        height: 42px;
        border-radius: 8px;
        padding: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        background-color: ${i === state.currentType ? 'rgb(33, 150, 243)' : '#1e2832'};
        border: 2px solid ${i === state.currentType ? 'rgb(33, 150, 243)' : 'rgba(255, 255, 255, 0.2)'};
        transition: all 0.3s ease;
        opacity: 0;
        transform: translateX(-20px);
      `;
      
      const typeIndex = i;
      iconBtn.addEventListener('click', async () => {
        if (state.currentType === typeIndex) return;
        
        const oldType = state.currentType;
        state.currentType = typeIndex;
        
        document.querySelectorAll('.goods-type-icon-btn').forEach(icon => {
          const iconTypeIndex = parseInt(icon.getAttribute('data-type'));
          const isSelected = iconTypeIndex === typeIndex;
          icon.setAttribute('data-selected', isSelected ? 'true' : 'false');
          icon.style.backgroundColor = isSelected ? 'rgb(33, 150, 243)' : '#1e2832';
          icon.style.borderColor = isSelected ? 'rgb(33, 150, 243)' : 'rgba(255, 255, 255, 0.2)';
          
          if (isSelected) {
            icon.style.animation = 'sitcIconSelect 0.5s cubic-bezier(0.18, 0.89, 0.32, 1.28)';
            setTimeout(() => {
              icon.style.animation = '';
            }, 500);
          }
        });
        
        try {
          const descElement = document.getElementById('goods-type-detail-desc');
          if (descElement) {
            descElement.textContent = sitcDescriptions[typeIndex];
            descElement.style.animation = 'fadeInDescription 0.5s ease-out';
            setTimeout(() => {
              descElement.style.animation = '';
            }, 500);
          }
          
          const wasPlaying = animationState.isPlaying;
          if (wasPlaying) {
            stopTimelineAnimation();
          }
          
          const sitcData = await loadSitcData(typeIndex);
          if (!sitcData) throw new Error(`Failed to load SITC ${typeIndex} data`);
          
          state.currentSitcData = sitcData;
          
          await Promise.all([
            updateMapData(sitcData),
            updateCountriesChart(sitcData)
          ]);
          
          if (state.selectedCountry) {
            const canvas = document.getElementById('country-trend-chart');
            if (canvas) {
              canvas.style.display = 'block';
              updateTrendChart(sitcData);
            }
          }
          
          if (wasPlaying) {
            setTimeout(() => {
              startTimelineAnimation();
            }, 500);
          }
          
          preloadNextSitcData();
          
        } catch (error) {
          console.error('Failed to update visualizations:', error);
          state.currentType = oldType;
          document.querySelectorAll('.goods-type-icon-btn').forEach(icon => {
            const iconTypeIndex = parseInt(icon.getAttribute('data-type'));
            const isSelected = iconTypeIndex === oldType;
            icon.setAttribute('data-selected', isSelected ? 'true' : 'false');
            icon.style.backgroundColor = isSelected ? 'rgb(33, 150, 243)' : '#1e2832';
            icon.style.borderColor = isSelected ? 'rgb(33, 150, 243)' : 'rgba(255, 255, 255, 0.2)';
          });
        }
      });
      
      iconBar.appendChild(iconBtn);
      
      setTimeout(() => {
        iconBtn.style.opacity = '1';
        iconBtn.style.transform = 'translateX(0)';
      }, i * 100);
    }
    
    const mapContainer = document.getElementById('goods-map');
    if (mapContainer && mapContainer.parentNode) {
      mapContainer.parentNode.appendChild(iconBar);
    }
    
    const animStyle = document.createElement('style');
    animStyle.textContent = `
      @keyframes sitcIconSelect {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
      }
      
      @keyframes fadeInDescription {
        0% { opacity: 0.5; transform: translateY(10px); }
        100% { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(animStyle);
  }

  function addRotationControl(map) {
    if (document.getElementById('rotation-control-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'rotation-control-btn';
    btn.innerHTML = '<svg width="22" height="22" viewBox="0 0 22 22" style="vertical-align:middle;"><path d="M11 2a9 9 0 1 1-6.36 2.64" stroke="#fff" stroke-width="2" fill="none"/><polygon points="2,2 8,2 5,6" fill="#4fc3f7"/></svg>';
    btn.title = 'Toggle globe rotation';
    btn.style.cssText = `
      position: absolute; left: 20px; top: 20px; z-index: 1001;
      background: rgba(30,30,30,0.85); color: #fff; border: none; border-radius: 50%;
      width: 44px; height: 44px; font-size: 22px; cursor: pointer; box-shadow: 0 2px 8px #0005;
      display: flex; align-items: center; justify-content: center; transition: background 0.2s; outline: none;
    `;
    let rotating = false;
    let rotationId = null;
    btn.onclick = function() {
      rotating = !rotating;
      if (rotating) {
        btn.style.background = 'rgba(33,150,243,0.92)';
        let last = performance.now();
        function rotate() {
          if (!rotating) return;
          const now = performance.now();
          const delta = (now - last) / 1000;
          last = now;
          const bearing = (map.getBearing() + delta * 8) % 360;
          map.setBearing(bearing);
          rotationId = requestAnimationFrame(rotate);
        }
        rotate();
      } else {
        btn.style.background = 'rgba(30,30,30,0.85)';
        if (rotationId) cancelAnimationFrame(rotationId);
      }
    };
    btn.onmouseenter = () => { if (!rotating) btn.style.background = 'rgba(33,150,243,0.5)'; };
    btn.onmouseleave = () => { if (!rotating) btn.style.background = 'rgba(30,30,30,0.85)'; };
    map.getContainer().appendChild(btn);
  }
  addRotationControl(state.currentMap);
})();