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

window.addEventListener('load', initializeHeatmap);

function initializeHeatmap() {
  const container = document.getElementById('heatmap-container');
  if (!container) return;
  container.innerHTML = '';

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
  
  // 平滑移动当前年份标记
  svg.select('.current-year-marker')
    .transition()
    .duration(300)
    .attr('transform', `translate(${timeScale(currentYear)}, ${80/2 - 40})`);
  
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