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
    
    // 获取地图容器和按钮
    const mapContainer = document.getElementById('map');
    const buttons = document.querySelectorAll('.transport-button');
    
    console.log('地图容器:', mapContainer);
    console.log('找到按钮数量:', buttons.length);
    
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
            
            // 显示地图容器
            mapContainer.style.display = 'block';
            
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
            
            // 根据按钮类型执行不同操作
            if (type === 'port') {
                console.log('显示地图...');
                // 创建并显示地图
                clearMapContainer(); // 先清除容器
                createMap();
            } else if (type === 'airport') {
                console.log('显示机场信息...');
                // 暂时不做功能，仅显示提示信息
                clearMapContainer();
                mapContainer.style.display = 'block';
                mapContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: white;">Coding...</div>';
            } else if (type === 'rail') {
                console.log('显示铁路信息...');
                // 暂时不做功能，仅显示提示信息
                clearMapContainer();
                mapContainer.style.display = 'block';
                mapContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: white;">Coding...</div>';
            }
        });
    });
    
    // 默认选中并点击port按钮
    console.log('尝试默认点击port按钮...');
    const portButton = document.querySelector('.transport-button[data-type="port"]');
    if (portButton) {
        console.log('找到port按钮，触发点击');
        portButton.classList.add('active');
        portButton.click();
    } else {
        console.error('找不到port按钮');
    }
}

