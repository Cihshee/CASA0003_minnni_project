const heatmapColors = [
  "#2166ac", "#338ec4", "#92c5de", "#cae2ee",
  "#fee5d9", "#fcbba1", "#fb6a4a", "#de2d26"
];
const heatmapBounds = [-25000, -1500, -500, -100, 0, 150, 200, 800, 10500];

let currentYear = 2016;
let allData = null;
let allRegions = null;
let allCountries = null;
let scrolling = false; 
let ukTotalData = null; 
let map = null; 
let isGlobeRotating = false; 
let isTimelineAuto = false; 
let timelineAutoId = null; 

mapboxgl.accessToken = 'pk.eyJ1Ijoidmlja3ljaHUiLCJhIjoiY202MmRqb2I1MG52ejJsc2UzMTJlZ3ozaiJ9.davRHBoLdFZ5sFznPnhFUg';

window.addEventListener('load', initializeVisualization);

function initializeVisualization() {
initializeMap();

loadUkTotalData().then(() => {
  initializeLineCharts();
  initializeHeatmap();
});
}

function initializeMap() {
  const mapContainer = document.getElementById('region-map-container');
  if (!mapContainer) return;
  
  const mapLoading = document.createElement('div');
  mapLoading.id = 'map-loading';
  mapLoading.innerHTML = `
    <div class="loading-text">Loading Map</div>
    <div class="loading-dots">
      <span>.</span>
      <span>.</span>
      <span>.</span>
    </div>
  `;
  mapContainer.appendChild(mapLoading);
  
  map = new mapboxgl.Map({
    container: 'region-map-container',
    style: 'mapbox://styles/vickychu/cmao6l3px01ku01s497w65rty',
    center: [30, 48],
    zoom: 3,
    projection: 'globe',
    pitch: 30,
    bearing: 0
  });
  
  map.addControl(new mapboxgl.NavigationControl(), 'top-right');
  
  map.on('load', function() {
    if (mapLoading) {
      mapLoading.style.display = 'none';
    }
    console.log('Mapbox map loaded successfully');
    
    const layerID = 'uk-trade-with-coords-dlzrad';
    updateMapYearFilter(layerID, currentYear);
    
    addGlobeRotationButton();
    
    enhanceTradeBubbles(layerID);
    
    
    map.setFog({
      'color': 'rgb(186, 210, 235)',
      'high-color': 'rgb(36, 92, 223)',
      'horizon-blend': 0.02,
      'space-color': 'rgb(11, 11, 25)',
      'star-intensity': 0.6
    });
    
    function enhanceTradeBubbles(sourceLayerId) {
      if (!map || !map.getLayer(sourceLayerId)) {
    console.error('地图或源图层不存在');
    return;
  }
  
  const sourceId = map.getLayer(sourceLayerId).source;
  
  map.addLayer({
    'id': 'trade-bubbles-halo',
    'type': 'circle',
    'source': sourceId,
    'filter': ['==', ['get', 'Year'], parseInt(currentYear)],
    'paint': {
      'circle-color': [
        'case',
        ['>', ['get', 'Trade_Balance_m'], 0], 'rgba(214, 81, 23, 0.6)',
        ['==', ['get', 'Trade_Balance_m'], 0], 'rgba(247, 247, 247, 0.6)',
        'rgba(146, 197, 222, 0.6)'
      ],
      'circle-radius': [
        '+',
        ['/', ['sqrt', ['abs', ['get', 'Trade_Balance_m']]], 2],
        ['/', ['+', ['get', 'Imports_m'], ['get', 'Exports_m']], 25000]
      ],
      'circle-blur': 0.6,
      'circle-opacity': 0.7
    }
  }, sourceLayerId);
  
  map.addLayer({
    'id': 'trade-bubbles-pulse',
    'type': 'circle',
    'source': sourceId,
    'filter': ['==', ['get', 'Year'], parseInt(currentYear)],
    'paint': {
      'circle-color': [
        'case',
        ['>', ['get', 'Trade_Balance_m'], 0], 'rgba(244, 165, 130, 0.3)',
        ['==', ['get', 'Trade_Balance_m'], 0], 'rgba(247, 247, 247, 0.3)',
        'rgba(146, 197, 222, 0.3)'
      ],
      'circle-radius': [
        '+',
        ['*', 
          ['/', ['sqrt', ['abs', ['get', 'Trade_Balance_m']]], 1.5],
          ['+', 1, ['*', 0.5, ['sin', ['*', ['^', ['time'], 1], 0.5]]]]
        ],
        ['/', ['+', ['get', 'Imports_m'], ['get', 'Exports_m']], 20000]
      ],
      'circle-opacity': [
        '*',
        0.5,
        ['-', 1, ['*', 0.5, ['sin', ['*', ['^', ['time'], 1], 0.5]]]]
      ],
      'circle-blur': 0.7
    }
  }, 'trade-bubbles-halo');
  
  
  map.setPaintProperty(sourceLayerId, 'circle-radius', [
    '+',
    ['/', ['sqrt', ['abs', ['get', 'Trade_Balance_m']]], 3],
    ['/', ['+', ['get', 'Imports_m'], ['get', 'Exports_m']], 35000]
  ]);
  
  map.setPaintProperty(sourceLayerId, 'circle-stroke-width', 1.5);
  map.setPaintProperty(sourceLayerId, 'circle-stroke-color', [
    'case',
    ['>', ['get', 'Trade_Balance_m'], 0], 'rgba(244, 165, 130, 0.9)',
    ['==', ['get', 'Trade_Balance_m'], 0], 'rgba(247, 247, 247, 0.9)',
    'rgba(146, 197, 222, 0.9)'
  ]);
  
  map.addLayer({
    'id': 'trade-bubbles-highlight',
    'type': 'circle',
    'source': sourceId,
    'filter': ['==', ['get', 'Year'], parseInt(currentYear)],
    'paint': {
      'circle-color': 'white',
      'circle-radius': 2,
      'circle-opacity': [
        '*',
        0.8,
        ['+', 0.5, ['*', 0.5, ['sin', ['*', ['^', ['time'], 1], 0.8]]]]
      ],
      'circle-blur': 0.1
    }
  });
  
  addBubbleInteractions(sourceLayerId);
}

function addBubbleInteractions(layerId) {
  const popup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    maxWidth: '300px',
    className: 'trade-bubble-popup'
  });
  
  const style = document.createElement('style');
  style.textContent = `
    .trade-bubble-popup .mapboxgl-popup-content {
      background-color: rgba(0, 0, 0, 0.5);
      color: white;
      border-radius: 8px;
      padding: 15px;
      box-shadow: 0 0 15px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.2);
      max-width: 280px;
    }
    .trade-bubble-popup .mapboxgl-popup-tip {
      border-top-color: transparent;
      border-bottom-color: transparent;
      border-left-color: transparent;
      border-right-color: transparent;
    }
    .popup-content {
      font-family: 'Arial', sans-serif;
    }
    .popup-title {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 10px;
      color: white;
      text-align: center;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    }
    .popup-data {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
      font-size: 14px;
    }
    .popup-label {
      color: #ccc;
    }
    .popup-value {
      font-weight: bold;
    }
    .surplus { color: #ff9e8a; }
    .deficit { color: #92c5de; }
    .balanced { color: #f7f7f7; }
  `;
  document.head.appendChild(style);
  
  map.on('mouseenter', layerId, (e) => {
    map.getCanvas().style.cursor = 'pointer';
    
    const feature = e.features[0];
    const props = feature.properties;
    
    const formatValue = (value) => {
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        notation: 'compact',
        maximumFractionDigits: 2
      }).format(value);
    };
    
    const tradeStatus = props.Trade_Balance_m > 0 ? 'surplus' : 
                        props.Trade_Balance_m < 0 ? 'deficit' : 'balanced';
    
    const html = `
      <div class="popup-content">
        <div class="popup-title">${props.Country} (${props.Year})</div>
        <div class="popup-data">
          <span class="popup-label">Imports:</span>
          <span class="popup-value">${formatValue(props.Imports_m)} m</span>
        </div>
        <div class="popup-data">
          <span class="popup-label">Exports:</span>
          <span class="popup-value">${formatValue(props.Exports_m)} m</span>
        </div>
        <div class="popup-data" style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed rgba(255,255,255,0.1);">
          <span class="popup-label">Trade Balance:  </span>
          <span class="popup-value ${tradeStatus}">${formatValue(props.Trade_Balance_m)} m</span>
        </div>
      </div>
    `;
    
    popup.setLngLat(feature.geometry.coordinates)
      .setHTML(html)
      .addTo(map);
    
    map.setFeatureState(
      { source: map.getLayer(layerId).source, id: feature.id },
      { hover: true }
    );
    
    const pulseHighlight = () => {
      if (!map.getFeatureState({ source: map.getLayer(layerId).source, id: feature.id }).hover) {
        return;
      }
      
      const highlightLayer = 'trade-bubbles-hover-highlight';
      if (map.getLayer(highlightLayer)) {
        map.setPaintProperty(highlightLayer, 'circle-radius', 
          ['*', 1.5, map.getPaintProperty(layerId, 'circle-radius')]);
      }
      
      requestAnimationFrame(pulseHighlight);
    };
    
    if (!map.getLayer('trade-bubbles-hover-highlight')) {
      map.addLayer({
        'id': 'trade-bubbles-hover-highlight',
        'type': 'circle',
        'source': map.getLayer(layerId).source,
        'filter': ['==', ['id'], feature.id],
        'paint': {
          'circle-color': 'white',
          'circle-opacity': 0.4,
          'circle-radius': ['*', 1.5, map.getPaintProperty(layerId, 'circle-radius')],
          'circle-stroke-width': 2,
          'circle-stroke-color': 'white',
          'circle-stroke-opacity': 0.7
        }
      });
    } else {
      map.setFilter('trade-bubbles-hover-highlight', ['==', ['id'], feature.id]);
    }
    
    pulseHighlight();
  });
  
  map.on('mouseleave', layerId, () => {
    map.getCanvas().style.cursor = '';
    
    popup.remove();
    
    map.removeFeatureState({
      source: map.getLayer(layerId).source
    }, 'hover');

    if (map.getLayer('trade-bubbles-hover-highlight')) {
      map.removeLayer('trade-bubbles-hover-highlight');
    }
  });
}


