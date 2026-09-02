// ============================================================
// WISHLIST & COMPARE — المفضلة والمقارنة
// ============================================================
(function() {
    'use strict';

    let wishlistItems = JSON.parse(localStorage.getItem('doraWishlistItems')) || [];
    let compareList = JSON.parse(localStorage.getItem('doraCompare')) || [];

    // للتوافق مع الكود القديم
    window.wishlist = wishlistItems;
    window.compareList = compareList;

    function persistWishlist() {
        localStorage.setItem('doraWishlistItems', JSON.stringify(wishlistItems));
        localStorage.setItem('doraWishlist', JSON.stringify(wishlistItems));
        window.wishlist = wishlistItems;
    }

    function persistCompare() {
        localStorage.setItem('doraCompare', JSON.stringify(compareList));
        window.compareList = compareList;
    }

    function getDeviceId() {
        let deviceId = localStorage.getItem('doraDeviceId');
        if (!deviceId) {
            deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('doraDeviceId', deviceId);
        }
        return deviceId;
    }

    window.initWishlistTable = async function() {
        try {
            if (typeof window.supabaseClient === 'undefined' || !window.supabaseClient) return;
            const { error } = await window.supabaseClient.from('wishlist').select('*').limit(1);
            if (error && error.code === '42P01') { console.log('Wishlist table not found'); }
        } catch (e) { console.log('Wishlist init check:', e); }
    };

    window.toggleWishlist = async function(productId, event) {
        if (event) event.stopPropagation();
        const isLoggedIn = await window.checkAuth();
        if (!isLoggedIn) {
            window.requireAuth('تضيف للمفضلة');
            return;
        }

        const index = wishlistItems.indexOf(productId);
        if (index > -1) {
            wishlistItems.splice(index, 1);
            window.showToast('تمت الإزالة من المفضلة', 'warning');
        } else {
            wishlistItems.push(productId);
            window.showToast('✅ تمت الإضافة للمفضلة');
        }
        persistWishlist();
        window.updateWishlistUI();

        if (typeof window.renderProducts === 'function') window.renderProducts(window.currentFilter);

        // مزامنة مع Supabase (best-effort)
        if (typeof window.supabaseClient !== 'undefined' && window.supabaseClient) {
            try {
                const { data: sessionData } = await window.supabaseClient.auth.getSession();
                const userId = sessionData.session ? sessionData.session.user.id : null;
                if (userId) {
                    await window.supabaseClient.from('wishlist').delete().eq('user_id', userId).eq('product_id', productId);
                    if (index === -1) {
                        await window.supabaseClient.from('wishlist').insert([{ user_id: userId, product_id: productId, device_id: getDeviceId() }]);
                    }
                }
            } catch (e) {}
        }
    };

    window.updateWishlistUI = function() {
        const sidebarBadge = document.getElementById('sidebarWishlistCount');
        if (sidebarBadge) {
            sidebarBadge.textContent = wishlistItems.length;
            sidebarBadge.style.display = wishlistItems.length > 0 ? 'flex' : 'none';
        }
        document.querySelectorAll('.wishlist-btn').forEach(btn => {
            const card = btn.closest('.prod-card');
            const productId = card ? parseInt(card.getAttribute('data-id')) : null;
            if (productId && wishlistItems.includes(productId)) {
                btn.classList.add('active');
                btn.innerHTML = '❤️';
                btn.setAttribute('aria-label', 'إزالة من المفضلة');
            } else if (productId) {
                btn.classList.remove('active');
                btn.innerHTML = '🤍';
                btn.setAttribute('aria-label', 'إضافة للمفضلة');
            }
        });
    };

    window.loadWishlistFromSupabase = async function() {
        try {
            if (typeof window.supabaseClient === 'undefined' || !window.supabaseClient) { window.updateWishlistUI(); return; }
            const { data, error } = await window.supabaseClient.from('wishlist').select('product_id');
            if (!error && data) {
                wishlistItems = data.map(item => item.product_id);
                persistWishlist();
                window.updateWishlistUI();
            }
        } catch (e) { window.updateWishlistUI(); }
    };

    window.renderWishlistPage = function() {
        const container = document.getElementById('wishlistContent');
        if (!container) return;
        const data = (window.productsData && Array.isArray(window.productsData)) ? window.productsData : [];

        if (wishlistItems.length === 0) {
            container.innerHTML = `<div class="wishlist-empty"><span class="icon">❤️</span><h3>قائمة المفضلة فارغة</h3><p>أضف منتجاتك المفضلة من صفحة المنتجات</p><a href="index.html#products" class="btn-primary" style="margin-top:20px;">🛍️ تصفح المنتجات</a></div>`;
            return;
        }

        const wishlistProducts = data.filter(p => wishlistItems.includes(p.id));
        container.innerHTML = `<div class="prod-grid">${wishlistProducts.map(p => {
            const stars = '★'.repeat(Math.floor(p.rating || 0)) + '☆'.repeat(5 - Math.floor(p.rating || 0));
            const hasDiscount = p.oldPrice && p.oldPrice > p.price;
            return `<div class="prod-card wishlisted" data-id="${p.id}">
                <div class="prod-img" onclick="openQuickView(${p.id})">${p.badge ? `<div class="prod-badge">${p.badge}</div>` : ''}<img src="${p.image}" alt="${window.sanitizeInput(p.name)}" loading="lazy"></div>
                <button class="wishlist-btn active" onclick="toggleWishlist(${p.id}, event); renderWishlistPage();">❤️</button>
                <div class="prod-body">
                    <span class="prod-tag">${window.catLabels[p.category]}</span>
                    <h4 class="prod-name" onclick="openProductModal(${p.id})">${window.sanitizeInput(p.name)}</h4>
                    <div class="modal-rating" style="margin-bottom:8px"><span class="stars">${stars}</span><span class="rating-text">${p.rating || 0}</span></div>
                    <p class="prod-desc">${window.sanitizeInput(p.desc)}</p>
                    <div class="prod-footer">
                        <div class="prod-price">${hasDiscount ? `<span class="old-price">${window.formatPrice(p.oldPrice)}</span>` : ''} ${window.formatPrice(p.price)}</div>
                        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
                            <button class="add-btn" onclick="addToCart(${p.id})">🛒 أضف للسلة</button>
                            <button class="quote-btn" onclick="requestQuote(${p.id}, event)">📋 عرض سعر</button>
                        </div>
                    </div>
                </div>
            </div>`;
        }).join('')}</div>`;
    };

    // ===== COMPARE =====
    window.toggleCompare = function(productId, event) {
        if (event) event.stopPropagation();
        const index = compareList.indexOf(productId);
        if (index > -1) {
            compareList.splice(index, 1);
            window.showToast('تمت الإزالة من المقارنة', 'warning');
        } else {
            if (compareList.length >= 4) {
                window.showToast('⚠️ يمكن مقارنة 4 منتجات كحد أقصى', 'warning');
                return;
            }
            compareList.push(productId);
            window.showToast('✅ تمت الإضافة للمقارنة');
        }
        persistCompare();
        if (typeof window.renderProducts === 'function') window.renderProducts(window.currentFilter);
        window.updateCompareBar();
    };

    window.updateCompareBar = function() {
        const bar = document.getElementById('compareBar');
        const itemsDiv = document.getElementById('compareItems');
        if (!bar || !itemsDiv) return;

        if (compareList.length === 0) {
            bar.classList.remove('active');
            return;
        }

        const data = (window.productsData && Array.isArray(window.productsData)) ? window.productsData : [];
        bar.classList.add('active');
        itemsDiv.innerHTML = compareList.map(id => {
            const p = data.find(x => x.id === id);
            if (!p) return '';
            return `
                <div class="compare-item">
                    <img src="${p.image}" alt="" loading="lazy">
                    <span class="compare-item-name">${window.sanitizeInput(p.name.substring(0, 20))}...</span>
                    <button class="compare-item-remove" onclick="toggleCompare(${p.id})">✕</button>
                </div>`;
        }).join('');
    };

    window.clearCompare = function() {
        compareList = [];
        persistCompare();
        if (typeof window.renderProducts === 'function') window.renderProducts(window.currentFilter);
        window.updateCompareBar();
    };

    window.showCompareModal = function() {
        const data = (window.productsData && Array.isArray(window.productsData)) ? window.productsData : [];
        if (compareList.length < 2) {
            window.showToast('⚠️ أضف منتجين على الأقل للمقارنة', 'warning');
            return;
        }

        const products = compareList.map(id => data.find(p => p.id === id)).filter(Boolean);
        let html = '<table class="compare-table"><thead><tr><th>المواصفة</th>';
        products.forEach(p => {
            html += `<th><img class="compare-product-img" src="${p.image}" alt="" loading="lazy"><div class="compare-product-name">${window.sanitizeInput(p.name)}</div><div class="compare-product-price">${window.formatPrice(p.price)}</div></th>`;
        });
        html += '</tr></thead><tbody>';

        const minPrice = Math.min(...products.map(p => p.price));
        html += '<tr><td>السعر</td>';
        products.forEach(p => { html += `<td class="${p.price === minPrice ? 'winner' : ''}">${window.formatPrice(p.price)}</td>`; });
        html += '</tr>';

        const maxStock = Math.max(...products.map(p => p.stock));
        html += '<tr><td>المخزون</td>';
        products.forEach(p => { html += `<td class="${p.stock === maxStock ? 'winner' : ''}">${p.stock} قطعة</td>`; });
        html += '</tr>';

        html += '<tr><td>التصنيف</td>';
        products.forEach(p => { html += `<td>${window.catLabels[p.category]}</td>`; });
        html += '</tr>';

        const maxRating = Math.max(...products.map(p => p.rating || 0));
        html += '<tr><td>التقييم</td>';
        products.forEach(p => { html += `<td class="${(p.rating || 0) === maxRating ? 'winner' : ''}">${p.rating || 0}/5</td>`; });
        html += '</tr>';

        html += '</tbody></table>';

        const content = document.getElementById('compareModalContent');
        if (content) content.innerHTML = html;
        const overlay = document.getElementById('compareModalOverlay');
        if (overlay) overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    window.closeCompareModal = function(e) {
        if (e && e.target !== e.currentTarget) return;
        const overlay = document.getElementById('compareModalOverlay');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
    };

    // تهيئة
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            window.updateWishlistUI();
            window.updateCompareBar();
            window.initWishlistTable();
            window.loadWishlistFromSupabase();
            window.renderWishlistPage();
        });
    } else {
        window.updateWishlistUI();
        window.updateCompareBar();
        window.initWishlistTable();
        window.loadWishlistFromSupabase();
        window.renderWishlistPage();
    }
})();
