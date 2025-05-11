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

window.addEventListener('load', initializeVisualization);

function initializeVisualization() {
// 首先加载uk_total_20country.csv数据，然后初始化图表
loadUkTotalData().then(() => {
  initializeLineCharts();
  initializeHeatmap();
});
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

// 在热力图上方添加折线图容器
const container = document.querySelector('.region-chart-section');

// 创建主标题 (h2)
const mainTitle = document.createElement('h2');
mainTitle.textContent = 'UK Goods Trade Balance with EU and Non-EU Countries';
mainTitle.style.textAlign = 'center';
mainTitle.style.width = '100%';
mainTitle.style.marginBottom = '100px';

const lineChartsContainer = document.createElement('div');
lineChartsContainer.className = 'line-charts-container';
lineChartsContainer.style.display = 'flex';
lineChartsContainer.style.width = '100%';
lineChartsContainer.style.marginBottom = '0'; // 设为0，我们会用其他方式控制间距
lineChartsContainer.style.maxWidth = '1900px';
lineChartsContainer.style.margin = '0 auto'; // 移除底部margin，用其他方式控制
lineChartsContainer.style.position = 'relative'; // 添加相对定位
lineChartsContainer.style.zIndex = '10'; // 确保折线图在上层

// 在热力图前插入折线图容器
const scrollContainer = container.querySelector('.scroll-container');
container.insertBefore(mainTitle, scrollContainer); // 先插入标题
container.insertBefore(lineChartsContainer, scrollContainer); // 再插入容器

// 创建EU和非EU国家列表
const euCountries = ["Belgium", "France", "Germany", "Ireland", "Italy", "Netherlands", "Poland", "Spain", "Sweden", "Rest of EU"];
const nonEuCountries = ["Australia", "Canada", "China", "India", "Japan", "Norway", "Singapore", "Switzerland", "United States", "Rest of world"];

// 处理数据为按年份分组的格式
const euData = processLineChartData(ukTotalData, euCountries);
const nonEuData = processLineChartData(ukTotalData, nonEuCountries);

// 创建EU折线图
const euChartDiv = document.createElement('div');
euChartDiv.className = 'chart-wrapper';
euChartDiv.style.flex = '1';
euChartDiv.style.marginRight = '10px';

// 创建非EU折线图
const nonEuChartDiv = document.createElement('div');
nonEuChartDiv.className = 'chart-wrapper';
nonEuChartDiv.style.flex = '1';
nonEuChartDiv.style.marginLeft = '10px';

// 添加标题
const euTitle = document.createElement('h3');
euTitle.style.textAlign = 'center';
euTitle.style.color = '#fff';
euTitle.style.marginBottom = '15px';
euTitle.textContent = 'EU Countries Trade Balance';
euChartDiv.appendChild(euTitle);

const nonEuTitle = document.createElement('h3');
nonEuTitle.style.textAlign = 'center';
nonEuTitle.style.color = '#fff';
nonEuTitle.style.marginBottom = '15px';
nonEuTitle.textContent = 'Non-EU Countries Trade Balance';
nonEuChartDiv.appendChild(nonEuTitle);

// 创建SVG容器
const euChartSvgContainer = document.createElement('div');
euChartSvgContainer.style.height = '300px';
euChartSvgContainer.style.width = '100%';
euChartSvgContainer.style.minWidth = '600px';
euChartDiv.appendChild(euChartSvgContainer);

const nonEuChartSvgContainer = document.createElement('div');
nonEuChartSvgContainer.style.height = '300px';
nonEuChartSvgContainer.style.width = '100%';
nonEuChartSvgContainer.style.minWidth = '600px';
nonEuChartDiv.appendChild(nonEuChartSvgContainer);

// 添加到主容器
lineChartsContainer.appendChild(euChartDiv);
lineChartsContainer.appendChild(nonEuChartDiv);

// 渲染EU折线图
renderLineChart(euChartSvgContainer, euData, 'EU Countries', '#ff6347');

// 渲染非EU折线图
renderLineChart(nonEuChartSvgContainer, nonEuData, 'Non-EU Countries', '#2166ac');

// 创建空白间隔元素，确保折线图和热力图之间有足够距离
const spacer = document.createElement('div');
spacer.style.height = '500px';
spacer.style.width = '100%';
spacer.style.clear = 'both';

// 添加解释性文本段落 - 将它放在折线图和间隔元素之间
const explanationContainer = document.createElement('div');
explanationContainer.style.width = '100%';
explanationContainer.style.maxWidth = '1200px';
explanationContainer.style.margin = '40px auto 40px';
explanationContainer.style.padding = '0 20px';
explanationContainer.style.boxSizing = 'border-box';
explanationContainer.style.display = 'block'; // 确保块级显示

const explanationParagraph = document.createElement('div');
explanationParagraph.className = 'explanation-text';
// 不设置任何样式，完全使用默认CSS

explanationParagraph.innerHTML = `
  <p>Since Brexit, the UK has faced persistent structural trade imbalances with its major trading partners. Aside from Ireland, it has maintained consistent trade deficits with most EU countries. Although these deficits temporarily narrowed from 2020 to 2021 due to the COVID-19 pandemic and transitional Brexit arrangements, they have widened significantly since 2022, reflecting the structural disadvantages introduced by new trade barriers.</p>
  <p>Meanwhile, the UK has actively pursued trade diversification beyond the EU. However, this "global re-engagement" has not resulted in a stable surplus structure. The UK continues to run trade deficits with many non-EU countries, suggesting that its global trade reset remains incomplete.</p>
`;

explanationContainer.appendChild(explanationParagraph);

// 顺序很重要：先插入折线图，然后是说明文本，最后是间隔元素
container.insertBefore(explanationContainer, scrollContainer);
container.insertBefore(spacer, scrollContainer);
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
function renderLineChart(container, data, title, mainColor) {
const margin = { top: 20, right: 120, bottom: 30, left: 80 };
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
  .ticks(data.length);

const yAxis = d3.axisLeft(y)
  .tickFormat(d => `£${d3.format(",")(d)}m`);

// 添加X轴 - 增大文字
svg.append('g')
  .attr('class', 'x-axis')
  .attr('transform', `translate(0,${height})`)
  .call(xAxis)
  .selectAll('text')
  .style('fill', '#fff')
  .style('font-size', '13px'); // 增大文字大小

// 添加Y轴 - 增大文字
svg.append('g')
  .attr('class', 'y-axis')
  .call(yAxis)
  .selectAll('text')
  .style('fill', '#fff')
  .style('font-size', '13px'); // 增大文字大小

// 添加网格线
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

// 添加0m特殊线
svg.append('line')
  .attr('class', 'zero-line')
  .attr('x1', 0)
  .attr('x2', width)
  .attr('y1', y(0))
  .attr('y2', y(0))
  .attr('stroke', '#ffffff')  // 白色，使其更突出
  .attr('stroke-width', 1.5)  // 更粗的线
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
    .attr('stroke-width', 2.2);
  
  // 添加数据点
  svg.selectAll(`.dot-${country.replace(/\s+/g, '-').toLowerCase()}`)
    .data(countryData)
    .enter()
    .append('circle')
    .attr('class', `dot-${country.replace(/\s+/g, '-').toLowerCase()}`)
    .attr('cx', d => x(d.year))
    .attr('cy', d => y(d.value))
    .attr('r', 4)
    .attr('fill', countryColor)
    .attr('stroke', '#333')
    .attr('stroke-width', 1);
});

