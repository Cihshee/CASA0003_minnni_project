const heatmapColors = [
  "#2166ac", "#338ec4", "#92c5de", "#cae2ee",
  "#fee5d9", "#fcbba1", "#fb6a4a", "#de2d26"
];
const heatmapBounds = [-25000, -1500, -500, -100, 0, 150, 200, 800, 10500];

let currentYear = 2016;
let allData = null;
let allRegions = null;
let allCountries = null;
let scrolling = false; // 防止滚动时触发多次更新
let ukTotalData = null; // 存储uk_total_20country.csv的数据
let map = null; // 存储 Mapbox 地图实例

// 设置 Mapbox 访问令牌
mapboxgl.accessToken = 'pk.eyJ1Ijoidmlja3ljaHUiLCJhIjoiY202MmRqb2I1MG52ejJsc2UzMTJlZ3ozaiJ9.davRHBoLdFZ5sFznPnhFUg';

window.addEventListener('load', initializeVisualization);

function initializeVisualization() {
// 初始化 Mapbox 地图
initializeMap();

// 首先加载uk_total_20country.csv数据，然后初始化图表
loadUkTotalData().then(() => {
  initializeLineCharts();
  initializeHeatmap();
});
}

// 初始化 Mapbox 地图
function initializeMap() {
  const mapContainer = document.getElementById('region-map-container');
  if (!mapContainer) return;
  
  // 创建 Mapbox 地图实例
  map = new mapboxgl.Map({
    container: 'region-map-container',
    style: 'mapbox://styles/vickychu/cmao6l3px01ku01s497w65rty',
    center: [42.15, 47.52], // 中心坐标
    zoom: 3,
  });
  
  // 添加导航控制
  map.addControl(new mapboxgl.NavigationControl(), 'top-right');
  
  // 等待地图加载完成
  map.on('load', function() {
    console.log('Mapbox map loaded successfully');
    
    // 设置初始年份过滤器
    const layerID = 'uk-trade-with-coords-dlzrad';
    updateMapYearFilter(layerID, currentYear);
  });
}

// 更新地图年份过滤器
function updateMapYearFilter(layerID, year) {
  if (!map || !map.isStyleLoaded()) return;
  
  try {
    // 设置特定图层的年份过滤器
    map.setFilter(layerID, ['==', ['get', 'Year'], parseInt(year)]);
    console.log(`Applied year filter to layer: ${layerID} for year ${year}`);
  } catch (err) {
    console.error(`Error setting filter for layer ${layerID}:`, err);
  }
}

// 加载uk_total_20country.csv数据
function loadUkTotalData() {
return new Promise((resolve, reject) => {
  d3.csv('public/data/uk_total_20country.csv')
    .then(data => {
      // 数据处理
      data.forEach(d => {
        d.Year = +d.Year;
        d.Trade_Balance_m = +d.Trade_Balance_m;
        d.Imports_m = +d.Imports_m;
        d.Exports_m = +d.Exports_m;
      });
      
      ukTotalData = data;
      resolve(data);
    })
    .catch(err => {
      console.error("Error loading UK total data:", err);
      reject(err);
    });
});
}

// 初始化折线图
function initializeLineCharts() {
  if (!ukTotalData) return;

  // 创建EU和非EU国家列表
  const euCountries = ["Belgium", "France", "Germany", "Ireland", "Italy", "Netherlands", "Poland", "Spain", "Sweden", "Rest of EU"];
  const nonEuCountries = ["Australia", "Canada", "China", "India", "Japan", "Norway", "Singapore", "Switzerland", "United States", "Rest of world"];

  // 处理数据为按年份分组的格式
  const euData = processLineChartData(ukTotalData, euCountries);
  const nonEuData = processLineChartData(ukTotalData, nonEuCountries);

  // 只为地图侧边栏创建折线图和说明文本，不再添加其他元素
  initMapSidebarCharts(euData, nonEuData);
}

// 初始化地图侧边栏的折线图和切换功能
function initMapSidebarCharts(euData, nonEuData) {
  // 找到侧边栏的图表容器
  const euChartContainer = document.getElementById('sidebar-eu-chart');
  const nonEuChartContainer = document.getElementById('sidebar-noneu-chart');
  const euTextContainer = document.getElementById('sidebar-eu-text');
  const nonEuTextContainer = document.getElementById('sidebar-noneu-text');
  
  if (!euChartContainer || !nonEuChartContainer || !euTextContainer || !nonEuTextContainer) {
    console.error('地图侧边栏容器未找到');
    return;
  }
  
  // 添加说明文本
  euTextContainer.innerHTML = 'Aside from Ireland, the UK has maintained trade deficits with most EU countries. Although these deficits temporarily narrowed from 2020 to 2021 due to the COVID-19 and transitional Brexit arrangements, they have widened since 2022, reflecting the structural disadvantages introduced by new trade barriers.';
  nonEuTextContainer.innerHTML = 'Meanwhile, the UK has actively pursued trade diversification beyond the EU. However, this "global re-engagement" has not resulted in a stable surplus structure. The UK continues to run trade deficits with many non-EU countries, suggesting that its global trade reset remains incomplete.';
  
  // 渲染侧边栏中的折线图
  renderSidebarChart(euChartContainer, euData, 'EU Countries Trade Balance', '#ff6347');
  renderSidebarChart(nonEuChartContainer, nonEuData, 'Non-EU Countries Trade Balance', '#2166ac');
  
  // 添加切换按钮功能
  const switchButton = document.querySelector('.chart-switch-btn');
  if (switchButton) {
    switchButton.addEventListener('click', function() {
      // 切换图表和文本的显示状态
      euChartContainer.classList.toggle('active');
      nonEuChartContainer.classList.toggle('active');
      euTextContainer.classList.toggle('active');
      nonEuTextContainer.classList.toggle('active');
      
      // 更新按钮文本
      if (euChartContainer.classList.contains('active')) {
        switchButton.textContent = 'Non-EU →';
      } else {
        switchButton.textContent = '← EU';
      }
      
      // 强制重新渲染当前活动的图表，解决切换后图表显示问题
      setTimeout(() => {
        if (euChartContainer.classList.contains('active')) {
          euChartContainer.innerHTML = '';
          renderSidebarChart(euChartContainer, euData, 'EU Countries', '#ff6347');
        } else {
          nonEuChartContainer.innerHTML = '';
          renderSidebarChart(nonEuChartContainer, nonEuData, 'Non-EU Countries', '#2166ac');
        }
      }, 50);
    });
  }
  
  // 初始化滑动时间轴
  initTimelineSlider();
}

