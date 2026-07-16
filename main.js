// ==================== MAIN.JS - WORKS ON ALL PAGES ====================
// This file handles all interactive features for every page on the website
// It checks for element existence before running code to avoid errors

document.addEventListener('DOMContentLoaded', function() {

    // ==================== THEME TOGGLE (Dark/Light Mode) ====================
    initTheme();

    // ==================== SIDEBAR (Mobile Menu) ====================
    initSidebar();

    // ==================== CART ====================
    initCart();

    // ==================== HEADER SCROLL EFFECT ====================
    initHeaderScroll();

    // ==================== ANIMATIONS ON SCROLL ====================
    initScrollAnimations();

    // ==================== SMOOTH SCROLL FOR ANCHOR LINKS ====================
    initSmoothScroll();

    // ==================== QUOTE BUTTON ====================
    initQuoteButton();

    // ==================== CURRENT PAGE HIGHLIGHT ====================
    highlightCurrentPage();

    // ==================== FAQ ACCORDION (if exists) ====================
    initFAQ();

    // ==================== CONTACT FORM (if exists) ====================
    initContactForm();

    // ==================== PRODUCT FUNCTIONS (if exists) ====================
    initProducts();

});

// ==================== THEME FUNCTIONS ====================
function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const html = document.documentElement;

    if (!themeToggle) return; // Exit if button doesn't exist

    // Check saved theme or default to dark
    const savedTheme = localStorage.getItem('theme') || 'dark';
    html.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    themeToggle.addEventListener('click', function() {
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);

        // Dispatch custom event for other components
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: newTheme } }));
    });
}

function updateThemeIcon(theme) {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;

    const icon = themeToggle.querySelector('i');
    if (icon) {
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// ==================== SIDEBAR FUNCTIONS ====================
function initSidebar() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebarClose = document.getElementById('sidebarClose');

    if (!mobileMenuBtn || !sidebar) return; // Exit if elements don't exist

    function openSidebar() {
        sidebar.classList.add('active');
        if (sidebarOverlay) sidebarOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        sidebar.classList.remove('active');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    mobileMenuBtn.addEventListener('click', openSidebar);

    if (sidebarClose) {
        sidebarClose.addEventListener('click', closeSidebar);
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }

    // Close sidebar on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeSidebar();
    });

    // Close sidebar when clicking a link
    const sidebarLinks = sidebar.querySelectorAll('.sidebar-link');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', closeSidebar);
    });
}

// ==================== CART FUNCTIONS ====================
function initCart() {
    const cartBtn = document.getElementById('cartBtn');
    const cartCount = document.getElementById('cartCount');

    // Update cart count from localStorage
    updateCartCount();

    if (cartBtn) {
        cartBtn.addEventListener('click', function() {
            // For now, show a message. Later this can open a cart modal
            const cart = JSON.parse(localStorage.getItem('cart') || '[]');
            if (cart.length === 0) {
                showNotification('السلة فارغة', 'info');
            } else {
                showNotification('لديك ' + cart.length + ' منتجات في السلة', 'success');
            }
        });
    }
}

function updateCartCount() {
    const cartCount = document.getElementById('cartCount');
    if (!cartCount) return;

    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    cartCount.textContent = totalItems;

    // Animate the count change
    cartCount.style.transform = 'scale(1.3)';
    setTimeout(() => {
        cartCount.style.transform = 'scale(1)';
    }, 200);
}

function addToCart(product) {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');

    // Check if product already exists
    const existingIndex = cart.findIndex(item => item.id === product.id);

    if (existingIndex > -1) {
        cart[existingIndex].quantity = (cart[existingIndex].quantity || 1) + 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    showNotification('تمت إضافة المنتج إلى السلة', 'success');
}

// ==================== HEADER SCROLL EFFECT ====================
function initHeaderScroll() {
    const header = document.getElementById('header');
    if (!header) return;

    let lastScroll = 0;

    window.addEventListener('scroll', function() {
        const currentScroll = window.scrollY;

        // Add/remove scrolled class
        if (currentScroll > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        // Hide/show header on scroll direction (optional)
        if (currentScroll > lastScroll && currentScroll > 100) {
            header.style.transform = 'translateY(-100%)';
        } else {
            header.style.transform = 'translateY(0)';
        }

        lastScroll = currentScroll;
    });

    // Add transition for transform
    header.style.transition = 'transform 0.3s ease, background-color 0.3s ease, backdrop-filter 0.3s ease';
}

// ==================== SCROLL ANIMATIONS ====================
function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('.animate-on-scroll, .fade-in, .slide-up, .slide-in');

    if (animatedElements.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Optionally unobserve after animation
                // observer.unobserve(entry.target);
            }
        });
    }, { 
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    animatedElements.forEach(el => observer.observe(el));
}

