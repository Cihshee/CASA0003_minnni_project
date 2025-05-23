console.log('Transport.js 文件已加载');

if (typeof mapboxgl === 'undefined') {
    console.error('错误: mapboxgl 未定义，请确保在HTML中引入了Mapbox GL JS库');
}

window.addEventListener('load', initTransport);
document.addEventListener('DOMContentLoaded', initTransport);

function initTransport() {
    if (window.transportInitialized) return;
    window.transportInitialized = true;
    
    console.log('开始初始化Transport组件...');
    
    const mapContainer = document.getElementById('map');
    const portContent = document.getElementById('port-content');
    const buttons = document.querySelectorAll('.transport-button');
    const exploreMapBtn = document.getElementById('explore-map-btn');
    
    console.log('地图容器:', mapContainer);
    console.log('找到按钮数量:', buttons.length);
    
    if (portContent) {
        portContent.style.display = 'none';
    }
    
    if (!mapContainer) {
        console.error('找不到地图容器，请确保HTML中存在id为map的元素');
        return;
    }
    
    if (buttons.length === 0) {
        console.error('找不到任何按钮，请确保HTML中存在class为transport-button的元素');
        return;
    }
    
    let map = null;
    let currentMapType = '';
    
    function createMap() {
        if (map) return;
        
        console.log('开始创建地图...');
        try {
            mapboxgl.accessToken = 'pk.eyJ1IjoieWl5YW9jdWlpaSIsImEiOiJjbTY4MnFqZTgwYjEwMm5xejZraTBoMzJjIn0.32mcU30CT9cEByX-ZHvgzw';
            
            map = new mapboxgl.Map({
                container: 'map',
                style: 'mapbox://styles/yiyaocuiii/cmacxq3j700p101skdehe2igj',
                center: [-2, 54],
                zoom: 5
            });
            
            map.addControl(new mapboxgl.NavigationControl(), 'top-right');
            
            map.on('load', () => {
                console.log('地图加载成功');
            });
            
            map.on('error', (error) => {
                console.error('地图加载错误:', error);
            });
            
            console.log('地图初始化完成');
            
        } catch (error) {
            console.error('初始化地图时发生错误:', error);
        }
    }
    
    function clearMapContainer() {
        console.log('清除地图容器...');
        if (map) {
            map.remove();
            map = null;
        }
    }
    
    buttons.forEach(button => {
        console.log('为按钮添加点击事件:', button.dataset.type);
        
        button.addEventListener('click', function() {
            console.log('按钮被点击:', this.dataset.type);
            
            buttons.forEach(btn => {
                btn.classList.remove('active');
            });
            
            this.classList.add('active');
            
            const type = this.dataset.type;
            currentMapType = type;
            
            if (type === 'port') {
                console.log('显示港口内容...');
                mapContainer.style.display = 'none';
                
                if (portContent) {
                    portContent.style.display = 'flex';
                    
                    setTimeout(() => {
                        portContent.classList.add('active');
                    }, 10);
                }
                
                clearMapContainer();
                initPortImageScroll();
            } else if (type === 'airport') {
                console.log('显示机场信息...');
                if (portContent) {
                    portContent.style.display = 'none';
                    portContent.classList.remove('active');
                }
                
                mapContainer.style.display = 'block';
                mapContainer.innerHTML = `
                    <div id="airport-content" class="airport-content" style="margin-top: 30px;">
                        <div class="chart-controls">
                            <div class="airport-selector">
                                <div class="airport-grid">
                                </div>
                            </div>
                        </div>
                        <div class="airport-chart-container">
                            <canvas id="airportChart"></canvas>
                        </div>
                        <div id="airport-summary" class="airport-summary-section">
                            <p> Despite air freight accounting for only <span style="color:rgb(249, 167, 132);">1%</span> of UK goods transport, the impact of Brexit </p>
                            <p> and the COVID-19 on airports has been significant, particularly for those with a primary focus on EU trade.</p>
                            <p> Airports such as <span style="color:rgb(249, 167, 132);">East Midlands, Belfast, Edinburgh, and Aberdeen</span> experienced sharp declines in cargo volumes to and from EU,</p>
                            <p> with noticeable fluctuations observed across other airports. </p>
                        </div>
                    </div>
                `;
                
                setTimeout(() => {
                    const airportContent = document.getElementById('airport-content');
                    if (airportContent) {
                        airportContent.classList.add('active');
                    }
                    
                    setTimeout(() => {
                        const airportSummary = document.getElementById('airport-summary');
                        if (airportSummary) {
                            airportSummary.classList.add('active');
                        }
                    }, 300);
                }, 10);
                
                loadAirportData();
                
                clearMapContainer();
            } else if (type === 'road') {
                console.log('显示公路信息...');
                if (portContent) {
                    portContent.style.display = 'none';
                    portContent.classList.remove('active');
                }
                
                mapContainer.style.display = 'block';
                mapContainer.innerHTML = `
                    <div id="road-content" class="airport-content" style="margin-top: 30px;">
                        <div style="padding: 20px; text-align: center; color: white;">
                            Road transport in the UK moves approximately 86 million tonnes of freight annually, providing an efficient and eco-friendly option for domestic goods movement over longer distances.
                        </div>
                        <div id="road-summary" class="airport-summary-section">
                            <p>Road freight is the backbone of UK's domestic logistics, connecting production centers with distribution hubs across the country.</p>
                            <p>Brexit has significantly impacted cross-border road transport with new documentation and customs requirements at UK-EU borders.</p>
                        </div>
                    </div>
                `;
                
                setTimeout(() => {
                    const roadContent = document.getElementById('road-content');
                    if (roadContent) {
                        roadContent.classList.add('active');
                    }
                    
                    setTimeout(() => {
                        const roadSummary = document.getElementById('road-summary');
                        if (roadSummary) {
                            roadSummary.classList.add('active');
                        }
                    }, 300);
                }, 10);
                
                clearMapContainer();
            }
        });
    });
    
    const portButton = document.querySelector('.transport-button[data-type="port"]');
    if (portButton) {
        console.log('找到port按钮，触发点击');
        portButton.classList.add('active');
        
        if (portContent) {
            portContent.style.display = 'flex';
            
            setTimeout(() => {
                portContent.classList.add('active');
            }, 10);
            
            setTimeout(function() {
                initPortImageScroll();
                
                const videoElement = document.getElementById('port-video');
                if (videoElement) {
                    initPortVideo();
                }
            }, 100);
        }
    } else {
        console.error('找不到port按钮');
    }
}