// 专为侧边栏优化的图表渲染函数
function renderSidebarChart(container, data, title, mainColor) {
  // 清空容器
  container.innerHTML = '';
  
  // 设置适合侧边栏的边距
  const margin = { top: 40, right: 20, bottom: 40, left: 60 };
  const width = container.clientWidth - margin.left - margin.right;
  const height = container.clientHeight - margin.top - margin.bottom;

  // 创建SVG
  const svg = d3.select(container).append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // 确保所有年份都在横轴上显示 - 使用固定的年份范围
  const years = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
  
  // 创建X轴比例尺 - 使用点比例尺确保均匀间距
  const x = d3.scalePoint()
    .domain(years)
    .range([0, width]);

  // 设置Y轴刻度 - 统一两个图表的刻度
  const yRange = [-60000, 10000]; // 固定的Y轴范围
  
  // 设置Y轴比例尺
  const y = d3.scaleLinear()
    .domain(yRange)
    .range([height, 0]);

  // 创建坐标轴 - 显示所有年份
  const xAxis = d3.axisBottom(x);

  // 设置Y轴刻度 - 统一刻度并使用b单位
  const yAxisTicks = [-60000, -50000, -40000, -30000, -20000, -10000, 0, 10000];
  
  // 使用相同的格式化函数，确保两个图表一致
  const yAxis = d3.axisLeft(y)
    .tickValues(yAxisTicks)
    .tickFormat(d => `£${d === 0 ? '0' : d > 0 ? (d/1000) + 'b' : (-d/1000) + 'b'}`);

  // 添加X轴
  svg.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${height})`)
    .call(xAxis)
    .selectAll('text')
    .style('fill', '#fff')
    .style('font-size', '10px')
    .attr('transform', 'rotate(-25)')
    .style('text-anchor', 'end');

  // 添加Y轴
  svg.append('g')
    .attr('class', 'y-axis')
    .call(yAxis)
    .selectAll('text')
    .style('fill', '#fff')
    .style('font-size', '10px');

  // 添加标题
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', -20)
    .attr('text-anchor', 'middle')
    .style('font-size', '12px')
    .style('fill', '#fff')
    .style('font-weight', 'bold')
    .text(title);

  // 添加0线
  svg.append('line')
    .attr('class', 'zero-line')
    .attr('x1', 0)
    .attr('x2', width)
    .attr('y1', y(0))
    .attr('y2', y(0))
    .attr('stroke', '#ffffff')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '2,2');

  // 创建线条生成器 - 修改为适应点比例尺
  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.value))
    .curve(d3.curveMonotoneX);

  // 获取国家列表(排除year和total)
  const countries = Object.keys(data[0])
    .filter(key => key !== 'year' && key !== 'total');

  // 优化颜色方案
  const betterColors = [
    "#e06c75", "#61afef", "#c678dd", "#d4d4d8",
    "#56b6c2", "#a39fea", "#ff9e4a", "#e5c07b", 
    "#7590db", "#ff5277"
  ];

  // 为每个国家创建一条线
  countries.forEach((country, i) => {
    const countryData = data.map(d => ({ year: d.year, value: d[country] }));
    const countryColor = betterColors[i % betterColors.length];
    
    // 绘制线条
    svg.append('path')
      .datum(countryData)
      .attr('class', `line-${country.replace(/\s+/g, '-').toLowerCase()}`)
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', countryColor)
      .attr('stroke-width', 1.5);
  });

  // 为图例创建一个单独的容器，设置在图表下方
  const legendWrapper = document.createElement('div');
  legendWrapper.className = 'legend-wrapper';
  legendWrapper.style.position = 'relative';
  legendWrapper.style.width = '90%';
  legendWrapper.style.marginTop = '0';
  legendWrapper.style.paddingBottom = '0';
  legendWrapper.style.marginLeft = 'auto';
  legendWrapper.style.marginRight = 'auto';
  container.appendChild(legendWrapper);
  
  // 创建底部水平图例 - 两行，每行5个
  const legendContainer = document.createElement('div');
  legendContainer.className = 'sidebar-legend';
  legendContainer.style.display = 'grid';
  legendContainer.style.gridTemplateColumns = 'repeat(5, 1fr)';
  legendContainer.style.gap = '5px 2px';
  legendContainer.style.marginBottom = '0';
  legendContainer.style.textAlign = 'center';
  legendWrapper.appendChild(legendContainer);
  
  // 显示前10个国家
  const displayCountries = countries.slice(0, 10);
  displayCountries.forEach((country, i) => {
    const countryColor = betterColors[i % betterColors.length];
    
    const legendItem = document.createElement('div');
    legendItem.className = 'sidebar-legend-item';
    legendItem.style.width = 'auto';
    legendItem.style.margin = '0';
    legendItem.style.justifyContent = 'center';
    
    const colorDot = document.createElement('span');
    colorDot.className = 'sidebar-legend-color';
    colorDot.style.backgroundColor = countryColor;
    
    const countryName = document.createElement('span');
    countryName.className = 'sidebar-legend-text';
    countryName.textContent = country;
    
    legendItem.appendChild(colorDot);
    legendItem.appendChild(countryName);
    legendContainer.appendChild(legendItem);
  });
  
  // 添加交互功能 - 鼠标悬停显示详细信息
  // 创建提示框
  let tooltip = d3.select('body').select('.sidebar-tooltip');
  if (tooltip.empty()) {
    tooltip = d3.select('body')
      .append('div')
      .attr('class', 'sidebar-tooltip')
      .style('position', 'absolute')
      .style('pointer-events', 'none')
      .style('background', 'rgba(40, 40, 48, 0.9)')
      .style('color', '#fff')
      .style('padding', '8px 12px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('box-shadow', '0 2px 6px rgba(0,0,0,0.3)')
      .style('z-index', '1000')
      .style('opacity', '0')
      .style('transition', 'opacity 0.2s');
  }
  
  // 添加垂直参考线
  const guideline = svg.append('line')
    .attr('class', 'guideline')
    .attr('x1', 0)
    .attr('y1', 0)
    .attr('x2', 0)
    .attr('y2', height)
    .style('stroke', '#fff')
    .style('stroke-width', '1px')
    .style('stroke-dasharray', '3,3')
    .style('opacity', '0');
  
  // 添加年份标签
  const yearLabel = svg.append('text')
    .attr('class', 'year-label')
    .attr('text-anchor', 'middle')
    .style('fill', '#fff')
    .style('font-size', '10px')
    .style('font-weight', 'bold')
    .style('opacity', '0');
  
  // 添加交互区域
  const bisect = d3.bisector(d => d.year).left;
  
  svg.append('rect')
    .attr('width', width)
    .attr('height', height)
    .style('fill', 'none')
    .style('pointer-events', 'all')
    .on('mousemove', function(event) {
      // 获取鼠标位置
      const mouseX = d3.pointer(event)[0];
      const x0 = x.invert(mouseX);
      
      // 找到最接近的数据点
      const i = bisect(data, x0, 1);
      const d0 = data[i - 1];
      const d1 = data[i] || d0;
      const d = x0 - d0.year > d1.year - x0 ? d1 : d0;
      
      // 更新参考线位置
      guideline
        .attr('x1', x(d.year))
        .attr('x2', x(d.year))
        .style('opacity', 1);
      
      // 更新年份标签
      yearLabel
        .attr('x', x(d.year))
        .attr('y', -5)
        .text(d.year)
        .style('opacity', 1);
      
      // 构建提示框内容
      let tooltipContent = `<strong>Year: ${d.year}</strong><br>`;
      
      // 移除之前的点
      svg.selectAll('.hover-dot').remove();
      
      // 为每个国家添加点和提示内容
      countries.forEach((country, i) => {
        const countryColor = betterColors[i % betterColors.length];
        tooltipContent += `<span style="color:${countryColor}">●</span> ${country}: £${d3.format(",")(d[country])} million<br>`;
        
        // 添加高亮点
        svg.append('circle')
          .attr('class', 'hover-dot')
          .attr('cx', x(d.year))
          .attr('cy', y(d[country]))
          .attr('r', 4)
          .attr('fill', countryColor)
          .attr('stroke', '#222')
          .attr('stroke-width', 1);
      });
      
      // 显示提示框
      tooltip
        .html(tooltipContent)
        .style('left', `${event.pageX + 10}px`)
        .style('top', `${event.pageY - 28}px`)
        .style('opacity', 0.95);
    })
    .on('mouseout', function() {
      // 隐藏提示框和参考线
      tooltip.style('opacity', 0);
      guideline.style('opacity', 0);
      yearLabel.style('opacity', 0);
      
      // 移除所有高亮点
      svg.selectAll('.hover-dot').remove();
    });
}

// 初始化滑动时间轴
function initTimelineSlider() {
  const timelineContainer = document.querySelector('.timeline-years');
  const timelineTrack = document.querySelector('.timeline-track');
  const timelineSlider = document.querySelector('.timeline-slider');
  
  if (!timelineContainer || !timelineTrack || !timelineSlider) {
    console.error('时间轴元素未找到');
    return;
  }
  
  // 获取年份范围
  const years = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
  const containerWidth = timelineContainer.clientWidth;
  const trackPadding = 20; // 轨道两端的内边距
  const trackWidth = containerWidth - (trackPadding * 2);
  
  // 创建刻度和标签
  years.forEach((year, i) => {
    const position = trackPadding + (i * (trackWidth / (years.length - 1)));
    
    // 创建刻度
    const tick = document.createElement('div');
    tick.className = 'timeline-tick';
    tick.style.left = `${position}px`;
    timelineContainer.appendChild(tick);
    
    // 创建标签
    const label = document.createElement('div');
    label.className = 'timeline-year';
    label.textContent = year;
    label.style.left = `${position}px`;
    timelineContainer.appendChild(label);
  });
  
  // 初始化滑块位置 - 默认年份为2016
  let currentYearIndex = 0; // 2016年在数组中的索引为0
  updateSliderPosition(currentYearIndex);
  
  // 为滑块添加拖动功能
  let isDragging = false;
  
  timelineSlider.addEventListener('mousedown', startDrag);
  timelineSlider.addEventListener('touchstart', startDrag, { passive: false });
  
  window.addEventListener('mousemove', drag);
  window.addEventListener('touchmove', drag, { passive: false });
  
  window.addEventListener('mouseup', endDrag);
  window.addEventListener('touchend', endDrag);
  
  // 点击轨道时移动滑块
  timelineTrack.addEventListener('click', function(e) {
    const trackRect = timelineTrack.getBoundingClientRect();
    const clickPosition = e.clientX - trackRect.left;
    const segmentWidth = trackWidth / (years.length - 1);
    
    // 找到最接近点击位置的年份索引
    const newIndex = Math.round(clickPosition / segmentWidth);
    if (newIndex >= 0 && newIndex < years.length) {
      currentYearIndex = newIndex;
      updateSliderPosition(currentYearIndex);
      updateYearInfo(years[currentYearIndex]);
    }
  });
  
  function startDrag(e) {
    e.preventDefault();
    isDragging = true;
    timelineSlider.style.cursor = 'grabbing';
  }
  
  function drag(e) {
    if (!isDragging) return;
    
    e.preventDefault();
    
    const trackRect = timelineTrack.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    
    if (!clientX) return;
    
    const dragPosition = clientX - trackRect.left;
    const segmentWidth = trackWidth / (years.length - 1);
    
    // 将拖动位置限制在轨道范围内
    const constrainedPosition = Math.max(0, Math.min(trackWidth, dragPosition));
    
    // 找到最接近拖动位置的年份索引
    const newIndex = Math.round(constrainedPosition / segmentWidth);
    if (newIndex >= 0 && newIndex < years.length && newIndex !== currentYearIndex) {
      currentYearIndex = newIndex;
      updateSliderPosition(currentYearIndex);
      updateYearInfo(years[currentYearIndex]);
    }
  }
  
  function endDrag() {
    isDragging = false;
    timelineSlider.style.cursor = 'pointer';
  }
  
  function updateSliderPosition(index) {
    const segmentWidth = trackWidth / (years.length - 1);
    const position = trackPadding + (index * segmentWidth);
    timelineSlider.style.left = `${position}px`;
  }
  
  function updateYearInfo(year) {
    // 更新全局当前年份并重新渲染热力图
    if (currentYear !== year && allData && allRegions && allCountries) {
      currentYear = year;
      renderHeatmap(allData, allRegions, allCountries, currentYear);
      
      // 更新 Mapbox 地图的年份过滤
      const layerID = 'uk-trade-with-coords-dlzrad';
      updateMapYearFilter(layerID, year);
    }
  }
}

// 处理折线图数据
function processLineChartData(data, countryList) {
  // 按年份分组
  const yearGroups = d3.group(data, d => d.Year);

  // 转换为数组格式，适合折线图
  const chartData = Array.from(yearGroups, ([year, values]) => {
    // 初始化年份数据
    const yearData = {
      year: year,
      total: 0
    };
    
    // 筛选出当前国家列表包含的国家，并计算总和
    const filteredValues = values.filter(d => countryList.includes(d.Country20));
    
    filteredValues.forEach(d => {
      yearData.total += d.Trade_Balance_m;
      yearData[d.Country20] = d.Trade_Balance_m;
    });
    
    return yearData;
  });

  // 按年份排序
  return chartData.sort((a, b) => a.year - b.year);
}

// 渲染折线图
function renderLineChart(container, data, title, mainColor, isSidebar = false) {
  // 根据是否为侧边栏调整边距和样式
  const margin = isSidebar ? 
    { top: 10, right: 30, bottom: 30, left: 40 } : 
    { top: 20, right: 120, bottom: 30, left: 80 };

  const width = container.clientWidth - margin.left - margin.right;
  const height = container.clientHeight - margin.top - margin.bottom;

  // 创建SVG
  const svg = d3.select(container).append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // 创建比例尺
  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.year))
    .range([0, width]);

  // 设置Y轴比例尺 - 为EU图表设置自定义tick间隔
  const y = d3.scaleLinear()
    .domain([
      d3.min(data, d => d3.min(Object.entries(d)
        .filter(([key]) => key !== 'year' && key !== 'total')
        .map(([_, value]) => value))) * 1.1,
      d3.max(data, d => d3.max(Object.entries(d)
        .filter(([key]) => key !== 'year' && key !== 'total')
        .map(([_, value]) => value))) * 1.1
    ])
    .range([height, 0]);

  // 创建坐标轴
  const xAxis = d3.axisBottom(x)
    .tickFormat(d3.format('d')) // 显示完整年份
    .ticks(isSidebar ? 5 : data.length); // 侧边栏减少刻度数量

  // 为EU图表设置固定10000间隔的刻度
  let yAxis;
  if (title === 'EU Countries') {
    // 计算适合的tick值，以10000为间隔
    const yMin = Math.floor(y.domain()[0] / 10000) * 10000;
    const yMax = Math.ceil(y.domain()[1] / 10000) * 10000;
    
    // 侧边栏中使用较少的刻度
    const step = isSidebar ? 20000 : 10000;
    const tickValues = [];
    
    // 从-40000开始而不是最低值，跳过-50000
    for (let i = Math.max(-40000, yMin); i <= yMax; i += step) {
      tickValues.push(i);
    }
    
    yAxis = d3.axisLeft(y)
      .tickValues(tickValues)
      .tickFormat(d => isSidebar ? `£${d/1000}k` : `£${d3.format(",")(d)}m`); // 侧边栏简化显示
  } else {
    // 非EU图表使用默认刻度计算
    yAxis = d3.axisLeft(y)
      .tickFormat(d => isSidebar ? `£${d/1000}k` : `£${d3.format(",")(d)}m`); // 侧边栏简化显示
  }

  // 添加X轴 - 增大文字
  svg.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${height})`)
    .call(xAxis)
    .selectAll('text')
    .style('fill', '#fff')
    .style('font-size', isSidebar ? '10px' : '13px'); // 侧边栏缩小文字

  // 添加Y轴 - 增大文字
  svg.append('g')
    .attr('class', 'y-axis')
    .call(yAxis)
    .selectAll('text')
    .style('fill', '#fff')
    .style('font-size', isSidebar ? '10px' : '13px'); // 侧边栏缩小文字

  // 为侧边栏图表添加标题
  if (isSidebar) {
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', -2)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#fff')
      .style('font-weight', 'bold')
      .text(title === 'EU Countries' ? 'EU Countries Trade Balance' : 'Non-EU Countries Trade Balance');
  }

  // 添加网格线 - 侧边栏中减少网格线
  if (!isSidebar) {
    svg.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data(y.ticks())
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', d => y(d))
      .attr('y2', d => y(d))
      .attr('stroke', '#555')
      .attr('stroke-dasharray', '3,3')
      .attr('stroke-width', 0.5);
  }

  // 添加0m特殊线
  svg.append('line')
    .attr('class', 'zero-line')
    .attr('x1', 0)
    .attr('x2', width)
    .attr('y1', y(0))
    .attr('y2', y(0))
    .attr('stroke', '#ffffff')  // 白色，使其更突出
    .attr('stroke-width', isSidebar ? 1 : 1.5)  // 侧边栏减小线宽
    .attr('stroke-dasharray', '2,2');  // 虚线样式

  // 创建线条生成器
  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.value))
    .curve(d3.curveMonotoneX);

  // 获取国家列表(排除year和total)
  const countries = Object.keys(data[0])
    .filter(key => key !== 'year' && key !== 'total');

  // 优化颜色方案，确保所有颜色有高区分度
  const betterColors = [
    "#e06c75", // 粉红色
    "#61afef", // 蓝色
    "#c678dd", // 紫色
    "#d4d4d8", // 偏白色
    "#56b6c2", // 青色
    "#a39fea", // 淡紫色
    "#ff9e4a", // 橙色
    "#e5c07b", // 淡黄色
    "#7590db", // 淡蓝色
    "#ff5277"  // 鲜红色
  ];

  // 为每个国家创建一条线
  countries.forEach((country, i) => {
    const countryData = data.map(d => ({ year: d.year, value: d[country] }));
    const countryColor = betterColors[i % betterColors.length];
    
    // 绘制线条
    svg.append('path')
      .datum(countryData)
      .attr('class', `line-${country.replace(/\s+/g, '-').toLowerCase()}`)
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', countryColor)
      .attr('stroke-width', isSidebar ? 1.5 : 2.2); // 侧边栏减小线宽
  });

  // 添加图例 - 侧边栏不显示图例或使用简化版本
  if (!isSidebar) {
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width + 10}, 0)`);

    // 添加国家图例 - 单列垂直排布
    countries.forEach((country, i) => {
      const countryColor = betterColors[i % betterColors.length];
      
      legend.append('line')
        .attr('x1', 0)
        .attr('x2', 20)
        .attr('y1', 5 + i * 24)
        .attr('y2', 5 + i * 24)
        .attr('stroke', countryColor)
        .attr('stroke-width', 2.2);
      
      legend.append('text')
        .attr('x', 25)
        .attr('y', 5 + i * 24 + 4)
        .text(country)
        .style('font-size', '13px')
        .style('fill', '#fff');
    });
  } else {
    // 侧边栏使用简化的图例 - 水平布局，只显示前5个国家
    const topCountries = countries.slice(0, 5);
    const legendHeight = height + margin.bottom - 5;
    
    const legend = svg.append('g')
      .attr('class', 'sidebar-legend')
      .attr('transform', `translate(0, ${legendHeight})`);
    
    topCountries.forEach((country, i) => {
      const countryColor = betterColors[i % betterColors.length];
      const xPos = i * (width / topCountries.length);
      
      legend.append('circle')
        .attr('cx', xPos)
        .attr('cy', 0)
        .attr('r', 3)
        .attr('fill', countryColor);
        
      legend.append('text')
        .attr('x', xPos + 5)
        .attr('y', 3)
        .text(country.length > 8 ? country.substring(0, 8) + '...' : country)
        .style('font-size', '8px')
        .style('fill', '#ccc');
    });
  }

  // 仅为非侧边栏图表创建交互提示
  if (!isSidebar) {
    // 创建提示框
    const tooltip = d3.select('body').select('.tooltip');
    let tooltipDiv;

    if (tooltip.empty()) {
      tooltipDiv = d3.select('body')
        .append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0);
    } else {
      tooltipDiv = tooltip;
    }

    // 添加垂直引导线，初始时隐藏
    const guideline = svg.append('line')
      .attr('class', 'guideline')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', 0)
      .attr('y2', height)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '5,5')
      .style('opacity', 0);

    // 添加年份标签，初始时隐藏
    const yearLabel = svg.append('text')
      .attr('class', 'year-label')
      .attr('x', 0)
      .attr('y', -8)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', '#fff')
      .style('opacity', 0);

    // 添加透明的交互层，用于显示提示信息
    const bisect = d3.bisector(d => d.year).left;

    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .style('fill', 'none')
      .style('pointer-events', 'all')
      .on('mousemove', function(event) {
        const mouseX = d3.pointer(event)[0];
        const x0 = x.invert(mouseX);
        const i = bisect(data, x0, 1);
        const d0 = data[i - 1];
        const d1 = data[i] || d0;
        const d = x0 - d0.year > d1.year - x0 ? d1 : d0;
        
        // 更新时间轴虚线位置
        guideline
          .attr('x1', x(d.year))
          .attr('x2', x(d.year))
          .style('opacity', 1);
          
        // 更新年份标签
        yearLabel
          .attr('x', x(d.year))
          .text(d.year)
          .style('opacity', 1);
        
        // 更新提示框内容
        let tooltipContent = `<strong>Year: ${d.year}</strong><br>`;
        
        // 清除之前创建的所有点
        svg.selectAll('.hover-dot').remove();
        
        // 为当前年份的每个国家创建点
        countries.forEach(country => {
          const countryColor = betterColors[countries.indexOf(country) % betterColors.length];
          tooltipContent += `<span style="color:${countryColor}">●</span> ${country}: £${d3.format(",")(d[country])} million<br>`;
          
          // 创建当前年份的点
          svg.append('circle')
            .attr('class', 'hover-dot')
            .attr('cx', x(d.year))
            .attr('cy', y(d[country]))
            .attr('r', 4)
            .attr('fill', countryColor)
            .attr('stroke', '#333')
            .attr('stroke-width', 2);
        });
        
        tooltipDiv.html(tooltipContent)
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 28}px`)
          .style('opacity', 0.9);
      })
      .on('mouseout', function() {
        // 隐藏提示框
        tooltipDiv.style('opacity', 0);
        
        // 隐藏虚线和年份标签
        guideline.style('opacity', 0);
        yearLabel.style('opacity', 0);
        
        // 移除所有悬停时创建的点
        svg.selectAll('.hover-dot').remove();
      });
  }
}

