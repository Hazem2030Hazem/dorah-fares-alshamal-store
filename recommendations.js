// ============================================================
// 🤖 DORA SMART RECOMMENDATIONS — المشاهدات مؤخراً، الأكثر مبيعاً، مشتريات مشتركة
// ============================================================
(function() {
    'use strict';

    // ---------- 1. Recently Viewed - المنتجات اللي شافها العميل ----------
    let recentlyViewed = JSON.parse(localStorage.getItem('doraRecentlyViewed')) || [];
    const MAX_RECENT = 8;

    function addToRecentlyViewed(productId) {
        recentlyViewed = recentlyViewed.filter(id => id !== productId);
        recentlyViewed.unshift(productId);
        if (recentlyViewed.length > MAX_RECENT) recentlyViewed.pop();
        localStorage.setItem('doraRecentlyViewed', JSON.stringify(recentlyViewed));
    }

    // استدعاء عند فتح مودال المنتج
    const originalOpenProductModal = window.openProductModal;
    window.openProductModal = function(productId) {
        addToRecentlyViewed(productId);
        originalOpenProductModal(productId);
    };

    // استدعاء عند Quick View
    const originalOpenQuickView = window.openQuickView;
    window.openQuickView = function(productId) {
        addToRecentlyViewed(productId);
        originalOpenQuickView(productId);
    };

    // ---------- 2. Render Recently Viewed Section ----------
    function renderRecentlyViewed() {
        const container = document.getElementById('recentlyViewedGrid');
        if (!container) return;

        const validIds = recentlyViewed.filter(id => window.productsData.find(p => p.id === id));
        if (validIds.length === 0) {
            document.getElementById('recentlyViewedSection').style.display = 'none';
            return;
        }

        document.getElementById('recentlyViewedSection').style.display = 'block';

        const products = validIds.map(id => window.productsData.find(p => p.id === id)).filter(Boolean);

        container.innerHTML = products.map(p => {
            const stars = '★'.repeat(Math.floor(p.rating || 0)) + '☆'.repeat(5 - Math.floor(p.rating || 0));
            const hasDiscount = p.oldPrice && p.oldPrice > p.price;
            return `
                <div class="prod-card" data-id="${p.id}" onclick="window.openProductModal(${p.id})" style="cursor:pointer">
                    <div class="prod-img" style="height:180px">
                        ${p.badge ? `<div class="prod-badge">${p.badge}</div>` : ''}
                        ${hasDiscount && !p.badge ? `<div class="prod-badge discount">خصم</div>` : ''}
                        <div style="position:relative; width:100%; height:180px; background:#f5f7fa; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                            <img src="${p.image && p.image.length > 0 ? p.image : ''}" alt="${window.sanitizeInput(p.name)}" loading="lazy" style="max-width:100%; max-height:100%; object-fit:contain;" onerror="this.onerror=null;this.src='default-product.png';">
                            <svg style="display:none; width:48px; height:48px; color:#9aa5b9;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                        </div>
                    </div>
                    <div class="prod-body" style="padding:12px">
                        <span class="prod-tag" style="font-size:11px">${window.catLabels[p.category]}</span>
                        <h4 class="prod-name" style="font-size:13px;margin:5px 0">${window.sanitizeInput(p.name)}</h4>
                        <div style="display:flex;align-items:center;gap:5px;margin:5px 0">
                            <span style="color:#FFD700;font-size:12px">${stars}</span>
                            <span style="font-size:11px;color:#6B7280">${p.rating || 0}</span>
                        </div>
                        <div class="prod-price" style="font-size:16px">
                            ${hasDiscount ? `<span class="old-price" style="font-size:12px">${window.formatPrice(p.oldPrice)}</span> ` : ''}
                            ${window.formatPrice(p.price)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ---------- 3. Frequently Bought Together (بسيط - نفس الفئة) ----------
    function getFrequentlyBoughtTogether(productId) {
        const product = window.productsData.find(p => p.id === productId);
        if (!product) return [];

        // نجيب منتجات من نفس الفئة مع تقييم عالي
        return window.productsData
            .filter(p => p.category === product.category && p.id !== productId && p.stock > 0)
            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
            .slice(0, 3);
    }

    // ---------- 4. أفضل المنتجات مبيعاً (حسب التقييم والمخزون) ----------
    function getBestSellers(limit = 8) {
        return window.productsData
            .filter(p => p.stock > 0)
            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
            .slice(0, limit);
    }

    // ---------- 5. منتجات مشابهة (محسنة) ----------
    function getSimilarProducts(productId, limit = 4) {
        const product = window.productsData.find(p => p.id === productId);
        if (!product) return [];

        // الأول: نفس الفئة
        const sameCategory = window.productsData.filter(p => p.category === product.category && p.id !== productId && p.stock > 0);

        // الثاني: فئات تانية مكملة
        const complementary = {
            'printers': ['ink', 'cables'],
            'computers': ['ram', 'storage', 'accessories'],
            'ram': ['computers', 'storage'],
            'storage': ['computers', 'ram', 'cables'],
            'projectors': ['cables', 'accessories'],
            'accessories': ['computers', 'cables'],
            'ink': ['printers'],
            'cables': ['projectors', 'computers', 'printers'],
            'food': ['food']
        };

        let results = [...sameCategory];

        if (complementary[product.category]) {
            const compProducts = window.productsData.filter(p =>
                complementary[product.category].includes(p.category) &&
                p.id !== productId &&
                p.stock > 0
            );
            results = [...results, ...compProducts];
        }

        return results.slice(0, limit);
    }

    // ---------- 6. تحديث مودال المنتج (إضافة Frequently Bought Together) ----------
    const originalOpenProductModalV2 = window.openProductModal;
    window.openProductModal = function(productId) {
        originalOpenProductModalV2(productId);

        // إضافة Frequently Bought Together بعد فتح المودال
        setTimeout(() => {
            const info = document.querySelector('#productModal .modal-info');
            const relatedSection = document.getElementById('relatedProducts');

            if (info && !info.querySelector('.fbt-section')) {
                const fbtProducts = getFrequentlyBoughtTogether(productId);

                if (fbtProducts.length > 0) {
                    const fbtHTML = `
                        <div class="fbt-section" style="margin-top:20px;padding:20px;background:rgba(59,130,246,0.05);border-radius:16px;border:1px solid rgba(59,130,246,0.2)">
                            <h4 style="margin:0 0 15px 0;font-size:16px;display:flex;align-items:center;gap:8px">
                                🎯 يشتري العملاء معاً غالباً
                            </h4>
                            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px">
                                ${fbtProducts.map(p => `
                                    <div onclick="window.openProductModal(${p.id})" style="cursor:pointer;background:white;border-radius:12px;padding:12px;text-align:center;border:1px solid rgba(0,0,0,0.1);transition:all 0.3s ease" onmouseenter="this.style.borderColor='#3B82F6';this.style.boxShadow='0 4px 12px rgba(59,130,246,0.2)'" onmouseleave="this.style.borderColor='rgba(0,0,0,0.1)';this.style.boxShadow='none'">
                                        <div style="background:#f5f7fa; width:100%; height:180px; display:flex; align-items:center; justify-content:center; border-radius:8px;">
                                            <img src="${p.image && p.image.length > 0 ? p.image : ''}" alt="${window.sanitizeInput(p.name)}" loading="lazy" style="max-width:100%; max-height:100%; object-fit:contain;" onerror="this.onerror=null;this.src='default-product.png';"
                                            <svg style="display:none; width:40px; height:40px; color:#9aa5b9;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                                        </div>
                                        <div style="font-size:12px;font-weight:bold;margin-bottom:4px;color:#1F2937">${window.sanitizeInput(p.name.substring(0, 25))}...</div>
                                        <div style="font-size:14px;color:#3B82F6;font-weight:bold">${window.formatPrice(p.price)}</div>
                                        ${p.rating ? `<div style="font-size:11px;color:#F59E0B">${'★'.repeat(Math.floor(p.rating))} ${p.rating}</div>` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;

                    // Insert before related products
                    if (relatedSection) {
                        relatedSection.insertAdjacentHTML('beforebegin', fbtHTML);
                    } else {
                        info.insertAdjacentHTML('beforeend', fbtHTML);
                    }
                }
            }
        }, 300);
    };

    // ---------- 7. إضافة الأقسام الجديدة للصفحة الرئيسية ----------
    function injectRecommendationSections() {
        if (document.getElementById('recentlyViewedSection')) return;

        const productsSection = document.getElementById('products');
        if (!productsSection) return;

        // Recently Viewed Section
        const recentlyHTML = `
            <section id="recentlyViewedSection" class="recommendation-section" style="display:none;padding:60px 0;background:rgba(59,130,246,0.02)">
                <div class="container">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:30px">
                        <h2 style="font-size:28px;display:flex;align-items:center;gap:10px">👁️ شاهدتها مؤخراً</h2>
                        <button onclick="localStorage.removeItem('doraRecentlyViewed');recentlyViewed=[];renderRecentlyViewed();" style="background:none;border:1px solid rgba(0,0,0,0.2);padding:8px 16px;border-radius:8px;cursor:pointer;font-size:13px">🗑️ مسح السجل</button>
                    </div>
                    <div id="recentlyViewedGrid" class="prod-grid"></div>
                </div>
            </section>

            <!-- Best Sellers Section -->
            <section id="bestSellersSection" class="recommendation-section" style="padding:60px 0">
                <div class="container">
                    <h2 style="font-size:28px;display:flex;align-items:center;gap:10px;margin-bottom:30px">🔥 الأكثر مبيعاً</h2>
                    <div id="bestSellersGrid" class="prod-grid"></div>
                </div>
            </section>
        `;

        productsSection.insertAdjacentHTML('beforebegin', recentlyHTML);

        // Render
        renderRecentlyViewed();
        renderBestSellers();
    }

    // ---------- 8. Render Best Sellers ----------
    function renderBestSellers() {
        const grid = document.getElementById('bestSellersGrid');
        if (!grid) return;

        const bestSellers = getBestSellers(8);

        grid.innerHTML = bestSellers.map((p, index) => {
            const stars = '★'.repeat(Math.floor(p.rating || 0)) + '☆'.repeat(5 - Math.floor(p.rating || 0));
            const hasDiscount = p.oldPrice && p.oldPrice > p.price;
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';

            return `
                <div class="prod-card best-seller-card" data-id="${p.id}" onclick="window.openProductModal(${p.id})" style="cursor:pointer;position:relative">
                    ${medal ? `<div style="position:absolute;top:10px;left:10px;font-size:30px;z-index:10">${medal}</div>` : ''}
                    <div class="prod-img" style="height:180px">
                        ${p.badge ? `<div class="prod-badge">${p.badge}</div>` : ''}
                        ${hasDiscount && !p.badge ? `<div class="prod-badge discount">خصم</div>` : ''}
                        <div style="position:relative; width:100%; height:180px; background:#f5f7fa; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                            <img src="${p.image && p.image.length > 0 ? p.image : ''}" alt="${window.sanitizeInput(p.name)}" loading="lazy" style="max-width:100%; max-height:100%; object-fit:contain;" onerror="this.onerror=null;this.src='default-product.png';">
                            <svg style="display:none; width:48px; height:48px; color:#9aa5b9;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                        </div>
                    </div>
                    <div class="prod-body" style="padding:12px">
                        <span class="prod-tag" style="font-size:11px">${window.catLabels[p.category]}</span>
                        <h4 class="prod-name" style="font-size:13px;margin:5px 0">${window.sanitizeInput(p.name)}</h4>
                        <div style="display:flex;align-items:center;gap:5px;margin:5px 0">
                            <span style="color:#FFD700;font-size:12px">${stars}</span>
                            <span style="font-size:11px;color:#6B7280">${p.rating || 0} (${p.reviews ? p.reviews.length : 0})</span>
                        </div>
                        <div class="prod-price" style="font-size:16px">
                            ${hasDiscount ? `<span class="old-price" style="font-size:12px">${window.formatPrice(p.oldPrice)}</span> ` : ''}
                            ${window.formatPrice(p.price)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ---------- 9. إضافة CSS الديناميكي ----------
    function injectRecommendationStyles() {
        if (document.getElementById('dora-recommendation-styles')) return;

        const styles = `
            <style id="dora-recommendation-styles">
                .recommendation-section {
                    direction: rtl;
                }

                .best-seller-card {
                    transition: all 0.3s ease;
                }

                /* 📐 التوحيد: أبعاد البطاقة والشبكة تُدار من styles.css
                   (نفس أعمدة .prod-grid ونفس ارتفاع الصورة والجسم) */
                .best-seller-card:hover {
                    transform: translateY(-4px);
                }

                .fbt-section {
                    animation: fadeInUp 0.4s ease;
                }

                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            </style>
        `;

        document.head.insertAdjacentHTML('beforeend', styles);
    }

    // ---------- 10. Initialize All ----------
    document.addEventListener('DOMContentLoaded', function() {
        injectRecommendationStyles();

        // Inject sections after a small delay to ensure products section exists
        setTimeout(injectRecommendationSections, 500);
    });
})();
