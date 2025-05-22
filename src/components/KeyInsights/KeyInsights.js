// Key Insights Component JavaScript
console.log("KeyInsights.js 文件已加载");

// 立即自执行函数确保代码在加载时执行
(function() {
  // 跟踪动画状态
  const animationState = {
    rowShown: false,
    summaryShown: false,
    waterfallShown: false
  };
  
  // 添加鼠标移动跟踪
  function handleMouseMove(event) {
    const boxes = document.querySelectorAll('.insight-box');
    boxes.forEach(box => {
      const rect = box.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / box.offsetWidth) * 100;
      const y = ((event.clientY - rect.top) / box.offsetHeight) * 100;
      box.style.setProperty('--mouse-x', `${x}%`);
      box.style.setProperty('--mouse-y', `${y}%`);
    });
  }
  
  // 添加滚动监听
  window.addEventListener('scroll', function() {
    const insightsSection = document.querySelector('.key-insights-section');
    if (!insightsSection) return;
    
    const insightsRow = document.querySelector('.insights-row');
    const summary = document.querySelector('.insights-summary');
    const waterfall = document.querySelector('.waterfall-container');
    
    if (!insightsRow || !summary || !waterfall) return;
    
    const windowHeight = window.innerHeight;
    const rowTop = insightsRow.getBoundingClientRect().top;
    const summaryTop = summary.getBoundingClientRect().top;
    const waterfallTop = waterfall.getBoundingClientRect().top;
    
    // 第一阶段：当insights-row进入视口时显示
    if (!animationState.rowShown && rowTop < windowHeight * 0.8) {
      animationState.rowShown = true;
      
      // 显示insights-row内的盒子
      const insightBoxes = document.querySelectorAll('.insight-box');
      insightBoxes.forEach((box, index) => {
        setTimeout(() => {
          box.classList.add('fade-in');
          // 添加鼠标移动监听
          box.addEventListener('mousemove', handleMouseMove);
          // 添加鼠标进入效果
          box.addEventListener('mouseenter', () => {
            box.style.transform = 'translateY(-5px) scale(1.01)';
          });
          // 添加鼠标离开效果
          box.addEventListener('mouseleave', () => {
            box.style.transform = 'translateY(0) scale(1)';
            // 重置光效位置
            box.style.setProperty('--mouse-x', '50%');
            box.style.setProperty('--mouse-y', '50%');
          });
        }, index * 300);
      });
      
      // 盒子淡入后加载线条动画
      setTimeout(() => {
        loadLineAnimations();
      }, 600);
    }
    
    // 第二阶段：只有当继续向下滚动，insights-summary接近视口时才显示
    if (!animationState.summaryShown && summaryTop < windowHeight * 0.85) {
      animationState.summaryShown = true;
      
      // 显示summary
      setTimeout(() => {
        summary.classList.add('fade-in');
      }, 150);
    }
    
    // 第三阶段：瀑布流容器显示
    if (!animationState.waterfallShown && waterfallTop < windowHeight * 0.8) {
      animationState.waterfallShown = true;
      
      // 显示瀑布流
      setTimeout(() => {
        waterfall.classList.add('fade-in');
        
        // 依次为瀑布流项目添加动画效果（注意中间容器需要特殊处理）
        const waterfallItems = document.querySelectorAll('.waterfall-item');
        waterfallItems.forEach((item, index) => {
          // 中间容器已经有高亮和文字默认显示的CSS，不需要设置opacity和transform
          if (!item.classList.contains('waterfall-center')) {
            setTimeout(() => {
              item.style.opacity = '1';
              item.style.transform = 'translateY(0)';
            }, 300 + index * 200);
          } else {
            // 中间容器直接显示，但保持默认的transform
            setTimeout(() => {
              item.style.opacity = '1';
            }, 300 + index * 200);
          }
        });
        
        // 添加鼠标交互，当鼠标移到其他容器时中间容器变灰
        setupWaterfallInteraction();
      }, 300);
    }
  });
  
  // 设置瀑布流鼠标交互
  function setupWaterfallInteraction() {
    const centerItem = document.querySelector('.waterfall-center');
    const sideItems = document.querySelectorAll('.waterfall-left, .waterfall-right');
    
    if (!centerItem || sideItems.length === 0) return;
    
    // 获取相关元素
    const centerImage = centerItem.querySelector('.waterfall-image');
    const centerContent = centerItem.querySelector('.waterfall-content');
    
    // 当鼠标移到侧边项目时
    sideItems.forEach(item => {
      item.addEventListener('mouseenter', () => {
        // 中间容器失去高亮
        centerItem.style.transform = 'translateY(0)';
        centerItem.style.boxShadow = 'none';
        
        if (centerImage) {
          centerImage.style.filter = 'grayscale(0.8) brightness(0.6)';
          centerImage.style.transform = 'scale(1)';
        }
        
        if (centerContent) {
          centerContent.style.opacity = '0';
          centerContent.style.transform = 'translateY(20px)';
        }
      });
      
      // 当鼠标离开侧边项目时
      item.addEventListener('mouseleave', () => {
        // 中间容器恢复高亮（除非鼠标移到了另一个侧边项目）
        if (!isMouseOverSideItems()) {
          centerItem.style.transform = 'translateY(-8px)';
          centerItem.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.4)';
          
          if (centerImage) {
            centerImage.style.filter = 'grayscale(0) brightness(1)';
            centerImage.style.transform = 'scale(1.05)';
          }
          
          if (centerContent) {
            centerContent.style.opacity = '1';
            centerContent.style.transform = 'translateY(0)';
          }
        }
      });
    });
    
    // 中间容器鼠标交互
    centerItem.addEventListener('mouseenter', () => {
      // 确保中间容器高亮
      centerItem.style.transform = 'translateY(-8px)';
      centerItem.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.4)';
      
      if (centerImage) {
        centerImage.style.filter = 'grayscale(0) brightness(1)';
        centerImage.style.transform = 'scale(1.05)';
      }
      
      if (centerContent) {
        centerContent.style.opacity = '1';
        centerContent.style.transform = 'translateY(0)';
      }
    });
    
    // 检查鼠标是否在任意侧边项目上
    function isMouseOverSideItems() {
      let result = false;
      sideItems.forEach(item => {
        if (item.matches(':hover')) {
          result = true;
        }
      });
      return result;
    }
  }
  
  // 加载线条动画
  function loadLineAnimations() {
    // 检查lottie是否已加载
    if (typeof lottie === 'undefined') {
      loadLottieLibrary();
      return;
    }
    
    // 加载下降趋势动画
    const euTradeContainer = document.getElementById('eu-trade-line');
    if (euTradeContainer) {
      lottie.loadAnimation({
        container: euTradeContainer,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'public/animated-line-chart-1.json',
        rendererSettings: {
          preserveAspectRatio: 'xMidYMid slice',
          progressiveLoad: true,
          hideOnTransparent: true
        }
      });
    }
    
    // 加载上升趋势动画
    const nonEuTradeContainer = document.getElementById('non-eu-trade-line');
    if (nonEuTradeContainer) {
      lottie.loadAnimation({
        container: nonEuTradeContainer,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'public/animated-line-chart-2.json',
        rendererSettings: {
          preserveAspectRatio: 'xMidYMid slice',
          progressiveLoad: true,
          hideOnTransparent: true
        }
      });
    }
  }
  
  // 加载Lottie库
  function loadLottieLibrary() {
    console.log("加载Lottie库...");
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js';
    script.onload = function() {
      console.log("Lottie库加载完成");
      loadLineAnimations();
    };
    script.onerror = function() {
      console.error("Lottie库加载失败");
    };
    document.head.appendChild(script);
  }
  
  // 初始化瀑布流项目样式
  function initWaterfallItems() {
    const waterfallItems = document.querySelectorAll('.waterfall-item');
    waterfallItems.forEach(item => {
      // 对中间容器进行特殊处理
      if (item.classList.contains('waterfall-center')) {
        item.style.opacity = '0'; // 初始隐藏，但保留其CSS中定义的transform效果
      } else {
        item.style.opacity = '0';
        item.style.transform = 'translateY(30px)';
      }
      item.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    });
  }
  
  // 初始化
  setTimeout(() => {
    initWaterfallItems();
    const scrollEvent = new Event('scroll');
    window.dispatchEvent(scrollEvent);
  }, 500);
})(); 