function initializeHeatmap() {
const container = document.getElementById('heatmap-container');
if (!container) return;
container.innerHTML = '';

// 不需要在这里添加额外的间距，我们已经在折线图部分添加了足够的间距

// 创建时间轴容器替代原来的年份选择器
const timelineContainer = document.createElement('div');
timelineContainer.className = 'timeline-container';
timelineContainer.style.width = '100%';
timelineContainer.style.maxWidth = '800px';
timelineContainer.style.margin = '5px auto';
timelineContainer.style.padding = '10px 0';
timelineContainer.style.position = 'relative';
container.appendChild(timelineContainer);

// 添加一个容器用于SVG时间轴
const timelineSvg = document.createElement('div');
timelineSvg.id = 'timeline-svg';
timelineSvg.style.height = '80px';
timelineContainer.appendChild(timelineSvg);

const svgContainer = document.createElement('div');
svgContainer.id = 'heatmap-svg';
container.appendChild(svgContainer);

loadData();
}

function loadData() {
const svgContainer = document.getElementById('heatmap-svg');
svgContainer.innerHTML = '<div class="loading">Loading data, please wait…</div>';

d3.csv('public/data/region_trade_20country.csv')
  .then(data => {
    data.forEach(d => {
      d.Year = +d.Year;
      d.Trade_Balance_m = +d.Trade_Balance_m;
      d.Imports_m = +d.Imports_m;
      d.Exports_m = +d.Exports_m;
    });

    // 保存数据以便在滚动时使用
    allData = data;
    allRegions = Array.from(new Set(data.map(d => d.Region)));
    allCountries = Array.from(new Set(data.map(d => d.Country20)));

    // 获取所有在HTML中定义的年份
    const stepElements = document.querySelectorAll('.step[data-year]');
    const years = Array.from(stepElements).map(el => +el.getAttribute('data-year')).sort();
    
    // 为最后一个步骤添加足够的底部填充，确保能够完全滚动到视图中
    const lastStep = document.querySelector('.step[data-year="2024"]');
    if (lastStep) {
      // 添加填充元素确保可以完全滚动到最后一个步骤
      const scrollContainer = lastStep.closest('.scroll-text') || lastStep.parentElement;
      if (scrollContainer) {
        // 确保足够的底部填充
        scrollContainer.style.paddingBottom = '300px';
      }
    }
    
    // 创建时间轴
    createTimeline(years);
    
    // 渲染热力图
    renderHeatmap(data, allRegions, allCountries, currentYear);
    
    // 设置滚动监听
    setupScrollListener(years);
  })
  .catch(err => {
    svgContainer.innerHTML = `<div class="error">Error loading data: ${err.message}</div>`;
  });
}

