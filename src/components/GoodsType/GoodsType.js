// 如果你用CDN方式引入Chart.js，不要import
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
    '8 Miscellaneous manufactured articles'
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
    'Miscellaneous manufactured articles include toys, furniture, clothing, and more. Market access and certification processes have changed post-Brexit.'
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

  function drawChart(ctx, dataRows, flowtype) {
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

    const totalDuration = 3000;
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

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: interpolatedYears,
        datasets
      },
      options: {
        responsive: true,
        animation,
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
                // 只显示年份
                const yearIndex = Math.floor(context[0].dataIndex / 30);
                return years[yearIndex];
              },
              label: function(context) {
                // 只显示当前悬停的数据点
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
              callback: function(value, index) {
                // 显示实际年份
                if (index % 30 === 0) {
                  const yearIndex = index / 30;
                  return years[yearIndex];
                }
                return '';
              },
              maxRotation: 0,
              autoSkip: false
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
      plugins: [{
        id: 'valueLabels',
        afterDatasetsDraw(chart) {
          const ctx = chart.ctx;
          chart.data.datasets.forEach((dataset, datasetIndex) => {
            const meta = chart.getDatasetMeta(datasetIndex);
            if (!meta.hidden) {
              const lastVisiblePoint = meta.data
                .filter((_, index) => dataset.data[index] !== null)
                .pop();
              
              if (lastVisiblePoint) {
                ctx.save();
                ctx.fillStyle = dataset.borderColor;
                ctx.font = '12px Arial';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(
                  `£${formatToMillions(dataset.data[dataset.data.length - 1])}`,
                  lastVisiblePoint.x + 10,
                  lastVisiblePoint.y
                );
                ctx.restore();
              }
            }
          });
        }
      }]
    });
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
  ];
  function renderLegend() {
    const legend = document.getElementById('goods-summary-legend');
    legend.innerHTML = legendItems.map(item =>
      `<span class="goods-summary-legend-item"><span class="goods-summary-legend-color" style="background:${item.color}"></span>${item.label}</span>`
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
    
    // 创建图表但先不渲染
    const charts = [];
    flowTypes.forEach((flowtype, idx) => {
      const block = document.createElement('div');
      block.className = 'goods-summary-chart-block';
      block.style.opacity = '0';  // 初始设置为不可见
      block.style.transform = 'translateY(20px)';  // 初始位置略微向下
      block.style.transition = 'all 0.8s ease';
      block.innerHTML = `
        <div class="goods-summary-chart-title">${flowtype} (2016-2024)</div>
        <canvas class="goods-summary-chart-canvas" width="800" height="340"></canvas>
      `;
      chartContainer.appendChild(block);
      
      const ctx = block.querySelector('canvas').getContext('2d');
      charts.push({
        block,
        ctx,
        flowtype,
        rendered: false
      });
    });

    // 创建观察器
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const container = entry.target;
          // 依次显示每个图表
          charts.forEach((chart, index) => {
            if (!chart.rendered) {
              setTimeout(() => {
                chart.block.style.opacity = '1';
                chart.block.style.transform = 'translateY(0)';
                drawChart(chart.ctx, data, chart.flowtype);
                chart.rendered = true;
              }, index * 300);  // 每个图表间隔300ms
            }
          });
          observer.disconnect();  // 动画触发后解除观察
        }
      });
    }, { threshold: 0.2 });  // 当20%的内容可见时触发

    observer.observe(chartContainer);
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
        const response = await fetch('/public/data/countries.geojson');
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
      center: [15, 54],
      zoom: 3.5
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

  // 添加SVG动画相关函数
  function createParabolicCurve(startX, startY, endX, endY) {
    // 计算控制点，使曲线呈现抛物线形状
    const controlX = (startX + endX) / 2;
    const controlY = Math.min(startY, endY) - Math.abs(endX - startX) * 0.3;
    
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
                
                // 获取鼠标位置和国家中心点
                const mousePoint = [e.point.x, e.point.y];
                const bounds = new mapboxgl.LngLatBounds();
                feature.geometry.coordinates[0].forEach(coord => bounds.extend(coord));
                const center = bounds.getCenter();
                const centerPoint = state.currentMap.project(center);

                // 创建抛物线路径
                const curve = createParabolicCurve(
                    mousePoint[0], mousePoint[1],
                    centerPoint.x, centerPoint.y
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
        // 使用直接文件名访问
        const response = await fetch(`/data/split/${fileName}`);
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
                        <p>Please check the data file: /data/split/${fileName}</p>
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

    // 为每个图标添加点击事件
    allIcons.forEach(btn => {
      const typeIndex = parseInt(btn.getAttribute('data-type'));
      
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

      /* 地图交互样式 */
      .goods-type-detail-map {
          position: relative;
          z-index: 1;
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
          height: 270px !important;  /* 增加图表高度 */
          margin-bottom: 20px !important;  /* 增加图表之间的间距 */
      }

      .goods-summary-chart-canvas {
          height: 100% !important;  /* 确保canvas填充容器高度 */
      }

      /* 增加legend文字大小 */
      .goods-summary-legend-item {
          font-size: 14px !important;  /* 增加文字大小 */
          margin-right: 20px !important;  /* 增加间距 */
          line-height: 1.6 !important;
      }

      .goods-summary-legend-color {
          width: 16px !important;  /* 稍微增加色块大小 */
          height: 16px !important;
          margin-right: 8px !important;
      }

      /* 其他现有样式保持不变 */
      .timeline-play-btn {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fff;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s;
          font-size: 16px;
          padding: 0;
          line-height: 1;
      }

      /* 其他样式保持不变... */
  `;
  document.head.appendChild(style);
})();