// 添加图例 - 改为单列垂直排布
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
    
    countries.forEach(country => {
      // 使用与国家线条相同的颜色作为文字颜色
      const countryColor = betterColors[countries.indexOf(country) % betterColors.length];
      tooltipContent += `<span style="color:${countryColor}">●</span> ${country}: £${d3.format(",")(d[country])} million<br>`;
    });
    
    tooltipDiv.html(tooltipContent)
      .style('left', `${event.pageX + 10}px`)
      .style('top', `${event.pageY - 28}px`)
      .style('opacity', 0.9);
      
    // 让对应年份的点稍微增大
    countries.forEach((country, i) => {
      svg.selectAll(`.dot-${country.replace(/\s+/g, '-').toLowerCase()}`)
        .attr('r', dot => dot.year === d.year ? 6 : 4)
        .attr('stroke-width', dot => dot.year === d.year ? 2 : 1);
    });
  })
  .on('mouseout', function() {
    // 隐藏提示框
    tooltipDiv.style('opacity', 0);
    
    // 隐藏虚线和年份标签
    guideline.style('opacity', 0);
    yearLabel.style('opacity', 0);
    
    // 将所有点恢复正常大小
    countries.forEach(country => {
      svg.selectAll(`.dot-${country.replace(/\s+/g, '-').toLowerCase()}`)
        .attr('r', 4)
        .attr('stroke-width', 1);
    });
  });
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
    // 创建专门用于2024年的观察器，使用更低的阈值
    const lastYearObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        // 即使只有一小部分进入视图也触发
        if (entry.isIntersecting && entry.intersectionRatio > 0.1 && !scrolling) {
          const year = +entry.target.getAttribute('data-year');
          if (year === 2024 && currentYear !== 2024) {
            currentYear = 2024;
            
            // 更新时间轴
            const timelineContainer = d3.select('#timeline-svg');
            if (!timelineContainer.empty()) {
              const width = timelineContainer.node().clientWidth;
              const timeScale = d3.scalePoint()
                .domain(years)
                .range([50, width - 50]);
              updateTimelineSelection(timelineContainer.select('svg'), timeScale, years);
            }
            
            // 更新热力图
            renderHeatmap(allData, allRegions, allCountries, 2024);
      }
    }
  });
    }, {
      threshold: [0.1, 0.2, 0.3], // 使用多个低阈值
      rootMargin: '0px 0px 150px 0px' // 扩大底部检测区域
    });
    
    lastYearObserver.observe(lastStep);
    
    // 监听滚动容器的滚动事件，检测是否接近底部
    const scrollContainer = lastStep.closest('.scroll-text') || lastStep.parentElement;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', () => {
        if (scrolling) return;
        
        // 检测是否滚动到接近底部
        const isNearBottom = scrollContainer.scrollTop + scrollContainer.clientHeight >= 
                            scrollContainer.scrollHeight - 100; // 距离底部100px
        
        if (isNearBottom && currentYear !== 2024) {
          currentYear = 2024;
          
          // 更新时间轴
          const timelineContainer = d3.select('#timeline-svg');
          if (!timelineContainer.empty()) {
            const width = timelineContainer.node().clientWidth;
            const timeScale = d3.scalePoint()
              .domain(years)
              .range([50, width - 50]);
            updateTimelineSelection(timelineContainer.select('svg'), timeScale, years);
          }
          
          // 更新热力图
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

  const xScale = d3.scaleBand()
    .domain(countries)
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

  // 自适应坐标轴
  const fontSize = Math.max(12, Math.min(14, width / 60));

  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(xScale))
    .selectAll('text')
      .attr('transform', 'rotate(-65)')
      .style('text-anchor', 'end')
      .style('font-size', `${fontSize}px`);
      
  svg.append('g')
    .call(d3.axisLeft(yScale))
    .selectAll('text')
      .style('font-size', `${fontSize}px`);

  // 自适应图例
  const legendX = width + 10;
  const legendWidth = Math.min(150, margin.right - 20);

  const legend = svg.append('g')
    .attr('class', 'legend')
    .attr('transform', `translate(${legendX}, 0)`);

  legend.append('text')
    .attr('x', 0)
    .attr('y', 0)
    .style('font-size', `${fontSize + 1}px`)
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
    .style('font-size', `${fontSize}px`)
    .text((d, i) => {
      return `${heatmapBounds[i]} to ${heatmapBounds[i + 1]}`;
    });
    
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