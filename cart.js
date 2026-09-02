// ============================================================
// CART — إدارة سلة المشتريات والكوبونات وإتمام الشراء
// ============================================================
(function() {
    'use strict';

    const TAX_RATE = 0.15;

    const COUPONS = {
        'DORA10': { discount: 0.10, label: 'خصم 10%' },
        'DORA20': { discount: 0.20, label: 'خصم 20%' },
        'WELCOME': { discount: 0.15, label: 'خصم ترحيبي 15%' },
        'WELCOME15': { discount: 0.15, label: 'خصم ترحيبي 15%' }
    };

    const SEASONAL_COUPONS = {
        'EID2025': { discount: 0.25, label: 'خصم العيد 25%', validUntil: '2025-07-15' },
        'RAMADAN': { discount: 0.20, label: 'خصم رمضان 20%', validUntil: '2025-04-15' },
        'BACK2SCHOOL': { discount: 0.15, label: 'خصم العودة للمدارس 15%', validUntil: '2025-09-15' },
        'NATIONAL': { discount: 0.30, label: 'خصم اليوم الوطني 30%', validUntil: '2025-09-23' }
    };

    // دمج الكوبونات الموسمية حسب الصلاحية
    const today = new Date().toISOString().split('T')[0];
    for (const key in SEASONAL_COUPONS) {
        if (SEASONAL_COUPONS.hasOwnProperty(key)) {
            const sc = SEASONAL_COUPONS[key];
            if (sc.validUntil >= today) COUPONS[key] = { discount: sc.discount, label: sc.label };
        }
    }

    let couponUsage = JSON.parse(localStorage.getItem('doraCouponUsage') || '{"WELCOME":0,"DORA10":0,"DORA20":0}');

    let cart = JSON.parse(localStorage.getItem('doraCart')) || [];
    let activeCoupon = null;

    function persistCart() {
        localStorage.setItem('doraCart', JSON.stringify(cart));
    }

    window.addToCart = async function(productId) {
        const isLoggedIn = await window.checkAuth();
        if (!isLoggedIn) {
            window.requireAuth('تضيف منتجات للسلة');
            return;
        }

        if (typeof window.productsData === 'undefined' || !Array.isArray(window.productsData)) {
            window.showToast('⏳ جاري تحميل المنتجات...', 'warning');
            return;
        }

        const product = window.productsData.find(p => p.id === productId);
        if (!product || product.stock <= 0) {
            window.showToast('❌ عذراً، هذا المنتج غير متوفر حالياً', 'error');
            return;
        }
        if (product.badge === 'تحت التسعير') {
            window.showToast('🔒 هذا المنتج قيد التسعير حالياً — البيع متوقف مؤقتاً', 'warning');
            return;
        }

        const existing = cart.find(item => item.id === productId);
        const inCartQty = existing ? existing.qty : 0;

        if (inCartQty >= product.stock) {
            window.showToast('⚠️ لا يمكن إضافة المزيد، الكمية المتبقية محدودة (' + (product.stock - inCartQty) + ')', 'warning');
            return;
        }

        if (existing) {
            existing.qty++;
        } else {
            cart.push({ id: productId, name: product.name, price: product.price, qty: 1, image: product.image });
        }

        persistCart();
        window.updateCartUI();
        if (typeof window.renderProducts === 'function') window.renderProducts(window.currentFilter);
        window.showToast('✅ تمت إضافة ' + window.sanitizeInput(product.name) + ' للسلة');
    };

    window.removeFromCart = function(productId) {
        cart = cart.filter(item => item.id !== productId);
        persistCart();
        window.updateCartUI();
        if (typeof window.renderProducts === 'function') window.renderProducts(window.currentFilter);
    };

    window.updateQty = function(productId, change) {
        const item = cart.find(item => item.id === productId);
        if (!item) return;

        if (typeof window.productsData === 'undefined' || !Array.isArray(window.productsData)) return;
        const product = window.productsData.find(p => p.id === productId);
        const stock = product ? product.stock : 99999;

        if (change > 0) {
            if (item.qty >= stock) {
                window.showToast('⚠️ لا يمكن إضافة المزيد، الكمية المتبقية محدودة', 'warning');
                return;
            }
            item.qty++;
        } else {
            item.qty--;
        }

        if (item.qty <= 0) {
            window.removeFromCart(productId);
            return;
        }

        persistCart();
        window.updateCartUI();
        if (typeof window.renderProducts === 'function') window.renderProducts(window.currentFilter);
    };

    window.updateCartUI = function() {
        const count = cart.reduce((sum, item) => sum + item.qty, 0);
        const cartCount = document.getElementById('cartCount');
        if (cartCount) cartCount.textContent = count;

        const itemsDiv = document.getElementById('cartItems');
        if (!itemsDiv) return;

        const couponSection = document.getElementById('couponSection');
        if (cart.length === 0) {
            itemsDiv.innerHTML = `
                <div class="cart-empty">
                    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                    <p>السلة فارغة</p>
                    <small>أضف منتجات لبدء التسوق</small>
                </div>`;
            if (couponSection) couponSection.style.display = 'none';
        } else {
            itemsDiv.innerHTML = cart.map(item => {
                const product = window.productsData ? window.productsData.find(p => p.id === item.id) : null;
                const remaining = product ? product.stock - item.qty : 0;
                return `
                    <div class="cart-item">
                        <div class="cart-item-img">
                            <img src="${item.image}" alt="" onerror="this.style.display='none';this.parentElement.textContent='📦'" loading="lazy">
                        </div>
                        <div class="cart-item-info">
                            <div class="cart-item-name">${window.sanitizeInput(item.name)}</div>
                            <div class="cart-item-price">${window.formatPrice(item.price)}</div>
                            <div class="cart-item-stock">متبقي في المخزن: ${remaining} | الكمية في السلة: ${item.qty}</div>
                            <div class="cart-item-actions">
                                <button class="qty-btn" onclick="updateQty(${item.id}, -1)" aria-label="تقليل الكمية">−</button>
                                <span>${item.qty}</span>
                                <button class="qty-btn" onclick="updateQty(${item.id}, 1)" aria-label="زيادة الكمية">+</button>
                                <span class="remove-btn" onclick="removeFromCart(${item.id})" aria-label="حذف من السلة">🗑️</span>
                            </div>
                        </div>
                    </div>`;
            }).join('');
            if (couponSection) couponSection.style.display = 'block';
        }

        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const discount = activeCoupon ? Math.round(subtotal * activeCoupon.discount) : 0;
        const afterDiscount = subtotal - discount;
        const tax = window.calculateTax(afterDiscount, TAX_RATE);
        const total = afterDiscount + tax;

        const cartTotal = document.getElementById('cartTotal');
        const cartTax = document.getElementById('cartTax');
        if (cartTotal) cartTotal.textContent = window.formatPrice(total);
        if (cartTax) cartTax.textContent = `شامل الضريبة (15%): ${window.formatPrice(tax)}${discount > 0 ? ' | خصم: ' + window.formatPrice(discount) : ''}`;
    };

    window.toggleCart = function() {
        const overlay = document.getElementById('cartOverlay');
        const sidebar = document.getElementById('cartSidebar');
        if (overlay) overlay.classList.toggle('active');
        if (sidebar) sidebar.classList.toggle('open');
    };

    window.applyCoupon = function() {
        const input = document.getElementById('couponInput') || document.getElementById('couponInputAdmin');
        const code = input ? input.value.trim().toUpperCase() : '';
        if (!code) return;

        const coupon = COUPONS[code];
        if (coupon) {
            activeCoupon = coupon;
            const couponSection = document.getElementById('couponSection');
            if (couponSection) {
                couponSection.innerHTML = `
                    <div class="coupon-applied">
                        ✅ ${coupon.label} مُطبق
                        <button class="remove-coupon" onclick="removeCoupon()">✕</button>
                    </div>`;
            }
            window.updateCartUI();
            window.showToast('✅ تم تطبيق كود الخصم: ' + coupon.label);

            couponUsage[code] = (couponUsage[code] || 0) + 1;
            localStorage.setItem('doraCouponUsage', JSON.stringify(couponUsage));

            // تسجيل استخدام الكوبون في Supabase (best-effort)
            if (typeof window.supabaseClient !== 'undefined' && window.supabaseClient) {
                try {
                    window.supabaseClient.from('coupon_usage').insert([{
                        coupon_code: code,
                        discount_percent: coupon.discount * 100,
                        used_at: new Date().toISOString()
                    }]).then(function(){}).catch(function(){});
                } catch(e) {}
            }
        } else {
            window.showToast('❌ كود الخصم غير صحيح', 'error');
        }
    };

    window.removeCoupon = function() {
        activeCoupon = null;
        const couponSection = document.getElementById('couponSection');
        if (couponSection) {
            couponSection.innerHTML = `
                <div class="coupon-input-wrapper">
                    <input type="text" class="coupon-input" id="couponInputAdmin" placeholder="أدخل كود الخصم">
                    <button class="coupon-btn" onclick="applyCoupon()">تطبيق</button>
                </div>`;
        }
        window.updateCartUI();
        window.showToast('تم إلغاء كود الخصم', 'warning');
    };

    window.checkout = async function() {
        if (window.DORA_STORE_CLOSED !== false) {
            try {
                if (typeof window.supabaseClient !== 'undefined' && window.supabaseClient) {
                    const { data } = await window.supabaseClient.from('site_settings').select('settings').eq('id', 1).maybeSingle();
                    const st = data && data.settings && data.settings.storeStatus;
                    window.DORA_STORE_CLOSED = (st !== 'open');
                } else {
                    window.DORA_STORE_CLOSED = true;
                }
            } catch(_) { window.DORA_STORE_CLOSED = true; }
        }
        if (window.DORA_STORE_CLOSED) {
            window.showToast('🔒 المتجر تحت التجهيز حالياً — البيع يبدأ قريباً بإذن الله', 'warning');
            return;
        }

        const isLoggedIn = await window.checkAuth();
        if (!isLoggedIn) {
            window.requireAuth('تشتري منتجات');
            return;
        }
        if (cart.length === 0) {
            window.showToast('السلة فارغة! أضف منتجات أولاً', 'warning');
            return;
        }
        window.location.href = 'checkout.html';
    };

    // تهيئة السلة عند التحميل
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', window.updateCartUI);
    } else {
        window.updateCartUI();
    }
})();
