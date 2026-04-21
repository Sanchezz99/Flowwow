document.addEventListener('DOMContentLoaded', function() {
    
    //Меню
    const hamburger = document.querySelector('.hamburger');
    const navMain = document.querySelector('.nav-main');
    
    if (hamburger && navMain) {
        hamburger.addEventListener('click', function() {
            navMain.classList.toggle('active');
            hamburger.classList.toggle('active');
            
            // Меняем иконку
            const icon = hamburger.querySelector('i');
            if (icon) {
                if (navMain.classList.contains('active')) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-times');
                } else {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });
        
        // Закрываем меню при клике на ссылку
        const navLinks = navMain.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                navMain.classList.remove('active');
                hamburger.classList.remove('active');
                const icon = hamburger.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            });
        });
        
        // Закрываем меню при клике вне его
        document.addEventListener('click', function(event) {
            if (!navMain.contains(event.target) && !hamburger.contains(event.target)) {
                navMain.classList.remove('active');
                hamburger.classList.remove('active');
                const icon = hamburger.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });
    }
    
    //Плавная прокрутка
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
                
                // Закрываем меню если оно открыто
                if (navMain && navMain.classList.contains('active')) {
                    navMain.classList.remove('active');
                    hamburger.classList.remove('active');
                    const icon = hamburger.querySelector('i');
                    if (icon) {
                        icon.classList.remove('fa-times');
                        icon.classList.add('fa-bars');
                    }
                }
            }
        });
    });
    
    //Подстветка активного пункта меню
    const navLinks = document.querySelectorAll('.nav-main a');
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    navLinks.forEach(link => {
        const linkPage = link.getAttribute('href').split('/').pop();
        if (linkPage === currentPage) {
            link.style.color = '#e83e8c';
            link.style.fontWeight = 'bold';
        }
    });
    
    //Адаптивные изображения
    function fixHeroImage() {
        const heroSlides = document.querySelectorAll('.slide');
        heroSlides.forEach(slide => {
            const bgImage = slide.style.backgroundImage;
            if (bgImage && bgImage.includes('url')) {
                slide.style.backgroundSize = 'cover';
                slide.style.backgroundPosition = 'center';
                slide.style.backgroundRepeat = 'no-repeat';
            }
        });
    }
    
    fixHeroImage();
    
    // Перепроверяем при изменении ориентации экрана
    window.addEventListener('resize', function() {
        fixHeroImage();
        // Закрываем меню при изменении размера (на десктопе)
        if (window.innerWidth > 768 && navMain && navMain.classList.contains('active')) {
            navMain.classList.remove('active');
            hamburger.classList.remove('active');
            const icon = hamburger.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        }
    });
});