function createTimeline(years) {
const container = d3.select('#timeline-svg');
container.html('');

const width = container.node().clientWidth;
const height = 80;

// 创建SVG元素
const svg = container.append('svg')
  .attr('width', width)
  .attr('height', height)
  .style('overflow', 'visible');

// 计算年份比例尺 - 简化为直接映射到离散年份
const timeScale = d3.scalePoint()
  .domain(years)
  .range([50, width - 50]);

// 绘制时间轴线
svg.append('line')
  .attr('x1', 0)
  .attr('y1', height / 2)
  .attr('x2', width)
  .attr('y2', height / 2)
  .attr('stroke', '#ccc')
  .attr('stroke-width', 2);

// 为每个年份添加刻度和文本
const yearMarks = svg.selectAll('.year-mark')
  .data(years)
  .enter()
  .append('g')
  .attr('class', 'year-mark')
  .attr('transform', d => `translate(${timeScale(d)}, ${height/2})`)
  .style('cursor', 'pointer')
  .on('click', (event, d) => {
    if (scrolling || d === currentYear) return;
    
    currentYear = d;
    updateTimelineSelection(svg, timeScale, years);
    renderHeatmap(allData, allRegions, allCountries, d);
    
    // 滚动到对应年份的步骤
    scrollToYear(d);
  });

// 添加刻度线
yearMarks.append('line')
  .attr('x1', 0)
  .attr('y1', 0)
  .attr('x2', 0)
  .attr('y2', 10)
  .attr('stroke', d => d === currentYear ? '#ff6347' : '#888')
  .attr('stroke-width', 2);

// 添加年份文本
yearMarks.append('text')
  .attr('x', 0)
  .attr('y', 25)
  .attr('text-anchor', 'middle')
  .style('font-size', '14px')
  .style('fill', d => d === currentYear ? '#ff6347' : '#555')
  .style('font-weight', d => d === currentYear ? 'bold' : 'normal')
  .text(d => d);

// 简化的拖动功能 - 直接吸附到最近年份
const drag = d3.drag()
  .on('drag', function(event) {
    // 找到最接近的年份位置
    const xPos = event.x;
    let closestYear = years[0];
    let minDistance = Math.abs(timeScale(years[0]) - xPos);
    
    years.forEach(year => {
      const distance = Math.abs(timeScale(year) - xPos);
      if (distance < minDistance) {
        minDistance = distance;
        closestYear = year;
      }
    });
    
    // 直接移动到最接近的年份位置
    d3.select(this)
      .attr('transform', `translate(${timeScale(closestYear)}, ${height/2 - 40})`);
    
    // 如果年份变了，立即更新数据
    if (closestYear !== currentYear) {
      currentYear = closestYear;
      
      // 更新热力图
      renderHeatmap(allData, allRegions, allCountries, currentYear);
      
      // 更新其他年份标记样式
      svg.selectAll('.year-mark')
        .selectAll('line')
        .attr('stroke', d => d === currentYear ? '#ff6347' : '#888');
      
      svg.selectAll('.year-mark')
        .selectAll('text')
        .style('fill', d => d === currentYear ? '#ff6347' : '#555')
        .style('font-weight', d => d === currentYear ? 'bold' : 'normal');
      
      // 更新小球上的文字
      d3.select(this).select('text')
        .text(`'${String(currentYear).slice(-2)}`);
      
      // 滚动到对应的年份步骤
      scrollToYear(currentYear);
    }
  });

// 添加当前年份标记
const currentYearGroup = svg.append('g')
  .attr('class', 'current-year-marker')
  .attr('transform', `translate(${timeScale(currentYear)}, ${height/2 - 40})`)
  .style('cursor', 'grab')
  .call(drag);

currentYearGroup.append('circle')
  .attr('r', 20)
  .attr('fill', '#ff6347');

currentYearGroup.append('text')
  .attr('x', 0)
  .attr('y', 5)
  .attr('text-anchor', 'middle')
  .attr('pointer-events', 'none') // 文本不响应鼠标事件，以免干扰拖动
  .style('fill', 'white')
  .style('font-weight', 'bold')
  .style('font-size', '16px')
  .text(`'${String(currentYear).slice(-2)}`);

// 辅助函数 - 滚动到特定年份
function scrollToYear(year) {
  scrolling = true;
  const yearStep = document.querySelector(`.step[data-year="${year}"]`);
  if (yearStep) {
    // 特殊处理2024年
    if (year === 2024) {
      // 找到滚动容器
      const scrollContainer = yearStep.closest('.scroll-text') || yearStep.parentElement;
      if (scrollContainer) {
        // 滚动到容器底部附近，确保步骤完全可见
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight - scrollContainer.clientHeight * 1.2,
          behavior: 'smooth'
        });
      } else {
        yearStep.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      // 普通滚动
      yearStep.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  setTimeout(() => { scrolling = false; }, 1000);
}
}

function updateTimelineSelection(svg, timeScale, years) {
  // 更新所有年份标记的样式
  svg.selectAll('.year-mark')
    .selectAll('line')
    .attr('stroke', d => d === currentYear ? '#ff6347' : '#888');

  svg.selectAll('.year-mark')
    .selectAll('text')
    .style('fill', d => d === currentYear ? '#ff6347' : '#555')
    .style('font-weight', d => d === currentYear ? 'bold' : 'normal');

  // 重要：获取当前年份标记的实际X坐标，确保完全对齐
  // 首先找到当前年份的标记
  const currentYearMark = svg.selectAll('.year-mark')
    .filter(d => d === currentYear)
    .node();
  
  let xPosition;
  if (currentYearMark) {
    // 提取实际的transform值，确保使用相同的坐标
    const transform = d3.select(currentYearMark).attr('transform');
    const match = /translate\(([^,]+),/.exec(transform);
    xPosition = match ? parseFloat(match[1]) : timeScale(currentYear);
  } else {
    xPosition = timeScale(currentYear);
  }

  // 使用精确的X坐标更新小球位置
  svg.select('.current-year-marker')
    .transition()
    .duration(300)
    .attr('transform', `translate(${xPosition}, ${80/2 - 40})`);

  // 更新当前年份标记里的文本
  svg.select('.current-year-marker text')
    .text(`'${String(currentYear).slice(-2)}`);
}

function setupScrollListener(years) {
// 使用节流函数减少更新频率
let lastScrollTime = 0;
const scrollThrottle = 300; // 300ms内只处理一次滚动
let pendingScroll = false;

// 创建观察器来检测哪个步骤在视图中
const observer = new IntersectionObserver((entries) => {
  if (scrolling) return; // 如果是按钮触发的滚动，忽略
  
  const now = Date.now();
  if (now - lastScrollTime < scrollThrottle) {
    if (!pendingScroll) {
      pendingScroll = true;
      setTimeout(() => {
        processScrollEntries(entries);
        pendingScroll = false;
        lastScrollTime = Date.now();
      }, scrollThrottle);
    }
    return;
  }
  
  lastScrollTime = now;
  processScrollEntries(entries);
}, {
  threshold: 0.5, // 使用单一阈值
  rootMargin: '-10% 0px -10% 0px' // 缩小检测范围
});

function processScrollEntries(entries) {
  // 找到当前最高交叉比例的步骤
  let bestEntry = null;
  let maxRatio = 0;
  
  entries.forEach(entry => {
    if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
      maxRatio = entry.intersectionRatio;
      bestEntry = entry;
    }
  });
  
  // 如果找到了最佳步骤，更新年份
  if (bestEntry) {
    const year = +bestEntry.target.getAttribute('data-year');
    if (year && year !== currentYear) {
      currentYear = year;
      
      // 更新时间轴选择
      const timelineContainer = d3.select('#timeline-svg');
      if (!timelineContainer.empty()) {
        const width = timelineContainer.node().clientWidth;
        const timeScale = d3.scalePoint()
          .domain(years)
          .range([50, width - 50]);
        updateTimelineSelection(timelineContainer.select('svg'), timeScale, years);
      }
      
      renderHeatmap(allData, allRegions, allCountries, year);
    }
  }
}


  // 监测所有步骤
  document.querySelectorAll('.step[data-year]').forEach(step => {
    observer.observe(step);
  });
  
  // 特别处理最后一个步骤（2024年）
  const lastStep = document.querySelector('.step[data-year="2024"]');
  if (lastStep) {
    // 创建专门用于2024年的观察器，使用更高的阈值
    const lastYearObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        // 只有当元素大部分进入视图才触发
        if (entry.isIntersecting && entry.intersectionRatio > 0.7 && !scrolling) {
          const year = +entry.target.getAttribute('data-year');
          if (year === 2024 && currentYear !== 2024) {
            currentYear = 2024;
            
            // 更新时间轴和热力图
            const timelineContainer = d3.select('#timeline-svg');
            if (!timelineContainer.empty()) {
              const width = timelineContainer.node().clientWidth;
              const timeScale = d3.scalePoint()
                .domain(years)
                .range([50, width - 50]);
              updateTimelineSelection(timelineContainer.select('svg'), timeScale, years);
            }
            
            renderHeatmap(allData, allRegions, allCountries, 2024);
          }
        }
      });
    }, {
      threshold: [0.5, 0.7, 0.9], // 使用更高的阈值
      rootMargin: '0px 0px 0px 0px' // 移除扩大的底部检测区域
    });
    
    lastYearObserver.observe(lastStep);
    
    // 修改滚动容器的滚动事件处理
    const scrollContainer = lastStep.closest('.scroll-text') || lastStep.parentElement;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', () => {
        if (scrolling) return;
        
        // 检测是否滚动到更接近底部的位置
        const isNearBottom = scrollContainer.scrollTop + scrollContainer.clientHeight >= 
                            scrollContainer.scrollHeight - 50; // 更接近底部才触发
        
        if (isNearBottom && currentYear !== 2024) {
          currentYear = 2024;
          
          // 更新时间轴和热力图
          const timelineContainer = d3.select('#timeline-svg');
          if (!timelineContainer.empty()) {
            const width = timelineContainer.node().clientWidth;
            const timeScale = d3.scalePoint()
              .domain(years)
              .range([50, width - 50]);
            updateTimelineSelection(timelineContainer.select('svg'), timeScale, years);
          }
          
          renderHeatmap(allData, allRegions, allCountries, 2024);
        }
      });
    }
  }
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

  // 获取当前容器宽度
  const containerWidth = container.node().clientWidth;

  // 自适应边距
  const margin = { 
    top: 20,
    right: Math.max(120, containerWidth * 0.15),
    bottom: Math.max(100, containerWidth * 0.12),
    left: Math.max(40, containerWidth * 0.05) 
  };
  
  // 自适应宽高
  const width = Math.max(300, containerWidth - margin.left - margin.right);
  const height = Math.max(300, width * 0.6);

  // 响应式SVG
  const svg = container.append('svg')
    .attr('width', '100%')
    .attr('height', height + margin.top + margin.bottom)
    .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .style('overflow', 'visible')
    .style('display', 'block')
    .style('margin', 'auto')
    .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

  // 定义EU和非EU国家，使用和折线图相同的顺序
  const euCountries = ["Belgium", "France", "Germany", "Ireland", "Italy", "Netherlands", "Poland", "Spain", "Sweden", "Rest of EU"];
  const nonEuCountries = ["Australia", "Canada", "China", "India", "Japan", "Norway", "Singapore", "Switzerland", "United States", "Rest of world"];
  
  // 组合国家列表，EU国家在前，非EU国家在后
  const orderedCountries = [...euCountries, ...nonEuCountries];
  
  // 只使用实际存在于数据中的国家
  const filteredOrderedCountries = orderedCountries.filter(country => countries.includes(country));

  const xScale = d3.scaleBand()
    .domain(filteredOrderedCountries)
    .range([0, width])
    .padding(0.1);
  const yScale = d3.scaleBand()
    .domain(regions)
    .range([0, height])
    .padding(0.1);
  const colorScale = d3.scaleThreshold()
    .domain(heatmapBounds.slice(1, -1))
    .range(heatmapColors);

  let tooltip = d3.select('body').select('.tooltip');
  if (tooltip.empty()) {
    tooltip = d3.select('body')
      .append('div')
      .attr('class', 'tooltip');
  }

  // 确定当前需要高亮的区域
  let highlightedRegion = null;
  if (year === 2019) {
    highlightedRegion = 'Scotland';
  } else if (year === 2021) {
    highlightedRegion = 'Northern Ireland';
  } else if (year === 2023) {
    highlightedRegion = 'London';
  }

  // 创建一个底层容器来放置所有热图单元格
  const heatmapCellsGroup = svg.append('g')
    .attr('class', 'heatmap-cells');

  // 创建悬停高亮遮罩的容器
  const hoverMaskGroup = svg.append('g')
    .attr('class', 'hover-masks')
    .style('opacity', 0); // 初始化为隐藏状态

  // 创建暗化遮罩容器（用于悬停效果）
  const hoverDimmingGroup = svg.append('g')
    .attr('class', 'hover-dimming')
    .style('opacity', 0); // 初始化为隐藏状态
    
  // 为主题高亮创建暗化遮罩容器（基于年份的高亮）
  const dimMaskGroup = svg.append('g')
    .attr('class', 'year-dimming-masks')
    .style('opacity', 0); // 初始化为隐藏状态

  // 先创建所有坐标轴，这样可以对它们设置ID，方便后续操作
  // 创建X轴（底部国家标签）
  const xAxisGroup = svg.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(xScale));

  // 为每个国家标签添加唯一ID
  xAxisGroup.selectAll('.tick text')
    .attr('id', d => `country-label-${d.replace(/\s+/g, '-').toLowerCase()}`);

  // 创建Y轴（左侧区域标签）
  const yAxisGroup = svg.append('g')
    .attr('class', 'y-axis')
    .call(d3.axisLeft(yScale));
    
  // 为每个区域标签添加唯一ID
  yAxisGroup.selectAll('.tick text')
    .attr('id', d => `region-label-${d.replace(/\s+/g, '-').toLowerCase()}`);

  // 首先绘制所有单元格
  regions.forEach(region => {
    filteredOrderedCountries.forEach(country => {
      const stat = lookup[`${region}-${country}`] || { balance: 0, imports: 0, exports: 0 };
      
      // 为每个单元格创建唯一ID
      const cellId = `cell-${region.replace(/\s+/g, '-').toLowerCase()}-${country.replace(/\s+/g, '-').toLowerCase()}`;
      
      // 绘制热图单元格
      heatmapCellsGroup.append('rect')
        .attr('id', cellId)
        .attr('class', `heatmap-cell ${region === highlightedRegion ? 'highlighted' : ''}`)
        .attr('x', xScale(country))
        .attr('y', yScale(region))
        .attr('width', xScale.bandwidth())
        .attr('height', yScale.bandwidth())
        .attr('fill', colorScale(stat.balance))
        .attr('data-region', region)
        .attr('data-country', country)
        .on('mouseover', function(event) {
          // 显示提示框
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
          
          // 高亮相关的行和列
          highlightRowAndColumn(region, country);
        })
        .on('mouseout', function() {
          // 隐藏提示框
          tooltip.style('opacity', 0);
          
          // 取消高亮
          unhighlightRowAndColumn();
        });
    });
  });

  // 如果有高亮区域，应用特殊效果
  if (highlightedRegion) {
    // 为非高亮区域添加半透明暗色遮罩
    regions.forEach(region => {
      if (region !== highlightedRegion) { // 只对非高亮区域应用遮罩
        dimMaskGroup.append('rect')
          .attr('class', 'dimming-mask')
          .attr('x', 0)
          .attr('y', yScale(region))
          .attr('width', width)
          .attr('height', yScale.bandwidth())
          .attr('fill', 'rgba(0, 0, 0, 0.6)') // 半透明黑色遮罩
          .attr('pointer-events', 'none'); // 确保不会干扰鼠标事件
      }
    });
    
    // 显示年份相关的暗化效果，并添加动画
    dimMaskGroup.transition()
      .duration(800)
      .style('opacity', 1);
  }

  // 美化坐标轴文字
  xAxisGroup.selectAll('text')
    .attr('transform', 'rotate(-65)')
    .style('text-anchor', 'end')
    .style('font-size', `${Math.max(12, Math.min(14, width / 60))}px`)
    .style('fill', d => euCountries.includes(d) ? '#c1e7ff' : '#ffb7a8')
    .style('font-weight', '600'); // 让文字更清晰

  // 美化Y轴文字
  yAxisGroup.selectAll('text')
    .style('font-size', `${Math.max(12, Math.min(14, width / 60))}px`)
    .style('font-weight', '600') // 让文字更清晰
    .style('fill', region => region === highlightedRegion ? '#ffffff' : '#cccccc'); // 高亮区域文字更亮

  // 自适应图例
  const legendX = width + 10;
  const legendWidth = Math.min(150, margin.right - 20);

  const legend = svg.append('g')
    .attr('class', 'legend')
    .attr('transform', `translate(${legendX}, 0)`);

  legend.append('text')
    .attr('x', 0)
    .attr('y', 0)
    .style('font-size', `${Math.max(12, Math.min(14, width / 60)) + 1}px`)
    .style('font-weight', 'bold')
    .text('£ Million');

  // 计算图例项目间距
  const legendSpacing = Math.max(22, Math.min(28, height / 13));
  const rectSize = Math.max(14, Math.min(18, legendWidth / 9));

  const legendItems = legend.selectAll('.legend-item')
    .data(heatmapColors)
    .enter()
    .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => `translate(0, ${10 + i * legendSpacing})`);

  legendItems.append('rect')
    .attr('width', rectSize)
    .attr('height', rectSize)
    .style('fill', d => d);

  legendItems.append('text')
    .attr('x', rectSize + 6)
    .attr('y', rectSize * 0.75)
    .style('font-size', `${Math.max(12, Math.min(14, width / 60))}px`)
    .style('font-weight', '600') // 让图例文字更清晰
    .text((d, i) => {
      return `${heatmapBounds[i]} to ${heatmapBounds[i + 1]}`;
    });
    
  // 修改说明文字的位置
  svg.append('text')
    .attr('class', 'axis-note')
    .attr('x', width / 2)
    .attr('y', height + margin.bottom + 5) 
    .attr('text-anchor', 'middle')
    .style('font-size', `${Math.max(12, Math.min(14, width / 60))}px`)
    .style('fill', '#fff')
    .style('font-weight', '600') // 让文字更清晰
    .html('Country names are colored by ' + 
          `<tspan style="fill: #c1e7ff">EU</tspan>` + 
          ' and ' + 
          `<tspan style="fill: #ffb7a8">non-EU</tspan>` + 
          ' grouping.');

  // 函数：高亮特定的行和列
  function highlightRowAndColumn(region, country) {
    // 取消基于年份的暗化效果
    dimMaskGroup.transition().duration(300).style('opacity', 0);
    
    // 清除之前的悬停遮罩
    hoverDimmingGroup.selectAll('*').remove();
    
    // 为所有区域创建暗化遮罩（鼠标悬停效果）
    regions.forEach(r => {
      filteredOrderedCountries.forEach(c => {
        // 如果不是当前行或当前列，则添加暗化遮罩
        if (r !== region && c !== country) {
          hoverDimmingGroup.append('rect')
            .attr('x', xScale(c))
            .attr('y', yScale(r))
            .attr('width', xScale.bandwidth())
            .attr('height', yScale.bandwidth())
            .attr('fill', 'rgba(0, 0, 0, 0.6)')
            .attr('pointer-events', 'none');
        }
      });
    });
    
    // 显示悬停暗化效果
    hoverDimmingGroup.transition().duration(300).style('opacity', 1);
    
    // 高亮当前行和列的标签
    xAxisGroup.selectAll('.tick text')
      .transition().duration(300)
      .style('fill', d => d === country ? '#ffffff' : 'rgba(255, 255, 255, 0.3)')
      .style('font-weight', d => d === country ? '800' : '400');
      
    yAxisGroup.selectAll('.tick text')
      .transition().duration(300)
      .style('fill', d => d === region ? '#ffffff' : 'rgba(255, 255, 255, 0.3)')
      .style('font-weight', d => d === region ? '800' : '400');
  }
  
  // 函数：取消高亮
  function unhighlightRowAndColumn() {
    // 隐藏悬停暗化效果
    hoverDimmingGroup.transition().duration(300).style('opacity', 0);
    
    // 恢复基于年份的暗化效果（如果有）
    if (highlightedRegion) {
      dimMaskGroup.transition().duration(300).style('opacity', 1);
    }
    
    // 恢复X轴标签样式
    xAxisGroup.selectAll('.tick text')
      .transition().duration(300)
      .style('fill', d => euCountries.includes(d) ? '#c1e7ff' : '#ffb7a8')
      .style('font-weight', '600');
      
    // 恢复Y轴标签样式
    yAxisGroup.selectAll('.tick text')
      .transition().duration(300)
      .style('fill', region => region === highlightedRegion ? '#ffffff' : '#cccccc')
      .style('font-weight', '600');
  }

  // 添加窗口大小变化时的自适应调整
  window.addEventListener('resize', () => {
    renderHeatmap(allData, allRegions, allCountries, currentYear);
  });
}

// 额外添加一个函数来修复滚动容器布局
function fixScrollContainerLayout() {
  // 查找滚动容器
  const scrollContainer = document.querySelector('.scroll-text');
  if (!scrollContainer) return;
  
  // 确保最后一个步骤能够完全进入视图
  const lastStep = document.querySelector('.step[data-year="2024"]');
  if (lastStep) {
    // 计算当前滚动容器的有效高度
    const containerHeight = scrollContainer.clientHeight;
    
    // 确保滚动容器至少有足够的高度，可以让最后一个步骤居中显示
    const minHeight = lastStep.offsetHeight + (containerHeight / 2);
    
    // 检查当前的底部内边距
    const currentPadding = parseInt(window.getComputedStyle(scrollContainer).paddingBottom) || 0;
    
    // 如果需要更多空间，添加底部内边距
    const neededPadding = Math.max(containerHeight / 2, 200);
    if (currentPadding < neededPadding) {
      scrollContainer.style.paddingBottom = `${neededPadding}px`;
    }
  }
}