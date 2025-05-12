// import Chart from 'chart.js/auto';

console.log('GoodsType.js loaded');

(function() {
  const csvPath = 'public/data/Goodstype_full_summary_data_merged.csv';
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
  const sitcDescriptions = [
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

  // 添加数据缓存
  const dataCache = new Map();

  // 添加防抖函数
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

  // 健壮CSV解析
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

  // 修改数值格式化函数，添加轴标签格式化函数
  function formatToMillions(value, forAxis = false) {
    if (forAxis) {
      // 轴标签不显示小数点
      return `${Math.round(value / 1000000)}M`;
    }
    // 具体数值和提示框显示一位小数
    return `${(value / 1000000).toFixed(1)}M`;
  }

  function drawChart(ctx, dataRows, flowtype, onAnimEnd) {
    // 插值函数：在两个点之间生成平滑的中间点
    function interpolatePoints(data) {
      const interpolatedData = [];
      const interpolationPoints = 30; // 每两个真实数据点之间插入的点数
      
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

    // 生成插值后的年份标签
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
          // 只在原始数据点显示点
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

    const totalDuration = 5000; // 动画持续时间改为5秒
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
        layout: { padding: { right: 100 } }, // 右侧留白更大，防止value被遮挡
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
        // 只保留yearLabelGradient插件
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
              // 画虚线，顶部超出10px，底部超出20px
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
              // 画渐变色年份数字
              const y = xAxis.bottom + 28;
              // 先用白色覆盖原有数字
              ctx.save();
              ctx.font = 'bold 22px Orbitron, Montserrat, Arial, sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.globalCompositeOperation = 'source-over';
              ctx.fillStyle = '#181c23'; // 背景色覆盖
              ctx.fillRect(x-20, y-16, 40, 32);
              ctx.restore();
              // 渐变色
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

            // --- 动画亮点与value ---
            // 动画进度
            const anim = chart._animations && Object.values(chart._animations)[0];
            let animProgress = 1;
            if (anim && anim._duration > 0) {
              animProgress = Math.min(1, anim._elapsed / anim._duration);
            }
            // 计算当前动画到第几个插值点（用插值算法，不依赖meta.data）
            const metaArr = chart.getSortedVisibleDatasetMetas();
            metaArr.forEach((meta, dIdx) => {
              if (!meta || !meta._dataset || !meta._dataset.data || !meta._dataset.data.length) return;
              const dataArr = meta._dataset.data;
              const totalPoints = dataArr.length;
              // 动画进度下的当前点（小数）
              let floatIndex = animProgress * (totalPoints - 1);
              if (floatIndex < 0) floatIndex = 0;
              if (floatIndex > totalPoints - 1) floatIndex = totalPoints - 1;
              const leftIdx = Math.floor(floatIndex);
              const rightIdx = Math.min(leftIdx + 1, totalPoints - 1);
              const frac = floatIndex - leftIdx;
              // x坐标插值（像素级）
              const x0 = xAxis.getPixelForValue(leftIdx);
              const x1 = xAxis.getPixelForValue(rightIdx);
              const px = x0 + (x1 - x0) * frac;
              // y插值
              const v0 = dataArr[leftIdx];
              const v1 = dataArr[rightIdx];
              const value = v0 + (v1 - v0) * frac;
              const py = yAxis.getPixelForValue(value);
              // 画亮点
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
              // 画value文本
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

    // 动画结束后回调
    if (onAnimEnd) {
      setTimeout(onAnimEnd, 3000);
    }
    return chart;
  }

  // Legend items and colors (should match chart datasets)
  const legendItems = [
    { label: '0 Food & live animals', color: '#d9534f' },
    { label: '1 Beverages & tobacco', color: '#f0ad4e' },
    { label: '2 Crude materials, inedible, except fuels', color: '#bada55' },
    { label: '3 Mineral fuels, lubricants & related materials', color: '#5cb85c' },
    { label: '4 Animal & vegetable oils, fats & waxes', color: '#5bc0de' },
    { label: '5 Chemicals & related products, nes', color: '#428bca' },
    { label: '6 Manufactured goods classified chiefly by material', color: '#6f42c1' },
    { label: '7 Machinery & transport equipment', color: '#ab47bc' },
    { label: '8 Miscellaneous manufactured articles', color: '#ffd600' },
    { label: "9 Commodities/transactions not class'd elsewhere in SITC", color: '#b0b0b0' }
  ];
  function renderLegend() {
    const legend = document.getElementById('goods-summary-legend');
    legend.innerHTML = legendItems.map((item, idx) =>
      idx === 9
        ? `<span class="goods-summary-legend-item">
             <svg width="28" height="10" style="vertical-align:middle;margin-right:7px;">
               <line x1="2" y1="5" x2="26" y2="5" stroke="${item.color}" stroke-width="4" stroke-dasharray="5,6"/>
             </svg>${item.label}
           </span>`
        : `<span class="goods-summary-legend-item"><span class="goods-summary-legend-color" style="background:${item.color}"></span>${item.label}</span>`
    ).join('');
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

  // 修改summary区渲染（四张图表）
  function renderSummaryCharts(data) {
    const chartContainer = document.getElementById('goods-summary-charts');
    if (!chartContainer) return;
    chartContainer.innerHTML = '';

    // 外层整体居中wrap
    const centerWrap = document.createElement('div');
    centerWrap.className = 'summary-center-wrap';
    centerWrap.style.display = 'flex';
    centerWrap.style.flexDirection = 'column';
    centerWrap.style.alignItems = 'center';
    centerWrap.style.justifyContent = 'center';
    chartContainer.appendChild(centerWrap);

    // D3主图参数
    const width = 900;
    const height = 420;
    const margin = { top: 40, right: 220, bottom: 70, left: 80 };
    const svgW = width + margin.left + margin.right;
    const svgH = height + margin.top + margin.bottom;

    // 主图+右侧描述栏flex
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

    // SVG主图区域
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

    // 右侧描述栏
    const descDiv = document.createElement('div');
    descDiv.className = 'summary-desc-area';
    descDiv.style.display = 'none'; // 不再显示右侧描述栏
    flexWrap.appendChild(descDiv);

    // 按钮区域（主图下方，整体居中）
    const btnsDiv = document.createElement('div');
    btnsDiv.className = 'summary-explore-btns';
    btnsDiv.style.display = 'flex';
    btnsDiv.style.flexDirection = 'column';
    btnsDiv.style.alignItems = 'center';
    btnsDiv.style.marginTop = '32px';
    btnsDiv.style.opacity = '0';
    btnsDiv.style.transform = 'translateY(30px)';
    btnsDiv.innerHTML = `
      <div class="summary-btn-row" style="display:flex; gap:16px; margin-bottom:8px;">
        <button class="summary-explore-btn" data-flow="EU - Exports" data-idx="0">UK Export <span class="arrow">⟶</span><br>EU</button>
        <button class="summary-explore-btn" data-flow="EU - Imports" data-idx="1">UK Import <span class="arrow">⟵</span><br>EU</button>
        <button class="summary-explore-btn" data-flow="Non EU - Exports" data-idx="2">UK Export <span class="arrow">⟶</span><br>Non-EU</button>
        <button class="summary-explore-btn" data-flow="Non EU - Imports" data-idx="3">UK Import <span class="arrow">⟵</span><br>Non-EU</button>
      </div>
    `;
    centerWrap.appendChild(btnsDiv);

    // D3主图SVG
    const svg = d3.select(svgDiv)
      .append('svg')
      .attr('width', svgW)
      .attr('height', svgH)
      .attr('class', 'd3-summary-svg')
      .style('display', 'block');

    // 鼠标高亮点元素
    let hoverDot = d3.select(svgDiv).select('.d3-hover-dot');
    if (hoverDot.empty()) {
      hoverDot = svg.append('circle')
        .attr('class', 'd3-hover-dot')
        .attr('r', 0)
        .style('pointer-events', 'none');
    }
    // 添加自定义tooltip元素
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

    // 年份、flowType、配色等参数
    const years = Array.from({length: 2024-2016+1}, (_,i)=>2016+i);
    const flowTypes = [
      'EU - Exports',
      'EU - Imports',
      'Non EU - Exports',
      'Non EU - Imports'
    ];
    let currentFlow = flowTypes[0];
    let animDuration = 5000;

    // 颜色方案
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

      const totalFrames = 1100;
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
                .attr('height', 70)
                .style('opacity', annOpacity)
                .style('transform', `scale(${annScale})`)
                .style('transition', 'opacity 0.7s, transform 0.7s')
                .html(`<div style=\"background:rgba(30,30,30,0.92);color:#fff;padding:14px 20px 10px 20px;border-radius:12px;font-size:15px;font-family:Montserrat,Arial,sans-serif;box-shadow:0 2px 12px #0006;line-height:1.6;max-width:320px;word-break:break-word;\"><b>2021:</b> Continued supply chain challenges affecting imports.</div>`);
            }
          }
          // 'Non EU - Exports'/2022/09  
          if (currentFlow === 'Non EU - Exports' && idx === 9) {
            const year2022Idx = years.indexOf(2022);
            const frame2022 = Math.round((year2022Idx / (years.length - 1)) * totalFrames);
            if (frame >= frame2022) {
              const pt2022 = line.values[year2022Idx];
              const cx = x(pt2022.year);
              const cy = y(pt2022.value);
              
              const uniqueId = 'export-2022-highlight';
              
              svg.selectAll(`.${uniqueId}`).remove();
              
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
                .attr('y', cy - 48)
                .attr('width', 340)
                .attr('height', 70)
                .style('opacity', annOpacity)
                .style('transform', `scale(${annScale})`)
                .style('transition', 'opacity 0.7s, transform 0.7s')
                .html(`<div style=\"background:rgba(30,30,30,0.92);color:#fff;padding:14px 20px 10px 20px;border-radius:12px;font-size:15px;font-family:Montserrat,Arial,sans-serif;box-shadow:0 2px 12px #0006;line-height:1.6;max-width:320px;word-break:break-word;\"><b>2022:</b> Geopolitical tensions and inflation reshape global trade dynamics.</div>`);
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
          // 'Non EU - Imports'/2020/09  
          if (currentFlow === 'Non EU - Imports' && idx === 9) {
            const year2020Idx = years.indexOf(2020);
            const frame2020 = Math.round((year2020Idx / (years.length - 1)) * totalFrames);
            if (frame >= frame2020) {
              const pt2020 = line.values[year2020Idx];
              const cx = x(pt2020.year);
              const cy = y(pt2020.value);
              
              // Unique identifier to prevent duplicate rendering
              const uniqueId = 'import-2020-highlight';
              
              // Remove any existing elements with this unique ID
              svg.selectAll(`.${uniqueId}`).remove();
              
              // Highlight circle
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
              
              // 2020 annotation fade/scale
              const annProgress = Math.max(0, Math.min(1, (frame - frame2020) / 60));
              const annOpacity = annProgress;
              const annScale = 0.92 + 0.08 * annProgress;
              
              svg.append('foreignObject')
                .attr('class', `d3-annotation-2020 ${uniqueId}`)
                .attr('x', cx + 20)
                .attr('y', cy - 48)
                .attr('width', 340)
                .attr('height', 70)
                .style('opacity', annOpacity)
                .style('transform', `scale(${annScale})`)
                .style('transition', 'opacity 0.7s, transform 0.7s')
                .html(`<div style=\"background:rgba(30,30,30,0.92);color:#fff;padding:14px 20px 10px 20px;border-radius:12px;font-size:15px;font-family:Montserrat,Arial,sans-serif;box-shadow:0 2px 12px #0006;line-height:1.6;max-width:320px;word-break:break-word;\"><b>2020:</b> Pandemic-induced global trade disruption and economic shock.</div>`);
            }
          }    
        });

        if (frame < totalFrames) {
          frame++;
          requestAnimationFrame(animate);
        } else {
          // 动画结束后弹出提示和按钮（只fade in一次，后续切换不再隐藏）
          if (!btnsDiv.classList.contains('shown')) {
            // 1. 先弹出提示
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
            }, 80);
            // 2. 再弹出按钮
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

          // 3. 移除右侧描述栏内容
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

      // 鼠标悬浮交互
      svg.on('mousemove', function(event) {
        const [mx, my] = d3.pointer(event, this);
        const hoverDot = svg.select('.d3-hover-dot');
        // 只在主图区域内响应
        if (mx < margin.left || mx > margin.left + width || my < margin.top || my > margin.top + height) {
          tooltipDiv.style('display', 'none');
          hoverDot.attr('r', 0);
          return;
        }
        // 找到最近的年份
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
        // 找到所有线在该年份的点
        const lineDataAtYear = getLineData(flowType).map((d, idx) => ({
          name: d.name,
          color: d.color,
          value: d.values[nearestYearIdx].value,
          idx
        }));
        // 找到距离鼠标最近的那条线
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
        // tooltip内容
        tooltipDiv.html(
          `<div style=\"font-size:14px;font-weight:700;color:#4fc3f7;margin-bottom:2px;\">${year}</div>`+
          `<div style=\"margin-bottom:2px;\"><span style=\"color:${nearestLine.color};font-weight:700;\">${nearestLine.name}</span></div>`+
          `<div>Value: <span style=\"color:${nearestLine.color};font-weight:700;\">£${formatToMillions(nearestLine.value)}</span></div>`
        );
        // 位置
        const svgRect = svgDiv.getBoundingClientRect();
        tooltipDiv.style('left', (mx + 40) + 'px')
          .style('top', (my - 20) + 'px')
          .style('display', 'block');
        // 在对应线上画一个小点
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

    // 初始渲染
    drawD3Chart(currentFlow);

    // 按钮/flowType切换逻辑
    btnsDiv.querySelectorAll('.summary-explore-btn').forEach((btn, idx) => {
      // 初始高亮第一个
      if (idx === 0) btn.classList.add('active');
      btn.onclick = () => {
        currentFlow = btn.getAttribute('data-flow');
        // 切换按钮高亮
        btnsDiv.querySelectorAll('.summary-explore-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        // 只切换图表，不再隐藏按钮和提示
        descDiv.querySelectorAll('.summary-desc-text').forEach(el => {
          el.style.opacity = '0';
          el.style.transform = 'translateY(30px)';
        });
        setTimeout(() => {
          drawD3Chart(currentFlow);
        }, 300);
      };
    });

    // 只在用户滚动到summary区时才开始动画
    let chartAnimated = false;
    function triggerChartAnimation() {
      if (!chartAnimated) {
        drawD3Chart(currentFlow);
        chartAnimated = true;
      }
    }
    // IntersectionObserver 只触发一次
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

  // 添加动画控制状态
  const animationState = {
    isPlaying: false,
    speed: 1,
    intervalId: null
  };

  // 修改详情区域渲染函数
  function renderDetail() {
    const detailSection = document.getElementById('goods-type-detail-container');
    if (!detailSection) return;
    
    // 添加初始样式
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

    // 创建观察器
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // 显示整个详情区域
          detailSection.style.opacity = '1';
          detailSection.style.transform = 'translateY(0)';
          
          // 初始化地图和图表
          setTimeout(() => {
            createMapboxMapWhenVisible();
            initializeCharts();
          }, 400);  // 等待过渡动画完成后初始化

          observer.disconnect();  // 动画触发后解除观察
        }
      });
    }, { threshold: 0.1 });  // 当10%的内容可见时触发

    observer.observe(detailSection);

    // 绑定控件事件
    bindDetailEvents();
  }

  // 提取事件绑定到单独的函数
  function bindDetailEvents() {
    // 恢复 flow type 按钮事件
    document.querySelectorAll('.flow-type-btn').forEach(btn => {
      btn.onclick = e => {
        document.querySelectorAll('.flow-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.currentFlow = btn.dataset.flow;
        
        // 添加地图动画
        if (state.currentFlow.includes('Non EU')) {
          animateMapTo(state.currentMap, MAP_VIEWS.world);
        } else {
          animateMapTo(state.currentMap, MAP_VIEWS.europe);
        }
        
        updateVisualizations();
      };
    });

    // 恢复时间轴点击事件
    document.querySelectorAll('.year-dot').forEach(dot => {
      dot.onclick = e => {
        const year = +e.currentTarget.dataset.year;
        updateYear(year);
      };
    });

    // 播放按钮事件
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

    // 速度选择事件
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
    const interval = 2000 / animationState.speed; // 基础间隔2秒

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

  // 修改更新年份函数，减少闪烁
  function updateYear(value) {
    state.currentYear = +value;
    
    // 更新UI元素
    requestAnimationFrame(() => {
        document.getElementById('goods-year-label').textContent = value;
        
        // 更新时间轴UI
        document.querySelectorAll('.year-dot').forEach(dot => {
            dot.classList.toggle('active', +dot.dataset.year === state.currentYear);
        });
        document.querySelector('.year-progress').style.width = 
            `${((state.currentYear - 2016) / (2024 - 2016)) * 100}%`;
    });

    // 使用Promise来处理数据更新，但不更新趋势图
    return new Promise((resolve) => {
        updateVisualizationsExceptTrend().then(resolve);
    });
  }

  // 新增一个不更新趋势图的可视化更新函数
  async function updateVisualizationsExceptTrend() {
    try {
        const sitcData = await loadSitcData(state.currentType);
        if (!sitcData) throw new Error('Failed to load SITC data');

        lastLoadedData = sitcData;
        
        // 只更新地图和国家排名图表
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
      center: [10, 50],  // 稍微向西和向北调整中心点
      zoom: 3.0  // 减小zoom值以显示更大范围
    }
  };

  // 更新颜色方案
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

  // 添加英国坐标常量
  const UK_COORDINATES = {
    lng: -2.5,
    lat: 54
  };

  // 修改抛物线生成函数
  function createParabolicCurve(startX, startY, endX, endY) {
    // 计算控制点，使曲线呈现抛物线形状
    const controlX = (startX + endX) / 2;
    // 让控制点高度随距离变化，距离越远曲线越高
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
        
        // 等待样式加载完成
        state.currentMap.on('style.load', () => {
            // Initial animation from world to Europe
            setTimeout(() => {
                animateMapTo(state.currentMap, MAP_VIEWS.europe);
            }, 1000);
            
            // 确保在样式加载完成后再更新可视化
            if (state.currentMap.loaded() && state.currentMap.isStyleLoaded()) {
                updateVisualizations();
            } else {
                state.currentMap.once('load', updateVisualizations);
            }
        });

        // 添加SVG容器
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
                <path id="curve-path" fill="none" stroke="none"/>
                <circle id="moving-dot" r="4" fill="none"/>
            </svg>
        `;
        mapDiv.appendChild(svgContainer);

        // 修改地图事件处理
        state.currentMap.on('mousemove', 'country-fills', (e) => {
            if (e.features.length > 0) {
                const feature = e.features[0];
                
                // 更新已有的悬停状态代码
                if (state.hoveredFeatureId !== null) {
                    state.currentMap.setFeatureState(
                        { source: 'countries', id: state.hoveredFeatureId },
                        { hover: false }
                    );
                }
                state.hoveredFeatureId = feature.id;
                state.currentMap.setFeatureState(
                    { source: 'countries', id: state.hoveredFeatureId },
                    { hover: true }
                );

                // 添加抛物线动画
                const svg = svgContainer.querySelector('svg');
                const path = svg.querySelector('#curve-path');
                const dot = svg.querySelector('#moving-dot');
                
                // 获取国家中心点
                const bounds = new mapboxgl.LngLatBounds();
                feature.geometry.coordinates[0].forEach(coord => bounds.extend(coord));
                const center = bounds.getCenter();
                
                // 将两个地理坐标点转换为屏幕坐标
                const countryPoint = state.currentMap.project(center);
                const ukPoint = state.currentMap.project(UK_COORDINATES);

                // 创建抛物线路径
                const curve = createParabolicCurve(
                    countryPoint.x, countryPoint.y,
                    ukPoint.x, ukPoint.y
                );

                // 设置路径样式和动画
                path.setAttribute('d', curve);
                path.setAttribute('stroke', 'rgba(255, 255, 255, 0.6)');
                path.setAttribute('stroke-width', '1.5');
                path.setAttribute('stroke-dasharray', '4,4');
                path.style.animation = 'dash 1s linear infinite';

                // 设置移动点的样式和动画
                dot.setAttribute('fill', 'rgba(255, 255, 255, 0.8)');
                dot.setAttribute('r', '3');
                dot.style.animation = 'moveAlongPath 2s linear infinite';

                // 添加动画样式
                const style = document.createElement('style');
                style.textContent = `
                    @keyframes dash {
                        to {
                            stroke-dashoffset: -12;
                        }
                    }
                    @keyframes moveAlongPath {
                        from {
                            offset-distance: 0%;
                        }
                        to {
                            offset-distance: 100%;
                        }
                    }
                `;
                svg.appendChild(style);

                // 设置点的运动路径
                dot.style.offsetPath = `path("${curve}")`;
            }
        });

        state.currentMap.on('mouseleave', 'country-fills', () => {
            // 清除已有的悬停状态代码
            if (state.hoveredFeatureId !== null) {
                state.currentMap.setFeatureState(
                    { source: 'countries', id: state.hoveredFeatureId },
                    { hover: false }
                );
            }
            state.hoveredFeatureId = null;

            // 清除抛物线动画
            const svg = svgContainer.querySelector('svg');
            const path = svg.querySelector('#curve-path');
            const dot = svg.querySelector('#moving-dot');
            path.setAttribute('stroke', 'none');
            dot.setAttribute('fill', 'none');
        });

    } catch (err) {
        console.error('Mapbox地图初始化异常', err);
        mapDiv.innerHTML = '<div class="map-error">Failed to initialize map</div>';
    }
  }

  // 添加图表实例存储
  let countriesChart = null;
  let trendChart = null;
  let selectedCountry = null;
  
  // 初始化图表
  function initializeCharts() {
    // 初始化图表
    const container = document.getElementById('country-trend-container');
    if (container) {
        // 添加提示文本和图表canvas
        container.innerHTML = `
            <div class="no-country-selected">Click a country on the map to view its trend</div>
            <canvas id="country-trend-chart" style="display: none;"></canvas>
        `;
    }
    
    // 初始化图表实例
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
    
    // 重置容器内容
    container.innerHTML = `
        <div class="no-country-selected">Click a country on the map to view its trade trend</div>
        <canvas id="country-trend-chart" style="display: none;"></canvas>
    `;
    
    // 获取新创建的 canvas
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
    
    // 显示趋势图，隐藏提示信息
    if (canvas) {
        canvas.style.display = 'block';
        canvas.classList.add('trend-chart-animation');
        noCountryMessage.style.display = 'none';
    }

    // 为每个流向类型获取数据
    const datasets = flowTypes.map((flowType, index) => {
        const data = years.map(year => {
            const yearData = sitcData.data.find(d => d.year === year && d.flow_type === flowType);
            if (!yearData) return 0;
            
            const countryInfo = yearData.countries.find(c => c.Country === state.selectedCountry);
            return countryInfo ? Number(countryInfo['Value (￡)']) : 0;
        });

        return {
            ...state.trendChart.data.datasets[index],
            data: data
        };
    });

    // 更新图表标题和数据
    state.trendChart.data.datasets = datasets;
    state.trendChart.options.plugins.title = {
        display: true,
        text: `${state.selectedCountry} - ${sitcData.sitc_type}`,
        color: '#fff',
        font: {
            size: 16,
            weight: 'normal'
        }
    };

    // 恢复动画
    state.trendChart.options.animation = {
        duration: 1500,
        easing: 'easeOutQuart'
    };
    state.trendChart.update();

    // 移除动画类
    setTimeout(() => {
        if (canvas) {
            canvas.classList.remove('trend-chart-animation');
        }
    }, 1200);
  }

  // 添加数据缓存
  let lastLoadedData = null;

  // 修改地图更新函数
  async function updateMapData(sitcData) {
    if (!state.currentMap) return;
    state.currentSitcData = sitcData;  // 保存当前数据以供趋势图使用
    
    const mapDiv = document.querySelector('.goods-type-detail-map');
    if (!mapDiv) return;
    
    mapDiv.classList.add('updating');
    let isUpdating = true;

    try {
        // 找到当前年份和流向的数据
        const currentData = sitcData.data.find(d => 
            d.year === state.currentYear && 
            d.flow_type === state.currentFlow
        );
        
        if (!currentData || !currentData.countries || currentData.countries.length === 0) {
            console.warn(`No data available for year ${state.currentYear} and flow type ${state.currentFlow}`);
            // 清除地图上的数据而不是显示错误
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
        
        // 创建国家值的查找表
        const countryValues = {};
        currentData.countries.forEach(item => {
            countryValues[item.Country] = Number(item['Value (￡)']);
        });
        
        // 计算有效值的范围
        const values = Object.values(countryValues).filter(v => v > 0);
        if (values.length === 0) {
            console.warn('No valid trade values found for the current selection');
            return;
        }
        
        const maxValue = Math.max(...values);
        const minValue = Math.min(...values);
        
        // 更新计算颜色的逻辑
        const getMapColor = (value, maxValue, minValue) => {
            if (value <= 0) return 'rgba(0, 0, 0, 0.1)';
            
            // 使用指数函数来增强对比度
            const normalizedValue = Math.pow(
                (Math.log(value + 1) - Math.log(minValue + 1)) / 
                (Math.log(maxValue + 1) - Math.log(minValue + 1)),
                0.5  // 指数小于1会增强低值区域的差异
            );
            
            const baseColor = state.currentFlow.includes('Non EU') ? 
                COLOR_SCHEME['Non EU - Exports'].map :
                COLOR_SCHEME['EU - Exports'].map;
            
            // 扩大透明度范围，增加最小透明度
            const alpha = 0.3 + normalizedValue * 0.7;  // 透明度范围从0.3到1.0
            
            // 同时调整颜色饱和度
            const hslColor = state.currentFlow.includes('Non EU') ?
                `hsla(0, ${60 + normalizedValue * 40}%, ${40 + normalizedValue * 30}%, ${alpha})` :
                `hsla(210, ${60 + normalizedValue * 40}%, ${40 + normalizedValue * 30}%, ${alpha})`;
                
            return hslColor;
        };

        // 更新地图特征
        const updatedFeatures = geoData.features.map(feature => ({
            ...feature,
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
        
        // 修改地图图层样式
        if (state.currentMap.getSource('countries')) {
            state.currentMap.getSource('countries').setData({
                type: 'FeatureCollection',
                features: updatedFeatures
            });
        } else {
            // 初始化地图图层
            state.currentMap.addSource('countries', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: updatedFeatures
                }
            });

            // 修改填充图层
            state.currentMap.addLayer({
                id: 'country-fills',
                type: 'fill',
                source: 'countries',
                paint: {
                    'fill-color': ['get', 'color'],
                    'fill-opacity': ['case',
                        ['boolean', ['feature-state', 'hover'], false],
                        0.9,  // 提高悬停时的不透明度
                        ['boolean', ['feature-state', 'selected'], false],
                        0.95,  // 提高选中时的不透明度
                        0.85   // 提高默认的不透明度
                    ]
                }
            });

            // 修改边界线图层
            state.currentMap.addLayer({
                id: 'country-borders',
                type: 'line',
                source: 'countries',
                paint: {
                    'line-color': '#ffffff',
                    'line-width': ['case',
                        ['boolean', ['feature-state', 'selected'], false],
                        2.5,  // 增加选中边框宽度
                        ['boolean', ['feature-state', 'hover'], false],
                        1.5,  // 增加悬停边框宽度
                        0.5
                    ],
                    'line-opacity': 0.8
                }
            });

            // 创建弹出框
            state.popup = new mapboxgl.Popup({
                closeButton: false,
                closeOnClick: false,
                className: 'map-popup'
            });

            // 添加点击事件处理
            state.currentMap.on('click', 'country-fills', (e) => {
                if (e.features.length > 0) {
                    const feature = e.features[0];
                    state.selectedCountry = feature.properties.name;
                    
                    // 更新选中状态样式
                    if (state.selectedFeatureId) {
                        state.currentMap.setFeatureState(
                            { source: 'countries', id: state.selectedFeatureId },
                            { selected: false }
                        );
                    }
                    state.selectedFeatureId = feature.id;
                    state.currentMap.setFeatureState(
                        { source: 'countries', id: state.selectedFeatureId },
                        { selected: true }
                    );
                    
                    // 更新趋势图
                    updateTrendChart(state.currentSitcData);
                }
            });

            // 添加鼠标事件
            state.currentMap.on('mouseenter', 'country-fills', () => {
                state.currentMap.getCanvas().style.cursor = 'pointer';
            });

            state.currentMap.on('mouseleave', 'country-fills', () => {
                state.currentMap.getCanvas().style.cursor = '';
            });

            // 添加悬停效果
            state.currentMap.on('mousemove', 'country-fills', (e) => {
                if (e.features.length > 0) {
                    if (state.hoveredFeatureId !== null) {
                        state.currentMap.setFeatureState(
                            { source: 'countries', id: state.hoveredFeatureId },
                            { hover: false }
                        );
                    }
                    state.hoveredFeatureId = e.features[0].id;
                    state.currentMap.setFeatureState(
                        { source: 'countries', id: state.hoveredFeatureId },
                        { hover: true }
                    );
                    
                    // 显示弹出框
                    const feature = e.features[0];
                    const value = feature.properties.value;
                    
                    state.popup.setLngLat(e.lngLat)
                        .setHTML(`
                            <div class="map-popup-content">
                                <h4>${feature.properties.name}</h4>
                                <p>£${formatToMillions(value)}</p>
                            </div>
                        `)
                        .addTo(state.currentMap);
                }
            });

            state.currentMap.on('mouseleave', 'country-fills', () => {
                if (state.hoveredFeatureId !== null) {
                    state.currentMap.setFeatureState(
                        { source: 'countries', id: state.hoveredFeatureId },
                        { hover: false }
                    );
                }
                state.hoveredFeatureId = null;
                state.popup.remove();
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

    const topCountries = currentYearData.countries
        .sort((a, b) => Number(b['Value (￡)']) - Number(a['Value (￡)']))
        .slice(0, 10);

    const baseColor = state.currentFlow.includes('Non EU') ? 
        COLOR_SCHEME['Non EU - Exports'] :
        COLOR_SCHEME['EU - Exports'];

    countriesChart.data.labels = topCountries.map(c => c.Country);
    countriesChart.data.datasets[0].data = topCountries.map(c => Number(c['Value (￡)']));
    countriesChart.data.datasets[0].backgroundColor = baseColor.background;
    countriesChart.data.datasets[0].borderColor = baseColor.border;

    // 更新图表配置
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

  // 修改数据加载函数，使用直接文件名而不是索引
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
    
    // 检查缓存
    if (window.sitcDataCache?.[cacheKey]) {
        return window.sitcDataCache[cacheKey];
    }
    
    try {
        // 从GitHub仓库原始文件URL直接读取
        const response = await fetch(`https://raw.githubusercontent.com/Cihshee/CASA0003_minnni_project/main/public/data/split/${fileName}`);
        if (!response.ok) throw new Error(`Failed to load ${fileName}`);
        
        const data = await response.json();
        
        // 验证数据是否为空
        const hasData = data.data.some(d => d.countries && d.countries.length > 0);
        if (!hasData) {
            console.error(`SITC ${sitcIndex} (${data.sitc_type}) data is empty. Please check the data file.`);
            // 显示错误信息在页面上
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
        
        // 初始化缓存
        if (!window.sitcDataCache) window.sitcDataCache = {};
        window.sitcDataCache[cacheKey] = data;
        
        // 限制缓存大小
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

  // 修改预加载函数
  function preloadNextSitcData() {
    const nextType = (state.currentType + 1) % sitcLabels.length;
    loadSitcData(nextType).catch(() => {}); // 忽略预加载错误
  }

  // 修改图标点击事件处理
  function bindIconBarEvents() {
    // 获取所有图标
    const allIcons = document.querySelectorAll('.goods-type-icon-btn');

    // 为每个图标添加title属性
    allIcons.forEach(btn => {
      const typeIndex = parseInt(btn.getAttribute('data-type'));
      btn.setAttribute('title', sitcLabels[typeIndex]); // 添加悬停提示文本
      
      btn.onclick = async () => {
        if (state.currentType === typeIndex) return;
        
        const oldType = state.currentType;
        state.currentType = typeIndex;
        
        // 更新所有图标的状态
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
          
          // 更新描述文本
          const descElement = document.getElementById('goods-type-detail-desc');
          if (descElement) {
            descElement.textContent = sitcDescriptions[typeIndex];
          }

          // 加载新的SITC数据
          const sitcData = await loadSitcData(typeIndex);
          if (!sitcData) throw new Error(`Failed to load SITC ${typeIndex} data`);
          
          // 保存当前数据到state中
          state.currentSitcData = sitcData;
          
          // 更新所有可视化
          await Promise.all([
            updateMapData(sitcData),
            updateCountriesChart(sitcData)
          ]);
          
          // 如果已经选择了国家，更新趋势图
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
          
          // 预加载下一个类型的数据
          preloadNextSitcData();
          
        } catch (error) {
          console.error('Failed to update visualizations:', error);
          // 恢复之前的状态
          state.currentType = oldType;
          // 恢复图标状态
          allIcons.forEach(icon => {
            const iconTypeIndex = parseInt(icon.getAttribute('data-type'));
            const isSelected = iconTypeIndex === oldType;
            icon.setAttribute('data-selected', isSelected ? 'true' : 'false');
            icon.style.backgroundColor = isSelected ? 'rgb(33, 150, 243)' : '#1e2832';
          });
        }
      };
    });

    // 初始化时设置当前选中状态
    allIcons.forEach(icon => {
      const iconTypeIndex = parseInt(icon.getAttribute('data-type'));
      const isSelected = iconTypeIndex === state.currentType;
      icon.setAttribute('data-selected', isSelected ? 'true' : 'false');
      icon.style.backgroundColor = isSelected ? 'rgb(33, 150, 243)' : '#1e2832';
    });
  }

  // 修改初始化加载
  async function initialize() {
    try {
        // 首先加载CSV数据用于summary图表
        const response = await fetch(csvPath);
        const csvText = await response.text();
        const {data} = parseCSV(csvText);
        state.allData = data;
        // 渲染intro页
        renderGoodsTypeIntro();
        // 渲染summary部分
        renderLegend();
        renderSummaryCharts(data);

        // 设置初始状态
        state.currentType = 0;
        state.currentFlow = flowTypes[0];
        state.currentYear = years[0];

        // 渲染详细视图结构，但不立即加载数据
        renderDetail();
        bindIconBarEvents();
        
        // 添加滚动监听，当用户滚动到商品类型部分时自动加载第一个物品数据
        setupScrollObserver();
        
        // 预加载数据但不立即显示
        preloadSitcData();
    } catch (error) {
        console.error('Initialization failed:', error);
    }
  }
  
  // 新增：预加载SITC数据但不显示
  async function preloadSitcData() {
    try {
        // 预加载SITC 0数据
        const initialData = await loadSitcData(0);
        if (initialData) {
            // 仅缓存数据，但不更新UI
            state.preloadedData = initialData;
        }
    } catch (error) {
        console.error('Preload data failed:', error);
    }
  }
  
  // 新增：设置滚动观察器
  function setupScrollObserver() {
    // 创建观察器来检测商品类型部分的可见性
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            // 当商品类型部分进入视窗
            if (entry.isIntersecting && !state.dataLoaded) {
                state.dataLoaded = true;  // 标记数据已加载，防止重复加载
                
                // 加载并显示第一个物品数据
                loadInitialData();
                
                // 完成后取消观察
                observer.disconnect();
            }
        });
    }, { threshold: 0.2 });  // 当20%的元素可见时触发
    
    // 开始观察商品类型详情容器
    const detailContainer = document.getElementById('goods-type-detail-container');
    if (detailContainer) {
        observer.observe(detailContainer);
    }
  }
  
  // 新增：加载初始数据
  async function loadInitialData() {
    try {
        let sitcData;
        
        // 如果有预加载的数据，直接使用
        if (state.preloadedData) {
            sitcData = state.preloadedData;
            console.log('Using preloaded data for initial display');
        } else {
            // 否则加载第一个SITC类型的数据
            sitcData = await loadSitcData(0);
            if (!sitcData) throw new Error('Failed to load initial data');
        }
        
        // 保存当前数据到state中
        state.currentSitcData = sitcData;
        
        // 更新图标状态
        updateCurrentIcon(0);
        
        // 更新描述文本
        const descElement = document.getElementById('goods-type-detail-desc');
        if (descElement) {
            descElement.textContent = sitcDescriptions[0];
        }
        
        // 更新地图和国家排名图表
        await Promise.all([
            updateMapData(sitcData),
            updateCountriesChart(sitcData)
        ]);
        
        // 预加载下一个类型的数据
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

  // 启动初始化
  initialize();

  const MAPBOX_TOKEN = 'pk.eyJ1IjoieWl4aW5nLWxpIiwiYSI6ImNtN3FtNWh6YjA0ancybnM4aGxjZnlheTEifQ.sKwaoIMQR65VQmYDbnu2MQ';
  const MAPBOX_STYLE = 'mapbox://styles/yixing-li/cmaa8uo1j00j001sgc3051vxu';

  // 添加样式
  const style = document.createElement('style');
  style.textContent = `
      /* 图标基础样式 */
      .goods-type-icon-btn {
          background-color: #1e2832 !important;
          border: 2px solid rgba(255, 255, 255, 0.2) !important;
          transition: all 0.3s ease !important;
          position: relative !important;  /* 为tooltip定位添加 */
      }

      /* 图标容器样式 */
      .goods-type-icons-row {
          padding-left: 0 !important;  /* 移除左内边距 */
          margin-left: -40px !important;  /* 整体向左移动 */
      }

      /* 详情区域布局调整 */
      #goods-type-detail-container {
          padding-left: 0 !important;  /* 移除左内边距 */
          margin-left: -40px !important;  /* 整体向左移动 */
      }

      /* 图标tooltip样式 */
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

      /* 当前选中的图标样式 - 使用更高优先级 */
      .goods-type-icon-btn[data-selected="true"] {
          background-color: rgb(33, 150, 243) !important;
          border-color: rgb(33, 150, 243) !important;
          box-shadow: 0 0 15px rgba(33, 150, 243, 0.5) !important;
          transform: translateX(5px) !important;
      }

      /* 悬停效果 */
      .goods-type-icon-btn:hover {
          background-color: rgba(33, 150, 243, 0.2) !important;
          border-color: rgba(33, 150, 243, 0.5) !important;
      }

      /* 地图容器调整 */
      .goods-type-detail-map {
          position: relative;
          z-index: 1;
          margin-left: -20px !important;  /* 地图容器向左移动 */
      }

      .mapboxgl-canvas {
          cursor: pointer !important;
      }

      .mapboxgl-canvas-container {
          z-index: 2;
      }

      /* 趋势图动画 */
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

      /* Summary 图表样式 */
      .goods-type-section {
          margin-bottom: 120px !important;  /* 增加第一页和第二页之间的间距 */
          padding-bottom: 50px !important;  /* 添加内边距 */
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
  `;
  document.head.appendChild(style);

  // 在goodstype最前面插入intro页
  function renderGoodsTypeIntro() {
    if (document.getElementById('goods-type-intro')) return;
    const mainWrap = document.querySelector('.goods-type-section') || document.body;
    // 创建intro外层
    const introDiv = document.createElement('div');
    introDiv.id = 'goods-type-intro';
    introDiv.style.cssText = 'max-width:1200px;min-height:480px;margin:0 auto 96px auto;padding:0 0 18px 0;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;z-index:1;';
    // SITC1简介
    const introText = document.createElement('div');
    introText.className = 'goods-type-intro-text';
    introText.innerHTML = `
      <div class=\"goods-type-transition-text fadein-block\" style=\"font-size:1.1em !important;color:#fff;margin-bottom:64px;max-width:1000px;margin-left:auto;margin-right:auto;text-align:center;line-height:1.6;\">Beyond fluctuations in trade volumes with specific countries and regions, Brexit has had complex effects on particular types of goods. From the SITC 1 classification perspective...</div>
      <div class=\"fadein-block\" style=\"width:100%;margin-bottom:54px;\">  
        <h2 style=\"font-size:1.15em;font-weight:700;margin-bottom:14px;color:#fff;letter-spacing:1px;\">SITC1 Introduction</h2>
        <div style=\"font-size:1.05em;max-width:1000px;margin:0 auto 20px auto;line-height:1.6;color:#fff;\">
          The Standard International Trade Classification (SITC) is a United Nations system designed to classify traded products to enable international comparison of trade data. SITC1 is the first-level broader classification, dividing goods into 10 main categories based on material type, use, and processing stage.
        </div>
        <div style=\"max-width:1000px;margin:0 auto 0 auto;font-size:0.92em;font-style:italic;color:rgba(255,255,255,0.38);line-height:1.5;text-align:center;\">
          Source: <a href=\"https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Glossary:Standard_international_trade_classification_(SITC)\" target=\"_blank\" style=\"color:#4fc3f7;text-decoration:underline;\">Eurostat, 'Standard international trade classification (SITC)'</a>
        </div>
      </div>
    `;
    introDiv.appendChild(introText);
    // 图片卡片区
    const carousel = document.createElement('div');
    carousel.className = 'goods-type-carousel fadein-block';
    carousel.style.cssText = 'display:flex;gap:0;justify-content:center;align-items:flex-end;margin-bottom:38px;overflow-x:auto;max-width:100%;';
    // 介绍区
    const descDiv = document.createElement('div');
    descDiv.className = 'goods-type-desc fadein-block';
    descDiv.style.cssText = 'min-height:90px;text-align:center;max-width:700px;margin:0 auto 0 auto;font-size:1.05em;color:#fff;line-height:1.7;transition:all 0.5s;';
    // 当前选中
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
    // 生成10个卡片
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
    // 插入到goodstype最前面
    mainWrap.parentNode.insertBefore(introDiv, mainWrap);
    // 初始高亮和描述
    updateDesc(0);
    // intro样式
    const style = document.createElement('style');
    style.textContent = `
      #goods-type-intro {box-sizing:border-box;}
      .goods-type-intro-text {margin-top:48px;margin-bottom:18px;text-align:center;}
      .goods-type-carousel::-webkit-scrollbar {display:none;}
      .goods-type-card {margin:0;box-shadow:none;filter:none;width:130px !important;}
      .goods-type-card img {filter:grayscale(0.7) brightness(0.8);}
      .goods-type-card.active,
      .goods-type-card:hover {z-index:2;}
      .goods-type-card.active {width:600px !important;box-shadow:0 8px 32px #4fc3f7aa;}
      .goods-type-card.active img {filter:none;}
      .goods-type-card.dimmed img {filter:grayscale(0.7) brightness(0.8);}
      .goods-type-card:not(.active):hover img {filter:grayscale(0.3) brightness(0.95);}
      .goods-type-card:first-child {border-top-left-radius:38px;border-bottom-left-radius:38px;}
      .goods-type-card:last-child {border-top-right-radius:38px;border-bottom-right-radius:38px;}
      .goods-type-desc h4 {color:#4fc3f7;letter-spacing:1px;}
      .goods-type-card-num {font-size:1.05em !important;}
      @media (max-width: 900px) {
        .goods-type-card {width:150px !important;height:70px;}
        .goods-type-card.active {width:260px !important;}
        .goods-type-intro-text h2 {font-size:1.3em;}
        .goods-type-desc {font-size:16px;}
      }
      /* 动画样式 */
      .fadein-block {opacity:0;transform:translateY(40px);transition:opacity 0.85s cubic-bezier(.4,0,.2,1),transform 0.85s cubic-bezier(.4,0,.2,1);}
      .fadein-block.visible {opacity:1;transform:translateY(0);}
    `;
    document.head.appendChild(style);
    // 数字标签样式
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
    // 动画：滚动出现
    setTimeout(()=>{
      const fadeBlocks = introDiv.querySelectorAll('.fadein-block');
      // fadeBlocks: [0]=过渡文字, [1]=标题+desc, [2]=carousel, [3]=descDiv
      // 让carousel和descDiv同时出现
      const stagger = 0.45;
      const fastStagger = 0.28;
      fadeBlocks.forEach((el, i) => {
        if (i === 2 || i === 3) {
          el.style.transitionDelay = (1*stagger + fastStagger) + 's';
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
      }, {threshold: 0.18});
      fadeBlocks.forEach(el => observer.observe(el));
    }, 200);
  }

  // 自动轮播功能
  let autoScrollTimer = null;
  let autoScrollPaused = false;
  let autoScrollResumeTimer = null;
  function scrollToCard(idx) {
    const card = carousel.children[idx];
    if (card && card.scrollIntoView) {
      // 兼容性处理
      try {
        card.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'});
      } catch(e) {
        card.scrollIntoView();
      }
    }
  }
  function startAutoScroll() {
    if (autoScrollTimer) clearInterval(autoScrollTimer);
    autoScrollTimer = setInterval(() => {
      if (!autoScrollPaused) {
        selected = (selected + 1) % 10;
        updateDesc(selected);
        scrollToCard(selected);
      }
    }, 3500);
  }
  function pauseAutoScroll(tempPause = true) {
    autoScrollPaused = true;
    if (autoScrollResumeTimer) clearTimeout(autoScrollResumeTimer);
    if (tempPause) {
      autoScrollResumeTimer = setTimeout(() => {
        autoScrollPaused = false;
      }, 10000); // 10秒后恢复
    }
  }
  function stopAutoScroll() {
    if (autoScrollTimer) clearInterval(autoScrollTimer);
    autoScrollTimer = null;
    autoScrollPaused = true;
  }
  // 用户交互时暂停自动轮播
  carousel.addEventListener('mouseenter', () => pauseAutoScroll());
  carousel.addEventListener('mouseleave', () => pauseAutoScroll(false));
  Array.from(carousel.children).forEach((card, idx) => {
    card.addEventListener('mouseenter', () => { pauseAutoScroll(); });
    card.addEventListener('click', () => { pauseAutoScroll(); scrollToCard(idx); });
  });
  // 启动自动轮播
  startAutoScroll();
})();