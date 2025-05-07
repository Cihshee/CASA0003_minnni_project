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
    
    // 检查是否从港口页面返回
    function checkReturnFromPortPage() {
        const returnedFromPortPage = sessionStorage.getItem('returnedFromPortPage');
        if (returnedFromPortPage === 'true') {
            // 清除返回标记
            sessionStorage.removeItem('returnedFromPortPage');
            
            // 获取存储的位置
            const savedPosition = sessionStorage.getItem('mapPosition');
            if (savedPosition) {
                try {
                    const position = JSON.parse(savedPosition);
                    if (map && position.center && position.zoom) {
                        // 恢复地图位置
                        map.setCenter(position.center);
                        map.setZoom(position.zoom);
                    }
                } catch (error) {
                    console.error('解析存储的位置数据时出错:', error);
                }
            }
        }
    }
    
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
                
                // 在地图加载完成后检查是否从港口页面返回
                checkReturnFromPortPage();
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
    
    // 为探索地图按钮添加点击事件
    if (exploreMapBtn) {
        exploreMapBtn.addEventListener('click', function() {
            console.log('点击了探索地图按钮');
            
            // 隐藏port内容
            if (portContent) {
                portContent.style.display = 'none';
            }
            
            // 显示地图
            mapContainer.style.display = 'block';
            
            // 创建地图
            createMap();
            
            // 保存当前位置到会话存储，方便返回时恢复
            if (map) {
                const position = {
                    center: map.getCenter(),
                    zoom: map.getZoom()
                };
                sessionStorage.setItem('mapPosition', JSON.stringify(position));
            }
            
            // 根据当前地图类型跳转到相应页面
            window.location.href = '/src/components/Transport/uk-port.html';
        });
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
                }
                
                // 清除地图
                clearMapContainer();
            } else if (type === 'airport') {
                console.log('显示机场信息...');
                // 隐藏港口内容
                if (portContent) {
                    portContent.style.display = 'none';
                }
                
                // 显示提示信息
                mapContainer.style.display = 'block';
                mapContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: white;">Air transport, accounting for around 40% of the UK’s export value despite only 1% of its total cargo volume, is crucial for quickly moving high-value goods across global markets.</div>';
                
                // 清除地图
                clearMapContainer();
            } else if (type === 'rail') {
                console.log('显示铁路信息...');
                // 隐藏港口内容
                if (portContent) {
                    portContent.style.display = 'none';
                }
                
                // 显示提示信息
                mapContainer.style.display = 'block';
                mapContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: white;">Rail transport in the UK moves approximately 86 million tonnes of freight annually, providing an efficient and eco-friendly option for domestic goods movement over longer distances.</div>';
                
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
        portButton.click();
        
        // 初始化视频处理
        initPortVideo();
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

