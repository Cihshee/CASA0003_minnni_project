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

  // 只要脚本被插入就立即执行
  fetch(csvPath)
    .then(r => {
      console.log('Fetched CSV:', r.status);
      return r.text();
    })
    .then(csvText => {
      console.log('CSV text length:', csvText.length);
      const {data} = parseCSV(csvText);
      const chartContainer = document.getElementById('goods-summary-charts');
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

      // IntersectionObserver for animation
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
    })
    .catch(e => {
      console.error('Error in fetch or chart:', e);
    });
})();