function updateMapYearFilter(layerID, year) {
  if (!map || !map.isStyleLoaded()) return;
  
  try {
    map.setFilter(layerID, ['==', ['get', 'Year'], parseInt(year)]);
    
    const bubblesLayers = [
      'trade-bubbles-halo',
      'trade-bubbles-pulse',
      'trade-bubbles-highlight'
    ];
    
    bubblesLayers.forEach(layer => {
      if (map.getLayer(layer)) {
        map.setFilter(layer, ['==', ['get', 'Year'], parseInt(year)]);
      }
    });
    
    console.log(`Applied year filter to layers for year ${year}`);
  } catch (err) {
    console.error(`Error setting filter for layer ${layerID}:`, err);
  }
}

    addTradeBalanceLegend();
    
    setTimeout(() => {
      const playButton = document.querySelector('.map-play-button');
      if (playButton) {
        playButton.click();
      }
    }, 1500);
  });
}

function addTradeBalanceLegend() {
  const legendContainer = document.createElement('div');
  legendContainer.className = 'trade-balance-legend';
  legendContainer.style.position = 'absolute';
  legendContainer.style.left = '15px';
  legendContainer.style.bottom = '30px';
  legendContainer.style.backgroundColor = 'rgba(0,0,0,0.7)';
  legendContainer.style.borderRadius = '5px';
  legendContainer.style.padding = '10px';
  legendContainer.style.maxWidth = '360px';
  legendContainer.style.width = '320px';
  legendContainer.style.color = 'white';
  legendContainer.style.fontSize = '12px';
  legendContainer.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
  legendContainer.style.zIndex = '10';
  
  const title = document.createElement('div');
  title.textContent = 'UK Trade Balance';
  title.style.fontWeight = 'bold';
  title.style.marginBottom = '5px';
  title.style.textAlign = 'center';
  legendContainer.appendChild(title);
  
  const gradientBar = document.createElement('div');
  gradientBar.style.height = '15px';
  gradientBar.style.width = '100%';
  gradientBar.style.marginBottom = '5px';
  gradientBar.style.background = 'linear-gradient(to right, #2166ac, #92c5de, #f7f7f7, #f4a582, #b2182b)';
  gradientBar.style.borderRadius = '2px';
  legendContainer.appendChild(gradientBar);
  
  const labelsContainer = document.createElement('div');
  labelsContainer.style.display = 'flex';
  labelsContainer.style.justifyContent = 'space-between';
  labelsContainer.style.fontSize = '10px';
  labelsContainer.style.margin = '0 5px';
  legendContainer.appendChild(labelsContainer);
  
  const deficitLabel = document.createElement('div');
  deficitLabel.textContent = 'Deficit';
  deficitLabel.style.color = '#92c5de';
  deficitLabel.style.fontWeight = 'bold';
  labelsContainer.appendChild(deficitLabel);
  
  const balancedLabel = document.createElement('div');
  balancedLabel.textContent = 'Balanced';
  balancedLabel.style.color = '#f7f7f7';
  labelsContainer.appendChild(balancedLabel);
  
  const surplusLabel = document.createElement('div');
  surplusLabel.textContent = 'Surplus';
  surplusLabel.style.color = '#f4a582';
  surplusLabel.style.fontWeight = 'bold';
  labelsContainer.appendChild(surplusLabel);
  
  map.getContainer().appendChild(legendContainer);
}

function addGlobeRotationButton() {
  const controlContainer = document.createElement('div');
  controlContainer.className = 'mapboxgl-ctrl mapboxgl-ctrl-group rotate-control';
  controlContainer.style.margin = '15px';
  controlContainer.style.borderRadius = '8px';
  controlContainer.style.overflow = 'visible';
  controlContainer.style.background = 'transparent';
  controlContainer.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.01)';
  
  const rotateButton = document.createElement('button');
  rotateButton.id = 'globe-rotate-btn';
  rotateButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10z"></path><path d="M2 12h10"></path><path d="M12 2v10"></path><path d="M12 12 8 8"></path></svg>`;
  rotateButton.style.padding = '12px';
  rotateButton.style.cursor = 'pointer';
  rotateButton.style.background = 'transparent';
  rotateButton.style.border = 'none';
  rotateButton.style.color = 'white';
  rotateButton.style.display = 'flex';
  rotateButton.style.alignItems = 'center';
  rotateButton.style.justifyContent = 'center';
  rotateButton.style.width = '52px';
  rotateButton.style.height = '52px';
  rotateButton.title = 'Rotating the Earth';
  
  rotateButton.addEventListener('click', function() {
    toggleGlobeRotation();
    
    if (isGlobeRotating) {
      this.style.background = 'rgba(255,255,255,0.3)';
      this.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M10 15V9h4"></path></svg>`;
    } else {
      this.style.background = 'transparent';
      this.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10z"></path><path d="M2 12h10"></path><path d="M12 2v10"></path><path d="M12 12 8 8"></path></svg>`;
    }
  });
  
  rotateButton.addEventListener('mouseover', function() {
    this.style.background = isGlobeRotating ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)';
    this.style.transform = 'scale(1.05)';
  });
  
  rotateButton.addEventListener('mouseout', function() {
    this.style.background = isGlobeRotating ? 'rgba(255,255,255,0.3)' : 'transparent';
    this.style.transform = 'scale(1)';
  });
  
  controlContainer.appendChild(rotateButton);
  
  map.getContainer().appendChild(controlContainer);
  
  addMapTimeline();
}

function toggleGlobeRotation() {
  isGlobeRotating = !isGlobeRotating;
  
  if (isGlobeRotating) {
    rotateGlobe();
  }
}

function rotateGlobe() {
  if (!isGlobeRotating || !map) return;
  
  const currentBearing = map.getBearing();
  map.setBearing(currentBearing - 0.15);
  
  const time = Date.now() * 0.0001;
  const pitch = 30 + Math.sin(time) * 10;
  map.setPitch(pitch);
  
  requestAnimationFrame(rotateGlobe);
}

function updateMapYearFilter(layerID, year) {
  if (!map || !map.isStyleLoaded()) return;
  
  try {
    map.setFilter(layerID, ['==', ['get', 'Year'], parseInt(year)]);
    console.log(`Applied year filter to layer: ${layerID} for year ${year}`);
  } catch (err) {
    console.error(`Error setting filter for layer ${layerID}:`, err);
  }
}

