document.addEventListener('DOMContentLoaded', () => {
    // 获取所有运输卡片
    const transportCards = document.querySelectorAll('.transport-card');
    const chartBars = document.querySelectorAll('.chart-bar');

    // 创建观察器选项
    const observerOptions = {
        threshold: 0.2,
        rootMargin: '0px 0px -50px 0px'
    };

    // 运输卡片动画
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

    // 为每个运输卡片添加观察
    transportCards.forEach(card => {
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

    // 观察图表容器
    const chartContainer = document.querySelector('.transport-chart');
    if (chartContainer) {
        chartObserver.observe(chartContainer);
    }

    // 添加悬停效果
    transportCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-5px)';
            card.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.3)';
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = 'none';
        });
    });
}); 