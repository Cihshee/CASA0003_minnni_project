// Key Insights Component JavaScript
console.log("KeyInsights.js 文件已加载");

(function() {
  const animationState = {
    rowShown: false,
    summaryShown: false,
    waterfallShown: false
  };
  
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
    
    if (!animationState.rowShown && rowTop < windowHeight * 0.8) {
      animationState.rowShown = true;
      
      const insightBoxes = document.querySelectorAll('.insight-box');
      insightBoxes.forEach((box, index) => {
        setTimeout(() => {
          box.classList.add('fade-in');
          box.addEventListener('mousemove', handleMouseMove);
          box.addEventListener('mouseenter', () => {
            box.style.transform = 'translateY(-5px) scale(1.01)';
          });
          box.addEventListener('mouseleave', () => {
            box.style.transform = 'translateY(0) scale(1)';
            box.style.setProperty('--mouse-x', '50%');
            box.style.setProperty('--mouse-y', '50%');
          });
        }, index * 300);
      });
      
      setTimeout(() => {
        loadLineAnimations();
      }, 600);
    }
    
    if (!animationState.summaryShown && summaryTop < windowHeight * 0.85) {
      animationState.summaryShown = true;
      
      setTimeout(() => {
        summary.classList.add('fade-in');
      }, 150);
    }
    
    if (!animationState.waterfallShown && waterfallTop < windowHeight * 0.8) {
      animationState.waterfallShown = true;
      
      setTimeout(() => {
        waterfall.classList.add('fade-in');
        
        const waterfallItems = document.querySelectorAll('.waterfall-item');
        waterfallItems.forEach((item, index) => {
          if (!item.classList.contains('waterfall-center')) {
            setTimeout(() => {
              item.style.opacity = '1';
              item.style.transform = 'translateY(0)';
            }, 300 + index * 200);
          } else {
            setTimeout(() => {
              item.style.opacity = '1';
            }, 300 + index * 200);
          }
        });
        
        setupWaterfallInteraction();
      }, 300);
    }
  });
  
  function setupWaterfallInteraction() {
    const centerItem = document.querySelector('.waterfall-center');
    const sideItems = document.querySelectorAll('.waterfall-left, .waterfall-right');
    
    if (!centerItem || sideItems.length === 0) return;
    
    const centerImage = centerItem.querySelector('.waterfall-image');
    const centerContent = centerItem.querySelector('.waterfall-content');
    
    sideItems.forEach(item => {
      item.addEventListener('mouseenter', () => {
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
      
      item.addEventListener('mouseleave', () => {
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
    
    centerItem.addEventListener('mouseenter', () => {
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
  
  function loadLineAnimations() {
    if (typeof lottie === 'undefined') {
      loadLottieLibrary();
      return;
    }
    
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
  
  function initWaterfallItems() {
    const waterfallItems = document.querySelectorAll('.waterfall-item');
    waterfallItems.forEach(item => {
      if (item.classList.contains('waterfall-center')) {
        item.style.opacity = '0';
      } else {
        item.style.opacity = '0';
        item.style.transform = 'translateY(30px)';
      }
      item.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    });
  }
  
  setTimeout(() => {
    initWaterfallItems();
    const scrollEvent = new Event('scroll');
    window.dispatchEvent(scrollEvent);
  }, 500);
})(); 