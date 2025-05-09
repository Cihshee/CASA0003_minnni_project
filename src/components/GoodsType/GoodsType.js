// 如果你用CDN方式引入Chart.js，不要import
// import Chart from 'chart.js/auto';

console.log('GoodsType.js loaded');

(function() {
  const csvPath = '/data/Goodstype_full_summary_data_merged.csv';
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
    popup: null
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
    const datasets = dataRows.map((row, idx) => ({
      label: row['SitcCommodityHierarchy - SITC1'],
      data: years.map(year => getValue(row, flowtype, year)),
      borderColor: `hsl(${idx*40%360},70%,60%)`,
      backgroundColor: 'transparent',
      tension: 0.3,
      pointRadius: 2,
      borderWidth: 2
    }));
    console.log('Drawing chart for', flowtype, datasets);
    if (!ctx) {
      console.error('No canvas context!');
      return;
    }
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: years,
        datasets
      },
      options: {
        responsive: true,
        animation: {
          duration: 1800,
          easing: 'easeOutQuart'
        },
        plugins: {
          legend: { display: false },
          title: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: £${formatToMillions(context.parsed.y)}`;
              }
            }
          }
        },
        scales: {
          x: { ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.08)' } },
          y: { 
            ticks: { 
              color: '#fff',
              callback: function(value) {
                return '£' + formatToMillions(value, true);
              }
            }, 
            grid: { color: 'rgba(255,255,255,0.08)' }, 
            suggestedMax: undefined, 
            stepSize: 20000000 
          }
        }
      }
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

  // summary区渲染（四张图表）
  function renderSummaryCharts(data) {
    const chartContainer = document.getElementById('goods-summary-charts');
    if (!chartContainer) return;
    chartContainer.innerHTML = '';
    flowTypes.forEach((flowtype, idx) => {
      const block = document.createElement('div');
      block.className = 'goods-summary-chart-block';
      block.innerHTML = `
        <div class="goods-summary-chart-title">${flowtype} (2016-2024)</div>
        <canvas class="goods-summary-chart-canvas" width="800" height="340"></canvas>
      `;
      chartContainer.appendChild(block);
    });
    // IntersectionObserver for动画
    const section = document.querySelector('.goods-type-section');
    const blocks = Array.from(document.querySelectorAll('.goods-summary-chart-block'));
    let animated = false;
    const observer = new window.IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !animated) {
          animated = true;
          // Animate blocks one by one
          blocks.forEach((block, i) => {
            setTimeout(() => {
              block.classList.add('visible');
              const ctx = block.querySelector('canvas').getContext('2d');
              drawChart(ctx, data, flowTypes[i]);
            }, i * 600);
          });
          observer.disconnect();
        }
      });
    }, { threshold: 0.2 });
    observer.observe(section);
  }

  // 添加动画控制状态
  const animationState = {
    isPlaying: false,
    speed: 1,
    intervalId: null
  };

  // 修改渲染详情区域的函数
  function renderDetail() {
    const detailSection = document.getElementById('goods-type-detail-container');
    if (!detailSection) return;
    
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

    // 绑定控件事件
    const playBtn = document.querySelector('.timeline-play-btn');
    const speedSelect = document.querySelector('.timeline-speed');

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
    playBtn.onclick = () => {
        if (animationState.isPlaying) {
            stopTimelineAnimation();
            playBtn.querySelector('.play-icon').textContent = '▶';
        } else {
            startTimelineAnimation();
            playBtn.querySelector('.play-icon').textContent = '⏸';
        }
    };

    // 速度选择事件
    speedSelect.onchange = (e) => {
        animationState.speed = Number(e.target.value);
        if (animationState.isPlaying) {
            stopTimelineAnimation();
            startTimelineAnimation();
        }
    };

    // 初始化地图和图表
    createMapboxMapWhenVisible();
    initializeCharts();

    // 自动开始播放
    setTimeout(() => {
        if (!animationState.isPlaying) {
            startTimelineAnimation();
        }
    }, 1000);
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
        const response = await fetch('/data/countries.geojson');
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
        
        state.currentMap.on('load', () => {
            // Initial animation from world to Europe
            setTimeout(() => {
                animateMapTo(state.currentMap, MAP_VIEWS.europe);
            }, 1000);
            updateVisualizations();
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
            <canvas id="country-trend-chart"></canvas>
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
    if (!ctx) return;
    
    if (state.trendChart) {
        state.trendChart.destroy();
    }
    
    state.trendChart = new Chart(ctx, {
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
    
    // 初始时隐藏图表
    ctx.style.display = 'none';
  }

  function updateTrendChart(sitcData) {
    if (!state.trendChart || !state.selectedCountry) return;

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

    state.trendChart.data.datasets = datasets;
    state.trendChart.options.plugins.title = {
        display: true,
        text: `${sitcLabels[state.currentType]} - Trade Flows with ${state.selectedCountry}`,
        color: '#fff',
        padding: {
            top: 5,
            bottom: 10
        },
        font: {
            size: 13
        }
    };

    // 添加动画效果
    const chartCanvas = document.querySelector('#country-trend-chart');
    if (chartCanvas) {
        chartCanvas.style.display = 'block';
        chartCanvas.classList.remove('trend-chart-animation');
        void chartCanvas.offsetWidth; // 触发重排
        chartCanvas.classList.add('trend-chart-animation');
    }

    // 隐藏提示文本
    const noCountryMsg = document.querySelector('.no-country-selected');
    if (noCountryMsg) {
        noCountryMsg.style.display = 'none';
    }

    state.trendChart.update('none');
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
        
        if (!currentData) throw new Error('No data available for selected year and flow type');
        
        // 创建国家值的查找表
        const countryValues = {};
        currentData.countries.forEach(item => {
            countryValues[item.Country] = Number(item['Value (￡)']);
        });
        
        // 计算有效值的范围
        const values = Object.values(countryValues).filter(v => v > 0);
        if (values.length === 0) {
            throw new Error('No valid data for the current selection');
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

  // 修改数据加载函数，使用新的文件命名
  async function loadSitcData(sitcIndex) {
    const cacheKey = `sitc_${sitcIndex}`;
    
    // 检查缓存
    if (window.sitcDataCache?.[cacheKey]) {
        return window.sitcDataCache[cacheKey];
    }
    
    try {
        // 使用新的文件路径格式
        const response = await fetch(`/data/split/sitc_${sitcIndex}.json`);
        if (!response.ok) throw new Error(`Failed to load SITC ${sitcIndex} data`);
        
        const data = await response.json();
        
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
        console.error('Error loading SITC data:', error);
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
        
        // 立即更新当前选中的图标
        updateCurrentIcon(typeIndex);
        
        try {
          // 更新描述文本
          const descElement = document.getElementById('goods-type-detail-desc');
          if (descElement) {
            descElement.textContent = sitcDescriptions[typeIndex];
          }

          // 加载新的SITC数据
          const sitcData = await loadSitcData(typeIndex);
          if (!sitcData) throw new Error(`Failed to load SITC ${typeIndex} data`);
          
          // 更新所有可视化，包括趋势图
          await updateVisualizations();
          
          // 预加载下一个类型的数据
          preloadNextSitcData();
          
          // 如果是EU相关的流向，确保地图缩放到欧洲
          if (state.currentFlow.includes('EU')) {
            animateMapTo(state.currentMap, MAP_VIEWS.europe);
          } else {
            animateMapTo(state.currentMap, MAP_VIEWS.world);
          }
          
        } catch (error) {
          console.error('Failed to update visualizations:', error);
          // 恢复之前的状态
          state.currentType = oldType;
          updateCurrentIcon(oldType);
        }
      };
    });

    // 初始化时设置当前选中状态
    updateCurrentIcon(state.currentType);
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

        // 然后加载第一个SITC类型的数据用于详细视图
        const initialData = await loadSitcData(0);
        if (!initialData) throw new Error('Failed to load initial data');

        // 渲染详细视图
        renderDetail();
        bindIconBarEvents();  // 这里会正确设置初始图标状态

        // 预加载下一个类型的数据
        preloadNextSitcData();
    } catch (error) {
        console.error('Initialization failed:', error);
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

      /* 其他现有样式 */
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

      /* 增加第一页和第二页之间的间距 */
      .goods-type-section {
          margin-bottom: 150px;  /* 增加底部间距 */
      }

      /* 调整第一页图表容器的高度 */
      .goods-summary-chart-block {
          height: 250px;  /* 增加高度 */
          margin-bottom: 30px;
      }

      .goods-summary-chart-canvas {
          height: 100% !important;  /* 确保canvas填充容器高度 */
      }

      /* 增加legend文字大小 */
      .goods-summary-legend-item {
          font-size: 14px;  /* 增加文字大小 */
          margin-right: 20px;  /* 增加间距 */
          line-height: 1.6;
      }

      .goods-summary-legend-color {
          width: 16px;  /* 稍微增加色块大小 */
          height: 16px;
          margin-right: 8px;
      }

      /* 其他现有样式保持不变 */
      .timeline-play-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.1);
      }

      .timeline-speed {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fff;
          padding: 4px 8px;
          border-radius: 16px;
          cursor: pointer;
          font-size: 0.85rem;
          outline: none;
          transition: all 0.3s;
      }

      .timeline-speed:hover {
          background: rgba(255, 255, 255, 0.2);
      }

      .goods-type-detail-map {
          transition: opacity 0.5s ease;
      }

      .goods-type-detail-map.updating {
          opacity: 0.8;
      }

      /* 优化图表更新时的过渡 */
      canvas {
          transition: opacity 0.3s ease;
      }

      canvas.updating {
          opacity: 0.8;
      }

      .goods-type-detail-controls {
          display: flex;
          flex-direction: row;
          justify-content: space-between;
          align-items: center;
          gap: 1.5rem;
          background: #232323;
          padding: 1rem 1.2rem;
          border-radius: 0.8rem;
          margin: 0 20px 16px 0;
      }

      .year-control {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 1rem;
          order: 1;
      }

      .flow-type-buttons {
          display: flex;
          gap: 0.4rem;
          order: 2;
          min-width: fit-content;
      }

      .year-slider {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
      }

      @media (max-width: 900px) {
          .goods-type-detail-controls {
              flex-direction: column;
              gap: 1rem;
              padding: 0.8rem 1rem;
          }

          .year-control {
              width: 100%;
              order: 2;
          }

          .flow-type-buttons {
              width: 100%;
              justify-content: center;
              order: 1;
          }
      }
  `;
  document.head.appendChild(style);
})();