function initPortVideo() {
    const video = document.getElementById('port-video');
    
    if (video) {
        video.addEventListener('error', function() {
            handleVideoError();
        });
        
        if (video.readyState === 0) {
            setTimeout(function() {
                if (video.readyState === 0) {
                    handleVideoError();
                }
            }, 3000);
        }
    }
}

function handleVideoError() {
    const videoSection = document.querySelector('.port-video-section');
    
    if (videoSection) {
        videoSection.innerHTML = `
            <div class="video-placeholder">
                <p>Failed to load uk-port.MP4 video</p>
                <p>Please ensure the video file is uploaded to the correct location</p>
            </div>
        `;
    }
}

function loadAirportData() {
    console.log('加载机场数据...');
    
    fetch('public/data/Air_Freight_by_Type_and_Nationality_2016-2024.json')
        .then(response => {
            if (!response.ok) {
                console.log('尝试备用路径...');
                return fetch('./public/data/Air_Freight_by_Type_and_Nationality_2016-2024.json');
            }
            return response;
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok, unable to load data file');
            }
            return response.json();
        })
        .then(data => {
            console.log('成功加载机场数据:', data.length);
            processAirportData(data);
        })
        .catch(error => {
            console.error('加载机场数据时出错:', error);
            const chartContainer = document.querySelector('.airport-chart-container');
            if (chartContainer) {
                chartContainer.innerHTML = `
                    <div class="error-message">
                        <p>Unable to load airport data</p>
                        <p>Error details: ${error.message}</p>
                    </div>
                `;
            }
        });
}

