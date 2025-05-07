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
  let currentType = 0;
  let currentFlow = flowTypes[0];
  let currentYear = years[0];
  let allData = [];
  let currentMap = null;
  let showingSummary = true;

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
          title: { display: false }
        },
        scales: {
          x: { ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.08)' } },
          y: { ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.08)' }, suggestedMax: undefined, stepSize: 20000000 }
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
    document.querySelectorAll('#goods-type-icons-row-summary .goods-type-icon-btn, #goods-type-icons-row-detail .goods-type-icon-btn').forEach((btn,i)=>{
      btn.classList.toggle('active', i===idx);
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

  // 详情区渲染
  function renderDetail() {
    const detailSection = document.getElementById('goods-type-detail-container');
    if (!detailSection) return;
    detailSection.innerHTML = `
      <div class="goods-type-detail-controls">
        <select id="goods-flowtype" class="goods-flowtype-select">
          ${flowTypes.map(f=>`<option value="${f}">${f}</option>`).join('')}
        </select>
        <div class="goods-year-slider-wrap">
          <input type="range" id="goods-year-slider" min="2016" max="2024" value="${currentYear}" step="1">
          <span id="goods-year-label">${currentYear}</span>
        </div>
      </div>
      <div class="goods-detail-main-flex">
        <div class="goods-type-detail-map" id="goods-map"></div>
        <div class="goods-detail-side">
          <div class="goods-type-detail-desc" id="goods-type-detail-desc"></div>
          <div class="goods-type-detail-bar" id="goods-bar-chart"></div>
        </div>
      </div>
    `;
    // 控件事件
    const flowSel = document.getElementById('goods-flowtype');
    if (flowSel) {
      flowSel.value = currentFlow;
      flowSel.onchange = e => { currentFlow = e.target.value; renderDetail(); };
    }
    const yearSlider = document.getElementById('goods-year-slider');
    if (yearSlider) {
      yearSlider.oninput = e => {
        currentYear = +e.target.value;
        document.getElementById('goods-year-label').textContent = currentYear;
        renderDetail();
      };
    }
    // 地图
    function createMapboxMapWhenVisible() {
      const mapDiv = document.getElementById('goods-map');
      if (!mapDiv) return;
      mapDiv.style.display = 'block';
      // debug: 插入红色背景div
      mapDiv.innerHTML = '<div style="width:100%;height:100%;background:#f00;opacity:0.2;position:absolute;z-index:1;"></div>';
      // 检查容器是否可见且有宽高
      const rect = mapDiv.getBoundingClientRect();
      console.log('地图容器尺寸', rect.width, rect.height);
      if (rect.width < 10 || rect.height < 10 || mapDiv.offsetParent === null) {
        requestAnimationFrame(createMapboxMapWhenVisible);
        return;
      }
      mapDiv.innerHTML = '';
      if (window.currentMapInstance) { window.currentMapInstance.remove(); window.currentMapInstance = null; }
      if (typeof mapboxgl === 'undefined') {
        console.error('mapboxgl 未定义，Mapbox GL JS库未加载');
        return;
      }
      console.log('准备初始化Mapbox地图', MAPBOX_TOKEN, MAPBOX_STYLE);
      mapboxgl.accessToken = MAPBOX_TOKEN;
      try {
        window.currentMapInstance = new mapboxgl.Map({
          container: 'goods-map',
          style: MAPBOX_STYLE,
          center: [10, 30],
          zoom: 1.2,
          attributionControl: false
        });
        let loaded = false;
        window.currentMapInstance.on('load', () => {
          loaded = true;
          console.log('Mapbox地图已加载');
          window.currentMapInstance.resize();
        });
        window.currentMapInstance.on('error', (e) => {
          console.error('Mapbox地图加载错误', e);
        });
        setTimeout(() => {
          if (!loaded) {
            console.error('Mapbox地图未能正常加载，强制resize');
            window.currentMapInstance.resize();
          }
        }, 1500);
      } catch (err) {
        console.error('Mapbox地图初始化异常', err);
      }
    }
    createMapboxMapWhenVisible();
    // 柱状图
    const barDiv = document.getElementById('goods-bar-chart');
    if (barDiv) {
      barDiv.innerHTML = '<canvas id="goods-bar-canvas" width="400" height="340"></canvas>';
      const ctx = document.getElementById('goods-bar-canvas').getContext('2d');
      // 过滤数据，取top20
      const filtered = allData.filter(row => row['SitcCommodityHierarchy - SITC1'] == sitcLabels[currentType]);
      // ...按currentFlow/currentYear排序取前20...
      // TODO: 填充bar chart数据
    }
    // 描述动画
    const descDiv = document.getElementById('goods-type-detail-desc');
    if (descDiv) {
      descDiv.classList.remove('desc-animate');
      void descDiv.offsetWidth; // 触发重绘
      descDiv.classList.add('desc-animate');
      descDiv.textContent = sitcDescriptions[currentType];
    }
    setIconBarActive(currentType);
  }

  // 绑定icon bar点击（两处icon bar都要绑定）
  function bindIconBarEvents() {
    document.querySelectorAll('#goods-type-icons-row-summary .goods-type-icon-btn, #goods-type-icons-row-detail .goods-type-icon-btn').forEach((btn,i)=>{
      btn.onclick = ()=>{ currentType = i; renderDetail(); };
    });
  }

  // 加载数据后初始化
  fetch(csvPath)
    .then(r => r.text())
    .then(csvText => {
      const {data} = parseCSV(csvText);
      allData = data;
      renderLegend();
      renderSummaryCharts(data);
      renderDetail();
      bindIconBarEvents();
      setIconBarActive(currentType);
    });

  const MAPBOX_TOKEN = 'pk.eyJ1IjoieWl4aW5nLWxpIiwiYSI6ImNtN3FtNWh6YjA0ancybnM4aGxjZnlheTEifQ.sKwaoIMQR65VQmYDbnu2MQ';
  const MAPBOX_STYLE = 'mapbox://styles/yixing-li/cmaa8uo1j00j001sgc3051vxu';
})();