// 立即执行一次调试输出，检查脚本是否被加载
console.log('Transport.js 文件已加载');

// 检查全局对象
if (typeof mapboxgl === 'undefined') {
    console.error('错误: mapboxgl 未定义，请确保在HTML中引入了Mapbox GL JS库');
}

// 使用两种事件监听方式，确保能够正确执行
window.addEventListener('load', initTransport);
document.addEventListener('DOMContentLoaded', initTransport);

// 初始化函数
function initTransport() {
    // 防止重复初始化
    if (window.transportInitialized) return;
    window.transportInitialized = true;
    
    console.log('开始初始化Transport组件...');
    
    // 获取元素
    const mapContainer = document.getElementById('map');
    const portContent = document.getElementById('port-content');
    const buttons = document.querySelectorAll('.transport-button');
    const exploreMapBtn = document.getElementById('explore-map-btn');
    
    console.log('地图容器:', mapContainer);
    console.log('找到按钮数量:', buttons.length);
    
    // 初始隐藏port内容
    if (portContent) {
        portContent.style.display = 'none';
    }
    
    // 确保地图容器和按钮存在
    if (!mapContainer) {
        console.error('找不到地图容器，请确保HTML中存在id为map的元素');
        return;
    }
    
    if (buttons.length === 0) {
        console.error('找不到任何按钮，请确保HTML中存在class为transport-button的元素');
        return;
    }
    
    // 定义地图变量，但不立即初始化
    let map = null;
    let currentMapType = '';
    
    // 创建地图的函数
    function createMap() {
        if (map) return; // 如果地图已经创建，则不重复创建
        
        console.log('开始创建地图...');
        try {
            // 初始化Mapbox地图
            mapboxgl.accessToken = 'pk.eyJ1IjoieWl5YW9jdWlpaSIsImEiOiJjbTY4MnFqZTgwYjEwMm5xejZraTBoMzJjIn0.32mcU30CT9cEByX-ZHvgzw';
            
            map = new mapboxgl.Map({
                container: 'map',
                style: 'mapbox://styles/yiyaocuiii/cmacxq3j700p101skdehe2igj',
                center: [-2, 54],
                zoom: 5
            });
            
            // 添加导航控件
            map.addControl(new mapboxgl.NavigationControl(), 'top-right');
            
            // 监听地图加载事件
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
    
    // 清除地图容器内容的函数
    function clearMapContainer() {
        console.log('清除地图容器...');
        // 如果地图存在，移除它
        if (map) {
            map.remove();
            map = null;
        }
    }
    
    // 为按钮添加点击事件
    buttons.forEach(button => {
        console.log('为按钮添加点击事件:', button.dataset.type);
        
        button.addEventListener('click', function() {
            console.log('按钮被点击:', this.dataset.type);
            
            // 移除所有按钮的active类
            buttons.forEach(btn => {
                btn.classList.remove('active');
            });
            
            // 为当前点击的按钮添加active类
            this.classList.add('active');
            
            // 获取按钮类型
            const type = this.dataset.type;
            currentMapType = type;
            
            // 根据按钮类型执行不同操作
            if (type === 'port') {
                console.log('显示港口内容...');
                // 隐藏地图
                mapContainer.style.display = 'none';
                
                // 显示港口内容
                if (portContent) {
                    portContent.style.display = 'flex';
                    
                    // 延迟一点添加active类触发动画
                    setTimeout(() => {
                        portContent.classList.add('active');
                    }, 10);
                }
                
                // 清除地图
                clearMapContainer();
                initPortImageScroll(); // 初始化图片滚动功能
            } else if (type === 'airport') {
                console.log('显示机场信息...');
                // 隐藏港口内容
                if (portContent) {
                    portContent.style.display = 'none';
                    portContent.classList.remove('active'); // 移除active类
                }
                
                // 显示地图容器并准备显示柱状图
                mapContainer.style.display = 'block';
                mapContainer.innerHTML = `
                    <div id="airport-content" class="airport-content" style="margin-top: 30px;">
                        <div class="chart-controls">
                            <div class="airport-selector">
                                <div class="airport-grid">
                                    <!-- 机场图片将通过JS动态加载 -->
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
                
                // 延迟一点添加active类触发动画
                setTimeout(() => {
                    const airportContent = document.getElementById('airport-content');
                    if (airportContent) {
                        airportContent.classList.add('active');
                    }
                    
                    // 为总结部分添加延迟动画效果
                    setTimeout(() => {
                        const airportSummary = document.getElementById('airport-summary');
                        if (airportSummary) {
                            airportSummary.classList.add('active');
                        }
                    }, 300); // 延迟300毫秒激活总结部分的动画
                }, 10);
                
                // 加载机场数据并显示柱状图
                loadAirportData();
                
                // 清除地图
                clearMapContainer();
            } else if (type === 'road') {
                console.log('显示公路信息...');
                // 隐藏港口内容
                if (portContent) {
                    portContent.style.display = 'none';
                    portContent.classList.remove('active'); // 移除active类
                }
                
                // 显示提示信息
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
                
                // 延迟一点添加active类触发动画
                setTimeout(() => {
                    const roadContent = document.getElementById('road-content');
                    if (roadContent) {
                        roadContent.classList.add('active');
                    }
                    
                    // 为总结部分添加延迟动画效果
                    setTimeout(() => {
                        const roadSummary = document.getElementById('road-summary');
                        if (roadSummary) {
                            roadSummary.classList.add('active');
                        }
                    }, 300); // 延迟300毫秒激活总结部分的动画
                }, 10);
                
                // 清除地图
                clearMapContainer();
            }
        });
    });
    
    // 默认选中并点击port按钮
    const portButton = document.querySelector('.transport-button[data-type="port"]');
    if (portButton) {
        console.log('找到port按钮，触发点击');
        portButton.classList.add('active');
        
        // 先显示港口内容，再初始化视频和导航
        if (portContent) {
            portContent.style.display = 'flex';
            
            // 延迟一点添加active类触发动画
            setTimeout(() => {
                portContent.classList.add('active');
            }, 10);
            
            // 确保DOM更新后再绑定事件
            setTimeout(function() {
                // 尝试初始化港口图片滚动功能
                initPortImageScroll();
                
                // 初始化视频处理（如果有视频元素）
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

// 初始化港口视频
function initPortVideo() {
    const video = document.getElementById('port-video');
    
    if (video) {
        // 监听视频错误事件
        video.addEventListener('error', function() {
            handleVideoError();
        });
        
        // 检查视频是否可以播放
        if (video.readyState === 0) {
            // 设置超时，如果视频在一定时间内没有加载，显示错误信息
            setTimeout(function() {
                if (video.readyState === 0) {
                    handleVideoError();
                }
            }, 3000);
        }
    }
}

// 处理视频加载错误
function handleVideoError() {
    const videoSection = document.querySelector('.port-video-section');
    
    if (videoSection) {
        // 创建一个占位符显示
        videoSection.innerHTML = `
            <div class="video-placeholder">
                <p>Failed to load uk-port.MP4 video</p>
                <p>Please ensure the video file is uploaded to the correct location</p>
            </div>
        `;
    }
}

// 加载机场数据并创建柱状图
function loadAirportData() {
    console.log('加载机场数据...');
    
    fetch('public/data/Air_Freight_by_Type_and_Nationality_2016-2024.json')
        .then(response => {
            if (!response.ok) {
                // 如果第一个路径不正确，尝试备用路径
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

// 处理机场数据并创建柱状图
function processAirportData(data) {
    console.log('处理机场数据...');
    
    // 获取所有机场
    const airports = [...new Set(data.map(item => item.airport))].sort();
    
    // 按总货运量对机场进行排序（使用2024年或最新年份的数据）
    const years = [...new Set(data.map(item => item.year))].sort();
    const latestYear = years[years.length - 1];
    const latestYearData = data.filter(item => item.year === latestYear);
    
    // 获取前14个主要机场（排除BOURNEMOUTH）
    const mainAirports = latestYearData
        .sort((a, b) => parseFloat(b.total_freight) - parseFloat(a.total_freight))
        .map(item => item.airport)
        .filter(airport => airport !== 'BOURNEMOUTH')
        .slice(0, 14);
        
    console.log('主要机场列表:', mainAirports);
    
    // 创建机场图片网格
    const airportGrid = document.querySelector('.airport-grid');
    if (airportGrid) {
        // 清空现有内容
        airportGrid.innerHTML = '';
        
        // 为每个机场创建图片选择器
        mainAirports.forEach(airport => {
            // 转换机场名称为小写并将空格转化为下划线
            const airportLower = airport.toLowerCase().replace(/\s+/g, '_');
            
            // 创建机场图片项
            const airportItem = document.createElement('div');
            airportItem.className = 'airport-item';
            airportItem.dataset.airport = airport;
            
            // 添加图片和标签
            airportItem.innerHTML = `
                <div class="airport-image">
                    <img src="./public/img/${airportLower}.png" alt="${airport}" />
                </div>
                <div class="airport-name">${airport}</div>
            `;
            
            // 添加点击事件
            airportItem.addEventListener('click', function() {
                // 移除所有项的选中状态
                document.querySelectorAll('.airport-item').forEach(item => {
                    item.classList.remove('selected');
                });
                
                // 添加选中状态
                this.classList.add('selected');
                
                // 创建所选机场的图表
                createAirportChart(data, this.dataset.airport);
            });
            
            // 添加到网格
            airportGrid.appendChild(airportItem);
        });
        
        // 默认选中第一个机场
        const firstAirport = airportGrid.querySelector('.airport-item');
        if (firstAirport) {
            firstAirport.classList.add('selected');
            createAirportChart(data, firstAirport.dataset.airport);
        }
    }
}

// 创建机场货运柱状图
function createAirportChart(data, selectedAirport) {
    console.log(`创建${selectedAirport}机场货运柱状图...`);
    
    // 筛选选定机场的数据
    const airportData = data.filter(item => item.airport === selectedAirport);
    
    // 按年份排序
    airportData.sort((a, b) => a.year.localeCompare(b.year));
    
    // 准备图表数据
    const years = airportData.map(item => item.year);
    
    // 创建数据集
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
    
    // 获取图表容器
    const chartCanvas = document.getElementById('airportChart');
    
    // 如果已存在图表，销毁它
    if (window.airportChartInstance) {
        window.airportChartInstance.destroy();
    }
    
    // 创建新图表
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

// 港口图片滚动功能
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
    const autoPlayInterval = 5000; // 增加到5秒，让用户有更多时间阅读
    
    // 如果元素不存在，直接返回
    if (!slides.length || !dots.length) {
        console.error('图片或指示点元素未找到');
        return;
    }
    
    // 开始自动播放功能
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
    
    // 停止自动播放
    function stopAutoPlay() {
        console.log('停止自动播放');
        if (autoPlayTimer) {
            clearInterval(autoPlayTimer);
            autoPlayTimer = null;
        }
    }

    // 为所有地图按钮添加点击事件
    exploreMapBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            console.log('点击了地图按钮');
            stopAutoPlay(); // 停止自动播放
            
            // 在当前窗口中加载新页面
            window.location.href = './src/components/Transport/uk-port.html';
        });
    });
    
    // 更新幻灯片和文字内容
    function updateSlides() {
        console.log('更新幻灯片到索引:', currentIndex);
        
        // 更新幻灯片和指示点
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));
        
        slides[currentIndex].classList.add('active');
        dots[currentIndex].classList.add('active');
        
        // 更新文字内容
        textContents.forEach(content => {
            content.classList.remove('active');
            content.style.opacity = '0';
            content.style.transform = 'translateY(20px)';
        });
        
        // 获取对应的文字内容
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
    
    // 设置按钮事件
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
    
    // 点击指示点切换图片
    dots.forEach((dot, index) => {
        dot.addEventListener('click', function() {
            stopAutoPlay();
            currentIndex = index;
            updateSlides();
            startAutoPlay();
        });
    });
    
    // 鼠标悬停暂停自动播放
    const imageContainer = document.querySelector('.port-image-container');
    if (imageContainer) {
        imageContainer.addEventListener('mouseenter', stopAutoPlay);
        imageContainer.addEventListener('mouseleave', startAutoPlay);
    }
    
    // 初始化显示第一张并启动自动播放
    updateSlides();
    startAutoPlay();
    
    // 确保页面可见时自动播放正常工作
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            stopAutoPlay();
        } else {
            startAutoPlay();
        }
    });
    
    // 当窗口重新获得焦点时重新开始自动播放
    window.addEventListener('focus', startAutoPlay);
    window.addEventListener('blur', stopAutoPlay);
}


