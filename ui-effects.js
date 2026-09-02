// ============================================================
// UI EFFECTS — تأثيرات الواجهة: الهيدر، العدادات، الزجاج، التمرير، البارالاكس
// ============================================================
(function() {
    'use strict';

    let lastScroll = 0;
    window.addEventListener('scroll', () => {
        const header = document.getElementById('header');
        const currentScroll = window.pageYOffset;

        if (currentScroll > 100) {
            header.style.boxShadow = '0 4px 20px rgba(0,0,0,.1)';
        } else {
            header.style.boxShadow = 'none';
        }

        lastScroll = currentScroll;
    });

    window.animateCounters = function() {
        const counters = document.querySelectorAll('.stat-box .num, .hero-stat strong, .achievement-num');

        counters.forEach(counter => {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const text = counter.textContent.trim();
                        const match = text.match(/\+?(\d+)/);
                        if (match) {
                            const target = parseInt(match[1]);
                            let current = 0;
                            const step = target / 50;
                            const duration = 2000;
                            const interval = duration / 50;

                            const timer = setInterval(() => {
                                current += step;
                                if (current >= target) {
                                    counter.textContent = text.replace(/\d+/, target);
                                    clearInterval(timer);
                                } else {
                                    counter.textContent = text.replace(/\d+/, Math.floor(current));
                                }
                            }, interval);
                        }
                        observer.unobserve(counter);
                    }
                });
            }, { threshold: 0.5 });

            observer.observe(counter);
        });
    };

    window.addGlassHoverEffects = function() {
        const glassElements = document.querySelectorAll('.prod-card, .cat-card, .about-feature, .stat-box, .info-card, .contact-form');

        glassElements.forEach(el => {
            el.addEventListener('mouseenter', function() {
                this.style.borderColor = 'rgba(14, 165, 233, 0.5)';
                this.style.boxShadow = '0 12px 40px rgba(14, 165, 233, 0.15)';
            });

            el.addEventListener('mouseleave', function() {
                this.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                this.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
            });
        });
    };

    window.initSmoothScroll = function() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href !== '#') {
                    e.preventDefault();
                    const target = document.querySelector(href);
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
            });
        });
    };

    window.initParallax = function() {
        const hero = document.querySelector('.hero');
        if (hero) {
            window.addEventListener('scroll', () => {
                const scrolled = window.pageYOffset;
                hero.style.transform = `translateY(${scrolled * 0.3}px)`;
            });
        }
    };

    window.initHeaderScroll = function() {
        const header = document.getElementById('header');
        if (header) {
            window.addEventListener('scroll', () => {
                if (window.pageYOffset > 100) {
                    header.style.background = 'transparent';
                    header.style.backdropFilter = 'blur(20px)';
                    header.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.3)';
                } else {
                    header.style.background = 'transparent';
                    header.style.backdropFilter = 'blur(20px)';
                    header.style.boxShadow = 'none';
                }
            });
        }
    };

    // ===== البطاقات المدمجة: الضغط على أي مكان فاضي في البطاقة يفتح نافذة التفاصيل =====
    document.addEventListener('click', function(e) {
        try {
            if (!e.target.closest) return;
            // العناصر اللي ليها وظيفة خاصة (صورة/اسم/أزرار/قلب المفضلة) تتخطى — ليها معالجاتها الأصلية
            if (e.target.closest('button, a, .wishlist-btn, .prod-img, .prod-name')) return;
            var card = e.target.closest('.prod-grid:not(.list-view) .prod-card');
            if (!card) return;
            var id = parseInt(card.getAttribute('data-id'), 10);
            if (id && typeof window.openProductModal === 'function') window.openProductModal(id);
        } catch (_) {}
    });

    // ===== إنشاء زر الهمبرغر للجوال =====
    function initMobileHamburger() {
        if (window.innerWidth <= 768) {
            var hamburger = document.createElement('button');
            hamburger.className = 'hamburger-btn';
            hamburger.setAttribute('aria-label', 'القائمة');
            hamburger.innerHTML = '<span></span><span></span><span></span>';
            hamburger.onclick = function() {
                document.querySelector('.nav-links').classList.toggle('active');
            };
            var headerInner = document.querySelector('.header-inner');
            if (headerInner) {
                headerInner.insertBefore(hamburger, headerInner.firstChild);
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMobileHamburger);
    } else {
        initMobileHamburger();
    }

    // ===== قفل قائمة الجوال بالضغط في أي مكان فاضي =====
    (function(){
        function doraMenuOutsideClose(e){
            var nl = document.querySelector('.nav-links');
            if (!nl || !nl.classList.contains('active')) return;
            /* لو الضغطة جوه القائمة أو على زر الهمبرغر/القائمة السفلي — متقفلش */
            if (nl.contains(e.target)) return;
            if (e.target.closest && (e.target.closest('.hamburger-btn') || e.target.closest('#bnMenuBtn') || e.target.closest('.header-inner'))) return;
            nl.classList.remove('active');
        }
        document.addEventListener('click', doraMenuOutsideClose, true);
        document.addEventListener('touchstart', doraMenuOutsideClose, { capture: true, passive: true });
    })();
})();
