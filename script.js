document.addEventListener('DOMContentLoaded', () => {
    // 获取所有导航链接
    const navLinks = document.querySelectorAll('.nav-link');
    
    // 获取所有章节
    const sections = document.querySelectorAll('section');
    
    // 添加滚动事件监听
    window.addEventListener('scroll', () => {
        let current = '';
        
        // 检查每个章节是否在视口中
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            
            if (window.pageYOffset >= (sectionTop - sectionHeight/3)) {
                current = section.getAttribute('id');
            }
        });
        
        // 更新导航链接的激活状态
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').slice(1) === current) {
                link.classList.add('active');
            }
        });
    });
    
    // 平滑滚动到目标章节
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            window.scrollTo({
                top: targetSection.offsetTop - 80,
                behavior: 'smooth'
            });
        });
    });
    
    // 添加淡入动画效果
    const observerOptions = {
        threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // 观察所有章节
    sections.forEach(section => {
        observer.observe(section);
    });
}); 