function loadUkTotalData() {
return new Promise((resolve, reject) => {
  d3.csv('public/data/uk_total_20country.csv')
    .then(data => {
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

function initializeLineCharts() {
if (!ukTotalData) return;

const euCountries = ["Belgium", "France", "Germany", "Ireland", "Italy", "Netherlands", "Poland", "Spain", "Sweden", "Rest of EU"];
const nonEuCountries = ["Australia", "Canada", "China", "India", "Japan", "Norway", "Singapore", "Switzerland", "United States", "Rest of world"];

const euData = processLineChartData(ukTotalData, euCountries);
const nonEuData = processLineChartData(ukTotalData, nonEuCountries);

  initMapSidebarCharts(euData, nonEuData);
}

function initMapSidebarCharts(euData, nonEuData) {
  const euChartContainer = document.getElementById('sidebar-eu-chart');
  const nonEuChartContainer = document.getElementById('sidebar-noneu-chart');
  const euTextContainer = document.getElementById('sidebar-eu-text');
  const nonEuTextContainer = document.getElementById('sidebar-noneu-text');
  
  if (!euChartContainer || !nonEuChartContainer || !euTextContainer || !nonEuTextContainer) {
    console.error('地图侧边栏容器未找到');
    return;
  }
  
  euTextContainer.style.opacity = '0';
  euTextContainer.style.transform = 'translateY(20px)';
  euTextContainer.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
  euTextContainer.innerHTML = 'Aside from Ireland, the UK has maintained trade deficits with most EU countries. Although these deficits temporarily narrowed from 2020 to 2021 due to the COVID-19 and transitional Brexit arrangements, they have widened since 2022, reflecting the structural disadvantages introduced by new trade barriers.';
  
  nonEuTextContainer.style.opacity = '0';
  nonEuTextContainer.style.transform = 'translateY(20px)';
  nonEuTextContainer.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
  nonEuTextContainer.innerHTML = 'Meanwhile, the UK has actively pursued trade diversification beyond the EU. However, this "global re-engagement" has not resulted in a stable surplus structure. The UK continues to run trade deficits with many non-EU countries, suggesting that its global trade reset remains incomplete.';
  
  setTimeout(() => {
    euTextContainer.style.opacity = '1';
    euTextContainer.style.transform = 'translateY(0)';
  }, 300);
  
  setTimeout(() => {
    nonEuTextContainer.style.opacity = '1';
    nonEuTextContainer.style.transform = 'translateY(0)';
  }, 500);
  
  renderSidebarChart(euChartContainer, euData, 'EU Countries Trade Balance', '#ff6347');
  renderSidebarChart(nonEuChartContainer, nonEuData, 'Non-EU Countries Trade Balance', '#2166ac');
  
  const switchButton = document.querySelector('.chart-switch-btn');
  if (switchButton) {
    switchButton.style.transition = 'background-color 0.3s ease, transform 0.2s ease, box-shadow 0.3s ease';
    
    switchButton.addEventListener('mouseover', function() {
      this.style.backgroundColor = 'rgba(255,255,255,0.2)';
      this.style.transform = 'scale(1.05)';
      this.style.boxShadow = '0 0 10px rgba(255,255,255,0.3)';
    });
    
    switchButton.addEventListener('mouseout', function() {
      this.style.backgroundColor = 'rgba(255,255,255,0.1)';
      this.style.transform = 'scale(1)';
      this.style.boxShadow = 'none';
    });
    
    switchButton.addEventListener('click', function() {
      euChartContainer.style.transition = 'opacity 0.5s ease';
      nonEuChartContainer.style.transition = 'opacity 0.5s ease';
      euTextContainer.style.transition = 'opacity 0.5s ease';
      nonEuTextContainer.style.transition = 'opacity 0.5s ease';
      
      if (euChartContainer.classList.contains('active')) {
        euChartContainer.style.opacity = '0';
        euTextContainer.style.opacity = '0';
        setTimeout(() => {
          euChartContainer.classList.toggle('active');
          nonEuChartContainer.classList.toggle('active');
          euTextContainer.classList.toggle('active');
          nonEuTextContainer.classList.toggle('active');
          
          if (!euChartContainer.classList.contains('active')) {
            switchButton.textContent = '← EU';
          } else {
            switchButton.textContent = 'Non-EU →';
          }
          
          nonEuChartContainer.style.opacity = '1';
          nonEuTextContainer.style.opacity = '1';
        }, 500);
      } else {
        nonEuChartContainer.style.opacity = '0';
        nonEuTextContainer.style.opacity = '0';
        setTimeout(() => {
          euChartContainer.classList.toggle('active');
          nonEuChartContainer.classList.toggle('active');
          euTextContainer.classList.toggle('active');
          nonEuTextContainer.classList.toggle('active');
          
          if (!euChartContainer.classList.contains('active')) {
            switchButton.textContent = '← EU';
          } else {
            switchButton.textContent = 'Non-EU →';
          }
          
          euChartContainer.style.opacity = '1';
          euTextContainer.style.opacity = '1';
        }, 500);
      }
      
      this.style.transform = 'scale(0.95)';
      setTimeout(() => {
        this.style.transform = 'scale(1.05)';
        setTimeout(() => {
          this.style.transform = 'scale(1)';
        }, 100);
      }, 150);
      
      setTimeout(() => {
        if (euChartContainer.classList.contains('active')) {
          euChartContainer.innerHTML = '';
          renderSidebarChart(euChartContainer, euData, 'EU Countries', '#ff6347');
        } else {
          nonEuChartContainer.innerHTML = '';
          renderSidebarChart(nonEuChartContainer, nonEuData, 'Non-EU Countries', '#2166ac');
        }
      }, 550);
    });
  }
  
  initTimelineSlider();
}

function renderSidebarChart(container, data, title, mainColor) {
  container.innerHTML = '';
  
  const margin = { top: 40, right: 20, bottom: 40, left: 60 };
const width = container.clientWidth - margin.left - margin.right;
const height = container.clientHeight - margin.top - margin.bottom;

const svg = d3.select(container).append('svg')
  .attr('width', '100%')
  .attr('height', '100%')
  .append('g')
  .attr('transform', `translate(${margin.left},${margin.top})`);

  const years = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
  
  const x = d3.scalePoint()
    .domain(years)
  .range([0, width]);

  const yRange = [-60000, 10000];
  
  const y = d3.scaleLinear()
    .domain(yRange)
  .range([height, 0]);

  const xAxis = d3.axisBottom(x);

  const yAxisTicks = [-60000, -50000, -40000, -30000, -20000, -10000, 0, 10000];
  
  const yAxis = d3.axisLeft(y)
    .tickValues(yAxisTicks)
    .tickFormat(d => `£${d === 0 ? '0' : d > 0 ? (d/1000) + 'b' : (-d/1000) + 'b'}`);

  const xAxisGroup = svg.append('g')
  .attr('class', 'x-axis')
  .attr('transform', `translate(0,${height})`)
    .style('opacity', 0);
  
  xAxisGroup.call(xAxis)
  .selectAll('text')
  .style('fill', '#fff')
    .style('font-size', '10px')
    .attr('transform', 'rotate(-25)')
    .style('text-anchor', 'end');
  
  xAxisGroup.transition()
    .duration(800)
    .style('opacity', 1);

  const yAxisGroup = svg.append('g')
  .attr('class', 'y-axis')
    .style('opacity', 0);
  
  yAxisGroup.call(yAxis)
  .selectAll('text')
  .style('fill', '#fff')
    .style('font-size', '10px');
  
  yAxisGroup.transition()
    .duration(800)
    .style('opacity', 1);

  svg.append('text')
    .attr('x', width / 2)
    .attr('y', -20)
    .attr('text-anchor', 'middle')
    .style('font-size', '12px')
    .style('fill', '#fff')
    .style('font-weight', 'bold')
    .text(title)
    .style('opacity', 0)
    .transition()
    .duration(1000)
    .style('opacity', 1);

  svg.append('line')
  .attr('class', 'zero-line')
  .attr('x1', 0)
    .attr('x2', 0)
  .attr('y1', y(0))
  .attr('y2', y(0))
    .attr('stroke', '#ffffff')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '2,2')
    .transition()
    .duration(1000)
    .attr('x2', width);

  const line = d3.line()
  .x(d => x(d.year))
  .y(d => y(d.value))
  .curve(d3.curveMonotoneX);

  const countries = Object.keys(data[0])
  .filter(key => key !== 'year' && key !== 'total');

  const betterColors = [
    "#e06c75", "#61afef", "#c678dd", "#d4d4d8",
    "#56b6c2", "#a39fea", "#ff9e4a", "#e5c07b", 
    "#7590db", "#ff5277"
  ];
  
  const backgroundTrendsGroup = svg.append('g')
    .attr('class', 'background-trends')
    .style('opacity', 0);
  
  countries.forEach((country, i) => {
    const countryData = data.map(d => ({ year: d.year, value: d[country] }));
    const countryColor = betterColors[i % betterColors.length];
    
    backgroundTrendsGroup.append('path')
    .datum(countryData)
      .attr('class', `background-line-${country.replace(/\s+/g, '-').toLowerCase()}`)
    .attr('d', line)
    .attr('fill', 'none')
    .attr('stroke', countryColor)
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.8);
  });
  
  backgroundTrendsGroup.transition()
    .delay(200)
    .duration(1000)
    .attr('stroke-width', 1.5)
    .style('opacity', 0.8);

  countries.forEach((country, i) => {
    const countryData = data.map(d => ({ year: d.year, value: d[country] }));
  const countryColor = betterColors[i % betterColors.length];
  
    const path = svg.append('path')
      .datum(countryData)
      .attr('class', `line-${country.replace(/\s+/g, '-').toLowerCase()}`)
      .attr('fill', 'none')
    .attr('stroke', countryColor)
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.8);
    
    const pathLength = path.node().getTotalLength();
    
    path.attr("stroke-dasharray", pathLength)
      .attr("stroke-dashoffset", pathLength)
      .transition()
      .duration(1500)
      .delay(i * 100)
      .attr("stroke-dashoffset", 0)
      .on("end", function() {
        d3.select(this)
          .attr('stroke-width', 1.5)
          .attr('opacity', 0.8);
      });
    
    path
      .on('mouseover', function() {
        d3.select(this)
          .attr('stroke-width', 3)
          .attr('opacity', 1);
        
        backgroundTrendsGroup.select(`.background-line-${country.replace(/\s+/g, '-').toLowerCase()}`)
          .attr('opacity', 0.3)
          .attr('stroke-width', 1);
        
        svg.append('text')
          .attr('class', 'country-label')
          .attr('x', width - 5)
          .attr('y', 20 + i * 20)
          .attr('text-anchor', 'end')
          .attr('fill', countryColor)
  .style('font-size', '12px')
  .style('font-weight', 'bold')
          .text(country);
          
        svg.selectAll('path.line-')
          .filter(function() { return this !== path.node(); })
          .transition().duration(200)
          .attr('opacity', 0.2);
        
        backgroundTrendsGroup.selectAll('path')
          .filter(function() { 
            return !this.classList.contains(`background-line-${country.replace(/\s+/g, '-').toLowerCase()}`); 
          })
          .transition().duration(200)
          .attr('opacity', 0.05);
      })
      .on('mouseout', function() {
        d3.select(this)
          .attr('stroke-width', 1.5)
          .attr('opacity', 0.8);
        
        backgroundTrendsGroup.selectAll('path')
          .attr('opacity', 0.15)
          .attr('stroke-width', 1.5);
        
        svg.selectAll('.country-label').remove();
        
        svg.selectAll('path.line-')
          .transition().duration(200)
          .attr('opacity', 0.8);
      });
      
    svg.selectAll(`.dot-${country.replace(/\s+/g, '-').toLowerCase()}`)
      .data(countryData)
      .join('circle')
      .attr('class', `dot-${country.replace(/\s+/g, '-').toLowerCase()}`)
      .attr('cx', d => x(d.year))
      .attr('cy', d => y(d.value))
      .attr('r', 0)
      .attr('fill', countryColor)
      .attr('opacity', 0)
      .transition()
      .duration(800)
      .delay(1500 + i * 100)
      .attr('r', 3)
      .attr('opacity', 0.8);
  });

  const legendWrapper = document.createElement('div');
  legendWrapper.className = 'legend-wrapper';
  legendWrapper.style.position = 'relative';
  legendWrapper.style.width = '90%';
  legendWrapper.style.marginTop = '0';
  legendWrapper.style.paddingBottom = '0';
  legendWrapper.style.marginLeft = 'auto';
  legendWrapper.style.marginRight = 'auto';
  container.appendChild(legendWrapper);
  
  const legendContainer = document.createElement('div');
  legendContainer.className = 'sidebar-legend';
  legendContainer.style.display = 'flex';
  legendContainer.style.flexWrap = 'wrap';
  legendContainer.style.justifyContent = 'center';
  legendContainer.style.gap = '5px';
  legendContainer.style.marginTop = '5px';
  legendWrapper.appendChild(legendContainer);
  
  countries.forEach((country, i) => {
    const countryColor = betterColors[i % betterColors.length];
    
    const legendItem = document.createElement('div');
    legendItem.className = 'sidebar-legend-item';
    legendItem.style.display = 'flex';
    legendItem.style.alignItems = 'center';
    legendItem.style.margin = '3px';
    legendItem.style.cursor = 'pointer';
    legendItem.style.transition = 'all 0.3s ease';
    legendItem.style.opacity = '0';
    
    setTimeout(() => {
      legendItem.style.opacity = '1';
    }, 1800 + i * 100);
    
    const colorDot = document.createElement('span');
    colorDot.style.display = 'inline-block';
    colorDot.style.width = '8px';
    colorDot.style.height = '8px';
    colorDot.style.borderRadius = '50%';
    colorDot.style.backgroundColor = countryColor;
    colorDot.style.marginRight = '5px';
    
    const countryName = document.createElement('span');
    countryName.style.fontSize = '10px';
    countryName.style.color = '#fff';
    countryName.textContent = country.length > 8 ? country.substring(0, 8) + '...' : country;
    
    legendItem.appendChild(colorDot);
    legendItem.appendChild(countryName);
    legendContainer.appendChild(legendItem);
    
    legendItem.addEventListener('mouseover', function() {
      svg.select(`.line-${country.replace(/\s+/g, '-').toLowerCase()}`)
        .attr('stroke-width', 3)
        .attr('opacity', 1);
      
      backgroundTrendsGroup.select(`.background-line-${country.replace(/\s+/g, '-').toLowerCase()}`)
        .attr('opacity', 1)
        .attr('stroke-width', 2.5);
      
      svg.selectAll(`.dot-${country.replace(/\s+/g, '-').toLowerCase()}`)
        .attr('r', 4)
        .attr('opacity', 1);
      
      svg.selectAll('path')
        .filter(function() { 
          return !this.classList.contains(`line-${country.replace(/\s+/g, '-').toLowerCase()}`); 
        })
        .attr('opacity', 0.4);
      
      backgroundTrendsGroup.selectAll('path')
        .filter(function() { 
          return !this.classList.contains(`background-line-${country.replace(/\s+/g, '-').toLowerCase()}`); 
        })
        .attr('opacity', 0.1);
      
      svg.selectAll('circle')
        .filter(function() { 
          return !this.classList.contains(`dot-${country.replace(/\s+/g, '-').toLowerCase()}`); 
        })
        .attr('opacity', 0.2);
        
      this.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
      this.style.transform = 'scale(1.05)';
      
      svg.append('text')
        .attr('class', 'country-label')
        .attr('x', width - 5)
        .attr('y', 20 + i * 20)
        .attr('text-anchor', 'end')
        .attr('fill', countryColor)
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .text(country);
    });
    
    legendItem.addEventListener('mouseout', function() {
      svg.select(`.line-${country.replace(/\s+/g, '-').toLowerCase()}`)
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.8);
      
      backgroundTrendsGroup.selectAll('path')
        .attr('opacity', 0.15)
        .attr('stroke-width', 1.5);
      
      svg.selectAll(`.dot-${country.replace(/\s+/g, '-').toLowerCase()}`)
        .attr('r', 3)
        .attr('opacity', 0.8);
      
      svg.selectAll('path')
        .attr('opacity', 0.8);
      
      svg.selectAll('circle')
        .attr('opacity', 0.8);
        
      this.style.backgroundColor = 'transparent';
      this.style.transform = 'scale(1)';
      
      svg.selectAll('.country-label').remove();
    });
  });
}

function initTimelineSlider() {
  const timelineContainer = document.querySelector('.timeline-years');
  const timelineTrack = document.querySelector('.timeline-track');
  const timelineSlider = document.querySelector('.timeline-slider');
  
  if (!timelineContainer || !timelineTrack || !timelineSlider) {
    console.error('时间轴元素未找到');
    return;
  }
  
  const years = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
  const containerWidth = timelineContainer.clientWidth;
  const trackPadding = 20;
  const trackWidth = containerWidth - (trackPadding * 2);
  
  years.forEach((year, i) => {
    const position = trackPadding + (i * (trackWidth / (years.length - 1)));
    
    const tick = document.createElement('div');
    tick.className = 'timeline-tick';
    tick.style.left = `${position}px`;
    timelineContainer.appendChild(tick);
    
    const label = document.createElement('div');
    label.className = 'timeline-year';
    label.textContent = year;
    label.style.left = `${position}px`;
    timelineContainer.appendChild(label);
  });
  
  const playButton = document.createElement('button');
  playButton.className = 'timeline-play-button';
  playButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
  playButton.style.position = 'absolute';
  playButton.style.left = '-45px';
  playButton.style.top = '50%';
  playButton.style.transform = 'translateY(-50%)';
  playButton.style.background = 'rgba(0,0,0,0.7)';
  playButton.style.color = 'white';
  playButton.style.border = 'none';
  playButton.style.borderRadius = '50%';
  playButton.style.width = '30px';
  playButton.style.height = '30px';
  playButton.style.cursor = 'pointer';
  playButton.style.display = 'flex';
  playButton.style.alignItems = 'center';
  playButton.style.justifyContent = 'center';
  playButton.style.boxShadow = '0 0 5px rgba(0,0,0,0.3)';
  playButton.style.transition = 'all 0.3s ease';

  playButton.addEventListener('mouseover', function() {
    this.style.background = 'rgba(0,0,0,0.85)';
    this.style.transform = 'translateY(-50%) scale(1.1)';
  });

  playButton.addEventListener('mouseout', function() {
    this.style.background = 'rgba(0,0,0,0.7)';
    this.style.transform = 'translateY(-50%) scale(1)';
  });

  playButton.addEventListener('click', function() {
    toggleTimelineAutoPlay(years, timelineSlider, trackWidth, trackPadding);
  });
  
  timelineContainer.appendChild(playButton);
  
  let currentYearIndex = 0;
  updateSliderPosition(currentYearIndex);
  
  let isDragging = false;
  
  timelineSlider.addEventListener('mousedown', startDrag);
  timelineSlider.addEventListener('touchstart', startDrag, { passive: false });
  
  window.addEventListener('mousemove', drag);
  window.addEventListener('touchmove', drag, { passive: false });
  
  window.addEventListener('mouseup', endDrag);
  window.addEventListener('touchend', endDrag);
  
  timelineTrack.addEventListener('click', function(e) {
    const trackRect = timelineTrack.getBoundingClientRect();
    const clickPosition = e.clientX - trackRect.left;
    const segmentWidth = trackWidth / (years.length - 1);
    
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
    
    const constrainedPosition = Math.max(0, Math.min(trackWidth, dragPosition));
    
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
    
    timelineSlider.style.transition = 'left 0.8s ease';
    timelineSlider.style.left = `${position}px`;
    
    setTimeout(() => {
      timelineSlider.style.transition = '';
    }, 850);
  }
  
  function updateYearInfo(year) {
    if (currentYear !== year && allData && allRegions && allCountries) {
      currentYear = year;
      renderHeatmap(allData, allRegions, allCountries, currentYear);
      
      const layerID = 'uk-trade-with-coords-dlzrad';
      updateMapYearFilter(layerID, year);
    }
  }
}

function initializeHeatmap() {
const container = document.getElementById('heatmap-container');
if (!container) return;
container.innerHTML = '';

const timelineContainer = document.createElement('div');
timelineContainer.className = 'timeline-container';
timelineContainer.style.width = '100%';
timelineContainer.style.maxWidth = '800px';
timelineContainer.style.margin = '5px auto';
timelineContainer.style.padding = '10px 0';
timelineContainer.style.position = 'relative';
container.appendChild(timelineContainer);

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

    allData = data;
    allRegions = Array.from(new Set(data.map(d => d.Region)));
    allCountries = Array.from(new Set(data.map(d => d.Country20)));

    const stepElements = document.querySelectorAll('.step[data-year]');
    const years = Array.from(stepElements).map(el => +el.getAttribute('data-year')).sort();
    
    const lastStep = document.querySelector('.step[data-year="2024"]');
    if (lastStep) {
      const scrollContainer = lastStep.closest('.scroll-text') || lastStep.parentElement;
      if (scrollContainer) {
          scrollContainer.style.paddingBottom = '800px';
      }
    }
    
    createTimeline(years);
    
    renderHeatmap(data, allRegions, allCountries, currentYear);
    
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

const svg = container.append('svg')
  .attr('width', width)
  .attr('height', height)
  .style('overflow', 'visible');

const timeScale = d3.scalePoint()
  .domain(years)
  .range([50, width - 50]);

svg.append('line')
  .attr('x1', 0)
  .attr('y1', height / 2)
  .attr('x2', width)
  .attr('y2', height / 2)
  .attr('stroke', '#ccc')
  .attr('stroke-width', 2);

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
    
    scrollToYear(d);
  });

yearMarks.append('line')
  .attr('x1', 0)
  .attr('y1', 0)
  .attr('x2', 0)
  .attr('y2', 10)
  .attr('stroke', d => d === currentYear ? '#ff6347' : '#888')
  .attr('stroke-width', 2);

yearMarks.append('text')
  .attr('x', 0)
  .attr('y', 25)
  .attr('text-anchor', 'middle')
  .style('font-size', '14px')
  .style('fill', d => d === currentYear ? '#ff6347' : '#888')
  .style('font-weight', d => d === currentYear ? 'bold' : 'normal')
  .text(d => d);

const drag = d3.drag()
  .on('drag', function(event) {
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
    
    d3.select(this)
      .attr('transform', `translate(${timeScale(closestYear)}, ${height/2 - 40})`);
    
    if (closestYear !== currentYear) {
      currentYear = closestYear;
      
      renderHeatmap(allData, allRegions, allCountries, currentYear);
      
      svg.selectAll('.year-mark')
        .selectAll('line')
        .attr('stroke', d => d === currentYear ? '#ff6347' : '#888');
      
      svg.selectAll('.year-mark')
        .selectAll('text')
        .style('fill', d => d === currentYear ? '#ff6347' : '#555')
        .style('font-weight', d => d === currentYear ? 'bold' : 'normal');
      
      d3.select(this).select('text')
        .text(`'${String(currentYear).slice(-2)}`);
      
    }
  });

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
  .attr('pointer-events', 'none')
  .style('fill', 'white')
  .style('font-weight', 'bold')
  .style('font-size', '16px')
  .text(`'${String(currentYear).slice(-2)}`);
}

