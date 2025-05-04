document.addEventListener('DOMContentLoaded', () => {
    // 获取所有时间线项目
    const timelineItems = document.querySelectorAll('.timeline-item');
    const impactItems = document.querySelectorAll('.impact-section li');

    // 创建观察器选项
    const observerOptions = {
        threshold: 0.2,
        rootMargin: '0px 0px -50px 0px'
    };

    // 时间线项目动画
    const timelineObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateX(0)';
                timelineObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // 为每个时间线项目添加初始样式和观察
    timelineItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = index % 2 === 0 ? 'translateX(-50px)' : 'translateX(50px)';
        item.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        timelineObserver.observe(item);
    });

    // 影响项目动画
    const impactObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                impactObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // 为每个影响项目添加初始样式和观察
    impactItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(20px)';
        item.style.transition = `opacity 0.6s ease ${index * 0.2}s, transform 0.6s ease ${index * 0.2}s`;
        impactObserver.observe(item);
    });

    // 时间线连接线动画
    const timeline = document.querySelector('.timeline');
    const timelineObserver2 = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.height = '100%';
                timelineObserver2.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    if (timeline) {
        const line = timeline.querySelector('::before');
        if (line) {
            line.style.height = '0';
            line.style.transition = 'height 1.5s ease';
            timelineObserver2.observe(timeline);
        }
    }
}); 