// ==================== SMOOTH SCROLL ====================
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                const headerOffset = 80;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.scrollY - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ==================== QUOTE BUTTON ====================
function initQuoteButton() {
    const quoteBtn = document.getElementById('quoteBtn');
    const quickQuoteBtn = document.getElementById('quickQuoteBtn');

    function handleQuoteClick() {
        // Create a modal for quote request
        const modal = document.createElement('div');
        modal.className = 'quote-modal';
        modal.innerHTML = `
            <div class="quote-modal-overlay"></div>
            <div class="quote-modal-content">
                <button class="quote-modal-close">&times;</button>
                <h2>اطلب عرض سعر</h2>
                <p>املأ النموذج وسنقدم لك عرض سعر مخصص خلال 24 ساعة</p>
                <form class="quote-form">
                    <input type="text" placeholder="الاسم" required>
                    <input type="tel" placeholder="رقم الهاتف" required>
                    <input type="email" placeholder="البريد الإلكتروني">
                    <textarea placeholder="تفاصيل الطلب" rows="4" required></textarea>
                    <button type="submit" class="btn btn-primary">إرسال الطلب</button>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        // Close modal
        modal.querySelector('.quote-modal-close').addEventListener('click', () => {
            modal.remove();
            document.body.style.overflow = '';
        });

        modal.querySelector('.quote-modal-overlay').addEventListener('click', () => {
            modal.remove();
            document.body.style.overflow = '';
        });

        // Form submit
        modal.querySelector('.quote-form').addEventListener('submit', (e) => {
            e.preventDefault();
            showNotification('تم إرسال طلبك بنجاح! سنتواصل معك قريباً', 'success');
            modal.remove();
            document.body.style.overflow = '';
        });
    }

    if (quoteBtn) {
        quoteBtn.addEventListener('click', handleQuoteClick);
    }

    if (quickQuoteBtn) {
        quickQuoteBtn.addEventListener('click', handleQuoteClick);
    }
}

// ==================== CURRENT PAGE HIGHLIGHT ====================
function highlightCurrentPage() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // Highlight nav links
    document.querySelectorAll('.nav-link, .sidebar-link').forEach(link => {
        const linkPage = link.getAttribute('href');
        if (linkPage === currentPage || (currentPage === '' && linkPage === 'index.html')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// ==================== FAQ ACCORDION ====================
function initFAQ() {
    const faqQuestions = document.querySelectorAll('.faq-question');
    const faqCategories = document.querySelectorAll('.faq-category');

    if (faqQuestions.length === 0) return;

    // Toggle FAQ items
    faqQuestions.forEach(question => {
        question.addEventListener('click', function() {
            const item = this.parentElement;
            const isActive = item.classList.contains('active');

            // Close all items
            document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));

            // Open clicked item if it wasn't active
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });

    // Filter by category
    if (faqCategories.length > 0) {
        faqCategories.forEach(btn => {
            btn.addEventListener('click', function() {
                const category = this.dataset.category;

                // Update active button
                faqCategories.forEach(b => b.classList.remove('active'));
                this.classList.add('active');

                // Filter items
                document.querySelectorAll('.faq-item').forEach(item => {
                    if (category === 'all' || item.dataset.category === category) {
                        item.style.display = 'block';
                        setTimeout(() => item.style.opacity = '1', 10);
                    } else {
                        item.style.opacity = '0';
                        setTimeout(() => item.style.display = 'none', 300);
                    }
                });
            });
        });
    }
}

// ==================== CONTACT FORM ====================
function initContactForm() {
    const contactForm = document.getElementById('contactForm');
    if (!contactForm) return;

    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const formData = {
            name: document.getElementById('contactName')?.value,
            email: document.getElementById('contactEmail')?.value,
            phone: document.getElementById('contactPhone')?.value,
            subject: document.getElementById('contactSubject')?.value,
            message: document.getElementById('contactMessage')?.value
        };

        // Validate
        if (!formData.name || !formData.phone || !formData.message) {
            showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
            return;
        }

        // Show success
        showNotification('تم إرسال رسالتك بنجاح! سنتواصل معك في أقرب وقت', 'success');

        // Reset form
        this.reset();
    });
}

// ==================== PRODUCT FUNCTIONS ====================
function initProducts() {
    // Add to cart buttons on product cards
    document.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();

            const card = this.closest('.product-card');
            if (!card) return;

            const product = {
                id: card.dataset.id || Date.now().toString(),
                name: card.querySelector('.product-title')?.textContent || 'منتج',
                price: card.querySelector('.product-price .current')?.textContent || '0',
                image: card.querySelector('.product-image img')?.src || ''
            };

            addToCart(product);
        });
    });

    // Product category filters (if exists)
    const categoryFilters = document.querySelectorAll('.category-filter');
    if (categoryFilters.length > 0) {
        categoryFilters.forEach(filter => {
            filter.addEventListener('click', function() {
                const category = this.dataset.category;

                // Update active filter
                categoryFilters.forEach(f => f.classList.remove('active'));
                this.classList.add('active');

                // Filter products
                document.querySelectorAll('.product-card').forEach(card => {
                    if (category === 'all' || card.dataset.category === category) {
                        card.style.display = 'block';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        });
    }
}

// ==================== NOTIFICATION SYSTEM ====================
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;

    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        left: 50%;
        transform: translateX(-50%) translateY(-20px);
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#0ea5e9'};
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 12px;
        font-weight: 600;
        z-index: 9999;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        opacity: 0;
        transition: all 0.3s ease;
    `;

    document.body.appendChild(notification);

    // Animate in
    requestAnimationFrame(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(-50%) translateY(0)';
    });

    // Remove after delay
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(-50%) translateY(-20px)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ==================== LAZY LOADING ====================
function initLazyLoading() {
    const lazyImages = document.querySelectorAll('img[data-src]');

    if (lazyImages.length === 0) return;

    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                imageObserver.unobserve(img);
            }
        });
    });

    lazyImages.forEach(img => imageObserver.observe(img));
}