function updateTimelineSelection(svg, timeScale, years) {
  svg.selectAll('.year-mark')
    .selectAll('line')
    .attr('stroke', d => d === currentYear ? '#ff6347' : '#888');

  svg.selectAll('.year-mark')
    .selectAll('text')
    .style('fill', d => d === currentYear ? '#ff6347' : '#888')
    .style('font-weight', d => d === currentYear ? 'bold' : 'normal');

  const currentYearMark = svg.selectAll('.year-mark')
    .filter(d => d === currentYear)
    .node();
  
  let xPosition;
  if (currentYearMark) {
    const transform = d3.select(currentYearMark).attr('transform');
    const match = /translate\(([^,]+),/.exec(transform);
    xPosition = match ? parseFloat(match[1]) : timeScale(currentYear);
  } else {
    xPosition = timeScale(currentYear);
  }

  svg.select('.current-year-marker')
    .transition()
    .duration(300)
    .attr('transform', `translate(${xPosition}, ${80/2 - 40})`);

  svg.select('.current-year-marker text')
    .text(`'${String(currentYear).slice(-2)}`);
}

function processScrollEntries(entries) {
  let bestEntry = null;
  let maxRatio = 0;
  
  entries.forEach(entry => {
    if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
      maxRatio = entry.intersectionRatio;
      bestEntry = entry;
    }
  });
  
  if (bestEntry) {
    document.querySelectorAll('.step').forEach(step => {
      step.classList.remove('is-active');
    });
    bestEntry.target.classList.add('is-active');
    
    const year = +bestEntry.target.getAttribute('data-year');
    if (year && year !== currentYear) {
      console.log(`年份从 ${currentYear} 更新为 ${year}`);
      
      currentYear = year;
      
      const layerID = 'uk-trade-with-coords-dlzrad';
      updateMapYearFilter(layerID, year);
      
      renderHeatmap(allData, allRegions, allCountries, year);
      
      document.querySelectorAll('.map-year-btn').forEach(btn => {
        const btnYear = parseInt(btn.dataset.year);
        btn.style.background = btnYear === currentYear ? 'rgba(255,99,71,0.8)' : 'transparent';
        btn.style.fontWeight = btnYear === currentYear ? 'bold' : 'normal';
      });
      
      const timelineSvg = document.querySelector('#timeline-svg svg');
      if (timelineSvg) {
        const svgSelection = d3.select(timelineSvg);
        const width = timelineSvg.clientWidth || timelineSvg.getBoundingClientRect().width;
        const timeScale = d3.scalePoint()
          .domain([2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024])
          .range([50, width - 50]);
        
        updateTimelineSelection(svgSelection, timeScale, [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024]);
      }
    }
  }
}

