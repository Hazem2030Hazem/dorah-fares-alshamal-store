// ============================================================
// PRODUCTS — عرض المنتجات، الفلترة، الترتيب، ونوافذ التفاصيل
// ============================================================
(function() {
    'use strict';

    const catLabels = {
        printers: 'طابعات', computers: 'كمبيوتر', ram: 'رامات',
        storage: 'هاردات', cables: 'وصلات', projectors: 'بروجكتور', accessories: 'إكسسوارات',
        ink: 'أحبار الطابعات', food: 'المواد الغذائية'
    };

    window.currentFilter = 'all';
    let currentSort = 'default';
    let viewMode = 'grid';
    let productsVisibleCount = 0;
    let lastRenderFilter = null;
    const PRODUCTS_PAGE_ALL = 24;
    const PRODUCTS_PAGE_FILTERED = 48;

    window.productsData = window.productsData || [];
    let currentProductId = null;

    // للوصول السريع من HTML
    window.catLabels = catLabels;

    function getCartRef() {
        return (typeof window.cart !== 'undefined' && Array.isArray(window.cart))
            ? window.cart
            : JSON.parse(localStorage.getItem('doraCart') || '[]');
    }

    function getWishlistRef() {
        return (typeof window.wishlist !== 'undefined' && Array.isArray(window.wishlist))
            ? window.wishlist
            : JSON.parse(localStorage.getItem('doraWishlist') || '[]');
    }

    function getCompareRef() {
        return (typeof window.compareList !== 'undefined' && Array.isArray(window.compareList))
            ? window.compareList
            : JSON.parse(localStorage.getItem('doraCompare') || '[]');
    }

    function getSortedProducts(filter) {
        let data = (window.productsData && Array.isArray(window.productsData)) ? window.productsData : [];
        let filtered = filter === 'all' ? [...data] : data.filter(p => p.category === filter);

        switch(currentSort) {
            case 'price-asc': filtered.sort((a,b) => a.price - b.price); break;
            case 'price-desc': filtered.sort((a,b) => b.price - a.price); break;
            case 'name-asc': filtered.sort((a,b) => a.name.localeCompare(b.name)); break;
            case 'name-desc': filtered.sort((a,b) => b.name.localeCompare(a.name)); break;
            case 'stock': filtered.sort((a,b) => b.stock - a.stock); break;
        }
        return filtered;
    }

    window.loadMoreProducts = function() {
        const step = (window.currentFilter === 'all') ? PRODUCTS_PAGE_ALL : PRODUCTS_PAGE_FILTERED;
        productsVisibleCount += step;
        window.renderProducts(window.currentFilter);
    };

    window.renderProducts = function(filter) {
        if (filter !== lastRenderFilter) {
            productsVisibleCount = (filter === 'all') ? PRODUCTS_PAGE_ALL : PRODUCTS_PAGE_FILTERED;
            lastRenderFilter = filter;
        }
        window.currentFilter = filter;
        const grid = document.getElementById('productsGrid');
        if (!grid) return;

        const filtered = getSortedProducts(filter);
        if (!productsVisibleCount || productsVisibleCount < 1) {
            productsVisibleCount = (filter === 'all') ? PRODUCTS_PAGE_ALL : PRODUCTS_PAGE_FILTERED;
        }
        const visible = filtered.slice(0, productsVisibleCount);
        const cart = getCartRef();
        const wishlist = getWishlistRef();
        const compareList = getCompareRef();

        grid.innerHTML = visible.map(p => {
            const stockClass = window.getStockClass(p.stock);
            const stockLabel = window.getStockLabel(p.stock);
            const stockPercent = window.getStockPercent(p.stock);
            const outOfStock = p.stock <= 0;
            const inCart = cart.find(c => c.id === p.id);
            const cartQty = inCart ? inCart.qty : 0;
            const canAdd = !outOfStock && (p.stock - cartQty) > 0;
            const isWishlisted = wishlist.includes(p.id);
            const isCompared = compareList.includes(p.id);
            const hasDiscount = p.oldPrice && p.oldPrice > p.price;
            const discountPercent = hasDiscount ? Math.round((1 - p.price/p.oldPrice) * 100) : 0;
            const stars = '★'.repeat(Math.floor(p.rating || 0)) + '☆'.repeat(5 - Math.floor(p.rating || 0));

            return `
                <div class="prod-card ${isWishlisted ? 'wishlisted' : ''}" data-category="${p.category}" data-id="${p.id}">
                    <div class="prod-img" data-action="open-modal" data-product-id="${p.id}">
                        ${p.badge ? `<div class="prod-badge ${p.badge === 'جديد' ? 'new' : p.badge === 'خصم' ? 'discount' : ''}">${p.badge}${hasDiscount && p.badge === 'خصم' ? ' -' + discountPercent + '%' : ''}</div>` : ''}
                        ${hasDiscount && !p.badge ? `<div class="prod-badge discount">خصم -${discountPercent}%</div>` : ''}
                        <div style="position:relative; width:100%; height:220px; background:#f5f7fa; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                            <img src="${p.image && p.image.length > 0 ? p.image : ''}" alt="${window.sanitizeInput(p.name)}" style="max-width:100%; max-height:100%; object-fit:contain;" data-dora-error="fallback" loading="lazy">
                        </div>
                    </div>
                    <button class="wishlist-btn ${isWishlisted ? 'active' : ''}" data-action="wishlist" data-product-id="${p.id}" aria-label="${isWishlisted ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}">
                        ${isWishlisted ? '❤️' : '🤍'}
                    </button>
                    <div class="prod-body">
                        <span class="prod-tag">${catLabels[p.category]}</span>
                        <h4 class="prod-name" data-action="open-modal" data-product-id="${p.id}">${window.sanitizeInput(p.name)}</h4>
                        <div class="modal-rating" style="margin-bottom:8px">
                            <span class="stars">${stars}</span>
                            <span class="rating-text">${p.rating || 0} (${p.reviews ? p.reviews.length : 0} تقييم)</span>
                        </div>
                        <p class="prod-desc">${window.sanitizeInput(p.desc)}</p>
                        <div class="stock-indicator ${stockClass}">
                            <div class="stock-header">
                                <span class="stock-label">📦 المخزون</span>
                                <span class="stock-value">${stockLabel}</span>
                            </div>
                            <div class="stock-bar-bg">
                                <div class="stock-bar-fill" style="width:${stockPercent}%"></div>
                            </div>
                        </div>
                        <div class="prod-footer">
                            <div class="prod-price">
                                ${hasDiscount ? `<span class="old-price">${window.formatPrice(p.oldPrice)}</span>` : ''}
                                ${window.formatPrice(p.price)}
                            </div>
                            <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
                                <button class="quote-btn" data-action="quote" data-product-id="${p.id}" aria-label="اطلب عرض سعر">📋 عرض سعر</button>
                                <button class="quick-view-btn-icon" data-action="quick-view" data-product-id="${p.id}" aria-label="نظرة سريعة" style="background:transparent;border:1px solid #D1D5DB;color:#374151;padding:8px 12px;border-radius:8px;cursor:pointer;font-size:13px;display:inline-flex;align-items:center;gap:4px;transition:all 0.3s ease">👁️</button>
                                <button class="compare-btn ${isCompared ? 'active' : ''}" data-action="compare" data-product-id="${p.id}" aria-label="مقارنة">${isCompared ? '✓' : '⚖️'}</button>
                                <button class="add-btn" data-action="add-to-cart" data-product-id="${p.id}" ${!canAdd ? 'disabled' : ''} aria-label="${outOfStock ? 'نفذت الكمية' : 'أضف للسلة'}">
                                    ${p.badge === 'تحت التسعير' ? '🔒 قيد التسعير' : (outOfStock ? '❌ نفذت' : (canAdd ? '🛒 أضف' : '⚠️ الكمية محدودة'))}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>`;
        }).join('');

        // زر «عرض المزيد» + عدّاد
        (function() {
            let wrap = document.getElementById('loadMoreWrap');
            if (!wrap) {
                wrap = document.createElement('div');
                wrap.id = 'loadMoreWrap';
                wrap.style.cssText = 'width:100%;text-align:center;margin:20px 0;display:flex;flex-direction:column;align-items:center;gap:10px;';
                if (grid.parentNode) {
                    if (grid.nextSibling) grid.parentNode.insertBefore(wrap, grid.nextSibling);
                    else grid.parentNode.appendChild(wrap);
                }
            }
            if (filtered.length > visible.length) {
                wrap.style.display = 'flex';
                wrap.innerHTML = '<div style="color:#6B7280;font-size:14px">عرض ' + visible.length + ' من ' + filtered.length + ' منتجاً</div>' +
                    '<button type="button" data-action="load-more" class="load-more-btn" style="background:#1D4ED8;color:#fff;border:none;padding:12px 34px;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit">عرض المزيد ⬇</button>';
            } else {
                wrap.style.display = 'none';
                wrap.innerHTML = '';
            }
        })();

        document.querySelectorAll('.filter-tab').forEach(btn => {
            btn.classList.remove('active');
            if (filter === 'all' && btn.textContent === 'الكل') btn.classList.add('active');
            else if (filter === 'printers' && btn.textContent === 'طابعات') btn.classList.add('active');
            else if (filter === 'computers' && btn.textContent === 'كمبيوتر') btn.classList.add('active');
            else if (filter === 'ram' && btn.textContent === 'رامات') btn.classList.add('active');
            else if (filter === 'storage' && btn.textContent === 'هاردات') btn.classList.add('active');
            else if (filter === 'cables' && btn.textContent === 'وصلات') btn.classList.add('active');
            else if (filter === 'projectors' && btn.textContent === 'بروجكتور') btn.classList.add('active');
            else if (filter === 'accessories' && btn.textContent === 'إكسسوارات') btn.classList.add('active');
            else if (filter === 'ink' && btn.textContent.includes('أحبار')) btn.classList.add('active');
            else if (filter === 'food' && btn.textContent.includes('غذائية')) btn.classList.add('active');
        });

        window.updateCategoryCounts();
        window.updateBreadcrumb(filter);
    };

    window.setViewMode = function(mode) {
        viewMode = mode;
        document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
        if (event && event.target) event.target.classList.add('active');
        const grid = document.getElementById('productsGrid');
        if (grid) grid.classList.toggle('list-view', mode === 'list');
    };

    window.updateCategoryCounts = function() {
        const data = (window.productsData && Array.isArray(window.productsData)) ? window.productsData : [];
        const cats = ['printers','computers','ram','storage','cables','projectors','accessories','ink','food'];
        cats.forEach(cat => {
            const count = data.filter(p => p.category === cat && p.stock > 0).length;
            const el = document.getElementById('cat-' + cat);
            if (el) el.textContent = count + ' منتجات';
        });
        const total = data.filter(p => p.stock > 0).length;
        const statEl = document.getElementById('statProducts');
        const availEl = document.getElementById('statAvailable');
        if (statEl) statEl.textContent = '+' + data.length;
        if (availEl) availEl.textContent = '+' + total;
    };

    window.updateBreadcrumb = function(filter) {
        const breadcrumb = document.getElementById('breadcrumb');
        const current = document.getElementById('breadcrumbCurrent');
        if (!breadcrumb || !current) return;
        if (filter === 'all') {
            breadcrumb.style.display = 'none';
        } else {
            breadcrumb.style.display = 'block';
            current.textContent = catLabels[filter] || 'المنتجات';
        }
    };

    window.openProductModal = function(productId) {
        const data = (window.productsData && Array.isArray(window.productsData)) ? window.productsData : [];
        const p = data.find(x => x.id === productId);
        if (!p) return;
        currentProductId = productId;
        const stars = '★'.repeat(Math.floor(p.rating || 0)) + '☆'.repeat(5 - Math.floor(p.rating || 0));
        const hasDiscount = p.oldPrice && p.oldPrice > p.price;
        const discountPercent = hasDiscount ? Math.round((1 - p.price/p.oldPrice) * 100) : 0;

        const reviewsHtml = p.reviews && p.reviews.length > 0 ? p.reviews.map(r => `
            <div class="review-item">
                <div class="review-header">
                    <span class="review-author">${window.sanitizeInput(r.author)}</span>
                    <span class="review-date">${r.date}</span>
                </div>
                <div class="review-stars">${'★'.repeat(r.stars)}${'☆'.repeat(5-r.stars)}</div>
                <div class="review-text">${window.sanitizeInput(r.text)}</div>
            </div>`).join('') : '<p style="color:var(--text-muted);font-size:13px">لا توجد مراجعات بعد. كن أول من يقيم!</p>';

        const relatedProducts = data
            .filter(x => x.category === p.category && x.id !== p.id)
            .slice(0, 4);

        const content = document.getElementById('productModalContent');
        if (content) content.innerHTML = `
            <div class="modal-image">
                <div style="position:relative; width:100%; height:300px; background:#f5f7fa; display:flex; align-items:center; justify-content:center; border-radius:12px; overflow:hidden;">
                    <img src="${p.image && p.image.length > 0 ? p.image : ''}" alt="${window.sanitizeInput(p.name)}" style="max-width:100%; max-height:100%; object-fit:contain;" data-dora-error="fallback" loading="lazy">
                </div>
            </div>
            <div class="modal-info">
                <span class="modal-category">${catLabels[p.category]}</span>
                <h2 class="modal-name">${window.sanitizeInput(p.name)}</h2>
                <div class="modal-rating">
                    <span class="stars">${stars}</span>
                    <span class="rating-text">${p.rating || 0} (${p.reviews ? p.reviews.length : 0} تقييم)</span>
                </div>
                <p class="modal-desc">${window.sanitizeInput(p.desc)}</p>
                <div class="modal-price">
                    ${hasDiscount ? `<span style="text-decoration:line-through;color:var(--text-muted);font-size:20px;margin-left:10px">${window.formatPrice(p.oldPrice)}</span>` : ''}
                    ${window.formatPrice(p.price)}
                    ${hasDiscount ? `<span style="background:var(--accent);color:white;padding:4px 10px;border-radius:20px;font-size:12px;margin-right:10px">خصم ${discountPercent}%</span>` : ''}
                </div>
                <div class="modal-actions">
                    <button class="modal-btn modal-btn-primary" data-action="add-to-cart" data-product-id="${p.id}" data-close-modal="productModal">🛒 أضف للسلة</button>
                    <button class="modal-btn modal-btn-secondary" data-action="wishlist" data-product-id="${p.id}" data-close-modal="productModal">${getWishlistRef().includes(p.id) ? '❤️ في المفضلة' : '🤍 أضف للمفضلة'}</button>
                </div>
                <div class="modal-reviews">
                    <h4>📋 مراجعات العملاء</h4>
                    ${reviewsHtml}
                    <div class="product-rating-section">
                        <button class="product-rating-btn" data-action="rate" data-product-id="${p.id}" data-product-name="${window.sanitizeInput(p.name)}">⭐ قيّم هذا المنتج</button>
                    </div>
                </div>
            </div>`;

        const relBox = document.getElementById('relatedProducts');
        const relGrid = document.getElementById('relatedGrid');
        if (relBox && relGrid && relatedProducts.length > 0) {
            relBox.style.display = 'block';
            relGrid.innerHTML = relatedProducts.map(rp => `
                <div class="prod-card" data-action="open-modal" data-product-id="${rp.id}" style="cursor:pointer">
                    <div class="prod-img" style="height:160px">
                        <img src="${rp.image}" alt="${window.sanitizeInput(rp.name)}" loading="lazy" style="height:100%">
                    </div>
                    <div class="prod-body" style="padding:15px">
                        <h4 class="prod-name" style="font-size:14px">${window.sanitizeInput(rp.name)}</h4>
                        <div class="prod-price" style="font-size:18px">${window.formatPrice(rp.price)}</div>
                    </div>
                </div>`).join('');
        } else if (relBox) {
            relBox.style.display = 'none';
        }

        const pmOverlay = document.getElementById('productModalOverlay');
        if (pmOverlay) pmOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    window.closeProductModal = function(e) {
        if (e && e.target !== e.currentTarget) return;
        const pmOverlay = document.getElementById('productModalOverlay');
        if (pmOverlay) pmOverlay.classList.remove('active');
        document.body.style.overflow = '';
        currentProductId = null;
    };

    window.openQuickView = function(productId) {
        const data = (window.productsData && Array.isArray(window.productsData)) ? window.productsData : [];
        const p = data.find(x => x.id === productId);
        if (!p) return;
        const stars = '★'.repeat(Math.floor(p.rating || 0)) + '☆'.repeat(5 - Math.floor(p.rating || 0));
        const hasDiscount = p.oldPrice && p.oldPrice > p.price;
        const wishlist = getWishlistRef();
        const isWishlisted = wishlist.includes(productId);
        const stockClass = window.getStockClass(p.stock);
        const stockLabel = window.getStockLabel(p.stock);
        const stockPercent = window.getStockPercent(p.stock);
        const content = document.getElementById('quickViewContent');
        if (!content) { window.openProductModal(productId); return; }

        content.innerHTML = `
            <div class="quick-view-image"><div style="position:relative; width:100%; height:300px; background:#f5f7fa; display:flex; align-items:center; justify-content:center; border-radius:12px; overflow:hidden;">
                <img src="${p.image && p.image.length > 0 ? p.image : ''}" alt="${window.sanitizeInput(p.name)}" style="max-width:100%; max-height:100%; object-fit:contain;" data-dora-error="fallback" loading="lazy">
            </div></div>
            <div class="quick-view-info">
                <span class="quick-view-category">${catLabels[p.category]}</span>
                <h3 class="quick-view-name">${window.sanitizeInput(p.name)}</h3>
                <div class="quick-view-rating"><span class="stars">${stars}</span><span class="rating-text">${p.rating || 0} (${p.reviews ? p.reviews.length : 0} تقييم)</span></div>
                <p class="quick-view-desc">${window.sanitizeInput(p.desc)}</p>
                <div class="quick-view-stock ${stockClass}"><span class="quick-view-stock-label">📦 المخزون:</span><span class="quick-view-stock-value">${stockLabel}</span><div class="quick-view-stock-bar"><div class="quick-view-stock-fill" style="width:${stockPercent}%"></div></div></div>
                <div class="quick-view-price">${hasDiscount ? `<span class="old-price">${window.formatPrice(p.oldPrice)}</span>` : ''} ${window.formatPrice(p.price)}</div>
                <div class="quick-view-actions">
                    <button class="quick-view-btn quick-view-btn-primary" data-action="add-to-cart" data-product-id="${p.id}" data-close-modal="quickView">🛒 أضف للسلة</button>
                    <button class="quick-view-btn quick-view-btn-wishlist ${isWishlisted ? 'active' : ''}" data-action="wishlist" data-product-id="${p.id}">${isWishlisted ? '❤️' : '🤍'}</button>
                    <button class="quick-view-btn quick-view-btn-secondary" data-action="open-modal" data-product-id="${p.id}" data-close-modal="quickView">📋 التفاصيل</button>
                </div>
            </div>`;
        const overlay = document.getElementById('quickViewOverlay');
        if (overlay) { overlay.classList.add('active'); document.body.style.overflow = 'hidden'; }
    };

    window.closeQuickView = function(e) {
        if (e && e.target !== e.currentTarget) return;
        const overlay = document.getElementById('quickViewOverlay');
        if (overlay) { overlay.classList.remove('active'); document.body.style.overflow = ''; }
    };

    window.filterProducts = function(cat) {
        window.renderProducts(cat);
        if (cat !== 'all') {
            const section = document.getElementById('products');
            if (section) section.scrollIntoView({behavior: 'smooth'});
        }
    };

    // تهيئة عند التحميل
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            window.updateCategoryCounts();
        });
    } else {
        window.updateCategoryCounts();
    }
})();