function processAirportData(data) {
    console.log('处理机场数据...');
    
    const airports = [...new Set(data.map(item => item.airport))].sort();
    
    const years = [...new Set(data.map(item => item.year))].sort();
    const latestYear = years[years.length - 1];
    const latestYearData = data.filter(item => item.year === latestYear);
    
    const mainAirports = latestYearData
        .sort((a, b) => parseFloat(b.total_freight) - parseFloat(a.total_freight))
        .map(item => item.airport)
        .filter(airport => airport !== 'BOURNEMOUTH')
        .slice(0, 14);
        
    console.log('主要机场列表:', mainAirports);
    
    const airportGrid = document.querySelector('.airport-grid');
    if (airportGrid) {
        airportGrid.innerHTML = '';
        
        mainAirports.forEach(airport => {
            const airportLower = airport.toLowerCase().replace(/\s+/g, '_');
            
            const airportItem = document.createElement('div');
            airportItem.className = 'airport-item';
            airportItem.dataset.airport = airport;
            
            airportItem.innerHTML = `
                <div class="airport-image">
                    <img src="./public/img/${airportLower}.png" alt="${airport}" />
                </div>
                <div class="airport-name">${airport}</div>
            `;
            
            airportItem.addEventListener('click', function() {
                document.querySelectorAll('.airport-item').forEach(item => {
                    item.classList.remove('selected');
                });
                
                this.classList.add('selected');
                
                createAirportChart(data, this.dataset.airport);
            });
            
            airportGrid.appendChild(airportItem);
        });
        
        const firstAirport = airportGrid.querySelector('.airport-item');
        if (firstAirport) {
            firstAirport.classList.add('selected');
            createAirportChart(data, firstAirport.dataset.airport);
        }
    }
}

function createAirportChart(data, selectedAirport) {
    console.log(`创建${selectedAirport}机场货运柱状图...`);
    
    const airportData = data.filter(item => item.airport === selectedAirport);
    
    airportData.sort((a, b) => a.year.localeCompare(b.year));
    
    const years = airportData.map(item => item.year);
    
    const datasets = [
        {
            label: 'UK - Set Down',
            data: airportData.map(item => parseFloat(item.UK_set_down)),
            backgroundColor: 'rgba(148, 190, 217, 1)',
            borderColor: 'rgba(148, 190, 217, 1)',
            borderWidth: 1,
            stack: 'UK'
        },
        {
            label: 'UK - Picked Up',
            data: airportData.map(item => parseFloat(item.UK_picked_up)),
            backgroundColor: 'rgba(148, 190, 217, 0.5)',
            borderColor: 'rgba(148, 190, 217, 1)',
            borderWidth: 1,
            stack: 'UK'
        },
        {
            label: 'EU - Set Down',
            data: airportData.map(item => parseFloat(item.EU_set_down)),
            backgroundColor: 'rgba(221, 195, 45, 1)',
            borderColor: 'rgba(255, 195, 45, 1)',
            borderWidth: 1,
            stack: 'EU'
        },
        {
            label: 'EU - Picked Up',
            data: airportData.map(item => parseFloat(item.EU_picked_up)),
            backgroundColor: 'rgba(255, 195, 45, 0.5)',
            borderColor: 'rgba(255, 195, 45, 1)',
            borderWidth: 1,
            stack: 'EU'
        },
        {
            label: 'Non-EU - Set Down',
            data: airportData.map(item => parseFloat(item.non_EU_set_down)),
            backgroundColor: 'rgba(255, 148, 102, 1)',
            borderColor: 'rgba(255, 148, 102, 1)',
            borderWidth: 1,
            stack: 'NonEU'
        },
        {
            label: 'Non-EU - Picked Up',
            data: airportData.map(item => parseFloat(item.non_EU_picked_up)),
            backgroundColor: 'rgba(255, 148, 102, 0.5)',
            borderColor: 'rgba(255, 148, 102, 1)',
            borderWidth: 1,
            stack: 'NonEU'
        }
    ];
    
    const chartCanvas = document.getElementById('airportChart');
    
    if (window.airportChartInstance) {
        window.airportChartInstance.destroy();
    }
    
    if (chartCanvas) {
        window.airportChartInstance = new Chart(chartCanvas, {
            type: 'bar',
            data: {
                labels: years,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `${selectedAirport} Airport Freight Traffic (2016-2024)`,
                        font: {
                            size: 18,
                            weight: 'bold'
                        },
                        color: 'white',
                        padding: {
                            top: 10,
                            bottom: 20
                        }
                    },
                    subtitle: {
                        display: true,
                        text: 'By Freight Type and Nationality (tonnes)',
                        color: 'white',
                        padding: {
                            bottom: 10
                        }
                    },
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: 'white',
                            padding: 15,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += new Intl.NumberFormat('en-US').format(context.parsed.y) + ' tonnes';
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Year',
                            color: 'white',
                            font: {
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            color: 'white',
                            font: {
                                weight: 'bold'
                            }
                        },
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        stacked: true,
                        ticks: {
                            color: 'white',
                            callback: function(value) {
                                if (value >= 1000000) {
                                    return (value / 1000000).toFixed(1) + 'M';
                                } else if (value >= 1000) {
                                    return (value / 1000).toFixed(1) + 'K';
                                }
                                return value;
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        title: {
                            display: true,
                            text: 'Freight Volume (tonnes)',
                            color: 'white',
                            font: {
                                weight: 'bold'
                            }
                        }
                    }
                }
            }
        });
    }
}

