// ✅ نطاق محلي (IIFE) لتجنب تعارض المتغيرات العامة مع main.js (cart / COUPONS / activeCoupon)
// والدوال المطلوبة من onclick تُصدَّر إلى window في نهاية السكريبت
(function() {
var cart = JSON.parse(localStorage.getItem('doraCart') || '[]');
  // دالة الإشعارات
function showToast(msg, type) {
    var toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#10B981;color:white;padding:14px 28px;border-radius:14px;z-index:99999;font-weight:700;font-size:15px;box-shadow:0 10px 40px rgba(16,185,129,0.4);animation:slideUp 0.3s ease;text-align:center;max-width:90%';
    if (type === 'warning') toast.style.background = '#F59E0B';
    if (type === 'error') toast.style.background = '#EF4444';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 3000);
}

// أضف Animation CSS
var toastStyle = document.createElement('style');
toastStyle.textContent = '@keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}';
document.head.appendChild(toastStyle);  
var deliveryMethod = 'delivery';
var selectedPayment = null;
var activeCoupon = null;
var COUPONS = {
    'DORA10': { discount: 0.10, label: 'خصم 10%' },
    'DORA20': { discount: 0.20, label: 'خصم 20%' },
    'WELCOME': { discount: 0.15, label: 'خصم ترحيبي 15%' },
    'WELCOME15': { discount: 0.15, label: 'خصم ترحيبي 15%' }
};
var activeCouponCode = null; // كود الكوبون المطبق — يُرسل للدالة السيرفرية

// ============================================================
// 🚚 إعدادات الشحن — المصدر الرئيسي كائن SHIPPING في أعلى main.js
// (يُجلب تلقائياً لأن main.js محمّل قبل هذا السكريبت)
// القيم: freeAbove (شحن مجاني فوقه بعد الخصم)، default، regions لكل مدينة
// ============================================================
var SHIPPING_CFG = (typeof SHIPPING !== 'undefined' && SHIPPING) ? SHIPPING : { freeAbove: 300, default: 35, regions: { 'الرياض': 25, 'جدة': 30, 'الدمام': 30 } };
// ✏️ السعر الافتراضي الثابت (ر.س) — يُستخدم لو الجدول فاضي/محظور أو فشل الجلب
var SHIPPING_FALLBACK_COST = SHIPPING_CFG.default || 35;
var shippingRatesCache = null; // null = لم يُجلب بعد
var shippingCost = 0;

// جلب الأسعار مرة واحدة مع try/catch شامل — الفشل = مصفوفة فارغة (بدون كسر)
async function ensureShippingRates() {
    if (shippingRatesCache !== null) return shippingRatesCache;
    try {
        if (typeof supabaseClient === 'undefined' || !supabaseClient) throw new Error('no supabase');
        var result = await supabaseClient.from('shipping_rates').select('*');
        if (result.error) throw result.error;
        shippingRatesCache = result.data || [];
    } catch (e) {
        shippingRatesCache = [];
    }
    return shippingRatesCache;
}

// مطابقة المدينة مع الأسعار: سعر المدينة ← السعر الافتراضي بالجدول ← الثابت
function calcShippingFromRates(rates, city) {
    try {
        if (!rates || !rates.length) return SHIPPING_FALLBACK_COST;
        var normalized = (city || '').trim();
        var defaultPrice = null;
        for (var i = 0; i < rates.length; i++) {
            var r = rates[i];
            var rCity = String(r.to_city || r.city || r.city_name || '').trim();
            var rawPrice = (r.price_sar != null ? r.price_sar : (r.price != null ? r.price : (r.cost != null ? r.cost : r.rate)));
            var price = Number(rawPrice);
            if (isNaN(price)) continue;
            var isDefault = r.is_default === true ||
                ['default', '*', 'افتراضي', 'الكل', 'جميع المدن', 'أخرى', 'اخرى', ''].indexOf(rCity) !== -1;
            if (isDefault) { if (defaultPrice === null) defaultPrice = price; continue; }
            if (normalized && rCity && (rCity === normalized || rCity.indexOf(normalized) !== -1 || normalized.indexOf(rCity) !== -1)) {
                return price; // ✅ وُجد سعر للمدينة
            }
        }
        if (defaultPrice !== null) return defaultPrice; // ✅ السعر الافتراضي من الجدول
        // ✏️ فولباك: إعدادات SHIPPING في main.js (سعر المدينة ثم الافتراضي)
        if (normalized && SHIPPING_CFG.regions && SHIPPING_CFG.regions[normalized] != null) return Number(SHIPPING_CFG.regions[normalized]);
        return SHIPPING_FALLBACK_COST; // ✏️ الثابت الافتراضي
    } catch (e) {
        return SHIPPING_FALLBACK_COST;
    }
}

// المجموع بعد الخصم (قبل الشحن) — لقاعدة الشحن المجاني
function discountedSubtotal() {
    var subtotal = cart.reduce(function(s, i) { return s + (i.price * i.qty); }, 0);
    var discount = activeCoupon ? Math.round(subtotal * activeCoupon.discount) : 0;
    return subtotal - discount;
}

// حساب رسوم الشحن الحالية (استلام من المتجر = 0 / تجاوز حد الشحن المجاني = 0)
function currentShippingCost() {
    if (deliveryMethod === 'pickup') return 0;
    var cityEl = document.getElementById('custCity');
    var base = calcShippingFromRates(shippingRatesCache, cityEl ? cityEl.value : '');
    if (discountedSubtotal() >= (SHIPPING_CFG.freeAbove || 300)) return 0; // 🎁 شحن مجاني
    return base;
}

// مجاميع الطلب (مصدر واحد للحقيقة)
function calcOrderTotals() {
    var subtotal = cart.reduce(function(s, i) { return s + (i.price * i.qty); }, 0);
    var tax = Math.round(subtotal * 0.15);
    var discount = activeCoupon ? Math.round(subtotal * activeCoupon.discount) : 0;
    return { subtotal: subtotal, tax: tax, discount: discount, finalTotal: subtotal + tax - discount + shippingCost };
}

// تحديث سطر الشحن والإجمالي ديناميكياً بدون إعادة رسم الصفحة (يحافظ على مدخلات العميل)
async function updateShipping() {
    try {
        await ensureShippingRates();
        shippingCost = currentShippingCost();
        var t = calcOrderTotals();
        var shipEl = document.getElementById('shippingCostValue');
        var totalEl = document.getElementById('finalTotalValue');
        if (shipEl) {
            shipEl.textContent = deliveryMethod === 'pickup'
                ? 'مجاناً (استلام من المتجر)'
                : (shippingCost === 0 ? '🎁 مجاناً (طلبك تجاوز ' + (SHIPPING_CFG.freeAbove || 300) + ' ر.س)' : shippingCost.toLocaleString() + ' ر.س');
        }
        if (totalEl) totalEl.textContent = t.finalTotal.toLocaleString() + ' ر.س';
        // تحديث مبالغ أزرار الدفع السريع لتشمل الشحن
        var quickBtns = { stc: 'payWithSTC', mada: 'payWithMada' };
        Object.keys(quickBtns).forEach(function(key) {
            var btn = document.querySelector('.quick-pay-btn.' + key);
            if (btn) btn.setAttribute('onclick', quickBtns[key] + '(' + t.finalTotal + ')');
        });
    } catch (e) { /* صمت تام — لا نكسر الصفحة */ }
}

function renderCheckout() {
    var container = document.getElementById('checkoutContent');
    if (!cart.length) return;
    
    shippingCost = currentShippingCost(); // 🚚 حساب متزامن من الكاش/الافتراضي، وتُحدَّث لاحقاً عبر updateShipping
    var totals = calcOrderTotals();
    var subtotal = totals.subtotal, tax = totals.tax, discount = totals.discount, finalTotal = totals.finalTotal;
    
    container.innerHTML = `
        <div class="checkout-card">
            <h3>📦 ملخص الطلب</h3>
            ${cart.map(function(item) {
                return '<div class="cart-item"><img src="' + (item.image || 'default-product.png') + '" alt="' + item.name + '" data-dora-error="hide" loading="lazy"><div class="cart-item-info"><h4>' + item.name + '</h4><span>الكمية: ' + item.qty + ' | ' + item.price.toLocaleString() + ' ر.س</span></div><div class="cart-item-price">' + (item.price * item.qty).toLocaleString() + ' ر.س</div></div>';
            }).join('')}
            <div class="total-row"><span>المجموع الفرعي</span><span>${subtotal.toLocaleString()} ر.س</span></div>
            <div class="total-row"><span>الضريبة (15%)</span><span>${tax.toLocaleString()} ر.س</span></div>
            <div class="total-row"><span>🚚 رسوم الشحن</span><span id="shippingCostValue">${deliveryMethod === 'pickup' ? 'مجاناً (استلام من المتجر)' : shippingCost.toLocaleString() + ' ر.س'}</span></div>
            ${discount > 0 ? '<div class="total-row" style="color:#10B981"><span>الخصم (' + activeCoupon.label + ')</span><span>-' + discount.toLocaleString() + ' ر.س</span></div>' : ''}
            <div class="total-row final"><span>المجموع الكلي</span><span id="finalTotalValue">${finalTotal.toLocaleString()} ر.س</span></div>
        </div>
        
        <!-- 🛍️ Cross-sell: منتجات مقترحة -->
        <div class="upsell-section">
            <h4><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-4px"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> قد تحتاج أيضاً</h4>
            <div class="upsell-grid" id="upsellGrid">⏳ جاري التحميل...</div>
        </div>
        
        <div class="checkout-card">
            <h3><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-4px"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg> كود خصم</h3>
            <div style="display:flex;gap:10px">
                <input type="text" id="couponCode" placeholder="أدخل كود الخصم" style="flex:1;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.05);color:#fff;font-family:inherit">
                <button data-dora-call="applyCouponCode" style="padding:12px 20px;background:#10B981;color:#fff;border:none;border-radius:12px;cursor:pointer;font-weight:700;font-family:inherit">تطبيق</button>
            </div>
            <div id="couponMsg" style="margin-top:8px;font-size:13px;font-weight:700"></div>
        </div>
        
        <div class="checkout-card">
            <h3><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-4px"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> بياناتك</h3>
            <div class="form-row">
                <div class="form-group"><label>الاسم الكامل *</label><input type="text" id="custName" required></div>
                <div class="form-group"><label>رقم الجوال *</label><input type="tel" id="custPhone" required></div>
            </div>
            <div class="form-group"><label>البريد الإلكتروني</label><input type="email" id="custEmail"></div>
            <div class="form-row">
                <div class="form-group"><label>مدينة التوصيل *</label><select id="custCity" style="width:100%;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.05);color:#fff;font-family:inherit">
                    <option value="">اختر مدينتك</option>
                    <option value="الرياض">الرياض</option>
                    <option value="جدة">جدة</option>
                    <option value="الدمام">الدمام</option>
                    <option value="مكة المكرمة">مكة المكرمة</option>
                    <option value="المدينة المنورة">المدينة المنورة</option>
                    <option value="تبوك">تبوك</option>
                    <option value="أبها">أبها</option>
                    <option value="بريدة">بريدة</option>
                    <option value="الخبر">الخبر</option>
                    <option value="الطائف">الطائف</option>
                    <option value="مدينة أخرى">مدينة أخرى</option>
                </select></div>
                <div class="form-group"><label>العنوان</label><input type="text" id="custAddress"></div>
            </div>
        </div>
        
        <div class="checkout-card">
            <h3><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-4px"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> طريقة الاستلام</h3>
            <div class="delivery-grid">
                <div class="delivery-option selected" data-dora-call="selectDelivery:delivery" data-dora-use-element="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-4px"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg><span>توصيل للمنزل</span></div>
                <div class="delivery-option" data-dora-call="selectDelivery:pickup" data-dora-use-element="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-4px"><path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M9 20v-6h6v6"/></svg><span>استلام من المتجر</span></div>
            </div>
        </div>
        
        <div class="checkout-card">
            <h3><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-4px"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> طريقة الدفع</h3>
            <div class="payment-grid" id="paymentMethodsGrid">جاري تحميل طرق الدفع...</div>
        </div>
        
              <!-- 💳 بوابات الدفع السريعة -->
        <div class="quick-pay-section">
            <h4><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="vertical-align:-3px"><path d="M13 2 L3 14 h7 l-1 8 L21 9 h-7 z"/></svg> دفع سريع</h4>
            <div class="quick-pay-grid">
                <button class="quick-pay-btn stc" data-dora-call="payWithSTC:${finalTotal}">
                    ${DORA_BRAND_ICONS.stcpay}
                    STC Pay (تحويل)
                </button>
                <button class="quick-pay-btn mada" data-dora-call="payWithMada:${finalTotal}">
                    ${DORA_BRAND_ICONS.mada}
                    تحويل بنكي
                </button>
            </div>
        </div>
        <button class="btn-submit" data-dora-call="placeOrder"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px"><polyline points="20 6 9 17 4 12"/></svg> تأكيد الطلب</button>
    `;
    
    loadPaymentMethods();
    loadUpsellProducts();
    
    // 🚚 تحديث الشحن عند تغيير المدينة + جلب الأسعار أول مرة
    var cityInput = document.getElementById('custCity');
    if (cityInput) {
        cityInput.addEventListener('input', function() { updateShipping(); });
        cityInput.addEventListener('change', function() { updateShipping(); });
    }
    updateShipping();
}

function selectDelivery(method, el) {
    deliveryMethod = method;
    document.querySelectorAll('.delivery-option').forEach(function(o) { o.classList.remove('selected'); });
    el.classList.add('selected');
    updateShipping(); // 🚚 استلام من المتجر = 0 / توصيل = حسب المدينة
}

async function loadPaymentMethods() {
    var grid = document.getElementById('paymentMethodsGrid');
    var result = await supabaseClient.from('payment_methods').select('*').eq('is_active', true).order('sort_order');
    var methods = result.data || [];

    // 💳 البوابات الإلكترونية المفعلة — تُقرأ من الـ View العامة payment_gateways_public فقط
    // (جدول payment_gateways محمي RLS ولا يقرأه الفرونت إطلاقاً — لا أسرار هنا)
    var gateways = [];
    try {
        var gwResult = await supabaseClient.from('payment_gateways_public').select('*');
        if (!gwResult.error && gwResult.data) gateways = gwResult.data;
    } catch (eGw) { gateways = []; } // صمت تام — غياب البوابات لا يكسر طرق الدفع الحالية

    if (!methods.length && !gateways.length) { grid.innerHTML = '<div style="text-align:center;padding:20px;grid-column:1/-1">لا توجد طرق دفع متاحة</div>'; return; }
    var html = methods.map(function(m) {
        return '<div class="payment-option" data-payment-id="' + m.id + '" data-payment-name="' + esc(m.name) + '" data-dora-action="selectPayment:$element"><span class="icon">' + doraBrandIcon(m.name) + '</span><span class="name">' + m.name + '</span></div>';
    }).join('');
    html += gateways.map(function(g) {
        // شارة 🧪 للوضع التجريبي — تنظيف النصوص من علامات الاقتباس حمايةً للـ inline handlers
        var gCode = String(g.gateway_code || '').replace(/['"\\]/g, '');
        var gName = String(g.gateway_name || 'دفع إلكتروني').replace(/['"\\]/g, '');
        var gMode = String(g.mode || 'test').replace(/['"\\]/g, '');
        var badge = gMode === 'test' ? ' <span style="background:rgba(245,158,11,0.2);color:#F59E0B;font-size:10px;padding:2px 6px;border-radius:6px;vertical-align:middle">🧪 تجريبي</span>' : '';
        return '<div class="payment-option" data-gateway-code="' + gCode + '" data-gateway-name="' + esc(gName) + '" data-gateway-mode="' + gMode + '" data-dora-action="selectGateway:$element"><span class="icon">' + DORA_BRAND_ICONS.card + '</span><span class="name">دفع إلكتروني — ' + gName + badge + '</span></div>';
    }).join('');
    // 💵 الدفع عند الاستلام — متاح دائماً (مهم للسوق السعودي)
    html += '<div class="payment-option" data-payment-id="cod" data-payment-name="الدفع عند الاستلام" data-dora-action="selectPayment:$element"><span class="icon">💵</span><span class="name">الدفع عند الاستلام</span></div>';

    // 💳 Moyasar — يظهر فقط عند لصق المفتاح العلني في main.js (MOYASAR_PUBLISHABLE_KEY)
    if (typeof MOYASAR_PUBLISHABLE_KEY !== 'undefined' && MOYASAR_PUBLISHABLE_KEY) {
        html += '<div class="payment-option" data-dora-action="selectMoyasar:$element"><span class="icon">' + DORA_BRAND_ICONS.card + '</span><span class="name">دفع إلكتروني — مدى / فيزا / Apple Pay</span></div>';
    }
    grid.innerHTML = html;
}

// 💳 اختيار الدفع الإلكتروني عبر Moyasar (نموذج رسمي يُعرض بعد إنشاء الطلب)
function selectMoyasar(el) {
    selectedPayment = { id: 'moyasar', name: 'دفع إلكتروني — Moyasar', isMoyasar: true };
    document.querySelectorAll('.payment-option').forEach(function(o) { o.classList.remove('selected'); });
    el.classList.add('selected');
}

// 💳 اختيار بوابة دفع إلكترونية (من الـ View العامة)
function selectGateway(el) {
    if (!el || !el.getAttribute) return;
    var code = el.getAttribute('data-gateway-code') || '';
    var name = el.getAttribute('data-gateway-name') || 'دفع إلكتروني';
    var mode = el.getAttribute('data-gateway-mode') || 'test';
    selectedPayment = {
        id: 'gateway:' + code,
        name: 'دفع إلكتروني — ' + name + (mode === 'test' ? ' (تجريبي)' : ''),
        isGateway: true,
        gatewayCode: code,
        gatewayMode: mode
    };
    document.querySelectorAll('.payment-option').forEach(function(o) { o.classList.remove('selected'); });
    el.classList.add('selected');
}

function selectPayment(el) {
    if (!el || !el.getAttribute) return;
    var id = el.getAttribute('data-payment-id') || '';
    var name = el.getAttribute('data-payment-name') || '';
    selectedPayment = { id: id, name: name };
    document.querySelectorAll('.payment-option').forEach(function(o) { o.classList.remove('selected'); });
    el.classList.add('selected');
}

// 🛍️ Cross-sell: منتجات مقترحة
function loadUpsellProducts() {
    var grid = document.getElementById('upsellGrid');
    var cartCategories = cart.map(function(item) {
        var p = productsData.find(function(x) { return x.id === item.id; });
        return p ? p.category : null;
    }).filter(Boolean);
    
    var related = productsData.filter(function(p) {
        return cartCategories.indexOf(p.category) !== -1 && !cart.find(function(c) { return c.id === p.id; }) && p.stock > 0;
    }).slice(0, 3);
    
    if (!related.length) { grid.innerHTML = '<p style="text-align:center;color:rgba(255,255,255,0.5)">لا توجد اقتراحات حالياً</p>'; return; }
    
    grid.innerHTML = related.map(function(p) {
        return '<div class="upsell-item"><img src="' + p.image + '" alt="' + p.name + '" loading="lazy"><div style="font-size:12px;margin:4px 0">' + p.name.substring(0, 25) + '...</div><div class="price">' + p.price.toLocaleString() + ' ر.س</div><button class="btn-add" data-product-id="' + p.id + '" data-product-name="' + esc(p.name) + '" data-product-price="' + p.price + '" data-product-image="' + esc(p.image) + '" data-dora-action="addToCartDirect:$element">🛒 أضف</button></div>';
    }).join('');
}

function addToCartDirect(el) {
    if (!el || !el.getAttribute) return;
    var id = el.getAttribute('data-product-id');
    var name = el.getAttribute('data-product-name') || '';
    var price = parseFloat(el.getAttribute('data-product-price')) || 0;
    var image = el.getAttribute('data-product-image') || '';
    cart.push({ id: id, name: name, price: price, qty: 1, image: image });
    localStorage.setItem('doraCart', JSON.stringify(cart));
    renderCheckout();
}

function applyCouponCode() {
    var code = document.getElementById('couponCode').value.trim().toUpperCase();
    var coupon = COUPONS[code];
    if (coupon) {
        activeCoupon = coupon;
        activeCouponCode = code;
        document.getElementById('couponMsg').innerHTML = '✅ ' + coupon.label + ' مُطبق';
        document.getElementById('couponMsg').style.color = '#10B981';
        renderCheckout();
    } else {
        document.getElementById('couponMsg').innerHTML = '❌ كود خصم غير صحيح';
        document.getElementById('couponMsg').style.color = '#EF4444';
    }
}

    // 💳 دوال الدفع السريع
// 🏦 التحويل البنكي — الحسابات تُقرأ من Supabase (يضيفها الأدمن من لوحة التحكم ← الحسابات البنكية)
// لا توجد أي بيانات بنكية داخل الكود — الأمان أولاً
async function showBankAccountsBox(methodId, methodName, amount) {
    selectedPayment = { id: methodId, name: methodName };
    var box = document.getElementById('bankAccountsBox');
    if (!box) {
        box = document.createElement('div');
        box.id = 'bankAccountsBox';
        var sec = document.querySelector('.quick-pay-section');
        if (sec) sec.appendChild(box); else document.body.appendChild(box);
    }
    box.style.cssText = 'margin-top:15px;display:grid;gap:10px';
    box.innerHTML = '<div style="text-align:center;color:#9CA3AF;padding:10px">⏳ جاري تحميل حسابات التحويل...</div>';
    var res = await supabaseClient.from('company_bank_accounts').select('*').eq('is_active', true).order('sort_order').order('id');
    var accounts = res.data || [];
    if (!accounts.length) {
        box.innerHTML = '<div style="text-align:center;color:#F59E0B;padding:14px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.3);border-radius:12px;font-weight:700">⚠️ لم تُضف حسابات تحويل بعد — اختر طريقة دفع أخرى</div>';
        showToast('⚠️ لا توجد حسابات بنكية مضافة من الإدارة', 'warning');
        return;
    }
    var esc = function(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
    box.innerHTML = '<div style="color:#F3F4F6;font-weight:800;font-size:14px">حوّل المبلغ (<span style="color:#10B981">' + amount.toLocaleString() + ' ر.س</span>) إلى أحد الحسابات التالية، ثم ارفع الإيصال في حسابك:</div>'
        + accounts.map(function(a) {
            return '<div style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:12px;padding:14px;box-shadow:0 2px 8px rgba(0,0,0,.06)">'
                + '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">'
                + '<div><div style="color:#111827;font-weight:800">' + esc(a.bank_name) + '</div>'
                + '<div style="color:#6B7280;font-size:12px">' + esc(a.account_name || '') + '</div></div>'
                + '<div style="text-align:left">'
                + (a.iban ? '<div style="color:#111827;font-size:13px;direction:ltr;font-weight:700">' + esc(a.iban) + '</div>' : '')
                + (a.account_number ? '<div style="color:#6B7280;font-size:12px;direction:ltr">رقم الحساب: ' + esc(a.account_number) + '</div>' : '')
                + '</div></div>'
                + '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">'
                + (a.iban ? '<button type="button" data-copy="' + esc(a.iban) + '" data-dora-call="doraCopyIban:$element" style="flex:1;min-width:120px;padding:9px;background:rgba(16,185,129,.15);border:1px solid #10B981;color:#10B981;border-radius:10px;cursor:pointer;font-weight:700;font-family:inherit">📋 نسخ الآيبان</button>' : '')
                + '</div></div>';
        }).join('');
    showToast('✅ تم اختيار ' + methodName + ' — بيانات التحويل ظاهرة بالأسفل');
}

function payWithSTC(amount) { showBankAccountsBox('stc', 'STC Pay (تحويل)', amount); }

function payWithMada(amount) { showBankAccountsBox('mada', 'تحويل بنكي', amount); }
// ============================================================
// 💳 مسار الدفع الإلكتروني — استدعاء Edge Function ثم تحويل العميل
// try/catch شامل: أي فشل = فولباك للمسار العادي (واتساب) بدون كسر أو إلغاء الطلب
// ============================================================
async function startGatewayPayment(orderId, amount, customer, gatewayCode) {
    try {
        // رابط العودة بعد الدفع — يُبنى من مسار الصفحة الحالية ليعمل على أي دومين/استضافة
        var callbackUrl = new URL('payment-return.html', window.location.href).href + '?order=' + encodeURIComponent(String(orderId));
        var res = await fetch(window.SUPABASE_URL + '/functions/v1/create-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order_id: String(orderId),
                amount: amount, // الإجمالي شامل الشحن
                currency: 'SAR',
                customer: customer,
                callback_url: callbackUrl,
                gateway_code: gatewayCode || undefined // اختياري — الفانكشن تختار المفعلة لو غاب
            })
        });
        if (!res.ok) throw new Error('function_status_' + res.status);
        var data = await res.json();
        if (!data || !data.payment_url) throw new Error('no_payment_url');
        window.location.href = data.payment_url; // 🚀 تحويل العميل لبوابة الدفع (أو المحاكي)
        return true;
    } catch (e) {
        // الفانكشن غير منشورة بعد / فشلت / الشبكة — رسالة ودّية بدون كسر
        showToast('⚠️ الدفع الإلكتروني غير متاح حالياً — اختر طريقة أخرى', 'warning');
        return false;
    }
}

// ============================================================
// 🔐 التحقق السيرفري من الأسعار — compute_order_total في Supabase
// الدالة (security definer) تقرأ أسعار المنتجات من قاعدة البيانات
// وتعيد الإجماليات الرسمية — قيم المتصفح لا تُحفظ أبداً.
// عند فشل الاستدعاء: لا يُحفظ الطلب (سد ثغرة حقن الأسعار).
// ============================================================
async function computeServerTotals(city) {
    var items = cart.map(function(i) { return { id: i.id, qty: i.qty }; });
    var res = await supabaseClient.rpc('compute_order_total', {
        p_items: items,
        p_coupon: activeCouponCode || null,
        p_city: city || null,
        p_delivery: deliveryMethod
    });
    if (res.error) throw res.error;
    var t = res.data;
    if (!t || typeof t.total !== 'number') throw new Error('bad_total_response');
    return t; // { subtotal, tax, discount, shipping_fee, total }
}

// 💳 تحميل مكتبة Moyasar الرسمية وعرض نموذج الدفع (المبلغ من الدالة السيرفرية حصراً)
function loadMoyasarScript() {
    return new Promise(function(resolve, reject) {
        if (window.Moyasar) return resolve();
        var s = document.createElement('script');
        s.src = 'https://cdn.moyasar.com/mpf/1.14.0/moyasar.js';
        s.onload = function() { resolve(); };
        s.onerror = function() { reject(new Error('moyasar_load_failed')); };
        document.head.appendChild(s);
    });
}

async function showMoyasarForm(orderId, serverTotalHalalas, customer) {
    await loadMoyasarScript();
    var wrap = document.getElementById('moyasarWrap');
    if (!wrap) {
        wrap = document.createElement('div');
        wrap.id = 'moyasarWrap';
        var sec = document.querySelector('.quick-pay-section');
        if (sec) sec.parentNode.insertBefore(wrap, sec); else document.body.appendChild(wrap);
    }
    var callbackUrl = new URL('invoice.html', window.location.href).href + '?order=' + encodeURIComponent(String(orderId));
    wrap.innerHTML = '<div class="checkout-card" style="margin-top:15px"><h3>💳 إتمام الدفع الإلكتروني</h3>'
        + '<p style="color:#9CA3AF;font-size:13px;margin-bottom:12px">طلبك رقم <b style="color:#10B981">' + orderId + '</b> محفوظ. أكمل الدفع بأمان عبر Moyasar:</p>'
        + '<div class="mysr-form"></div></div>';
    wrap.scrollIntoView({ behavior: 'smooth' });
    // النموذج الموثق من Moyasar — المبلغ بالهللات من نتيجة الدالة السيرفرية
    window.Moyasar.init({
        element: '.mysr-form',
        amount: serverTotalHalalas,
        currency: 'SAR',
        description: 'طلب متجر درة فارس الشمال رقم ' + orderId,
        publishable_api_key: MOYASAR_PUBLISHABLE_KEY,
        callback_url: callbackUrl,
        methods: ['creditcard', 'applepay'],
        metadata: { order_id: String(orderId) },
        apple_pay: { label: 'درة فارس الشمال', validate_merchant_url: 'https://api.moyasar.com/v1/applepay/initiate' },
        on_completed: function(payment) {
            // تحديث حالة الدفع عند نجاح العملية (أفضل جهد — التأكيد النهائي من callback/webhook)
            try {
                supabaseClient.from('store_orders').update({ payment_status: 'paid' }).eq('id', orderId).then(function(){});
            } catch (ePay) {}
            return callbackUrl + '&payment=' + encodeURIComponent(payment.id);
        }
    });
}

async function placeOrderConfirmed() {
    var name = document.getElementById('custName').value.trim();
    var phone = document.getElementById('custPhone').value.trim();
    if (!name || !phone) { alert('❌ الاسم والجوال مطلوبين'); return; }
    if (!selectedPayment) { alert('❌ اختر طريقة الدفع'); return; }

    var email = document.getElementById('custEmail').value.trim();
    var city = document.getElementById('custCity').value.trim();
    var address = document.getElementById('custAddress').value.trim();
    if (deliveryMethod === 'delivery' && !city) { alert('❌ اختر مدينة التوصيل'); return; }

    // 🔐 الإجماليات الرسمية من السيرفر — إن فشل الحساب لا يُحفظ أي طلب
    var serverTotals;
    try {
        showToast('⏳ جاري التحقق من قيمة الطلب...');
        serverTotals = await computeServerTotals(city);
    } catch (eTotal) {
        showToast('❌ حدث خطأ في حساب الطلب، حاول مجدداً', 'error');
        return;
    }
    var subtotal = serverTotals.subtotal, tax = serverTotals.tax,
        discount = serverTotals.discount, finalTotal = serverTotals.total;
    shippingCost = serverTotals.shipping_fee; // رسوم الشحن الرسمية من السيرفر

    var isCod = selectedPayment.id === 'cod';
    var orderPayload = {
        customer_name: name, customer_phone: phone, customer_email: email,
        items: cart, subtotal: subtotal, tax: tax, shipping_cost: shippingCost, total: finalTotal,
        shipping_city: city, shipping_fee: shippingCost,
        payment_method: selectedPayment.name,
        // 💵 COD = بانتظار التأكيد | بوابة = بانتظار الدفع | غيرها = جديد
        status: (isCod ? 'pending_confirmation' : (selectedPayment.isGateway || selectedPayment.isMoyasar ? 'pending_payment' : 'new')),
        payment_status: 'pending',
        address: JSON.stringify({ city: city, address: address, delivery: deliveryMethod })
    };
    var orderResult = await supabaseClient.from('store_orders').insert([orderPayload]).select('*').single();
    if (orderResult.error) {
        // فولباك: أعمدة الشحن/الدفع الجديدة قد لا تكون أُضيفت بعد — نحفظ بدونها بدون كسر
        try {
            var fallbackPayload = Object.assign({}, orderPayload);
            delete fallbackPayload.shipping_cost;
            delete fallbackPayload.shipping_city;
            delete fallbackPayload.shipping_fee;
            delete fallbackPayload.payment_status;
            orderResult = await supabaseClient.from('store_orders').insert([fallbackPayload]).select('*').single();
        } catch (eOrder) {}
    }
    if (orderResult.error && orderPayload.status !== 'new') {
        // فولباك إضافي: قيد على عمود status يرفض القيمة — نحفظ الطلب كـ new
        try {
            var newPayload = Object.assign({}, orderPayload);
            delete newPayload.shipping_cost;
            delete newPayload.shipping_city;
            delete newPayload.shipping_fee;
            delete newPayload.payment_status;
            newPayload.status = 'new';
            orderResult = await supabaseClient.from('store_orders').insert([newPayload]).select('*').single();
        } catch (eOrder2) {}
    }
    var orderId = orderResult.data ? orderResult.data.id : null;

    // 💳 مسار Moyasar: الطلب أُنشئ — نعرض نموذج الدفع بالمبلغ السيرفي (بالهللات)
    if (selectedPayment.isMoyasar) {
        if (!orderId) { showToast('❌ تعذر حفظ الطلب — حاول مجدداً', 'error'); return; }
        try {
            await showMoyasarForm(orderId, Math.round(finalTotal * 100), { name: name, email: email, phone: phone });
            showToast('✅ تم حفظ طلبك — أكمل الدفع بالأسفل');
        } catch (eMoy) {
            showToast('⚠️ تعذر تحميل نموذج الدفع — اختر طريقة أخرى أو تواصل معنا', 'warning');
        }
        return; // لا نكمل المسار العادي — الإتمام عبر نموذج Moyasar
    }

    // 💳 مسار البوابة الإلكترونية (Edge Function): الطلب أُنشئ أولاً — الآن نستدعي الفانكشن ونحوّل العميل
    if (selectedPayment.isGateway) {
        var gatewayOk = false;
        if (orderId) {
            showToast('⏳ جاري تجهيز الدفع الإلكتروني...');
            gatewayOk = await startGatewayPayment(orderId, finalTotal, { name: name, email: email, phone: phone }, selectedPayment.gatewayCode);
        } else {
            showToast('⚠️ الدفع الإلكتروني غير متاح حالياً — اختر طريقة أخرى', 'warning');
        }
        if (gatewayOk) return; // التحويل لبوابة الدفع جارٍ — لا نكمل المسار العادي
        // ⚠️ فشل المسار الإلكتروني: الطلب يبقى محفوظاً ونكمل بمسار الواتساب العادي كفولباك
        // محاولة أفضل جهد لإرجاع حالة الطلب إلى new (كان pending_payment) — الفشل هنا غير مؤثر
        try {
            if (orderId) await supabaseClient.from('store_orders').update({ status: 'new' }).eq('id', orderId);
        } catch (eRevert) {}
    }

    var invoiceNumber = 'INV-' + Date.now();
    var invoiceResult = await supabaseClient.from('invoices').insert([{
        invoice_number: invoiceNumber, customer_name: name, customer_email: email,
        customer_phone: phone, items: cart, subtotal: subtotal, tax: tax, total: finalTotal, status: 'issued'
    }]).select('*').single();
    var invoiceId = invoiceResult.data ? invoiceResult.data.id : null;

    localStorage.removeItem('doraCart');
    var orderNumber = orderResult.data ? orderResult.data.id : '';
    window.location.href = 'thankyou.html?order=' + orderNumber + '&invoice=' + (invoiceId || '');
}

// ==================== 🔐 نظام التحقق OTP عبر البريد قبل تأكيد الطلب ====================
var _otpEmail = null;
var _otpResendTimer = null;

(function injectOtpModal() {
    var css = ''
        + '#doraOtpOverlay{position:fixed;inset:0;background:rgba(10,8,30,.75);backdrop-filter:blur(4px);display:none;align-items:center;justify-content:center;z-index:99999;padding:16px}'
        + '#doraOtpOverlay.show{display:flex}'
        + '.otp-card{background:#14122B;border:1px solid #272452;border-radius:18px;padding:28px 24px;width:100%;max-width:400px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.5);font-family:inherit}'
        + '.otp-card h3{color:#fff;font-size:19px;margin:0 0 8px;font-weight:800}'
        + '.otp-card .otp-sub{color:#9CA3AF;font-size:13px;margin-bottom:18px;line-height:1.8}'
        + '.otp-card .otp-sub b{color:#10B981}'
        + '.otp-input{width:100%;padding:14px;font-size:26px;font-weight:800;text-align:center;letter-spacing:10px;background:#FFFFFF;border:2px solid #E5E7EB;border-radius:12px;color:#111827;outline:none;font-family:inherit;box-sizing:border-box;direction:ltr}'
        + '.otp-input:focus{border-color:#0B7A4B}'
        + '.otp-btn{width:100%;margin-top:14px;padding:14px;background:#0B7A4B;color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:800;cursor:pointer;font-family:inherit}'
        + '.otp-btn:disabled{opacity:.5;cursor:not-allowed}'
        + '.otp-resend{margin-top:12px;background:none;border:none;color:#60A5FA;font-size:13px;cursor:pointer;font-family:inherit;text-decoration:underline}'
        + '.otp-resend:disabled{color:#6B7280;text-decoration:none;cursor:default}'
        + '.otp-cancel{margin-top:8px;background:none;border:none;color:#6B7280;font-size:12px;cursor:pointer;font-family:inherit}'
        + '.otp-msg{margin-top:10px;font-size:13px;min-height:18px;font-weight:700}'
        + '.otp-msg.ok{color:#10B981}.otp-msg.err{color:#EF4444}';
    var st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);

    var ov = document.createElement('div');
    ov.id = 'doraOtpOverlay';
    ov.innerHTML = ''
        + '<div class="otp-card">'
        + '  <h3>🔐 رمز التحقق</h3>'
        + '  <div class="otp-sub">أرسلنا رمز تحقق مكوّن من 6 أرقام إلى بريدك:<br><b id="otpEmailShown"></b><br>اكتب الرمز لإتمام طلبك بأمان</div>'
        + '  <input id="otpCodeInput" class="otp-input" type="text" inputmode="numeric" maxlength="6" placeholder="——————" autocomplete="one-time-code">'
        + '  <div id="otpMsg" class="otp-msg"></div>'
        + '  <button id="otpVerifyBtn" class="otp-btn">تأكيد وإتمام الطلب</button>'
        + '  <button id="otpResendBtn" class="otp-resend">إعادة إرسال الرمز</button><br>'
        + '  <button id="otpCancelBtn" class="otp-cancel">إلغاء والعودة</button>'
        + '</div>';
    document.body.appendChild(ov);

    document.getElementById('otpVerifyBtn').addEventListener('click', verifyOtpCode);
    document.getElementById('otpResendBtn').addEventListener('click', function(){ sendOtpCode(true); });
    document.getElementById('otpCancelBtn').addEventListener('click', closeOtpModal);
    document.getElementById('otpCodeInput').addEventListener('keydown', function(e){ if (e.key === 'Enter') verifyOtpCode(); });
})();

function openOtpModal() {
    document.getElementById('otpEmailShown').textContent = _otpEmail || '';
    document.getElementById('otpCodeInput').value = '';
    var m = document.getElementById('otpMsg'); m.textContent = ''; m.className = 'otp-msg';
    document.getElementById('doraOtpOverlay').classList.add('show');
    setTimeout(function(){ document.getElementById('otpCodeInput').focus(); }, 300);
}
function closeOtpModal() {
    document.getElementById('doraOtpOverlay').classList.remove('show');
}
function otpMsg(t, ok) {
    var m = document.getElementById('otpMsg');
    m.textContent = t; m.className = 'otp-msg ' + (ok ? 'ok' : 'err');
}
function startResendCooldown(sec) {
    var btn = document.getElementById('otpResendBtn');
    btn.disabled = true;
    var left = sec;
    btn.textContent = 'إعادة الإرسال بعد ' + left + ' ث';
    clearInterval(_otpResendTimer);
    _otpResendTimer = setInterval(function(){
        left--;
        if (left <= 0) { clearInterval(_otpResendTimer); btn.disabled = false; btn.textContent = 'إعادة إرسال الرمز'; }
        else btn.textContent = 'إعادة الإرسال بعد ' + left + ' ث';
    }, 1000);
}

async function sendOtpCode(isResend) {
    if (!_otpEmail) return;
    var btn = document.getElementById('otpResendBtn');
    btn.disabled = true;
    try {
        var res = await supabaseClient.auth.signInWithOtp({
            email: _otpEmail,
            options: { shouldCreateUser: false }
        });
        if (res.error) {
            // فولباك: لو المستخدم غير مسجّل في نظام المصادقة — نسمح بالإنشاء
            var res2 = await supabaseClient.auth.signInWithOtp({ email: _otpEmail });
            if (res2.error) throw res2.error;
        }
        otpMsg(isResend ? '✅ تم إعادة إرسال الرمز — راجع بريدك' : '✅ تم إرسال الرمز — راجع بريدك', true);
        startResendCooldown(60);
    } catch (e) {
        btn.disabled = false;
        otpMsg('⚠️ تعذّر إرسال الرمز — حاول مرة أخرى', false);
    }
}

async function verifyOtpCode() {
    var code = document.getElementById('otpCodeInput').value.trim();
    if (!/^\d{6,10}$/.test(code)) { otpMsg('❌ اكتب الرمز كما وصلك في البريد (أرقام فقط)', false); return; }
    var btn = document.getElementById('otpVerifyBtn');
    btn.disabled = true;
    btn.textContent = '⏳ جاري التحقق...';
    try {
        var res = await supabaseClient.auth.verifyOtp({ email: _otpEmail, token: code, type: 'email' });
        if (res.error) throw res.error;
        otpMsg('✅ تم التحقق بنجاح — جاري تأكيد طلبك', true);
        closeOtpModal();
        await placeOrderConfirmed();
    } catch (e) {
        otpMsg('❌ الرمز غير صحيح أو منتهي — تأكد وأعد المحاولة', false);
    }
    btn.disabled = false;
    btn.textContent = 'تأكيد وإتمام الطلب';
}

// 🚪 بوابة الطلب: التحقق من البريد أولاً ثم الإتمام
async function placeOrder() {
    var name = document.getElementById('custName').value.trim();
    var phone = document.getElementById('custPhone').value.trim();
    if (!name || !phone) { alert('❌ الاسم والجوال مطلوبين'); return; }
    if (!selectedPayment) { alert('❌ اختر طريقة الدفع'); return; }
    var email = document.getElementById('custEmail').value.trim();
    if (!email) { alert('❌ اكتب بريدك الإلكتروني — سيصلك عليه رمز التحقق'); return; }
    _otpEmail = email;
    openOtpModal();
    await sendOtpCode(false);
}
// ==================== نهاية نظام OTP ====================

// Initialize
if (cart.length > 0) renderCheckout();

// ✅ تصدير الدوال المستخدمة في onclick إلى النطاق العام
window.selectDelivery = selectDelivery;
window.selectPayment = selectPayment;
window.selectGateway = selectGateway;
window.applyCouponCode = applyCouponCode;
window.placeOrder = placeOrder;
window.payWithSTC = payWithSTC;
window.payWithMada = payWithMada;
window.selectMoyasar = selectMoyasar;
window.addToCartDirect = addToCartDirect;
window.updateShipping = updateShipping;
})();