function scrollToYear(year) {
  scrolling = true;
  const yearStep = document.querySelector(`.step[data-year="${year}"]`);
  if (yearStep) {
    if (year === 2024) {
      const scrollContainer = yearStep.closest('.scroll-text') || yearStep.parentElement;
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight - scrollContainer.clientHeight * 1.2,
          behavior: 'smooth'
        });
      } else {
        yearStep.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      yearStep.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  setTimeout(() => { scrolling = false; }, 1500);
}

function setupScrollListener(years) {
let lastScrollTime = 0;
  const scrollThrottle = 500;
let pendingScroll = false;

const observer = new IntersectionObserver((entries) => {
  if (scrolling) return;
  
  const now = Date.now();
  if (now - lastScrollTime < scrollThrottle) {
    if (!pendingScroll) {
      pendingScroll = true;
      setTimeout(() => {
          processStableEntries(entries);
        pendingScroll = false;
        lastScrollTime = Date.now();
      }, scrollThrottle);
    }
    return;
  }
  
  lastScrollTime = now;
    processStableEntries(entries);
  }, {
    threshold: [0.5, 0.7],
    rootMargin: '-15% 0px -15% 0px'
  });

  document.querySelectorAll('.step[data-year]').forEach(step => {
    observer.observe(step);
  });
  
  function processStableEntries(entries) {
  let bestEntry = null;
  let maxRatio = 0;
  
  entries.forEach(entry => {
    if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
      maxRatio = entry.intersectionRatio;
      bestEntry = entry;
    }
  });
  
    if (bestEntry && bestEntry.intersectionRatio > 0.6) {
    const year = +bestEntry.target.getAttribute('data-year');
      
    if (year && year !== currentYear) {
        const previousYear = currentYear;
      currentYear = year;
      
      renderHeatmap(allData, allRegions, allCountries, year);
      updateMapYearFilter('uk-trade-with-coords-dlzrad', year);
        
        updateTimelineSlider(year);
        
        updateStepHighlight(previousYear, year);
      }
    }
  }
  
  function updateStepHighlight(oldYear, newYear) {
    const oldStep = document.querySelector(`.step[data-year="${oldYear}"]`);
    if (oldStep) {
      oldStep.classList.remove('active');
      oldStep.querySelector('.timeline-dot')?.classList.remove('active');
      oldStep.querySelector('.timeline-year')?.classList.remove('active');
    }
    
    setTimeout(() => {
      const newStep = document.querySelector(`.step[data-year="${newYear}"]`);
      if (newStep) {
        newStep.classList.add('active');
        newStep.querySelector('.timeline-dot')?.classList.add('active');
        newStep.querySelector('.timeline-year')?.classList.add('active');
      }
    }, 50);
  }
  
  function updateTimelineSlider(year) {
          const timelineContainer = d3.select('#timeline-svg');
          if (!timelineContainer.empty()) {
            const width = timelineContainer.node().clientWidth;
            const timeScale = d3.scalePoint()
              .domain(years)
              .range([50, width - 50]);
    
      const svgSelection = timelineContainer.select('svg');
      if (!svgSelection.empty()) {
      const currentYearMarker = svgSelection.select('.current-year-marker');
        if (currentYearMarker.node()) {
          currentYearMarker.transition()
            .duration(600)
            .ease(d3.easeCubicOut)
            .attr('transform', `translate(${timeScale(year)}, ${80/2 - 40})`);
          
          currentYearMarker.select('text')
            .text(`'${String(year).slice(-2)}`);
        }
      
      svgSelection.selectAll('.year-mark')
        .selectAll('line')
          .transition()
          .duration(400)
        .attr('stroke', d => d === year ? '#ff6347' : '#888');
      
      svgSelection.selectAll('.year-mark')
        .selectAll('text')
          .transition()
          .duration(400)
        .style('fill', d => d === year ? '#ff6347' : '#555')
        .style('font-weight', d => d === year ? 'bold' : 'normal');
      }
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

  const containerWidth = container.node().clientWidth;

  const margin = { 
    top: 15,
    right: Math.max(100, containerWidth * 0.12),
    bottom: Math.max(80, containerWidth * 0.09),
    left: Math.max(40, containerWidth * 0.05) 
  };
  
  const width = Math.max(300, containerWidth - margin.left - margin.right);
  const height = Math.max(350, width * 0.6);

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

  const euCountries = ["Belgium", "France", "Germany", "Ireland", "Italy", "Netherlands", "Poland", "Spain", "Sweden", "Rest of EU"];
  const nonEuCountries = ["Australia", "Canada", "China", "India", "Japan", "Norway", "Singapore", "Switzerland", "United States", "Rest of world"];
  
  const orderedCountries = [...euCountries, ...nonEuCountries];
  
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

  let highlightedRegion = null;
  if (year === 2019) {
    highlightedRegion = 'Scotland';
  } else if (year === 2021) {
    highlightedRegion = 'Northern Ireland';
  } else if (year === 2023) {
    highlightedRegion = 'London';
  }

  const heatmapCellsGroup = svg.append('g')
    .attr('class', 'heatmap-cells');

  const hoverMaskGroup = svg.append('g')
    .attr('class', 'hover-masks')
    .style('opacity', 0);

  const hoverDimmingGroup = svg.append('g')
    .attr('class', 'hover-dimming')
    .style('opacity', 0);
    
  const dimMaskGroup = svg.append('g')
    .attr('class', 'year-dimming-masks')
    .style('opacity', 0);

  const xAxisGroup = svg.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(xScale));

  xAxisGroup.selectAll('.tick text')
    .attr('id', d => `country-label-${d.replace(/\s+/g, '-').toLowerCase()}`);

  const yAxisGroup = svg.append('g')
    .attr('class', 'y-axis')
    .call(d3.axisLeft(yScale));
    
  yAxisGroup.selectAll('.tick text')
    .attr('id', d => `region-label-${d.replace(/\s+/g, '-').toLowerCase()}`);

  regions.forEach(region => {
    filteredOrderedCountries.forEach(country => {
      const stat = lookup[`${region}-${country}`] || { balance: 0, imports: 0, exports: 0 };
      
      const cellId = `cell-${region.replace(/\s+/g, '-').toLowerCase()}-${country.replace(/\s+/g, '-').toLowerCase()}`;
      
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
          
          highlightRowAndColumn(region, country);
        })
        .on('mouseout', function() {
          tooltip.style('opacity', 0);
          
          unhighlightRowAndColumn();
        });
    });
  });

  if (highlightedRegion) {
    regions.forEach(region => {
      if (region !== highlightedRegion) {
        dimMaskGroup.append('rect')
          .attr('class', 'dimming-mask')
          .attr('x', 0)
          .attr('y', yScale(region))
          .attr('width', width)
          .attr('height', yScale.bandwidth())
          .attr('fill', 'rgba(0, 0, 0, 0.6)')
          .attr('pointer-events', 'none');
      }
    });
    
    dimMaskGroup.transition()
      .duration(800)
      .style('opacity', 1);
  }

  xAxisGroup.selectAll('text')
      .attr('transform', 'rotate(-65)')
      .style('text-anchor', 'end')
    .style('font-size', `${Math.max(12, Math.min(14, width / 60))}px`)
    .style('fill', d => euCountries.includes(d) ? '#c1e7ff' : '#ffb7a8')
    .style('font-weight', '600');

  yAxisGroup.selectAll('text')
    .style('font-size', `${Math.max(12, Math.min(14, width / 60))}px`)
    .style('font-weight', '600')
    .style('fill', region => region === highlightedRegion ? '#ffffff' : '#cccccc');

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
    .style('font-weight', '600')
    .text((d, i) => {
      return `${heatmapBounds[i]} to ${heatmapBounds[i + 1]}`;
    });
    
  svg.append('text')
    .attr('class', 'axis-note')
    .attr('x', width / 2)
    .attr('y', height + margin.bottom + 5) 
    .attr('text-anchor', 'middle')
    .style('font-size', `${Math.max(12, Math.min(14, width / 60))}px`)
    .style('fill', '#fff')
    .style('font-weight', '600')
    .html('Country names are colored by ' + 
          `<tspan style="fill: #c1e7ff">EU</tspan>` + 
          ' and ' + 
          `<tspan style="fill: #ffb7a8">non-EU</tspan>` + 
          ' grouping.');

  function highlightRowAndColumn(region, country) {
    dimMaskGroup.transition().duration(300).style('opacity', 0);
    
    hoverDimmingGroup.selectAll('*').remove();
    
    regions.forEach(r => {
      filteredOrderedCountries.forEach(c => {
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
    
    hoverDimmingGroup.transition().duration(300).style('opacity', 1);
    
    xAxisGroup.selectAll('.tick text')
      .transition().duration(300)
      .style('fill', d => d === country ? '#ffffff' : 'rgba(255, 255, 255, 0.3)')
      .style('font-weight', d => d === country ? '800' : '400');
      
    yAxisGroup.selectAll('.tick text')
      .transition().duration(300)
      .style('fill', d => d === region ? '#ffffff' : 'rgba(255, 255, 255, 0.3)')
      .style('font-weight', d => d === region ? '800' : '400');
  }
  
  function unhighlightRowAndColumn() {
    hoverDimmingGroup.transition().duration(300).style('opacity', 0);
    
    if (highlightedRegion) {
      dimMaskGroup.transition().duration(300).style('opacity', 1);
    }
    
    xAxisGroup.selectAll('.tick text')
      .transition().duration(300)
      .style('fill', d => euCountries.includes(d) ? '#c1e7ff' : '#ffb7a8')
      .style('font-weight', '600');
      
    yAxisGroup.selectAll('.tick text')
      .transition().duration(300)
      .style('fill', region => region === highlightedRegion ? '#ffffff' : '#cccccc')
      .style('font-weight', '600');
  }

  window.addEventListener('resize', () => {
    renderHeatmap(allData, allRegions, allCountries, currentYear);
  });
}

function fixScrollContainerLayout() {
  const scrollContainer = document.querySelector('.scroll-text');
  if (!scrollContainer) return;
  
  const lastStep = document.querySelector('.step[data-year="2024"]');
  if (lastStep) {
    const containerHeight = scrollContainer.clientHeight;
    
    const minHeight = lastStep.offsetHeight + containerHeight;
    
    const currentPadding = parseInt(window.getComputedStyle(scrollContainer).paddingBottom) || 0;
    
    const neededPadding = Math.max(containerHeight * 1.5, 500);
    if (currentPadding < neededPadding) {
      scrollContainer.style.paddingBottom = `${neededPadding}px`;
    }
    
    lastStep.style.minHeight = '300px';
  }
}

document.addEventListener('visibilitychange', function() {
  if (document.hidden) {
    isGlobeRotating = false;
    
    const rotateButton = document.getElementById('globe-rotate-btn');
    if (rotateButton) {
      rotateButton.style.background = 'transparent';
      rotateButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10z"></path><path d="M2 12h10"></path><path d="M12 2v10"></path><path d="M12 12 8 8"></path></svg>`;
    }
    
    if (timelineAutoId) {
      clearTimeout(timelineAutoId);
      timelineAutoId = null;
      isTimelineAuto = false;
      
      const playButton = document.querySelector('.timeline-play-button');
      if (playButton) {
        playButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
      }
    }
  }
});

function addMapTimeline() {
  const timelineContainer = document.createElement('div');
  timelineContainer.className = 'map-timeline-container';
  timelineContainer.style.position = 'absolute';
  timelineContainer.style.bottom = '30px';
  timelineContainer.style.right = '15px';
  timelineContainer.style.left = '50%';
  timelineContainer.style.transform = 'translateX(-50%)';
  timelineContainer.style.background = 'rgba(0,0,0,0.6)';
  timelineContainer.style.borderRadius = '10px';
  timelineContainer.style.padding = '10px 15px 5px 15px';
  timelineContainer.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
  timelineContainer.style.display = 'flex';
  timelineContainer.style.alignItems = 'center';
  timelineContainer.style.justifyContent = 'center';
  timelineContainer.style.zIndex = '10';
  timelineContainer.style.width = 'fit-content';
  timelineContainer.style.minWidth = '300px';
  
  const playButton = document.createElement('button');
  playButton.className = 'map-play-button';
  playButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
  playButton.style.background = 'rgba(255,255,255,0.2)';
  playButton.style.color = 'white';
  playButton.style.border = 'none';
  playButton.style.borderRadius = '50%';
  playButton.style.width = '36px';
  playButton.style.height = '36px';
  playButton.style.cursor = 'pointer';
  playButton.style.marginRight = '15px';
  playButton.style.display = 'flex';
  playButton.style.alignItems = 'center';
  playButton.style.justifyContent = 'center';
  playButton.style.transition = 'all 0.3s ease';
  
  const years = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
  
  const yearsContainer = document.createElement('div');
  yearsContainer.className = 'map-years-container';
  yearsContainer.style.display = 'flex';
  yearsContainer.style.alignItems = 'center';
  yearsContainer.style.justifyContent = 'space-between';
  yearsContainer.style.width = '100%';
  
  years.forEach(year => {
    const yearBtn = document.createElement('button');
    yearBtn.className = 'map-year-btn';
    yearBtn.dataset.year = year;
    yearBtn.textContent = year;
    yearBtn.style.background = year === currentYear ? 'rgba(255,99,71,0.8)' : 'transparent';
    yearBtn.style.color = 'white';
    yearBtn.style.border = 'none';
    yearBtn.style.borderRadius = '4px';
    yearBtn.style.padding = '5px';
    yearBtn.style.margin = '0 2px';
    yearBtn.style.cursor = 'pointer';
    yearBtn.style.fontSize = '12px';
    yearBtn.style.fontWeight = year === currentYear ? 'bold' : 'normal';
    yearBtn.style.transition = 'all 0.3s ease';
    
    yearBtn.addEventListener('click', function() {
      if (currentYear === year) return;
      
      document.querySelectorAll('.map-year-btn').forEach(btn => {
        btn.style.background = 'transparent';
        btn.style.fontWeight = 'normal';
      });
      this.style.background = 'rgba(255,99,71,0.8)';
      this.style.fontWeight = 'bold';
      
      currentYear = year;
      
      const layerID = 'uk-trade-with-coords-dlzrad';
      updateMapYearFilter(layerID, year);
    });
    
    yearBtn.addEventListener('mouseover', function() {
      if (currentYear !== year) {
        this.style.background = 'rgba(255,255,255,0.2)';
      }
    });
    
    yearBtn.addEventListener('mouseout', function() {
      if (currentYear !== year) {
        this.style.background = 'transparent';
      }
    });
    
    yearsContainer.appendChild(yearBtn);
  });
  
  playButton.addEventListener('click', function() {
    if (isTimelineAuto) {
      clearInterval(timelineAutoId);
      isTimelineAuto = false;
      this.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
      this.style.background = 'rgba(255,255,255,0.2)';
      return;
    }
    
    isTimelineAuto = true;
    this.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
    this.style.background = 'rgba(255,99,71,0.6)';
    
    let currentIndex = years.indexOf(currentYear);
    if (currentIndex === -1 || currentIndex >= years.length - 1) {
      currentIndex = 0;
    }
    
    const autoPlay = () => {
      currentIndex = (currentIndex + 1) % years.length;
      const nextYear = years[currentIndex];
      
      currentYear = nextYear;
      
      document.querySelectorAll('.map-year-btn').forEach(btn => {
        const btnYear = parseInt(btn.dataset.year);
        btn.style.background = btnYear === currentYear ? 'rgba(255,99,71,0.8)' : 'transparent';
        btn.style.fontWeight = btnYear === currentYear ? 'bold' : 'normal';
      });
      
      const layerID = 'uk-trade-with-coords-dlzrad';
      updateMapYearFilter(layerID, nextYear);
      
      if (currentIndex === years.length - 1) {
        setTimeout(() => {
          clearInterval(timelineAutoId);
          isTimelineAuto = false;
          playButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
          playButton.style.background = 'rgba(255,255,255,0.2)';
        }, 800);
      }
    };
    
    autoPlay();
    
    timelineAutoId = setInterval(autoPlay, 1200);
  });
  
  playButton.addEventListener('mouseover', function() {
    this.style.background = isTimelineAuto ? 'rgba(255,99,71,0.8)' : 'rgba(255,255,255,0.3)';
    this.style.transform = 'scale(1.1)';
  });
  
  playButton.addEventListener('mouseout', function() {
    this.style.background = isTimelineAuto ? 'rgba(255,99,71,0.6)' : 'rgba(255,255,255,0.2)';
    this.style.transform = 'scale(1)';
  });
  
  timelineContainer.appendChild(playButton);
  timelineContainer.appendChild(yearsContainer);
  
  map.getContainer().appendChild(timelineContainer);
}


function processLineChartData(data, countryList) {
  const yearGroups = d3.group(data, d => d.Year);

  const chartData = Array.from(yearGroups, ([year, values]) => {
    const yearData = {
      year: year,
      total: 0
    };
    
    const filteredValues = values.filter(d => countryList.includes(d.Country20));
    
    filteredValues.forEach(d => {
      yearData.total += d.Trade_Balance_m;
      yearData[d.Country20] = d.Trade_Balance_m;
    });
    
    return yearData;
  });

  return chartData.sort((a, b) => a.year - b.year);
}

function renderLineChart(container, data, title, mainColor, isSidebar = false) {
  const margin = isSidebar ? 
    { top: 10, right: 30, bottom: 30, left: 40 } : 
    { top: 20, right: 120, bottom: 30, left: 80 };

const width = container.clientWidth - margin.left - margin.right;
const height = container.clientHeight - margin.top - margin.bottom;

const svg = d3.select(container).append('svg')
  .attr('width', '100%')
  .attr('height', '100%')
  .append('g')
  .attr('transform', `translate(${margin.left},${margin.top})`);

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

const xAxis = d3.axisBottom(x)
  .tickFormat(d3.format('d'))
    .ticks(isSidebar ? 5 : data.length);

let yAxis;
if (title === 'EU Countries') {
  const yMin = Math.floor(y.domain()[0] / 10000) * 10000;
  const yMax = Math.ceil(y.domain()[1] / 10000) * 10000;
    
    const step = isSidebar ? 20000 : 10000;
  const tickValues = [];
  
  for (let i = Math.max(-40000, yMin); i <= yMax; i += step) {
    tickValues.push(i);
  }
  
  yAxis = d3.axisLeft(y)
    .tickValues(tickValues)
      .tickFormat(d => isSidebar ? `£${d/1000}k` : `£${d3.format(",")(d)}m`);
} else {
  yAxis = d3.axisLeft(y)
      .tickFormat(d => isSidebar ? `£${d/1000}k` : `£${d3.format(",")(d)}m`);
}

svg.append('g')
  .attr('class', 'x-axis')
  .attr('transform', `translate(0,${height})`)
  .call(xAxis)
  .selectAll('text')
  .style('fill', '#fff')
    .style('font-size', isSidebar ? '10px' : '13px');

svg.append('g')
  .attr('class', 'y-axis')
  .call(yAxis)
  .selectAll('text')
  .style('fill', '#fff')
    .style('font-size', isSidebar ? '10px' : '13px');

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

svg.append('line')
  .attr('class', 'zero-line')
  .attr('x1', 0)
  .attr('x2', width)
  .attr('y1', y(0))
  .attr('y2', y(0))
  .attr('stroke', '#ffffff')
    .attr('stroke-width', isSidebar ? 1 : 1.5)
  .attr('stroke-dasharray', '2,2');

const line = d3.line()
  .x(d => x(d.year))
  .y(d => y(d.value))
  .curve(d3.curveMonotoneX);

const countries = Object.keys(data[0])
  .filter(key => key !== 'year' && key !== 'total');

const betterColors = [
  "#e06c75",
  "#61afef",
  "#c678dd",
  "#d4d4d8",
  "#56b6c2",
  "#a39fea",
  "#ff9e4a",
  "#e5c07b",
  "#7590db",
  "#ff5277"
];

countries.forEach((country, i) => {
  const countryData = data.map(d => ({ year: d.year, value: d[country] }));
  const countryColor = betterColors[i % betterColors.length];
  
  svg.append('path')
    .datum(countryData)
    .attr('class', `line-${country.replace(/\s+/g, '-').toLowerCase()}`)
    .attr('d', line)
    .attr('fill', 'none')
    .attr('stroke', countryColor)
      .attr('stroke-width', isSidebar ? 1.5 : 2.2);
});

  if (!isSidebar) {
const legend = svg.append('g')
  .attr('class', 'legend')
  .attr('transform', `translate(${width + 10}, 0)`);

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

  if (!isSidebar) {
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

const yearLabel = svg.append('text')
  .attr('class', 'year-label')
  .attr('x', 0)
  .attr('y', -8)
  .attr('text-anchor', 'middle')
  .style('font-size', '12px')
  .style('font-weight', 'bold')
  .style('fill', '#fff')
  .style('opacity', 0);

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
    
    guideline
      .attr('x1', x(d.year))
      .attr('x2', x(d.year))
      .style('opacity', 1);
      
    yearLabel
      .attr('x', x(d.year))
      .text(d.year)
      .style('opacity', 1);
    
    let tooltipContent = `<strong>Year: ${d.year}</strong><br>`;
    
    svg.selectAll('.hover-dot').remove();
    
    countries.forEach(country => {
      const countryColor = betterColors[countries.indexOf(country) % betterColors.length];
      tooltipContent += `<span style="color:${countryColor}">●</span> ${country}: £${d3.format(",")(d[country])} million<br>`;
      
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
    tooltipDiv.style('opacity', 0);
    
    guideline.style('opacity', 0);
    yearLabel.style('opacity', 0);
    
    svg.selectAll('.hover-dot').remove();
  });
  }
}

function scrollToYear(year) {
  scrolling = true;
  const yearStep = document.querySelector(`.step[data-year="${year}"]`);
  if (yearStep) {
    if (year === 2024) {
      const scrollContainer = yearStep.closest('.scroll-text') || yearStep.parentElement;
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight - scrollContainer.clientHeight * 1.2,
          behavior: 'smooth'
        });
      } else {
        yearStep.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      yearStep.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  setTimeout(() => { scrolling = false; }, 1000);
}

function toggleTimelineAutoPlay() {
  console.log("时间轴播放按钮被点击");
}

function setupScrollListener(years) {
  const observer = new IntersectionObserver((entries) => {
    if (scrolling) return;
    
    let bestEntry = null;
    let maxRatio = 0;
    
    entries.forEach(entry => {
      if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
        maxRatio = entry.intersectionRatio;
        bestEntry = entry;
      }
    });
    
    if (bestEntry) {
      const year = +bestEntry.target.getAttribute('data-year');
      if (year && year !== currentYear) {
        currentYear = year;
        
        const layerID = 'uk-trade-with-coords-dlzrad';
        updateMapYearFilter(layerID, year);
        
        renderHeatmap(allData, allRegions, allCountries, year);
        
        const timelineSvg = document.querySelector('#timeline-svg svg');
        if (timelineSvg) {
          const svgSelection = d3.select(timelineSvg);
          const width = timelineSvg.clientWidth;
          const timeScale = d3.scalePoint()
            .domain(years)
            .range([50, width - 50]);
          
          updateTimelineSelection(svgSelection, timeScale, years);
        }
      }
    }
  }, {
    threshold: 0.5,
    rootMargin: '-10% 0px -10% 0px'
  });
  
  document.querySelectorAll('.step[data-year]').forEach(step => {
    observer.observe(step);
  });
  
  const lastStep = document.querySelector('.step[data-year="2024"]');
  if (lastStep) {
    const lastYearObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.7 && !scrolling) {
          const year = +entry.target.getAttribute('data-year');
          if (year === 2024 && currentYear !== 2024) {
            currentYear = 2024;
            
            const layerID = 'uk-trade-with-coords-dlzrad';
            updateMapYearFilter(layerID, 2024);
            
            renderHeatmap(allData, allRegions, allCountries, 2024);
            
            const timelineSvg = document.querySelector('#timeline-svg svg');
            if (timelineSvg) {
              const svgSelection = d3.select(timelineSvg);
              const width = timelineSvg.clientWidth;
              const timeScale = d3.scalePoint()
                .domain(years)
                .range([50, width - 50]);
              
              updateTimelineSelection(svgSelection, timeScale, years);
            }
          }
        }
      });
    }, {
      threshold: [0.5, 0.7, 0.9],
      rootMargin: '0px 0px 0px 0px'
    });
    
    lastYearObserver.observe(lastStep);
  }
}