// ==================== SEARCH FUNCTIONALITY ====================
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');

    if (!searchInput) return;

    searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();

        if (query.length < 2) {
            if (searchResults) searchResults.style.display = 'none';
            return;
        }

        // Search in products (if product data is available)
        const products = document.querySelectorAll('.product-card');
        const matches = [];

        products.forEach(product => {
            const title = product.querySelector('.product-title')?.textContent.toLowerCase() || '';
            const category = product.querySelector('.product-category')?.textContent.toLowerCase() || '';

            if (title.includes(query) || category.includes(query)) {
                matches.push(product);
            }
        });

        // Show results
        if (searchResults) {
            if (matches.length > 0) {
                searchResults.innerHTML = matches.map(p => `
                    <div class="search-result-item" onclick="location.href='${p.querySelector('a')?.href || '#'}'">
                        <img src="${p.querySelector('img')?.src || ''}" alt="">
                        <div>
                            <h4>${p.querySelector('.product-title')?.textContent || ''}</h4>
                            <p>${p.querySelector('.product-price .current')?.textContent || ''}</p>
                        </div>
                    </div>
                `).join('');
                searchResults.style.display = 'block';
            } else {
                searchResults.innerHTML = '<div class="search-no-results">لا توجد نتائج</div>';
                searchResults.style.display = 'block';
            }
        }
    });

    // Close search on click outside
    document.addEventListener('click', function(e) {
        if (searchResults && !e.target.closest('.search-container')) {
            searchResults.style.display = 'none';
        }
    });
}

// ==================== BACK TO TOP ====================
function initBackToTop() {
    const backToTop = document.getElementById('backToTop');
    if (!backToTop) return;

    window.addEventListener('scroll', function() {
        if (window.scrollY > 500) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    });

    backToTop.addEventListener('click', function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ==================== COUNTER ANIMATION ====================
function initCounters() {
    const counters = document.querySelectorAll('.counter');
    if (counters.length === 0) return;

    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                const target = parseInt(counter.dataset.target) || 0;
                const duration = 2000;
                const step = target / (duration / 16);
                let current = 0;

                const updateCounter = () => {
                    current += step;
                    if (current < target) {
                        counter.textContent = Math.floor(current);
                        requestAnimationFrame(updateCounter);
                    } else {
                        counter.textContent = target;
                    }
                };

                updateCounter();
                counterObserver.unobserve(counter);
            }
        });
    });

    counters.forEach(counter => counterObserver.observe(counter));
}

