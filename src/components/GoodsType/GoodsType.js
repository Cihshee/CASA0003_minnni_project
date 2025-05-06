document.addEventListener('DOMContentLoaded', () => {
    // 卡片动画
    const goodsCards = document.querySelectorAll('.goods-card');
    const chartBars = document.querySelectorAll('.chart-bar');
    const observerOptions = {
      threshold: 0.2,
      rootMargin: '0px 0px -50px 0px'
    };
  
    // 卡片进入动画
    const cardObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
          }, index * 200);
          cardObserver.unobserve(entry.target);
        }
      });
    }, observerOptions);
  
    goodsCards.forEach(card => {
      cardObserver.observe(card);
    });
  
    // 图表动画
    const chartObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          chartBars.forEach(bar => {
            const percentage = bar.getAttribute('data-percentage');
            const progress = bar.querySelector('.chart-progress');
            progress.style.width = `${percentage}%`;
          });
          chartObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
  
    const chartContainer = document.querySelector('.goods-chart');
    if (chartContainer) {
      chartObserver.observe(chartContainer);
    }
  });