function initPortImageScroll() {
    console.log('开始初始化港口图片滚动功能...');
    
    const slides = document.querySelectorAll('.port-image-slide');
    const dots = document.querySelectorAll('.indicator-dot');
    const prevButton = document.getElementById('prev-port-image');
    const nextButton = document.getElementById('next-port-image');
    const textContents = document.querySelectorAll('.port-text-content');
    const exploreMapBtns = document.querySelectorAll('.explore-map-btn');
    
    console.log('找到幻灯片数量:', slides.length);
    console.log('找到指示点数量:', dots.length);
    console.log('找到文字内容数量:', textContents.length);
    
    let currentIndex = 0;
    let autoPlayTimer = null;
    const autoPlayInterval = 5000; 
    
    if (!slides.length || !dots.length) {
        console.error('图片或指示点元素未找到');
        return;
    }
    
    function startAutoPlay() {
        console.log('启动自动播放');
        if (autoPlayTimer) {
            clearInterval(autoPlayTimer);
        }
        autoPlayTimer = setInterval(() => {
            currentIndex = (currentIndex + 1) % slides.length;
            updateSlides();
        }, autoPlayInterval);
    }
    
    function stopAutoPlay() {
        console.log('停止自动播放');
        if (autoPlayTimer) {
            clearInterval(autoPlayTimer);
            autoPlayTimer = null;
        }
    }

    exploreMapBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            console.log('点击了地图按钮');
            stopAutoPlay(); 
            
            window.location.href = './src/components/Transport/uk-port.html';
        });
    });
    
    function updateSlides() {
        console.log('更新幻灯片到索引:', currentIndex);
        
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));
        
        slides[currentIndex].classList.add('active');
        dots[currentIndex].classList.add('active');
        
        textContents.forEach(content => {
            content.classList.remove('active');
            content.style.opacity = '0';
            content.style.transform = 'translateY(20px)';
        });
        
        const textId = slides[currentIndex].getAttribute('data-text-id');
        const textContent = document.getElementById(textId);
        
        if (textContent) {
            textContent.classList.add('active');
            setTimeout(() => {
                textContent.style.opacity = '1';
                textContent.style.transform = 'translateY(0)';
            }, 50);
        }
    }
    
    if (prevButton && nextButton) {
        prevButton.onclick = function(e) {
            e.stopPropagation();
            stopAutoPlay();
            currentIndex = (currentIndex - 1 + slides.length) % slides.length;
            updateSlides();
            startAutoPlay();
        };
        
        nextButton.onclick = function(e) {
            e.stopPropagation();
            stopAutoPlay();
            currentIndex = (currentIndex + 1) % slides.length;
            updateSlides();
            startAutoPlay();
        };
    }
    
    dots.forEach((dot, index) => {
        dot.addEventListener('click', function() {
            stopAutoPlay();
            currentIndex = index;
            updateSlides();
            startAutoPlay();
        });
    });
    
    const imageContainer = document.querySelector('.port-image-container');
    if (imageContainer) {
        imageContainer.addEventListener('mouseenter', stopAutoPlay);
        imageContainer.addEventListener('mouseleave', startAutoPlay);
    }
    
    updateSlides();
    startAutoPlay();
    
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            stopAutoPlay();
        } else {
            startAutoPlay();
        }
    });
    
    window.addEventListener('focus', startAutoPlay);
    window.addEventListener('blur', stopAutoPlay);
}