// ==================== PARALLAX EFFECT ====================
function initParallax() {
    const parallaxElements = document.querySelectorAll('.parallax');
    if (parallaxElements.length === 0) return;

    window.addEventListener('scroll', function() {
        const scrolled = window.scrollY;

        parallaxElements.forEach(el => {
            const speed = el.dataset.speed || 0.5;
            el.style.transform = `translateY(${scrolled * speed}px)`;
        });
    });
}

// ==================== TYPING EFFECT ====================
function initTypingEffect() {
    const typingElement = document.querySelector('.typing-effect');
    if (!typingElement) return;

    const text = typingElement.dataset.text || typingElement.textContent;
    const speed = parseInt(typingElement.dataset.speed) || 100;

    typingElement.textContent = '';
    let i = 0;

    function type() {
        if (i < text.length) {
            typingElement.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }

    type();
}

// ==================== TABS ====================
function initTabs() {
    const tabContainers = document.querySelectorAll('.tabs-container');
    if (tabContainers.length === 0) return;

    tabContainers.forEach(container => {
        const tabs = container.querySelectorAll('.tab');
        const panels = container.querySelectorAll('.tab-panel');

        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const target = this.dataset.tab;

                // Update tabs
                tabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');

                // Update panels
                panels.forEach(p => {
                    if (p.dataset.panel === target) {
                        p.classList.add('active');
                    } else {
                        p.classList.remove('active');
                    }
                });
            });
        });
    });
}

// ==================== MODAL ====================
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Close modal on escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    }
});

// ==================== FORM VALIDATION ====================
function validateForm(form) {
    const inputs = form.querySelectorAll('input[required], textarea[required], select[required]');
    let isValid = true;

    inputs.forEach(input => {
        if (!input.value.trim()) {
            isValid = false;
            input.classList.add('error');

            // Add error message
            let errorMsg = input.parentElement.querySelector('.error-message');
            if (!errorMsg) {
                errorMsg = document.createElement('span');
                errorMsg.className = 'error-message';
                errorMsg.style.cssText = 'color: #ef4444; font-size: 0.85rem; margin-top: 4px; display: block;';
                input.parentElement.appendChild(errorMsg);
            }
            errorMsg.textContent = 'هذا الحقل مطلوب';
        } else {
            input.classList.remove('error');
            const errorMsg = input.parentElement.querySelector('.error-message');
            if (errorMsg) errorMsg.remove();
        }
    });

    return isValid;
}

// ==================== COOKIE CONSENT ====================
function initCookieConsent() {
    const cookieConsent = document.getElementById('cookieConsent');
    if (!cookieConsent) return;

    // Check if user already accepted
    if (localStorage.getItem('cookiesAccepted')) {
        cookieConsent.style.display = 'none';
        return;
    }

    const acceptBtn = cookieConsent.querySelector('.accept-cookies');
    const declineBtn = cookieConsent.querySelector('.decline-cookies');

    if (acceptBtn) {
        acceptBtn.addEventListener('click', () => {
            localStorage.setItem('cookiesAccepted', 'true');
            cookieConsent.style.display = 'none';
        });
    }

    if (declineBtn) {
        declineBtn.addEventListener('click', () => {
            cookieConsent.style.display = 'none';
        });
    }
}

// ==================== PWA INSTALL PROMPT ====================
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    // Show install button if exists
    const installBtn = document.getElementById('installPwa');
    if (installBtn) {
        installBtn.style.display = 'flex';
        installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    console.log('PWA installed');
                }
                deferredPrompt = null;
            }
        });
    }
});

// ==================== SERVICE WORKER REGISTRATION ====================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('SW registered:', registration);
            })
            .catch(error => {
                console.log('SW registration failed:', error);
            });
    });
}

// ==================== PERFORMANCE OPTIMIZATION ====================
// Preload critical resources
function preloadResources() {
    const criticalImages = document.querySelectorAll('img[data-preload]');
    criticalImages.forEach(img => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = img.dataset.preload;
        document.head.appendChild(link);
    });
}

// ==================== UTILITY FUNCTIONS ====================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Format number with commas
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('تم النسخ بنجاح', 'success');
    }).catch(() => {
        showNotification('فشل النسخ', 'error');
    });
}

// ==================== INITIALIZE ON LOAD ====================
window.addEventListener('load', function() {
    initLazyLoading();
    initSearch();
    initBackToTop();
    initCounters();
    initParallax();
    initTypingEffect();
    initTabs();
    initCookieConsent();
    preloadResources();
});
