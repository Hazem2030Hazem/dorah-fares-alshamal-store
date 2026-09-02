// ============================================================
// SEARCH — البحث الفوري والفلترة
// ============================================================
(function() {
    'use strict';

    window.handleSearch = function(query) {
        const resultsDiv = document.getElementById('searchResults');
        if (!query.trim()) {
            resultsDiv.classList.remove('active');
            return;
        }
        const filtered = window.productsData.filter(p =>
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.desc.toLowerCase().includes(query.toLowerCase()) ||
            window.catLabels[p.category].includes(query)
        );

        if (filtered.length === 0) {
            resultsDiv.innerHTML = '<div class="search-no-results">لا توجد نتائج مطابقة</div>';
        } else {
            resultsDiv.innerHTML = filtered.slice(0, 6).map(p => `
                <div class="search-result-item" onclick="window.openProductModal(${p.id}); document.getElementById('searchResults').classList.remove('active'); document.getElementById('searchInput').value='';">
                    <img class="search-result-img" src="${p.image}" alt="" loading="lazy">
                    <div class="search-result-info">
                        <div class="search-result-name">${window.sanitizeInput(p.name)}</div>
                        <div class="search-result-price">${window.formatPrice(p.price)}</div>
                    </div>
                </div>
            `).join('');
        }
        resultsDiv.classList.add('active');
    };

    document.addEventListener('click', function(e) {
        if (!e.target.closest('.search-bar')) {
            document.getElementById('searchResults').classList.remove('active');
        }
    });

    window.filterProducts = function(cat) {
        if (typeof window.renderProducts === 'function') window.renderProducts(cat);
        if (cat !== 'all') {
            const section = document.getElementById('products');
            if (section) section.scrollIntoView({behavior: 'smooth'});
        }
    };

    window.requestQuote = function(productId, event) {
        if (event) event.stopPropagation();
        const isLoggedIn = window.checkAuth ? window.checkAuth() : Promise.resolve(false);
        isLoggedIn.then(function(loggedIn) {
            if (!loggedIn) {
                if (window.requireAuth) window.requireAuth('تطلب عرض سعر');
                return;
            }
            const data = (window.productsData && Array.isArray(window.productsData)) ? window.productsData : [];
            const p = data.find(x => x.id === productId);
            if (!p) return;

            const msg = `مرحباً شركة درة فارس الشمال،\n\nأرغب في طلب عرض سعر للمنتج التالي:\n\n📦 المنتج: ${p.name}\n💰 السعر المعروض: ${p.price.toLocaleString()} ر.س\n📊 التصنيف: ${window.catLabels[p.category]}\n\nيرجى إرسال عرض السعر والتواصل معي.\nشكراً.`;
            const quotePhone = (window.getDoraSiteSettings().companyPhone1 || '').trim();
            window.open(window.doraWhatsAppLink(msg, quotePhone || undefined), '_blank');
            if (window.showToast) window.showToast('📋 تم فتح واتساب لطلب عرض السعر');
        });
    };
})();
